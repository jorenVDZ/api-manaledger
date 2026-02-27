import { WantsList, WantsListItem } from "../models/wantsList";
import { getSupabaseClient } from "../services/supabase";

function dbItemToModel(item: any): WantsListItem {
  return {
    scryfallId: item.scryfall_id,
    amount: item.amount,
    specificPrinting: !!item.specific_printing,
    foil: !!item.foil,
  };
}

function modelItemToDb(item: WantsListItem): any {
  return {
    scryfall_id: item.scryfallId,
    amount: item.amount,
    specific_printing: item.specificPrinting ?? false,
    foil: item.foil ?? false,
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

export const wantsListRepository = {
  async createWantsList(userId: string, name: string, items: WantsListItem[] = []) : Promise<WantsList> {
    const supabase = getSupabaseClient();
    const dbItems = items.map(modelItemToDb);

    const { data, error } = await supabase
      .from('wants_lists')
      .insert([{ user_id: userId, name, items: dbItems }])
      .select('*')
      .single();

    if (error) throw error;
    return rowToModel(data);
  },

  async updateWantsList(id: string, patch: { name?: string; items?: WantsListItem[] }) : Promise<WantsList> {
    const supabase = getSupabaseClient();
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.items !== undefined) dbPatch.items = patch.items.map(modelItemToDb);

    const { data, error } = await supabase
      .from('wants_lists')
      .update(dbPatch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return rowToModel(data);
  },

  async deleteWantsList(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('wants_lists')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async addWantsListItem(wantsListId: string, item: WantsListItem): Promise<WantsList> {
    const supabase = getSupabaseClient();

    // Fetch current items
    const { data: row, error: fetchError } = await supabase
      .from('wants_lists')
      .select('items, *')
      .eq('id', wantsListId)
      .single();
    if (fetchError) throw fetchError;

    const currentItems = Array.isArray(row.items) ? row.items : [];
    const newItems = [...currentItems, modelItemToDb(item)];

    const { data, error } = await supabase
      .from('wants_lists')
      .update({ items: newItems })
      .eq('id', wantsListId)
      .select('*')
      .single();

    if (error) throw error;
    return rowToModel(data);
  },

  async updateWantsListItem(wantsListId: string, scryfallId: string, patch: Partial<WantsListItem>): Promise<WantsList> {
    const supabase = getSupabaseClient();

    const { data: row, error: fetchError } = await supabase
      .from('wants_lists')
      .select('items, *')
      .eq('id', wantsListId)
      .single();
    if (fetchError) throw fetchError;

    const currentItems = Array.isArray(row.items) ? row.items : [];
    const updatedItems = currentItems.map((it: any) => {
      if (it.scryfall_id !== scryfallId) return it;
      const merged = {
        ...it,
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
        ...(patch.specificPrinting !== undefined ? { specific_printing: patch.specificPrinting } : {}),
        ...(patch.foil !== undefined ? { foil: patch.foil } : {}),
      };
      return merged;
    });

    const { data, error } = await supabase
      .from('wants_lists')
      .update({ items: updatedItems })
      .eq('id', wantsListId)
      .select('*')
      .single();

    if (error) throw error;
    return rowToModel(data);
  },

  async removeWantsListItem(wantsListId: string, scryfallId: string): Promise<WantsList> {
    const supabase = getSupabaseClient();

    const { data: row, error: fetchError } = await supabase
      .from('wants_lists')
      .select('items, *')
      .eq('id', wantsListId)
      .single();
    if (fetchError) throw fetchError;

    const currentItems = Array.isArray(row.items) ? row.items : [];
    const filtered = currentItems.filter((it: any) => it.scryfall_id !== scryfallId);

    const { data, error } = await supabase
      .from('wants_lists')
      .update({ items: filtered })
      .eq('id', wantsListId)
      .select('*')
      .single();

    if (error) throw error;
    return rowToModel(data);
  }
};
