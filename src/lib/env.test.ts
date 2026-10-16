import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppUrl, positiveInteger, voicePipelineUrl } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('production configuration', () => {
  it('requires a canonical app URL in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    await expect(getAppUrl()).rejects.toThrow('APP_URL is required in production');
  });

  describe('native voice service configuration', () => {
    it('uses the local Pipecat service by default', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('VOICE_PIPELINE_URL', '');
      expect(voicePipelineUrl()).toBe('http://127.0.0.1:7860');
    });

    it('requires a service URL in production and rejects invalid protocols', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VOICE_PIPELINE_URL', '');
      expect(() => voicePipelineUrl()).toThrow('VOICE_PIPELINE_URL is required');

      vi.stubEnv('VOICE_PIPELINE_URL', 'ftp://voice.example.com');
      expect(() => voicePipelineUrl()).toThrow('HTTP(S) service URL');

      vi.stubEnv('VOICE_PIPELINE_URL', 'https://voice.example.com/');
      expect(voicePipelineUrl()).toBe('https://voice.example.com');
    });
  });

  it('accepts only a public origin and requires HTTPS in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_URL', 'http://app.example.com');
    await expect(getAppUrl()).rejects.toThrow('APP_URL must be a public origin');

    vi.stubEnv('APP_URL', 'https://app.example.com/path');
    await expect(getAppUrl()).rejects.toThrow('APP_URL must be a public origin');

    vi.stubEnv('APP_URL', 'https://app.example.com/');
    await expect(getAppUrl()).resolves.toBe('https://app.example.com');
  });

  it('rejects invalid numeric configuration rather than silently using defaults', () => {
    vi.stubEnv('MAX_CALL_SECONDS', '0');
    expect(() => positiveInteger('MAX_CALL_SECONDS', 600, 7200)).toThrow('MAX_CALL_SECONDS');

    vi.stubEnv('MAX_CALL_SECONDS', '601');
    expect(positiveInteger('MAX_CALL_SECONDS', 600, 7200)).toBe(601);
  });
});
