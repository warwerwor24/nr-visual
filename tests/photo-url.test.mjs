import test from 'node:test';
import assert from 'node:assert/strict';
import { photoUrl } from '../src/lib/cover.mjs';

test('gallery and full photo sizes preserve the original ratio without cropping', () => {
  const source = 'https://cdn.sanity.io/images/n4rtv48x/production/0123456789012345678901234567890123456789ab-6000x4000.jpg';
  for (const width of [640, 2000]) {
    const url = new URL(photoUrl(source, width));
    assert.equal(url.searchParams.get('w'), String(width));
    assert.equal(url.searchParams.get('fit'), 'max');
    assert.equal(url.searchParams.get('auto'), 'format');
    assert.equal(url.searchParams.has('h'), false);
    assert.equal(url.searchParams.has('rect'), false);
  }
  assert.equal(photoUrl('/local-placeholder.svg'), '/local-placeholder.svg');
  assert.equal(photoUrl('https://example.com/stock.jpg'), 'https://example.com/stock.jpg');
});
