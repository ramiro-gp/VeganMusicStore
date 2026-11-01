import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { importCatalog } from '../scripts/catalog-import.ts';
import { validatePresales } from '../scripts/catalog-presale.ts';
import { promoteCatalog, sameCatalog } from '../scripts/catalog-sync.ts';
import { assertSnapshot, parseSnapshot } from '../src/lib/catalog.ts';
import { purchaseUrl } from '../src/lib/product-links.ts';
import { buildCartMessage, reconcileCart, summarizeCart, type CartState } from '../src/lib/cart.ts';

const modelo = 'https://veganrecords.empretienda.com.ar/general/vinilos/preventa/demonios-de-tasmania-modelo-96-vinilo-blanco';
const sexcalextric = 'https://veganrecords.empretienda.com.ar/general/vinilos/demonios-de-tasmania-sexcalextric-vinilo-violeta';
const picture = 'https://images.example.com/disco.jpg';
const csv = (options: { title?: string; url?: string; image?: string; presale?: string; note?: string; origin?: string; label?: string } = {}) => {
  const headers = ['Banda / Titulo', 'PRECIO EFT/TRAN', 'TARJETA 1 PAGO', 'TARJETA 3 PAGOS', 'Valor cuota', 'STOCK', 'ORIGEN', 'SELLO', 'En todos los casos', '', '', '', '', '', '', '', 'IMAGEN_URL'];
  const row = [options.title ?? 'Demonios de Tasmania Sexcalextric Lp violeta', '65000', '72800', '80080', '$ 26.693', '10', options.origin ?? 'EUROPA', options.label ?? 'VEGAN RECORDS', options.presale ?? 'PREVENTA', '', options.note ?? '', '', '', '', options.image ?? picture, options.url ?? modelo, 'https://images.example.com/ignorada.jpg'];
  return [headers, row].map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
};

test('lee I, O y P por posición aunque haya encabezados vacíos repetidos y más columnas después de P', () => {
  const item = importCatalog(csv({ image: picture })).products[0];
  assert.equal(item.isPresale, true);
  assert.equal(item.purchaseUrl, sexcalextric);
  assert.equal(item.imageUrl, picture);
  assert.equal(item.priceCashArs, 65000);
  assert.equal(item.installment3Ars, 26693);
  const unmarked = importCatalog(csv({ presale: '', url: '' })).products[0];
  assert.equal(unmarked.isPresale, false);
  assert.equal(unmarked.purchaseUrl, null);
});

test('los duplicados comparan también columnas sin nombre, no sólo el último encabezado vacío', () => {
  const source = csv({ note: 'primera' });
  const second = csv({ note: 'segunda' }).split('\n')[1];
  assert.throws(() => importCatalog(`${source}\n${second}`), /datos diferentes/);
});

test('corrige sólo las dos identidades y URLs erróneas verificadas; respeta URLs nuevas o corregidas', () => {
  assert.equal(importCatalog(csv()).products[0].purchaseUrl, sexcalextric);
  assert.equal(importCatalog(csv({ title: 'Demonios de Tasmania Modelo 96 Lp blanco', url: sexcalextric })).products[0].purchaseUrl, modelo);
  assert.equal(importCatalog(csv({ url: sexcalextric })).products[0].purchaseUrl, sexcalextric);
  const next = 'https://veganrecords.empretienda.com.ar/nueva-edicion';
  assert.equal(importCatalog(csv({ url: next })).products[0].purchaseUrl, next);
  assert.equal(importCatalog(csv({ label: 'OTRO SELLO' })).products[0].purchaseUrl, modelo);
  assert.equal(importCatalog(csv({ title: 'Otro disco' })).products[0].purchaseUrl, modelo);
});

test('rechaza enlaces ejecutables, HTTP, credenciales y hosts que imitan Empretienda', () => {
  for (const url of ['javascript:alert(1)', 'http://veganrecords.empretienda.com.ar/disco', 'https://veganrecords.empretienda.com.ar.evil.test/', 'https://user:password@veganrecords.empretienda.com.ar/', 'https://example.com/']) {
    assert.equal(purchaseUrl(url), null);
    assert.throws(() => importCatalog(csv({ url })), /Enlace de Empretienda inválido/);
  }
  assert.throws(() => importCatalog(csv({ image: 'javascript:alert(1)' })), /Imagen inválida en columna O/);
});

test('exige imagen en O y enlace en P para cada preventa, sin fallback de metadatos', () => {
  const snapshot = importCatalog(csv());
  validatePresales(snapshot);
  assert.equal(snapshot.products[0].imageUrl, picture);
  assert.throws(() => importCatalog(csv({ image: '' })), /sin imagen en columna O/);
  assert.throws(() => importCatalog(csv({ url: '' })), /sin enlace de compra en columna P/);
  const ordinary = importCatalog(csv({ presale: '', url: '', image: '' }));
  assert.equal(ordinary.products[0].imageUrl, null, 'IMAGEN_URL fuera de O no destaca ni repone imágenes');
});

test('la excepción temporal omite preventas incompletas con advertencia; corregirlas las reincorpora', () => {
  const good = csv({ title: 'Completo' });
  const incomplete = csv({ title: 'Incompleto', image: '', url: '' }).split('\n')[1];
  const warnings: string[] = [];
  const snapshot = importCatalog(`${good}\n${incomplete}`, undefined, { quarantineIncomplete: true, warn: message => warnings.push(message) });
  assert.equal(snapshot.products.length, 1);
  assert.equal(snapshot.products[0].sourceTitle, 'Completo');
  assert.match(warnings[0], /Preventa omitida.*fila 3.*Incompleto/);
  const corrected = importCatalog(`${good}\n${csv({ title: 'Incompleto' }).split('\n')[1]}`);
  assert.equal(corrected.products.length, 2);
});

test('migra snapshots anteriores sin cambiar IDs, precios, stock ni fecha', () => {
  const current = importCatalog(csv({ image: picture }));
  const legacy = { ...current, schemaVersion: 3, products: current.products.map(({ isPresale, purchaseUrl, imageUrl, ...item }) => item) };
  const migrated = parseSnapshot(legacy);
  assertSnapshot(migrated);
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.syncedAt, current.syncedAt);
  assert.equal(migrated.products[0].id, current.products[0].id);
  assert.equal(migrated.products[0].priceCashArs, 65000);
  assert.equal(migrated.products[0].isPresale, false);
  assert.equal(migrated.products[0].purchaseUrl, null);
});

test('detecta cambios en marca, destino e imagen sin modificar la identidad del producto', () => {
  const base = importCatalog(csv({ image: picture }));
  for (const source of [csv({ image: 'https://images.example.com/otra.jpg' }), csv({ image: picture, presale: '' }), csv({ image: picture, url: 'https://veganrecords.empretienda.com.ar/nuevo' })]) {
    const changed = importCatalog(source);
    assert.equal(base.products[0].id, changed.products[0].id);
    assert.equal(sameCatalog(base, changed), false);
  }
});

test('sin cambios conserva bytes; una preventa incompleta conserva el snapshot publicado', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vegan-presale-'));
  const target = join(directory, 'snapshot.json');
  const candidate = join(directory, 'candidate.json');
  const previous = importCatalog(csv(), '2026-10-22T12:00:00.000Z');
  const bytes = JSON.stringify(previous, null, 4) + '\n';
  try {
    await writeFile(target, bytes);
    const result = await promoteCatalog(csv(), target, candidate, async () => assert.fail('No debe construir sin cambios'));
    assert.equal(result.changed, false);
    assert.equal(await readFile(target, 'utf8'), bytes);
    for (const options of [{ image: '' }, { url: '' }]) {
      await assert.rejects(promoteCatalog(csv(options), target, candidate), /Preventa sin/);
      assert.equal(await readFile(target, 'utf8'), bytes);
    }
    const inactive = await promoteCatalog(csv({ presale: '', image: '' }), target, candidate);
    assert.equal(inactive.changed, true);
    assert.equal(inactive.snapshot.products.filter(item => item.isPresale).length, 0);
    assert.equal(inactive.snapshot.products[0].imageUrl, null, 'borrar O quita la imagen anterior');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('los externos guardados no totalizan ni se envían por WhatsApp, con o sin otros discos', () => {
  const external = importCatalog(csv({ image: picture })).products[0];
  const ordinary = { ...external, id: 'ordinary', sourceTitle: 'Otro disco', purchaseUrl: null, priceCashArs: 100 };
  for (const kind of [undefined, 'request'] as const) {
    const state: CartState = { schemaVersion: 1, lines: [{ productId: external.id, quantity: 2, kind }], paymentMethod: 'cash-transfer', catalogSyncedAt: '2026-10-22T12:00:00.000Z' };
    const reconciled = reconcileCart(state, [external, ordinary], state.catalogSyncedAt);
    assert.match(reconciled.notices.join(' '), /Empretienda/);
    assert.equal(reconciled.state.lines.length, 1, 'preserva la selección hasta que el cliente quite el externo');
    const only = summarizeCart(state, [external]);
    assert.equal(only.totalCents, 0);
    assert.equal(only.canSend, false);
    assert.equal(only.requestedUnits, 0);
    assert.match(only.lines[0].error!, /Empretienda/);
    state.lines.push({ productId: ordinary.id, quantity: 1 });
    const mixed = summarizeCart(state, [external, ordinary]);
    assert.equal(mixed.totalCents, 10000);
    assert.equal(mixed.canSend, false);
    assert.throws(() => buildCartMessage(state, [external, ordinary]), /Revisá/);
    state.lines.shift();
    assert.equal(summarizeCart(state, [external, ordinary]).canSend, true);
  }
});
