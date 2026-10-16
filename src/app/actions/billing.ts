'use server';

import { redirect } from 'next/navigation';
import { getAppUrl, required } from '@/lib/env';
import { getCurrentBusiness } from '@/lib/business';
import { getStripe } from '@/lib/stripe';

export async function startCheckout() {
  const { business, user } = await getCurrentBusiness();
  const base = await getAppUrl();
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: required('STRIPE_PRICE_PRO'), quantity: 1 }],
    client_reference_id: business.id,
    ...(business.stripe_customer_id ? { customer: business.stripe_customer_id } : { customer_email: user.email }),
    subscription_data: { metadata: { business_id: business.id } },
    success_url: `${base}/dashboard/billing?status=success`,
    cancel_url: `${base}/dashboard/billing`,
  });
  redirect(session.url!);
}

export async function openPortal() {
  const { business } = await getCurrentBusiness();
  if (!business.stripe_customer_id) redirect('/dashboard/billing');
  const portal = await getStripe().billingPortal.sessions.create({
    customer: business.stripe_customer_id!,
    return_url: `${await getAppUrl()}/dashboard/billing`,
  });
  redirect(portal.url);
}
