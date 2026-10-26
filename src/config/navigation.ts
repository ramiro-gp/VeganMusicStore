import { presaleProducts } from '../lib/catalog-data';
import { routes, siteVariant } from './variant';

const hasPresale = presaleProducts.length > 0;

export const sectionNavigation = [
  { href: '/', label: 'Inicio' },
  {
    href: siteVariant === 'v2' ? routes.catalog : hasPresale ? '/#preventa' : '/#record-slider-home-title',
    label: hasPresale ? 'Preventa' : 'Destacados',
  },
  { href: routes.records, label: 'Vegan Records' },
  { href: routes.import, label: 'Importación' },
  { href: routes.about, label: 'Nosotros' },
  { href: routes.contact, label: 'Contacto' },
] as const;
