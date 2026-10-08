import type { CatalogItem, CatalogSnapshot } from '../types/catalog.ts';
import { editorial } from '../data/catalog.editorial.ts';

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').replace(/\s+/g, ' ').trim();
}

export function enrichCatalog(snapshot: CatalogSnapshot): CatalogItem[] {
  return snapshot.products.map(item => {
    const extra = editorial.find(entry => normalizeText(entry.sourceTitle) === normalizeText(item.sourceTitle));
    return extra ? { ...item, ...extra, sourceTitle: item.sourceTitle } : item;
  }).sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle, 'es-AR'));
}

export function assertSnapshot(value: unknown): asserts value is CatalogSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Snapshot inválido.');
  const snapshot = value as CatalogSnapshot;
  if (snapshot.schemaVersion !== 2 || !Number.isFinite(Date.parse(snapshot.syncedAt)) || !Array.isArray(snapshot.products) || snapshot.products.length === 0) throw new Error('Snapshot vacío o incompatible.');
  const ids = new Set<string>();
  for (const item of snapshot.products) {
    if (!item.id || ids.has(item.id) || !item.sourceTitle?.trim() || !['listed', 'out', 'unknown'].includes(item.stockStatus) || (item.priceCashArs !== null && (!Number.isFinite(item.priceCashArs) || item.priceCashArs < 0)) || (item.installment3Ars !== null && (!Number.isFinite(item.installment3Ars) || item.installment3Ars < 0))) throw new Error(`Producto inválido o duplicado: ${item.id ?? 'sin ID'}.`);
    ids.add(item.id);
  }
}

export function syncDate(snapshot: CatalogSnapshot): string {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(snapshot.syncedAt));
}
