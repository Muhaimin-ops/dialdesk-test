import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** GET /api/health → liveness. GET /api/health?deep=1 → also checks the database. */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get('deep') === '1';
  if (!deep) return NextResponse.json({ ok: true });
  try {
    const { error } = await supabaseAdmin().from('businesses').select('id', { head: true, count: 'estimated' }).limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, db: true });
  } catch (error) {
    console.error('deep health check failed', error);
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
