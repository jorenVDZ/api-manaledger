-- ManaLedger Database Schema
-- PostgreSQL 12+

-- Enable pg_trgm extension for fast fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS scryfall_data (
    id TEXT PRIMARY KEY, -- Scryfall uses UUID strings
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL, -- Full JSON data for flexibility
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cardmarket_price_guide (
    id SERIAL PRIMARY KEY,
    scryfallId INTEGER NOT NULL, -- CardMarket product ID
    data JSONB NOT NULL, -- Full pricing data
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Note: Foreign key removed as Scryfall and CardMarket use different ID systems
-- You can link them via card names or create a mapping table if needed

-- =============================================================================
-- Indexes for Performance Optimization
-- =============================================================================

-- Primary lookup indexes
CREATE INDEX idx_scryfall_name ON scryfall_data(name);
CREATE INDEX idx_scryfall_name_trgm ON scryfall_data USING GIN (name gin_trgm_ops); -- For fast fuzzy search
CREATE INDEX idx_scryfall_created ON scryfall_data(createdAt);
CREATE INDEX idx_price_scryfall_id ON cardmarket_price_guide(scryfallId);
CREATE INDEX idx_price_created ON cardmarket_price_guide(createdAt);

-- GIN indexes for JSONB - enables fast containment and existence queries
CREATE INDEX idx_scryfall_data_gin ON scryfall_data USING GIN (data);
CREATE INDEX idx_price_data_gin ON cardmarket_price_guide USING GIN (data);

-- JSONB path indexes for frequently queried fields in scryfall_data
CREATE INDEX idx_scryfall_set ON scryfall_data ((data->>'set_name'));
CREATE INDEX idx_scryfall_set_code ON scryfall_data ((data->>'set'));
CREATE INDEX idx_scryfall_rarity ON scryfall_data ((data->>'rarity'));
CREATE INDEX idx_scryfall_colors ON scryfall_data ((data->>'colors'));
CREATE INDEX idx_scryfall_type ON scryfall_data ((data->>'type_line'));
CREATE INDEX idx_scryfall_mana_cost ON scryfall_data ((data->>'mana_cost'));
CREATE INDEX idx_scryfall_oracle_id ON scryfall_data ((data->>'oracle_id'));

-- JSONB path indexes for frequently queried fields in cardmarket_price_guide
CREATE INDEX idx_price_product_id ON cardmarket_price_guide ((data->>'idProduct'));
CREATE INDEX idx_price_category_id ON cardmarket_price_guide ((data->>'idCategory'));
CREATE INDEX idx_price_avg ON cardmarket_price_guide (((data->>'avg')::numeric));
CREATE INDEX idx_price_trend ON cardmarket_price_guide (((data->>'trend')::numeric));

-- Composite indexes for common query patterns
CREATE INDEX idx_scryfall_name_set ON scryfall_data (name, (data->>'set'));
CREATE INDEX idx_price_scryfall_updated ON cardmarket_price_guide (scryfallId, updatedAt DESC);

-- =============================================================================
-- Triggers for Auto-Update Timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scryfall_data_updated_at 
    BEFORE UPDATE ON scryfall_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_guid_updated_at 
    BEFORE UPDATE ON cardmarket_price_guide
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Helper Functions for Data Import
-- =============================================================================

-- Function to efficiently clear all data from tables
-- This is much faster than DELETE queries and is used during full sync
CREATE OR REPLACE FUNCTION clear_all_data()
RETURNS void AS $$
BEGIN
    -- TRUNCATE is much faster than DELETE as it doesn't scan rows
    TRUNCATE TABLE cardmarket_price_guide RESTART IDENTITY CASCADE;
    TRUNCATE TABLE scryfall_data RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- User Collections Tables
-- =============================================================================

-- Table to store individual cards in a user's collection
CREATE TABLE IF NOT EXISTS collection_items (
    id SERIAL PRIMARY KEY,
    userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scryfallId TEXT NOT NULL REFERENCES scryfall_data(id) ON DELETE CASCADE,
    data JSONB NOT NULL, -- Contains: id, userId, scryfallId, amount, isFoil, pricePaid, fromBooster
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for collection_items
CREATE INDEX idx_collection_items_user_id ON collection_items(userId);
CREATE INDEX idx_collection_items_scryfall_id ON collection_items(scryfallId);
CREATE INDEX idx_collection_items_user_card ON collection_items(userId, scryfallId);
CREATE INDEX idx_collection_items_created ON collection_items(createdAt);

-- GIN index for JSONB data
CREATE INDEX idx_collection_items_data_gin ON collection_items USING GIN (data);

-- Trigger for auto-update timestamps
CREATE TRIGGER update_collection_items_updated_at 
    BEFORE UPDATE ON collection_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();