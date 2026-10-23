import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { importCatalog } from '../scripts/catalog-import.ts';
import { productImage, resolvePresaleImages } from '../scripts/catalog-presale.ts';
import { promoteCatalog, sameCatalog } from '../scripts/catalog-sync.ts';
import { assertSnapshot, parseSnapshot } from '../src/lib/catalog.ts';
import { purchaseUrl } from '../src/lib/product-links.ts';
import { buildCartMessage, reconcileCart, summarizeCart, type CartState } from '../src/lib/cart.ts';

const modelo = 'https://veganrecords.empretienda.com.ar/general/vinilos/preventa/demonios-de-tasmania-modelo-96-vinilo-blanco';
const sexcalextric = 'https://veganrecords.empretienda.com.ar/general/vinilos/demonios-de-tasmania-sexcalextric-vinilo-violeta';
const picture = 'https://images.example.com/disco.jpg';
const csv = (options: { title?: string; url?: string; image?: string; presale?: string; note?: string; origin?: string; label?: string } = {}) => {
  const headers = ['Banda / Titulo', 'PRECIO EFT/TRAN', 'TARJETA 1 PAGO', 'TARJETA 3 PAGOS', 'Valor cuota', 'STOCK', 'ORIGEN', 'SELLO', 'En todos los casos', '', '', '', '', '', '', '', 'IMAGEN_URL'];
  const row = [options.title ?? 'Demonios de Tasmania Sexcalextric Lp violeta', '65000', '72800', '80080', '$ 26.693', '10', options.origin ?? 'EUROPA', options.label ?? 'VEGAN RECORDS', options.presale ?? 'PREVENTA', '', options.note ?? '', '', '', '', '', options.url ?? modelo, options.image ?? ''];
  return [headers, row].map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
};
const fetcher = (html = `<meta property="og:image" content="${picture}">`) => (async () => new Response(html)) as typeof fetch;

test('lee I, P e IMAGEN_URL aunque haya encabezados vacíos repetidos y más columnas después de P', () => {
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
  assert.throws(() => importCatalog(csv({ image: 'javascript:alert(1)' })), /IMAGEN_URL inválida/);
});

test('interpreta metadatos con distinto orden, comillas, entidades y URLs relativas', () => {
  assert.equal(productImage('<meta content="https://images.example.com/a.jpg?a=1&amp;b=2" property="og:image" />', modelo), 'https://images.example.com/a.jpg?a=1&b=2');
  assert.equal(productImage("<meta PROPERTY='og:image' content='/producto.jpg'>", modelo), 'https://veganrecords.empretienda.com.ar/producto.jpg');
  assert.throws(() => productImage('<meta property="og:image" content="javascript:alert(1)">', modelo), /imagen HTTPS/);
  assert.throws(() => productImage('<html>Sin imagen</html>', modelo), /imagen HTTPS/);
});

test('resuelve desde la URL corregida y la imagen explícita de Sheets evita cualquier consulta externa', async () => {
  const snapshot = importCatalog(csv());
  let requested = '';
  await resolvePresaleImages(snapshot, undefined, { fetcher: (async (url) => { requested = String(url); return new Response(`<meta property="og:image" content="${picture}">`); }) as typeof fetch });
  assert.equal(requested, sexcalextric);
  assert.equal(snapshot.products[0].imageUrl, picture);
  const explicit = importCatalog(csv({ image: 'https://images.example.com/elegida.jpg' }));
  await resolvePresaleImages(explicit, snapshot, { fetcher: (async () => { throw new Error('No debería consultar'); }) as typeof fetch });
  assert.equal(explicit.products[0].imageUrl, 'https://images.example.com/elegida.jpg');
});

test('un fallo conserva la imagen sólo si coinciden ID y destino; sin caché válida rechaza la preventa', async () => {
  const previous = importCatalog(csv({ image: picture }));
  const failedFetch = (async () => new Response('No disponible', { status: 503 })) as typeof fetch;
  const warnings: string[] = [];
  const current = importCatalog(csv());
  await resolvePresaleImages(current, previous, { fetcher: failedFetch, warn: message => warnings.push(message) });
  assert.equal(current.products[0].imageUrl, picture);
  assert.equal(warnings.length, 1);
  const changedUrl = importCatalog(csv({ url: 'https://veganrecords.empretienda.com.ar/otra-edicion' }));
  await assert.rejects(resolvePresaleImages(changedUrl, previous, { fetcher: failedFetch }), /No se pudo resolver/);
  await assert.rejects(resolvePresaleImages(importCatalog(csv()), undefined, { fetcher: failedFetch }), /No se pudo resolver/);
  await assert.rejects(resolvePresaleImages(importCatalog(csv({ url: '' }))), /sin enlace/);
});

test('no sigue redirecciones fuera de Empretienda ni consulta productos sin marca PREVENTA', async () => {
  let calls = 0;
  const redirect = (async () => { calls++; return new Response(null, { status: 302, headers: { location: 'https://example.com/' } }); }) as typeof fetch;
  await assert.rejects(resolvePresaleImages(importCatalog(csv()), undefined, { fetcher: redirect }), /Redirección fuera/);
  assert.equal(calls, 1);
  await resolvePresaleImages(importCatalog(csv({ presale: '' })), undefined, { fetcher: redirect });
  assert.equal(calls, 1);
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

test('sin cambios conserva bytes y fecha; un fallo inicial de imágenes conserva el snapshot publicado', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vegan-presale-'));
  const target = join(directory, 'snapshot.json');
  const candidate = join(directory, 'candidate.json');
  const previous = importCatalog(csv({ image: picture }), '2026-10-22T12:00:00.000Z');
  const bytes = JSON.stringify(previous, null, 4) + '\n';
  try {
    await writeFile(target, bytes);
    const result = await promoteCatalog(csv(), target, candidate, async () => assert.fail('No debe construir sin cambios'), undefined, { fetcher: fetcher() });
    assert.equal(result.changed, false);
    assert.equal(await readFile(target, 'utf8'), bytes);
    await assert.rejects(promoteCatalog(csv({ url: 'https://veganrecords.empretienda.com.ar/nuevo' }), target, candidate, undefined, undefined, { fetcher: fetcher('<html>Sin imagen</html>') }), /No se pudo resolver/);
    assert.equal(await readFile(target, 'utf8'), bytes);
    const inactive = await promoteCatalog(csv({ presale: '' }), target, candidate, undefined, undefined, { fetcher: (async () => assert.fail('No debe consultar imágenes sin preventa')) as typeof fetch });
    assert.equal(inactive.changed, true);
    assert.equal(inactive.snapshot.products.filter(item => item.isPresale).length, 0);
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
