import { test } from 'node:test';
import assert from 'node:assert/strict';

test('un fallo de escritura conserva el carrito en memoria aunque la lectura del almacenamiento siga funcionando', async () => {
  const keys = ['localStorage', 'document', 'window'];
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  let stored: string | null = null;
  let rejectWrites = false;
  const date = '2026-10-17T20:00:00.000Z';
  Object.defineProperties(globalThis, {
    localStorage: { configurable: true, value: { getItem: () => stored, setItem: (_key: string, value: string) => { if (rejectWrites) throw new Error('Quota exceeded'); stored = value; } } },
    document: { configurable: true, value: { body: { dataset: { catalogSyncedAt: date } } } },
    window: { configurable: true, value: new EventTarget() },
  });
  try {
    const store = await import('../src/scripts/cart-store.ts');
    const state = store.readCart();
    state.lines.push({ productId: 'first', quantity: 1 });
    store.saveCart(state);
    assert.equal(store.readCart().lines[0].quantity, 1);
    assert.equal(store.storageFailed(), false);
    rejectWrites = true;
    const changed = store.readCart();
    changed.lines[0].quantity = 2;
    store.saveCart(changed);
    assert.equal(store.storageFailed(), true);
    assert.equal(JSON.parse(stored!).lines[0].quantity, 1);
    assert.equal(store.readCart().lines[0].quantity, 2);
  } finally {
    keys.forEach((key, index) => {
      if (previous[index]) Object.defineProperty(globalThis, key, previous[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
