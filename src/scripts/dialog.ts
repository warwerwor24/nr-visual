const dialog = document.querySelector<HTMLDialogElement>('#project-dialog')!;
const media = document.querySelector<HTMLDivElement>('#dialog-media')!;
const title = document.querySelector<HTMLElement>('#dialog-title')!;
const description = document.querySelector<HTMLElement>('#dialog-description')!;
const status = document.querySelector<HTMLElement>('#media-status')!;
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

document.querySelectorAll<HTMLButtonElement>('button[data-project]').forEach(button => {
  button.addEventListener('click', () => {
    const template = [...document.querySelectorAll<HTMLTemplateElement>('template[data-project-template]')].find(item => item.dataset.projectTemplate === button.dataset.project);
    if (!template) return;
    const card = button.getBoundingClientRect();
    trigger = button;
    title.textContent = template.dataset.title || '';
    description.textContent = template.dataset.description || '';
    status.textContent = '';
    media.replaceChildren();
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
        clearTimeout(loadTimer);
        status.textContent = 'Video player loaded.';
      });
      loadTimer = setTimeout(() => { status.textContent = 'The video player is taking longer than usual to load.'; }, 12000);
      media.append(iframe);
    } else {
      media.append(template.content.cloneNode(true));
      imageErrors(media);
    }
    dialog.showModal();
    const panel = dialog.getBoundingClientRect();
    dialog.style.setProperty('--open-x', `${card.left + card.width / 2 - panel.left - panel.width / 2}px`);
    dialog.style.setProperty('--open-y', `${card.top + card.height / 2 - panel.top - panel.height / 2}px`);
    dialog.style.setProperty('--open-scale', String(Math.min(.85, Math.max(.2, card.width / panel.width))));
    dialog.classList.add('is-opening');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      contentAnimations = contentItems.map((element, index) => element.animate([
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 220, delay: 440 + index * 60, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' }));
    }
  });
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
  const current = getComputedStyle(dialog);
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
    const animation = dialog.animate([
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
dialog.addEventListener('animationend', event => {
  if (event.target === dialog) dialog.classList.remove('is-opening');
});
dialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
let startedOutside = false;
dialog.addEventListener('pointerdown', event => { startedOutside = event.target === dialog; });
dialog.addEventListener('click', event => { if (startedOutside && event.target === dialog) closeProject(); });
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  dialog.classList.remove('is-opening', 'is-closing');
  clearMedia();
  trigger?.focus({ preventScroll: true });
});
