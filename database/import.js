require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const zlib = require('zlib');
const { promisify } = require('util');

const gunzip = promisify(zlib.gunzip);

// Lazy initialization of Supabase client
let supabase;
function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// API endpoints
const SCRYFALL_BULK_API = 'https://api.scryfall.com/bulk-data';
const CARDMARKET_PRICE_GUIDE = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json';

// Batch size for efficient imports (reduced to avoid timeouts)
const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 100; // Small delay between batches

/**
 * Sleep helper for delays between batches
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Import data in batches with progress tracking and retry logic
 */
async function importInBatches(tableName, data, batchSize = BATCH_SIZE) {
  const total = data.length;
  let imported = 0;
  let errors = 0;

  console.log(`\nImporting ${total} records into ${tableName}...`);

  for (let i = 0; i < total; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    let retries = 0;
    const maxRetries = 3;
    let success = false;
    
    while (retries < maxRetries && !success) {
      try {
        // For scryfall_data, upsert by id. For prices, just insert (assume table was cleared)
        const options = tableName === 'scryfall_data' 
          ? { onConflict: 'id', ignoreDuplicates: false } 
          : {};

        const { error } = await getSupabaseClient()
          .from(tableName)
          .upsert(batch, options);

        if (error) {
          // Check if it's a timeout error
          if (error.message.includes('timeout') || error.message.includes('statement timeout')) {
            retries++;
            if (retries < maxRetries) {
              console.log(`\n  ⚠️  Timeout in batch ${batchNum}, retrying (${retries}/${maxRetries})...`);
              await sleep(2000 * retries); // Exponential backoff
              continue;
            }
          }
          console.error(`\nError in batch ${batchNum}:`, error.message);
          errors++;
        } else {
          imported += batch.length;
          success = true;
          const progress = ((imported / total) * 100).toFixed(1);
          process.stdout.write(`\r  Progress: ${imported}/${total} (${progress}%) - ${errors} errors`);
        }
      } catch (err) {
        console.error(`\nUnexpected error in batch ${batchNum}:`, err.message);
        errors++;
      }
      
      break; // Exit retry loop if not a timeout error
    }
    
    // Small delay between batches to avoid overwhelming the database
    if (i + batchSize < total) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n  ✓ Completed: ${imported} imported, ${errors} failed batches\n`);
  return { imported, errors };
}

/**
 * Fetch Scryfall bulk data metadata
 */
async function fetchScryfallBulkMetadata() {
  console.log('🔍 Fetching Scryfall bulk data metadata...');
  const response = await axios.get(SCRYFALL_BULK_API);
  
  // Find the unique_artwork bulk data
  const uniqueArtwork = response.data.data.find(item => item.type === 'unique_artwork');
  
  if (!uniqueArtwork) {
    throw new Error('Could not find unique_artwork bulk data');
  }
  
  console.log(`  ✓ Found: ${uniqueArtwork.name}`);
  console.log(`  📦 Size: ${(uniqueArtwork.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  📅 Updated: ${uniqueArtwork.updated_at}`);
  
  return uniqueArtwork;
}

/**
 * Download and decompress gzipped JSON data
 */
async function downloadAndDecompress(url, name) {
  console.log(`\n⬇️  Downloading ${name}...`);
  
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    decompress: false, // Don't auto-decompress, we'll handle it manually
    headers: {
      'Accept-Encoding': 'gzip'
    },
    onDownloadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        process.stdout.write(`\r  Progress: ${percentCompleted}% (${(progressEvent.loaded / 1024 / 1024).toFixed(2)} MB)`);
      }
    }
  });
  
  console.log('\n  ✓ Download complete');
  
  let jsonData;
  
  // Check if content is gzipped by looking at magic number
  const buffer = Buffer.from(response.data);
  const isGzipped = buffer[0] === 0x1f && buffer[1] === 0x8b;
  
  if (isGzipped) {
    console.log('  🗜️  Decompressing gzipped data...');
    const decompressed = await gunzip(buffer);
    jsonData = JSON.parse(decompressed.toString('utf8'));
  } else {
    console.log('  📄 Data is not compressed, parsing directly...');
    jsonData = JSON.parse(buffer.toString('utf8'));
  }
  
  console.log(`  ✓ Parsed JSON (${Array.isArray(jsonData) ? jsonData.length : 'unknown'} records)\n`);
  
  return jsonData;
}

/**
 * Download JSON data (not compressed)
 */
async function downloadJSON(url, name) {
  console.log(`\n⬇️  Downloading ${name}...`);
  
  const response = await axios.get(url, {
    onDownloadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        process.stdout.write(`\r  Progress: ${percentCompleted}% (${(progressEvent.loaded / 1024 / 1024).toFixed(2)} MB)`);
      }
    }
  });
  
  console.log('\n  ✓ Download complete\n');
  
  return response.data;
}

/**
 * Import Scryfall data (unique_artwork)
 */
async function importScryfallData() {
  console.log('📚 Loading Scryfall data...');
  
  // Fetch bulk data metadata
  const bulkMetadata = await fetchScryfallBulkMetadata();
  
  // Download and decompress the actual card data
  const cardData = await downloadAndDecompress(bulkMetadata.download_uri, 'Scryfall Unique Artwork');
  
  console.log(`  📊 Total cards: ${cardData.length}`);

  // Transform data to match database schema
  const products = cardData.map(card => ({
    id: card.id, // Use Scryfall's UUID as the ID
    name: card.name,
    data: card, // Store full card data in JSONB
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return await importInBatches('scryfall_data', products);
}

/**
 * Import CardMarket price data
 */
async function importPriceData() {
  console.log('💰 Loading CardMarket price data...');
  
  // Download price guide JSON
  const jsonData = await downloadJSON(CARDMARKET_PRICE_GUIDE, 'CardMarket Price Guide');
  
  console.log(`  📊 Total price entries: ${jsonData.priceGuides.length}`);

  // Transform data to match database schema
  const priceGuides = jsonData.priceGuides.map((price) => ({
    // id is auto-generated
    scryfall_id: price.idProduct,
    data: price, // Store full price data in JSONB
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return await importInBatches('cardmarket_price_guid', priceGuides);
}

/**
 * Clear all data from tables (optional for full sync)
 */
async function clearTables() {
  console.log('🗑️  Clearing existing data...');
  
  try {
    // Clear price data first (no foreign key constraint anymore, but keep order for consistency)
    const { error: priceError } = await getSupabaseClient()
      .from('cardmarket_price_guid')
      .delete()
      .gte('id', 0); // Delete all records

    if (priceError && priceError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('  Error clearing price data:', priceError.message);
    } else {
      console.log('  ✓ Price data cleared');
    }

    // Clear scryfall data
    const { error: scryfallError } = await getSupabaseClient()
      .from('scryfall_data')
      .delete()
      .neq('id', ''); // Delete all records (id is TEXT/UUID, never empty)

    if (scryfallError && scryfallError.code !== 'PGRST116') {
      console.error('  Error clearing scryfall data:', scryfallError.message);
    } else {
      console.log('  ✓ Scryfall data cleared');
    }
  } catch (err) {
    console.error('  Error during table clearing:', err.message);
  }

  console.log();
}

/**
 * Main sync function
 */
async function sync(clearFirst = true) {
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════╗');
  console.log('║   ManaLedger Data Sync to Supabase   ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Verify Supabase connection by initializing client
  try {
    const client = getSupabaseClient();
    console.log(`📡 Connected to: ${process.env.SUPABASE_URL}\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }

  try {
    // Clear existing data if requested
    if (clearFirst) {
      await clearTables();
    }

    // Import scryfall data first (referenced by price data)
    const scryfallResult = await importScryfallData();

    // Import price data
    const priceResult = await importPriceData();

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('╔══════════════════════════════════════╗');
    console.log('║            Sync Complete!            ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`\n📊 Summary:`);
    console.log(`  Scryfall: ${scryfallResult.imported} records`);
    console.log(`  Prices:   ${priceResult.imported} records`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Errors:   ${scryfallResult.errors + priceResult.errors} batches failed\n`);

    if (scryfallResult.errors + priceResult.errors > 0) {
      console.log('⚠️  Some batches failed. Check logs above for details.\n');
    }

    // Return results for API usage
    return {
      scryfallResult,
      priceResult,
      duration: parseFloat(duration),
      totalErrors: scryfallResult.errors + priceResult.errors
    };

  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Only run directly if this is the main module (not required by another file)
if (require.main === module) {
  const clearFirst = process.argv.includes('--clear') || process.argv.includes('-c');
  const skipClear = process.argv.includes('--no-clear');

  if (skipClear) {
    console.log('ℹ️  Running sync without clearing (upsert mode)\n');
    sync(false).catch(error => {
      console.error('Sync failed:', error.message);
      process.exit(1);
    });
  } else {
    sync(clearFirst || true).catch(error => {
      console.error('Sync failed:', error.message);
      process.exit(1);
    });
  }
}

module.exports = { sync, importScryfallData, importPriceData };
