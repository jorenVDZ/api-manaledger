export interface CollectionItem {
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
