import { NextResponse } from 'next/server';
import { readCallToken } from '@/lib/embed';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildInstructions } from '@/lib/realtime';
import { rateLimit } from '@/lib/ratelimit';
import type { Business } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns private agent configuration to the native service after validating the call token. */
export async function POST(req: Request) {
  const auth = readCallToken(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!rateLimit(`voice-config:${auth.cid}`, 10, 60_000)) {
    return NextResponse.json({ message: 'Too many requests.' }, { status: 429 });
  }

  const db = supabaseAdmin();
  const { data: call, error: callError } = await db
    .from('calls')
    .select('id')
    .eq('id', auth.cid)
    .eq('business_id', auth.bid)
    .is('ended_at', null)
    .maybeSingle();
  if (callError) {
    console.error('voice config call lookup failed', callError.message);
    return NextResponse.json({ message: 'Voice configuration is unavailable.' }, { status: 503 });
  }
  if (!call) return NextResponse.json({ message: 'Call not found.' }, { status: 404 });

  const { data: business, error: businessError } = await db
    .from('businesses')
    .select('*')
    .eq('id', auth.bid)
    .maybeSingle<Business>();
  if (businessError) {
    console.error('voice config business lookup failed', businessError.message);
    return NextResponse.json({ message: 'Voice configuration is unavailable.' }, { status: 503 });
  }
  if (!business) return NextResponse.json({ message: 'Business not found.' }, { status: 404 });

  return NextResponse.json({
    instructions: buildInstructions(business),
    greeting: business.greeting,
    voice: business.voice,
  });
}
