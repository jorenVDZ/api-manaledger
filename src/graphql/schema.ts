export const typeDefs = `#graphql
  """
  CardMarket price data
  """
  type CardmarketPrice {
    avg: Float
    low: Float
    avg1: Float
    avg7: Float
    avg30: Float
    trend: Float
    avgFoil: Float
    lowFoil: Float
    avg1Foil: Float
    avg7Foil: Float
    avg30Foil: Float
    trendFoil: Float
    idProduct: Int
    idCategory: Int
  }

  """
  Scryfall card image URIs
  """
  type ImageUris {
    small: String
    normal: String
    [key: String!]: String
  }

  """
  Card face for multi-faced cards
  """
  type CardFace {
    name: String!
    manaCost: String
    typeLine: String
    oracleText: String
    colors: [String!]
    power: String
    toughness: String
  }

  """
  Scryfall card - represents a Magic: The Gathering card
  """
  type Card {
    id: ID!
    cardmarketId: Int
    name: String!
    lang: String!
    releasedAt: String
    scryfallUri: String
    layout: String
    colorIdentity: [String!]
    keywords: [String!]
    set: CardSet!
    rarity: String!
    imageUris: ImageUris
    manaCost: String
    typeLine: String!
    oracleText: String
    power: String
    toughness: String
    colors: [String!]
    isLegalInCommander: Boolean
    games: [String!]
    finishes: [String!]
    collectorNumber: String
    flavorText: String
    artist: String
    edhrecRank: Int
    edhrecUri: String
    producedMana: [String!]
    faces: [CardFace!]
    price: CardmarketPrice
  }

  """
  Card set details
  """
  type CardSet {
    id: String!
    code: String!
    name: String!
    type: String!
  }

  """
  Paginated cards response
  """
  type CardsConnection {
    cards: [Card!]!
    total: Int!
    hasMore: Boolean!
  }

  type Query {
    card(scryfallId: ID!): Card!
    searchCards(query: String!, limit: Int = 20, offset: Int = 0): CardsConnection!
  }
`;
