export const typeDefs = `#graphql
  """
  CardMarket price data
  """
  type CardmarketPrice {
    """Average price"""
    avg: Float
    
    """Low price"""
    low: Float
    
    """1-day average price"""
    avg1: Float
    
    """7-day average price"""
    avg7: Float
    
    """30-day average price"""
    avg30: Float
    
    """Trend price"""
    trend: Float
    
    """Average foil price"""
    avgFoil: Float
    
    """Low foil price"""
    lowFoil: Float
    
    """1-day average foil price"""
    avg1Foil: Float
    
    """7-day average foil price"""
    avg7Foil: Float
    
    """30-day average foil price"""
    avg30Foil: Float
    
    """Trend foil price"""
    trendFoil: Float
  }

  """
  Scryfall card image URIs
  """
  type ImageUris {
    small: String
    normal: String
    large: String
    png: String
    artCrop: String
    borderCrop: String
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
    loyalty: String
    flavorText: String
    artist: String
    imageUris: ImageUris
  }

  """
  Card legality for a specific format
  """
  type Legalities {
    standard: String
    future: String
    historic: String
    gladiator: String
    pioneer: String
    explorer: String
    modern: String
    legacy: String
    pauper: String
    vintage: String
    penny: String
    commander: String
    oathbreaker: String
    brawl: String
    historicbrawl: String
    alchemy: String
    paupercommander: String
    duel: String
    oldschool: String
    premodern: String
    predh: String
  }



  """
  Scryfall card - represents a Magic: The Gathering card
  """
  type Card {
    """Scryfall UUID for this card"""
    id: ID!
    
    """Oracle ID - shared across all prints of the same card"""
    oracleId: String
    
    """Cardmarket ID"""
    cardmarketId: Int
    
    """Card name"""
    name: String!
    
    """Language code"""
    lang: String!
    
    """Release date"""
    releasedAt: String
    
    """Scryfall API URI"""
    scryfallUri: String
    
    """Image URIs"""
    imageUris: ImageUris
    
    """Mana cost"""
    manaCost: String
    
    """Converted mana cost / Mana value"""
    cmc: Float!
    
    """Type line"""
    typeLine: String!
    
    """Oracle text"""
    oracleText: String
    
    """Card colors"""
    colors: [String!]
    
    """Color identity"""
    colorIdentity: [String!]
    
    """Keywords"""
    keywords: [String!]
    
    """Card faces (for multi-faced cards)"""
    cardFaces: [CardFace!]
    
    """Legalities in various formats"""
    legalities: Legalities
    
    """Set code"""
    set: String!
    
    """Set name"""
    setName: String!
    
    """Set type"""
    setType: String
    
    """Collector number"""
    collectorNumber: String!
    
    """Card rarity"""
    rarity: String!
    
    """Flavor text"""
    flavorText: String
    
    """Artist"""
    artist: String
    
    """EDH rank"""
    edhrecRank: Int
    
    """Penny rank"""
    pennyRank: Int
    
    """Power (for creatures)"""
    power: String
    
    """Toughness (for creatures)"""
    toughness: String
    
    """Loyalty (for planeswalkers)"""
    loyalty: String
    
    """Games this card is available in"""
    games: [String!]
    
    """Whether this card is a game changer"""
    gameChanger: Boolean

    # ===== Computed/Custom Fields =====
    """
    Whether the card is legal in Commander format
    """
    isCommanderLegal: Boolean!
    
    """
    Price data from CardMarket (if available)
    """
    cardmarketPrice: CardmarketPrice
  }

  """
  Card ruling from Scryfall
  """
  type Ruling {
    source: String!
    publishedAt: String!
    comment: String!
  }

  """
  Paginated cards response
  """
  type CardsConnection {
    cards: [Card!]!
    total: Int!
    hasMore: Boolean!
  }

  """
  Collection item - represents a card in a user's collection
  """
  type CollectionItem {
    """Database ID"""
    id: Int!
    
    """User ID who owns this item"""
    userId: String!
    
    """Scryfall ID of the card"""
    scryfallId: String!
    
    """Card data (populated from card itself)"""
    card: Card
    
    """Number of copies owned"""
    amount: Int!
    
    """Whether the card is foil"""
    isFoil: Boolean!
    
    """Price paid for this item"""
    pricePaid: Float
    
    """Whether this came from a booster pack"""
    fromBooster: Boolean
    
    """Timestamp when item was added"""
    createdAt: String!
    
    """Timestamp when item was last updated"""
    updatedAt: String!
  }

  """
  Paginated collection items response
  """
  type CollectionConnection {
    items: [CollectionItem!]!
    total: Int!
    hasMore: Boolean!
  }

  """
  Collection statistics
  """
  type CollectionStats {
    """Total number of individual cards (sum of amounts)"""
    totalCards: Int!
    
    """Total number of unique entries"""
    totalItems: Int!
    
    """Number of foil items"""
    foilCount: Int!
    
    """Total value of collection"""
    totalValue: Float!
    
    """Number of cards from boosters"""
    boosterCount: Int!
    
    """Number of unique cards"""
    uniqueCards: Int!
  }

  """
  Input for adding a card to collection
  """
  input AddCollectionItemInput {
    """Scryfall ID of the card"""
    scryfallId: String!
    
    """Number of copies"""
    amount: Int!
    
    """Whether the card is foil"""
    isFoil: Boolean!
    
    """Price paid for this item"""
    pricePaid: Float
    
    """Whether this came from a booster pack"""
    fromBooster: Boolean
  }

  """
  Input for updating a collection item
  """
  input UpdateCollectionItemInput {
    """Number of copies"""
    amount: Int
    
    """Whether the card is foil"""
    isFoil: Boolean
    
    """Price paid for this item"""
    pricePaid: Float
    
    """Whether this came from a booster pack"""
    fromBooster: Boolean
  }

  type Query {
    """
    Get card details by Scryfall ID
    Returns the complete Scryfall card object
    Requires authentication
    """
    card(scryfallId: ID!): Card!

    """
    Get all cards with pagination
    Requires authentication
    """
    cards(limit: Int = 20, offset: Int = 0): CardsConnection!

    """
    Search cards by name (fuzzy matching)
    Requires authentication
    """
    searchCards(query: String!, limit: Int = 20, offset: Int = 0): CardsConnection!

    # Collection queries
    """
    Get user's collection with pagination
    Requires authentication
    """
    myCollection(limit: Int = 20, offset: Int = 0): CollectionConnection!

    """
    Get collection items by card name (fuzzy matching)
    Requires authentication
    """
    collectionItemsByName(name: String!): [CollectionItem!]!

    """
    Get all collection items for a specific card
    Requires authentication
    """
    collectionItemsByCard(scryfallId: String!): [CollectionItem!]!

    """
    Get collection statistics
    Requires authentication
    """
    collectionStats: CollectionStats!
  }

  type Mutation {
    """
    Add a card to the collection
    Requires authentication
    """
    addCollectionItem(input: AddCollectionItemInput!): CollectionItem!

    """
    Update a collection item
    Requires authentication
    """
    updateCollectionItem(id: Int!, input: UpdateCollectionItemInput!): CollectionItem!

    """
    Delete a collection item
    Requires authentication
    """
    deleteCollectionItem(id: Int!): Boolean!
  }
`;
