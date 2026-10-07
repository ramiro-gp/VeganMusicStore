import { siteConfig } from '../config/site.ts';
import type { CatalogItem } from '../types/catalog.ts';

export function whatsappUrl(message: string, number: string | null = siteConfig.contact.whatsappNumber): string | null {
  if (number === null) return null;
  if (!/^[1-9]\d{7,14}$/.test(number)) throw new Error('WhatsApp debe contener sólo dígitos y código internacional.');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productMessage(item: Pick<CatalogItem, 'sourceTitle' | 'priceCashArs'>): string {
  const price = item.priceCashArs === null ? '' : ` Vi el precio de lista de ${formatPrice(item.priceCashArs)} en efectivo/transferencia.`;
  return `Hola Vegan Store Music, estoy buscando ${item.sourceTitle}.${price} ¿Me confirman la edición, el stock y el precio?`;
}

export function formatPrice(price: number | null): string {
  return price === null ? 'Consultar precio' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price);
}
