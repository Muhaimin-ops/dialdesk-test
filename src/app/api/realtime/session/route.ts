import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { clientIp, rateLimit } from '@/lib/ratelimit';
import { issueCallToken, readEmbedToken } from '@/lib/embed';
import { PLANS } from '@/lib/plans';
import type { Business } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const body = z.object({ token: z.string().min(10).max(2000) });
const err = (status: number, message: string) => NextResponse.json({ message }, { status });

/** Reserves a business call and returns the short-lived token used by the Pipecat service. */
export async function POST(req: Request) {
  if (!rateLimit(`sess:ip:${clientIp(req)}`, 6, 10 * 60_000)) return err(429, 'Too many calls from your network. Please try again shortly.');

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, 'Bad request.');
  const embed = readEmbedToken(parsed.data.token);
  if (!embed) return err(401, 'This session expired. Reload the page and try again.');
  if (!rateLimit(`sess:biz:${embed.bid}`, 200, 60 * 60_000)) return err(429, 'This line is busy. Please try again later.');

  const db = supabaseAdmin();
  const { data: business, error: businessError } = await db
    .from('businesses')
    .select('*')
    .eq('id', embed.bid)
    .maybeSingle<Business>();
  if (businessError) {
    console.error('business lookup failed', businessError.message);
    return err(503, 'The voice service is temporarily unavailable.');
  }
  if (!business) return err(404, 'Business not found.');

  const { data: callId, error: callErr } = await db.rpc('start_call_if_under_limit', {
    p_business_id: business.id,
    p_call_limit: PLANS[business.plan].callsPerMonth,
  });
  if (callErr) {
    console.error('call reservation failed', callErr.message);
    return err(503, 'The voice service is temporarily unavailable.');
  }
  if (!callId) return err(402, 'This business has reached its monthly call limit.');

  return NextResponse.json({ callToken: issueCallToken(business.id, callId) });
}
