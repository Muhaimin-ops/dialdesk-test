import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : v?.id ?? null);

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const raw = await req.text(); // raw body is required for signature verification
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.client_reference_id) {
      const { error } = await db.from('businesses').update({
        stripe_customer_id: idOf(s.customer as string | { id: string } | null),
        stripe_subscription_id: idOf(s.subscription as string | { id: string } | null),
        plan: 'pro',
        subscription_status: 'active',
      }).eq('id', s.client_reference_id);
      if (error) {
        console.error('Stripe checkout update failed', event.id, error.message);
        return NextResponse.json({ error: 'billing_update_failed' }, { status: 500 });
      }
    }
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const active = event.type !== 'customer.subscription.deleted' && ['active', 'trialing'].includes(sub.status);
    const patch = { plan: active ? 'pro' : 'free', subscription_status: sub.status, stripe_subscription_id: sub.id };
    const bid = sub.metadata?.business_id;
    const q = db.from('businesses').update(patch);
    const { error } = await (bid ? q.eq('id', bid) : q.eq('stripe_customer_id', idOf(sub.customer as string | { id: string }) ?? ''));
    if (error) {
      console.error('Stripe subscription update failed', event.id, error.message);
      return NextResponse.json({ error: 'billing_update_failed' }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
