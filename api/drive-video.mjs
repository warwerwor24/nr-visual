import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { driveMedia } from '../src/lib/media.mjs';

export default async function driveVideo(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Vary', 'Origin');
  const origins = new Set([
    'http://127.0.0.1:3333',
    'http://localhost:3333',
    'https://nr-visual-n4rtv48x.sanity.studio',
    'https://nr-visual.vercel.app',
    process.env.SITE_URL,
  ]);
  const origin = request.headers.origin;
  const fail = (status, error) => {
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error }));
  };
  if (origin && !origins.has(origin)) return fail(403, 'Origin Studio tidak diizinkan.');
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range');
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Range');
    response.statusCode = 204;
    return response.end();
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD, OPTIONS');
    return fail(405, 'Gunakan GET untuk memuat video.');
  }
  let params;
  try { params = new URL(request.url, 'http://localhost').searchParams; }
  catch { return fail(400, 'URL permintaan video tidak valid.'); }
  const media = driveMedia(params.get('url'));
  if (!media) return fail(400, 'Isi link file video Google Drive yang valid.');
  const authorization = request.headers.authorization;
  const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
  if (!projectId || !/^[a-z0-9]+$/.test(projectId)) return fail(503, 'Project Sanity belum dikonfigurasi pada layanan video.');
  const session = params.get('session') === '1';
  const ticket = params.get('ticket');
  const secret = process.env.DRIVE_VIDEO_SIGNING_SECRET;
  if ((session || ticket) && (!secret || secret.length < 32)) return fail(503, 'Layanan streaming belum dikonfigurasi.');
  const signature = expires => createHmac('sha256', secret).update(`${projectId}\n${origin}\n${media.open}\n${expires}`).digest();
  if (ticket && !session) {
    const [expires, signed, ...extra] = ticket.split('.');
    const now = Math.floor(Date.now() / 1000);
    if (!origin || extra.length || !/^\d{10}$/.test(expires) || !/^[a-f0-9]{64}$/.test(signed || '') ||
      Number(expires) <= now || Number(expires) > now + 1800 ||
      !timingSafeEqual(signature(expires), Buffer.from(signed, 'hex'))) return fail(401, 'Sesi video kedaluwarsa atau tidak valid. Muat video kembali.');
  } else if (!authorization || !/^Bearer \S+$/.test(authorization) || authorization.length > 4096) return fail(401, 'Login ke Sanity terlebih dahulu.');
  const range = request.headers.range;
  if (range) {
    const parts = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!parts || (!parts[1] && !parts[2]) || parts.slice(1).some(value => value && !Number.isSafeInteger(Number(value))) || (parts[1] && parts[2] && Number(parts[1]) > Number(parts[2]))) return fail(416, 'Rentang video tidak valid.');
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  response.once('close', abort);
  const timeout = setTimeout(abort, 300_000);
  try {
    if (!ticket || session) {
      const member = await fetch('https://api.sanity.io/v2025-02-19/projects?includeMembers=false', {
        headers: { Authorization: authorization }, signal: controller.signal,
      });
      if ([401, 403, 404].includes(member.status)) return fail(403, 'Login dengan akun anggota project Sanity ini.');
      if (!member.ok) return fail(502, 'Sanity belum bisa memeriksa login. Coba lagi.');
      const projects = await member.json();
      if (!Array.isArray(projects) || !projects.some(project => project.id === projectId)) return fail(403, 'Akun ini tidak memiliki akses ke project Sanity.');
    }
    if (session) {
      if (!origin || request.method !== 'GET') return fail(400, 'Buka sesi video dari Studio.');
      const expires = Math.floor(Date.now() / 1000) + 1800;
      response.setHeader('Content-Type', 'application/json');
      return response.end(JSON.stringify({ ticket: `${expires}.${signature(expires).toString('hex')}` }));
    }
    const sharing = new URL(media.open);
    const download = new URL('https://drive.usercontent.google.com/download');
    download.searchParams.set('id', sharing.pathname.split('/')[3]);
    download.searchParams.set('export', 'download');
    download.searchParams.set('confirm', 't');
    const resourceKey = sharing.searchParams.get('resourcekey');
    if (resourceKey) download.searchParams.set('resourcekey', resourceKey);
    const video = await fetch(download, {
      headers: { Range: range || 'bytes=0-' }, redirect: 'manual', signal: controller.signal,
    });
    if (video.status === 416) {
      const contentRange = video.headers.get('content-range');
      if (contentRange) response.setHeader('Content-Range', contentRange);
      await video.body?.cancel();
      return fail(416, 'Posisi video berada di luar file.');
    }
    const type = video.headers.get('content-type') || '';
    if (!video.ok || !video.body || (!type.startsWith('video/') && !type.startsWith('application/octet-stream'))) {
      await video.body?.cancel();
      return fail(502, 'Drive belum bisa mengirim video. Periksa Anyone with the link, izin download, dan kuota Drive, atau pilih file dari komputer.');
    }
    response.statusCode = video.status;
    response.setHeader('Content-Type', type);
    for (const header of ['accept-ranges', 'content-range']) {
      const value = video.headers.get(header);
      if (value) response.setHeader(header, value);
    }
    const length = video.headers.get('content-length');
    if (length) response.setHeader('Content-Length', length);
    if (request.method === 'HEAD') { await video.body.cancel(); return response.end(); }
    await pipeline(Readable.fromWeb(video.body), response);
  } catch {
    if (!response.headersSent && !response.destroyed) fail(502, 'Video gagal dimuat. Coba lagi, atau pilih file dari komputer.');
    else response.destroy();
  } finally {
    clearTimeout(timeout);
    response.off('close', abort);
    controller.abort();
  }
}
