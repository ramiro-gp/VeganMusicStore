export interface CatalogItem {
  id: string;
  sourceTitle: string;
  artist: string | null;
  album: string | null;
  format: string | null;
  priceCashArs: number | null;
  stockStatus: 'listed' | 'out' | 'unknown';
  stockRaw: string;
  origin: string | null;
  label: string | null;
  coverKey: string | null;
  featuredOrder: number | null;
}

export interface CatalogSnapshot {
  schemaVersion: 1;
  syncedAt: string;
  products: CatalogItem[];
}
