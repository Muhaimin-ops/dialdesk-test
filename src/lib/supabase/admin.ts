import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let client: SupabaseClient | null = null;

/**
 * Service-role client. BYPASSES RLS: only use in server routes, and ALWAYS scope every query
 * by business_id taken from a verified token, never from raw request input.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl(), env.supabaseService(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
