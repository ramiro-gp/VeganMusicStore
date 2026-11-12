import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../src/config/site.ts';
import { fetchCsv } from './catalog-import.ts';
import { promoteCatalog } from './catalog-sync.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = new URL('../src/data/catalog.snapshot.json', import.meta.url);
const candidate = new URL('../src/data/catalog.candidate.json', import.meta.url);
const verify = process.argv.includes('--verify');
const warnings: string[] = [];
const quarantineIncomplete = process.argv.includes('--quarantine-incomplete') || process.env.CATALOG_QUARANTINE_INCOMPLETE === 'true';

try {
  const csv = await fetchCsv(process.env.CATALOG_CSV_URL || siteConfig.catalog.csvUrl, { timeoutMs: siteConfig.catalog.timeoutMs });
  const { snapshot, changed } = await promoteCatalog(csv, target, candidate, verify ? async () => {
    const childEnv = { ...process.env, CATALOG_SNAPSHOT_PATH: fileURLToPath(candidate) };
    for (const command of ['test', 'check', 'build']) {
      const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', [command], { cwd: root, stdio: 'inherit', env: childEnv, shell: process.platform === 'win32' });
      if (result.status !== 0) throw new Error(`Falló pnpm ${command}. El snapshot anterior se conserva.`);
    }
  } : undefined, undefined, { quarantineIncomplete, warn: message => {
    warnings.push(message);
    console.warn(message);
  } });
  const result = changed ? 'Catálogo actualizado' : 'Sin cambios en el catálogo';
  console.log(`${result}: ${snapshot.products.length} productos únicos. Última actualización de datos: ${snapshot.syncedAt}`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `### ${result}\n\n${snapshot.products.length} productos. Fecha del snapshot: ${snapshot.syncedAt}.\n${changed ? 'Snapshot validado; listo para versionar y publicar.' : 'La revisión de Sheets finalizó correctamente. Se conserva el snapshot anterior. No se genera commit ni despliegue: publish-hostinger figura como skipped (omitido) porque no hay novedades que publicar.'}\n`);
  if (warnings.length && process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Filas pendientes del dueño\n\n${warnings.map(message => `- ${message}`).join('\n')}\n\nSe omitieron por la excepción temporal CATALOG_QUARANTINE_INCOMPLETE. Corregir Sheets y volver a sincronizar.\n`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
