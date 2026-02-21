import { getSupabaseClient } from '../../services/supabase';
import { CollectionItem, CollectionItemData } from './types/collection';

/**
 * Input for creating a new collection item
 */
export interface CreateCollectionItemInput {
  scryfallId: string;
  amount: number;
  isFoil: boolean;
  pricePaid?: number | null;
  fromBooster?: boolean | null;
}

/**
 * Input for updating a collection item
 */
export interface UpdateCollectionItemInput {
  amount?: number;
  isFoil?: boolean;
  pricePaid?: number | null;
  fromBooster?: boolean | null;
}

/**
 * Repository for collection data access
 */
export const collectionRepository = {
  /**
   * Add a card to a user's collection
   */
  async addItem(userId: string, input: CreateCollectionItemInput): Promise<CollectionItem> {
    const supabase = getSupabaseClient();

    // Prepare data object in camelCase
    const data: CollectionItemData = {
      id: 0, // Will be set by database
      userId: userId,
      scryfallId: input.scryfallId,
      amount: input.amount,
      isFoil: input.isFoil,
      pricePaid: input.pricePaid,
      fromBooster: input.fromBooster,
    };

    const { data: result, error } = await supabase
      .from('collection_items')
      .insert({
        user_id: userId,
        scryfall_id: input.scryfallId,
        data,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update data with actual ID
    if (result) {
      result.data.id = result.id;
      // Update the row with the correct ID in data
      await supabase
        .from('collection_items')
        .update({ data: result.data })
        .eq('id', result.id);
    }

    return {
      id: result.id,
      userId: result.user_id,
      scryfallId: result.scryfall_id,
      data: result.data,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    } as CollectionItem;
  },

  /**
   * Get all items in a user's collection
   */
  async getUserCollection(userId: string): Promise<CollectionItem[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      scryfallId: item.scryfall_id,
      data: item.data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })) as CollectionItem[];
  },

  /**
   * Get a specific collection item by ID
   */
  async getItemById(itemId: number, userId: string): Promise<CollectionItem | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      scryfallId: data.scryfall_id,
      data: data.data,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as CollectionItem;
  },

  /**
   * Get all collection items for a specific card
   */
  async getItemsByCard(userId: string, scryfallId: string): Promise<CollectionItem[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .eq('scryfall_id', scryfallId);

    if (error) {
      throw error;
    }

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      scryfallId: item.scryfall_id,
      data: item.data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })) as CollectionItem[];
  },

  /**
   * Update a collection item
   */
  async updateItem(
    itemId: number,
    userId: string,
    input: UpdateCollectionItemInput
  ): Promise<CollectionItem | null> {
    const supabase = getSupabaseClient();

    // First get the existing item
    const existing = await this.getItemById(itemId, userId);
    if (!existing) {
      return null;
    }

    // Merge updates into existing data
    const updatedData: CollectionItemData = {
      ...existing.data,
      ...input,
    };

    const { data, error } = await supabase
      .from('collection_items')
      .update({ data: updatedData })
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      scryfallId: data.scryfall_id,
      data: data.data,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as CollectionItem;
  },

  /**
   * Delete a collection item
   */
  async deleteItem(itemId: number, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  },

  /**
   * Get collection statistics for a user
   */
  async getCollectionStats(userId: string): Promise<{
    totalCards: number;
    totalItems: number;
    foilCount: number;
    totalValue: number;
    boosterCount: number;
  }> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('collection_items')
      .select('data')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const items = (data || []).map((item: any) => item.data);
    
    const stats = {
      totalCards: items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0),
      totalItems: items.length,
      foilCount: items.filter((item: any) => item.isFoil).length,
      totalValue: items.reduce((sum: number, item: any) => {
        const price = item.pricePaid || 0;
        const amount = item.amount || 0;
        return sum + (price * amount);
      }, 0),
      boosterCount: items.filter((item: any) => item.fromBooster === true).length,
    };

    return stats;
  },

  /**
   * Get total count of unique cards in collection
   */
  async getUniqueCardCount(userId: string): Promise<number> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('collection_items')
      .select('scryfall_id')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const uniqueCards = new Set((data || []).map((item: any) => item.scryfall_id));
    return uniqueCards.size;
  },

  /**
   * Get paginated collection
   */
  async getUserCollectionPaginated(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ items: CollectionItem[]; total: number }> {
    const supabase = getSupabaseClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('collection_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      throw countError;
    }

    // Get paginated items
    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return {
      items: (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        scryfallId: item.scryfall_id,
        data: item.data,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) as CollectionItem[],
      total: count || 0,
    };
  },
};
