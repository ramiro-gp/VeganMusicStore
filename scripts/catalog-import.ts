import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import type { CatalogItem, CatalogSnapshot } from '../src/types/catalog.ts';
import { normalizeText } from '../src/lib/catalog.ts';

const required = ['Banda / Titulo', 'PRECIO EFT/TRAN', 'STOCK', 'ORIGEN', 'SELLO'];

function parseInstallment(raw: string, row: number, title: string): number | null {
  if (!raw) return null;
  const match = raw.match(/^\$?\s*(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/);
  if (!match) throw new Error(`Valor de cuota inválido en fila ${row}: ${title}.`);
  const price = Number(`${match[1].replace(/\./g, '')}${match[2] ? `.${match[2]}` : ''}`);
  if (!Number.isFinite(price)) throw new Error(`Valor de cuota fuera de rango en fila ${row}: ${title}.`);
  return price;
}

export function importCatalog(csv: string, syncedAt = new Date().toISOString()): CatalogSnapshot {
  if (!csv.trim() || /^\s*</.test(csv)) throw new Error('La fuente no devolvió un CSV: archivo vacío o HTML de Google.');
  let headers: string[] = [];
  const rows = parse(csv, { bom: true, skip_empty_lines: true, columns: (columns: string[]) => { headers = columns.map(h => h.trim()); return headers; }, relax_column_count: false }) as Record<string, string>[];
  const missing = required.filter(column => !headers.includes(column));
  if (missing.length) throw new Error(`Faltan columnas: ${missing.join(', ')}.`);
  const products: CatalogItem[] = [];
  const identities = new Map<string, string>();
  for (const [index, row] of rows.entries()) {
    const sourceTitle = (row['Banda / Titulo'] ?? '').trim().replace(/\s+/g, ' ');
    if (!sourceTitle) continue;
    const rawPrice = row['PRECIO EFT/TRAN']?.trim() ?? '';
    if (rawPrice && !/^\d+(?:[.,]\d{1,2})?$/.test(rawPrice)) throw new Error(`Precio inválido en fila ${index + 2}: ${sourceTitle}.`);
    const price = rawPrice ? Number(rawPrice.replace(',', '.')) : null;
    if (price !== null && !Number.isFinite(price)) throw new Error(`Precio fuera de rango en fila ${index + 2}: ${sourceTitle}.`);
    const installment3Ars = parseInstallment((row['Valor cuota'] ?? '').trim(), index + 2, sourceTitle);
    const stockRaw = row.STOCK?.trim() ?? '';
    const stockNumber = /^\d+\+?$/.test(stockRaw) ? Number.parseInt(stockRaw, 10) : null;
    const origin = row.ORIGEN?.trim() || null;
    const label = row.SELLO?.trim() || null;
    const identity = [sourceTitle, origin ?? '', label ?? ''].map(normalizeText).join('\u001f');
    const id = createHash('sha256').update(identity).digest('hex').slice(0, 16);
    // Compare every commercial source column, not just the fields displayed online.
    const signature = JSON.stringify(headers.map(header => (row[header] ?? '').trim()));
    if (identities.has(id)) {
      if (identities.get(id) === signature) continue;
      throw new Error(`Identidad duplicada con datos diferentes en fila ${index + 2}: ${sourceTitle}.`);
    }
    identities.set(id, signature);
    products.push({ id, sourceTitle, artist: null, album: null, format: null, priceCashArs: price, installment3Ars, stockStatus: stockNumber === null ? 'unknown' : stockNumber > 0 ? 'listed' : 'out', stockRaw, origin, label, coverKey: null, featuredOrder: null });
  }
  if (!products.length) throw new Error('El CSV no contiene productos. Se conserva el catálogo anterior.');
  products.sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle, 'es-AR'));
  return { schemaVersion: 2, syncedAt, products };
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
