for (const slider of document.querySelectorAll<HTMLElement>('[data-slider]')) {
  const track = slider.querySelector<HTMLElement>('[data-slider-track]')!;
  const controls = slider.querySelector<HTMLElement>('[data-slider-navigation]')!;
  const previous = controls.querySelector<HTMLButtonElement>('[data-slider-direction="-1"]')!;
  const next = controls.querySelector<HTMLButtonElement>('[data-slider-direction="1"]')!;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function update() {
    const max = track.scrollWidth - track.clientWidth;
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
    controls.hidden = max <= 2;
  }
  function move(direction: number) {
    const card = track.querySelector<HTMLElement>('.slider-record')!;
    const gap = parseFloat(getComputedStyle(track.querySelector('ul')!).columnGap) || 0;
    track.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: motion.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);
  update();
}
