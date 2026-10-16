export function originOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.origin : null;
  } catch {
    return null;
  }
}

/** Normalise user-entered domains/URLs to exact origins. Invalid lines are dropped. */
export function parseOrigins(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.split(/[\n,]+/)) {
    const line = raw.trim();
    if (!line) continue;
    const o = originOf(/^https?:\/\//i.test(line) ? line : `https://${line}`);
    if (o) out.add(o);
  }
  return [...out].slice(0, 20);
}

export function isOriginAllowed(origin: string | null, allowed: string[], appOrigin: string): boolean {
  if (!origin) return false;
  return origin === appOrigin || allowed.includes(origin);
}
