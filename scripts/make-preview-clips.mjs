// Cuts a 5 s muted 1280x720 (16:9, like the cards) hover clip from each video project's public Drive file.
// Dry run by default: clips land in work/preview-clips/. PREVIEW_CLIP_COMMIT=1 uploads them and sets previewClip.
// Run: npx sanity exec scripts/make-preview-clips.mjs --with-user-token
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { getCliClient } from 'sanity/cli';
import { driveMedia } from '../src/lib/media.mjs';

const run = promisify(execFile);
const commit = process.env.PREVIEW_CLIP_COMMIT === '1';
const limit = Number(process.env.PREVIEW_CLIP_LIMIT || Infinity);
// Optional comma-separated project IDs, e.g. only the featured videos.
const only = process.env.PREVIEW_CLIP_IDS?.split(',').filter(Boolean);
assert(limit > 0 && (Number.isInteger(limit) || limit === Infinity));
const client = getCliClient({ apiVersion: '2025-02-19' }).withConfig({ perspective: 'raw', useCdn: false });
assert(client.config().token, 'Run through sanity exec --with-user-token');
const folder = resolve('work/preview-clips');
await mkdir(`${folder}/src`, { recursive: true });

const documents = await client.fetch('*[_type == "project" && kind == "video" && !(_id in path("versions.**"))]{_id,title,driveUrl,previewClip}');
const groups = new Map();
for (const doc of documents) {
  const id = doc._id.replace(/^drafts\./, '');
  groups.set(id, [...(groups.get(id) ?? []), doc]);
}
// A project needs a clip when no copy has one; the published copy's Drive link wins over the draft's.
const targets = [...groups].filter(([id, docs]) => !docs.some(doc => doc.previewClip) && (!only || only.includes(id)))
  .map(([id, docs]) => ({ id, docs, doc: docs.find(doc => doc._id === id) ?? docs[0] }))
  .filter(({ doc }) => driveMedia(doc.driveUrl))
  .slice(0, limit);
const report = { mode: commit ? 'commit' : 'dry-run', startedAt: new Date().toISOString(), targetCount: targets.length, results: [] };

async function download(fileId, path) {
  try { if ((await stat(path)).size > 0) return; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const response = await fetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`);
  if (!response.ok) throw new Error(`Drive returned ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (type.includes('text/html')) throw new Error('Drive returned an HTML page, not a video. Check the sharing setting.');
  await pipeline(Readable.fromWeb(response.body), createWriteStream(path));
}

for (const { id, docs, doc } of targets) {
  const result = { id, title: doc.title };
  report.results.push(result);
  try {
    const fileId = new URL(driveMedia(doc.driveUrl).open).pathname.split('/')[3];
    const source = `${folder}/src/${id}.mp4`;
    const clip = `${folder}/${id}.mp4`;
    await download(fileId, source);
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', source]);
    const duration = Number(stdout);
    assert(duration > 0, 'ffprobe found no duration');
    const length = Math.min(5, duration);
    const start = Math.max(0, Math.min(duration * .3, duration - length));
    await run('ffmpeg', ['-y', '-v', 'error', '-ss', start.toFixed(2), '-i', source, '-t', String(length), '-an', '-dn', '-map_metadata', '-1', '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', clip]);
    Object.assign(result, { start: Number(start.toFixed(2)), length, bytes: (await stat(clip)).size, clip });
    if (commit) {
      const asset = await client.assets.upload('file', await readFile(clip), { filename: `${id}-hover.mp4`, contentType: 'video/mp4' });
      const value = { _type: 'file', asset: { _type: 'reference', _ref: asset._id } };
      // Patch the draft too, so publishing it later does not drop the clip.
      const transaction = client.transaction();
      docs.forEach(copy => transaction.patch(copy._id, patch => patch.set({ previewClip: value })));
      await transaction.commit();
      result.asset = asset._id;
    }
    result.status = 'ok';
  } catch (error) {
    Object.assign(result, { status: 'failed', error: error.message });
  }
  console.log(`${result.status} ${doc.title}${result.error ? `: ${result.error}` : ''}`);
}
await writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2));
console.log(`${report.mode}: ${report.results.filter(item => item.status === 'ok').length}/${targets.length} clips, report in work/preview-clips/report.json`);
