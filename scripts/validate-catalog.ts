import { readFile } from 'node:fs/promises';
import { parseSnapshot } from '../src/lib/catalog.ts';
const value: unknown = JSON.parse(await readFile(new URL('../src/data/catalog.snapshot.json', import.meta.url), 'utf8'));
const snapshot = parseSnapshot(value);
console.log(`Snapshot válido: ${snapshot.products.length} productos.`);
