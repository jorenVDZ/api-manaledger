import { GraphQLError } from 'graphql';
import { WantsList, WantsListItem } from '../../models/wantsList';
import { getSupabaseClient } from '../../services/supabase';

function dbItemToModel(item: any): WantsListItem {
  return {
    scryfallId: item.scryfall_id,
    amount: item.amount,
    specificPrinting: !!item.specific_printing,
    foil: !!item.foil,
  };
}

function rowToModel(row: any): WantsList {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    items: (row.items || []).map(dbItemToModel),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const wantsListQueries = {
  async getMyWantsLists(_: any, _args: any, ctx: any) {
    if (!ctx.user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const userId = ctx.user.id;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('wants_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new GraphQLError('Failed to fetch wants lists', { extensions: { code: 'INTERNAL_SERVER_ERROR', originalError: error } });
    }

    return (data || []).map((row: any) => rowToModel(row));
  },

  async getWantsListById(_: any, args: { id: string }, ctx: any) {
    if (!ctx.user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const id = (args.id || '').toString();
    if (!id) {
      throw new GraphQLError('Invalid wants list id', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const userId = ctx.user.id;
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from('wants_lists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new GraphQLError('Wants list not found', { extensions: { code: 'NOT_FOUND', originalError: error } });
    }

    if (row.user_id !== userId) {
      throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
    }

    return rowToModel(row);
  }
};
