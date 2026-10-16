import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import VoiceCall from '@/components/VoiceCall';
import { getAppUrl, MAX_CALL_SECONDS } from '@/lib/env';
import { issueEmbedToken } from '@/lib/embed';
import { isOriginAllowed, originOf } from '@/lib/origin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Business } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Voice receptionist', robots: { index: false } };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EmbedPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  if (!UUID.test(businessId)) notFound();

  const { data: b } = await supabaseAdmin().from('businesses').select('*').eq('id', businessId).maybeSingle<Business>();
  if (!b) notFound();

  // The widget iframe sends the embedding site's origin as the Referer (referrerpolicy="origin").
  // This blocks casual copy-paste embedding on unlisted sites; it is not a hard security boundary,
  // which is why per-business monthly call caps and rate limits also apply.
  const referer = originOf((await headers()).get('referer'));
  const appOrigin = originOf(await getAppUrl());
  if (!appOrigin || !isOriginAllowed(referer, b.allowed_origins, appOrigin)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-6 text-center text-sm text-slate2">
        This assistant is not enabled for this website.
      </main>
    );
  }

  return (
    <main className="h-screen">
      <VoiceCall token={issueEmbedToken(b.id)} agentName={b.agent_name} businessName={b.name} maxSeconds={MAX_CALL_SECONDS} />
    </main>
  );
}
