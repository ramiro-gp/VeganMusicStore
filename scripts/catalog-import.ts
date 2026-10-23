import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import type { CatalogItem, CatalogSnapshot } from '../src/types/catalog.ts';
import { normalizeText } from '../src/lib/catalog.ts';
import { imageUrl, purchaseUrl } from '../src/lib/product-links.ts';
import { correctPurchaseUrl } from './catalog-presale.ts';

const required = ['Banda / Titulo', 'PRECIO EFT/TRAN', 'STOCK', 'ORIGEN', 'SELLO'];

function parseCardPrice(raw: string, row: number, title: string, field: string): number | null {
  if (!raw) return null;
  const match = raw.match(/^\$?\s*(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/);
  if (!match) throw new Error(`${field} inválido en fila ${row}: ${title}.`);
  const price = Number(`${match[1].replace(/\./g, '')}${match[2] ? `.${match[2]}` : ''}`);
  if (!Number.isFinite(price) || !Number.isSafeInteger(Math.round(price * 100))) throw new Error(`${field} fuera de rango en fila ${row}: ${title}.`);
  return price > 0 ? price : null;
}

export function importCatalog(csv: string, syncedAt = new Date().toISOString()): CatalogSnapshot {
  if (!csv.trim() || /^\s*</.test(csv)) throw new Error('La fuente no devolvió un CSV: archivo vacío o HTML de Google.');
  const [rawHeaders = [], ...rows] = parse(csv, { bom: true, skip_empty_lines: true, relax_column_count: false }) as string[][];
  const headers = rawHeaders.map(header => header.trim());
  const missing = required.filter(column => !headers.includes(column));
  if (missing.length) throw new Error(`Faltan columnas: ${missing.join(', ')}.`);
  const named = headers.filter(Boolean);
  if (new Set(named).size !== named.length) throw new Error('Hay encabezados repetidos en el CSV.');
  const products: CatalogItem[] = [];
  const identities = new Map<string, string>();
  for (const [index, row] of rows.entries()) {
    const cell = (header: string) => (row[headers.indexOf(header)] ?? '').trim();
    const sourceTitle = cell('Banda / Titulo').replace(/\s+/g, ' ');
    if (!sourceTitle) continue;
    const rawPrice = cell('PRECIO EFT/TRAN');
    if (rawPrice && !/^\d+(?:[.,]\d{1,2})?$/.test(rawPrice)) throw new Error(`Precio inválido en fila ${index + 2}: ${sourceTitle}.`);
    const parsedPrice = rawPrice ? Number(rawPrice.replace(',', '.')) : null;
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || !Number.isSafeInteger(Math.round(parsedPrice * 100)))) throw new Error(`Precio fuera de rango en fila ${index + 2}: ${sourceTitle}.`);
    const price = parsedPrice && parsedPrice > 0 ? parsedPrice : null;
    const priceCardOneArs = parseCardPrice(cell('TARJETA 1 PAGO'), index + 2, sourceTitle, 'Precio de tarjeta en un pago');
    const installment3Ars = parseCardPrice(cell('Valor cuota'), index + 2, sourceTitle, 'Valor de cuota');
    const stockRaw = cell('STOCK');
    const stockNumber = /^\d+\+?$/.test(stockRaw) ? Number.parseInt(stockRaw, 10) : null;
    const origin = cell('ORIGEN') || null;
    const label = cell('SELLO') || null;
    const isPresale = normalizeText(row[8] ?? '') === 'preventa';
    const rawPurchaseUrl = (row[15] ?? '').trim();
    const rawImageUrl = cell('IMAGEN_URL');
    const purchase = rawPurchaseUrl ? purchaseUrl(rawPurchaseUrl) : null;
    const image = rawImageUrl ? imageUrl(rawImageUrl) : null;
    if (rawPurchaseUrl && !purchase) throw new Error(`Enlace de Empretienda inválido en fila ${index + 2}: ${sourceTitle}.`);
    if (rawImageUrl && !image) throw new Error(`IMAGEN_URL inválida en fila ${index + 2}: ${sourceTitle}.`);
    const identity = [sourceTitle, origin ?? '', label ?? ''].map(normalizeText).join('\u001f');
    const id = createHash('sha256').update(identity).digest('hex').slice(0, 16);
    // Compare every commercial source column, not just the fields displayed online.
    const signature = JSON.stringify(row.map(value => value.trim()));
    if (identities.has(id)) {
      if (identities.get(id) === signature) continue;
      throw new Error(`Identidad duplicada con datos diferentes en fila ${index + 2}: ${sourceTitle}.`);
    }
    identities.set(id, signature);
    products.push({ id, sourceTitle, artist: null, album: null, format: null, priceCashArs: price, priceCardOneArs, installment3Ars, stockStatus: stockNumber === null ? 'unknown' : stockNumber > 0 ? 'listed' : 'out', stockRaw, origin, label, coverKey: null, featuredOrder: null, isPresale, purchaseUrl: correctPurchaseUrl({ sourceTitle, origin, label }, purchase), imageUrl: image });
  }
  if (!products.length) throw new Error('El CSV no contiene productos. Se conserva el catálogo anterior.');
  products.sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle, 'es-AR'));
  return { schemaVersion: 4, syncedAt, products };
}

export async function fetchCsv(url: string, options: { timeoutMs?: number; retries?: number; fetcher?: typeof fetch; delay?: (ms: number) => Promise<void> } = {}): Promise<string> {
  const { timeoutMs = 15000, retries = 2, fetcher = fetch, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'text/csv' } });
      if (!response.ok) {
        const error = new Error(`Google Sheets respondió HTTP ${response.status}.`);
        if (response.status < 500 && response.status !== 429) throw Object.assign(error, { permanent: true });
        throw error;
      }
      return await response.text();
    } catch (error) {
      if (attempt >= retries || (error as { permanent?: boolean }).permanent) throw error;
      await delay(500 * 2 ** attempt);
    }
  }
}
