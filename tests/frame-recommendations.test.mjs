import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTimes, frameMetrics, chooseFrames } from '../sanity/frameRecommendations.mjs';

function image(color, detail = 0) {
  const width = 160, height = 90;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    const shade = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? detail : -detail;
    for (let channel = 0; channel < 3; channel++) data[offset + channel] = color[channel] + shade;
    data[offset + 3] = 255;
  }
  return { data, width, height };
}

test('samples are bounded, finite, and skip opening/closing even for short videos', () => {
  for (const duration of [.1, 1, 10, 120, 7200]) {
    const times = sampleTimes(duration);
    assert(times.length >= 4 && times.length <= 24);
    assert(times.every(time => time > 0 && time < duration));
    assert.equal(new Set(times).size, times.length);
  }
  for (const duration of [0, -1, Infinity, NaN]) assert.deepEqual(sampleTimes(duration), []);
});

test('rejects blank/underexposed/overexposed frames and ranks sharp detail above soft detail', () => {
  for (const color of [[0, 0, 0], [255, 255, 255], [128, 128, 128]]) assert.equal(frameMetrics(image(color)).usable, false);
  assert.equal(frameMetrics(image([5, 5, 5], 5)).usable, false);
  assert.equal(frameMetrics(image([250, 250, 250], 5)).usable, false);
  const sharp = frameMetrics(image([128, 128, 128], 45));
  const soft = frameMetrics(image([128, 128, 128], 12));
  assert(sharp.usable && soft.usable);
  assert(sharp.score > soft.score);
});

test('filters unusable frames, deduplicates visual matches, and caps results without padding', () => {
  const frames = Array.from({ length: 10 }, (_, time) => ({ time, metrics: { usable: true, score: 1 - time / 20, signature: new Array(96).fill(time * 20) } }));
  const duplicate = { ...frames[0], time: 99 };
  const bad = { time: 98, metrics: { usable: false, score: 2, signature: new Array(96).fill(255) } };
  assert.deepEqual(chooseFrames([bad, duplicate, ...frames]).map(frame => frame.time), [99, 1, 2, 3, 4, 5]);
  assert.equal(chooseFrames([frames[0], duplicate]).length, 1);
  assert.deepEqual(chooseFrames([bad]), []);
});
