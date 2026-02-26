import { GraphQLError } from 'graphql';
import { cardRepository } from '../../repositories/cardRepository';
import { GraphQLContext } from '../graphqlContext';

export const cardQueries = {
  /**
   * Get card details by Scryfall ID
   */
  card: async (_parent: any, args: { scryfallId: string }, context: GraphQLContext) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    const scryfallId = args.scryfallId.trim();

    if (!scryfallId) {
      throw new GraphQLError('Invalid Scryfall ID', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    try {
      const card = await cardRepository.findById(scryfallId);

      if (!card) {
        throw new GraphQLError(`Card with Scryfall ID ${scryfallId} not found`, {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      return card;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw new GraphQLError('Failed to fetch card details', {
        extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
      });
    }
  },
  
  /**
   * Search cards by name (fuzzy matching)
   */
  searchCards: async (_parent: any, args: { query: string; limit: number; offset: number }, context: GraphQLContext) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    const searchQuery = args.query.trim();
    if (!searchQuery) {
      throw new GraphQLError('Search query cannot be empty', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    const limit = Math.min(args.limit, 100); // Cap at 100
    const offset = args.offset || 0;

    try {
      const { cards, total } = await cardRepository.searchByName(searchQuery, limit, offset);
      const hasMore = offset + limit < total;

      return {
        cards,
        total,
        hasMore
      };
    } catch (error) {
      console.error('Error in searchCards resolver:', error);
      throw new GraphQLError('Failed to search cards', {
        extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
      });
    }
  }
};
