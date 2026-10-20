// Reveal [data-fade] images once decoded; capture-phase load also covers images cloned into the dialog later.
const reveal = (image: Element) => image.classList.add('is-loaded');
const settle = (event: Event) => { if (event.target instanceof HTMLImageElement && event.target.hasAttribute('data-fade')) reveal(event.target); };
document.addEventListener('load', settle, true);
document.addEventListener('error', settle, true);
document.querySelectorAll<HTMLImageElement>('img[data-fade]').forEach(image => { if (image.complete) reveal(image); });
