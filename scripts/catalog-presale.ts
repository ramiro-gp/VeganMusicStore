import type { CatalogItem, CatalogSnapshot } from '../src/types/catalog.ts';
import { normalizeText } from '../src/lib/catalog.ts';
import { imageUrl, purchaseUrl } from '../src/lib/product-links.ts';

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

function decodeAttribute(value: string): string {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#(\d+)|#x([\da-f]+));/gi, (entity, decimal, hex) => {
    if (decimal || hex) {
      const point = Number.parseInt(decimal || hex, decimal ? 10 : 16);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' } as Record<string, string>)[entity.toLowerCase()] ?? entity;
  });
}

export function productImage(html: string, pageUrl: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = new Map([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(match => [match[1].toLowerCase(), decodeAttribute(match[2] ?? match[3] ?? match[4])]));
    if (attributes.get('property')?.toLowerCase() !== 'og:image') continue;
    const content = attributes.get('content');
    const url = content ? imageUrl(new URL(content, pageUrl).href) : null;
    if (url) return url;
  }
  throw new Error('La página no informa una imagen HTTPS válida.');
}

export interface PresaleImageOptions { fetcher?: typeof fetch; warn?: (message: string) => void }

export async function resolvePresaleImages(snapshot: CatalogSnapshot, previous?: CatalogSnapshot, options: PresaleImageOptions = {}): Promise<void> {
  const { fetcher = fetch, warn = console.warn } = options;
  for (const item of snapshot.products.filter(item => item.isPresale)) {
    if (!item.purchaseUrl) throw new Error(`Preventa sin enlace de compra: ${item.sourceTitle}.`);
    if (item.imageUrl) continue;
    try {
      // Do not follow redirects to arbitrary hosts while resolving product metadata.
      let url = item.purchaseUrl;
      let response: Response | undefined;
      for (let redirects = 0; redirects <= 3; redirects++) {
        response = await fetcher(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'text/html' }, redirect: 'manual' });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        const next = location ? purchaseUrl(new URL(location, url).href) : null;
        if (!next) throw new Error('Redirección fuera de Empretienda.');
        url = next;
      }
      if (!response?.ok) throw new Error(`Empretienda respondió HTTP ${response?.status}.`);
      item.imageUrl = productImage(await response.text(), url);
    } catch (error) {
      const cached = previous?.products.find(old => old.id === item.id && old.purchaseUrl === item.purchaseUrl);
      if (!cached?.imageUrl) throw new Error(`No se pudo resolver la imagen de ${item.sourceTitle}: ${(error as Error).message}`);
      item.imageUrl = cached.imageUrl;
      warn(`${item.sourceTitle}: se conserva la imagen anterior. ${(error as Error).message}`);
    }
  }
}
