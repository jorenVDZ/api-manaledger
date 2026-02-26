-- ManaLedger Database Schema
-- PostgreSQL 12+

-- Enable pg_trgm extension for fast fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS card_data (
    id TEXT PRIMARY KEY, -- Scryfall uses UUID strings
    name VARCHAR(255) NOT NULL,
    cardmarket_id integer,
    data JSONB NOT NULL, -- Full JSON data for flexibility
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =============================================================================
-- Indexes for Performance Optimization
-- =============================================================================

-- Primary lookup indexes
CREATE INDEX idx_card_name ON card_data(name);
CREATE INDEX idx_card_name_trgm ON card_data USING GIN (name gin_trgm_ops); -- For fast fuzzy search
CREATE INDEX idx_card_created ON card_data(created_at);
CREATE INDEX idx_cardmarket_id ON card_data(cardmarket_id);
CREATE INDEX idx_card_updated ON card_data(updated_at);

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

CREATE TRIGGER update_card_data_updated_at 
    BEFORE UPDATE ON card_data
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
    TRUNCATE TABLE card_data RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- User Collections Tables
-- =============================================================================

-- Table to store individual cards in a user's collection
CREATE TABLE IF NOT EXISTS collection_items (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL REFERENCES card_data(id) ON DELETE CASCADE,
    data JSONB NOT NULL, -- Contains: id, userId, cardId, amount, isFoil, pricePaid, fromBooster (in camelCase)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for collection_items
CREATE INDEX idx_collection_items_user_id ON collection_items(user_id);
CREATE INDEX idx_collection_items_card_id ON collection_items(card_id);
CREATE INDEX idx_collection_items_user_card ON collection_items(user_id, card_id);
CREATE INDEX idx_collection_items_created ON collection_items(created_at);

-- GIN index for JSONB data
CREATE INDEX idx_collection_items_data_gin ON collection_items USING GIN (data);

-- Trigger for auto-update timestamps
CREATE TRIGGER update_collection_items_updated_at 
    BEFORE UPDATE ON collection_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get the latest printing of each card matching a search term, along with total count for pagination
create function get_latest_printing_with_count(
  search text,
  off int default 0,
  lim int default null
)
returns table (
  data jsonb,
  total_count bigint
)
language sql
as $$
  with normalized as (
    select
      data,
      case
        when name like '%//%'
         and trim(split_part(name, '//', 1)) = trim(split_part(name, '//', 2))
        then trim(split_part(name, '//', 1))
        else name
      end as normalized_name
    from card_data
    where name ilike '%' || search || '%'
  ),
  latest as (
    select distinct on (normalized_name)
      data
    from normalized
    order by
      normalized_name,
      (data->>'released_at')::date desc
  )
  select
    data,
    count(*) over() as total_count
  from latest
  offset off
  limit coalesce(lim, 2147483647);
$$;