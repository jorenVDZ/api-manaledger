import { getSupabaseClient } from '../../services/supabase';
import { Card, CardmarketPrice } from './types/Card';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object') return obj;

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
  }
  return result;
}

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
      .from('scryfall_data')
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

    return toCamelCase(cardData.data) as Card;
  },

  /**
   * Get paginated cards
   */
  async findAll(limit: number, offset: number): Promise<{ cards: Card[]; total: number }> {
    const supabase = getSupabaseClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('scryfall_data')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get paginated cards
    const { data: cardsData, error } = await supabase
      .from('scryfall_data')
      .select('data')
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const cards = (cardsData || []).map((item: any) => toCamelCase(item.data) as Card);
    const total = count || 0;

    return { cards, total };
  },

  /**
   * Search cards by name
   */
  async searchByName(query: string, limit: number): Promise<Card[]> {
    const supabase = getSupabaseClient();

    const { data: cardsData, error } = await supabase
      .from('scryfall_data')
      .select('data')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) {
      throw error;
    }

    return (cardsData || []).map((item: any) => toCamelCase(item.data) as Card);
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

    // Extract and convert price data to camelCase
    const priceData = toCamelCase(data.data);
    
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
