import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsappUrl, productMessage, formatPrice } from '../src/lib/whatsapp.ts';

test('sin número no se genera una URL falsa', () => {
  assert.equal(whatsappUrl('Consulta'), null);
  assert.equal(whatsappUrl('Consulta', null), null);
});
test('WhatsApp codifica acentos, símbolos y ampersand conservando el mensaje', () => {
  const message = '¿Está Björk & álbum especial?';
  const url = new URL(whatsappUrl(message, '5491100000000')!);
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.searchParams.get('text'), message);
  assert.throws(() => whatsappUrl(message, '+54 911'), /dígitos/);
});
test('la consulta incluye título y modalidad del precio sin afirmar disponibilidad', () => {
  const message = productMessage({ sourceTitle: 'Björk & Disco', priceCashArs: 49220 });
  assert.match(message, /Björk & Disco/);
  assert.match(message, /efectivo\/transferencia/);
  assert.match(message, /confirman/);
  assert.equal(formatPrice(null), 'Consultar precio');
  assert.match(formatPrice(100.5), /100,5/, 'conserva los centavos informados en la fuente');
});
