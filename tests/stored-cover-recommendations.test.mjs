import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendationPayload, savedRecommendationFrames } from '../sanity/storedCoverRecommendations.mjs';

const url = 'https://drive.google.com/file/d/abcdefghijklmnop/view';
const frames = [{time: 2, assetId: 'image-abc123-900x1600-jpg'}, {time: 6, assetId: 'image-def456-1920x1080-jpg'}];

test('stored frames remain available for the same normalized source, with reusable original assets', () => {
  const payload = recommendationPayload(url, 10, frames);
  assert.equal(savedRecommendationFrames(payload, `${url}?usp=sharing`).length, 2);
  assert.equal(payload.frames[0].image.asset._ref, frames[0].assetId);
  assert.equal(payload.frames[0]._type, 'coverRecommendationFrame');
  assert.equal(new Set(payload.frames.map(frame => frame._key)).size, 2);
  assert.equal(payload.cover, undefined);
  assert.equal(frames[0].image, undefined, 'Input is not mutated');
});

test('changed source, algorithm version, malformed asset and out-of-range timestamps are not selectable', () => {
  const payload = recommendationPayload(url, 10, frames);
  assert.deepEqual(savedRecommendationFrames(payload, 'https://drive.google.com/file/d/anotherfile12345/view'), []);
  assert.deepEqual(savedRecommendationFrames({...payload, version: 999}, url), []);
  assert.deepEqual(savedRecommendationFrames({...payload, duration: NaN}, url), []);
  assert.deepEqual(savedRecommendationFrames({...payload, frames: new Array(7).fill(payload.frames[0])}, url), []);
  assert.deepEqual(savedRecommendationFrames({...payload, frames: [{time: 10, image: payload.frames[0].image}]}, url), []);
  assert.deepEqual(savedRecommendationFrames({...payload, frames: [{time: 1, image: {asset: {_ref: 'https://evil.example'}}}]}, url), []);
  assert.throws(() => recommendationPayload(url, 10, []));
  assert.throws(() => recommendationPayload(url, 10, [{time: 2, assetId: 'invalid'}]));
});
