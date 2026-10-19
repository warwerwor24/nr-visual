export function sampleTimes(duration) {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const count = Math.min(24, Math.max(4, Math.ceil(duration / 2)));
  return Array.from({ length: count }, (_, index) => duration * (.06 + .84 * index / (count - 1)));
}

export function frameMetrics({ data, width, height }) {
  const gray = new Float32Array(width * height);
  const signature = new Array(8 * 4 * 3).fill(0);
  const cells = new Array(8 * 4).fill(0);
  let brightness = 0, squared = 0, clipped = 0, edges = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const pixel = y * width + x;
    const offset = pixel * 4;
    const value = .2126 * data[offset] + .7152 * data[offset + 1] + .0722 * data[offset + 2];
    gray[pixel] = value;
    brightness += value;
    squared += value * value;
    if (value < 12 || value > 245) clipped++;
    const cell = Math.min(3, Math.floor(y * 4 / height)) * 8 + Math.min(7, Math.floor(x * 8 / width));
    cells[cell]++;
    for (let channel = 0; channel < 3; channel++) signature[cell * 3 + channel] += data[offset + channel];
  }
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const pixel = y * width + x;
    const laplacian = 4 * gray[pixel] - gray[pixel - 1] - gray[pixel + 1] - gray[pixel - width] - gray[pixel + width];
    edges += laplacian * laplacian;
  }
  const count = width * height;
  brightness /= count;
  const contrast = Math.sqrt(Math.max(0, squared / count - brightness * brightness));
  const sharpness = Math.sqrt(edges / Math.max(1, (width - 2) * (height - 2)));
  signature.forEach((value, index) => { signature[index] = value / Math.max(1, cells[Math.floor(index / 3)]); });
  const usable = brightness >= 25 && brightness <= 232 && clipped / count < .75 && contrast >= 10 && sharpness >= 3;
  // shortcut: center-crop detail and exposure proxy for composition; subject-aware ranking needs semantic analysis.
  const score = .55 * Math.min(1, sharpness / 45) + .25 * Math.min(1, contrast / 55) + .2 * (1 - Math.abs(brightness - 128) / 128);
  return { usable, score, signature, sharpness, brightness };
}

export function frameDifference(first, second) {
  return first.reduce((sum, value, index) => sum + Math.abs(value - second[index]), 0) / first.length;
}

export function chooseFrames(frames, limit = 6) {
  const selected = [];
  for (const frame of frames.filter(frame => frame.metrics.usable).sort((a, b) => b.metrics.score - a.metrics.score)) {
    if (selected.every(other => frameDifference(frame.metrics.signature, other.metrics.signature) >= 14)) selected.push(frame);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function seekFrame(player, time, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      player.removeEventListener('seeked', done);
      player.removeEventListener('loadeddata', done);
      player.removeEventListener('error', failed);
      signal?.removeEventListener('abort', aborted);
    };
    const done = () => {
      if (player.seeking || player.readyState < 2 || Math.abs(player.currentTime - time) > .05) return;
      cleanup();
      resolve();
    };
    const failed = () => { cleanup(); reject(new Error('Frame gagal dimuat. Muat ulang video atau gunakan file lokal.')); };
    const aborted = () => { cleanup(); reject(signal.reason); };
    player.addEventListener('seeked', done);
    player.addEventListener('loadeddata', done);
    player.addEventListener('error', failed);
    signal?.addEventListener('abort', aborted, { once: true });
    timer = setTimeout(failed, 15000);
    try { player.currentTime = time; done(); } catch (error) { cleanup(); reject(error); }
  });
}

export async function captureFrame(player) {
  if (player.seeking || player.readyState < 2 || !player.videoWidth || !player.videoHeight) throw new Error('Frame belum siap. Tunggu preview video.');
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(player.videoWidth, player.videoHeight));
  canvas.width = Math.max(1, Math.round(player.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(player.videoHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Frame capture is unavailable. Upload a cover image instead.');
  context.drawImage(player, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not capture this frame. Try another time.')), 'image/jpeg', .9));
}

export async function recommendFrames(player, signal, onProgress) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Analisis frame tidak tersedia. Pilih frame manual atau upload thumbnail.');
  const thumbnail = document.createElement('canvas');
  thumbnail.width = 640;
  thumbnail.height = 360;
  const thumbnailContext = thumbnail.getContext('2d');
  if (!thumbnailContext) throw new Error('Preview frame tidak tersedia. Pilih frame manual atau upload thumbnail.');
  const ratio = 16 / 9;
  const width = Math.min(player.videoWidth, player.videoHeight * ratio);
  const height = width / ratio;
  const x = (player.videoWidth - width) / 2;
  const y = (player.videoHeight - height) / 2;
  const read = () => {
    context.drawImage(player, x, y, width, height, 0, 0, canvas.width, canvas.height);
    return frameMetrics(context.getImageData(0, 0, canvas.width, canvas.height));
  };
  const times = sampleTimes(player.duration);
  const frames = [];
  for (const [index, time] of times.entries()) {
    signal.throwIfAborted();
    await seekFrame(player, time, signal);
    const metrics = read();
    thumbnailContext.drawImage(player, x, y, width, height, 0, 0, thumbnail.width, thumbnail.height);
    const preview = thumbnail.toDataURL('image/jpeg', .85);
    await seekFrame(player, Math.min(player.duration - .01, time + Math.min(.15, player.duration / 50)), signal);
    const neighbor = read();
    const change = frameDifference(metrics.signature, neighbor.signature);
    metrics.score *= Math.max(.25, 1 - change / 80);
    if (!neighbor.usable) metrics.usable = false;
    frames.push({ time, preview, metrics });
    onProgress(index + 1, times.length);
  }
  return chooseFrames(frames);
}
