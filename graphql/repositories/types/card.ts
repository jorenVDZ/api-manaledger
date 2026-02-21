/**
 * Scryfall Card model - represents a Magic: The Gathering card
 * Based on Scryfall API data structure
 */

export interface CardmarketPrice {
  avg?: number;
  low?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
  trend?: number;
  avgFoil?: number;
  lowFoil?: number;
  avg1Foil?: number;
  avg7Foil?: number;
  avg30Foil?: number;
  trendFoil?: number;
}

export interface ImageUris {
  png?: string;
  large?: string;
  small?: string;
  normal?: string;
  artCrop?: string;
  borderCrop?: string;
}

export interface Legalities {
  duel?: string;
  brawl?: string;
  penny?: string;
  predh?: string;
  future?: string;
  legacy?: string;
  modern?: string;
  pauper?: string;
  alchemy?: string;
  pioneer?: string;
  vintage?: string;
  historic?: string;
  standard?: string;
  timeless?: string;
  commander?: string;
  gladiator?: string;
  oldschool?: string;
  premodern?: string;
  oathbreaker?: string;
  standardbrawl?: string;
  paupercommander?: string;
}

export interface CardFace {
  name: string;
  manaCost?: string;
  typeLine?: string;
  oracleText?: string;
  colors?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  flavorText?: string;
  artist?: string;
  imageUris?: ImageUris;
}

/**
 * Main Card interface representing a Scryfall card
 * Simplified to include only essential game and display properties
 */
export interface Card {
  // Core identifiers
  id: string;
  oracleId?: string;
  cardmarketId?: number;
  
  // Basic card information
  name: string;
  lang: string;
  releasedAt?: string;
  scryfallUri?: string;
  
  // Image properties
  imageUris?: ImageUris;
  
  // Game properties
  manaCost?: string;
  cmc: number;
  typeLine: string;
  oracleText?: string;
  colors?: string[];
  colorIdentity?: string[];
  keywords?: string[];
  
  // Multi-faced cards
  cardFaces?: CardFace[];
  
  // Legalities
  legalities?: Legalities;
  
  // Set information
  set: string;
  setName: string;
  setType?: string;
  
  // Collection information
  collectorNumber: string;
  rarity: string;
  flavorText?: string;
  
  // Artist
  artist?: string;
  
  // Rankings
  edhrecRank?: number;
  pennyRank?: number;
  
  // Creature/Planeswalker stats
  power?: string;
  toughness?: string;
  loyalty?: string;
  
  // Additional properties
  games?: string[];
  gameChanger?: boolean;
}
