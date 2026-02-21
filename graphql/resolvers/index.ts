import { cardType } from './card.fields';
import { cardQueries } from './card.queries';
import { collectionItemType } from './collection.fields';
import { collectionMutations } from './collection.mutations';
import { collectionQueries } from './collection.queries';

export const resolvers = {
  Query: {
    ...cardQueries,
    ...collectionQueries,
  },
  Mutation: collectionMutations,
  Card: cardType,
  CollectionItem: collectionItemType,
};
