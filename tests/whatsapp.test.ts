import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsappUrl, productMessage, formatPrice, normalizeWhatsappNumber, normalizeWhatsappMessage } from '../src/lib/whatsapp.ts';

test('sin número no se genera una URL falsa', () => {
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

test('la consulta directa de un agotado pregunta por el costo a pedido y omite el precio histórico', () => {
  const message = productMessage({ sourceTitle: 'Björk & Disco', priceCashArs: 49220, stockStatus: 'out' });
  assert.match(message, /Björk & Disco/);
  assert.match(message, /sin stock[\s\S]*a pedido[\s\S]*costo/);
  assert.doesNotMatch(message, /49.220|\$|efectivo/);
  assert.equal(new URL(whatsappUrl(message)!).searchParams.get('text'), message);
});

test('el destinatario configurado es exactamente el número nuevo y acepta separadores sin alterar sus dígitos', () => {
  for (const number of ['5491158974298', '+54 9 11 5897-4298', '+54 (9) 11 5897–4298', '  +５４ ９ １１ ５８９７-４２９８  ']) {
    assert.equal(normalizeWhatsappNumber(number), '5491158974298');
    assert.equal(new URL(whatsappUrl('Consulta', number)!).pathname, '/5491158974298');
  }
  assert.equal(new URL(whatsappUrl('Consulta')!).pathname, '/5491158974298');
  for (const invalid of ['', '005491158974298', '5491158974298 ext 12', '5491158974298?text=otro', 'https://wa.me/5491158974298', '54911+58974298', '9'.repeat(16)]) assert.throws(() => normalizeWhatsappNumber(invalid));
});

test('el texto conserva acentos, signos, importes y saltos de línea tras una sola decodificación', () => {
  const message = 'Hola, ¿está Björk & AC/DC + edición 50%?\r\nPrecio: $\u00a030.000,50\n3 cuotas de $\u202f10.000,17\u0000';
  const readable = 'Hola, ¿está Björk & AC/DC + edición 50%?\nPrecio: $ 30.000,50\n3 cuotas de $ 10.000,17';
  const url = new URL(whatsappUrl(message)!);
  assert.equal(normalizeWhatsappMessage(message), readable);
  assert.equal(url.searchParams.get('text'), readable);
  assert.match(url.href, /%2B/);
  assert.match(url.href, /%26/);
  assert.equal(url.searchParams.size, 1);
});
