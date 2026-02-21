# ManaLedger API

A Node.js API for managing Magic: The Gathering card data from Scryfall and CardMarket, stored in Supabase.

## Features

- 📚 Imports Scryfall's unique artwork bulk data (~85,000 cards)
- 💰 Imports CardMarket price guide data (~450,000 price entries)
- 🗄️ Stores data in Supabase with optimized JSONB indexing
- 🔄 Async background imports with status tracking
- 📖 Interactive Swagger API documentation

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Add your Supabase credentials:
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

3. **Set up database:**

Run the SQL schema in your Supabase project:
- Open Supabase SQL Editor
- Copy and paste contents of `database/schema.sql`
- Execute the script

4. **Import data:**

Start the server and trigger an import:
```bash
npm run dev

# In another terminal:
curl -X POST http://localhost:3000/api/import/sync
```

Or use the CLI:
```bash
npm run db:sync
```

## API Documentation

Interactive API documentation is available via Swagger UI:

**http://localhost:3000/api-docs**

Once the server is running, visit this URL to explore all endpoints, view request/response schemas, and test the API directly from your browser.

## API Endpoints

### Health Check
- **GET** `/health`
- Returns the API health status

### Import Operations

#### Start Full Database Sync
- **POST** `/api/import/sync`
- Downloads and imports all data from Scryfall and CardMarket
- Clears existing data and imports fresh data
- Runs asynchronously in background

#### Import Status
- **GET** `/api/import/status`
- Returns current import progress and last run results
- Shows number of records imported, errors, and duration

#### Import Scryfall Only
- **POST** `/api/import/scryfall`
- Imports only Scryfall card data

#### Import Prices Only
- **POST** `/api/import/prices`
- Imports only CardMarket price data

### Card Data

#### Get Card by Scryfall ID
- **GET** `/api/card/:scryfallId`
- Retrieves card information by Scryfall UUID
- Returns complete card data including metadata

## Example Usage

```bash
# Health check
curl http://localhost:3000/health

# Start full database sync
curl -X POST http://localhost:3000/api/import/sync \
  -H "Content-Type: application/json" \
  -d '{"clearFirst": true}'

# Check import status
curl http://localhost:3000/api/import/status

# Get card by Scryfall ID
curl http://localhost:3000/api/card/7a0d78d6-145e-4bbf-a31d-a8f8e6e1a3a0
```

## Project Structure

```
api-manaledger/
├── index.js                    # Main server file
├── swagger.js                  # Swagger/OpenAPI configuration
├── routes/
│   ├── card.js                 # Card API routes (Supabase queries)
│   └── import.js               # Import/sync API routes
├── database/
│   ├── schema.sql              # PostgreSQL database schema
│   └── import.js               # Import script for syncing data
├── package.json
├── .env.example
└── README.md
```

## Environment Configuration

Configure the following variables in your `.env` file:

```env
PORT=3000

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

- `SUPABASE_SERVICE_KEY` - Used for import operations (requires admin permissions)
- `SUPABASE_ANON_KEY` - Used for read operations (safer for public endpoints)

## Database

The application uses Supabase (PostgreSQL) with JSONB storage for flexible card data.

### Tables

#### `scryfall_data`
Stores complete Scryfall card data:
- `id` (TEXT) - Scryfall UUID (primary key)
- `name` (VARCHAR) - Card name
- `data` (JSONB) - Complete card object from Scryfall
- `created_at`, `updated_at` (TIMESTAMP)

#### `cardmarket_price_guid`
Stores CardMarket pricing data:
- `id` (SERIAL) - Auto-generated ID (primary key)
- `scryfall_id` (INTEGER) - CardMarket product ID
- `data` (JSONB) - Complete price object
- `created_at`, `updated_at` (TIMESTAMP)

> **Note**: Scryfall and CardMarket use different ID systems. Link cards via card names or create a mapping table.

### Indexes

The schema includes optimized indexes for fast queries:
- **GIN indexes** on JSONB columns for containment queries
- **Card name, set, rarity** for filtering
- **Price fields** (avg, trend) for range queries
- **Composite indexes** for common query patterns

### Performance

- **Import Speed**: 5-15 minutes for full sync (network dependent)
- **Batch Size**: 500 records per request (optimized to avoid timeouts)
- **Retry Logic**: Automatic retry (up to 3 attempts) for timeout errors
- **Storage**: ~2GB for complete dataset
- Real-time progress tracking during imports

## Data Sources

### Scryfall Bulk Data
- **API**: https://api.scryfall.com/bulk-data
- **Type**: Unique Artwork dataset
- **Size**: ~250MB compressed (gzipped), ~1.5GB uncompressed
- **Records**: ~85,000+ unique cards
- **Update Frequency**: Daily (automatically fetches latest)
- **Content**: Complete card objects with images, text, legalities, etc.

### CardMarket Price Guide
- **API**: https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json
- **Size**: ~60MB uncompressed
- **Records**: ~450,000+ price entries
- **Update Frequency**: Multiple times per day
- **Content**: Current market prices (avg, low, trend) for regular and foil cards

The import script automatically:
1. Fetches bulk data metadata from Scryfall
2. Downloads and decompresses the latest datasets
3. Imports data in batches with progress tracking
4. 

## Import Details

### Via API (Recommended)
Imports run **asynchronously** in the background:

```bash
# Start full sync (clears and reimports all data)
curl -X POST http://localhost:3000/api/import/sync \
  -H "Content-Type: application/json" \
  -d '{"clearFirst": true}'

# Start sync without clearing (upsert mode)
curl -X POST http://localhost:3000/api/import/sync \
  -H "Content-Type: application/json" \
  -d '{"clearFirst": false}'

# Check status
curl http://localhost:3000/api/import/status
```

**Status Response Example:**
```json
{
  "isRunning": false,
  "lastRun": "2026-02-21T10:30:00.000Z",
  "lastResult": {
    "success": true,
    "scryfallResult": { "imported": 85000, "errors": 0 },
    "priceResult": { "imported": 450000, "errors": 0 },
    "duration": 425.5
  },
  "progress": "Completed"
}
```

### Via CLI
Direct execution (blocks until complete):
```bash
npm run db:sync          # Full sync with clearing
npm run db:sync:upsert   # Upsert without clearing
```

### Important Notes
- Only **one import can run at a time** (concurrent requests return 409 Conflict)
- Import runs in background when triggered via API
- Check `/api/import/status` for progress
- Server console shows real-time progress with percentages
- Requires at least **4GB available RAM** for large file processing

## Troubleshooting

### "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"
Ensure your `.env` file has the correct Supabase credentials from your project settings.

### Import appears stuck
Scryfall bulk downloads can be slow (~250MB). Check server console for download progress. No timeout is set.

### Memory errors during import
The script loads large JSON files into memory. Ensure your system has at least 4GB of available RAM.

### 409 Conflict on import
An import is already running. Check `/api/import/status` and wait for it to complete.

### Foreign key or constraint errors
Run a full sync with `clearFirst: true` to wipe and reimport all data cleanly.

### Cards not found after import
Ensure the import completed successfully by checking `/api/import/status`. The `lastResult.success` should be `true`.Updates timestamps for each record

## Development

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run database sync from CLI
npm run db:sync

# Run database sync (upsert mode, no clear)
npm run db:sync:upsert
```
