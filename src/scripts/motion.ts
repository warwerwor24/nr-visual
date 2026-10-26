const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const revealItems = document.querySelectorAll<HTMLElement>('.section-label, .work-intro, .work-card:not(.project-tile), #collection-title, .service-row, .client-logos li, #clients-title, .about h2, .about-tagline, .connect, .projects-bar');
let nextWorkReveal = 0;
const revealObserver = new IntersectionObserver(entries => {
  entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
    const element = entry.target as HTMLElement;
    if (element.matches('.work-card')) {
      const now = performance.now();
      const start = Math.max(now, nextWorkReveal);
      element.style.transitionDelay = `${start - now}ms`;
      nextWorkReveal = start + 180;
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

// Trackpads send small, fractional or sideways deltas; once seen, leave scrolling native for the rest of the gesture.
let trackpadUntil = 0;
function isMouseWheel(event: WheelEvent) {
  if (event.deltaMode !== 0) return true;
  const trackpadLike = event.deltaX !== 0 || !Number.isInteger(event.deltaY) || Math.abs(event.deltaY) < 50;
  if (trackpadLike) trackpadUntil = event.timeStamp + 400;
  return !trackpadLike && event.timeStamp > trackpadUntil;
}

// Desktop: one wheel gesture, key press or nav click moves exactly one fullscreen section (or one project row).
const snapSections = [...document.querySelectorAll<HTMLElement>('main > section')];
const snapSize = matchMedia('(min-width: 1000px) and (min-height: 700px)');
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.site-header nav a[href^="#"]')];
let snapping = false;
let lastWheel = 0;
let gestureUsed = false;

const projectGrid = document.querySelector<HTMLElement>('#projects-grid');

// The homepage snaps whole sections; All Projects snaps row by row with the row centered on screen.
function snapTargets() {
  if (!projectGrid) return snapSections;
  const rows = new Map<number, HTMLElement>();
  projectGrid.querySelectorAll<HTMLElement>('.project-tile:not([hidden])').forEach(tile => { if (!rows.has(tile.offsetTop)) rows.set(tile.offsetTop, tile); });
  return [...rows.values()];
}
function snapActive() {
  return snapTargets().length > 1 && snapSize.matches && finePointer.matches && !reducedMotion.matches && !document.querySelector('dialog[open]');
}
// Layout position from offsets, so tiles still sliding in (transformed) report where they will land.
function sectionTop(section: HTMLElement) {
  const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  let top = 0;
  for (let node: HTMLElement | null = section; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
  const offset = projectGrid ? (innerHeight - section.offsetHeight) / 2 : 0;
  return Math.max(0, Math.min(max, Math.round(top - offset)));
}
function currentSection() {
  let index = 0;
  snapTargets().forEach((section, i) => { if (sectionTop(section) <= scrollY + 2) index = i; });
  return index;
}
function snapTo(index: number) {
  const targets = snapTargets();
  const start = scrollY;
  const distance = sectionTop(targets[Math.max(0, Math.min(targets.length - 1, index))]) - start;
  stopScroll();
  if (Math.abs(distance) < 2) return;
  snapping = true;
  const began = performance.now();
  const step = (time: number) => {
    const t = Math.min(1, (time - began) / 900);
    const eased = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    window.scrollTo({ top: start + distance * eased, behavior: 'instant' });
    if (t < 1) requestAnimationFrame(step);
    else snapping = false;
  };
  requestAnimationFrame(step);
}
function snapWheel(event: WheelEvent) {
  // Trackpad inertia keeps firing after the move; events closer than 160 ms belong to the same gesture.
  const continuing = event.timeStamp - lastWheel < 160;
  lastWheel = event.timeStamp;
  if (!continuing) gestureUsed = false;
  if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  const direction = Math.sign(event.deltaY);
  const index = currentSection();
  const bounds = snapTargets()[index].getBoundingClientRect();
  // A section taller than the screen scrolls natively until its edge is reached.
  if (!snapping && !projectGrid && ((direction > 0 && bounds.bottom > innerHeight + 2) || (direction < 0 && bounds.top < -2))) return;
  event.preventDefault();
  if (snapping || gestureUsed || !direction) return;
  gestureUsed = true;
  snapTo(index + direction);
}

window.addEventListener('keydown', event => {
  if (!snapActive() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target instanceof Element ? event.target : document.body;
  if (target.closest('input, textarea, select, [contenteditable="true"]') || (event.key === ' ' && target.closest('a, button'))) return;
  const index = currentSection();
  const next = ({ ArrowDown: index + 1, PageDown: index + 1, ' ': event.shiftKey ? index - 1 : index + 1, ArrowUp: index - 1, PageUp: index - 1, Home: 0, End: snapTargets().length - 1 } as Record<string, number>)[event.key];
  if (next === undefined) return;
  event.preventDefault();
  if (!snapping) snapTo(next);
});
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const index = snapSections.findIndex(section => `#${section.id}` === link.hash);
  if (index < 0 || !snapActive()) return;
  event.preventDefault();
  history.pushState(null, '', link.hash);
  snapTo(index);
}));
function markCurrentSection() {
  if (!navLinks.length || snapSections.length < 2) return;
  const id = snapSections[currentSection()].id;
  navLinks.forEach(link => link.setAttribute('aria-current', String(link.hash === `#${id}`)));
}

// The contact section and footer share the last screen.
const footer = document.querySelector<HTMLElement>('.footer');
if (footer) new ResizeObserver(() => document.documentElement.style.setProperty('--footer-h', `${footer.offsetHeight}px`)).observe(footer);

window.addEventListener('wheel', event => {
  if (snapActive()) return snapWheel(event);
  if (!isMouseWheel(event)) return stopScroll();
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
  markCurrentSection();
}, { passive: true });
markCurrentSection();
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
