import { products } from './catalog-data';
import { siteVariant } from '../config/variant';

export function catalogSchema(origin: URL, withBreadcrumb = siteVariant === 'v1'): unknown[] {
  const url = new URL(siteVariant === 'v2' ? '/' : '/catalogo/', origin).href;
  const schema: unknown[] = [{
    '@type': 'CollectionPage', '@id': `${url}#pagina`, name: 'Catálogo de discos y vinilos', url,
    mainEntity: {
      '@type': 'ItemList', numberOfItems: products.length,
      itemListElement: products.map((item, index) => ({
        '@type': 'ListItem', position: index + 1,
        item: {
          '@type': 'Product', '@id': `${url}#disco-${item.id}`, url: `${url}#disco-${item.id}`, name: item.sourceTitle,
          ...(item.imageUrl ? { image: item.imageUrl } : {}),
          ...(item.stockStatus !== 'out' && item.priceCashArs !== null && item.priceCashArs > 0 ? { offers: {
            '@type': 'Offer', price: item.priceCashArs, priceCurrency: 'ARS',
            description: 'Precio en efectivo o transferencia. Confirmar stock y precio.',
            ...(item.purchaseUrl ? { url: item.purchaseUrl, ...(item.isPresale ? { availability: 'https://schema.org/PreOrder' } : {}) } : {}),
            seller: item.purchaseUrl ? { '@type': 'Organization', name: 'Vegan Records', url: new URL(item.purchaseUrl).origin } : { '@id': new URL('/#negocio', origin).href },
          } } : {}),
        },
      })),
    },
  }];
  if (withBreadcrumb) schema.push({
    '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: origin.href },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: url },
    ],
  });
  return schema;
}
