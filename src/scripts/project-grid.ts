const grid = document.querySelector<HTMLElement>('#projects-grid')!;
const pill = document.querySelector<HTMLElement>('.filter-pill')!;
const buttons = [...pill.querySelectorAll<HTMLButtonElement>('button[data-filter]')];
const menus = [...pill.querySelectorAll<HTMLElement>('.kind-menu')];
const subButtons = [...pill.querySelectorAll<HTMLButtonElement>('button[data-sub]')];
const chip = document.querySelector<HTMLButtonElement>('.category-chip')!;
const cards = [...grid.querySelectorAll<HTMLButtonElement>('.project-tile')];
const searchBox = pill.querySelector<HTMLElement>('.search-box')!;
const searchToggle = pill.querySelector<HTMLButtonElement>('.search-toggle')!;
const search = document.querySelector<HTMLInputElement>('#project-search')!;
const clientTitles: Record<string, string> = JSON.parse(grid.dataset.clientTitles || '{}');
const count = document.querySelector<HTMLElement>('#project-count')!;
const empty = document.querySelector<HTMLElement>('#projects-empty')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const touch = matchMedia('(hover: none)');

// No type is chosen at first, so the archive opens on every project.
let kind: string | null = null;
const params = new URLSearchParams(location.search);
let category = params.get('category');
let client = params.get('client');
let terms: string[] = [];
let sub = 'all';
let busy = false;

function applyFilter() {
  cards.forEach(card => {
    card.hidden = (!!kind && card.dataset.kind !== kind)
      || (!!category && card.dataset.category !== category)
      || (!!client && !card.dataset.clients?.split(' ').includes(client))
      || (sub !== 'all' && !card.dataset.categories?.split(' ').includes(sub))
      || !terms.every(term => card.dataset.search?.includes(term));
  });
  buttons.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.filter === kind)));
  subButtons.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.kind === kind && option.dataset.sub === sub)));
  const visible = cards.filter(card => !card.hidden).length;
  const title = kind ? subButtons.find(option => option.dataset.kind === kind && option.dataset.sub === sub)?.dataset.title : '';
  const clientName = client ? clientTitles[client] ?? client : '';
  const label = [category, clientName, title].filter(Boolean).join(' · ');
  count.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}${label ? ` · ${label}` : ''}`;
  empty.hidden = visible > 0;
  empty.textContent = terms.length ? `No projects match “${search.value.trim()}”.` : label ? `No ${label} projects yet. Check back soon or show all projects.` : 'New projects are on the way.';
  chip.hidden = !label;
  chip.querySelector('.category-name')!.textContent = label;
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

function closeMenus(except?: Element | null) {
  menus.forEach(menu => {
    if (menu === except) return;
    menu.classList.remove('is-open');
    menu.querySelector('[data-filter]')!.setAttribute('aria-expanded', 'false');
  });
}
function choose(nextKind: string, nextSub: string) {
  closeMenus();
  if (nextKind === kind && nextSub === sub) return;
  update(() => { kind = nextKind; sub = nextSub; });
}

// Hover opens a type's dropdown (CSS); a click picks every project of that type.
// Touch screens have no hover, so the first tap opens the dropdown instead.
buttons.forEach(button => button.addEventListener('click', () => {
  const menu = button.closest('.kind-menu')!;
  if ((touch.matches || button.dataset.soon) && !menu.classList.contains('is-open')) {
    closeMenus(menu);
    menu.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    return;
  }
  // A coming-soon type has nothing to filter yet.
  if (button.dataset.soon) return;
  choose(button.dataset.filter!, 'all');
}));
menus.forEach(menu => {
  const button = menu.querySelector<HTMLButtonElement>('[data-filter]')!;
  menu.addEventListener('pointerenter', () => { if (!touch.matches) button.setAttribute('aria-expanded', 'true'); });
  menu.addEventListener('pointerleave', () => { if (!touch.matches) button.setAttribute('aria-expanded', 'false'); });
  menu.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    menu.classList.add('is-dismissed');
    button.focus();
  });
  menu.addEventListener('focusout', event => { if (!menu.contains(event.relatedTarget as Node)) menu.classList.remove('is-dismissed'); });
  menu.addEventListener('pointerleave', () => menu.classList.remove('is-dismissed'));
});
subButtons.forEach(button => button.addEventListener('click', () => choose(button.dataset.kind!, button.dataset.sub!)));
document.addEventListener('click', event => { if (!(event.target as Element).closest('.kind-menu')) closeMenus(); });

// The search icon opens the field inside the pill; an empty field closes again when it loses focus.
function setSearch(open: boolean) {
  searchBox.classList.toggle('is-open', open);
  searchToggle.setAttribute('aria-expanded', String(open));
  search.tabIndex = open ? 0 : -1;
}
searchToggle.addEventListener('click', () => {
  setSearch(true);
  search.focus();
});
search.addEventListener('blur', () => { if (!search.value) setSearch(false); });
search.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  search.value = '';
  search.dispatchEvent(new Event('input'));
  searchToggle.focus();
});
// Typing filters in place; the column slide is kept for the buttons so every keystroke does not replay it.
search.addEventListener('input', () => {
  terms = search.value.toLowerCase().split(/\s+/).filter(Boolean);
  applyFilter();
  queueParallax();
});
chip.addEventListener('click', () => update(() => {
  kind = null;
  sub = 'all';
  category = null;
  client = null;
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

pill.hidden = false;
applyFilter();
updateParallax();
if (!reducedMotion.matches) {
  busy = true;
  slide('in').then(() => { clearAnimations(); queueParallax(); busy = false; });
}
grid.classList.add('is-ready');

// Leaving for the homepage mirrors the entrance: the columns slide out, then the page changes.
document.querySelectorAll<HTMLAnchorElement>('.site-header a').forEach(link => link.addEventListener('click', event => {
  if (reducedMotion.matches || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (new URL(link.href).pathname.startsWith('/projects')) return;
  event.preventDefault();
  busy = true;
  closeMenus();
  slide('out').then(() => { location.href = link.href; });
}));
// Back from the homepage restores this page from the cache with the tiles still slid out.
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  clearAnimations();
  busy = false;
});
