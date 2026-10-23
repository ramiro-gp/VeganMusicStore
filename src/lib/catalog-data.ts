import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseSnapshot, enrichCatalog } from './catalog.ts';

const path = process.env.CATALOG_SNAPSHOT_PATH || resolve(process.cwd(), 'src/data/catalog.snapshot.json');
const data: unknown = JSON.parse(await readFile(path, 'utf8'));
export const snapshot = parseSnapshot(data);
export const products = enrichCatalog(snapshot);
export const presaleProducts = products.filter(item => item.isPresale);
export const featured = products.filter(item => item.featuredOrder !== null).sort((a, b) => a.featuredOrder! - b.featuredOrder!).slice(0, 8);
