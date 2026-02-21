-- ManaLedger Database Schema
-- PostgreSQL 12+

CREATE TABLE IF NOT EXISTS scryfall_data (
    id TEXT PRIMARY KEY, -- Scryfall uses UUID strings
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL, -- Full JSON data for flexibility
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cardmarket_price_guid (
    id SERIAL PRIMARY KEY,
    scryfall_id INTEGER NOT NULL, -- CardMarket product ID
    data JSONB NOT NULL, -- Full pricing data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Note: Foreign key removed as Scryfall and CardMarket use different ID systems
-- You can link them via card names or create a mapping table if needed

-- =============================================================================
-- Indexes for Performance Optimization
-- =============================================================================

-- Primary lookup indexes
CREATE INDEX idx_scryfall_name ON scryfall_data(name);
CREATE INDEX idx_scryfall_created ON scryfall_data(created_at);
CREATE INDEX idx_price_scryfall_id ON cardmarket_price_guid(scryfall_id);
CREATE INDEX idx_price_created ON cardmarket_price_guid(created_at);

-- GIN indexes for JSONB - enables fast containment and existence queries
CREATE INDEX idx_scryfall_data_gin ON scryfall_data USING GIN (data);
CREATE INDEX idx_price_data_gin ON cardmarket_price_guid USING GIN (data);

-- JSONB path indexes for frequently queried fields in scryfall_data
CREATE INDEX idx_scryfall_set ON scryfall_data ((data->>'set_name'));
CREATE INDEX idx_scryfall_set_code ON scryfall_data ((data->>'set'));
CREATE INDEX idx_scryfall_rarity ON scryfall_data ((data->>'rarity'));
CREATE INDEX idx_scryfall_colors ON scryfall_data ((data->>'colors'));
CREATE INDEX idx_scryfall_type ON scryfall_data ((data->>'type_line'));
CREATE INDEX idx_scryfall_mana_cost ON scryfall_data ((data->>'mana_cost'));
CREATE INDEX idx_scryfall_oracle_id ON scryfall_data ((data->>'oracle_id'));

-- JSONB path indexes for frequently queried fields in cardmarket_price_guid
CREATE INDEX idx_price_product_id ON cardmarket_price_guid ((data->>'idProduct'));
CREATE INDEX idx_price_category_id ON cardmarket_price_guid ((data->>'idCategory'));
CREATE INDEX idx_price_avg ON cardmarket_price_guid (((data->>'avg')::numeric));
CREATE INDEX idx_price_trend ON cardmarket_price_guid (((data->>'trend')::numeric));

-- Composite indexes for common query patterns
CREATE INDEX idx_scryfall_name_set ON scryfall_data (name, (data->>'set'));
CREATE INDEX idx_price_scryfall_updated ON cardmarket_price_guid (scryfall_id, updated_at DESC);

-- =============================================================================
-- Triggers for Auto-Update Timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scryfall_data_updated_at 
    BEFORE UPDATE ON scryfall_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_guid_updated_at 
    BEFORE UPDATE ON cardmarket_price_guid
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
    TRUNCATE TABLE cardmarket_price_guid RESTART IDENTITY CASCADE;
    TRUNCATE TABLE scryfall_data RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql;