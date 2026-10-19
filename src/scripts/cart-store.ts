import { parseCart, type CartState } from '../lib/cart.ts';

export const CART_KEY = 'vsm.cart.v1';
let memory: CartState | null = null;
let unavailable = false;
export const catalogDate = () => document.body.dataset.catalogSyncedAt ?? '';

export function readCart(): CartState {
  if (unavailable && memory) return memory;
  try { return parseCart(localStorage.getItem(CART_KEY), catalogDate()); }
  catch { unavailable = true; return memory ?? parseCart(null, catalogDate()); }
}

export function saveCart(state: CartState): void {
  memory = state;
  try { localStorage.setItem(CART_KEY, JSON.stringify(state)); }
  catch { unavailable = true; }
  window.dispatchEvent(new Event('vsm:cartchange'));
}

export function storageFailed(): boolean { return unavailable; }
