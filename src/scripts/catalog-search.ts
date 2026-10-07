const catalog = document.querySelector<HTMLElement>('[data-catalog]');
if (catalog) {
  const controls = catalog.querySelector<HTMLFormElement>('[data-catalog-controls]')!;
  const search = catalog.querySelector<HTMLInputElement>('[data-search]')!;
  const stock = catalog.querySelector<HTMLInputElement>('[data-stock-filter]')!;
  const count = catalog.querySelector<HTMLElement>('[data-result-count]')!;
  const empty = catalog.querySelector<HTMLElement>('[data-empty]')!;
  const items = [...catalog.querySelectorAll<HTMLElement>('[data-catalog-item]')];
  let timeout: ReturnType<typeof setTimeout>;
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').replace(/\s+/g, ' ').trim();
  function filter() {
    const words = normalize(search.value).split(' ').filter(Boolean);
    let visible = 0;
    for (const item of items) {
      const matches = words.every(word => item.dataset.searchText!.includes(word)) && (!stock.checked || item.dataset.stock === 'listed');
      item.hidden = !matches;
      if (matches) visible++;
    }
    count.textContent = `${visible} ${visible === 1 ? 'título' : 'títulos'}`;
    empty.hidden = visible !== 0;
  }
  controls.hidden = false;
  controls.addEventListener('submit', event => { event.preventDefault(); filter(); });
  search.addEventListener('input', () => { clearTimeout(timeout); timeout = setTimeout(filter, 100); });
  stock.addEventListener('change', filter);
  window.addEventListener('pageshow', filter);
}
