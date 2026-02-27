import { cardRepository } from '../../repositories/cardRepository';

export const wantsListResolvers = {
  WantsListItem: {
    async printingScryfallId(parent: any) {
      // parent: { scryfallId, amount, specificPrinting, foil }
      if (parent.specificPrinting) {
        return parent.scryfallId;
      }

      try {
        const cheapest = await cardRepository.getCheapestPrinting(parent.scryfallId, !!parent.foil);
        return (cheapest && cheapest.id) ? cheapest.id : parent.scryfallId;
      } catch (err) {
        // On error, fallback to the original scryfallId
        return parent.scryfallId;
      }
    }
  }
};
