const dialog = document.querySelector<HTMLDialogElement>('#project-dialog')!;
const panelContent = dialog.querySelector<HTMLDivElement>('.dialog-content')!;
const media = document.querySelector<HTMLDivElement>('#dialog-media')!;
const title = document.querySelector<HTMLElement>('#dialog-title')!;
const description = document.querySelector<HTMLElement>('#dialog-description')!;
const status = document.querySelector<HTMLElement>('#media-status')!;
const templates = [...document.querySelectorAll<HTMLTemplateElement>('template[data-project-template]')];
const thumbnails = [...dialog.querySelectorAll<HTMLButtonElement>('[data-dialog-project]')];
const arrows = [...dialog.querySelectorAll<HTMLButtonElement>('.dialog-arrow')];
const focusButton = dialog.querySelector<HTMLButtonElement>('.dialog-focus')!;
const shell = dialog.querySelector<HTMLElement>('.dialog-shell')!;
const focusExtras = [...dialog.querySelectorAll<HTMLElement>('.dialog-gallery, .dialog-info, .dialog-arrow')];
let focusChanging = false;
let focusAnimations: Animation[] = [];
let activeIndex = 0;
let trigger: HTMLButtonElement | null = null;
let loadTimer: ReturnType<typeof setTimeout> | undefined;
const contentItems = [media, title, description];
let contentAnimations: Animation[] = [];

function imageErrors(root: ParentNode) {
  root.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      const message = document.createElement('span');
      message.className = 'media-failure';
      message.textContent = 'Image unavailable';
      img.replaceWith(message);
    }, { once: true });
  });
}
imageErrors(document);

function showProject(index: number, switching = false) {
  clearMedia();
  activeIndex = index;
  const template = templates[index];
  const ratio = Number(template.dataset.ratio);
  dialog.style.setProperty('--media-ratio', String(Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9));
  media.classList.toggle('has-video', Boolean(template.dataset.embed));
  title.textContent = template.dataset.title || '';
  description.textContent = template.dataset.description || '';
  arrows.forEach(button => { button.disabled = templates.length < 2; });
  thumbnails.forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.dialogProject === template.dataset.projectTemplate)); });
  if (template.dataset.embed) {
    status.textContent = 'Loading video player…';
    const iframe = document.createElement('iframe');
    iframe.className = 'video-frame';
    iframe.title = `Video: ${template.dataset.title}`;
    iframe.allow = 'fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.src = template.dataset.embed;
    iframe.addEventListener('load', () => {
      if (!iframe.isConnected) return;
      clearTimeout(loadTimer);
      status.textContent = 'Video player loaded.';
    });
    loadTimer = setTimeout(() => { status.textContent = 'The video player is taking longer than usual to load.'; }, 12000);
    media.append(iframe);
  } else {
    media.append(template.content.cloneNode(true));
    imageErrors(media);
  }
  if (switching) {
    thumbnails[index]?.scrollIntoView({ block: 'nearest', inline: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      contentAnimations = contentItems.map(element => element.animate([
        { opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 220, easing: 'ease-out', fill: 'both' }));
      contentAnimations.forEach(animation => animation.finished.then(() => animation.cancel()).catch(() => {}));
    }
  }
}

document.querySelectorAll<HTMLButtonElement>('button[data-project]').forEach(button => {
  button.addEventListener('click', () => {
    const index = templates.findIndex(item => item.dataset.projectTemplate === button.dataset.project);
    if (index < 0) return;
    const card = button.getBoundingClientRect();
    trigger = button;
    showProject(index);
    dialog.showModal();
    thumbnails[index]?.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'instant' });
    const panel = panelContent.getBoundingClientRect();
    dialog.style.setProperty('--open-x', `${card.left + card.width / 2 - panel.left - panel.width / 2}px`);
    dialog.style.setProperty('--open-y', `${card.top + card.height / 2 - panel.top - panel.height / 2}px`);
    dialog.style.setProperty('--open-scale', String(Math.min(.85, Math.max(.2, card.width / panel.width))));
    dialog.classList.add('is-opening');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      contentAnimations = contentItems.map((element, index) => element.animate([
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 220, delay: 440 + index * 60, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' }));
      contentAnimations.forEach(animation => animation.finished.then(() => animation.cancel()).catch(() => {}));
    }
  });
});

function navigate(direction: number) {
  if (!dialog.open || dialog.classList.contains('is-closing') || templates.length < 2) return;
  showProject((activeIndex + direction + templates.length) % templates.length, true);
}
document.querySelector('.dialog-prev')!.addEventListener('click', () => navigate(-1));
document.querySelector('.dialog-next')!.addEventListener('click', () => navigate(1));
thumbnails.forEach((button, index) => button.addEventListener('click', () => {
  if (index !== activeIndex && !dialog.classList.contains('is-closing')) showProject(index, true);
}));
dialog.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && !(event.target instanceof Element && event.target.closest('.dialog-info'))) {
    event.preventDefault();
    navigate(event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1);
  }
});
dialog.addEventListener('transitionend', event => {
  if (event.target === panelContent && event.propertyName === 'width' && dialog.open && !dialog.classList.contains('is-closing')) {
    thumbnails[activeIndex]?.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'instant' });
  }
});
function clearMedia() {
  contentAnimations.forEach(animation => animation.cancel());
  contentAnimations = [];
  clearTimeout(loadTimer);
  media.replaceChildren();
  status.textContent = '';
}
async function closeProject() {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  focusAnimations.forEach(animation => animation.cancel());
  const current = getComputedStyle(panelContent);
  const from = { transform: current.transform, opacity: current.opacity };
  dialog.classList.remove('is-opening');
  dialog.classList.add('is-closing');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const contentFrom = contentItems.map(element => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, transform: style.transform };
    });
    contentAnimations.forEach(animation => animation.cancel());
    contentAnimations = contentItems.map((element, index) => element.animate([
      contentFrom[index], { opacity: 0, transform: 'translateY(6px)' },
    ], { duration: 120, easing: 'ease-in', fill: 'forwards' }));
    const animation = panelContent.animate([
      from,
      { transform: 'translate(var(--open-x), var(--open-y)) scale(var(--open-scale))', opacity: 0 },
    ], { duration: 280, delay: 120, easing: 'cubic-bezier(.4, 0, .8, .4)', fill: 'forwards' });
    await animation.finished.catch(() => {});
    dialog.close();
    animation.cancel();
  } else {
    dialog.close();
  }
}
document.querySelector('.dialog-close')!.addEventListener('click', closeProject);
focusButton.addEventListener('click', async () => {
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (focusChanging || dialog.classList.contains('is-closing') || (motion && dialog.classList.contains('is-opening'))) return;
  focusChanging = true;
  dialog.classList.add('is-focus-changing');
  const focused = !dialog.classList.contains('is-focused');
  const visibleExtras = focusExtras.filter(element => element.getClientRects().length);
  const before = shell.getBoundingClientRect();
  try {
    if (motion && focused) {
      focusAnimations = visibleExtras.map(element => element.animate([
        { opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(6px)' },
      ], { duration: 140, easing: 'ease-in', fill: 'forwards' }));
      await Promise.all(focusAnimations.map(animation => animation.finished.catch(() => {})));
      if (!dialog.open || dialog.classList.contains('is-closing')) return;
    }
    dialog.classList.toggle('is-focused', focused);
    focusButton.setAttribute('aria-pressed', String(focused));
    focusButton.setAttribute('aria-label', focused ? 'Exit focus mode' : 'Enter focus mode');
    focusButton.title = focused ? 'Exit focus mode' : 'Focus mode';
    if (motion) {
      const after = shell.getBoundingClientRect();
      const transform = `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width}, ${before.height / after.height})`;
      focusAnimations.push(shell.animate([
        { transform, transformOrigin: 'top left' }, { transform: 'none', transformOrigin: 'top left' },
      ], { duration: 320, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' }));
      if (!focused) {
        focusAnimations.push(...focusExtras.filter(element => element.getClientRects().length).map(element => element.animate([
          { opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 220, delay: 100, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' })));
      }
      await Promise.all(focusAnimations.map(animation => animation.finished.catch(() => {})));
    }
  } finally {
    focusAnimations.forEach(animation => animation.cancel());
    focusAnimations = [];
    dialog.classList.remove('is-focus-changing');
    focusChanging = false;
  }
});
dialog.addEventListener('animationend', event => {
  if (event.target === panelContent) dialog.classList.remove('is-opening');
});
dialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
let startedOutside = false;
dialog.addEventListener('pointerdown', event => { startedOutside = event.target === dialog; });
dialog.addEventListener('click', event => { if (startedOutside && event.target === dialog) closeProject(); });
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  dialog.classList.remove('is-opening', 'is-closing');
  dialog.classList.remove('is-focused');
  focusButton.setAttribute('aria-pressed', 'false');
  focusButton.setAttribute('aria-label', 'Enter focus mode');
  focusButton.title = 'Focus mode';
  clearMedia();
  trigger?.focus({ preventScroll: true });
});
