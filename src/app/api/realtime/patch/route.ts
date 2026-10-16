import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { readCallToken } from '@/lib/embed';
import { voicePipelineUrl } from '@/lib/env';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const candidate = z.object({
  candidate: z.string().min(1).max(2048),
  sdp_mid: z.string().min(1).max(256),
  sdp_mline_index: z.number().int().min(0).max(255),
});
const body = z.object({
  pc_id: z.string().min(1).max(200),
  candidates: z.array(candidate).min(1).max(32),
});
const err = (status: number, message: string) => NextResponse.json({ message }, { status });

/** Proxies trickled ICE candidates to Pipecat after validating the active call token. */
export async function PATCH(req: Request) {
  const authorization = req.headers.get('authorization');
  const auth = readCallToken(authorization);
  if (!auth) return err(401, 'This call session expired. Please try again.');
  if (!rateLimit(`patch:${auth.cid}`, 120, 10 * 60_000)) {
    return err(429, 'This call has sent too many network updates. Please reconnect.');
  }

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
    console.error('ICE candidate call lookup failed', callError.message);
    return err(503, 'The voice service is temporarily unavailable.');
  }
  if (!call) return err(401, 'This call session expired. Please try again.');

  let pipelineUrl: string;
  try {
    pipelineUrl = voicePipelineUrl();
  } catch (error) {
    console.error('native voice service URL is not configured', error);
    return err(503, 'The native voice service is not configured.');
  }

  let response: Response;
  try {
    response = await fetch(`${pipelineUrl}/patch`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: authorization ?? '' },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error('Pipecat ICE candidate request failed', error);
    return err(502, 'The native voice service is unavailable. Please try again.');
  }
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Pipecat ICE candidate update failed', response.status, details.slice(0, 300));
    return err(502, 'The native voice service could not update the connection.');
  }

  try {
    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Pipecat ICE candidate response was invalid', error);
    return err(502, 'The native voice service returned an invalid response.');
  }
}
