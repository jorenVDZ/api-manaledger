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

  /**
   * Given a Scryfall ID for a printing, find the cheapest printing of the same card name.
   * If `foil` is true, prefer foil prices when available.
   */
  async getCheapestPrinting(scryfallId: string, foil: boolean = false): Promise<Card | null> {
    const supabase = getSupabaseClient();

    // Get the base card to obtain the name
    const { data: baseRow, error: baseError } = await supabase
      .from('card_data')
      .select('data, name')
      .eq('id', scryfallId)
      .single();

    if (baseError) {
      if (baseError.code === 'PGRST116') return null;
      throw baseError;
    }

    if (!baseRow || !baseRow.data) return null;

    const name: string = baseRow.name || (baseRow.data && baseRow.data.name) || '';
    if (!name) return null;

    // Fetch all printings that share the same name
    const { data: rows, error } = await supabase
      .from('card_data')
      .select('data')
      .eq('name', name);

    if (error) throw error;

    const cards: Card[] = (rows || []).map((r: any) => r.data as Card).filter(Boolean);

    if (cards.length === 0) return null;

    // Compute a numeric price for each printing; prefer `low` for non-foil, `avgFoil` for foil.
    const priceFor = (c: Card) => {
      if (foil) {
        const pf = c.price?.avgFoil ?? c.price?.low ?? c.price?.avg ?? Number.POSITIVE_INFINITY;
        return typeof pf === 'number' ? pf : Number.POSITIVE_INFINITY;
      }
      const p = c.price?.low ?? c.price?.avg ?? Number.POSITIVE_INFINITY;
      return typeof p === 'number' ? p : Number.POSITIVE_INFINITY;
    };

    let best = cards[0];
    let bestPrice = priceFor(best);

    for (let i = 1; i < cards.length; i++) {
      const c = cards[i];
      const p = priceFor(c);
      if (p < bestPrice) {
        best = c;
        bestPrice = p;
      }
    }

    return best;
  }
,

  /**
   * Get all printings for the same card (by name) given a Scryfall ID for one printing
   */
  async getAllPrintings(scryfallId: string): Promise<Card[]> {
    const supabase = getSupabaseClient();

    // Find the base row to obtain the card name
    const { data: baseRow, error: baseError } = await supabase
      .from('card_data')
      .select('data, name')
      .eq('id', scryfallId)
      .single();

    if (baseError) {
      if (baseError.code === 'PGRST116') return [];
      throw baseError;
    }

    if (!baseRow) return [];

    const name: string = baseRow.name || (baseRow.data && baseRow.data.name) || '';
    if (!name) return [];

    const { data: rows, error } = await supabase
      .from('card_data')
      .select('data')
      .eq('name', name);

    if (error) throw error;

    const cards: Card[] = (rows || []).map((r: any) => r.data as Card).filter(Boolean);
    return cards;
  }
};
