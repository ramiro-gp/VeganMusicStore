import { readCart, saveCart } from './cart-store';

const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-add-cart]')];
function updateButtons() {
  const cart = readCart();
  for (const button of buttons) {
    const limit = Number(button.dataset.limit);
    const quantity = cart.lines.find(line => line.productId === button.dataset.addCart)?.quantity ?? 0;
    button.hidden = false;
    button.disabled = !limit || quantity > 0;
    button.querySelector('[data-add-label]')!.textContent = quantity > 0 ? 'En el carrito' : button.dataset.onRequest === 'true' ? 'Sin stock · Pedir' : !limit ? 'Sólo consulta' : 'Sumar al carrito';
  }
}
for (const button of buttons) button.addEventListener('click', () => {
  const cart = readCart();
  const id = button.dataset.addCart!;
  const line = cart.lines.find(item => item.productId === id);
  if (!Number.isFinite(Number(button.dataset.limit)) || Number(button.dataset.limit) <= 0 || line) return;
  const onRequest = button.dataset.onRequest === 'true';
  cart.lines.push({ productId: id, quantity: 1, ...(onRequest ? { kind: 'request' as const } : {}) });
  saveCart(cart);
  const source = button.closest('[data-cart-source]');
  const feedback = source?.querySelector('[data-add-feedback], [data-catalog-feedback]');
  if (feedback) feedback.textContent = `${button.dataset.title}: ${onRequest ? 'agregado a pedido. Costo a consultar.' : 'en el carrito.'}`;
  const shortcut = source?.querySelector<HTMLElement>('[data-cart-shortcut]');
  if (shortcut) shortcut.hidden = false;
});
window.addEventListener('vsm:cartchange', updateButtons);
window.addEventListener('pageshow', updateButtons);
updateButtons();
