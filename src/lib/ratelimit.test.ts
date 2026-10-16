import { describe, expect, it, vi } from 'vitest';
import { rateLimit } from './ratelimit';

describe('rateLimit', () => {
  it('allows only the configured requests in a window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      expect(rateLimit('test:window', 2, 1000)).toBe(true);
      expect(rateLimit('test:window', 2, 1000)).toBe(true);
      expect(rateLimit('test:window', 2, 1000)).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(rateLimit('test:window', 2, 1000)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bounds memory when callers use many distinct keys', () => {
    for (let i = 0; i < 5001; i += 1) rateLimit(`test:capacity:${i}`, 1, 60_000);
    expect(rateLimit('test:capacity:overflow', 1, 60_000)).toBe(false);
  });
});
