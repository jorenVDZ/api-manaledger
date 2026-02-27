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

-- =============================================================================
-- Wants List: users can create multiple wants lists containing card Scryfall IDs
-- =============================================================================

-- Ensure UUID generator is available for IDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS wants_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of objects: [{scryfall_id, amount, specific_printing_id, foil}]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_wants_lists_user ON wants_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_wants_lists_items_gin ON wants_lists USING GIN (items);

-- Triggers to keep `updated_at` current
CREATE TRIGGER update_wants_lists_updated_at
  BEFORE UPDATE ON wants_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
