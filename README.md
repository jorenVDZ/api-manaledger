# ManaLedger API

A TypeScript/Node.js API for managing Magic: The Gathering card data from Scryfall and CardMarket, stored in Supabase.

## Features

- 📚 Imports Scryfall's unique artwork bulk data (~85,000 cards)
- 💰 Imports CardMarket price guide data (~450,000 price entries)
- 🗄️ Stores data in Supabase with optimized JSONB indexing
- 🔄 Async background imports with status tracking
- ⏰ Automated scheduled syncs via GitHub Actions
- 📖 Interactive Swagger API documentation
- 🔷 Written in TypeScript for type safety and better developer experience

## Quick Start

### Automated Scheduled Syncs (GitHub Actions)

**Recommended setup**:
1. Fork/clone this repo to GitHub
2. Add repository secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
3. Workflow runs automatically daily at 2 AM UTC

See **[CRON_SETUP.md](CRON_SETUP.md)** for alternative scheduling options.

### Manual Setup

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
SUPABASE_SECRET_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

3. **Set up database:**

Run the SQL schema in your Supabase project:
- Open Supabase SQL Editor
- Copy and paste contents of `database/schema.sql`
- Execute the script

4. **Import data:**

Use the CLI to import data:
```bash
npm run db:sync
```

Or set up automated syncs with GitHub Actions (see [CRON_SETUP.md](CRON_SETUP.md)).

## API Documentation

Interactive API documentation is available via Swagger UI:

**http://localhost:3000/api-docs**

Once the server is running, visit this URL to explore all endpoints, view request/response schemas, and test the API directly from your browser.

## API Endpoints

### Health Check
- **GET** `/health`
- Returns the API health status

### Card Data

#### Get Card by Scryfall ID
- **GET** `/api/card/:scryfallId`
- Retrieves card information by Scryfall UUID
- Returns complete card data including metadata

## Example Usage

```bash
# Health check
curl http://localhost:3000/health

# Get card by Scryfall ID
curl http://localhost:3000/api/card/7a0d78d6-145e-4bbf-a31d-a8f8e6e1a3a0
```

## Project Structure

```
api-manaledger/
├── index.ts                    # Main server file
├── swagger.ts                  # Swagger/OpenAPI configuration
├── routes/
│   └── card.ts                 # Card API routes (Supabase queries)
├── database/
│   ├── schema.sql              # PostgreSQL database schema
│   └── import.ts               # Import script for syncing data
├── .github/
│   └── workflows/
│       └── sync-database.yml   # GitHub Actions automated sync
├── dist/                       # Compiled JavaScript output
├── tsconfig.json               # TypeScript configuration
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
SUPABASE_SECRET_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

- `SUPABASE_SECRET_KEY` - Used for import operations (requires admin permissions)
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

## Import Methods

### Via GitHub Actions (Automated - Recommended)
Database syncs run automatically on schedule:
- Configured to run daily at 2 AM UTC
- Uses upsert mode (no clearing)
- View logs in GitHub Actions tab
- See [CRON_SETUP.md](CRON_SETUP.md) for setup instructions

### Via CLI (Manual)
Direct execution from your local machine:
```bash
npm run db:sync          # Full sync with clearing
npm run db:sync:upsert   # Upsert without clearing (faster)
```

**Important Notes:**
- Console shows real-time progress with percentages during CLI execution
- Requires at least **4GB available RAM** for large file processing
- Typically takes 5-15 minutes depending on network speed
- Requires at least **4GB available RAM** for large file processing

## Automated Scheduling

Automated syncs run via **GitHub Actions** on a schedule:

**Quick Start**:
1. Add GitHub repository secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
2. Push the workflow file (already included in `.github/workflows/`)
3. Runs automatically daily at 2 AM UTC

See **[CRON_SETUP.md](CRON_SETUP.md)** for detailed setup instructions and customization options.

## Troubleshooting

### "SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
Ensure your `.env` file has the correct Supabase credentials from your project settings.

### Import appears stuck
Scryfall bulk downloads can be slow (~250MB). Check console output for download progress when running CLI commands.

### Memory errors during import
The script loads large JSON files into memory. Ensure your system has at least 4GB of available RAM.

### Foreign key or constraint errors
Run a full sync with `npm run db:sync` to wipe and reimport all data cleanly.

### Cards not found after import
Check the GitHub Actions workflow logs to ensure the sync completed successfully.

--- Development
Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server with auto-reload (TypeScript)
npm run dev

# Start production server (runs compiled JavaScript)
npm start

# Run database sync from CLI (TypeScript)
npm run db:sync

# Run database sync (upsert mode, no clear)
npm run db:sync:upsert
```

### TypeScript

The project is built with TypeScript for enhanced type safety and developer experience:

- **Source files**: All `.ts` files in root and subdirectories
- **Compiled output**: `dist/` directory (gitignored)
- **Build command**: `npm run build` - compiles TypeScript to JavaScript
- **Dev mode**: Uses `ts-node` for direct TypeScript execution
- **Vercel deployment**: Automatically builds TypeScript during deployment

Type definitions are included for all dependencies. The TypeScript configuration (`tsconfig.json`) is set to strict mode for maximum type safety.un database sync (upsert mode, no clear)
npm run db:sync:upsert
```
