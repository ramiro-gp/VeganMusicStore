import type { CatalogItem, CatalogSnapshot } from '../src/types/catalog.ts';
import { normalizeText } from '../src/lib/catalog.ts';

const modelo = 'https://veganrecords.empretienda.com.ar/general/vinilos/preventa/demonios-de-tasmania-modelo-96-vinilo-blanco';
const sexcalextric = 'https://veganrecords.empretienda.com.ar/general/vinilos/demonios-de-tasmania-sexcalextric-vinilo-violeta';

// Owner's two crossed URLs, verified on 2026-10-22. Only override the exact
// erroneous source value: a later correction or new URL in Sheets wins.
export function correctPurchaseUrl(item: Pick<CatalogItem, 'sourceTitle' | 'origin' | 'label'>, url: string | null): string | null {
  if (normalizeText(item.origin ?? '') !== 'europa' || normalizeText(item.label ?? '') !== 'vegan records') return url;
  const title = normalizeText(item.sourceTitle);
  if (title === 'demonios de tasmania sexcalextric lp violeta' && url === modelo) return sexcalextric;
  if (title === 'demonios de tasmania modelo 96 lp blanco' && url === sexcalextric) return modelo;
  return url;
}

/** Sheets O/P are authoritative: never fetch or restore an image behind the owner's choice. */
export function validatePresales(snapshot: CatalogSnapshot): void {
  for (const item of snapshot.products.filter(item => item.isPresale)) {
    if (!item.purchaseUrl) throw new Error(`Preventa sin enlace de compra en columna P: ${item.sourceTitle}.`);
    if (!item.imageUrl) throw new Error(`Preventa sin imagen en columna O: ${item.sourceTitle}.`);
  }
}
