import { env } from './env';
import { signToken, verifyToken } from './token';

const EMBED_TTL = 10 * 60;
const CALL_TTL = 30 * 60;

export const issueEmbedToken = (businessId: string) => signToken({ typ: 'embed', bid: businessId }, EMBED_TTL, env.appSecret());
export const issueCallToken = (businessId: string, callId: string) => signToken({ typ: 'call', bid: businessId, cid: callId }, CALL_TTL, env.appSecret());

export function readEmbedToken(token: string): { bid: string } | null {
  const p = verifyToken(token, env.appSecret(), 'embed');
  return p && typeof p.bid === 'string' ? { bid: p.bid } : null;
}

export function readCallToken(header: string | null): { bid: string; cid: string } | null {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const p = verifyToken(token, env.appSecret(), 'call');
  return p && typeof p.bid === 'string' && typeof p.cid === 'string' ? { bid: p.bid, cid: p.cid } : null;
}
