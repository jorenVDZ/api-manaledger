import { GraphQLError } from 'graphql';
import { wantsListRepository } from "../../repositories/wantsListRepository";
import { getSupabaseClient } from '../../services/supabase';

type GraphQLContext = any;

export const wantsListMutations = {
  async createWantsList(_: any, args: { name: string; items?: any[] }, ctx: GraphQLContext) {
    if (!ctx.user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const userId = ctx.user.id;
    const name = (args.name || '').trim();
    if (!name) {
      throw new GraphQLError('List name cannot be empty', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const items = (args.items || []).map((i: any) => ({
      scryfallId: (i.scryfallId || '').toString(),
      amount: i.amount ?? 1,
      specificPrinting: !!i.specificPrinting,
      foil: i.foil ?? false,
    }));

    return wantsListRepository.createWantsList(userId, name, items);
  },

  async updateWantsList(_: any, args: { id: string; name?: string; items?: any[] }, ctx: GraphQLContext) {
    if (!ctx.user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const userId = ctx.user.id;
    const id = (args.id || '').toString();
    if (!id) {
      throw new GraphQLError('Invalid wants list id', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const supabase = getSupabaseClient();
    const { data: ownerRow, error: ownerErr } = await supabase
      .from('wants_lists')
      .select('user_id')
      .eq('id', id)
      .single();
    if (ownerErr) throw new GraphQLError('Wants list not found', { extensions: { code: 'NOT_FOUND', originalError: ownerErr } });
    if (ownerRow.user_id !== userId) {
      throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
    }

    const items = args.items ? args.items.map((i: any) => ({
      scryfallId: (i.scryfallId || '').toString(),
      amount: i.amount ?? 1,
      specificPrinting: !!i.specificPrinting,
      foil: i.foil ?? false,
    })) : undefined;

    const name = args.name !== undefined ? (args.name || '').trim() : undefined;

    return wantsListRepository.updateWantsList(id, { name, items });
  },

  async deleteWantsList(_: any, args: { id: string }, ctx: GraphQLContext) {
    if (!ctx.user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const userId = ctx.user.id;
    const id = (args.id || '').toString();
    if (!id) {
      throw new GraphQLError('Invalid wants list id', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const supabase = getSupabaseClient();
    const { data: ownerRow, error: ownerErr } = await supabase
      .from('wants_lists')
      .select('user_id')
      .eq('id', id)
      .single();
    if (ownerErr) throw new GraphQLError('Wants list not found', { extensions: { code: 'NOT_FOUND', originalError: ownerErr } });
    if (ownerRow.user_id !== userId) {
      throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
    }

    await wantsListRepository.deleteWantsList(id);
    return true;
  },

  async addWantsListItem(_: any, args: { wantsListId: string; item: any }, ctx: GraphQLContext) {
    if (!ctx.user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const userId = ctx.user.id;
    const wantsListId = (args.wantsListId || '').toString();
    if (!wantsListId) {
      throw new GraphQLError('Invalid wants list id', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const scryfallId = (args.item?.scryfallId || '').toString();
    if (!scryfallId) {
      throw new GraphQLError('Invalid Scryfall ID', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const supabase = getSupabaseClient();
    const { data: ownerRow, error: ownerErr } = await supabase
      .from('wants_lists')
      .select('user_id')
      .eq('id', wantsListId)
      .single();
    if (ownerErr) throw new GraphQLError('Wants list not found', { extensions: { code: 'NOT_FOUND', originalError: ownerErr } });
    if (ownerRow.user_id !== userId) {
      throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
    }

    const item = {
      scryfallId,
      amount: args.item.amount ?? 1,
      specificPrinting: !!args.item.specificPrinting,
      foil: args.item.foil ?? false,
    };

    return wantsListRepository.addWantsListItem(wantsListId, item);
  },

  async updateWantsListItem(_: any, args: { wantsListId: string; scryfallId: string; patch: any }, ctx: GraphQLContext) {
    if (!ctx.user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const userId = ctx.user.id;
    const wantsListId = (args.wantsListId || '').toString();
    const scryfallId = (args.scryfallId || '').toString();
    if (!wantsListId || !scryfallId) {
      throw new GraphQLError('Invalid input', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const supabase = getSupabaseClient();
    const { data: ownerRow, error: ownerErr } = await supabase
      .from('wants_lists')
      .select('user_id')
      .eq('id', wantsListId)
      .single();
    if (ownerErr) throw new GraphQLError('Wants list not found', { extensions: { code: 'NOT_FOUND', originalError: ownerErr } });
    if (ownerRow.user_id !== userId) {
      throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
    }

    const patch = {
      amount: args.patch.amount,
      specificPrinting: args.patch.specificPrinting,
      foil: args.patch.foil,
    };

    return wantsListRepository.updateWantsListItem(wantsListId, scryfallId, patch);
  },

  async removeWantsListItem(_: any, args: { wantsListId: string; scryfallId: string }, ctx: GraphQLContext) {
    if (!ctx.user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const userId = ctx.user.id;
    const wantsListId = (args.wantsListId || '').toString();
    const scryfallId = (args.scryfallId || '').toString();
    if (!wantsListId || !scryfallId) {
      throw new GraphQLError('Invalid input', { extensions: { code: 'BAD_USER_INPUT' } });
    }

    const supabase = getSupabaseClient();
    const { data: ownerRow, error: ownerErr } = await supabase
      .from('wants_lists')
      .select('user_id')
      .eq('id', wantsListId)
      .single();
    if (ownerErr) throw new GraphQLError('Wants list not found', { extensions: { code: 'NOT_FOUND', originalError: ownerErr } });
    if (ownerRow.user_id !== userId) {
      throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
    }

    return wantsListRepository.removeWantsListItem(wantsListId, scryfallId);
  }
};
