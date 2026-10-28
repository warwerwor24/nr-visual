// Motion values come from the CSS tokens so JS animations match the stylesheet.
const cssToken = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// The minifier may rewrite 360ms as .36s, so honour the unit.
const motion = (name: string) => { const value = cssToken(name); return (parseFloat(value) || 0) * (/\dms$/.test(value) ? 1 : /s$/.test(value) ? 1000 : 1); };
const motionEase = () => cssToken('--ease') || 'ease-out';
const canMorph = () => 'startViewTransition' in document && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const dialog = document.querySelector<HTMLDialogElement>('#project-dialog')!;
const panelContent = dialog.querySelector<HTMLDivElement>('.dialog-content')!;
const media = document.querySelector<HTMLDivElement>('#dialog-media')!;
const title = document.querySelector<HTMLElement>('#dialog-title')!;
const description = document.querySelector<HTMLElement>('#dialog-description')!;
const meta = document.querySelector<HTMLDListElement>('#dialog-meta')!;
// While a project is open the address bar shows its /projects/<slug>/ link, so visitors can copy and share it.
let returnUrl: string | null = null;
let returnTitle: string | null = null;
const status = document.querySelector<HTMLElement>('#media-status')!;
const templates = [...document.querySelectorAll<HTMLTemplateElement>('template[data-project-template]')];
const thumbnails = [...dialog.querySelectorAll<HTMLButtonElement>('[data-dialog-project]')];
const arrows = [...dialog.querySelectorAll<HTMLButtonElement>('.dialog-arrow')];
const focusButton = dialog.querySelector<HTMLButtonElement>('.dialog-focus')!;
const shell = dialog.querySelector<HTMLElement>('.dialog-shell')!;
const focusExtras = [...dialog.querySelectorAll<HTMLElement>('.dialog-gallery, .dialog-info, .dialog-info-toggle, .dialog-arrow')];
const info = dialog.querySelector<HTMLElement>('.dialog-info')!;
const infoToggle = dialog.querySelector<HTMLButtonElement>('.dialog-info-toggle')!;
let focusChanging = false;
let focusAnimations: Animation[] = [];
let activeIndex = 0;
let trigger: HTMLButtonElement | null = null;
let loadTimer: ReturnType<typeof setTimeout> | undefined;
const contentItems = [media, title, description];
let contentAnimations: Animation[] = [];
const photoViewer = dialog.querySelector<HTMLElement>('.photo-viewer')!;
const photoImage = photoViewer.querySelector<HTMLImageElement>('.photo-view-image')!;
const photoStatus = photoViewer.querySelector<HTMLElement>('.photo-view-status')!;
const filmstrip = photoViewer.querySelector<HTMLElement>('.photo-filmstrip')!;
const photoBack = photoViewer.querySelector<HTMLButtonElement>('.photo-back')!;
const photoPrev = photoViewer.querySelector<HTMLButtonElement>('.photo-prev')!;
const photoNext = photoViewer.querySelector<HTMLButtonElement>('.photo-next')!;
let albumPhotos: HTMLImageElement[] = [];
let photoIndex = 0;
let albumScroll = 0;
let photoAnimations: Animation[] = [];

function showPhoto(index: number) {
  if (index < 0 || index >= albumPhotos.length) return;
  const opening = photoViewer.hidden;
  const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const source = opening ? media.querySelector<HTMLImageElement>(`[data-photo-index="${index}"] img`)?.getBoundingClientRect() : undefined;
  photoAnimations.forEach(animation => animation.cancel());
  photoAnimations = [];
  if (opening) {
    albumScroll = dialog.scrollTop;
    contentAnimations.forEach(animation => animation.cancel());
    contentAnimations = [];
    panelContent.inert = true;
    panelContent.setAttribute('aria-hidden', 'true');
    filmstrip.replaceChildren(...albumPhotos.map((photo, number) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'photo-thumbnail';
      button.setAttribute('aria-label', `View photo ${number + 1}: ${photo.alt}`);
      const image = document.createElement('img');
      image.src = photo.src;
      image.alt = '';
      image.loading = 'lazy';
      image.onerror = () => { image.hidden = true; };
      button.append(image);
      button.addEventListener('click', () => showPhoto(number));
      item.append(button);
      return item;
    }));
    photoViewer.querySelector<HTMLElement>('#photo-view-title')!.textContent = title.textContent;
    const date = photoViewer.querySelector<HTMLTimeElement>('.photo-view-date')!;
    const completedAt = templates[activeIndex].dataset.completedAt || '';
    const parsed = new Date(completedAt);
    date.hidden = !completedAt || Number.isNaN(parsed.getTime());
    date.dateTime = completedAt;
    date.textContent = date.hidden ? '' : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    dialog.setAttribute('aria-labelledby', 'photo-view-title');
    dialog.classList.add('is-photo-view');
    photoViewer.hidden = false;
    dialog.scrollTop = 0;
    panelContent.scrollTop = albumScroll;
    photoBack.focus();
    if (animate) {
      photoAnimations = [...photoViewer.querySelectorAll<HTMLElement>('.photo-view-header, .photo-peek, .photo-step, .photo-filmstrip, .photo-view-status')].map(element => element.animate([
        { opacity: 0 }, { opacity: getComputedStyle(element).opacity },
      ], { duration: motion('--dur-base'), easing: motionEase(), fill: 'both' }));
      photoAnimations.forEach(animation => animation.finished.then(() => animation.cancel()).catch(() => {}));
    }
  }
  photoIndex = index;
  photoImage.hidden = false;
  photoImage.alt = albumPhotos[index].alt;
  photoStatus.textContent = 'Loading photo…';
  photoImage.style.opacity = opening && animate ? '0' : '';
  photoImage.onload = () => {
    photoStatus.textContent = `${index + 1} / ${albumPhotos.length}`;
    photoImage.style.opacity = '';
    if (!opening || !animate) return;
    const target = photoImage.getBoundingClientRect();
    const transform = source && source.width && source.height && target.width && target.height
      ? `translate(${source.left - target.left}px, ${source.top - target.top}px) scale(${source.width / target.width}, ${source.height / target.height})`
      : 'scale(.92)';
    const animation = photoImage.animate([
      { transform, transformOrigin: 'top left', opacity: .6 },
      { transform: 'none', transformOrigin: 'top left', opacity: 1 },
    ], { duration: motion('--dur-slow'), easing: motionEase(), fill: 'both' });
    photoAnimations.push(animation);
    animation.finished.then(() => animation.cancel()).catch(() => {});
  };
  photoImage.onerror = () => { photoImage.style.opacity = ''; photoImage.hidden = true; photoStatus.textContent = 'Photo unavailable'; };
  photoImage.src = albumPhotos[index].dataset.fullSrc || albumPhotos[index].src;
  [photoPrev, photoNext].forEach((button, number) => {
    const adjacent = albumPhotos[index + (number === 0 ? -1 : 1)];
    button.disabled = !adjacent;
    const image = photoViewer.querySelector<HTMLImageElement>(number === 0 ? '.photo-peek-prev img' : '.photo-peek-next img')!;
    image.hidden = !adjacent;
    if (adjacent) image.src = adjacent.src;
    else image.removeAttribute('src');
    image.onerror = () => { image.hidden = true; };
  });
  [...filmstrip.querySelectorAll<HTMLButtonElement>('button')].forEach((button, number) => button.setAttribute('aria-pressed', String(number === index)));
  filmstrip.children[index]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
  if ((document.activeElement === photoPrev && photoPrev.disabled) || (document.activeElement === photoNext && photoNext.disabled)) photoBack.focus();
}

function backToAlbum(restoreFocus = true) {
  if (photoViewer.hidden) return;
  photoViewer.hidden = true;
  photoAnimations.forEach(animation => animation.cancel());
  photoAnimations = [];
  panelContent.inert = false;
  panelContent.removeAttribute('aria-hidden');
  panelContent.scrollTop = 0;
  dialog.classList.remove('is-photo-view');
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  photoImage.onload = photoImage.onerror = null;
  photoImage.style.opacity = '';
  photoImage.removeAttribute('src');
  filmstrip.replaceChildren();
  if (restoreFocus) {
    dialog.scrollTop = albumScroll;
    media.querySelector<HTMLButtonElement>(`[data-photo-index="${photoIndex}"]`)?.focus({ preventScroll: true });
  }
}

photoBack.addEventListener('click', () => backToAlbum());
photoPrev.addEventListener('click', () => showPhoto(photoIndex - 1));
photoNext.addEventListener('click', () => showPhoto(photoIndex + 1));
media.addEventListener('click', event => {
  const tile = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-photo-index]') : null;
  if (tile && dialog.classList.contains('is-photo-album')) showPhoto(Number(tile.dataset.photoIndex));
});
let photoTouch: { x: number; y: number } | null = null;
photoViewer.querySelector('.photo-view-stage')!.addEventListener('touchstart', event => {
  const touch = (event as TouchEvent).touches[0];
  photoTouch = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
photoViewer.querySelector('.photo-view-stage')!.addEventListener('touchend', event => {
  const touch = (event as TouchEvent).changedTouches[0];
  if (!photoTouch) return;
  const dx = touch.clientX - photoTouch.x;
  const dy = touch.clientY - photoTouch.y;
  photoTouch = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) showPhoto(photoIndex + (dx < 0 ? 1 : -1));
}, { passive: true });

function imageErrors(root: ParentNode) {
  root.querySelectorAll('img').forEach(img => {
    if (img.closest('.photo-viewer')) return;
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
  dialog.classList.toggle('is-photo-album', template.dataset.kind === 'photo');
  albumPhotos = [...template.content.querySelectorAll<HTMLImageElement>('.photo-gallery img')];
  const ratio = Number(template.dataset.ratio);
  dialog.style.setProperty('--media-ratio', String(Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9));
  media.classList.toggle('has-video', Boolean(template.dataset.embed));
  title.textContent = template.dataset.title || '';
  description.textContent = template.dataset.description || '';
  infoToggle.hidden = !description.textContent;
  const year = template.dataset.completedAt?.slice(0, 4) || '';
  meta.replaceChildren(...([['Client', template.dataset.client], ['Role', template.dataset.role], ['Year', year]] as const)
    .filter(([, value]) => value)
    .map(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value!;
      row.append(term, detail);
      return row;
    }));
  if (template.dataset.slug) {
    returnUrl ??= location.pathname + location.search + location.hash;
    history.replaceState(history.state, '', `/projects/${template.dataset.slug}/`);
  }
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
    if (!albumPhotos.length) media.textContent = 'Photos have not been added to this album yet.';
  }
  if (switching) {
    thumbnails[index]?.scrollIntoView({ block: 'nearest', inline: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      contentAnimations = contentItems.map(element => element.animate([
        { opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' },
      ], { duration: motion('--dur-fast'), easing: motionEase(), fill: 'both' }));
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
    const isAlbum = templates[index].dataset.kind === 'photo';
    if (!isAlbum && canMorph()) {
      // The card morphs into the dialog panel; the old transform animation stays as the fallback.
      button.style.viewTransitionName = 'project-media';
      const transition = document.startViewTransition(() => {
        button.style.viewTransitionName = '';
        showProject(index);
        dialog.showModal();
        thumbnails[index]?.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'instant' });
        shell.style.viewTransitionName = 'project-media';
      });
      transition.finished.finally(() => { shell.style.viewTransitionName = ''; });
      return;
    }
    showProject(index);
    dialog.showModal();
    if (dialog.classList.contains('is-photo-album')) {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        contentAnimations = [...media.querySelectorAll<HTMLElement>('.photo-tile')].map(tile => tile.animate([
          { opacity: 0 }, { opacity: 1 },
        ], { duration: motion('--dur-base'), delay: Math.random() * motion('--dur-base'), easing: motionEase(), fill: 'both' }));
        contentAnimations.forEach(animation => animation.finished.then(() => animation.cancel()).catch(() => {}));
      }
      return;
    }
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
      ], { duration: motion('--dur-fast'), delay: motion('--dur-base') + index * 60, easing: motionEase(), fill: 'both' }));
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
  if (!photoViewer.hidden) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
    return;
  }
  if (dialog.classList.contains('is-photo-album')) return;
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
  backToAlbum(false);
  contentAnimations.forEach(animation => animation.cancel());
  contentAnimations = [];
  clearTimeout(loadTimer);
  media.replaceChildren();
  status.textContent = '';
}
async function closeProject() {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  focusAnimations.forEach(animation => animation.cancel());
  const target = trigger;
  if (target?.isConnected && !dialog.classList.contains('is-photo-album') && canMorph()) {
    dialog.classList.add('is-closing');
    shell.style.viewTransitionName = 'project-media';
    const transition = document.startViewTransition(() => {
      shell.style.viewTransitionName = '';
      dialog.close();
      target.style.viewTransitionName = 'project-media';
    });
    await transition.finished.catch(() => {});
    target.style.viewTransitionName = '';
    return;
  }
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
    ], { duration: motion('--dur-fast'), easing: motionEase(), fill: 'forwards' }));
    const animation = panelContent.animate([
      from,
      dialog.classList.contains('is-photo-album') ? { opacity: 0 } : { transform: 'translate(var(--open-x), var(--open-y)) scale(var(--open-scale))', opacity: 0 },
    ], { duration: motion('--dur-base'), delay: motion('--dur-fast'), easing: motionEase(), fill: 'forwards' });
    await animation.finished.catch(() => {});
    dialog.close();
    animation.cancel();
  } else {
    dialog.close();
  }
}
document.querySelector('.dialog-close')!.addEventListener('click', closeProject);
// Phones keep the project details folded so the player gets the screen; the player resizes smoothly when they open.
function setInfoOpen(open: boolean) {
  dialog.classList.toggle('is-info-open', open);
  infoToggle.setAttribute('aria-expanded', String(open));
  infoToggle.querySelector('span')!.textContent = open ? 'Hide description' : 'Show description';
}
infoToggle.addEventListener('click', () => {
  const open = !dialog.classList.contains('is-info-open');
  const before = shell.getBoundingClientRect();
  setInfoOpen(open);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const after = shell.getBoundingClientRect();
  shell.animate([
    { transform: `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width}, ${before.height / after.height})`, transformOrigin: 'top left' },
    { transform: 'none', transformOrigin: 'top left' },
  ], { duration: motion('--dur-base'), easing: motionEase() });
  if (open) info.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: motion('--dur-base'), easing: motionEase() });
});
focusButton.addEventListener('click', async () => {
  // Named `animate`, not `motion`: shadowing the motion() helper made every focus toggle throw.
  const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (focusChanging || dialog.classList.contains('is-closing') || (animate && dialog.classList.contains('is-opening'))) return;
  focusChanging = true;
  dialog.classList.add('is-focus-changing');
  const focused = !dialog.classList.contains('is-focused');
  const visibleExtras = focusExtras.filter(element => element.getClientRects().length);
  const before = shell.getBoundingClientRect();
  try {
    if (animate && focused) {
      focusAnimations = visibleExtras.map(element => element.animate([
        { opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(6px)' },
      ], { duration: motion('--dur-fast'), easing: motionEase(), fill: 'forwards' }));
      await Promise.all(focusAnimations.map(animation => animation.finished.catch(() => {})));
      if (!dialog.open || dialog.classList.contains('is-closing')) return;
    }
    dialog.classList.toggle('is-focused', focused);
    focusButton.setAttribute('aria-pressed', String(focused));
    focusButton.setAttribute('aria-label', focused ? 'Exit focus mode' : 'Enter focus mode');
    focusButton.title = focused ? 'Exit focus mode' : 'Focus mode';
    if (animate) {
      const after = shell.getBoundingClientRect();
      const transform = `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width}, ${before.height / after.height})`;
      focusAnimations.push(shell.animate([
        { transform, transformOrigin: 'top left' }, { transform: 'none', transformOrigin: 'top left' },
      ], { duration: motion('--dur-base'), easing: motionEase(), fill: 'both' }));
      if (!focused) {
        focusAnimations.push(...focusExtras.filter(element => element.getClientRects().length).map(element => element.animate([
          { opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' },
        ], { duration: motion('--dur-fast'), delay: 100, easing: motionEase(), fill: 'both' })));
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
dialog.addEventListener('cancel', event => { event.preventDefault(); if (!photoViewer.hidden) backToAlbum(); else closeProject(); });
let startedOutside = false;
dialog.addEventListener('pointerdown', event => { startedOutside = event.target === dialog; });
dialog.addEventListener('click', event => { if (startedOutside && event.target === dialog) closeProject(); });
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  dialog.classList.remove('is-opening', 'is-closing');
  dialog.classList.remove('is-focused');
  setInfoOpen(false);
  focusButton.setAttribute('aria-pressed', 'false');
  focusButton.setAttribute('aria-label', 'Enter focus mode');
  focusButton.title = 'Focus mode';
  clearMedia();
  if (returnUrl !== null) history.replaceState(history.state, '', returnUrl);
  if (returnTitle !== null) document.title = returnTitle;
  returnUrl = returnTitle = null;
  trigger?.focus({ preventScroll: true });
});

// /projects/<slug>/ pages render the archive with that project's dialog already open.
const openOnLoad = templates.findIndex(item => item.dataset.projectTemplate === document.body.dataset.openProject);
if (openOnLoad >= 0) {
  returnUrl = '/projects/';
  returnTitle = `All projects | ${document.title.split(' | ').at(-1)}`;
  showProject(openOnLoad);
  dialog.showModal();
  thumbnails[openOnLoad]?.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'instant' });
}
