-- Migration: Create collection_items table
-- Date: 2026-02-21
-- Description: Adds table to track user card collections

-- =============================================================================
-- UP Migration
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

-- =============================================================================
-- DOWN Migration
-- =============================================================================

-- To rollback this migration, run:
-- DROP TABLE IF EXISTS collection_items CASCADE;
