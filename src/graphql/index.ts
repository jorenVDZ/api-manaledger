import { cardQueries } from './card/card.queries';
import { wantsListMutations } from './wantsList/wantsList.mutations';
import { wantsListQueries } from './wantsList/wantsList.queries';
import { wantsListResolvers } from './wantsList/wantsList.resolvers';

export const resolvers = {
  Query: {
    ...cardQueries,
    ...wantsListQueries,
  },
  Mutation: {
    ...wantsListMutations,
  }
  ,
  WantsListItem: {
    ...wantsListResolvers.WantsListItem
  }
};
