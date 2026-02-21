export const typeDefs = `#graphql
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
  Card prices in different currencies
  """
  type Prices {
    usd: String
    usdFoil: String
    usdEtched: String
    eur: String
    eurFoil: String
    tix: String
  }

  """
  Related card URIs
  """
  type RelatedUris {
    gatherer: String
    tcgplayerInfiniteArticles: String
    tcgplayerInfiniteDecks: String
    edhrec: String
  }

  """
  Purchase URIs for different platforms
  """
  type PurchaseUris {
    tcgplayer: String
    cardmarket: String
    cardhoarder: String
  }

  """
  Scryfall card - represents a Magic: The Gathering card
  """
  type Card {
    """Scryfall UUID for this card"""
    id: ID!
    
    """Oracle ID - shared across all prints of the same card"""
    oracleId: String
    
    """Multiverse IDs for this card"""
    multiverseIds: [Int!]
    
    """MTG Arena ID"""
    mtgoId: Int
    
    """MTG Online ID"""
    mtgoFoilId: Int
    
    """TCGPlayer ID"""
    tcgplayerId: Int
    
    """Cardmarket ID"""
    cardmarketId: Int
    
    """Card name"""
    name: String!
    
    """Language code"""
    lang: String!
    
    """Release date"""
    releasedAt: String
    
    """Scryfall URI"""
    uri: String!
    
    """Scryfall API URI"""
    scryfallUri: String!
    
    """Card layout (normal, split, flip, transform, etc.)"""
    layout: String!
    
    """High resolution scan available"""
    highresImage: Boolean!
    
    """Image status"""
    imageStatus: String
    
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
    
    """Color indicator"""
    colorIndicator: [String!]
    
    """Keywords"""
    keywords: [String!]
    
    """Card faces (for multi-faced cards)"""
    cardFaces: [CardFace!]
    
    """Legalities in various formats"""
    legalities: Legalities
    
    """Reserved list card"""
    reserved: Boolean!
    
    """Foil available"""
    foil: Boolean!
    
    """Non-foil available"""
    nonfoil: Boolean!
    
    """Finishes available"""
    finishes: [String!]
    
    """Oversized card"""
    oversized: Boolean!
    
    """Promo card"""
    promo: Boolean!
    
    """Reprint"""
    reprint: Boolean!
    
    """Variation of another card"""
    variation: Boolean!
    
    """Set code"""
    set: String!
    
    """Set name"""
    setName: String!
    
    """Set type"""
    setType: String!
    
    """Set URI"""
    setUri: String!
    
    """Set search URI"""
    setSearchUri: String!
    
    """Scryfall set URI"""
    scryfallSetUri: String!
    
    """Rulings URI"""
    rulingsUri: String!
    
    """Prints search URI"""
    printsSearchUri: String!
    
    """Collector number"""
    collectorNumber: String!
    
    """Digital card"""
    digital: Boolean!
    
    """Card rarity"""
    rarity: String!
    
    """Flavor text"""
    flavorText: String
    
    """Card number (same as collector number)"""
    cardBackId: String
    
    """Artist"""
    artist: String
    
    """Artist IDs"""
    artistIds: [String!]
    
    """Illustration ID"""
    illustrationId: String
    
    """Border color"""
    borderColor: String!
    
    """Frame version"""
    frame: String!
    
    """Frame effects"""
    frameEffects: [String!]
    
    """Security stamp"""
    securityStamp: String
    
    """Full art"""
    fullArt: Boolean!
    
    """Textless"""
    textless: Boolean!
    
    """Booster eligible"""
    booster: Boolean!
    
    """Story spotlight"""
    storySpotlight: Boolean!
    
    """EDH rank"""
    edhrecRank: Int
    
    """Penny rank"""
    pennyRank: Int
    
    """Prices"""
    prices: Prices
    
    """Related URIs"""
    relatedUris: RelatedUris
    
    """Purchase URIs"""
    purchaseUris: PurchaseUris
    
    """Power (for creatures)"""
    power: String
    
    """Toughness (for creatures)"""
    toughness: String
    
    """Loyalty (for planeswalkers)"""
    loyalty: String
    
    """Life modifier (for Vanguard)"""
    lifeModifier: String
    
    """Hand modifier (for Vanguard)"""
    handModifier: String
    
    """Produced mana"""
    producedMana: [String!]
    
    """All parts (for split/transform cards)"""
    allParts: [String!]
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
    searchCards(query: String!, limit: Int = 20): [Card!]!
  }
`;
