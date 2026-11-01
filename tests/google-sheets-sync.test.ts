import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../scripts/google-sheets-sync.gs', import.meta.url), 'utf8');
function setup(options: { token?: string; last?: number; locked?: boolean; code?: number; body?: string; networkError?: boolean } = {}) {
  const properties = new Map<string, string>();
  if (options.token !== '') properties.set('VMS_GITHUB_TOKEN', options.token ?? 'test-only-token');
  if (options.last !== undefined) properties.set('VMS_LAST_SYNC_REQUEST', String(options.last));
  const requests: Array<{ url: string; options: { payload: string; headers: Record<string, string>; followRedirects: boolean } }> = [];
  let releases = 0, flushes = 0;
  const context = vm.createContext({
    Date: { now: () => 1000000 },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key: string) => properties.get(key) ?? null, setProperty: (key: string, value: string) => properties.set(key, value) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !options.locked, releaseLock: () => releases++ }) },
    SpreadsheetApp: { flush: () => flushes++ },
    UrlFetchApp: { fetch: (url: string, fetchOptions: typeof requests[number]['options']) => {
      requests.push({ url, options: fetchOptions });
      if (options.networkError) throw new Error('network unavailable');
      return { getResponseCode: () => options.code ?? 204, getContentText: () => options.body ?? '' };
    } },
  });
  vm.runInContext(source, context);
  return { run: () => vm.runInContext('sincronizarWeb()', context), properties, requests, released: () => releases, flushed: () => flushes };
}

test('el botón solicita el workflow de main, no comparte datos de las celdas y registra el cooldown', () => {
  const app = setup();
  const result = app.run();
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].url, 'https://api.github.com/repos/ramiro-gp/VeganMusicStore/actions/workflows/catalog-sync.yml/dispatches');
  assert.deepEqual(JSON.parse(app.requests[0].options.payload), { ref: 'main' });
  assert.equal(app.requests[0].options.followRedirects, false);
  assert.equal(app.flushed(), 1);
  assert.equal(result.url, 'https://github.com/ramiro-gp/VeganMusicStore/actions/workflows/catalog-sync.yml');
  assert.equal(app.properties.get('VMS_LAST_SYNC_REQUEST'), '1000000');
  assert.throws(app.run, /Esperá 60 segundos/);
  assert.equal(app.requests.length, 1);
  assert.equal(app.released(), 2);
});

test('un doble clic concurrente o credencial faltante no dispara solicitudes', () => {
  for (const options of [{ locked: true }, { token: '' }, { last: 999999 }]) {
    const app = setup(options);
    assert.throws(app.run);
    assert.equal(app.requests.length, 0);
  }
});

test('errores de permisos, workflow o red no anuncian éxito ni consumen el cooldown', () => {
  for (const code of [401, 403, 404, 429, 500]) {
    const app = setup({ code });
    assert.throws(app.run, code === 401 || code === 403 ? /permisos o vencimiento/ : code === 404 ? /workflow/ : /HTTP/);
    assert.equal(app.properties.has('VMS_LAST_SYNC_REQUEST'), false);
    assert.equal(app.released(), 1);
  }
  const app = setup({ networkError: true });
  assert.throws(app.run, /network unavailable/);
  assert.equal(app.released(), 1);
});

test('el enlace de una ejecución sólo se admite dentro del repositorio configurado', () => {
  const runUrl = 'https://github.com/ramiro-gp/VeganMusicStore/actions/runs/123';
  assert.equal(setup({ code: 200, body: JSON.stringify({ html_url: runUrl }) }).run().url, runUrl);
  for (const url of ['javascript:alert(1)', 'https://github.com.evil.test/123', 'https://github.com/another/repo/actions/runs/123']) {
    assert.match(setup({ code: 200, body: JSON.stringify({ html_url: url }) }).run().url, /VeganMusicStore\/actions\/workflows/);
  }
});
