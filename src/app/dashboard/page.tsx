import { getCurrentBusiness } from '@/lib/business';
import { getAppUrl } from '@/lib/env';
import { PLANS, monthStartIso } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export default async function Overview() {
  const { business, supabase } = await getCurrentBusiness();
  const base = await getAppUrl();
  const nowIso = new Date().toISOString();
  const [calls, upcoming, leads] = await Promise.all([
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', business.id).gte('started_at', monthStartIso()),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'confirmed').gte('starts_at', nowIso),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('business_id', business.id),
  ]);
  const snippet = `<script src="${base}/widget.js" data-business="${business.id}" defer></script>`;
  const stats = [
    ['Calls this month', `${calls.count ?? 0} / ${PLANS[business.plan].callsPerMonth}`],
    ['Upcoming appointments', String(upcoming.count ?? 0)],
    ['Leads captured', String(leads.count ?? 0)],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="card"><p className="text-sm text-slate2">{k}</p><p className="mt-1 text-3xl font-semibold">{v}</p></div>
        ))}
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Install on your website</h2>
        <p className="text-sm text-slate2">Paste before <code>&lt;/body&gt;</code>. Then add your site’s address under <b>Agent settings → Allowed websites</b>; the widget only runs on listed sites.</p>
        <pre className="overflow-x-auto rounded-lg bg-ink p-3 text-xs text-white"><code>{snippet}</code></pre>
        <p className="text-sm">Or share your public page: <a className="underline" href={`/b/${business.slug}`}>{base}/b/{business.slug}</a></p>
      </section>
    </div>
  );
}
