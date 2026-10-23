import type { CatalogItem } from '../types/catalog.ts';
import { normalizeText } from './catalog.ts';
import { normalizeWhatsappMessage } from './whatsapp.ts';

export type PaymentMethod = 'cash-transfer' | 'card-one' | 'card-three';
export type CartProduct = Pick<CatalogItem, 'id' | 'sourceTitle' | 'priceCashArs' | 'priceCardOneArs' | 'installment3Ars' | 'stockStatus' | 'stockRaw'> & Partial<Pick<CatalogItem, 'purchaseUrl'>>;
export interface CartLine { productId: string; quantity: number; kind?: 'request' }
export interface CartState {
  schemaVersion: 1;
  lines: CartLine[];
  paymentMethod: PaymentMethod;
  catalogSyncedAt: string;
}

export const paymentLabels: Record<PaymentMethod, string> = {
  'cash-transfer': 'Efectivo / transferencia',
  'card-one': 'Tarjeta en un pago',
  'card-three': 'Tarjeta en tres cuotas',
};
const methods = Object.keys(paymentLabels) as PaymentMethod[];
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });

function cents(price: number | null): number | null {
  if (price === null || !Number.isFinite(price) || price <= 0) return null;
  const value = Math.round((price + Number.EPSILON * Math.max(1, Math.abs(price))) * 100);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function unitPrice(product: CartProduct, method: PaymentMethod): number | null {
  if (method === 'cash-transfer') return cents(product.priceCashArs);
  if (method === 'card-one') return cents(product.priceCardOneArs);
  const installment = cents(product.installment3Ars);
  return installment !== null && Number.isSafeInteger(installment * 3) ? installment * 3 : null;
}

export function stockLimit(product: Pick<CartProduct, 'stockStatus' | 'stockRaw'>): number {
  if (product.stockStatus !== 'listed') return 0;
  const raw = product.stockRaw.trim();
  if (raw === '10+') return 10;
  if (!/^\d+$/.test(raw)) return 0;
  const quantity = Number(raw);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0;
}

export const REQUEST_LIMIT = 99;
export function isOnRequest(product: Pick<CartProduct, 'stockStatus' | 'stockRaw'>): boolean {
  return product.stockStatus === 'out' && product.stockRaw.trim() === '0';
}

export function originCategory(origin: string | null): 'national' | 'international' | 'unknown' {
  const normalized = normalizeText(origin ?? '');
  return normalized === '' ? 'unknown' : normalized === 'argentina' ? 'national' : 'international';
}

export function parseCart(raw: string | null, syncedAt: string): CartState {
  const empty: CartState = { schemaVersion: 1, lines: [], paymentMethod: 'cash-transfer', catalogSyncedAt: syncedAt };
  if (!raw) return empty;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return empty;
    const input = value as Partial<CartState>;
    if (input.schemaVersion !== 1 || !Array.isArray(input.lines)) return empty;
    const quantities = new Map<string, number>();
    const requests = new Set<string>();
    for (const line of input.lines) {
      if (!line || typeof line.productId !== 'string' || !line.productId.trim() || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) continue;
      const quantity = (quantities.get(line.productId) ?? 0) + line.quantity;
      if (Number.isSafeInteger(quantity)) quantities.set(line.productId, quantity);
      if (line.kind === 'request') requests.add(line.productId);
    }
    return {
      schemaVersion: 1,
      lines: [...quantities].map(([productId, quantity]) => ({ productId, quantity, ...(requests.has(productId) ? { kind: 'request' as const } : {}) })),
      paymentMethod: methods.includes(input.paymentMethod as PaymentMethod) ? input.paymentMethod as PaymentMethod : 'cash-transfer',
      catalogSyncedAt: typeof input.catalogSyncedAt === 'string' && Number.isFinite(Date.parse(input.catalogSyncedAt)) ? input.catalogSyncedAt : syncedAt,
    };
  } catch { return empty; }
}

export function reconcileCart(state: CartState, products: readonly CartProduct[], syncedAt: string): { state: CartState; notices: string[] } {
  const byId = new Map(products.map(product => [product.id, product]));
  const notices: string[] = [];
  if (state.lines.length && state.catalogSyncedAt !== syncedAt) notices.push('Actualizamos los precios y el stock con el catálogo más reciente. Revisá tu consulta antes de enviarla.');
  const lines = state.lines.map(line => {
    const product = byId.get(line.productId);
    if (!product) {
      notices.push('Un disco ya no figura en el catálogo. Quitalo del carrito para continuar.');
      return { ...line };
    }
    if (product.purchaseUrl) {
      notices.push(`${product.sourceTitle}: ahora se compra en Empretienda. Quitalo del carrito para continuar con la consulta.`);
      return { ...line };
    }
    const limit = stockLimit(product);
    if (isOnRequest(product)) {
      if (line.kind !== 'request') notices.push(`${product.sourceTitle}: pasó a pedido, sin incluir su costo en el total.`);
      if (line.quantity > REQUEST_LIMIT) notices.push(`${product.sourceTitle}: ajustamos la cantidad a ${REQUEST_LIMIT} unidades por consulta.`);
      return { ...line, kind: 'request' as const, quantity: Math.min(REQUEST_LIMIT, line.quantity) };
    }
    if (!limit || cents(product.priceCashArs) === null) {
      notices.push(`${product.sourceTitle}: no tiene stock o precio informado. Quitalo del carrito o consultanos por separado.`);
      return { ...line };
    }
    const { kind, ...stockLine } = line;
    if (kind === 'request') notices.push(`${product.sourceTitle}: vuelve a tener stock. Incorporamos su precio al total; revisá la selección.`);
    if (line.quantity > limit) {
      notices.push(`${product.sourceTitle}: ajustamos la cantidad a ${limit}, según el stock informado.`);
      return { ...stockLine, quantity: limit };
    }
    return stockLine;
  });
  return { state: { ...state, lines, catalogSyncedAt: syncedAt }, notices };
}

export interface CartSummary {
  lines: Array<{ productId: string; product: CartProduct | null; quantity: number; limit: number; onRequest: boolean; unitCents: number | null; subtotalCents: number | null; error: string | null }>;
  totalCents: number;
  installmentCents: number | null;
  availableMethods: Record<PaymentMethod, boolean>;
  canSend: boolean;
  hasPricedItems: boolean;
  requestedUnits: number;
}

export function summarizeCart(state: CartState, products: readonly CartProduct[]): CartSummary {
  const byId = new Map(products.map(product => [product.id, product]));
  const lines = state.lines.map(line => {
    const product = byId.get(line.productId) ?? null;
    const external = Boolean(product?.purchaseUrl);
    const onRequest = !external && product !== null && isOnRequest(product);
    const limit = external ? 0 : onRequest ? REQUEST_LIMIT : product ? stockLimit(product) : 0;
    const unitCents = product && !onRequest && !external ? unitPrice(product, state.paymentMethod) : null;
    const validQuantity = Number.isSafeInteger(line.quantity) && line.quantity > 0;
    const subtotal = unitCents !== null && validQuantity ? unitCents * line.quantity : null;
    const subtotalCents = subtotal !== null && Number.isSafeInteger(subtotal) ? subtotal : null;
    let error: string | null = null;
    if (!product) error = 'Este disco ya no figura en el catálogo.';
    else if (external) error = 'Este disco se compra en Empretienda. Quitalo del carrito para enviar tu consulta.';
    else if (!limit) error = 'Sin stock informado. Quitalo del carrito para continuar.';
    else if (!onRequest && cents(product.priceCashArs) === null) error = 'Sin precio informado. Quitalo del carrito para continuar.';
    else if (!validQuantity || line.quantity > limit) error = `Elegí una cantidad entre 1 y ${limit}.`;
    else if (!onRequest && unitCents === null) error = 'Este disco no tiene precio para el medio de pago elegido.';
    else if (!onRequest && subtotalCents === null) error = 'El importe está fuera de rango.';
    return { ...line, product, limit, onRequest, unitCents, subtotalCents, error };
  });
  const priced = lines.filter(line => !line.onRequest && !line.product?.purchaseUrl);
  const hasPricedItems = priced.length > 0;
  const baseValid = lines.length > 0 && lines.every(line => line.product && line.limit > 0 && (line.onRequest || cents(line.product.priceCashArs) !== null) && Number.isSafeInteger(line.quantity) && line.quantity > 0 && line.quantity <= line.limit);
  const availableMethods = Object.fromEntries(methods.map(method => [method, baseValid && hasPricedItems && priced.every(line => {
    const price = unitPrice(line.product!, method);
    return price !== null && Number.isSafeInteger(price * line.quantity);
  })])) as Record<PaymentMethod, boolean>;
  const totalCents = lines.reduce((sum, line) => sum + (line.subtotalCents ?? 0), 0);
  const installmentCents = state.paymentMethod === 'card-three' && hasPricedItems && priced.every(line => line.product && cents(line.product.installment3Ars) !== null)
    ? priced.reduce((sum, line) => sum + cents(line.product!.installment3Ars)! * line.quantity, 0)
    : null;
  const requestedUnits = lines.filter(line => line.onRequest).reduce((sum, line) => sum + line.quantity, 0);
  const canSend = baseValid && (!hasPricedItems || availableMethods[state.paymentMethod]) && lines.every(line => line.error === null) && Number.isSafeInteger(totalCents) && Number.isSafeInteger(requestedUnits) && (!hasPricedItems || totalCents > 0);
  return { lines, totalCents, installmentCents, availableMethods, canSend, hasPricedItems, requestedUnits };
}

export function buildCartMessage(state: CartState, products: readonly CartProduct[]): string {
  const summary = summarizeCart(state, products);
  if (!summary.canSend) throw new Error('Revisá los productos y el medio de pago antes de enviar la consulta.');
  const lines = summary.lines.filter(line => !line.onRequest).map(line => line.quantity === 1
    ? `• 1 × ${line.product!.sourceTitle} — ${money.format(line.subtotalCents! / 100)}`
    : `• ${line.quantity} × ${line.product!.sourceTitle} — ${money.format(line.unitCents! / 100)} c/u — Subtotal: ${money.format(line.subtotalCents! / 100)}`);
  const requested = summary.lines.filter(line => line.onRequest).map(line => `• ${line.quantity} × ${line.product!.sourceTitle} — Costo a consultar`);
  return normalizeWhatsappMessage([
    'Hola Vegan Store Music, quería consultar por estos discos:',
    ...(summary.hasPricedItems ? ['', 'CON STOCK EN LISTA', ...lines, '',
      `Medio de pago: ${paymentLabels[state.paymentMethod]}.`,
      ...(summary.installmentCents !== null ? [`3 cuotas de ${money.format(summary.installmentCents / 100)}.`] : []),
      `${requested.length ? 'Total con stock' : 'Total'}: ${money.format(summary.totalCents / 100)}.`] : []),
    ...(requested.length ? ['', 'A PEDIDO — COSTO A CONSULTAR', ...requested,
      '¿Se pueden conseguir? Quisiera consultar el costo y la disponibilidad.',
      ...(summary.hasPricedItems ? ['Los títulos a pedido no están incluidos en el total.'] : [])] : []),
    'Envío o retiro a coordinar.',
    '¿Me confirman la edición, el stock y el precio para continuar con la compra?',
  ].join('\n'));
}
