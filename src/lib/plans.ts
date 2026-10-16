import { positiveInteger } from './env';

export const PLANS = {
  free: { label: 'Free', callsPerMonth: positiveInteger('FREE_CALLS_PER_MONTH', 20, 1_000_000) },
  pro: { label: 'Pro', callsPerMonth: positiveInteger('PRO_CALLS_PER_MONTH', 500, 1_000_000) },
} as const;

export function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
