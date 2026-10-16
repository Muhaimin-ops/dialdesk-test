// Fixed-window in-memory limiter. Good for a single instance (VPS, one Railway/Render service).
// On serverless or multiple instances, swap this for Redis/Upstash: keep the same signature.
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
    if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) return false;
  }
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
