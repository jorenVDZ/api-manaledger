import axios, { AxiosResponse } from 'axios';
import 'dotenv/config';
import { promisify } from 'util';
import * as zlib from 'zlib';
import { getSupabaseClient } from '../services/supabase';

const gunzip = promisify(zlib.gunzip);

// Types
interface ScryfallCard {
  id: string;
  name: string;
  [key: string]: any;
}

interface CardMarketPrice {
  idProduct: string;
  [key: string]: any;
}

interface PriceGuideData {
  priceGuides: CardMarketPrice[];
}

interface ImportResult {
  imported: number;
  errors: number;
}

interface SyncResult {
  scryfallResult: ImportResult;
  priceResult: ImportResult;
  duration: number;
  totalErrors: number;
}

interface BulkDataItem {
  type: string;
  name: string;
  size: number;
  updated_at: string;
  download_uri: string;
}

interface BulkDataResponse {
  data: BulkDataItem[];
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
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Import data in batches with progress tracking and retry logic
 */
async function importInBatches(tableName: string, data: any[], batchSize: number = BATCH_SIZE): Promise<ImportResult> {
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
      } catch (err: any) {
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
async function fetchScryfallBulkMetadata(): Promise<BulkDataItem> {
  console.log('🔍 Fetching Scryfall bulk data metadata...');
  const response: AxiosResponse<BulkDataResponse> = await axios.get(SCRYFALL_BULK_API);
  
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
async function downloadAndDecompress(url: string, name: string): Promise<any> {
  console.log(`\n⬇️  Downloading ${name}...`);
  
  const response: AxiosResponse<ArrayBuffer> = await axios.get(url, {
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
  
  let jsonData: any;
  
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
async function downloadJSON(url: string, name: string): Promise<any> {
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
async function importScryfallData(): Promise<ImportResult> {
  console.log('📚 Loading Scryfall data...');
  
  // Fetch bulk data metadata
  const bulkMetadata = await fetchScryfallBulkMetadata();
  
  // Download and decompress the actual card data
  const cardData: ScryfallCard[] = await downloadAndDecompress(bulkMetadata.download_uri, 'Scryfall Unique Artwork');
  
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
async function importPriceData(): Promise<ImportResult> {
  console.log('💰 Loading CardMarket price data...');
  
  // Download price guide JSON
  const jsonData: PriceGuideData = await downloadJSON(CARDMARKET_PRICE_GUIDE, 'CardMarket Price Guide');
  
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
 * Uses SQL TRUNCATE for efficient deletion via stored procedure
 */
async function clearTables(): Promise<void> {
  console.log('🗑️  Clearing existing data...');
  
  try {
    const client = getSupabaseClient();
    
    // Try to use the stored procedure for efficient TRUNCATE
    console.log('  🔄 Attempting to clear tables via stored procedure...');
    const { error: rpcError } = await client.rpc('clear_all_data');

    if (rpcError) {
      // Stored procedure doesn't exist or failed, use fallback DELETE method
      console.log('  ⚠️  Stored procedure not available, using DELETE method...');
      console.log('  ⚠️  RPC Error:', rpcError.message);
      
      // Fallback: Use DELETE with a simpler, more reliable approach
      // Clear price data first
      console.log('  🔄 Deleting price data...');
      const { error: priceError, count: priceCount } = await client
        .from('cardmarket_price_guid')
        .delete()
        .not('id', 'is', null); // Delete all where id is not null (i.e., all records)
      
      if (priceError && priceError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('  ❌ Error clearing price data:', priceError.message);
        console.error('  Full error:', JSON.stringify(priceError, null, 2));
        throw new Error(`Failed to clear price data: ${priceError.message}`);
      }
      console.log(`  ✓ Price data cleared (${priceCount || 'unknown'} rows)`);

      // Clear scryfall data
      console.log('  🔄 Deleting scryfall data...');
      const { error: scryfallError, count: scryfallCount } = await client
        .from('scryfall_data')
        .delete()
        .not('id', 'is', null); // Delete all where id is not null
      
      if (scryfallError && scryfallError.code !== 'PGRST116') {
        console.error('  ❌ Error clearing scryfall data:', scryfallError.message);
        console.error('  Full error:', JSON.stringify(scryfallError, null, 2));
        throw new Error(`Failed to clear scryfall data: ${scryfallError.message}`);
      }
      console.log(`  ✓ Scryfall data cleared (${scryfallCount || 'unknown'} rows)`);
    } else {
      console.log('  ✓ All tables cleared successfully via stored procedure');
    }
    
  } catch (err: any) {
    console.error('  ❌ Fatal error during table clearing:', err.message);
    console.error('  Stack:', err.stack);
    throw err; // Re-throw to fail the sync
  }

  console.log();
}

/**
 * Main sync function
 */
async function sync(clearFirst: boolean = true): Promise<SyncResult> {
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════╗');
  console.log('║   ManaLedger Data Sync to Supabase   ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Verify Supabase connection by initializing client
  try {
    getSupabaseClient();
    console.log(`📡 Connected to: ${process.env.SUPABASE_URL}\n`);
  } catch (error: any) {
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
    const duration = ((Date.now() - startTime) / 1000);
    console.log('╔══════════════════════════════════════╗');
    console.log('║            Sync Complete!            ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`\n📊 Summary:`);
    console.log(`  Scryfall: ${scryfallResult.imported} records`);
    console.log(`  Prices:   ${priceResult.imported} records`);
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    console.log(`  Errors:   ${scryfallResult.errors + priceResult.errors} batches failed\n`);

    if (scryfallResult.errors + priceResult.errors > 0) {
      console.log('⚠️  Some batches failed. Check logs above for details.\n');
    }

    // Return results for API usage
    return {
      scryfallResult,
      priceResult,
      duration: parseFloat(duration.toFixed(2)),
      totalErrors: scryfallResult.errors + priceResult.errors
    };

  } catch (error: any) {
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

export { importPriceData, importScryfallData, sync };

