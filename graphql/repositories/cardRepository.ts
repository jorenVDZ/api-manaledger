import { getSupabaseClient } from '../../services/supabase';
import { Card, CardmarketPrice } from './types';

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
   * Get paginated cards
   */
  async findAll(limit: number, offset: number): Promise<{ cards: Card[]; total: number }> {
    const supabase = getSupabaseClient();

    // Get total count excluding memorabilia
    const { count, error: countError } = await supabase
      .from('card_data')
      .select('*', { count: 'exact', head: true })
      .neq('data->>set_type', 'memorabilia')
      .order('name', { ascending: true });

    if (countError) {
      throw countError;
    }

    // Get paginated cards excluding memorabilia
    const { data: cardsData, error } = await supabase
      .from('card_data')
      .select('data')
      .neq('data->>set_type', 'memorabilia')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const cards = (cardsData || []).map((item: any) => item.data as Card);
    const total = count || 0;

    return { cards, total };
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

  /**
   * Find price data by CardMarket ID
   */
  async findPriceByCardmarketId(cardmarketId: number): Promise<CardmarketPrice | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('cardmarket_price_guide')
      .select('data')
      .eq('scryfall_id', cardmarketId)
      .single();

    if (error || !data) {
      return null;
    }

    // Extract price data (already in camelCase)
    const priceData = data.data;
    
    // Return the price data with camelCase field names
    return {
      avg: priceData.avg,
      low: priceData.low,
      avg1: priceData.avg1,
      avg7: priceData.avg7,
      avg30: priceData.avg30,
      trend: priceData.trend,
      avgFoil: priceData.avgFoil,
      lowFoil: priceData.lowFoil,
      avg1Foil: priceData.avg1Foil,
      avg7Foil: priceData.avg7Foil,
      avg30Foil: priceData.avg30Foil,
      trendFoil: priceData.trendFoil,
    };
  },
};
