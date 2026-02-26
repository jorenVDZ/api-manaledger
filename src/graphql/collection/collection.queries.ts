// import { GraphQLError } from 'graphql';
// import { cardRepository } from '../../repositories/cardRepository';
// import { collectionRepository } from '../../repositories/collectionRepository';
// import { GraphQLContext } from '../types/context';

// export const collectionQueries = {
//   /**
//    * Get user's collection with pagination
//    */
//   myCollection: async (
//     _parent: any,
//     args: { limit: number; offset: number },
//     context: GraphQLContext
//   ) => {
//     if (!context.user) {
//       throw new GraphQLError('Not authenticated', {
//         extensions: { code: 'UNAUTHENTICATED' }
//       });
//     }

//     const limit = Math.min(args.limit || 20, 100); // Cap at 100
//     const offset = args.offset || 0;

//     try {
//       const { items, total } = await collectionRepository.getUserCollectionPaginated(
//         context.user.id,
//         limit,
//         offset
//       );
//       const hasMore = offset + limit < total;

//       return {
//         items,
//         total,
//         hasMore
//       };
//     } catch (error) {
//       throw new GraphQLError('Failed to fetch collection', {
//         extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
//       });
//     }
//   },

//   /**
//    * Get collection items by card name (fuzzy matching)
//    */
//   collectionItemsByName: async (
//     _parent: any,
//     args: { name: string },
//     context: GraphQLContext
//   ) => {
//     if (!context.user) {
//       throw new GraphQLError('Not authenticated', {
//         extensions: { code: 'UNAUTHENTICATED' }
//       });
//     }

//     const cardName = args.name.trim();
//     if (!cardName) {
//       throw new GraphQLError('Card name is required', {
//         extensions: { code: 'BAD_USER_INPUT' }
//       });
//     }

//     try {
//       Search for cards by name
//       const { cards } = await cardRepository.searchByName(cardName, 100, 0);

//       if (cards.length === 0) {
//         return [];
//       }

//       Get collection items for all matching cards
//       const collectionItems = await Promise.all(
//         cards.map(card => collectionRepository.getItemsByCard(context.user!.id, card.id))
//       );

//       Flatten the results
//       return collectionItems.flat();
//     } catch (error) {
//       throw new GraphQLError('Failed to fetch collection items by name', {
//         extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
//       });
//     }
//   },

//   /**
//    * Get all collection items for a specific card
//    */
//   collectionItemsByCard: async (
//     _parent: any,
//     args: { scryfallId: string },
//     context: GraphQLContext
//   ) => {
//     if (!context.user) {
//       throw new GraphQLError('Not authenticated', {
//         extensions: { code: 'UNAUTHENTICATED' }
//       });
//     }

//     const scryfallId = args.scryfallId.trim();
//     if (!scryfallId) {
//       throw new GraphQLError('Invalid Scryfall ID', {
//         extensions: { code: 'BAD_USER_INPUT' }
//       });
//     }

//     try {
//       return await collectionRepository.getItemsByCard(context.user.id, scryfallId);
//     } catch (error) {
//       throw new GraphQLError('Failed to fetch collection items for card', {
//         extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
//       });
//     }
//   },

//   /**
//    * Get collection statistics
//    */
//   collectionStats: async (_parent: any, _args: any, context: GraphQLContext) => {
//     if (!context.user) {
//       throw new GraphQLError('Not authenticated', {
//         extensions: { code: 'UNAUTHENTICATED' }
//       });
//     }

//     try {
//       const stats = await collectionRepository.getCollectionStats(context.user.id);
//       const uniqueCards = await collectionRepository.getUniqueCardCount(context.user.id);

//       return {
//         ...stats,
//         uniqueCards
//       };
//     } catch (error) {
//       throw new GraphQLError('Failed to fetch collection statistics', {
//         extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error }
//       });
//     }
//   }
// };
