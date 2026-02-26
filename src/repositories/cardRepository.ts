import { Card } from "../models/card";
import { getSupabaseClient } from "../services/supabase";


/**
 * Repository for card data access
 */
export const cardRepository = {
  /**
   * Find a card by Scryfall ID
   */
  async findById(scryfallId: string): Promise<Card | null> {
    const supabase = getSupabaseClient();

    const { data: cardData, error } = await supabase
      .from('card_data')
      .select('data')
      .eq('id', scryfallId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    if (!cardData || !cardData.data) {
      return null;
    }

    return cardData.data as Card;
  },

  /**
   * Search cards by name
   */
  async searchByName(query: string, limit: number, offset: number): Promise<{ cards: Card[]; total: number }> {
    const supabase = getSupabaseClient();

    // Get total count of matching cards excluding memorabilia
    const { data, error } = await supabase.rpc(
      'get_latest_printing_with_count',
      {
        search: query,
        off: offset,
        lim: limit
      }
    );

    if (error) throw error;

    const cards = (data as Array<{ data: Card }>).map((d: { data: Card }) => d.data);
    const total = data.length > 0 ? data[0].total_count : 0;

    return { cards, total };
  },
};
