import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { readCallToken } from '@/lib/embed';
import { voicePipelineUrl } from '@/lib/env';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const body = z.object({ sdp: z.string().min(20).max(30000), type: z.literal('offer') });
const err = (status: number, message: string) => NextResponse.json({ message }, { status });

/** Proxies WebRTC signaling to the Pipecat service without exposing its address to the browser. */
export async function POST(req: Request) {
  const authorization = req.headers.get('authorization');
  const auth = readCallToken(authorization);
  if (!auth) return err(401, 'This call session expired. Please try again.');
  if (!rateLimit(`connect:${auth.cid}`, 3, 10 * 60_000)) return err(429, 'This call session has reached its connection limit.');

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, 'Bad request.');

  const db = supabaseAdmin();
  const { data: call, error: callError } = await db
    .from('calls')
    .select('id')
    .eq('id', auth.cid)
    .eq('business_id', auth.bid)
    .is('ended_at', null)
    .maybeSingle();
  if (callError) {
    console.error('call lookup failed', callError.message);
    return err(503, 'The voice service is temporarily unavailable.');
  }
  if (!call) return err(401, 'This call session expired. Please try again.');

  const discardCall = async () => {
    const { error } = await db.from('calls').delete().eq('id', auth.cid).eq('business_id', auth.bid);
    if (error) console.error('failed call cleanup failed', error.message);
  };

  let pipelineUrl: string;
  try {
    pipelineUrl = voicePipelineUrl();
  } catch (error) {
    console.error('native voice service URL is not configured', error);
    await discardCall();
    return err(503, 'The native voice service is not configured.');
  }

  let response: Response;
  try {
    response = await fetch(`${pipelineUrl}/offer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: authorization ?? '' },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    console.error('Pipecat signaling request failed', error);
    await discardCall();
    return err(502, 'The native voice service is unavailable. Please try again.');
  }
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Pipecat signaling failed', response.status, details.slice(0, 300));
    await discardCall();
    return err(502, 'The native voice service could not connect. Please try again.');
  }

  try {
    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Pipecat signaling response was invalid', error);
    await discardCall();
    return err(502, 'The native voice service returned an invalid response.');
  }
}
