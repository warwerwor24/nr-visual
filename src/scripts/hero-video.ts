const video = document.querySelector('.hero-media');
const toggle = document.querySelector<HTMLButtonElement>('.hero-toggle');

if (video instanceof HTMLVideoElement && toggle) {
  const sync = () => {
    toggle.classList.toggle('is-paused', video.paused);
    toggle.setAttribute('aria-label', video.paused ? 'Play showreel' : 'Pause showreel');
  };
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  toggle.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
  toggle.hidden = false;
  // Reduced motion keeps the poster until the visitor presses play.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(sync);
  sync();
}
