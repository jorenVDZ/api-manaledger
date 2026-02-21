import { cardRepository } from '../repositories/cardRepository';
import { Card, CardmarketPrice } from '../repositories/types';

/**
 * Card field resolvers - for custom field resolution and computed fields
 */
export const cardType = {

  /**
   * Custom field: Check if card is commander legal
   */
  isCommanderLegal: (parent: Card): boolean => {
    return parent.legalities?.commander === 'legal';
  },

  /**
   * Custom field: Fetch price data from CardMarket price guide
   */
  cardmarketPrice: async (parent: Card): Promise<CardmarketPrice | null> => {
    // If card doesn't have a cardMarketId, we can't fetch price data
    if (!parent.cardmarketId) {
      return null;
    }

    try {
      return await cardRepository.findPriceByCardmarketId(parent.cardmarketId);
    } catch (error) {
      console.error('Error fetching price data:', error);
      return null;
    }
  },
};
