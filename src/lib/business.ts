import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
import type { Business } from './types';

/** Resolve the signed-in user's business (RLS-scoped). Redirects to login / onboarding as needed. */
export async function getCurrentBusiness() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: m } = await supabase
    .from('members')
    .select('business_id, businesses(*)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!m) redirect('/onboarding');
  return { user, supabase, business: m.businesses as unknown as Business };
}

export function safeNext(next: unknown): string | null {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
}
