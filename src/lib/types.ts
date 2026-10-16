export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type Hours = Record<DayKey, { open: string; close: string } | null>;

export type Business = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  timezone: string;
  agent_name: string;
  greeting: string;
  instructions: string;
  knowledge: string;
  voice: string;
  hours: Hours;
  slot_minutes: number;
  allowed_origins: string[];
  plan: 'free' | 'pro';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  created_at: string;
};

export const VOICES = ['af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_nova', 'am_adam', 'am_michael'] as const;
export const LEGACY_VOICE_MAP: Record<string, typeof VOICES[number]> = {
  marin: 'af_heart',
  cedar: 'am_michael',
  alloy: 'af_bella',
  ash: 'am_adam',
  ballad: 'af_nicole',
  coral: 'af_sarah',
  echo: 'am_michael',
  sage: 'af_nova',
  shimmer: 'af_sarah',
  verse: 'af_nicole',
};
export const INDUSTRIES = ['general', 'plumbing', 'hvac', 'electrical', 'dental', 'salon', 'clinic', 'real estate', 'legal', 'restaurant'] as const;
