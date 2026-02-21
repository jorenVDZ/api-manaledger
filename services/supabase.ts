import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    if (!supabaseKey) {
      throw new Error('SUPABASE_SECRET_KEY or SUPABASE_ANON_KEY environment variable is required');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}
