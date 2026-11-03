import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importCatalog } from '../scripts/catalog-import.ts';
import { selectShowcase, canAddToCart } from '../src/lib/catalog-selection.ts';

const product = (title: string) => importCatalog(`Banda / Titulo,PRECIO EFT/TRAN,STOCK,ORIGEN,SELLO\n${title},100,1,ARGENTINA,SELLO`).products[0];
const image = 'https://images.example.com/disco.jpg';

test('las preventas conviven con los destacados del inicio y sólo los reemplazan en el carrito', () => {
  const marked = { ...product('Zeta'), imageUrl: image };
  const presale = { ...product('Alfa'), isPresale: true, imageUrl: image, purchaseUrl: 'https://veganrecords.empretienda.com.ar/disco' };
  assert.deepEqual(selectShowcase([marked, presale]), { mode: 'featured', items: [marked] });
  assert.deepEqual(selectShowcase([marked, presale], 'cart'), { mode: 'presale', items: [presale] });
  const closed = { ...presale, isPresale: false };
  assert.deepEqual(selectShowcase([marked, closed]), { mode: 'featured', items: [closed, marked] });
  assert.deepEqual(selectShowcase([marked, closed], 'cart'), { mode: 'featured', items: [closed, marked] });
});

test('si sólo las preventas tienen imagen, usa la selección fija sin repetir preventas ni por título', () => {
  const presale = { ...product('Babasonicos Jessico'), isPresale: true, imageUrl: image, purchaseUrl: 'https://veganrecords.empretienda.com.ar/disco' };
  const fallback = product('Bad Brains Into The Future');
  assert.deepEqual(selectShowcase([presale, fallback]), { mode: 'fallback', items: [fallback] });
  assert.deepEqual(selectShowcase([presale]), { mode: 'fallback', items: [] });
  assert.deepEqual(selectShowcase([presale, fallback], 'cart'), { mode: 'presale', items: [presale] });
});

test('destaca todos los álbumes con imagen, en orden alfabético, sin límite ni filtro de stock', () => {
  const products = Array.from({ length: 750 }, (_, i) => ({ ...product(`Disco ${String(i).padStart(4, '0')}`), imageUrl: image }));
  products[0].stockStatus = 'unknown';
  products[0].priceCashArs = null;
  const result = selectShowcase([...products].reverse());
  assert.equal(result.mode, 'featured');
  assert.deepEqual(result.items, products);
  assert.equal(canAddToCart(result.items[0]), false);
  assert.equal(canAddToCart({ ...products[1], purchaseUrl: 'https://veganrecords.empretienda.com.ar/disco' }), false);
  assert.equal(canAddToCart({ ...products[1], stockStatus: 'out', stockRaw: '0' }), true);
});

test('agregar y borrar imágenes activa y desactiva destacados; sin O conserva la selección fija', () => {
  const fallback = product('Babasonicos Jessico');
  const other = product('Otro disco');
  assert.deepEqual(selectShowcase([other, fallback]), { mode: 'fallback', items: [fallback] });
  assert.deepEqual(selectShowcase([fallback, { ...other, imageUrl: image }]), { mode: 'featured', items: [{ ...other, imageUrl: image }] });
  assert.deepEqual(selectShowcase([{ ...other, imageUrl: null }, fallback]).items, [fallback]);
  assert.deepEqual(selectShowcase([other]), { mode: 'fallback', items: [] });
});
