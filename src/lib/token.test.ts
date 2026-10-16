import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from './token';

const secret = 'x'.repeat(40);

describe('tokens', () => {
  it('round-trips a valid token', () => {
    const t = signToken({ typ: 'call', bid: 'b1' }, 60, secret);
    expect(verifyToken(t, secret, 'call')?.bid).toBe('b1');
  });
  it('rejects wrong type, wrong secret, tampering and expiry', () => {
    const t = signToken({ typ: 'call', bid: 'b1' }, 60, secret);
    expect(verifyToken(t, secret, 'embed')).toBeNull();
    expect(verifyToken(t, 'y'.repeat(40), 'call')).toBeNull();
    const [body, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ typ: 'call', bid: 'other', exp: 9999999999 })).toString('base64url');
    expect(verifyToken(`${forged}.${sig}`, secret, 'call')).toBeNull();
    expect(body).toBeTruthy();
    expect(verifyToken(signToken({ typ: 'call' }, -5, secret), secret, 'call')).toBeNull();
    expect(verifyToken('garbage', secret, 'call')).toBeNull();
  });
});
