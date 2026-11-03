import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseSnapshot, enrichCatalog } from './catalog.ts';
import { selectShowcase } from './catalog-selection.ts';

const path = process.env.CATALOG_SNAPSHOT_PATH || resolve(process.cwd(), 'src/data/catalog.snapshot.json');
const data: unknown = JSON.parse(await readFile(path, 'utf8'));
export const snapshot = parseSnapshot(data);
export const products = enrichCatalog(snapshot);
export const showcase = selectShowcase(products);
export const cartShowcase = selectShowcase(products, 'cart');
export const presaleProducts = cartShowcase.mode === 'presale' ? cartShowcase.items : [];
export const showcaseAnchor = showcase.items.length ? '#record-slider-home-title' : '#tienda';
export const featured = products.filter(item => item.featuredOrder !== null).sort((a, b) => a.featuredOrder! - b.featuredOrder!).slice(0, 8);
