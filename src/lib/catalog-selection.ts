import type { CatalogItem } from '../types/catalog.ts';
import { normalizeText } from './catalog.ts';
import { isOnRequest, stockLimit } from './cart.ts';

const fallbackTitles = ['Babasonicos Jessico', 'Bad Brains Into The Future', 'Virus Superficies De Placer', 'Nirvana Greatest Hits', 'Airbag Blanco y Negro', 'The Beatles Please Please Me', 'Astor Piazzolla Adios Nonino', 'Bad Brains Live at CBGB 1982'];

export function canAddToCart(item: CatalogItem): boolean {
  return !item.purchaseUrl && (isOnRequest(item) || stockLimit(item) > 0 && item.priceCashArs !== null && item.priceCashArs > 0);
}

export function selectShowcase(products: readonly CatalogItem[], context: 'home' | 'cart' = 'home'): { mode: 'presale' | 'featured' | 'fallback'; items: CatalogItem[] } {
  const alphabetical = (items: CatalogItem[]) => items.sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle, 'es-AR'));
  const presales = products.filter(item => item.isPresale);
  if (context === 'cart' && presales.length) return { mode: 'presale', items: alphabetical(presales) };
  const regularProducts = products.filter(item => !item.isPresale);
  const featured = regularProducts.filter(item => item.imageUrl !== null);
  if (featured.length) return { mode: 'featured', items: alphabetical(featured) };
  return {
    mode: 'fallback',
    items: fallbackTitles.flatMap(title => {
      const item = regularProducts.find(item => normalizeText(item.sourceTitle) === normalizeText(title));
      return item && (item.purchaseUrl || canAddToCart(item)) ? [item] : [];
    }),
  };
}
