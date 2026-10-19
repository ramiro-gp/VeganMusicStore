const configuredVariant = process.env.SITE_VARIANT ?? 'v1';

if (configuredVariant !== 'v1' && configuredVariant !== 'v2') {
  throw new Error(`SITE_VARIANT debe ser v1 o v2. Valor recibido: ${configuredVariant}`);
}

export const siteVariant: 'v1' | 'v2' = configuredVariant;
export const routes = {
  catalog: siteVariant === 'v2' ? '/#catalogo' : '/catalogo/',
  about: siteVariant === 'v2' ? '/nosotros/' : '/#tienda',
  contact: siteVariant === 'v2' ? '/contacto/' : '/#contacto',
  records: siteVariant === 'v2' ? '/vegan-records/' : '/#vegan-records',
  cart: '/carrito/',
} as const;

export const recordsStoreUrl = 'https://veganrecords.empretienda.com.ar/';
