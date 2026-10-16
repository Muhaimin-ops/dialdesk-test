import { notFound } from 'next/navigation';
import VoiceCall from '@/components/VoiceCall';
import { MAX_CALL_SECONDS } from '@/lib/env';
import { issueEmbedToken } from '@/lib/embed';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DAYS, DAY_LABELS } from '@/lib/time';
import type { Business } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabaseAdmin().from('businesses').select('name').eq('slug', slug).maybeSingle();
  return { title: data ? `Call ${data.name}` : 'Not found' };
}

/** Public, first-party page for a business: hours + talk-to-the-receptionist. */
export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: b } = await supabaseAdmin().from('businesses').select('*').eq('slug', slug).maybeSingle<Business>();
  if (!b) notFound();

  return (
    <main className="mx-auto grid max-w-3xl gap-6 p-6 md:grid-cols-2 md:py-16">
      <section>
        <h1 className="text-3xl font-semibold">{b.name}</h1>
        <p className="mt-2 text-slate2">Talk to {b.agent_name}, our AI receptionist, any time. Book a visit or leave your details.</p>
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-slate2">Opening hours</h2>
        <dl className="mt-2 space-y-1 text-sm">
          {DAYS.slice(1).concat(DAYS[0]).map((d) => (
            <div key={d} className="flex justify-between border-b border-mist py-1">
              <dt>{DAY_LABELS[d]}</dt>
              <dd className="text-slate2">{b.hours[d] ? `${b.hours[d]!.open} – ${b.hours[d]!.close}` : 'Closed'}</dd>
            </div>
          ))}
        </dl>
        <p className="hint">Times are in {b.timezone}.</p>
      </section>
      <section className="card overflow-hidden p-0">
        <VoiceCall token={issueEmbedToken(b.id)} agentName={b.agent_name} businessName={b.name} maxSeconds={MAX_CALL_SECONDS} />
      </section>
    </main>
  );
}
