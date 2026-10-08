import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import driveVideo from '../api/drive-video.mjs';

test('Drive service checks project membership, restricts origins and hosts, and streams public video without leaking the token', async t => {
  const originalFetch = globalThis.fetch;
  const previous = process.env.SANITY_STUDIO_PROJECT_ID;
  process.env.SANITY_STUDIO_PROJECT_ID = 'previewtest';
  let mode = 'video';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), options });
    if (new URL(url).hostname === 'api.sanity.io') {
      if (mode === 'forbidden') return new Response('{}', { status: 403 });
      return Response.json([{ id: mode === 'other-project' ? 'elsewhere' : 'previewtest' }]);
    }
    return new Response(mode === 'html' ? '<html>Download unavailable</html>' : 'video-fixture', {
      status: 206,
      headers: { 'Content-Type': mode === 'html' ? 'text/html' : 'video/mp4', 'Content-Length': mode === 'html' ? '33' : '13' },
    });
  });
  const server = createServer(driveVideo);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/api/drive-video`;
  const url = endpoint + '?url=' + encodeURIComponent('https://drive.google.com/file/d/abcdefghijklmnop/view?resourcekey=0-test');
  const headers = { Authorization: 'Bearer local-test-token', Origin: 'http://127.0.0.1:3333' };
  try {
    assert.equal((await originalFetch(url)).status, 401);
    assert.equal((await originalFetch(url, { headers: { ...headers, Origin: 'https://untrusted.test' } })).status, 403);
    assert.equal((await originalFetch(endpoint + '?url=https://untrusted.test/video.mp4', { headers })).status, 400);
    assert.equal((await originalFetch(url, { method: 'POST', headers })).status, 405);
    assert.equal(calls.length, 0, 'Reject requests before any upstream call');
    const preflight = await originalFetch(url, { method: 'OPTIONS', headers: { Origin: headers.Origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), headers.Origin);
    for (const denied of ['forbidden', 'other-project']) {
      mode = denied;
      assert.equal((await originalFetch(url, { headers })).status, 403);
    }
    assert.equal(calls.filter(call => new URL(call.url).hostname !== 'api.sanity.io').length, 0, 'Membership rejection must not access Drive');
    mode = 'html';
    assert.equal((await originalFetch(url, { headers })).status, 502, 'Drive warning pages must not masquerade as video');
    mode = 'video';
    const video = await originalFetch(url, { headers });
    assert.equal(video.status, 200);
    assert.equal(video.headers.get('cache-control'), 'no-store');
    assert.equal(video.headers.get('content-type'), 'video/mp4');
    assert.equal(await video.text(), 'video-fixture');
    const download = calls.at(-1);
    assert.equal(new URL(download.url).hostname, 'drive.usercontent.google.com');
    assert.equal(new URL(download.url).searchParams.get('resourcekey'), '0-test');
    assert.equal(new URL(download.url).searchParams.get('id'), 'abcdefghijklmnop');
    assert.equal(download.options.headers.Authorization, undefined);
    assert.equal(download.options.redirect, 'manual', 'Untrusted redirect destinations must not be fetched');
    assert.equal(download.options.headers.Range, 'bytes=0-');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.SANITY_STUDIO_PROJECT_ID;
    else process.env.SANITY_STUDIO_PROJECT_ID = previous;
  }
});
