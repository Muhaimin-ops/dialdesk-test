import { headers } from 'next/headers';

export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return value;
}

export function positiveInteger(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be a whole number between 1 and ${maximum}.`);
  }
  return value;
}

export const env = {
  supabaseUrl: () => required('SUPABASE_URL'),
  supabaseAnon: () => required('SUPABASE_ANON_KEY'),
  supabaseService: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  appSecret: () => {
    const s = required('APP_SECRET');
    if (s.length < 32) throw new Error('APP_SECRET must be at least 32 characters.');
    return s;
  },
};

export function voicePipelineUrl(): string {
  const configured = process.env.VOICE_PIPELINE_URL?.trim();
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('VOICE_PIPELINE_URL is required in production.');
  }
  const value = configured || 'http://127.0.0.1:7860';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VOICE_PIPELINE_URL must be an absolute HTTP(S) URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VOICE_PIPELINE_URL must be an HTTP(S) service URL without credentials, query, or fragment.');
  }
  return url.toString().replace(/\/$/, '');
}

/** Public origin. Production must use a canonical configured origin, not a request Host header. */
export async function getAppUrl(): Promise<string> {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      throw new Error('APP_URL must be a valid absolute URL, such as https://app.example.com.');
    }
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && !isLoopback)
    ) {
      throw new Error('APP_URL must be a public origin (HTTPS in production except on loopback), without a path or credentials.');
    }
    return url.origin;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_URL is required in production. Set it to the canonical HTTPS app origin.');
  }

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export const MAX_CALL_SECONDS = positiveInteger('MAX_CALL_SECONDS', 600, 7200);
