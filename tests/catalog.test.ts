import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importCatalog, fetchCsv } from '../scripts/catalog-import.ts';
import { assertSnapshot, normalizeText, enrichCatalog } from '../src/lib/catalog.ts';
import { promoteCatalog } from '../scripts/catalog-sync.ts';
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
