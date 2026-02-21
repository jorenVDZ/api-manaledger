import { GraphQLError } from 'graphql';
import { getSupabaseClient } from '../services/supabase';
import { GraphQLContext } from './context';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object') return obj;

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
  }
  return result;
}

export const resolvers = {
  Query: {
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

      // Get Supabase client
      const supabase = getSupabaseClient();

      // Query card from database
      const { data: cardData, error } = await supabase
        .from('scryfall_data')
        .select('data')
        .eq('id', scryfallId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new GraphQLError(`Card with Scryfall ID ${scryfallId} not found`, {
            extensions: { code: 'NOT_FOUND' }
          });
        }
        throw new GraphQLError('Failed to fetch card details', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
        });
      }

      if (!cardData || !cardData.data) {
        throw new GraphQLError(`Card with Scryfall ID ${scryfallId} not found`, {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      // Convert snake_case to camelCase for GraphQL
      return toCamelCase(cardData.data);
    },

    /**
     * Get all cards with pagination
     */
    cards: async (_parent: any, args: { limit: number; offset: number }, context: GraphQLContext) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const limit = Math.min(args.limit, 100); // Cap at 100
      const offset = args.offset || 0;

      const supabase = getSupabaseClient();

      // Get total count
      const { count, error: countError } = await supabase
        .from('scryfall_data')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new GraphQLError('Failed to fetch cards count', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: countError }
        });
      }

      // Get paginated cards
      const { data: cardsData, error } = await supabase
        .from('scryfall_data')
        .select('data')
        .range(offset, offset + limit - 1);

      if (error) {
        throw new GraphQLError('Failed to fetch cards', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
        });
      }

      const cards = (cardsData || []).map((item: any) => toCamelCase(item.data));
      const total = count || 0;
      const hasMore = offset + limit < total;

      return {
        cards,
        total,
        hasMore
      };
    },

    /**
     * Search cards by name (fuzzy matching)
     */
    searchCards: async (_parent: any, args: { query: string; limit: number }, context: GraphQLContext) => {
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

      const supabase = getSupabaseClient();

      // Use ilike for case-insensitive pattern matching (fuzzy search)
      const { data: cardsData, error } = await supabase
        .from('scryfall_data')
        .select('data')
        .ilike('data->>name', `%${searchQuery}%`)
        .limit(limit);

      if (error) {
        throw new GraphQLError('Failed to search cards', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
        });
      }

      return (cardsData || []).map((item: any) => toCamelCase(item.data));
    }
  }
};
