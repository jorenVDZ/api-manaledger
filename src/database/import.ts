import axios, { AxiosResponse } from 'axios';
import 'dotenv/config';
import { promisify } from 'util';
import * as zlib from 'zlib';
import { Card } from '../models/card';
import { getSupabaseClient } from '../services/supabase';

const gunzip = promisify(zlib.gunzip);

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface ImportResult {
  imported: number;
  errors: number;
}

interface SyncResult {
  importResult: ImportResult;
  duration: number;
  totalErrors: number;
}

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

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const SCRYFALL_BULK_API = 'https://api.scryfall.com/bulk-data';
const CARDMARKET_PRICE_GUIDE =
  'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json';

const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 100;
const MAX_RETRIES = 3;

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

function normalizeFaces(card: any) {
  return card.card_faces.map((face: any) => ({
    name: face.name,
    manaCost: face.mana_cost,
    typeLine: face.type_line,
    oracleText: face.oracle_text,
    power: face.power,
    toughness: face.toughness,
    imageUris: face.image_uris
      ? {
          small: face.image_uris.small,
          normal: face.image_uris.normal,
          large: face.image_uris.large,
          png: face.image_uris.png,
          artCrop: face.image_uris.art_crop,
          borderCrop: face.image_uris.border_crop
        }
      : undefined
  }))
}

function normalizeScryfallCard(card: any): Card {
  const base = {
    id: card.id,
    cardmarketId: card.cardmarket_id ?? null,
    name: card.name,
    lang: card.lang,
    releasedAt: card.released_at,
    scryfallUri: card.scryfall_uri,
    layout: card.layout,
    colorIdentity: card.color_identity ?? [],
    keywords: card.keywords ?? [],
    set: {
      id: card.set_id,
      code: card.set,
      name: card.set_name,
      type: card.set_type
    },
    rarity: card.rarity
  }

  // 🔁 Multi-faced cards
  if (Array.isArray(card.card_faces)) {
    return {
      ...base,
      typeLine: card.type_line,
      producedMana: card.produced_mana ?? [],
      faces: normalizeFaces(card)
    }
  }

  // 🧱 Single-faced cards
  return {
    ...base,
    imageUris: card.image_uris,
    manaCost: card.mana_cost,
    typeLine: card.type_line,
    oracleText: card.oracle_text,
    power: card.power,
    toughness: card.toughness,
    colors: card.colors ?? [],
    isLegalInCommander: card.legalities?.commander === 'legal',
    games: card.games ?? [],
    finishes: card.finishes ?? [],
    collectorNumber: card.collector_number,
    flavorText: card.flavor_text,
    artist: card.artist,
    edhrecRank: card.edhrec_rank,
    edhrecUri: card.related_uris?.edhrec
  }
}

function normalizePrice(price: CardMarketPrice) {
  return {
    avg: price.avg,
    low: price.low,
    avg1: price.avg1,
    avg7: price.avg7,
    avg30: price.avg30,
    trend: price.trend,

    avgFoil: price["avg-foil"],
    lowFoil: price["low-foil"],
    avg1Foil: price["avg1-foil"],
    avg7Foil: price["avg7-foil"],
    avg30Foil: price["avg30-foil"],
    trendFoil: price["trend-foil"],

    idProduct: price.idProduct,
    idCategory: price.idCategory
  }
}

function mergeWithPrice(cards: ScryfallCard[], prices: CardMarketPrice[]) {
  const priceMap = new Map(
    prices.map(p => [p.idProduct.toString(), p])
  )

  return cards.map(card => {
    const normalized = normalizeScryfallCard(card)
    const price = normalized.cardmarketId
      ? priceMap.get(normalized.cardmarketId.toString())
      : null

    return {
      ...normalized,
      price: price ? normalizePrice(price) : null
    }
  })
}

function verifySupabaseConnection(): void {
  try {
    getSupabaseClient();
    console.log(`📡 Connected to: ${process.env.SUPABASE_URL}\n`);
  } catch (error: any) {
    console.error('❌ Supabase connection failed:', error.message);
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                              BATCH IMPORT LOGIC                             */
/* -------------------------------------------------------------------------- */

async function importInBatches(
  tableName: string,
  data: any[],
  batchSize: number = BATCH_SIZE
): Promise<ImportResult> {
  const total = data.length;
  let imported = 0;
  let errors = 0;

  console.log(`\n📥 Importing ${total} records into ${tableName}...`);

  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = data.slice(offset, offset + batchSize);
    const batchNumber = Math.floor(offset / batchSize) + 1;

    let attempt = 0;
    let success = false;

    while (!success && attempt < MAX_RETRIES) {
      attempt++;

      try {
        const options =
          tableName === 'card_data'
            ? { onConflict: 'id', ignoreDuplicates: false }
            : {};

        const { error } = await getSupabaseClient()
          .from(tableName)
          .upsert(batch, options);

        if (error) {
          if (isTimeoutError(error) && attempt < MAX_RETRIES) {
            console.log(
              `  ⚠️  Timeout in batch ${batchNumber}, retry ${attempt}/${MAX_RETRIES}`
            );
            await sleep(2000 * attempt);
            continue;
          }

          console.error(`  ❌ Batch ${batchNumber} failed:`, error.message);
          errors++;
          break;
        }

        imported += batch.length;
        success = true;

        const progress = ((imported / total) * 100).toFixed(1);
        process.stdout.write(
          `\r  Progress: ${imported}/${total} (${progress}%) | Errors: ${errors}`
        );
      } catch (err: any) {
        console.error(`  ❌ Unexpected error in batch ${batchNumber}:`, err.message);
        errors++;
        break;
      }
    }

    if (offset + batchSize < total) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n  ✓ Completed: ${imported} imported, ${errors} failed batches\n`);
  return { imported, errors };
}

function isTimeoutError(error: { message?: string }): boolean {
  return Boolean(
    error.message?.includes('timeout') ||
    error.message?.includes('statement timeout')
  );
}

/* -------------------------------------------------------------------------- */
/*                             DOWNLOAD UTILITIES                              */
/* -------------------------------------------------------------------------- */

async function downloadJSON<T>(url: string, label: string): Promise<T> {
  console.log(`\n⬇️  Downloading ${label}...`);

  const response = await axios.get(url, {
    onDownloadProgress: event => {
      if (event.total) {
        const percent = Math.round((event.loaded * 100) / event.total);
        process.stdout.write(
          `\r  Progress: ${percent}% (${(event.loaded / 1024 / 1024).toFixed(2)} MB)`
        );
      }
    }
  });

  console.log('\n  ✓ Download complete\n');
  return response.data;
}

async function downloadAndDecompressJSON<T>(
  url: string,
  label: string
): Promise<T> {
  console.log(`\n⬇️  Downloading ${label}...`);

  const response: AxiosResponse<ArrayBuffer> = await axios.get(url, {
    responseType: 'arraybuffer',
    decompress: false,
    headers: { 'Accept-Encoding': 'gzip' }
  });

  console.log('  ✓ Download complete');

  const buffer = Buffer.from(response.data);
  const isGzipped = buffer[0] === 0x1f && buffer[1] === 0x8b;

  const jsonBuffer = isGzipped ? await gunzip(buffer) : buffer;
  const parsed = JSON.parse(jsonBuffer.toString('utf8'));

  console.log(
    `  ✓ Parsed JSON (${Array.isArray(parsed) ? parsed.length : 'unknown'} records)\n`
  );

  return parsed;
}

/* -------------------------------------------------------------------------- */
/*                               IMPORT TASKS                                 */
/* -------------------------------------------------------------------------- */

async function fetchScryfallBulkMetadata(): Promise<BulkDataItem> {
  console.log('🔍 Fetching Scryfall bulk metadata...');

  const response: AxiosResponse<BulkDataResponse> =
    await axios.get(SCRYFALL_BULK_API);

  const item = response.data.data.find(d => d.type === 'unique_artwork');

  if (!item) {
    throw new Error('unique_artwork bulk data not found');
  }

  console.log(`  ✓ ${item.name}`);
  console.log(`  📦 ${(item.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  📅 Updated: ${item.updated_at}`);

  return item;
}

async function getScryfallCards(): Promise<ScryfallCard[]> {
  console.log('📚 Fetching Scryfall card data...')
  const bulk = await fetchScryfallBulkMetadata()
  const cards: ScryfallCard[] = await downloadAndDecompressJSON(
    bulk.download_uri,
    'Scryfall Unique Artwork'
  );
  return cards.filter(card => card.set_type !== 'memorabilia' && card.set_type !== 'token');
}

async function getPriceData(): Promise<CardMarketPrice[]> {
  console.log('💰 Fetching CardMarket price data...')
  const data = await downloadJSON<PriceGuideData>(
    CARDMARKET_PRICE_GUIDE,
    'CardMarket Price Guide'
  );
  return data.priceGuides;
}

/* -------------------------------------------------------------------------- */
/*                              CLEARING LOGIC                                 */
/* -------------------------------------------------------------------------- */

async function clearTables(): Promise<void> {
  console.log('🗑️  Clearing existing data...');

  const { error } = await getSupabaseClient().rpc('clear_all_data');

  if (error) {
    console.error('❌ clear_all_data failed:', error.message);
    throw new Error(error.message);
  }

  console.log('  ✓ Tables cleared');
}

/* -------------------------------------------------------------------------- */
/*                                   SYNC                                     */
/* -------------------------------------------------------------------------- */

async function sync(): Promise<SyncResult> {
  const start = Date.now();

  printHeader();
  verifySupabaseConnection();

  try {
    await clearTables();

    const scryfallCards = await getScryfallCards();
    const priceData = await getPriceData();

    const mergedData = mergeWithPrice(scryfallCards, priceData);
    const mappedData = mergedData.map(card => ({
      id: card.id,
      name: card.name,
      cardmarket_id: card.cardmarketId,
      data: card,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const importResult = await importInBatches('card_data', mappedData);

    return printSummary(start, importResult);
  } catch (error: any) {
    console.error('\n❌ Fatal sync error:', error.message);
    throw error;
  }
}

function printHeader(): void {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   ManaLedger Data Sync to Supabase   ║');
  console.log('╚══════════════════════════════════════╝\n');
}

function printSummary(
  start: number,
  importResult: ImportResult,
): SyncResult {
  const duration = (Date.now() - start) / 1000;
  const totalErrors = importResult.errors;

  console.log('╔══════════════════════════════════════╗');
  console.log('║            Sync Complete!            ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('\n📊 Summary:');
  console.log(`  Scryfall: ${importResult.imported}`);
  console.log(`  Duration: ${duration.toFixed(2)}s`);
  console.log(`  Errors:   ${totalErrors}\n`);

  if (totalErrors > 0) {
    console.log('⚠️  Some batches failed. Check logs above.\n');
  }

  return {
    importResult: importResult,
    duration: parseFloat(duration.toFixed(2)),
    totalErrors
  };
}

/* -------------------------------------------------------------------------- */
/*                                   CLI                                      */
/* -------------------------------------------------------------------------- */

if (require.main === module) {
  sync().catch(err => {
    console.error('Sync failed:', err.message);
    process.exit(1);
  });
}

export { sync };

