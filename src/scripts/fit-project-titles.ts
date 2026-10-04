const captions = [...document.querySelectorAll<HTMLElement>('.cover-caption, #dialog-title, [data-collage-title]')];

function fitCaption(caption: HTMLElement) {
  if (caption.dataset.collageTitle) {
    const title = caption.dataset.collageTitle;
    caption.textContent = title;
    if (!caption.clientWidth || caption.scrollWidth <= caption.clientWidth) return;
    const characters = Array.from(title);
    let low = 0;
    let high = characters.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      caption.textContent = `${characters.slice(0, middle).join('').trimEnd()}..`;
      if (caption.scrollWidth <= caption.clientWidth) low = middle;
      else high = middle - 1;
    }
    caption.textContent = `${characters.slice(0, low).join('').trimEnd()}..`;
    return;
  }
  caption.style.removeProperty('font-size');
  const maximum = parseFloat(getComputedStyle(caption).fontSize);
  const lines = caption.id === 'dialog-title' ? 1 : matchMedia('(max-width: 600px)').matches ? 2 : 1;
  const text = document.createRange();
  text.selectNodeContents(caption);
  const fits = () => caption.scrollWidth <= caption.clientWidth + 1 && text.getClientRects().length <= lines;
  if (!caption.clientWidth || fits()) return;
  let low = 1;
  let high = maximum;
  for (let step = 0; step < 12; step++) {
    const middle = (low + high) / 2;
    caption.style.fontSize = `${middle}px`;
    if (fits()) low = middle;
    else high = middle;
  }
  caption.style.fontSize = `${Math.floor(low * 10) / 10}px`;
}

const titleObserver = new ResizeObserver(() => captions.forEach(fitCaption));
captions.forEach(caption => titleObserver.observe(caption.parentElement!));
const dialogTitle = document.querySelector<HTMLElement>('#dialog-title');
if (dialogTitle) new MutationObserver(() => fitCaption(dialogTitle)).observe(dialogTitle, { childList: true, characterData: true, subtree: true });
document.fonts.ready.then(() => captions.forEach(fitCaption));
matchMedia('(max-width: 600px)').addEventListener('change', () => captions.forEach(fitCaption));
