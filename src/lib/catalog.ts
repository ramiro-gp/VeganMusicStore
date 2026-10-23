import type { CatalogItem, CatalogSnapshot } from '../types/catalog.ts';
import { editorial } from '../data/catalog.editorial.ts';
import { imageUrl, purchaseUrl } from './product-links.ts';

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').replace(/\s+/g, ' ').trim();
}

export function enrichCatalog(snapshot: CatalogSnapshot): CatalogItem[] {
  return snapshot.products.map(item => {
    const extra = editorial.find(entry => normalizeText(entry.sourceTitle) === normalizeText(item.sourceTitle));
    return extra ? { ...item, ...extra, sourceTitle: item.sourceTitle } : item;
  }).sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle, 'es-AR'));
}

export function parseSnapshot(value: unknown): CatalogSnapshot {
  // Read the previous version until the first successful schema-4 sync replaces it.
  if (value && typeof value === 'object' && 'schemaVersion' in value && value.schemaVersion === 3 && 'products' in value && Array.isArray(value.products)) {
    value = { ...value, schemaVersion: 4, products: value.products.map(item => ({ ...item, isPresale: false, purchaseUrl: null, imageUrl: null })) };
  }
  assertSnapshot(value);
  return value;
}

export function assertSnapshot(value: unknown): asserts value is CatalogSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Snapshot inválido.');
  const snapshot = value as CatalogSnapshot;
  if (snapshot.schemaVersion !== 4 || !Number.isFinite(Date.parse(snapshot.syncedAt)) || !Array.isArray(snapshot.products) || snapshot.products.length === 0) throw new Error('Snapshot vacío o incompatible.');
  const ids = new Set<string>();
  for (const item of snapshot.products) {
    if (!item || typeof item !== 'object') throw new Error('Producto inválido.');
    const prices = [item.priceCashArs, item.priceCardOneArs, item.installment3Ars];
    if (!item.id || ids.has(item.id) || !item.sourceTitle?.trim() || typeof item.stockRaw !== 'string' || !['listed', 'out', 'unknown'].includes(item.stockStatus) || prices.some(price => price !== null && (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(Math.round(price * 100))))) throw new Error(`Producto inválido o duplicado: ${item.id ?? 'sin ID'}.`);
    ids.add(item.id);
    if (typeof item.isPresale !== 'boolean' || (item.purchaseUrl !== null && (typeof item.purchaseUrl !== 'string' || purchaseUrl(item.purchaseUrl) !== item.purchaseUrl)) || (item.imageUrl !== null && (typeof item.imageUrl !== 'string' || imageUrl(item.imageUrl) !== item.imageUrl))) throw new Error(`Enlaces o preventa inválidos: ${item.id}.`);
  }
}

export function syncDate(snapshot: CatalogSnapshot): string {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(snapshot.syncedAt));
}
