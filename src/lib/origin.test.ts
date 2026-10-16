import { describe, expect, it } from 'vitest';
import { isOriginAllowed, originOf, parseOrigins } from './origin';

describe('origins', () => {
  it('extracts origins and rejects non-http', () => {
    expect(originOf('https://a.com/x?y=1')).toBe('https://a.com');
    expect(originOf('javascript:alert(1)')).toBeNull();
    expect(originOf(null)).toBeNull();
  });
  it('parses user lists', () => {
    expect(parseOrigins('a.com\nhttps://b.com/path, http://localhost:3000\nnot a url')).toEqual([
      'https://a.com', 'https://b.com', 'http://localhost:3000',
    ]);
  });
  it('allows only the app and listed origins', () => {
    expect(isOriginAllowed('https://a.com', ['https://a.com'], 'https://app.io')).toBe(true);
    expect(isOriginAllowed('https://app.io', [], 'https://app.io')).toBe(true);
    expect(isOriginAllowed('https://evil.com', ['https://a.com'], 'https://app.io')).toBe(false);
    expect(isOriginAllowed(null, ['https://a.com'], 'https://app.io')).toBe(false);
  });
});
