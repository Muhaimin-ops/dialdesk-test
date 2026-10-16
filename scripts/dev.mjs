import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadLocalSupabaseEnv } from './load-local-env.mjs';

loadLocalSupabaseEnv();

const require = createRequire(import.meta.url);
const nextCli = require.resolve('next/dist/bin/next');
process.argv.splice(1, 1, nextCli, 'dev');
await import(pathToFileURL(nextCli).href);
