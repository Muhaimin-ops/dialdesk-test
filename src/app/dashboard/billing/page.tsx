import SubmitButton from '@/components/SubmitButton';
import { openPortal, startCheckout } from '@/app/actions/billing';
import { getCurrentBusiness } from '@/lib/business';
import { PLANS, monthStartIso } from '@/lib/plans';
import { stripeEnabled } from '@/lib/stripe';

export const metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

export default async function Billing({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { business, supabase } = await getCurrentBusiness();
  const { count } = await supabase.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', business.id).gte('started_at', monthStartIso());
  const plan = PLANS[business.plan];

  return (
    <div className="max-w-xl space-y-4">
      {status === 'success' && <p role="status" className="rounded-lg bg-live/10 p-2 text-sm text-live">Thanks! Your plan updates within a few seconds.</p>}
      <section className="card space-y-3">
        <p className="text-sm text-slate2">Current plan</p>
        <p className="text-2xl font-semibold">{plan.label}</p>
        <p className="text-sm">{count ?? 0} of {plan.callsPerMonth} calls used this month.</p>
        {stripeEnabled() ? (
          business.plan === 'free'
            ? <form action={startCheckout}><SubmitButton>Upgrade to Pro ({PLANS.pro.callsPerMonth} calls/month)</SubmitButton></form>
            : <form action={openPortal}><SubmitButton className="btn-ghost">Manage subscription</SubmitButton></form>
        ) : (
          <p className="hint">Billing is not configured on this deployment (set STRIPE_SECRET_KEY, STRIPE_PRICE_PRO and STRIPE_WEBHOOK_SECRET).</p>
        )}
      </section>
    </div>
  );
}
