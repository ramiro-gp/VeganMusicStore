import { writeFile, rename, rm } from 'node:fs/promises';
import { importCatalog } from './catalog-import.ts';
import { assertSnapshot } from '../src/lib/catalog.ts';
import type { CatalogSnapshot } from '../src/types/catalog.ts';

export async function promoteCatalog(csv: string, target: string | URL, candidate: string | URL, validate?: (candidate: string | URL) => Promise<void>, syncedAt?: string): Promise<CatalogSnapshot> {
  // No changes to target until parsing AND optional build validation succeed.
  const snapshot = importCatalog(csv, syncedAt);
  assertSnapshot(snapshot);
  try {
    await writeFile(candidate, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
    if (validate) await validate(candidate);
    await rename(candidate, target);
    return snapshot;
  } finally {
    await rm(candidate, { force: true });
  }
}
