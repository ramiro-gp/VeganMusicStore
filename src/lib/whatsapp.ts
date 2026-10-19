import { siteConfig } from '../config/site.ts';
import type { CatalogItem } from '../types/catalog.ts';

export function normalizeWhatsappNumber(number: string): string {
  const value = number.normalize('NFKC').trim();
  // Strip only known phone formatting, after rejecting letters, extensions and URLs.
  if (!/^\+?[\d\s().\-\u2010-\u2015]+$/.test(value)) throw new Error('WhatsApp debe contener sólo dígitos y código internacional, con separadores de teléfono opcionales.');
  const digits = value.replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error('WhatsApp debe contener entre 8 y 15 dígitos, con código internacional y sin ceros iniciales.');
  return digits;
}

export function normalizeWhatsappMessage(message: string): string {
  return message.normalize('NFC').replace(/\r\n?/g, '\n')
    .replace(/[\u00a0\u202f\t]/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\ufeff]/g, '').trim();
}

export function whatsappUrl(message: string, number: string | null = siteConfig.contact.whatsappNumber): string | null {
  if (number === null) return null;
  return `https://wa.me/${normalizeWhatsappNumber(number)}?text=${encodeURIComponent(normalizeWhatsappMessage(message))}`;
}

export function productMessage(item: Pick<CatalogItem, 'sourceTitle' | 'priceCashArs'> & Partial<Pick<CatalogItem, 'stockStatus'>>): string {
  if (item.stockStatus === 'out') return normalizeWhatsappMessage(`Hola Vegan Music Store, me interesa ${item.sourceTitle}. Figura sin stock. ¿Se puede conseguir a pedido? Quisiera consultar el costo y la disponibilidad.`);
  const price = item.priceCashArs === null ? '' : ` Vi el precio de lista de ${formatPrice(item.priceCashArs)} en efectivo/transferencia.`;
  return normalizeWhatsappMessage(`Hola Vegan Music Store, estoy buscando ${item.sourceTitle}.${price} ¿Me confirman la edición, el stock y el precio?`);
}

export function formatPrice(price: number | null): string {
  return price === null ? 'Consultar precio' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price);
}
