const header = document.querySelector<HTMLElement>('[data-header]');
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const navigation = document.querySelector<HTMLElement>('[data-main-nav]');

if (header && toggle && navigation) {
  const mobile = matchMedia('(max-width: 1099px)');
  const background = Array.from(document.querySelectorAll<HTMLElement>('body > main, body > footer, body > .storage-notice'));

  const measure = () => {
    header.style.setProperty('--menu-header-height', `${header.getBoundingClientRect().height}px`);
  };

  const setOpen = (requested: boolean) => {
    const open = requested && mobile.matches;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    navigation.dataset.open = String(open);
    navigation.inert = mobile.matches && !open;
    document.documentElement.classList.toggle('menu-open', open);
    background.forEach(element => { element.inert = open; });
    if (open) navigation.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
    else if (navigation.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  header.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (mobile.matches && toggle.getAttribute('aria-expanded') === 'true' && navigation.contains(link)) {
      // Closing makes the link inert, so complete its navigation explicitly.
      event.preventDefault();
      const destination = link.href;
      setOpen(false);
      window.location.assign(destination);
    } else setOpen(false);
  });
  document.addEventListener('click', event => {
    if (event.target instanceof Element && !header.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      toggle.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      const controls = Array.from(header.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'))
        .filter(element => element.getClientRects().length > 0 && !element.closest('[inert]'));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus({ preventScroll: true });
      }
    }
  });
  mobile.addEventListener('change', () => setOpen(false));
  const observer = new ResizeObserver(measure);
  observer.observe(header);
  window.addEventListener('pageshow', () => { setOpen(false); measure(); });
  setOpen(false);
  measure();
}

export {};
