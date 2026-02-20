# ManaLedger API

A simple Node.js API for syncing CardMarket data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Run the development server:
```bash
npm run dev
```

Or run in production mode:
```bash
npm start
```

## API Documentation

Interactive API documentation is available via Swagger UI:

**http://localhost:3000/api-docs**

Once the server is running, visit this URL to explore all endpoints, view request/response schemas, and test the API directly from your browser.

## API Endpoints

### Health Check
- **GET** `/health`
- Returns the API health status

### CardMarket Sync
- **POST** `/api/cardmarket/sync`
- Downloads and saves CardMarket data files:
  - Price Guide: `price_guide_1.json`
  - Products Singles: `products_singles_1.json`
- Files are saved to the `data/` directory
- Response includes files downloaded and sync duration

### Sync Status
- **GET** `/api/cardmarket/sync/status`
- Returns the status of the last sync operation
- Includes timestamp, status, files downloaded, and duration

### Get Card by Product ID
- **GET** `/api/card/:productId`
- Retrieves detailed card information by CardMarket Product ID
- Combines data from local CardMarket files and Scryfall API
- Returns comprehensive card data including:
  - Product details from CardMarket
  - Pricing information (regular and foil)
  - Card details from Scryfall (text, stats, legalities, images)
  - Links to various resources

## Example Usage

```bash
# Health check
curl http://localhost:3000/health

# Initiate sync
curl -X POST http://localhost:3000/api/cardmarket/sync

# Check sync status
curl http://localhost:3000/api/cardmarket/sync/status

# Get card details by CardMarket Product ID
curl http://localhost:3000/api/card/379041
```

## Project Structure

```
api-manaledger/
├── index.js                    # Main server file
├── swagger.js                  # Swagger/OpenAPI configuration
├── routes/
│   ├── card.js                 # Card API routes
│   └── cardMarket.js           # CardMarket API routes
├── services/
│   ├── cardMarketService.js    # Business logic for CardMarket operations
│   └── scryfallService.js      # Scryfall API integration
├── data/                       # Downloaded CardMarket JSON files
│   ├── .gitkeep
│   ├── price_guide_1.json
│   └── products_singles_1.json
├── package.json
├── .env.example
├── .env                        # Your local configuration (not in git)
└── README.md
```

## Environment Configuration

Configure the following variables in your `.env` file:

```bash
PORT=3000

# CardMarket Data URLs
CARDMARKET_PRICE_GUIDE_URL=https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json
CARDMARKET_PRODUCTS_URL=https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_1.json

# Scryfall API Configuration
SCRYFALL_API_BASE_URL=https://api.scryfall.com
SCRYFALL_REQUEST_TIMEOUT=10000
```

## Data Files

The sync endpoint downloads two JSON files from CardMarket:
- **price_guide_1.json** - Price guide data from CardMarket
- **products_singles_1.json** - Product singles catalog

These files are saved to the `data/` directory and are excluded from git tracking.

## Next Steps

- Add database integration for storing parsed data
- Add authentication/authorization
- Add error handling middleware
- Add request validation
- Add logging
