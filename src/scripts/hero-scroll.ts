const hero = document.querySelector<HTMLElement>('[data-hero]');
const pin = hero?.querySelector<HTMLElement>('[data-hero-pin]');
const content = hero?.querySelector<HTMLElement>('[data-hero-content]');
const header = document.querySelector<HTMLElement>('[data-header]');

if (hero && pin && content && header) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let start = 0;
  let distance = 1;
  let frame = 0;
  let active = true;
  let measuring = false;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));

  function render() {
    frame = 0;
    if (hero!.dataset.enhanced !== 'true') return;
    const progress = clamp((window.scrollY - start) / distance);
    const extraction = clamp((progress - .08) / .72);
    const eased = extraction * extraction * (3 - 2 * extraction);
    hero!.style.setProperty('--hero-progress', String(progress));
    hero!.style.setProperty('--record-progress', String(eased));
  }
  function schedule() {
    if (active && !frame && hero!.dataset.enhanced === 'true') frame = requestAnimationFrame(render);
  }
  function measure() {
    if (measuring) return;
    measuring = true;
    document.documentElement.style.setProperty('--header-height', `${header!.getBoundingClientRect().height}px`);
    hero!.dataset.enhanced = 'false';
    const headerHeight = header!.getBoundingClientRect().height;
    const sceneHeight = content!.offsetHeight;
    const allow = !motion.matches && window.innerHeight >= 550 && sceneHeight <= window.innerHeight - headerHeight + 1;
    hero!.style.setProperty('--hero-scene-height', `${sceneHeight}px`);
    hero!.dataset.enhanced = String(allow);
    if (allow) {
      // Keep the scene pinned through the complete extraction, with a short final hold.
      start = window.scrollY + hero!.getBoundingClientRect().top - headerHeight;
      distance = Math.max(1, hero!.offsetHeight - pin!.offsetHeight);
    }
    if (hero!.dataset.enhanced === 'true') render();
    else {
      hero!.style.setProperty('--record-progress', motion.matches ? '1' : '0');
      hero!.dataset.active = 'false';
    }
    measuring = false;
  }
  const observer = new IntersectionObserver(entries => {
    active = entries[0]?.isIntersecting ?? false;
    hero!.dataset.active = String(active && hero!.dataset.enhanced === 'true');
    // Clamp the final state even when a fast gesture skips the observer boundary.
    render();
  }, { rootMargin: '100px' });
  observer.observe(hero);
  window.addEventListener('scroll', schedule, { passive: true });
  let resizeFrame = 0;
  const remeasure = () => { if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; measure(); }); };
  window.addEventListener('resize', remeasure, { passive: true });
  window.addEventListener('pageshow', remeasure);
  motion.addEventListener('change', remeasure);
  const headerObserver = new ResizeObserver(remeasure);
  headerObserver.observe(header);
  measure();
  document.fonts.ready.then(remeasure);
  window.addEventListener('pagehide', () => {
    if (frame) cancelAnimationFrame(frame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
  });
}
