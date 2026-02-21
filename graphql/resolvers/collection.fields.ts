import { cardRepository } from '../repositories/cardRepository';
import { CollectionItem } from '../repositories/types/collection';

export const collectionItemType = {
  /**
   * Populate card data from scryfallId
   */
  card: async (parent: CollectionItem) => {
    try {
      const card = await cardRepository.findById(parent.scryfallId);
      return card; // Can be null if card not found
    } catch (error) {
      // Don't throw error, just return null if card data can't be fetched
      console.error(`Failed to fetch card data for ${parent.scryfallId}:`, error);
      return null;
    }
  },

  /**
   * Map data fields to top level
   */
  amount: (parent: CollectionItem) => parent.data.amount,
  isFoil: (parent: CollectionItem) => parent.data.isFoil,
  pricePaid: (parent: CollectionItem) => parent.data.pricePaid,
  fromBooster: (parent: CollectionItem) => parent.data.fromBooster,
};
