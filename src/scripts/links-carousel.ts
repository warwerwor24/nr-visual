const carousel = document.querySelector<HTMLUListElement>('.links-carousel');
const controls = document.querySelector<HTMLDivElement>('.links-carousel-controls');

if (carousel && controls) {
  const cards = [...carousel.querySelectorAll<HTMLLIElement>('li')];
  const previous = controls.querySelector<HTMLButtonElement>('[data-carousel-prev]')!;
  const next = controls.querySelector<HTMLButtonElement>('[data-carousel-next]')!;
  const count = document.querySelector<HTMLElement>('[data-carousel-count]')!;
  const frame = carousel.closest<HTMLDivElement>('.links-carousel-frame')!;
  const dialog = document.querySelector<HTMLDialogElement>('#project-dialog')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let touching = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  function update() {
    const left = carousel!.getBoundingClientRect().left + 4;
    active = cards.reduce((closest, card, index) =>
      Math.abs(card.getBoundingClientRect().left - left) < Math.abs(cards[closest].getBoundingClientRect().left - left) ? index : closest, 0);
    previous.disabled = active === 0;
    next.disabled = active === cards.length - 1;
    carousel!.classList.toggle('is-at-end', carousel!.scrollLeft >= carousel!.scrollWidth - carousel!.clientWidth - 1);
    const text = `${active + 1} / ${cards.length}`;
    if (count.textContent !== text) count.textContent = text;
  }

  function show(index: number) {
    carousel!.scrollTo({ left: cards[index].offsetLeft - 4, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  function syncAutoplay() {
    clearInterval(timer);
    const blocked = reducedMotion.matches || document.hidden || touching || dialog.open
      || frame.contains(document.activeElement) || (matchMedia('(hover: hover)').matches && frame.matches(':hover'));
    count.setAttribute('aria-live', blocked ? 'polite' : 'off');
    if (!blocked) timer = setInterval(() => show((active + 1) % cards.length), 2000);
  }

  previous.addEventListener('click', () => show(Math.max(0, active - 1)));
  next.addEventListener('click', () => show(Math.min(cards.length - 1, active + 1)));
  frame.addEventListener('pointerenter', syncAutoplay);
  frame.addEventListener('pointerleave', syncAutoplay);
  frame.addEventListener('pointerdown', () => { touching = true; syncAutoplay(); });
  document.addEventListener('pointerup', () => { touching = false; syncAutoplay(); });
  document.addEventListener('pointercancel', () => { touching = false; syncAutoplay(); });
  frame.addEventListener('focusin', syncAutoplay);
  frame.addEventListener('focusout', () => setTimeout(syncAutoplay, 0));
  document.addEventListener('visibilitychange', syncAutoplay);
  reducedMotion.addEventListener('change', syncAutoplay);
  new MutationObserver(syncAutoplay).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  carousel.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  controls.hidden = false;
  update();
  syncAutoplay();
}
