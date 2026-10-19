import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCartMessage, originCategory, parseCart, paymentLabels, reconcileCart, stockLimit, summarizeCart } from '../src/lib/cart.ts';
import type { CartProduct, CartState, PaymentMethod } from '../src/lib/cart.ts';
import { normalizeWhatsappMessage, whatsappUrl } from '../src/lib/whatsapp.ts';

const syncedAt = '2026-10-17T20:00:00.000Z';
const product = (extra: Partial<CartProduct> = {}): CartProduct => ({ id: 'first', sourceTitle: 'Björk — Álbum & edición especial', priceCashArs: 100.05, priceCardOneArs: 125.5, installment3Ars: 50.33, stockStatus: 'listed', stockRaw: '10+', ...extra });
const state = (method: PaymentMethod = 'cash-transfer'): CartState => ({ schemaVersion: 1, lines: [{ productId: 'first', quantity: 2 }, { productId: 'second', quantity: 1 }], paymentMethod: method, catalogSyncedAt: syncedAt });
const products = [product(), product({ id: 'second', sourceTitle: 'Otro disco', priceCashArs: 20.1, priceCardOneArs: 30, installment3Ars: 10.01, stockRaw: '1' })];

test('calcula los tres medios en centavos y las tres cuotas desde Valor cuota', () => {
  const cash = summarizeCart(state(), products);
  assert.equal(cash.totalCents, 22020);
  assert.equal(cash.installmentCents, null);
  assert.equal(cash.canSend, true);
  assert.deepEqual(cash.availableMethods, { 'cash-transfer': true, 'card-one': true, 'card-three': true });
  const card = summarizeCart(state('card-one'), products);
  assert.equal(card.totalCents, 28100);
  const three = summarizeCart(state('card-three'), products);
  assert.equal(three.installmentCents, 11067);
  assert.equal(three.totalCents, 33201);
  assert.equal(three.totalCents, three.installmentCents! * 3);
  assert.equal(three.lines[0].unitCents, 15099);
});

test('normaliza al centavo antes de multiplicar y evita error binario', () => {
  const cart = { ...state(), lines: [{ productId: 'first', quantity: 3 }] };
  const result = summarizeCart(cart, [product({ priceCashArs: 1.005 })]);
  assert.equal(result.lines[0].unitCents, 101);
  assert.equal(result.totalCents, 303);
});

test('stock exacto, una unidad y 10+ limitan cantidades; stock desconocido no se puede comprar', () => {
  assert.equal(stockLimit(product({ stockRaw: '1' })), 1);
  assert.equal(stockLimit(product({ stockRaw: '5' })), 5);
  assert.equal(stockLimit(product()), 10);
  for (const raw of ['0', '?', '', '-1', '1.5', '20+', '999999999999999999']) assert.equal(stockLimit(product({ stockRaw: raw })), 0);
  assert.equal(stockLimit(product({ stockStatus: 'out', stockRaw: '10+' })), 0);
  const invalid = summarizeCart({ ...state(), lines: [{ productId: 'second', quantity: 2 }] }, products);
  assert.equal(invalid.canSend, false);
  assert.match(invalid.lines[0].error!, /entre 1 y 1/);
});

test('medios incompletos se deshabilitan y precio base cero, ausente o stock desconocido bloquean la compra con precio', () => {
  const cardMissing = [product({ priceCardOneArs: null }), products[1]];
  assert.equal(summarizeCart(state(), cardMissing).availableMethods['card-one'], false);
  assert.equal(summarizeCart(state('card-one'), cardMissing).canSend, false);
  assert.equal(summarizeCart(state('card-three'), [product({ installment3Ars: null }), products[1]]).canSend, false);
  for (const bad of [product({ priceCashArs: null }), product({ priceCashArs: 0 }), product({ stockRaw: '?', stockStatus: 'unknown' })]) {
    const result = summarizeCart(state('card-one'), [bad, products[1]]);
    assert.equal(result.canSend, false);
    assert.deepEqual(result.availableMethods, { 'cash-transfer': false, 'card-one': false, 'card-three': false });
  }
  assert.equal(summarizeCart({ ...state(), lines: [] }, products).canSend, false);
});

test('un pedido mixto excluye precios históricos de los títulos agotados para los tres medios', () => {
  const current = [product(), product({ ...products[1], stockStatus: 'out', stockRaw: '0', priceCashArs: 99999, priceCardOneArs: null, installment3Ars: null })];
  for (const method of ['cash-transfer', 'card-one', 'card-three'] as const) {
    const summary = summarizeCart(state(method), current);
    const stockOnly = summarizeCart({ ...state(method), lines: [state().lines[0]] }, current);
    assert.equal(summary.canSend, true);
    assert.equal(summary.totalCents, stockOnly.totalCents);
    assert.equal(summary.installmentCents, stockOnly.installmentCents);
    assert.equal(summary.lines[1].onRequest, true);
    assert.equal(summary.lines[1].subtotalCents, null);
    assert.equal(summary.requestedUnits, 1);
    const message = buildCartMessage(state(method), current);
    assert.match(message, /CON STOCK EN LISTA[\s\S]*Total con stock:[\s\S]*A PEDIDO — COSTO A CONSULTAR/);
    assert.match(message, /• 1 × Otro disco — Costo a consultar/);
    assert.doesNotMatch(message, /99.999/);
    assert.equal(new URL(whatsappUrl(message)!).searchParams.get('text'), message);
  }
});

test('una consulta exclusivamente a pedido se puede enviar sin precio, medio de pago ni total cero', () => {
  const requested = product({ stockStatus: 'out', stockRaw: '0', priceCashArs: null, priceCardOneArs: null, installment3Ars: null });
  const cart: CartState = { ...state('card-three'), lines: [{ productId: 'first', quantity: 2, kind: 'request' }] };
  const summary = summarizeCart(cart, [requested]);
  assert.equal(summary.canSend, true);
  assert.equal(summary.hasPricedItems, false);
  assert.equal(summary.totalCents, 0);
  assert.equal(summary.installmentCents, null);
  const message = buildCartMessage(cart, [requested]);
  assert.match(message, /2 × Björk — Álbum & edición especial — Costo a consultar/);
  assert.doesNotMatch(message, /Medio de pago:|Total:|cuotas|\$/);
  assert.deepEqual(parseCart(JSON.stringify(cart), syncedAt).lines, cart.lines);
  assert.equal(summarizeCart(cart, []).canSend, false);
});

test('al agotarse un disco pasa a pedido y al volver el stock recupera precio y límite con aviso', () => {
  const cart: CartState = { ...state(), lines: [{ productId: 'first', quantity: 2 }] };
  const exhausted = [product({ stockStatus: 'out', stockRaw: '0' })];
  const moved = reconcileCart(cart, exhausted, syncedAt);
  assert.equal(moved.state.lines[0].kind, 'request');
  assert.equal(moved.notices.length, 1);
  assert.equal(summarizeCart(moved.state, exhausted).canSend, true);
  assert.equal(reconcileCart(moved.state, exhausted, syncedAt).notices.length, 0);
  const restocked = reconcileCart(moved.state, [product({ stockRaw: '1', priceCashArs: 200 })], syncedAt);
  assert.deepEqual(restocked.state.lines, [{ productId: 'first', quantity: 1 }]);
  assert.equal(restocked.notices.length, 2);
  assert.equal(summarizeCart(restocked.state, [product({ stockRaw: '1', priceCashArs: 200 })]).totalCents, 20000);
});

test('recupera almacenamiento corrupto, conserva IDs retirados y combina duplicados seguros', () => {
  for (const raw of [null, '', '{', 'null', '[]', '{"schemaVersion":2,"lines":[]}']) assert.deepEqual(parseCart(raw, syncedAt).lines, []);
  const saved = parseCart(JSON.stringify({ schemaVersion: 1, paymentMethod: 'invalid', catalogSyncedAt: 'invalid', lines: [{ productId: 'missing', quantity: 1 }, { productId: 'first', quantity: 2 }, { productId: 'first', quantity: 3 }, { productId: '', quantity: 1 }, { productId: 'bad', quantity: 1.2 }, null] }), syncedAt);
  assert.deepEqual(saved.lines, [{ productId: 'missing', quantity: 1 }, { productId: 'first', quantity: 5 }]);
  assert.equal(saved.paymentMethod, 'cash-transfer');
  assert.equal(saved.catalogSyncedAt, syncedAt);
  assert.equal(summarizeCart(saved, products).canSend, false);
});

test('reconciliación actualiza fecha y precios, ajusta stock y conserva productos inválidos para quitarlos', () => {
  const previous = { ...state(), catalogSyncedAt: '2026-10-14T12:00:00.000Z', lines: [{ productId: 'first', quantity: 8 }, { productId: 'second', quantity: 1 }, { productId: 'missing', quantity: 1 }] };
  const current = [product({ stockRaw: '1', priceCashArs: 240 }), product({ ...products[1], stockStatus: 'out', stockRaw: '0' })];
  const result = reconcileCart(previous, current, syncedAt);
  assert.equal(result.state.catalogSyncedAt, syncedAt);
  assert.equal(result.state.lines[0].quantity, 1);
  assert.equal(result.state.lines.length, 3);
  assert.equal(result.notices.length, 4);
  assert.equal(summarizeCart(result.state, current).lines[0].unitCents, 24000);
  assert.equal(summarizeCart(result.state, current).canSend, false);
  assert.equal(previous.lines[0].quantity, 8);
  assert.equal(previous.catalogSyncedAt, '2026-10-14T12:00:00.000Z');
});

test('clasifica origen de la edición sin convertir origen ausente en internacional', () => {
  assert.equal(originCategory(' ARGENTINA '), 'national');
  assert.equal(originCategory('argentina'), 'national');
  assert.equal(originCategory('USA'), 'international');
  assert.equal(originCategory(null), 'unknown');
  assert.equal(originCategory('  '), 'unknown');
});

test('mensaje completo coincide con resumen para cada medio y conserva acentos y caracteres especiales', () => {
  const format = (cents: number) => normalizeWhatsappMessage(new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cents / 100));
  for (const method of ['cash-transfer', 'card-one', 'card-three'] as const) {
    const cart = state(method);
    const summary = summarizeCart(cart, products);
    const message = buildCartMessage(cart, products);
    assert.ok(message.includes(`Total: ${format(summary.totalCents)}`));
    assert.ok(message.includes(paymentLabels[method]));
    assert.ok(message.includes('2 × Björk — Álbum & edición especial'));
    for (const line of summary.lines) {
      const expected = line.quantity === 1 ? `• 1 × ${line.product!.sourceTitle} — ${format(line.subtotalCents!)}` : `Subtotal: ${format(line.subtotalCents!)}`;
      assert.ok(message.includes(expected));
    }
    if (summary.installmentCents !== null) assert.ok(message.includes(`3 cuotas de ${format(summary.installmentCents)}`));
    const url = new URL(whatsappUrl(message)!);
    assert.equal(url.pathname, '/5491158974298');
    assert.equal(url.searchParams.get('text'), message);
    assert.doesNotMatch(message, /[\u00a0\u202f\u0000]/);
    assert.match(message, /stock y el precio/);
    assert.match(message, /coordinar/);
  }
  assert.throws(() => buildCartMessage({ ...state(), lines: [{ productId: 'missing', quantity: 1 }] }, products), /Revisá/);
});

test('una unidad muestra un único precio por título; varias unidades mantienen precio unitario y subtotal', () => {
  const one = { ...state(), lines: [{ productId: 'first', quantity: 1 }] };
  const oneMessage = buildCartMessage(one, products);
  const oneLine = oneMessage.split('\n').find(line => line.startsWith('•'))!;
  assert.equal(oneLine, '• 1 × Björk — Álbum & edición especial — $ 100,05');
  assert.doesNotMatch(oneLine, /c\/u|Subtotal/);
  const manyMessage = buildCartMessage({ ...one, lines: [{ productId: 'first', quantity: 2 }] }, products);
  assert.ok(manyMessage.includes('$ 100,05 c/u — Subtotal: $ 200,1'));
});
