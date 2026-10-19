import { CART_KEY, readCart, storageFailed } from './cart-store';
import './cart-add';

function update() {
  const units = readCart().lines.reduce((sum, line) => sum + line.quantity, 0);
  for (const badge of document.querySelectorAll<HTMLElement>('[data-cart-count]')) {
    badge.textContent = String(units);
    badge.closest('a')?.setAttribute('aria-label', `Carrito: ${units} ${units === 1 ? 'unidad' : 'unidades'}`);
  }
  for (const notice of document.querySelectorAll<HTMLElement>('[data-storage-notice]')) notice.hidden = !storageFailed();
}
window.addEventListener('vsm:cartchange', update);
window.addEventListener('pageshow', update);
window.addEventListener('storage', event => {
  if (event.key === CART_KEY || event.key === null) {
    update();
    window.dispatchEvent(new Event('vsm:cartchange'));
  }
});
update();
