const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const scryfallService = require('./scryfallService');

// Configuration from environment
const CARDMARKET_URLS = {
  priceGuide: process.env.CARDMARKET_PRICE_GUIDE_URL || 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json',
  products: process.env.CARDMARKET_PRODUCTS_URL || 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_1.json'
};

const DATA_DIR = path.join(__dirname, '..', 'data');

// Store last sync status in memory (in production, use a database)
let lastSyncStatus = {
  lastSync: null,
  status: 'idle',
  message: 'No sync has been performed yet',
  filesDownloaded: []
};

/**
 * Download and sync CardMarket data files
 */
async function syncCardMarketData() {
  lastSyncStatus.status = 'syncing';
  lastSyncStatus.message = 'Sync in progress...';
  lastSyncStatus.filesDownloaded = [];
  
  const syncStartTime = new Date();
  const downloadedFiles = [];
  
  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  // Download price guide
  console.log('Downloading price guide...');
  const priceGuideResponse = await axios.get(CARDMARKET_URLS.priceGuide, {
    timeout: 60000 // 60 second timeout
  });
  const priceGuidePath = path.join(DATA_DIR, 'price_guide_1.json');
  await fs.writeFile(priceGuidePath, JSON.stringify(priceGuideResponse.data, null, 2));
  downloadedFiles.push('price_guide_1.json');
  console.log('Price guide downloaded successfully');
  
  // Download products
  console.log('Downloading products...');
  const productsResponse = await axios.get(CARDMARKET_URLS.products, {
    timeout: 60000 // 60 second timeout
  });
  const productsPath = path.join(DATA_DIR, 'products_singles_1.json');
  await fs.writeFile(productsPath, JSON.stringify(productsResponse.data, null, 2));
  downloadedFiles.push('products_singles_1.json');
  console.log('Products downloaded successfully');
  
  // Update sync status
  const syncEndTime = new Date();
  const duration = syncEndTime - syncStartTime;
  
  lastSyncStatus = {
    lastSync: syncEndTime.toISOString(),
    status: 'completed',
    message: 'Sync completed successfully',
    filesDownloaded: downloadedFiles,
    duration: `${(duration / 1000).toFixed(2)}s`
  };
  
  return {
    syncedAt: syncEndTime.toISOString(),
    filesDownloaded: downloadedFiles,
    duration: `${(duration / 1000).toFixed(2)}s`
  };
}

/**
 * Get the current sync status
 */
function getSyncStatus() {
  return lastSyncStatus;
}

/**
 * Mark sync as failed
 */
function markSyncFailed(errorMessage) {
  lastSyncStatus = {
    lastSync: new Date().toISOString(),
    status: 'failed',
    message: errorMessage,
    filesDownloaded: lastSyncStatus.filesDownloaded
  };
}

/**
 * Read CardMarket data files
 */
async function readCardMarketData() {
  const productsPath = path.join(DATA_DIR, 'products_singles_1.json');
  const priceGuidePath = path.join(DATA_DIR, 'price_guide_1.json');
  
  const productsFile = await fs.readFile(productsPath, 'utf-8');
  const priceGuideFile = await fs.readFile(priceGuidePath, 'utf-8');
  
  return {
    products: JSON.parse(productsFile),
    priceGuide: JSON.parse(priceGuideFile)
  };
}

/**
 * Get card details by product ID
 */
async function getCardByProductId(productId) {
  // Read CardMarket data files
  const { products: productsData, priceGuide: priceGuideData } = await readCardMarketData();
  
  // Find product in CardMarket data
  const product = productsData.products?.find(p => p.idProduct === productId);
  
  if (!product) {
    return null;
  }
  
  // Find price guide for this product
  const priceGuide = priceGuideData.priceGuides?.find(p => p.idProduct === productId);
  
  // Fetch data from Scryfall
  const scryfallData = await scryfallService.getCardByCardMarketId(productId);
  
  // Build comprehensive card object
  return buildCardObject(product, priceGuide, scryfallData);
}

/**
 * Build card data object
 */
function buildCardObject(product, priceGuide, scryfallData) {
  return {
    productId: product.idProduct,
    name: product.name,
    cardmarket: {
      pricing: priceGuide ? {
        regular: {
          average: priceGuide.avg,
          low: priceGuide.low,
          trend: priceGuide.trend,
          average1Day: priceGuide.avg1,
          average7Days: priceGuide.avg7,
          average30Days: priceGuide.avg30
        },
        foil: {
          average: priceGuide['avg-foil'],
          low: priceGuide['low-foil'],
          trend: priceGuide['trend-foil'],
          average1Day: priceGuide['avg1-foil'],
          average7Days: priceGuide['avg7-foil'],
          average30Days: priceGuide['avg30-foil']
        }
      } : null
    },
    scryfall: scryfallService.formatScryfallData(scryfallData)
  };
}

module.exports = {
  syncCardMarketData,
  getSyncStatus,
  markSyncFailed,
  getCardByProductId
};
