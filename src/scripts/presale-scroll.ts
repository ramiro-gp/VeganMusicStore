const presale = document.querySelector<HTMLElement>('.presale-home[data-presale]');
const header = document.querySelector<HTMLElement>('[data-header]');

if (presale && header) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  function measure() {
    frame = 0;
    const headerHeight = header!.getBoundingClientRect().height;
    // Tall campaigns scroll fully before pinning, keeping every purchase link reachable.
    const top = Math.min(headerHeight, window.innerHeight - Math.ceil(presale!.getBoundingClientRect().height));
    presale!.style.setProperty('--presale-top', `${top}px`);
    presale!.dataset.pinned = String(!motion.matches);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure);
  }

  const observer = new ResizeObserver(schedule);
  observer.observe(presale);
  observer.observe(header);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  motion.addEventListener('change', schedule);
  // Returning to the campaign with the keyboard must reveal it above the foreground.
  presale.addEventListener('focusin', event => {
    const foreground = document.querySelector<HTMLElement>('.home-content-over-presale');
    if (event.target instanceof HTMLElement && event.target.matches(':focus-visible') && presale.dataset.pinned === 'true' && foreground && foreground.getBoundingClientRect().top < window.innerHeight) {
      const height = presale.offsetHeight;
      const campaignStart = window.scrollY + foreground.getBoundingClientRect().top - height;
      const targetOffset = event.target.getBoundingClientRect().top - presale.getBoundingClientRect().top;
      const targetScroll = campaignStart + targetOffset - header.getBoundingClientRect().height - 24;
      const beforeOverlap = campaignStart + height - window.innerHeight;
      window.scrollTo({ top: Math.max(0, Math.min(targetScroll, beforeOverlap)), behavior: 'instant' });
    }
  });
  measure();
  document.fonts.ready.then(schedule);
  window.addEventListener('pagehide', () => { if (frame) cancelAnimationFrame(frame); });
}

export {};
