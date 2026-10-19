import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { getCliClient } from 'sanity/cli';
import driveVideo from '../api/drive-video.mjs';
import { driveMedia } from '../src/lib/media.mjs';
import { recommendationPayload, savedRecommendationFrames } from '../sanity/storedCoverRecommendations.mjs';

const commit = process.env.COVER_BATCH_COMMIT === '1';
const limit = Number(process.env.COVER_BATCH_LIMIT || Infinity);
assert(limit > 0 && (Number.isInteger(limit) || limit === Infinity));
const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'raw', useCdn: false});
const token = client.config().token;
assert(token, 'Run through sanity exec --with-user-token');
const folder = resolve('work/cover-batch');
await mkdir(folder, {recursive: true});
const query = '*[_type in ["project","siteSettings"]] | order(_id)';
const currentDocuments = await client.fetch(query);
assert(Array.isArray(currentDocuments));
let baseline;
try { baseline = JSON.parse(await readFile(`${folder}/before.json`, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = currentDocuments;
  await writeFile(`${folder}/before.json`, JSON.stringify(baseline, null, 2));
}
const targets = baseline.filter(doc => doc._type === 'project' && doc._id.startsWith('drafts.') && doc.kind === 'video' && driveMedia(doc.driveUrl));
assert(targets.length, 'No existing video drafts with valid Drive links');
const resultFile = `${folder}/${commit ? 'result' : 'dry-run'}.json`;
const report = {mode: commit ? 'commit' : 'dry-run', startedAt: new Date().toISOString(), targetCount: targets.length, results: []};
const preserve = document => {
  const {_rev, _updatedAt, coverRecommendations, ...rest} = document;
  return rest;
};

await writeFile(`${folder}/index.html`, '<video id="video" crossorigin="anonymous" muted preload="metadata"></video><p id="progress"></p><script type="module" src="./main.mjs"></script>');
await writeFile(`${folder}/main.mjs`, `
import {recommendFrames, seekFrame, captureFrame} from '/sanity/frameRecommendations.mjs';
window.analyzeVideo = async source => {
  const player = document.querySelector('video');
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('Video load exceeded 90 seconds')), 90000);
    const ready = () => {
      if (!Number.isFinite(player.duration) || player.duration <= 0 || !player.videoWidth) return;
      finish();
    };
    const failed = () => finish(new Error('Drive video could not be decoded'));
    const finish = error => {
      clearTimeout(timeout);
      player.removeEventListener('loadeddata', ready);
      player.removeEventListener('error', failed);
      error ? reject(error) : resolve();
    };
    player.addEventListener('loadeddata', ready);
    player.addEventListener('error', failed);
    player.src = source;
    player.load();
  });
  const signal = AbortSignal.timeout(180000);
  const candidates = await recommendFrames(player, signal, (done,total) => {document.querySelector('#progress').textContent = done + '/' + total;});
  const frames = [];
  for (const candidate of candidates) {
    await seekFrame(player, candidate.time, signal);
    const blob = await captureFrame(player);
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    frames.push({time: candidate.time, dataUrl});
  }
  return {duration: player.duration, width: player.videoWidth, height: player.videoHeight, frames};
};
`);
process.env.DRIVE_VIDEO_SIGNING_SECRET = randomBytes(32).toString('hex');
process.env.SITE_URL = 'http://127.0.0.1:4336';
const proxy = createHttpServer((request, response) => driveVideo(request, response));
const server = await createServer({configFile: false, cacheDir: `${folder}/vite-cache`, server: {host: '127.0.0.1', port: 4336, strictPort: true}});
let browser;
try {
  await new Promise((resolve, reject) => {proxy.once('error', reject); proxy.listen(4337, '127.0.0.1', resolve);});
  await server.listen();
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser = await chromium.launch({channel: 'msedge', headless: true});
  const page = await browser.newPage();
  const mediaRequests = [];
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4337/api/drive-video')) mediaRequests.push({status: response.status(), range: response.request().headers().range, contentRange: response.headers()['content-range']});
  });
  page.on('requestfailed', request => {
    if (request.url().startsWith('http://127.0.0.1:4337/api/drive-video')) mediaRequests.push({failure: request.failure()?.errorText, range: request.headers().range});
  });
  console.log(JSON.stringify({mode: report.mode, targetCount: targets.length, processing: Math.min(limit, targets.length)}));
  for (const [index, original] of targets.slice(0, limit).entries()) {
    assert(/^drafts\.[A-Za-z0-9_.-]+$/.test(original._id));
    const result = {id: original._id, title: original.title, status: 'failed', candidates: 0};
    console.log(`[${index + 1}/${Math.min(limit, targets.length)}] ${original.title}`);
    mediaRequests.length = 0;
    try {
      const current = await client.getDocument(original._id);
      assert(current, 'Draft no longer exists');
      assert.deepEqual(preserve(current), preserve(original), 'Draft fields changed since snapshot; skipped to preserve user edits');
      const saved = savedRecommendationFrames(current.coverRecommendations, current.driveUrl);
      if (saved.length) {
        const assets = await client.getDocuments(saved.map(frame => frame.image.asset._ref));
        assert(assets.every(Boolean), 'Stored candidate asset is missing');
        result.status = 'already-ready';
        result.candidates = saved.length;
      } else {
        const endpoint = new URL('http://127.0.0.1:4337/api/drive-video');
        endpoint.searchParams.set('url', driveMedia(current.driveUrl).open);
        endpoint.searchParams.set('session', '1');
        const response = await fetch(endpoint, {headers: {Authorization: `Bearer ${token}`, Origin: 'http://127.0.0.1:4336'}, signal: AbortSignal.timeout(30000)});
        const session = await response.json();
        assert.equal(response.status, 200, session.error || 'Could not create Drive session');
        assert.equal(typeof session.ticket, 'string');
        endpoint.searchParams.delete('session');
        endpoint.searchParams.set('ticket', session.ticket);
        await page.goto('http://127.0.0.1:4336/work/cover-batch/index.html');
        await page.waitForFunction(() => window.analyzeVideo);
        const analysis = await page.evaluate(source => window.analyzeVideo(source), endpoint.href);
        assert(analysis.frames.length > 0 && analysis.frames.length <= 6, 'No usable distinct frames; manual review required');
        const frameFolder = `${folder}/${original._id}`;
        await mkdir(frameFolder, {recursive: true});
        const frames = [];
        for (const [frameIndex, frame] of analysis.frames.entries()) {
          assert.match(frame.dataUrl, /^data:image\/jpeg;base64,/);
          const bytes = Buffer.from(frame.dataUrl.split(',')[1], 'base64');
          assert(bytes.length > 100);
          const filename = `candidate-${frameIndex + 1}.jpg`;
          await writeFile(`${frameFolder}/${filename}`, bytes);
          if (commit) {
            const asset = await client.assets.upload('image', bytes, {filename: `cover-candidate-${original._id}-${frameIndex + 1}.jpg`});
            frames.push({time: frame.time, assetId: asset._id});
          }
        }
        if (commit) {
          const payload = recommendationPayload(current.driveUrl, analysis.duration, frames);
          await client.patch(current._id).ifRevisionId(current._rev).set({coverRecommendations: payload}).commit({visibility: 'sync'});
          const after = await client.getDocument(current._id);
          assert.deepEqual(preserve(after), preserve(current), 'Only candidate data may change');
          assert.deepEqual(after.coverRecommendations, payload);
          result.assetIds = frames.map(frame => frame.assetId);
          result.status = 'ready';
        } else result.status = 'analyzed';
        result.candidates = analysis.frames.length;
        result.duration = analysis.duration;
        result.videoDimensions = {width: analysis.width, height: analysis.height};
        result.timestamps = analysis.frames.map(frame => frame.time);
        await writeFile(`${frameFolder}/analysis.json`, JSON.stringify({...result, frames: analysis.frames.map((frame, frameIndex) => ({time: frame.time, file: `candidate-${frameIndex + 1}.jpg`}))}, null, 2));
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.videoState = await page.evaluate(() => {
        const player = document.querySelector('video');
        return player ? {duration: player.duration, time: player.currentTime, readyState: player.readyState, networkState: player.networkState, seeking: player.seeking, error: player.error?.message, progress: document.querySelector('#progress')?.textContent} : null;
      }).catch(() => null);
      result.mediaRequests = mediaRequests;
    }
    report.results.push(result);
    await writeFile(resultFile, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(result));
    await page.evaluate(() => {const player = document.querySelector('video'); player.removeAttribute('src'); player.load();}).catch(() => {});
  }
  const afterDocuments = await client.fetch(query);
  const afterMap = new Map(afterDocuments.map(document => [document._id, document]));
  const allowed = new Set(report.results.filter(result => result.status === 'ready').map(result => result.id));
  for (const before of currentDocuments) {
    const after = afterMap.get(before._id);
    assert(after, `${before._id} disappeared`);
    if (allowed.has(before._id)) assert.deepEqual(preserve(after), preserve(before));
    else assert.deepEqual(after, before, `${before._id}: unrelated document changed during batch`);
  }
  report.finishedAt = new Date().toISOString();
  report.coverFieldsPreserved = true;
  report.publishedDocumentsUnchanged = true;
  report.unrelatedDocumentsUnchanged = true;
  report.ready = report.results.filter(result => ['ready','already-ready'].includes(result.status)).length;
  report.failed = report.results.filter(result => result.status === 'failed').length;
  await writeFile(resultFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({mode: report.mode, ready: report.ready, failed: report.failed, coverFieldsPreserved: true, publishedDocumentsUnchanged: true}));
  if (report.failed) process.exitCode = 1;
} finally {
  await browser?.close();
  await server.close();
  proxy.closeAllConnections();
  if (proxy.listening) await new Promise(resolve => proxy.close(resolve));
}
