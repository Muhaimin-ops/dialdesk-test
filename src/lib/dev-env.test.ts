import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('local development environment', () => {
  it('uses project Supabase settings and persists a local development secret', () => {
    const projectDir = mkdtempSync(resolve(tmpdir(), 'dialdesk-env-'));
    try {
      writeFileSync(
        resolve(projectDir, '.env'),
        'SUPABASE_ANON_KEY=project-configured-key\n',
      );
      const moduleUrl = pathToFileURL(resolve('scripts/load-local-env.mjs')).href;
      const script = `
        const { existsSync, readFileSync } = await import('node:fs');
        process.env.SUPABASE_ANON_KEY = 'inherited-stale-key';
        process.env.APP_SECRET = '';
        const { loadLocalSupabaseEnv } = await import(${JSON.stringify(moduleUrl)});
        loadLocalSupabaseEnv(${JSON.stringify(projectDir)});
        const firstSecret = process.env.APP_SECRET;
        loadLocalSupabaseEnv(${JSON.stringify(projectDir)});
        console.log(JSON.stringify({
          projectKey: process.env.SUPABASE_ANON_KEY === 'project-configured-key',
          secretCreated: firstSecret.length >= 32,
          secretStable: process.env.APP_SECRET === firstSecret,
          secretPersisted: existsSync(${JSON.stringify(resolve(projectDir, '.env.local'))})
            && /^APP_SECRET=.+$/m.test(readFileSync(${JSON.stringify(resolve(projectDir, '.env.local'))}, 'utf8')),
        }));
      `;
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', script],
        { encoding: 'utf8' },
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual({
        projectKey: true,
        secretCreated: true,
        secretStable: true,
        secretPersisted: true,
      });
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('ignores blank local overrides so real project values stay active', () => {
    const projectDir = mkdtempSync(resolve(tmpdir(), 'dialdesk-env-blank-'));
    try {
      writeFileSync(
        resolve(projectDir, '.env'),
        'SUPABASE_ANON_KEY=project-configured-key\nAPP_SECRET=project-secret-value\n',
      );
      writeFileSync(
        resolve(projectDir, '.env.local'),
        'SUPABASE_ANON_KEY=\nAPP_SECRET=\n',
      );

      const moduleUrl = pathToFileURL(resolve('scripts/load-local-env.mjs')).href;
      const script = `
        process.env.SUPABASE_ANON_KEY = 'inherited-stale-key';
        process.env.APP_SECRET = 'inherited-stale-secret';
        const { loadLocalSupabaseEnv } = await import(${JSON.stringify(moduleUrl)});
        loadLocalSupabaseEnv(${JSON.stringify(projectDir)});
        console.log(JSON.stringify({
          projectKey: process.env.SUPABASE_ANON_KEY === 'project-configured-key',
          projectSecret: process.env.APP_SECRET === 'project-secret-value',
        }));
      `;
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', script],
        { encoding: 'utf8' },
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual({
        projectKey: true,
        projectSecret: true,
      });
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
