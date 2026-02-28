import { GraphQLError } from 'graphql';
import { connectionFromArraySlice, cursorToOffset } from 'graphql-relay';
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
  searchCards: async (
    _parent: any,
    args: { query: string; first?: number; after?: string },
    context: GraphQLContext
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    const searchQuery = args.query.trim();
    if (!searchQuery) {
      const emptyConnection = connectionFromArraySlice([], args as any, {
        sliceStart: 0,
        arrayLength: 0
      });

      const pi = emptyConnection.pageInfo || ({} as any);
      return {
        ...emptyConnection,
        pageInfo: {
          hasPreviousPage: pi.hasPreviousPage ?? false,
          hasNextPage: pi.hasNextPage ?? false,
          startCursor: pi.startCursor ?? '',
          endCursor: pi.endCursor ?? ''
        },
        total: 0
      };
    }

    const first = Math.min(args.first ?? 20, 100);
    const after = args.after;
    const offset = after ? cursorToOffset(after) + 1 : 0;

    try {
      const { cards, total } = await cardRepository.searchByName(searchQuery, first, offset);

      const connection = connectionFromArraySlice(cards, args as any, {
        sliceStart: offset,
        arrayLength: total
      });

      return {
        ...connection,
        total
      };
    } catch (error) {
      console.error('Error in searchCards resolver:', error);
      throw new GraphQLError('Failed to search cards', {
        extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
      });
    }
  }
  ,

  /**
   * Get all printings for a card given a Scryfall ID for one printing
   */
  cardPrintings: async (_parent: any, args: { scryfallId: string }, context: GraphQLContext) => {
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
      const printings = await cardRepository.getAllPrintings(scryfallId);
      return printings;
    } catch (error) {
      console.error('Error in cardPrintings resolver:', error);
      throw new GraphQLError('Failed to fetch card printings', {
        extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
      });
    }
  }
};
