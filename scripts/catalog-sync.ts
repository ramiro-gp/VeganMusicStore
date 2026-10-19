import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { importCatalog } from './catalog-import.ts';
import { assertSnapshot } from '../src/lib/catalog.ts';
import type { CatalogSnapshot } from '../src/types/catalog.ts';

export interface CatalogSyncResult { snapshot: CatalogSnapshot; changed: boolean }

export function sameCatalog(a: CatalogSnapshot, b: CatalogSnapshot): boolean {
  const ordered = (snapshot: CatalogSnapshot) => [...snapshot.products].sort((a, b) => a.id.localeCompare(b.id));
  return a.schemaVersion === b.schemaVersion && isDeepStrictEqual(ordered(a), ordered(b));
}

export async function promoteCatalog(csv: string, target: string | URL, candidate: string | URL, validate?: (candidate: string | URL) => Promise<void>, syncedAt?: string): Promise<CatalogSyncResult> {
  // No changes to target until parsing AND optional build validation succeed.
  const snapshot = importCatalog(csv, syncedAt);
  assertSnapshot(snapshot);
  let previous: CatalogSnapshot | undefined;
  try {
    const value: unknown = JSON.parse(await readFile(target, 'utf8'));
    assertSnapshot(value);
    previous = value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (previous && sameCatalog(previous, snapshot)) return { snapshot: previous, changed: false };
  try {
    await writeFile(candidate, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
    if (validate) await validate(candidate);
    await rename(candidate, target);
    return { snapshot, changed: true };
  } finally {
    await rm(candidate, { force: true });
  }
}
