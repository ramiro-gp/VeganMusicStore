import { readFile } from 'node:fs/promises';
import { assertSnapshot } from '../src/lib/catalog.ts';
const value: unknown = JSON.parse(await readFile(new URL('../src/data/catalog.snapshot.json', import.meta.url), 'utf8'));
assertSnapshot(value);
console.log(`Snapshot válido: ${value.products.length} productos.`);
