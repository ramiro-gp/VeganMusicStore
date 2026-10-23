export interface CatalogItem {
  id: string;
  sourceTitle: string;
  artist: string | null;
  album: string | null;
  format: string | null;
  priceCashArs: number | null;
  priceCardOneArs: number | null;
  installment3Ars: number | null;
  stockStatus: 'listed' | 'out' | 'unknown';
  stockRaw: string;
  origin: string | null;
  label: string | null;
  coverKey: string | null;
  featuredOrder: number | null;
  isPresale: boolean;
  purchaseUrl: string | null;
  imageUrl: string | null;
}

export interface CatalogSnapshot {
  schemaVersion: 4;
  syncedAt: string;
  products: CatalogItem[];
}
