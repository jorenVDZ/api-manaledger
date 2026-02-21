import { cardType } from './card.fields';
import { cardQueries } from './card.queries';

export const resolvers = {
  Query: cardQueries,
  Card: cardType
};
