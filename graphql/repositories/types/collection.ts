/**
 * Collection models - represents a user's Magic: The Gathering card collection
 */

/**
 * Data stored in the JSONB field of collection_items
 */
export interface CollectionItemData {
  /** Database ID (also stored as separate column) */
  id: number;
  /** User ID (also stored as separate column) */
  userId: string;
  /** Scryfall ID (also stored as separate column) */
  scryfallId: string;
  /** Number of copies owned */
  amount: number;
  /** Whether the card is foil */
  isFoil: boolean;
  /** Price paid for this item (nullable) */
  pricePaid?: number | null;
  /** Whether this item came from a booster pack (nullable) */
  fromBooster?: boolean | null;
}

/**
 * Represents a single item row in the collection_items table
 */
export interface CollectionItem {
  /** Database ID */
  id: number;
  /** User ID who owns this item */
  userId: string;
  /** Scryfall ID of the card */
  scryfallId: string;
  /** JSONB data containing item details */
  data: CollectionItemData;
  /** Timestamp when the item was created */
  createdAt: Date;
  /** Timestamp when the item was last updated */
  updatedAt: Date;
}

/**
 * Represents a user's complete card collection
 */
export interface Collection {
  /** User ID who owns this collection */
  userId: string;
  /** List of cards/items in the collection */
  items: CollectionItem[];
}
