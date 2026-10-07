import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../src/config/site.ts';
import { fetchCsv } from './catalog-import.ts';
import { promoteCatalog } from './catalog-sync.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = new URL('../src/data/catalog.snapshot.json', import.meta.url);
const candidate = new URL('../src/data/catalog.candidate.json', import.meta.url);
const verify = process.argv.includes('--verify');

try {
  const csv = await fetchCsv(process.env.CATALOG_CSV_URL || siteConfig.catalog.csvUrl, { timeoutMs: siteConfig.catalog.timeoutMs });
  const snapshot = await promoteCatalog(csv, target, candidate, verify ? async () => {
    const childEnv = { ...process.env, CATALOG_SNAPSHOT_PATH: fileURLToPath(candidate) };
    for (const command of ['test', 'check', 'build']) {
      const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', [command], { cwd: root, stdio: 'inherit', env: childEnv, shell: process.platform === 'win32' });
      if (result.status !== 0) throw new Error(`Falló pnpm ${command}. El snapshot anterior se conserva.`);
    }
  } : undefined);
  console.log(`Catálogo sincronizado: ${snapshot.products.length} productos únicos. ${snapshot.syncedAt}`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
