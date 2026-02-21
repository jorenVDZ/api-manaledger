import { GraphQLError } from 'graphql';
import { collectionRepository, CreateCollectionItemInput, UpdateCollectionItemInput } from '../repositories/collectionRepository';
import { GraphQLContext } from '../types/context';

export const collectionMutations = {
  /**
   * Add a card to the collection
   */
  addCollectionItem: async (
    _parent: any,
    args: { input: CreateCollectionItemInput },
    context: GraphQLContext
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    const { input } = args;

    // Validate input
    if (!input.scryfallId || !input.scryfallId.trim()) {
      throw new GraphQLError('Scryfall ID is required', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    if (input.amount < 1) {
      throw new GraphQLError('Amount must be at least 1', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    try {
      return await collectionRepository.addItem(context.user.id, input);
    } catch (error: any) {
      // Check for foreign key constraint violation (card doesn't exist)
      if (error.code === '23503') {
        throw new GraphQLError('Card with specified Scryfall ID does not exist', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }
      throw new GraphQLError('Failed to add item to collection', {
        extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
      });
    }
  },

  /**
   * Update a collection item
   */
  updateCollectionItem: async (
    _parent: any,
    args: { id: number; input: UpdateCollectionItemInput },
    context: GraphQLContext
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    const { id, input } = args;

    // Validate amount if provided
    if (input.amount !== undefined && input.amount < 1) {
      throw new GraphQLError('Amount must be at least 1', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    try {
      const updatedItem = await collectionRepository.updateItem(id, context.user.id, input);

      if (!updatedItem) {
        throw new GraphQLError('Collection item not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      return updatedItem;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw new GraphQLError('Failed to update collection item', {
        extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
      });
    }
  },

  /**
   * Delete a collection item
   */
  deleteCollectionItem: async (_parent: any, args: { id: number }, context: GraphQLContext) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    try {
      // First check if item exists and belongs to user
      const item = await collectionRepository.getItemById(args.id, context.user.id);
      if (!item) {
        throw new GraphQLError('Collection item not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      await collectionRepository.deleteItem(args.id, context.user.id);
      return true;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw new GraphQLError('Failed to delete collection item', {
        extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
      });
    }
  }
};
