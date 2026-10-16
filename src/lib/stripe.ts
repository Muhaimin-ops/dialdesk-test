import Stripe from 'stripe';
import { required } from './env';

let stripe: Stripe | null = null;
export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);

export function getStripe(): Stripe {
  if (!stripe) stripe = new Stripe(required('STRIPE_SECRET_KEY'));
  return stripe;
}
