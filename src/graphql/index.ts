import { cardQueries } from './card/card.queries';

export const resolvers = {
  Query: {
    ...cardQueries,
  },
};
