import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import driveVideo from '../api/drive-video.mjs';

test('Drive service checks project membership, restricts origins and hosts, and streams public video without leaking the token', async t => {
  const originalFetch = globalThis.fetch;
  const previous = process.env.SANITY_STUDIO_PROJECT_ID;
  const previousSecret = process.env.DRIVE_VIDEO_SIGNING_SECRET;
  process.env.SANITY_STUDIO_PROJECT_ID = 'previewtest';
  process.env.DRIVE_VIDEO_SIGNING_SECRET = 'test-only-signing-secret-with-at-least-32-characters';
  let mode = 'video';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), options });
    if (new URL(url).hostname === 'api.sanity.io') {
      if (mode === 'forbidden') return new Response('{}', { status: 403 });
      return Response.json([{ id: mode === 'other-project' ? 'elsewhere' : 'previewtest' }]);
    }
    if (mode === 'out-of-bounds') return new Response('', {status: 416, headers: {'Content-Range': 'bytes */13'}});
    const fixture = 'video-fixture';
    const [, from, to] = /^bytes=(\d*)-(\d*)$/.exec(options.headers.Range);
    const start = from ? Number(from) : Math.max(0, fixture.length - Number(to));
    const end = from && to ? Math.min(Number(to), fixture.length - 1) : fixture.length - 1;
    const body = mode === 'html' ? '<html>Download unavailable</html>' : fixture.slice(start, end + 1);
    return new Response(body, {status: 206, headers: {
      'Content-Type': mode === 'html' ? 'text/html' : 'video/mp4',
      'Content-Length': String(body.length), 'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${fixture.length}`,
    }});
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
    assert.equal(video.status, 206);
    assert.equal(video.headers.get('cache-control'), 'no-store');
    assert.equal(video.headers.get('content-type'), 'video/mp4');
    assert.equal(await video.text(), 'video-fixture');
    const download = calls.at(-1);
    assert.equal(new URL(download.url).hostname, 'drive.usercontent.google.com');
    assert.equal(new URL(download.url).searchParams.get('resourcekey'), '0-test');
    assert.equal(new URL(download.url).searchParams.get('id'), 'abcdefghijklmnop');
    assert.equal(download.options.headers.Authorization, undefined);
    assert.equal(download.options.redirect, 'manual', 'Untrusted redirect destinations must not be fetched');
    assert.equal(download.options.headers.Range, 'bytes=0-8388607', 'Requests without Range ask Drive for a bounded first chunk');
    const before = calls.length;
    const session = await originalFetch(url + '&session=1', {headers});
    assert.equal(session.status, 200);
    const {ticket} = await session.json();
    assert.match(ticket, /^\d{10}\.[a-f0-9]{64}$/);
    assert(!ticket.includes('local-test-token'));
    assert.equal(calls.length, before + 1, 'Opening a session checks membership without downloading video');
    const stream = url + '&ticket=' + ticket;
    // Open and oversized ranges are clamped so Drive never sees a whole-file download.
    for (const [range, upstream] of [['bytes=2-5', 'bytes=2-5'], ['bytes=5-', 'bytes=5-8388612'], ['bytes=0-99999999', 'bytes=0-8388607'], ['bytes=-4', 'bytes=-4']]) {
      const partial = await originalFetch(stream, {headers: {Origin: headers.Origin, Range: range}});
      assert.equal(partial.status, 206);
      assert.equal(partial.headers.get('accept-ranges'), 'bytes');
      assert(partial.headers.get('content-range').startsWith('bytes '));
      assert.equal(partial.headers.get('access-control-allow-origin'), headers.Origin);
      assert.equal((await partial.text()).length, Number(partial.headers.get('content-length')));
      assert.equal(calls.at(-1).options.headers.Range, upstream);
      assert.equal(calls.at(-1).options.headers.Authorization, undefined);
    }
    assert.equal(calls.slice(before + 1).filter(call => new URL(call.url).hostname === 'api.sanity.io').length, 0, 'Range requests use a signed session rather than repeating Sanity membership checks');
    const head = await originalFetch(stream, {method: 'HEAD', headers: {Origin: headers.Origin, Range: 'bytes=2-5'}});
    assert.equal(head.status, 206);
    assert.equal(head.headers.get('content-length'), '4');
    assert.equal(await head.text(), '');
    const callsBeforeDenied = calls.length;
    for (const bad of [stream.slice(0, -1), stream.replace('resourcekey%3D0-test', 'resourcekey%3D0-other'), url + '&ticket=1000000000.' + '0'.repeat(64)]) {
      assert.equal((await originalFetch(bad, {headers: {Origin: headers.Origin}})).status, 401);
    }
    assert.equal((await originalFetch(stream, {headers: {Origin: 'http://localhost:3333'}})).status, 401, 'Tickets are bound to the requesting Studio origin');
    for (const range of ['bytes=8-2', 'bytes=0-1,3-4', 'bytes=-', 'bytes=99999999999999999999-']) {
      assert.equal((await originalFetch(stream, {headers: {Origin: headers.Origin, Range: range}})).status, 416);
    }
    assert.equal(calls.length, callsBeforeDenied);
    mode = 'out-of-bounds';
    const beyond = await originalFetch(stream, {headers: {Origin: headers.Origin, Range: 'bytes=99-'}});
    assert.equal(beyond.status, 416);
    assert.equal(beyond.headers.get('content-range'), 'bytes */13');
    delete process.env.DRIVE_VIDEO_SIGNING_SECRET;
    assert.equal((await originalFetch(url + '&session=1', {headers})).status, 503, 'Missing signing key must fail closed');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.SANITY_STUDIO_PROJECT_ID;
    else process.env.SANITY_STUDIO_PROJECT_ID = previous;
    if (previousSecret === undefined) delete process.env.DRIVE_VIDEO_SIGNING_SECRET;
    else process.env.DRIVE_VIDEO_SIGNING_SECRET = previousSecret;
  }
});
