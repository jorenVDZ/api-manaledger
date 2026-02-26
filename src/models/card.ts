export interface Card {
  id: string;
  cardmarketId: number | null;
  name: string;
  lang: string;
  releasedAt: string;
  scryfallUri: string;
  layout: string;
  colorIdentity: string[];
  keywords: string[];
  set: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  rarity: string;
  imageUris?: {
    small: string;
    normal: string;
    [key: string]: string;
  };
  manaCost?: string;
  typeLine: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  isLegalInCommander?: boolean;
  games?: string[];
  finishes?: string[];
  collectorNumber?: string;
  flavorText?: string;
  artist?: string;
  edhrecRank?: number;
  edhrecUri?: string;
  producedMana?: string[];
  faces?: {
    name: string;
    manaCost: string;
    typeLine: string;
    oracleText: string;
    colors: string[];
    power: string;
    toughness: string;
  }[];
  price?: CardPrice | null;
}

export interface CardPrice {
  avg: number;
  low: number;
  avg1: number;
  avg7: number;
  avg30: number;
  trend: number;
  avgFoil: number;
  lowFoil: number;
  avg1Foil: number;
  avg7Foil: number;
  avg30Foil: number;
  trendFoil: number;
  idProduct: number;
  idCategory: number;
}