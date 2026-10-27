// Video cards play their short preview clip on hover or keyboard focus. Touch screens and reduced motion keep the still cover.
// The clip has no src until the first hover, so the grid downloads nothing up front.
if (matchMedia('(hover: hover)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll<HTMLVideoElement>('.work-card .hover-clip').forEach(clip => {
    const card = clip.closest('.work-card')!;
    const start = () => {
      if (!clip.src) clip.src = clip.dataset.src!;
      clip.play().catch(() => {});
    };
    const stop = () => {
      clip.pause();
      clip.currentTime = 0;
    };
    card.addEventListener('pointerenter', start);
    card.addEventListener('focus', start);
    card.addEventListener('pointerleave', stop);
    card.addEventListener('blur', stop);
    clip.addEventListener('playing', () => clip.classList.add('is-playing'));
    clip.addEventListener('pause', () => clip.classList.remove('is-playing'));
  });
}
