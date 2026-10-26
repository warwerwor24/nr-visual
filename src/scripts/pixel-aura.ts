// A yellow, pixelated glow that trails the cursor across the blue collage section.
// Each grid cell holds an energy value: the cursor adds energy with a soft falloff, every frame it decays,
// and cells are drawn with a few stepped opacities so the glow reads as pixels instead of a smooth gradient.
const section = document.querySelector<HTMLElement>('#collection');
const canvas = section?.querySelector<HTMLCanvasElement>('.pixel-aura');
const context = canvas?.getContext('2d');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

if (section && canvas && context && finePointer.matches && !reducedMotion.matches) {
  const cell = 14;
  const radius = 170;
  const levels = [0, .3, .55, .8, .95];
  let columns = 0;
  let rows = 0;
  let energy = new Float32Array(0);
  let pointer: { x: number; y: number } | null = null;
  let frame = 0;

  function resize() {
    columns = Math.ceil(section!.clientWidth / cell);
    rows = Math.ceil(section!.clientHeight / cell);
    canvas!.width = columns;
    canvas!.height = rows;
    energy = new Float32Array(columns * rows);
  }

  function tick() {
    frame = 0;
    let active = false;
    if (pointer) {
      const reach = Math.ceil(radius / cell);
      const cx = Math.floor(pointer.x / cell);
      const cy = Math.floor(pointer.y / cell);
      for (let y = Math.max(0, cy - reach); y < Math.min(rows, cy + reach); y++) {
        for (let x = Math.max(0, cx - reach); x < Math.min(columns, cx + reach); x++) {
          const distance = Math.hypot(x - cx, y - cy) * cell;
          if (distance > radius) continue;
          // A little noise keeps the edge of the aura flickering like a sprite.
          const gain = (1 - distance / radius) ** 1.6 * (.14 + Math.random() * .1);
          energy[y * columns + x] = Math.min(1, energy[y * columns + x] + gain);
        }
      }
    }
    context!.clearRect(0, 0, columns, rows);
    for (let index = 0; index < energy.length; index++) {
      const value = energy[index] *= .93;
      if (value < .02) { energy[index] = 0; continue; }
      active = true;
      const level = levels[Math.min(levels.length - 1, Math.floor(value * levels.length))];
      if (!level) continue;
      context!.fillStyle = `rgba(255, 221, 51, ${level})`;
      context!.fillRect(index % columns, Math.floor(index / columns), 1, 1);
    }
    if (active || pointer) frame = requestAnimationFrame(tick);
  }
  const start = () => { if (!frame) frame = requestAnimationFrame(tick); };

  section.addEventListener('pointermove', event => {
    const box = section.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    start();
  });
  section.addEventListener('pointerleave', () => { pointer = null; });
  new ResizeObserver(resize).observe(section);
  resize();
}
