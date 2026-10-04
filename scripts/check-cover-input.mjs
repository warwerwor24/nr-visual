import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { normalizeValidationRules } from '@sanity/validation/_internal';

const folder = resolve('work/cover-check');
await mkdir(folder, { recursive: true });
await writeFile(`${folder}/sanity.mjs`, `
export const defineConfig = value => value;
export const defineType = value => value;
export const defineField = value => value;
export const structureTool = () => ({});
export const useFormValue = path => path[0] === 'kind' ? window.testKind : 'Cover test';
export const useClient = () => ({assets: {upload: async (type, blob) => {
  window.uploads = (window.uploads || 0) + 1;
  if (window.failUpload) throw new Error('Upload failed. Try again.');
  const bitmap = await createImageBitmap(blob);
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
window.testKind = 'video';
const root = createRoot(document.getElementById('root'));
window.renderInput = readOnly => root.render(<ThemeProvider theme={studioTheme}>
  <VideoCoverInput readOnly={readOnly} value={{alt: 'Existing description', crop: {}, hotspot: {}}}
    renderDefault={() => <p>Existing cover input</p>} onChange={patches => {window.patches = patches;}} />
</ThemeProvider>);
window.renderInput(false);
`);
const server = await createServer({
  configFile: false,
  resolve: { alias: [{ find: /^sanity(?:\/structure)?$/, replacement: `${folder}/sanity.mjs` }] },
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 4334, strictPort: true },
});
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let browser;
try {
  const { default: config } = await server.ssrLoadModule('/sanity.config.ts');
  const field = config.schema.types.find(type => type.name === 'project').fields.find(field => field.name === 'videoFormat');
  const rules = normalizeValidationRules({ ...field, jsonType: 'string' });
  const context = { path: ['videoFormat'], type: { jsonType: 'string' }, i18n: { t: key => key } };
  for (const value of ['16:9', '9:16', '1:1', '4:5', undefined]) {
    assert.deepEqual((await Promise.all(rules.map(rule => rule.validate(value, context)))).flat(), [], `Format ${value} must be accepted`);
  }
  assert.ok((await Promise.all(rules.map(rule => rule.validate('bad', context)))).flat().length > 0);
  console.log('PASS: Actual schema accepts all four formats and rejects invalid values.');
  await server.listen();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 884 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4334/work/cover-check/index.html');
  await page.getByLabel('Video file', { exact: true }).waitFor();
  const recording = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const finished = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    const draw = setInterval(() => { context.fillStyle = '#5fccf4'; context.fillRect(0, 0, 360, 640); }, 100);
    await new Promise(resolve => setTimeout(resolve, 1500));
    recorder.stop();
    await finished;
    clearInterval(draw);
    stream.getTracks().forEach(track => track.stop());
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  const fixture = Buffer.from(recording);
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
  await page.getByLabel('Video file', { exact: true }).setInputFiles({ name: 'broken.mp4', mimeType: 'video/mp4', buffer: Buffer.from('invalid video') });
  await page.getByRole('alert').getByText('Your browser cannot read this video.', { exact: false }).waitFor();
  assert.equal(await save.isDisabled(), true);
  await page.evaluate(() => window.renderInput(true));
  await page.getByLabel('Video file', { exact: true }).waitFor({ state: 'detached' });
  await page.evaluate(() => { window.testKind = 'photo'; window.renderInput(false); });
  await page.getByText('Existing cover input').waitFor();
  assert.equal(await page.getByLabel('Video file', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: Local video seek, portrait frame capture, draft patches, preserved cover on upload failure, invalid codec state, keyboard slider, mobile, read-only and photography. Upload is mocked; no CMS content changed.');
} finally {
  await browser?.close();
  await server.close();
}
