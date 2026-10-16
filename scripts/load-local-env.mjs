import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

const SUPABASE_ENV_NAMES = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_SECRET',
];

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function loadLocalSupabaseEnv(projectDir = process.cwd()) {
  const inherited = new Map(
    SUPABASE_ENV_NAMES.map((name) => [name, process.env[name]]),
  );

  for (const name of SUPABASE_ENV_NAMES) delete process.env[name];
  loadEnvConfig(projectDir, true);

  for (const name of SUPABASE_ENV_NAMES) {
    if (!hasValue(process.env[name])) {
      delete process.env[name];
      const inheritedValue = inherited.get(name);
      if (hasValue(inheritedValue)) {
        process.env[name] = inheritedValue;
      }
    }
  }

  if (!hasValue(process.env.APP_SECRET)) {
    const secret = randomBytes(48).toString('base64url');
    const localEnvPath = resolve(projectDir, '.env.local');
    const existing = existsSync(localEnvPath)
      ? readFileSync(localEnvPath, 'utf8')
      : '';
    const secretLine = `APP_SECRET=${secret}`;
    const updated = /^\s*APP_SECRET\s*=.*$/m.test(existing)
      ? existing.replace(/^\s*APP_SECRET\s*=.*$/m, secretLine)
      : `${existing}${existing && !existing.endsWith('\n') ? '\n' : ''}${secretLine}\n`;
    writeFileSync(localEnvPath, updated);
    process.env.APP_SECRET = secret;
  }
}
