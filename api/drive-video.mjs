import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
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
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Authorization');
    response.statusCode = 204;
    return response.end();
  }
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, OPTIONS');
    return fail(405, 'Gunakan GET untuk memuat video.');
  }
  let url;
  try { url = new URL(request.url, 'http://localhost').searchParams.get('url'); }
  catch { return fail(400, 'URL permintaan video tidak valid.'); }
  const media = driveMedia(url);
  if (!media) return fail(400, 'Isi link file video Google Drive yang valid.');
  const authorization = request.headers.authorization;
  if (!authorization || !/^Bearer \S+$/.test(authorization) || authorization.length > 4096) return fail(401, 'Login ke Sanity terlebih dahulu.');
  const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
  if (!projectId || !/^[a-z0-9]+$/.test(projectId)) return fail(503, 'Project Sanity belum dikonfigurasi pada layanan video.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  response.once('close', abort);
  const timeout = setTimeout(abort, 300_000);
  try {
    const member = await fetch('https://api.sanity.io/v2025-02-19/projects?includeMembers=false', {
      headers: { Authorization: authorization }, signal: controller.signal,
    });
    if ([401, 403, 404].includes(member.status)) return fail(403, 'Login dengan akun anggota project Sanity ini.');
    if (!member.ok) return fail(502, 'Sanity belum bisa memeriksa login. Coba lagi.');
    const projects = await member.json();
    if (!Array.isArray(projects) || !projects.some(project => project.id === projectId)) return fail(403, 'Akun ini tidak memiliki akses ke project Sanity.');
    const sharing = new URL(media.open);
    const download = new URL('https://drive.usercontent.google.com/download');
    download.searchParams.set('id', sharing.pathname.split('/')[3]);
    download.searchParams.set('export', 'download');
    download.searchParams.set('confirm', 't');
    const resourceKey = sharing.searchParams.get('resourcekey');
    if (resourceKey) download.searchParams.set('resourcekey', resourceKey);
    const video = await fetch(download, {
      headers: { Range: 'bytes=0-' }, redirect: 'manual', signal: controller.signal,
    });
    const type = video.headers.get('content-type') || '';
    if (!video.ok || !video.body || (!type.startsWith('video/') && !type.startsWith('application/octet-stream'))) {
      await video.body?.cancel();
      return fail(502, 'Drive belum bisa mengirim video. Periksa Anyone with the link, izin download, dan kuota Drive, atau pilih file dari komputer.');
    }
    response.setHeader('Content-Type', type);
    const length = video.headers.get('content-length');
    if (length) response.setHeader('Content-Length', length);
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
