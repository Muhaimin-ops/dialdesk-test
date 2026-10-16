import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/ratelimit';
import { readCallToken } from '@/lib/embed';
import { runTool } from '@/lib/tools';
import type { Business } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const body = z.object({ name: z.string().max(60), args: z.unknown() });

/** Executes an agent tool call. Authorised by the signed per-call token only. */
export async function POST(req: Request) {
  const auth = readCallToken(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!rateLimit(`tool:${auth.cid}`, 60, 60_000)) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });

  const db = supabaseAdmin();
  // The call must belong to the business named in the token.
  const { data: call } = await db.from('calls').select('id').eq('id', auth.cid).eq('business_id', auth.bid).is('ended_at', null).maybeSingle();
  if (!call) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { data: business } = await db.from('businesses').select('*').eq('id', auth.bid).maybeSingle<Business>();
  if (!business) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  try {
    return NextResponse.json(await runTool(business, auth.cid, parsed.data.name, parsed.data.args));
  } catch (e) {
    console.error('tool failed', parsed.data.name, e);
    return NextResponse.json({ ok: false, error: 'server_error' });
  }
}
