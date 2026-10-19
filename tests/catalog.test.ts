import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importCatalog, fetchCsv } from '../scripts/catalog-import.ts';
import { assertSnapshot, normalizeText, enrichCatalog } from '../src/lib/catalog.ts';
import { promoteCatalog, sameCatalog } from '../scripts/catalog-sync.ts';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const header = 'Banda / Titulo,PRECIO EFT/TRAN,STOCK,ORIGEN,SELLO';
const csv = (...rows: string[]) => [header, ...rows].join('\n');

test('conserva títulos, interpreta comillas, acentos y stock 10+ sin inventar cantidad', () => {
  const snapshot = importCatalog('\ufeff' + csv('"Björk, álbum especial",12345,10+,ISLANDIA,SELLO', ',,,,', 'Otro disco,,0,,'), '2026-10-07T12:00:00.000Z');
  assertSnapshot(snapshot);
  assert.equal(snapshot.products.length, 2);
  const item = snapshot.products.find(p => p.sourceTitle.startsWith('Björk'))!;
  assert.equal(item.sourceTitle, 'Björk, álbum especial');
  assert.equal(item.stockRaw, '10+');
  assert.equal(item.stockStatus, 'listed');
  assert.equal(item.artist, null);
  assert.equal(snapshot.products.find(p => p.sourceTitle === 'Otro disco')?.priceCashArs, null);
});
test('un duplicado exacto no suma stock; una colisión comercial se rechaza', () => {
  const row = 'Disco,100,1,USA,SELLO';
  const snapshot = importCatalog(csv(row, row));
  assert.equal(snapshot.products.length, 1);
  assert.equal(snapshot.products[0].stockRaw, '1');
  assert.throws(() => importCatalog(csv(row, 'Disco,200,1,USA,SELLO')), /datos diferentes/);
});
test('identificadores independientes del stock, precio y orden', () => {
  const before = importCatalog(csv('Disco,100,1,USA,SELLO', 'Otro,150,0,USA,SELLO'));
  const after = importCatalog(csv('Otro,150,1,USA,SELLO', 'Disco,120,10+,USA,SELLO'));
  assert.deepEqual(before.products.map(p => p.id), after.products.map(p => p.id));
});
test('rechaza HTML de login, columnas incompatibles, precios inválidos y catálogo vacío', () => {
  for (const source of ['', '<!DOCTYPE html><html>login</html>', 'Nombre,Precio\nDisco,2', header, csv('Disco,$ 1.000,1,USA,SELLO')]) assert.throws(() => importCatalog(source));
  assert.throws(() => importCatalog(csv(`Disco,${'9'.repeat(400)},1,USA,SELLO`)), /fuera de rango/);
});
test('stock desconocido no se convierte en disponible y el precio decimal se conserva', () => {
  const item = importCatalog(csv('Disco,"100,50",?,,')).products[0];
  assert.equal(item.stockStatus, 'unknown');
  assert.equal(item.priceCashArs, 100.5);
  assert.equal(item.origin, null);
});

test('schema 3 importa precios explícitos de tarjeta y cuota, sin derivar recargos', () => {
  const source = `${header},TARJETA 1 PAGO,TARJETA 3 PAGOS,Valor cuota\nDisco,100,1,ARGENTINA,SELLO,"$ 125,50",999,"$ 50,33"`;
  const snapshot = importCatalog(source);
  assertSnapshot(snapshot);
  assert.equal(snapshot.schemaVersion, 3);
  assert.equal(snapshot.products[0].priceCardOneArs, 125.5);
  assert.equal(snapshot.products[0].installment3Ars, 50.33);
  assert.equal(importCatalog(csv('Otro,100,1,,')).products[0].priceCardOneArs, null);
});

test('precios cero o vacíos se consideran sin informar; importes inválidos se rechazan', () => {
  const source = `${header},TARJETA 1 PAGO,Valor cuota\nDisco,0,1,,,0,0\nOtro,,1,,,,`;
  for (const product of importCatalog(source).products) {
    assert.equal(product.priceCashArs, null);
    assert.equal(product.priceCardOneArs, null);
    assert.equal(product.installment3Ars, null);
  }
  assert.throws(() => importCatalog(`${header},TARJETA 1 PAGO\nDisco,100,1,,,sin precio`), /tarjeta en un pago inválido/);
  assert.throws(() => importCatalog(`${header},Valor cuota\nDisco,100,1,,,-1`), /cuota inválido/);
  const snapshot = importCatalog(csv('Disco,100,1,, set'));
  snapshot.products[0].priceCardOneArs = Number.NaN;
  assert.throws(() => assertSnapshot(snapshot), /inválido/);
});
test('el enriquecimiento editorial nunca reemplaza precio ni stock', () => {
  const item = enrichCatalog(importCatalog(csv('Babasonicos Jessico,999,0,ARGENTINA,SONY')))[0];
  assert.equal(item.artist, 'Babasónicos');
  assert.equal(item.album, 'Jessico');
  assert.equal(item.priceCashArs, 999);
  assert.equal(item.stockStatus, 'out');
  assert.equal(normalizeText('  BÁBASONICOS   Jessico '), 'babasonicos jessico');
});
test('reintenta fallos transitorios y termina sin convertir fallos en catálogo vacío', async () => {
  let calls = 0;
  const source = csv('Disco,100,1,USA,SELLO');
  const fetcher = (async () => ++calls < 3 ? new Response('temporal', { status: 503 }) : new Response(source)) as typeof fetch;
  assert.equal(await fetchCsv('https://example.test/catalog.csv', { fetcher, delay: async () => {} }), source);
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(fetchCsv('https://example.test/catalog.csv', { fetcher: (async () => { calls++; throw new Error('red'); }) as typeof fetch, delay: async () => {} }), /red/);
  assert.equal(calls, 3);
});
test('403 no provoca reintentos y HTML exitoso se rechaza en la validación', async () => {
  let calls = 0;
  await assert.rejects(fetchCsv('https://example.test/catalog.csv', { fetcher: (async () => { calls++; return new Response('Forbidden', { status: 403 }); }) as typeof fetch, delay: async () => {} }), /403/);
  assert.equal(calls, 1);
  const response = await fetchCsv('https://example.test/catalog.csv', { fetcher: (async () => new Response('<html>Login</html>')) as typeof fetch });
  assert.throws(() => importCatalog(response), /HTML/);
});
test('un snapshot inválido o con IDs repetidos no puede alimentar el sitio', () => {
  assert.throws(() => assertSnapshot({ schemaVersion: 1, syncedAt: 'ayer', products: [] }));
  const snapshot = importCatalog(csv('Disco,100,1,USA,SELLO'));
  snapshot.products.push(snapshot.products[0]);
  assert.throws(() => assertSnapshot(snapshot), /duplicado/);
});
test('un CSV o build fallido conserva byte por byte el snapshot anterior', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vegan-catalog-test-'));
  const target = join(directory, 'snapshot.json');
  const candidate = join(directory, 'candidate.json');
  const previous = JSON.stringify(importCatalog(csv('Anterior,100,1,USA,SELLO')));
  try {
    await writeFile(target, previous);
    await assert.rejects(promoteCatalog('<html>login</html>', target, candidate));
    assert.equal(await readFile(target, 'utf8'), previous);
    await assert.rejects(promoteCatalog(csv('Nuevo,200,1,USA,SELLO'), target, candidate, async () => { throw new Error('build fallido'); }), /build fallido/);
    assert.equal(await readFile(target, 'utf8'), previous);
    await assert.rejects(access(candidate));
    await promoteCatalog(csv('Nuevo,200,1,USA,SELLO'), target, candidate);
    assert.equal(JSON.parse(await readFile(target, 'utf8')).products[0].sourceTitle, 'Nuevo');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('sin cambios no se escribe candidato, no se valida un build y se conserva la fecha y el archivo original', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vegan-catalog-unchanged-'));
  const target = join(directory, 'snapshot.json');
  const candidate = join(directory, 'candidate.json');
  const source = csv('Anterior,100,1,USA,SELLO', 'Otro,200,10+,ARGENTINA,OTRO');
  const before = importCatalog(source, '2026-10-17T12:00:00.000Z');
  const bytes = JSON.stringify(before, null, 4) + '\n';
  try {
    await writeFile(target, bytes);
    const result = await promoteCatalog(source, target, candidate, async () => { assert.fail('No debe construir sin cambios'); }, '2026-10-19T12:00:00.000Z');
    assert.equal(result.changed, false);
    assert.equal(result.snapshot.syncedAt, before.syncedAt);
    assert.equal(await readFile(target, 'utf8'), bytes);
    await assert.rejects(access(candidate));
    assert.equal(sameCatalog(before, { ...before, syncedAt: '2026-10-19T14:00:00.000Z', products: [...before.products].reverse() }), true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('un cambio comercial se valida y promueve con su nueva fecha', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vegan-catalog-changed-'));
  const target = join(directory, 'snapshot.json');
  const candidate = join(directory, 'candidate.json');
  const before = importCatalog(csv('Disco,100,1,USA,SELLO'), '2026-10-17T12:00:00.000Z');
  let validations = 0;
  try {
    await writeFile(target, JSON.stringify(before));
    const result = await promoteCatalog(csv('Disco,120,0,USA,SELLO'), target, candidate, async path => {
      validations++;
      assert.equal(JSON.parse(await readFile(path, 'utf8')).products[0].priceCashArs, 120);
      assert.equal(JSON.parse(await readFile(target, 'utf8')).products[0].priceCashArs, 100);
    }, '2026-10-19T12:00:00.000Z');
    assert.equal(result.changed, true);
    assert.equal(validations, 1);
    assert.equal(result.snapshot.syncedAt, '2026-10-19T12:00:00.000Z');
    assert.equal(JSON.parse(await readFile(target, 'utf8')).products[0].stockRaw, '0');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
