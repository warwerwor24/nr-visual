const grid = document.querySelector<HTMLElement>('#projects-grid')!;
const filters = document.querySelector<HTMLElement>('.project-filters')!;
const buttons = [...filters.querySelectorAll<HTMLButtonElement>('button[data-filter]')];
const chip = document.querySelector<HTMLButtonElement>('.category-chip')!;
const cards = [...grid.querySelectorAll<HTMLButtonElement>('.project-tile')];
const count = document.querySelector<HTMLElement>('#project-count')!;
const empty = document.querySelector<HTMLElement>('#projects-empty')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let kind = 'all';
let category = new URLSearchParams(location.search).get('category');
let busy = false;

function applyFilter() {
  cards.forEach(card => { card.hidden = (kind !== 'all' && card.dataset.kind !== kind) || (!!category && card.dataset.category !== category); });
  const visible = cards.filter(card => !card.hidden).length;
  const label = [category, kind === 'all' ? '' : kind].filter(Boolean).join(' ');
  count.textContent = `${visible} ${label ? `${label} ` : ''}${visible === 1 ? 'project' : 'projects'}`;
  empty.hidden = visible > 0;
  empty.textContent = label ? `No ${label} projects yet. Check back soon or show all projects.` : 'New projects are on the way.';
  chip.hidden = !category;
  chip.querySelector('.category-name')!.textContent = category ?? '';
}

// Columns travel as one strip: odd columns from above, even columns from below, 50 ms apart.
// Opacity rides along so the strip never appears or vanishes with a hard edge.
function slide(direction: 'in' | 'out') {
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  return Promise.all(cards.filter(card => !card.hidden).map((card, index) => {
    const column = index % columns;
    const offscreen = { transform: `translateY(${column % 2 ? 70 : -70}vh)`, opacity: 0 };
    const onscreen = { transform: 'translateY(0)', opacity: 1 };
    return card.animate(direction === 'in' ? [offscreen, onscreen] : [onscreen, offscreen], {
      duration: direction === 'in' ? 1100 : 600,
      delay: column * 50,
      easing: direction === 'in' ? 'cubic-bezier(.22,1,.36,1)' : 'cubic-bezier(.55,0,.45,1)',
      fill: 'both',
    }).finished;
  }));
}
function clearAnimations() {
  cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
}

async function update(change: () => void) {
  if (busy) return;
  if (reducedMotion.matches) {
    change();
    applyFilter();
    return queueParallax();
  }
  busy = true;
  await slide('out');
  change();
  applyFilter();
  window.scrollTo({ top: 0, behavior: 'instant' });
  clearAnimations();
  updateParallax();
  await slide('in');
  clearAnimations();
  queueParallax();
  busy = false;
}

buttons.forEach(button => button.addEventListener('click', () => update(() => {
  kind = button.dataset.filter!;
  buttons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
})));
chip.addEventListener('click', () => update(() => {
  category = null;
  history.replaceState(null, '', location.pathname);
}));

// Each cover drifts inside its frame relative to the screen center; the frame crops the overscan.
// Positions come from layout offsets, not the sliding transform, so the cover never jumps when the slide ends.
let parallaxFrame = 0;
function layoutTop(element: HTMLElement) {
  let top = 0;
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
  return top;
}
function updateParallax() {
  parallaxFrame = 0;
  cards.forEach(card => {
    if (card.hidden) return;
    const top = layoutTop(card) - scrollY;
    if (top + card.offsetHeight < -200 || top > innerHeight + 200) return;
    card.style.setProperty('--parallax', ((top + card.offsetHeight / 2 - innerHeight / 2) / innerHeight).toFixed(3));
  });
}
function queueParallax() {
  if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateParallax);
}
window.addEventListener('scroll', queueParallax, { passive: true });
window.addEventListener('resize', queueParallax);

filters.hidden = false;
applyFilter();
updateParallax();
if (!reducedMotion.matches) {
  busy = true;
  slide('in').then(() => { clearAnimations(); queueParallax(); busy = false; });
}
grid.classList.add('is-ready');
