import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { readCallToken } from '@/lib/embed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const body = z.object({
  durationSeconds: z.number().min(0).max(7200),
  transcript: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(2000) })).max(500),
});

/** Stores the transcript and duration. Only the first end-of-call write is accepted. */
export async function POST(req: Request) {
  const auth = readCallToken(req.headers.get('authorization'));
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from('calls')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: Math.round(parsed.data.durationSeconds),
      transcript: parsed.data.transcript,
    })
    .eq('id', auth.cid)
    .eq('business_id', auth.bid)
    .is('ended_at', null);
  if (error) console.error('end call failed', error.message);
  return NextResponse.json({ ok: !error });
}
