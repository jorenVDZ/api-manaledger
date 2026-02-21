# ManaLedger API

A TypeScript/Node.js GraphQL API for managing Magic: The Gathering card data from Scryfall and CardMarket, stored in Supabase.

## Features

- 🚀 **GraphQL API** with Apollo Server for flexible, efficient data queries
- 📚 **Scryfall Integration** - Imports unique artwork bulk data (~85,000 cards)
- 💰 **CardMarket Pricing** - Imports price guide data (~450,000 price entries)
- 🗄️ **Supabase Backend** - PostgreSQL storage with optimized JSONB indexing
- 🔄 **Batch Import System** - Smart batching with retry logic and progress tracking
- ⏰ **Automated Syncs** - GitHub Actions workflow for scheduled data updates
- 🔐 **Supabase Authentication** - Secure JWT-based authentication
- 📖 **Interactive Playground** - Built-in Apollo Sandbox for API exploration
- ☁️ **Serverless Ready** - Configured for Vercel deployment
- 🔷 **Full TypeScript** - Type safety throughout with strict mode

## Quick Start

### Prerequisites

- Node.js 20+ 
- Supabase account (free tier works)
- At least 4GB available RAM for data imports

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

Get these credentials from your Supabase project settings.

### 3. Set Up Database

Run the SQL schema in your Supabase project:
- Navigate to the Supabase SQL Editor
- Copy and paste the contents of `database/schema.sql`
- Execute the script

This creates the required tables, indexes, triggers, and helper functions.

### 4. Import Data

Run the initial data sync:

```bash
npm run db:sync          # Full sync (clears existing data)
npm run db:sync:upsert   # Upsert mode (keeps existing data)
```

This downloads and imports Scryfall and CardMarket data. Takes 5-15 minutes depending on network speed.

### 5. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The server will be available at `http://localhost:3000`

## GraphQL API

### Endpoint

```
http://localhost:3000/graphql
```

### Interactive Playground

Visit `/graphql` in your browser to access the Apollo Sandbox where you can:
- Explore the complete schema documentation
- Test queries with auto-complete
- View query history
- Set authentication headers

### Available Queries

#### `card(scryfallId: ID!): Card!`
Get detailed card information by Scryfall ID. Returns complete card data including images, legalities, prices, and metadata.

**Authentication**: Required

**Example**:
```graphql
query GetCard($scryfallId: ID!) {
  card(scryfallId: $scryfallId) {
    id
    name
    manaCost
    typeLine
    oracleText
    power
    toughness
    rarity
    setName
    imageUris {
      normal
      large
    }
    prices {
      usd
      eur
    }
  }
}
```

#### `cards(limit: Int, offset: Int): CardsConnection!`
Get paginated list of all cards. Returns cards with pagination metadata.

**Authentication**: Required

**Parameters**:
- `limit` (default: 20, max: 100) - Number of cards to return
- `offset` (default: 0) - Number of cards to skip

**Example**:
```graphql
query GetCards($limit: Int, $offset: Int) {
  cards(limit: $limit, offset: $offset) {
    cards {
      id
      name
      setName
      rarity
    }
    total
    hasMore
  }
}
```

#### `searchCards(query: String!, limit: Int): [Card!]!`
Search for cards by name using fuzzy matching.

**Authentication**: Required

**Parameters**:
- `query` - Search string (case-insensitive partial match)
- `limit` (default: 20, max: 100) - Maximum results to return

**Example**:
```graphql
query SearchCards($query: String!, $limit: Int) {
  searchCards(query: $query, limit: $limit) {
    id
    name
    setName
    imageUris {
      small
    }
  }
}
```

### Authentication

Most GraphQL queries require authentication. Include your Supabase JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Getting a Token

1. **Sign up for an account**:
```bash
npm run signup
```

2. **Get an access token**:
```bash
npm run get-token
```

The token will be displayed in the console. Copy it and use it in your requests.

#### Using the Token

**In Apollo Sandbox**:
1. Click "Headers" at the bottom
2. Add header: `Authorization: Bearer YOUR_TOKEN`

**With cURL**:
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"query { cards(limit: 5) { cards { name } } }"}'
```

**With fetch API**:
```javascript
const response = await fetch('http://localhost:3000/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    query: `
      query GetCard($id: ID!) {
        card(scryfallId: $id) {
          name
          manaCost
        }
      }
    `,
    variables: { id: 'card-id-here' }
  })
});

const data = await response.json();
```

### Health Check

A simple health check endpoint is available without authentication:

```
GET http://localhost:3000/health
```

Returns:
```json
{
  "status": "OK",
  "message": "API is running"
}
```

## Project Structure

```
api-manaledger/
├── index.ts                    # Main server with Apollo setup
├── graphql/
│   ├── schema.ts              # GraphQL type definitions
│   ├── resolvers.ts           # Query resolvers
│   └── context.ts             # Authentication context
├── middleware/
│   └── auth.ts                # Express authentication middleware
├── services/
│   └── supabase.ts            # Supabase client configuration
├── database/
│   ├── schema.sql             # PostgreSQL database schema
│   └── import.ts              # Data import script
├── scripts/
│   ├── signup.ts              # User registration CLI
│   └── get-token.ts           # Token generator CLI
├── .github/
│   └── workflows/
│       └── sync-database.yml  # Automated sync workflow
├── dist/                      # Compiled JavaScript (generated)
├── tsconfig.json              # TypeScript configuration
├── vercel.json                # Vercel deployment config
├── package.json
└── README.md
```

## Database Schema

The application uses Supabase (PostgreSQL) with JSONB storage for flexible, high-performance card data storage.

### Tables

#### `scryfall_data`
Stores complete Scryfall card information:
- **id** (TEXT, PRIMARY KEY) - Scryfall UUID
- **name** (VARCHAR) - Card name
- **data** (JSONB) - Complete card object with all Scryfall fields
- **created_at** (TIMESTAMP) - Record creation time
- **updated_at** (TIMESTAMP) - Last update time (auto-updated)

#### `cardmarket_price_guide`
Stores CardMarket pricing information:
- **id** (SERIAL, PRIMARY KEY) - Auto-incremented ID
- **scryfall_id** (INTEGER) - CardMarket product ID
- **data** (JSONB) - Complete price guide object
- **created_at** (TIMESTAMP) - Record creation time
- **updated_at** (TIMESTAMP) - Last update time (auto-updated)

> **Note**: Scryfall and CardMarket use different ID systems. Cards can be linked via name matching or by creating a custom mapping table.

### Indexes

The schema includes optimized indexes for high-performance queries:

**Primary Indexes**:
- Card name and creation date lookups
- CardMarket product IDs

**JSONB GIN Indexes**:
- Enables fast containment and existence queries on full JSON data

**JSON Path Indexes** on frequently queried fields:
- **Scryfall**: set name, set code, rarity, colors, type line, mana cost, oracle ID
- **Prices**: product ID, category, average price, trend

**Composite Indexes**:
- Name + set combinations
- Product ID + update date for price history

### Performance Characteristics

- **Import Speed**: 5-15 minutes for full dataset (network dependent)
- **Batch Size**: 500 records per batch (optimized for throughput)
- **Retry Logic**: Automatic retry (up to 3 attempts) with exponential backoff
- **Storage**: ~2GB for complete dataset (~535,000 records)
- **Query Speed**: Sub-100ms for indexed lookups

## Data Sources & Import System

## Data Sources & Import System

### Scryfall Bulk Data
- **API**: https://api.scryfall.com/bulk-data
- **Dataset**: Unique Artwork (all-time unique prints)
- **Size**: ~250MB compressed (gzipped), ~1.5GB uncompressed
- **Records**: ~85,000+ unique card prints
- **Update Frequency**: Daily
- **Content**: Complete card objects including:
  - Card images (multiple sizes and formats)
  - Oracle text, rulings, and legalities
  - Set information and metadata
  - Artist information
  - Prices in multiple currencies

### CardMarket Price Guide
- **Source**: https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json
- **Size**: ~60MB uncompressed
- **Records**: ~450,000+ price entries
- **Update Frequency**: Multiple times daily
- **Content**: Current market prices including:
  - Average, low, and trend prices
  - Regular and foil prices
  - Product IDs and categories

### Import Process

The import script (`database/import.ts`) automatically:

1. **Fetches metadata** from Scryfall's bulk data API
2. **Downloads latest datasets** (compressed formats)
3. **Decompresses data** in-memory
4. **Parses JSON** structures
5. **Imports in batches** (500 records per batch with 100ms delay)
6. **Retries on failure** (up to 3 attempts with exponential backoff)
7. **Reports progress** in real-time with percentage completion

### Running Imports

**Full Sync** (clears tables, fresh import):
```bash
npm run db:sync
```

**Upsert Mode** (updates existing, adds new):
```bash
npm run db:sync:upsert
```

**Command-line Options**:
- `--no-clear` - Runs in upsert mode (same as db:sync:upsert)

**Console Output**:
- Real-time progress with percentages
- Batch-by-batch status updates
- Success/error counts
- Total duration and records processed

**Requirements**:
- Node.js 20+
- 4GB+ available RAM
- Stable internet connection (250MB+ download)
- Supabase project with schema set up

## Automated Scheduling with GitHub Actions

Database syncs can run automatically on a schedule using GitHub Actions.

### Setup

1. **Push your code to GitHub** (if not already done)

2. **Add repository secrets**:
   - Go to Settings → Secrets and variables → Actions
   - Add `SUPABASE_URL` (your Supabase project URL)
   - Add `SUPABASE_SECRET_KEY` (your service role key)

3. **Enable GitHub Actions** (if disabled):
   - Go to Actions tab → Enable workflows

The workflow file (`.github/workflows/sync-database.yml`) is already configured.

### Schedule

**Default**: Runs daily at 2:00 AM UTC

**Cron format**: `0 2 * * *`

### Manual Trigger

You can manually trigger a sync:
1. Go to Actions tab
2. Click "Database Sync" workflow
3. Click "Run workflow"
4. Select branch and confirm

### Workflow Features

- **Timeout**: 30 minutes (generous for slow networks)
- **Mode**: Upsert (preserves existing data)
- **Node.js**: Version 20 with npm caching
- **Logs**: Full console output available in Actions tab
- **Notifications**: Displays failure messages with run links

### Customizing the Schedule

Edit `.github/workflows/sync-database.yml` and change the cron expression:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Change this line
```

**Examples**:
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 12 * * 1-5` - Weekdays at noon

Use [crontab.guru](https://crontab.guru/) to build cron schedules.

## Development

### Available Scripts

```bash
# Install dependencies
npm install

# Development server (auto-reload with ts-node)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production server (run compiled JS)
npm start

# Database sync (full/clear mode)
npm run db:sync

# Database sync (upsert mode)
npm run db:sync:upsert

# User registration
npm run signup

# Get authentication token
npm run get-token
```

### TypeScript Configuration

The project uses **strict TypeScript** for maximum type safety:

- **Target**: ES2020
- **Module**: CommonJS
- **Output**: `dist/` directory
- **Strict mode**: Enabled
- **Additional checks**: No unused locals/parameters, implicit returns, fallthrough cases

All source files are TypeScript (`.ts`). The compiled JavaScript goes to `dist/` (gitignored).

### Development Workflow

1. Make changes to `.ts` files
2. Run `npm run dev` for hot-reloading
3. Test queries in Apollo Sandbox at `/graphql`
4. Build with `npm run build` before deploying

## Deployment

### Vercel (Serverless)

The project is configured for Vercel with `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.ts"
    }
  ]
}
```

**Deploy steps**:

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow prompts to link/create project
4. Add environment variables in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_ANON_KEY`
5. Deploy: `vercel --prod`

The server automatically detects serverless environment and uses the exported handler function.

### Other Platforms

The API can be deployed to any Node.js hosting platform:

- **Railway**: Connect GitHub repo, set environment variables
- **Fly.io**: Use `flyctl launch` and configure
- **Heroku**: Add buildpack, set Config Vars
- **Docker**: Create Dockerfile based on Node.js 20 image

Ensure environment variables are set on your platform.

## Troubleshooting

### Environment Variable Errors

**Error**: "SUPABASE_URL and SUPABASE_SECRET_KEY must be set"

**Solution**: Verify your `.env` file exists and contains valid credentials from your Supabase project settings (Settings → API).

### Import Hangs or Times Out

**Symptom**: Import appears stuck or shows timeout errors

**Causes & Solutions**:
- **Slow download**: Scryfall bulk file is ~250MB. Wait or check network.
- **Timeout errors**: Script automatically retries (up to 3 times). Check console for retry messages.
- **Memory errors**: Ensure 4GB+ RAM available. Close other applications.

### Authentication Failures

**Error**: "Not authenticated" or "Invalid token"

**Solutions**:
- Token expired: Generate new token with `npm run get-token`
- Wrong header format: Use `Authorization: Bearer YOUR_TOKEN` (capital B)
- Email not confirmed: Check Supabase settings and confirm email if required

### Database Query Errors

**Error**: Card not found or empty results

**Solutions**:
- Run full sync: `npm run db:sync`
- Check GitHub Actions logs for failed syncs
- Verify Scryfall ID format (UUID string, not integer)

### Build Errors

**Error**: TypeScript compilation fails

**Solutions**:
- Delete `dist/` folder: `rm -rf dist` (or `rmdir /s dist` on Windows)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version: Requires 20+

## License

ISC

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review [Supabase documentation](https://supabase.com/docs)
- Check [Scryfall API docs](https://scryfall.com/docs/api)
