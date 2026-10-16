import { NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/env';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Email-confirmation landing: exchanges the code for a session cookie. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code');
  const base = await getAppUrl();
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}/dashboard`);
  }
  return NextResponse.redirect(`${base}/login?error=${encodeURIComponent('That confirmation link is invalid or expired.')}`);
}
