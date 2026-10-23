import { buildCartMessage, paymentLabels, reconcileCart, summarizeCart, type CartProduct, type CartState, type PaymentMethod } from '../lib/cart';
import { formatPrice, whatsappUrl } from '../lib/whatsapp';
import { catalogDate, readCart, saveCart } from './cart-store';
import { referralUrl } from '../lib/external-links';

const page = document.querySelector<HTMLElement>('[data-cart]');
if (page) {
  const products: CartProduct[] = JSON.parse(document.getElementById('cart-products')!.textContent!);
  const template = document.getElementById('cart-line-template') as HTMLTemplateElement;
  const content = page.querySelector<HTMLElement>('[data-cart-content]')!;
  const list = page.querySelector<HTMLElement>('[data-cart-lines]')!;
  const requestList = page.querySelector<HTMLElement>('[data-cart-request-lines]')!;
  const notices = page.querySelector<HTMLElement>('[data-cart-notices]')!;
  const send = page.querySelector<HTMLAnchorElement>('[data-cart-send]')!;
  const copy = page.querySelector<HTMLButtonElement>('[data-cart-copy]')!;
  const feedback = page.querySelector<HTMLElement>('[data-cart-feedback]')!;
  const radios = [...page.querySelectorAll<HTMLInputElement>('input[name="payment"]')];
  const money = (cents: number) => formatPrice(cents / 100);
  let state: CartState = readCart();
  let internalUpdate = false;
  let message = '';

  function write() {
    internalUpdate = true;
    saveCart(state);
    internalUpdate = false;
  }
  function render() {
    const focused = document.activeElement as HTMLElement | null;
    const focusedId = focused?.closest<HTMLElement>('[data-cart-line]')?.dataset.productId;
    const focusedAction = focused?.dataset.cartAction;
    let summary = summarizeCart(state, products);
    if (summary.hasPricedItems && !summary.availableMethods[state.paymentMethod]) {
      const fallback = (Object.keys(paymentLabels) as PaymentMethod[]).find(method => summary.availableMethods[method]);
      if (fallback) {
        state.paymentMethod = fallback;
        const paymentNotice = 'El medio anterior no está disponible para todos los discos. Seleccionamos una opción disponible.';
        if (!notices.textContent?.includes(paymentNotice)) notices.textContent = [notices.textContent, paymentNotice].filter(Boolean).join(' ');
        notices.hidden = false;
        write();
        summary = summarizeCart(state, products);
      }
    }
    const empty = state.lines.length === 0;
    page!.querySelector<HTMLElement>('[data-cart-empty]')!.hidden = !empty;
    page!.querySelector<HTMLElement>('[data-cart-filled]')!.hidden = empty;
    const fragment = document.createDocumentFragment();
    const requestFragment = document.createDocumentFragment();
    for (const line of summary.lines) {
      const row = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
      row.dataset.productId = line.productId;
      const title = line.product?.sourceTitle ?? 'Este título ya no figura en el catálogo';
      const external = Boolean(line.product?.purchaseUrl);
      row.querySelector('[data-line-title]')!.textContent = title;
      row.querySelector('[data-line-unit]')!.textContent = external ? 'La compra continúa en la Empretienda de Vegan Records.' : line.onRequest ? 'Sin stock en lista' : line.unitCents === null ? 'Precio pendiente de confirmar' : line.quantity === 1 ? paymentLabels[state.paymentMethod] : `${money(line.unitCents)} por unidad · ${paymentLabels[state.paymentMethod]}`;
      row.querySelector<HTMLElement>('.quantity-control')!.hidden = external;
      row.querySelector('[data-line-quantity]')!.textContent = String(line.quantity);
      row.querySelector('[data-line-subtotal]')!.textContent = external ? 'Fuera del total' : line.onRequest ? 'A cotizar' : line.subtotalCents === null ? 'Consultar precio' : money(line.subtotalCents);
      const buy = row.querySelector<HTMLAnchorElement>('[data-line-buy]')!;
      buy.hidden = !external;
      if (line.product?.purchaseUrl) {
        buy.href = referralUrl(line.product.purchaseUrl, 'saved_cart');
        buy.setAttribute('aria-label', `Comprar ahora ${title} en Empretienda (abre en otra pestaña)`);
      }
      const limit = row.querySelector<HTMLElement>('[data-line-limit]')!;
      const tenPlus = line.product?.stockRaw.trim() === '10+';
      limit.textContent = line.onRequest ? 'Disponibilidad y costo a confirmar.' : line.limit ? `${tenPlus ? '10+' : line.limit} ${line.limit === 1 ? 'disponible' : 'disponibles'}. Stock a confirmar.${tenPlus ? ' Para más de diez, consultanos directamente.' : ''}` : '';
      const error = row.querySelector<HTMLElement>('[data-line-error]')!;
      error.hidden = !line.error;
      error.textContent = line.error ?? '';
      for (const button of row.querySelectorAll<HTMLButtonElement>('[data-cart-action]')) {
        const action = button.dataset.cartAction;
        const label = action === 'remove' ? 'Quitar' : action === 'increment' ? 'Aumentar cantidad de' : 'Disminuir cantidad de';
        button.setAttribute('aria-label', `${label} ${title}`);
        button.disabled = action === 'increment' ? line.quantity >= line.limit : action === 'decrement' ? line.quantity <= 1 : false;
      }
      (line.onRequest ? requestFragment : fragment).append(row);
    }
    list.replaceChildren(fragment);
    requestList.replaceChildren(requestFragment);
    page!.querySelector<HTMLElement>('[data-cart-stock-section]')!.hidden = !summary.lines.some(line => !line.onRequest);
    page!.querySelector<HTMLElement>('[data-cart-stock-section] h2')!.textContent = summary.lines.some(line => line.product?.purchaseUrl) ? 'REVISÁ TU SELECCIÓN' : 'CON STOCK EN LISTA';
    page!.querySelector<HTMLElement>('[data-cart-request-section]')!.hidden = !summary.requestedUnits;
    page!.querySelector<HTMLElement>('.payment-options')!.hidden = !summary.hasPricedItems;
    page!.querySelector<HTMLElement>('[data-summary-title]')!.textContent = summary.hasPricedItems ? '¿CÓMO QUERÉS PAGAR?' : 'TU CONSULTA';
    for (const radio of radios) {
      radio.disabled = !summary.availableMethods[radio.value as PaymentMethod];
      radio.checked = radio.value === state.paymentMethod;
    }
    page!.querySelector('[data-cart-units]')!.textContent = String(state.lines.reduce((sum, line) => sum + line.quantity, 0));
    page!.querySelector('[data-cart-total-label]')!.textContent = summary.hasPricedItems && summary.requestedUnits ? 'Total con stock' : 'Total';
    page!.querySelector('[data-cart-total]')!.textContent = summary.hasPricedItems ? money(summary.totalCents) : 'A cotizar';
    const requestSummary = page!.querySelector<HTMLElement>('[data-request-summary]')!;
    requestSummary.hidden = !summary.requestedUnits;
    requestSummary.textContent = `${summary.requestedUnits} ${summary.requestedUnits === 1 ? 'unidad a pedido' : 'unidades a pedido'} · Costo a consultar.`;
    const installment = page!.querySelector<HTMLElement>('[data-cart-installments]')!;
    installment.hidden = summary.installmentCents === null;
    installment.textContent = summary.installmentCents === null ? '' : `3 cuotas de ${money(summary.installmentCents)}`;
    const error = page!.querySelector<HTMLElement>('[data-cart-error]')!;
    error.hidden = summary.canSend || empty;
    message = summary.canSend ? buildCartMessage(state, products) : '';
    const url = message ? whatsappUrl(message, page!.dataset.whatsappNumber || null) : null;
    send.href = url ?? page!.dataset.contactUrl!;
    send.setAttribute('aria-disabled', String(!summary.canSend));
    send.tabIndex = summary.canSend ? 0 : -1;
    copy.disabled = !summary.canSend;
    if (focusedId && focusedAction) {
      const targetRow = [...page!.querySelectorAll<HTMLElement>('[data-cart-line]')].find(row => row.dataset.productId === focusedId);
      const button = targetRow?.querySelector<HTMLButtonElement>(`[data-cart-action="${focusedAction}"]`);
      if (button && !button.disabled) button.focus({ preventScroll: true });
      else if (targetRow) targetRow.querySelector<HTMLButtonElement>('[data-cart-action="remove"]')?.focus({ preventScroll: true });
      else if (!empty) page!.querySelector<HTMLButtonElement>('[data-cart-line] button')?.focus({ preventScroll: true });
      else page!.querySelector<HTMLAnchorElement>('[data-cart-empty] a')?.focus({ preventScroll: true });
    }
  }
  function reload() {
    const original = readCart();
    const result = reconcileCart(original, products, catalogDate());
    state = result.state;
    if (result.notices.length) { notices.textContent = result.notices.join(' '); notices.hidden = false; }
    if (JSON.stringify(original) !== JSON.stringify(state)) write();
    render();
  }
  page.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-cart-action]');
    if (!button || button.disabled) return;
    const id = button.closest<HTMLElement>('[data-cart-line]')!.dataset.productId;
    const line = state.lines.find(item => item.productId === id);
    if (!line) return;
    if (button.dataset.cartAction === 'remove') state.lines = state.lines.filter(item => item !== line);
    else {
      const delta = button.dataset.cartAction === 'increment' ? 1 : -1;
      const limit = summarizeCart(state, products).lines.find(item => item.productId === id)!.limit;
      line.quantity = Math.max(1, Math.min(limit, line.quantity + delta));
    }
    feedback.textContent = button.dataset.cartAction === 'remove' ? 'Disco quitado de la selección.' : 'Cantidad actualizada.';
    write(); render();
  });
  for (const radio of radios) radio.addEventListener('change', () => {
    if (!radio.checked || radio.disabled) return;
    state.paymentMethod = radio.value as PaymentMethod;
    write(); render();
  });
  send.addEventListener('click', event => { if (!message) event.preventDefault(); });
  copy.addEventListener('click', async () => {
    if (!message) return;
    try { await navigator.clipboard.writeText(message); feedback.textContent = 'Consulta copiada. Podés pegarla en WhatsApp.'; }
    catch {
      const fallback = page!.querySelector<HTMLElement>('[data-copy-fallback]')!;
      fallback.hidden = false;
      const textarea = fallback.querySelector('textarea')!;
      textarea.value = message; textarea.focus(); textarea.select();
      feedback.textContent = 'Seleccionamos el mensaje para que puedas copiarlo.';
    }
  });
  window.addEventListener('vsm:cartchange', () => { if (!internalUpdate) reload(); });
  window.addEventListener('pageshow', reload);
  content.hidden = false;
  reload();
}
