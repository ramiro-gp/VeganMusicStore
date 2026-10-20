const catalog = document.querySelector<HTMLElement>('[data-catalog]');
if (catalog) {
  const controls = catalog.querySelector<HTMLFormElement>('[data-catalog-controls]')!;
  const search = catalog.querySelector<HTMLInputElement>('[data-search]')!;
  const stock = catalog.querySelector<HTMLInputElement>('[data-stock-filter]')!;
  const origin = catalog.querySelector<HTMLSelectElement>('[data-origin-filter]')!;
  const count = catalog.querySelector<HTMLElement>('[data-result-count]')!;
  const empty = catalog.querySelector<HTMLElement>('[data-empty]')!;
  const items = [...catalog.querySelectorAll<HTMLElement>('[data-catalog-item]')];
  const pagination = catalog.querySelector<HTMLElement>('[data-pagination]')!;
  const previous = catalog.querySelector<HTMLButtonElement>('[data-page-previous]')!;
  const next = catalog.querySelector<HTMLButtonElement>('[data-page-next]')!;
  const pageStatus = catalog.querySelector<HTMLElement>('[data-page-status]')!;
  const pageSize = 50;
  let page = 0;
  let matches: HTMLElement[] = [];
  let timeout: ReturnType<typeof setTimeout>;
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').replace(/\s+/g, ' ').trim();
  function showPage() {
    const pages = Math.ceil(matches.length / pageSize);
    page = Math.min(page, Math.max(0, pages - 1));
    const start = page * pageSize;
    for (const item of items) item.hidden = true;
    for (const item of matches.slice(start, start + pageSize)) item.hidden = false;
    count.textContent = `${matches.length} ${matches.length === 1 ? 'título' : 'títulos'}`;
    empty.hidden = matches.length !== 0;
    pagination.hidden = pages <= 1;
    previous.disabled = page === 0;
    next.disabled = page >= pages - 1;
    pageStatus.textContent = `Página ${page + 1} de ${Math.max(1, pages)} · ${start + 1}–${Math.min(start + pageSize, matches.length)} de ${matches.length}`;
  }
  function filter() {
    const words = normalize(search.value).split(' ').filter(Boolean);
    matches = items.filter(item => words.every(word => item.dataset.searchText!.includes(word))
        && (!stock.checked || item.dataset.stock === 'listed')
        && (origin.value === 'all' || item.dataset.origin === origin.value));
    page = 0;
    showPage();
  }
  function turnPage(delta: number) {
    page += delta;
    showPage();
    controls.scrollIntoView({ block: 'start', behavior: 'instant' });
    search.focus({ preventScroll: true });
  }
  previous.addEventListener('click', () => turnPage(-1));
  next.addEventListener('click', () => turnPage(1));
  function revealLinkedItem() {
    const target = items.find(item => item.id === location.hash.slice(1));
    if (!target) return;
    if (!matches.includes(target)) {
      search.value = '';
      stock.checked = false;
      origin.value = 'all';
      filter();
    }
    page = Math.floor(matches.indexOf(target) / pageSize);
    showPage();
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  controls.hidden = false;
  controls.addEventListener('submit', event => { event.preventDefault(); filter(); });
  search.addEventListener('input', () => { clearTimeout(timeout); timeout = setTimeout(filter, 100); });
  stock.addEventListener('change', filter);
  origin.addEventListener('change', filter);
  window.addEventListener('pageshow', () => { filter(); revealLinkedItem(); });
  window.addEventListener('hashchange', revealLinkedItem);
  filter();
  revealLinkedItem();
}
