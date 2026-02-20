const axios = require('axios');

// Scryfall API configuration
const SCRYFALL_CONFIG = {
  baseUrl: process.env.SCRYFALL_API_BASE_URL || 'https://api.scryfall.com',
  timeout: parseInt(process.env.SCRYFALL_REQUEST_TIMEOUT) || 10000,
  userAgent: 'ManaLedger-API/1.0'
};

/**
 * Fetch card data from Scryfall by CardMarket Product ID
 */
async function getCardByCardMarketId(productId) {
  try {
    const response = await axios.get(
      `${SCRYFALL_CONFIG.baseUrl}/cards/cardmarket/${productId}`,
      {
        timeout: SCRYFALL_CONFIG.timeout,
        headers: {
          'User-Agent': SCRYFALL_CONFIG.userAgent
        }
      }
    );
    return response.data;
  } catch (error) {
    console.warn(`Scryfall data not available for product ${productId}:`, error.message);
    return null;
  }
}

/**
 * Format Scryfall data for API response
 */
function formatScryfallData(scryfallData) {
  if (!scryfallData) {
    return null;
  }

  return {
    id: scryfallData.id,
    oracleId: scryfallData.oracle_id,
    name: scryfallData.name,
    manaCost: scryfallData.mana_cost,
    cmc: scryfallData.cmc,
    typeLine: scryfallData.type_line,
    oracleText: scryfallData.oracle_text,
    power: scryfallData.power,
    toughness: scryfallData.toughness,
    colors: scryfallData.colors,
    colorIdentity: scryfallData.color_identity,
    keywords: scryfallData.keywords,
    legalities: scryfallData.legalities,
    set: {
      code: scryfallData.set,
      name: scryfallData.set_name,
      type: scryfallData.set_type
    },
    rarity: scryfallData.rarity,
    artist: scryfallData.artist,
    collectorNumber: scryfallData.collector_number,
    releasedAt: scryfallData.released_at,
    images: scryfallData.image_uris,
    edhrecRank: scryfallData.edhrec_rank,
    links: {
      scryfall: scryfallData.scryfall_uri,
      gatherer: scryfallData.related_uris?.gatherer,
      edhrec: scryfallData.related_uris?.edhrec,
      cardmarket: scryfallData.purchase_uris?.cardmarket
    }
  };
}

module.exports = {
  getCardByCardMarketId,
  formatScryfallData
};
