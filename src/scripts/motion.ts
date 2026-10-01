const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const revealItems = document.querySelectorAll<HTMLElement>('.hero-description p span, .section-heading, .work-card, .collection-top, #collection-title, .service-row, .clients-heading, .client-logos li, .about .eyebrow, .about h2, .about-bottom > p, .connect');
let nextWorkReveal = 0;
const revealObserver = new IntersectionObserver(entries => {
  entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
    const element = entry.target as HTMLElement;
    if (element.matches('.work-card')) {
      const now = performance.now();
      const start = Math.max(now, nextWorkReveal);
      element.style.transitionDelay = `${start - now}ms`;
      nextWorkReveal = start + 180;
    } else if (element.matches('.hero-description p span')) {
      element.style.transitionDelay = element.previousElementSibling ? '180ms' : '60ms';
    } else element.style.transitionDelay = `${Math.min(index, 3) * 90}ms`;
    element.classList.remove('reveal-pending');
    revealObserver.unobserve(element);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

if (!reducedMotion.matches) revealItems.forEach(element => {
  element.classList.add('scroll-reveal', 'reveal-pending');
  revealObserver.observe(element);
});
document.addEventListener('focusin', event => {
  const element = (event.target as HTMLElement).closest<HTMLElement>('.scroll-reveal');
  if (element) {
    element.style.transitionDelay = '0ms';
    element.classList.remove('reveal-pending');
    revealObserver.unobserve(element);
  }
});

const finePointer = matchMedia('(pointer: fine)');
const header = document.querySelector('.site-header');
let scrollTarget = scrollY;
let scrollFrame = 0;
let previousTime = 0;
let lastWrittenPosition = scrollY;

function stopScroll() {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
  scrollTarget = scrollY;
}
function easeScroll(time: number) {
  if (reducedMotion.matches || document.querySelector('dialog[open]')) return stopScroll();
  const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  scrollTarget = Math.max(0, Math.min(max, scrollTarget));
  const distance = scrollTarget - scrollY;
  const elapsed = Math.min(time - previousTime, 32);
  previousTime = time;
  const step = Math.sign(distance) * Math.max(1, Math.abs(distance) * (1 - Math.exp(-elapsed / 90)));
  window.scrollTo({ top: Math.abs(distance) <= 1 ? scrollTarget : scrollY + step, behavior: 'instant' });
  lastWrittenPosition = scrollY;
  if (Math.abs(scrollTarget - scrollY) <= 1) {
    window.scrollTo({ top: scrollTarget, behavior: 'instant' });
    scrollFrame = 0;
  } else scrollFrame = requestAnimationFrame(easeScroll);
}

window.addEventListener('wheel', event => {
  if (reducedMotion.matches || !finePointer.matches || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || document.querySelector('dialog[open]')) return;
  let node = event.target instanceof Element ? event.target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.matches('input, textarea, select, [contenteditable="true"]') || (/auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight)) return;
    node = node.parentElement;
  }
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  if (!delta) return;
  event.preventDefault();
  if (!scrollFrame) scrollTarget = scrollY;
  scrollTarget = Math.max(0, Math.min(document.documentElement.scrollHeight - document.documentElement.clientHeight, scrollTarget + delta));
  if (!scrollFrame) {
    previousTime = performance.now();
    lastWrittenPosition = scrollY;
    scrollFrame = requestAnimationFrame(easeScroll);
  }
}, { passive: false });

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', scrollY > 32);
  if (scrollFrame && Math.abs(scrollY - lastWrittenPosition) > 2) stopScroll();
}, { passive: true });
window.addEventListener('pointerdown', stopScroll, { passive: true });
window.addEventListener('touchstart', stopScroll, { passive: true });
window.addEventListener('keydown', stopScroll);
window.addEventListener('resize', stopScroll);
document.addEventListener('visibilitychange', stopScroll);
finePointer.addEventListener('change', stopScroll);
reducedMotion.addEventListener('change', () => {
  stopScroll();
  if (reducedMotion.matches) {
    revealObserver.disconnect();
    revealItems.forEach(element => element.classList.remove('reveal-pending'));
  }
});
