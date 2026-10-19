import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { normalizeValidationRules } from '@sanity/validation/_internal';
import driveVideo from '../api/drive-video.mjs';
import { randomBytes } from 'node:crypto';
import { createServer as createHttpServer } from 'node:http';

if (process.env.LIVE_DRIVE_COVER) {
  process.env.DRIVE_VIDEO_SIGNING_SECRET ||= randomBytes(32).toString('hex');
  process.env.SITE_URL = 'http://127.0.0.1:4334';
}
const liveProxy = process.env.LIVE_DRIVE_COVER ? createHttpServer((request, response) => driveVideo(request, response)) : null;

const folder = resolve('work/cover-check');
await mkdir(folder, { recursive: true });
await writeFile(`${folder}/sanity.mjs`, `
export const defineConfig = value => value;
export const defineType = value => value;
export const defineField = value => value;
export const structureTool = () => ({});
export const useFormValue = path => path[0] === 'kind' ? window.testKind : path[0] === 'cover' ? window.workCover : path[0] === 'coverRecommendations' ? window.savedRecommendations : path[0] === 'driveUrl' ? window.driveUrl : 'Cover test';
export const useClient = () => ({config: () => ({token: window.liveToken || 'local-test-token', projectId: 'n4rtv48x', dataset: 'production'}), assets: {upload: async (type, blob, options) => {
  window.uploads = (window.uploads || 0) + 1;
  if (window.failUpload) throw new Error('Upload failed. Try again.');
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, 1, 1);
  window.framePixel = Array.from(canvas.getContext('2d').getImageData(0, 0, 1, 1).data);
  window.savedFilename = options.filename;
  window.frame = {width: bitmap.width, height: bitmap.height, type: blob.type};
  bitmap.close();
  return {_id: 'image-test-360x640-jpg'};
}}});
export const set = (value, path = []) => ({type: 'set', value, path});
export const setIfMissing = (value, path = []) => ({type: 'setIfMissing', value, path});
export const unset = path => ({type: 'unset', path});
`);
await writeFile(`${folder}/index.html`, '<div id="root"></div><script type="module" src="./main.jsx"></script>');
await writeFile(`${folder}/main.jsx`, `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider, studioTheme} from '@sanity/ui';
import {VideoCoverInput} from '/sanity/VideoCoverInput.tsx';
import {GalleryCoverInput} from '/sanity/GalleryCoverInput.tsx';
window.testKind = 'video';
const root = createRoot(document.getElementById('root'));
window.renderInput = readOnly => root.render(<ThemeProvider theme={studioTheme} scheme={window.testScheme || 'light'}>
  <VideoCoverInput readOnly={readOnly} value={{alt: 'Existing description', crop: {}, hotspot: {}}}
    renderDefault={() => <p>Existing cover input</p>} onChange={patches => {window.patches = patches;}} />
</ThemeProvider>);
window.renderInput(false);
window.renderGallery = readOnly => root.render(<ThemeProvider theme={studioTheme}>
  <GalleryCoverInput readOnly={readOnly} renderDefault={() => <p>Gallery image editor</p>}
    onChange={patch => {window.galleryPatch = patch;}} />
</ThemeProvider>);
`);
const server = await createServer({
  configFile: false,
  cacheDir: `${folder}/vite-cache`,
  resolve: { alias: [{ find: /^sanity(?:\/structure)?$/, replacement: `${folder}/sanity.mjs` }] },
  esbuild: { jsx: 'automatic' },
  define: { 'process.env.SANITY_STUDIO_DRIVE_VIDEO_URL': JSON.stringify(`http://127.0.0.1:${liveProxy ? 4335 : 4334}/api/drive-video`) },
  server: { host: '127.0.0.1', port: 4334, strictPort: true },
});
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let browser;
try {
  if (liveProxy) await new Promise((resolve, reject) => {
    liveProxy.once('error', reject);
    liveProxy.listen(4335, '127.0.0.1', resolve);
  });
  const { default: config } = await server.ssrLoadModule('/sanity.config.ts');
  const field = config.schema.types.find(type => type.name === 'project').fields.find(field => field.name === 'videoFormat');
  const rules = normalizeValidationRules({ ...field, jsonType: 'string' });
  const context = { path: ['videoFormat'], type: { jsonType: 'string' }, i18n: { t: key => key } };
  for (const value of ['16:9', '9:16', '1:1', '4:5', undefined]) {
    assert.deepEqual((await Promise.all(rules.map(rule => rule.validate(value, context)))).flat(), [], `Format ${value} must be accepted`);
  }
  assert.ok((await Promise.all(rules.map(rule => rule.validate('bad', context)))).flat().length > 0);
  console.log('PASS: Actual schema accepts all four formats and rejects invalid values.');
  const fields = config.schema.types.find(type => type.name === 'project').fields;
  assert.equal(fields.find(field => field.name === 'coverRecommendations').hidden, true);
  assert.equal(fields.find(field => field.name === 'coverRecommendations').readOnly, true);
  assert.equal(fields.find(field => field.name === 'cover').options.hotspot.previews[0].aspectRatio, 16 / 9);
  const galleryField = fields.find(field => field.name === 'galleryCover');
  assert.equal(galleryField.options.hotspot.previews[0].aspectRatio, .8);
  assert.deepEqual((await Promise.all(normalizeValidationRules({...galleryField, jsonType: 'object'}).map(rule => rule.validate(undefined, {...context, path: ['galleryCover'], type: {jsonType: 'object'}})))).flat(), [], 'Gallery override stays optional for existing projects');
  await server.listen();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 884 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4334/work/cover-check/index.html');
  await page.getByLabel('Video file', { exact: true }).waitFor();
  const loadDrive = page.getByRole('button', { name: 'Muat video dari Drive', exact: true });
  assert(await loadDrive.isDisabled(), 'Missing Drive link must disable the remote loader');
  const recording = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    document.body.append(canvas);
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const finished = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    for (let frame = 0; frame < 16; frame++) {
      context.fillStyle = frame % 2 ? '#5fccf4' : '#faef59';
      context.fillRect(0, 0, 360, 640);
      track.requestFrame();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    recorder.stop();
    await finished;
    stream.getTracks().forEach(track => track.stop());
    canvas.remove();
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  const fixture = Buffer.from(recording);
  assert(fixture.length > 500, 'Browser fixture must contain encoded video frames, not just a WebM header');
  await writeFile(`${folder}/portrait.webm`, fixture);
  await page.getByLabel('Video file', { exact: true }).setInputFiles({ name: 'portrait.webm', mimeType: 'video/webm', buffer: fixture });
  const save = page.getByRole('button', { name: 'Use this frame as cover' });
  await page.waitForFunction(() => document.querySelector('video').readyState >= 2).catch(async error => {
    console.log(await page.evaluate(() => ({text: document.body.innerText, video: {duration: document.querySelector('video').duration, readyState: document.querySelector('video').readyState, error: document.querySelector('video').error?.message}})));
    throw error;
  });
  await page.getByRole('slider').evaluate(slider => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '.80');
    slider.dispatchEvent(new Event('input', {bubbles: true}));
    slider.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - .8) < .02 && !document.querySelector('video').seeking);
  await save.click();
  await page.getByText('Cover saved to draft.', { exact: false }).waitFor();
  const result = await page.evaluate(() => ({ frame: window.frame, patches: window.patches, uploads: window.uploads }));
  assert.deepEqual(result.frame, { width: 360, height: 640, type: 'image/jpeg' });
  assert.equal(result.uploads, 1);
  assert.ok(result.patches.some(patch => patch.type === 'set' && patch.path[0] === 'asset'));
  assert.ok(result.patches.some(patch => patch.type === 'unset' && patch.path[0] === 'crop'));
  assert.ok(!result.patches.some(patch => patch.path[0] === 'alt'), 'Preserve existing description');
  await page.evaluate(() => { window.failUpload = true; window.patches = null; });
  await save.click();
  await page.getByRole('alert').getByText('Upload failed. Try again.').waitFor();
  assert.equal(await page.evaluate(() => window.patches), null, 'Failed upload must preserve the current cover');
  await page.screenshot({ path: `${folder}/mobile.png` });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile overflow');
  await page.getByRole('slider').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('video').currentTime > .8);
  let remote = 'video';
  const remoteRequests = [];
  await page.route('**/api/drive-video?*', async route => {
    remoteRequests.push({ url: route.request().url(), authorization: route.request().headers().authorization });
    if (new URL(route.request().url()).searchParams.has('session')) {
      if (remote === 'denied') return route.fulfill({status: 502, json: {error: 'Drive belum bisa mengirim video.'}});
      if (remote === 'slow') await new Promise(resolve => setTimeout(resolve, 1000));
      return route.fulfill({json: {ticket: 'mock-video-session'}}).catch(() => {});
    }
    if (remote === 'slow-video') await new Promise(resolve => setTimeout(resolve, 1000));
    const range = route.request().headers().range;
    const match = /^bytes=(\d+)-(\d*)$/.exec(range || 'bytes=0-');
    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), fixture.length - 1) : fixture.length - 1;
    await route.fulfill({status: 206, contentType: 'video/webm', body: fixture.subarray(start, end + 1), headers: {
      'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${fixture.length}`,
    }}).catch(() => {});
  });
  await page.evaluate(() => {
    window.driveUrl = 'https://drive.google.com/file/d/abcdefghijklmnop/view?resourcekey=0-test';
    window.failUpload = false;
    window.renderInput(false);
  });
  await loadDrive.waitFor();
  remote = 'denied';
  await loadDrive.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('alert').getByText('Drive belum bisa mengirim video.').waitFor();
  assert.equal(await page.evaluate(() => window.patches), null, 'Drive failure must preserve the existing cover');
  assert.equal(await page.evaluate(() => window.uploads), 2, 'Loading a source must not upload a frame');
  remote = 'video';
  await loadDrive.click();
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2).catch(async error => {
    console.log(await page.evaluate(() => ({text: document.body.innerText, video: {duration: document.querySelector('video')?.duration, readyState: document.querySelector('video')?.readyState, error: document.querySelector('video')?.error?.message}})));
    console.log(remoteRequests);
    throw error;
  });
  assert.equal(await page.evaluate(() => window.uploads), 2, 'Loaded Drive video waits for manual selection');
  const sessionRequest = remoteRequests.findLast(request => new URL(request.url).searchParams.has('session'));
  assert.equal(new URL(sessionRequest.url).searchParams.get('url'), 'https://drive.google.com/file/d/abcdefghijklmnop/view?resourcekey=0-test');
  assert.equal(sessionRequest.authorization, 'Bearer local-test-token');
  assert.equal(remoteRequests.at(-1).authorization, undefined, 'Native video requests must not contain the personal login token');
  assert.equal(new URL(remoteRequests.at(-1).url).searchParams.get('ticket'), 'mock-video-session');
  assert.equal(await page.locator('video').getAttribute('preload'), 'metadata');
  assert.equal(await page.locator('video').getAttribute('crossorigin'), 'anonymous');
  await page.getByRole('slider').evaluate(slider => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '.80');
    slider.dispatchEvent(new Event('input', {bubbles: true}));
  });
  await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - .8) < .02 && !document.querySelector('video').seeking);
  const selectedPixel = await page.locator('video').evaluate(video => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    canvas.getContext('2d').drawImage(video, 0, 0, 1, 1);
    return Array.from(canvas.getContext('2d').getImageData(0, 0, 1, 1).data);
  });
  await save.click();
  await page.getByText('Cover saved to draft.', { exact: false }).waitFor();
  assert.equal(await page.evaluate(() => window.savedFilename), 'video-cover-800.jpg');
  const capturedPixel = await page.evaluate(() => window.framePixel);
  selectedPixel.forEach((channel, index) => assert(Math.abs(channel - capturedPixel[index]) <= 4, 'Uploaded JPEG must contain the manually selected frame'));
  assert.equal(await page.getByLabel('Video file', {exact: true}).inputValue(), '', 'Drive loading must clear the old local filename');
  for (const scheme of ['light', 'dark']) {
    await page.evaluate(scheme => {window.testScheme = scheme; window.renderInput(false);}, scheme);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 900});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scheme}/${width}: no overflow`);
      assert.ok((await page.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height))).every(height => height >= 44));
    }
    const contrasts = await page.locator('[data-ui="Text"], label').evaluateAll(elements => {
      const luminance = color => {
        const channels = color.match(/[\d.]+/g)?.map(Number).slice(0, 3) || [];
        return channels.map(channel => color.startsWith('color(') ? channel : channel / 255)
          .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
          .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      };
      return elements.filter(element => element.textContent.trim() && !element.closest('button[disabled]')).map(element => {
        let parent = element;
        let background = 'transparent';
        while (parent && ['transparent', 'rgba(0, 0, 0, 0)'].includes(background)) {
          background = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        const foreground = getComputedStyle(element).color;
        return {text: element.textContent, ratio: (Math.max(luminance(foreground), luminance(background)) + .05) / (Math.min(luminance(foreground), luminance(background)) + .05)};
      });
    });
    assert.ok(contrasts.length && contrasts.every(result => result.ratio >= 4.5), JSON.stringify({scheme, contrasts}));
    console.log(`PASS: Drive controls ${scheme} contrast minimum ${Math.min(...contrasts.map(result => result.ratio)).toFixed(2)}:1, four widths and 44px buttons.`);
    await page.setViewportSize({width: 390, height: 884});
    await page.screenshot({path: `${folder}/drive-${scheme}.png`});
  }
  await page.evaluate(() => {window.testScheme = 'light'; window.renderInput(false);});
  await page.screenshot({ path: `${folder}/drive-mobile.png` });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Drive controls must not overflow on mobile');
  await page.setViewportSize({width: 1440, height: 900});
  await page.screenshot({ path: `${folder}/drive-desktop.png` });
  remote = 'slow';
  await page.evaluate(() => {window.patches = null;});
  await loadDrive.click();
  await page.getByRole('button', {name: 'Batalkan pemuatan'}).click();
  await page.getByText('Pemuatan video dibatalkan.').waitFor();
  assert.equal(await page.locator('video').count(), 0);
  assert.equal(await page.evaluate(() => window.patches), null, 'Cancellation must preserve the existing cover');
  assert.equal(await page.evaluate(() => window.uploads), 3);
  remote = 'slow-video';
  await loadDrive.click();
  await page.locator('video').waitFor();
  await page.getByRole('button', {name: 'Batalkan pemuatan'}).click();
  await page.getByText('Pemuatan video dibatalkan.').waitFor();
  assert.equal(await page.locator('video').count(), 0, 'Cancel must also stop the native player after session creation');
  remote = 'slow';
  await loadDrive.click();
  await page.getByRole('button', {name: 'Batalkan pemuatan'}).waitFor();
  await page.evaluate(() => {window.driveUrl = ''; window.renderInput(false);});
  await page.getByRole('button', {name: 'Batalkan pemuatan'}).waitFor({state: 'detached'});
  assert(await loadDrive.isDisabled(), 'Changing the link cancels the old request and invalidates its selected frame');
  assert.equal(await page.locator('video').count(), 0);
  await page.setViewportSize({width: 390, height: 884});
  await page.getByLabel('Video file', { exact: true }).setInputFiles({ name: 'broken.mp4', mimeType: 'video/mp4', buffer: Buffer.from('invalid video') });
  await page.getByRole('alert').getByText('Your browser cannot read this video.', { exact: false }).waitFor();
  assert.equal(await save.isDisabled(), true);
  await page.evaluate(() => window.renderInput(true));
  await page.getByLabel('Video file', { exact: true }).waitFor({ state: 'detached' });
  await page.evaluate(() => { window.testKind = 'photo'; window.renderInput(false); });
  await page.getByText('Existing cover input').waitFor();
  assert.equal(await page.getByLabel('Video file', { exact: true }).count(), 0);
  await page.evaluate(() => {window.workCover = undefined; window.renderGallery(false);});
  const reuse = page.getByRole('button', {name: 'Use WORK cover image'});
  await reuse.waitFor();
  assert(await reuse.isDisabled());
  await page.evaluate(() => {window.workCover = {asset: {_type: 'reference', _ref: 'image-test-360x640-jpg'}, alt: 'Existing description', crop: {top: .3}, hotspot: {x: .5, y: .2}}; window.renderGallery(false);});
  await reuse.click();
  assert.deepEqual(await page.evaluate(() => window.galleryPatch), {type: 'set', path: [], value: {_type: 'image', asset: {_type: 'reference', _ref: 'image-test-360x640-jpg'}, alt: 'Existing description'}});
  assert.equal(await page.evaluate(() => window.uploads), 3, 'Reusing WORK image must not upload another asset');
  await page.evaluate(() => window.renderGallery(true));
  await reuse.waitFor({state: 'detached'});
  console.log('PASS: Separate gallery crop previews, optional legacy fallback, same asset reused without crop/hotspot inheritance or upload, read-only respected.');
  await page.evaluate(() => {window.testKind = 'video'; window.patches = null; window.renderInput(false);});
  await page.getByLabel('Video file', {exact: true}).setInputFiles({name: 'flat.webm', mimeType: 'video/webm', buffer: fixture});
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
  const recommend = page.getByRole('button', {name: 'Cari frame rekomendasi', exact: true});
  const uploadsBefore = await page.evaluate(() => window.uploads);
  await recommend.click();
  await page.getByText('Belum ada frame yang cukup terang', {exact: false}).waitFor();
  assert.equal(await page.getByRole('button', {name: /^Preview kandidat/}).count(), 0, 'Solid colors must not produce misleading recommendations');
  const detailedRecording = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 360;
    document.body.append(canvas);
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const recorder = new MediaRecorder(stream, {mimeType: 'video/webm;codecs=vp8'});
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const finished = new Promise(resolve => {recorder.onstop = resolve;});
    const colors = [[180,80,50], [50,160,80], [60,100,190], [190,160,50], [160,60,170], [40,160,180]];
    recorder.start();
    for (let frame = 0; frame < 72; frame++) {
      const color = colors[Math.floor(frame / 12)];
      for (let y = 0; y < 360; y += 32) for (let x = 0; x < 640; x += 32) {
        const shade = (Math.floor(x / 32) + Math.floor(y / 32)) % 2 ? 35 : -35;
        context.fillStyle = `rgb(${color.map(value => value + shade).join(',')})`;
        context.fillRect(x, y, 32, 32);
      }
      track.requestFrame();
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    recorder.stop(); await finished;
    stream.getTracks().forEach(track => track.stop()); canvas.remove();
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  const detailedFixture = Buffer.from(detailedRecording);
  await writeFile(`${folder}/detailed.webm`, detailedFixture);
  await page.getByLabel('Video file', {exact: true}).setInputFiles({name: 'detailed.webm', mimeType: 'video/webm', buffer: detailedFixture});
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
  await recommend.click();
  assert(await save.isDisabled(), 'Saving must be disabled while sampling');
  await page.getByRole('button', {name: 'Batalkan pencarian'}).click();
  await page.getByText('Pencarian dibatalkan. Cover belum berubah.').waitFor();
  await recommend.waitFor();
  await recommend.click();
  await page.getByText('kandidat ditemukan.', {exact: false}).waitFor();
  await page.getByRole('button', {name: 'Batalkan pencarian'}).waitFor({state: 'detached'});
  const choices = page.getByRole('button', {name: /^Preview kandidat/});
  const count = await choices.count();
  assert(count >= 4 && count <= 6, `Expected 4–6 distinct candidates, got ${count}`);
  assert.equal(await page.evaluate(() => window.uploads), uploadsBefore, 'Analysis must not upload');
  assert.equal(await page.evaluate(() => window.patches), null, 'Analysis must not patch the cover');
  for (let index = 0; index < count; index++) {
    await choices.nth(index).click();
    await page.waitForFunction(index => document.querySelectorAll('button[aria-pressed]')[index]?.getAttribute('aria-pressed') === 'true', index);
  }
  await choices.nth(1).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('button[aria-pressed="true"]'));
  const focus = await choices.nth(1).evaluate(button => ({visible: button.matches(':focus-visible'), outline: getComputedStyle(button).outlineStyle, shadow: getComputedStyle(button).boxShadow}));
  assert(focus.visible && (focus.outline !== 'none' || focus.shadow !== 'none'), 'Keyboard candidate selection must retain a visible focus indicator');
  const selectedTime = await page.locator('video').evaluate(video => video.currentTime);
  assert.equal(await page.evaluate(() => window.uploads), uploadsBefore, 'Preview must not upload');
  assert.equal(await page.evaluate(() => window.patches), null, 'Preview must not patch the cover');
  assert.equal(await page.getByRole('img', {name: /^Preview cover pada/}).count(), 1);
  for (const scheme of ['light', 'dark']) {
    await page.evaluate(scheme => {window.testScheme = scheme; window.renderInput(false);}, scheme);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 900});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scheme}/${width}: candidates fit`);
      assert((await choices.evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height))).every(height => height >= 44));
      await page.screenshot({path: `${folder}/recommendations-${scheme}-${width}.png`, fullPage: true});
    }
    const candidateContrasts = await choices.locator('[data-ui="Text"]').evaluateAll(elements => {
      const luminance = color => {
        const channels = color.match(/[\d.]+/g)?.map(Number).slice(0, 3) || [];
        return channels.map(channel => color.startsWith('color(') ? channel : channel / 255)
          .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
          .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      };
      return elements.map(element => {
        let parent = element;
        let background = 'transparent';
        while (parent && ['transparent', 'rgba(0, 0, 0, 0)'].includes(background)) {
          background = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        const foreground = getComputedStyle(element).color;
        return (Math.max(luminance(foreground), luminance(background)) + .05) / (Math.min(luminance(foreground), luminance(background)) + .05);
      });
    });
    assert(candidateContrasts.length && candidateContrasts.every(ratio => ratio >= 4.5), `${scheme}: candidate contrast ${candidateContrasts}`);
    console.log(`PASS: ${scheme} candidate text contrast minimum ${Math.min(...candidateContrasts).toFixed(2)}:1.`);
  }
  await save.click();
  await page.getByText('Cover saved to draft.', {exact: false}).waitFor();
  assert.equal(await page.evaluate(() => window.uploads), uploadsBefore + 1, 'Only confirmation uploads one JPEG');
  assert.equal(await page.evaluate(() => window.savedFilename), `video-cover-${Math.round(selectedTime * 1000)}.jpg`);
  await page.evaluate(() => {
    window.patches = null;
    window.originalImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = () => {throw new DOMException('Canvas blocked by CORS', 'SecurityError');};
  });
  await recommend.click();
  await page.getByRole('alert').getByText('Canvas blocked by CORS').waitFor();
  await page.getByRole('button', {name: 'Batalkan pencarian'}).waitFor({state: 'detached'});
  assert.equal(await page.evaluate(() => window.patches), null, 'Canvas failure must preserve the existing cover');
  assert.equal(await page.evaluate(() => window.uploads), uploadsBefore + 1);
  await page.evaluate(() => {CanvasRenderingContext2D.prototype.getImageData = window.originalImageData;});
  await recommend.click();
  await page.evaluate(() => {window.driveUrl = 'https://drive.google.com/file/d/changedsource12345/view'; window.renderInput(false);});
  await page.locator('video').waitFor({state: 'detached'});
  assert.equal(await choices.count(), 0, 'Changing the source clears candidates and cancels analysis');
  await page.evaluate(() => window.renderInput(true));
  assert.equal(await recommend.count(), 0, 'Read-only inputs have no analysis controls');
  console.log('PASS: Frame recommendations reject blank frames, offer 4–6 distinct previews, cancel and reset safely; keyboard preview, source changes, both themes/four widths, no patches or uploads until confirmation.');
  await page.route('https://cdn.sanity.io/images/**', async route => {
    await route.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#aaa"/></svg>'});
  });
  await page.evaluate(() => {
    window.driveUrl = 'https://drive.google.com/file/d/abcdefghijklmnop/view';
    window.savedRecommendations = {version: 1, sourceUrl: window.driveUrl, duration: 10, frames: [
      {_key: 'frame-1', time: 2, image: {_type: 'image', asset: {_type: 'reference', _ref: 'image-abc123-900x1600-jpg'}}},
      {_key: 'frame-2', time: 6, image: {_type: 'image', asset: {_type: 'reference', _ref: 'image-def456-1920x1080-jpg'}}},
    ]};
    window.patches = null;
    window.renderInput(false);
  });
  await page.getByText('Rekomendasi siap dipilih').waitFor();
  assert.equal(await page.locator('video').count(), 0, 'Saved recommendations need no video load');
  const cachedUploads = await page.evaluate(() => window.uploads);
  await page.getByRole('button', {name: /^Preview kandidat/}).nth(1).click();
  assert.equal(await page.evaluate(() => window.patches), null, 'Stored preview does not choose a cover');
  await page.getByRole('button', {name: 'Gunakan kandidat ini sebagai cover'}).click();
  const reused = await page.evaluate(() => ({patches: window.patches, uploads: window.uploads}));
  assert.equal(reused.uploads, cachedUploads, 'Choosing stored candidate reuses its asset without upload');
  assert(reused.patches.some(patch => patch.type === 'set' && patch.path[0] === 'asset' && patch.value._ref === 'image-def456-1920x1080-jpg'));
  assert(reused.patches.some(patch => patch.type === 'unset' && patch.path[0] === 'crop'));
  assert(!reused.patches.some(patch => patch.path[0] === 'alt'), 'Existing description stays intact');
  await page.reload();
  await page.evaluate(() => {
    window.driveUrl = 'https://drive.google.com/file/d/abcdefghijklmnop/view';
    window.savedRecommendations = {version: 1, sourceUrl: window.driveUrl, duration: 10, frames: [
      {_key: 'frame-1', time: 2, image: {_type: 'image', asset: {_type: 'reference', _ref: 'image-abc123-900x1600-jpg'}}},
    ]};
    window.renderInput(false);
  });
  await page.getByText('Rekomendasi siap dipilih').waitFor();
  assert.equal(await page.locator('video').count(), 0, 'A fresh page restores candidates from document data');
  for (const scheme of ['light', 'dark']) {
    await page.evaluate(scheme => {window.testScheme = scheme; window.renderInput(false);}, scheme);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 900});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Stored candidates fit viewport');
    }
  }
  await page.getByRole('button', {name: /^Preview kandidat/}).first().focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', {name: 'Gunakan kandidat ini sebagai cover'}).waitFor();
  await page.screenshot({path: `${folder}/stored-candidates.png`, fullPage: true});
  await page.evaluate(() => {window.driveUrl = 'https://drive.google.com/file/d/changedsource12345/view'; window.renderInput(false);});
  assert.equal(await page.getByRole('button', {name: /^Preview kandidat/}).count(), 0, 'Saved candidates are invalidated by a new source');
  await page.evaluate(() => window.renderInput(true));
  assert.equal(await page.getByRole('button', {name: 'Gunakan kandidat ini sebagai cover'}).count(), 0);
  await page.evaluate(() => {window.savedRecommendations = undefined; window.renderInput(false);});
  console.log('PASS: Persistent candidates render without video after page reload, reuse original asset only on confirmation, preserve crop/description rules, reject changed source, respect read-only and keyboard/mobile states.');
  if (process.env.LIVE_DRIVE_COVER) {
    const {getCliClient} = await import('sanity/cli');
    const client = getCliClient({apiVersion: '2025-02-19'});
    const token = client.config().token;
    assert(token, 'Run the live check through sanity exec --with-user-token');
    const project = await client.fetch('*[_type == "project" && kind == "video" && title == "Euroskinlab Clinic Treatment" && !(_id in path("drafts.**"))][0]{title,driveUrl}');
    assert(project?.driveUrl, 'Published video source must exist for the live check');
    await page.unroute('**/api/drive-video?*');
    await page.evaluate(({token, project}) => {
      window.liveToken = token;
      window.driveUrl = project.driveUrl;
      window.testKind = 'video';
      window.failUpload = false;
      window.patches = null;
      window.renderInput(false);
    }, {token, project});
    await loadDrive.click();
    await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2 || document.querySelector('[role="alert"]'), undefined, {timeout: 180000});
    assert.equal(await page.getByRole('alert').count(), 0, await page.locator('body').innerText());
    await page.getByRole('slider').evaluate(slider => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '4');
      slider.dispatchEvent(new Event('input', {bubbles: true}));
    });
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 4) < .02 && !document.querySelector('video').seeking);
    await save.click();
    await page.getByText('Cover saved to draft.', {exact: false}).waitFor();
    const proof = await page.evaluate(() => ({duration: document.querySelector('video').duration, time: document.querySelector('video').currentTime, frame: window.frame, filename: window.savedFilename}));
    assert.equal(proof.filename, 'video-cover-4000.jpg');
    assert(Math.max(proof.frame.width, proof.frame.height) <= 1600);
    await recommend.click();
    await page.getByText('kandidat ditemukan.', {exact: false}).waitFor({timeout: 150000});
    await page.getByRole('button', {name: 'Batalkan pencarian'}).waitFor({state: 'detached'});
    const liveCandidates = await page.getByRole('button', {name: /^Preview kandidat/}).count();
    assert(liveCandidates > 0 && liveCandidates <= 6);
    const liveUploads = await page.evaluate(() => window.uploads);
    await page.evaluate(() => {window.patches = null;});
    await page.getByRole('button', {name: /^Preview kandidat/}).first().click();
    await page.getByRole('img', {name: /^Preview cover pada/}).waitFor();
    assert.equal(await page.evaluate(() => window.uploads), liveUploads);
    assert.equal(await page.evaluate(() => window.patches), null);
    await page.screenshot({path: `${folder}/drive-live.png`});
    console.log('PASS: Real Sanity membership, signed Drive streaming, JPEG capture and recommendation previews:', JSON.stringify({...proof, candidates: liveCandidates}));
    await page.evaluate(() => {window.liveToken = '';});
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: Drive loading, manual frame pixels, no automatic upload, failed download, cancellation and link changes; local fallback, portrait capture, draft patches, upload failure, invalid codec, keyboard, mobile/desktop, read-only and photography. ${process.env.LIVE_DRIVE_COVER ? 'Live Drive also checked' : 'Drive mocked'}; upload mocked; no CMS content changed.`);
} finally {
  await browser?.close();
  await server.close();
  liveProxy?.closeAllConnections();
  if (liveProxy?.listening) await new Promise(resolve => liveProxy.close(resolve));
}
