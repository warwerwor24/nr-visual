import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { normalizeValidationRules } from '@sanity/validation/_internal';

const folder = resolve('work/photo-form-check');
await mkdir(folder, { recursive: true });
await writeFile(`${folder}/sanity.mjs`, `
export const defineConfig = value => value;
export const defineType = value => value;
export const defineField = value => value;
export const structureTool = options => options;
export const useFormValue = path => window.qaDocument[path[0]];
export const useClient = () => ({config: () => ({projectId: 'n4rtv48x', dataset: 'production'}), assets: {upload: async (type, file) => {
  window.uploads = [...(window.uploads || []), file.name];
  await new Promise(resolve => setTimeout(resolve, 25));
  if (file.name === window.failedFile) throw new Error('Local QA upload failure');
  return {_id: 'image-fixture-upload'};
}}});
export const set = (value, path = []) => ({type: 'set', value, path});
export const setIfMissing = (value, path = []) => ({type: 'setIfMissing', value, path});
export const unset = path => ({type: 'unset', path});
export const insert = (items, position, path) => ({type: 'insert', items, position, path});
`);
await writeFile(`${folder}/index.html`, '<html lang="id"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Isolated photo form QA</title><div id="root"></div><script type="module" src="./main.jsx"></script></html>');
await writeFile(`${folder}/main.jsx`, `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button, Card, ThemeProvider, studioTheme} from '@sanity/ui';
import {PhotoAlbumInput} from '/sanity/PhotoAlbumInput.tsx';
import {VideoCoverInput} from '/sanity/VideoCoverInput.tsx';
import {GalleryCoverInput} from '/sanity/GalleryCoverInput.tsx';
const root = createRoot(document.getElementById('root'));
let serial = 0;
function QA({count, readOnly, kind, scheme}) {
  const [photos, setPhotos] = useState(Array.from({length: count}, (_, index) => ({
    _type: 'image', _key: 'photo-' + index,
    asset: {_type: 'reference', _ref: 'image-fixture-' + index}, alt: 'Fixture foto lokal ' + (index + 1)
  })));
  const [cover, setCover] = useState({_type: 'image', asset: {_type: 'reference', _ref: 'old-cover'}, alt: 'Old cover', crop: {}, hotspot: {}});
  const [gallery, setGallery] = useState(null);
  window.qaDocument = {photos, cover, kind, title: 'QA placeholder, not a portfolio project'};
  window.qaState = {photos, cover, gallery};
  const renderItem = props => <Card padding={2} border radius={2}><div style={{height: 100, background: '#ddd', color: '#111', display: 'grid', placeItems: 'center'}}>QA placeholder {props.index + 1}</div></Card>;
  const renderDefault = props => <div data-testid="native-grid-placeholder" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12}}>
    {photos.map((photo, index) => <div key={photo._key}>{renderItem({value: photo, index})}</div>)}
  </div>;
  const changeCover = patches => {
    window.coverPatches = patches;
    setCover(current => {
      const result = {...current};
      patches.forEach(patch => {
        if (patch.type === 'set' && patch.path.length === 1) result[patch.path[0]] = patch.value;
        if (patch.type === 'unset') delete result[patch.path[0]];
      });
      return result;
    });
  };
  return <ThemeProvider theme={studioTheme} scheme={scheme}>
    <Card padding={3}><h1>Isolated photo form QA</h1><p>Native upload/reorder/editor are checked separately in Sanity Studio.</p>
      <PhotoAlbumInput value={photos} readOnly={readOnly} renderItem={renderItem} renderDefault={renderDefault} onChange={patches => {
        window.albumPatches = patches;
        setPhotos(current => {
          const next = current.filter(photo => !patches.some(patch => patch.type === 'unset' && patch.path[0]._key === photo._key));
          patches.filter(patch => patch.type === 'insert').forEach(patch => next.push(...patch.items));
          return next;
        });
      }} />
      <VideoCoverInput value={cover} readOnly={readOnly} renderDefault={() => <p>Native cover editor placeholder</p>} onChange={changeCover} />
      <GalleryCoverInput readOnly={readOnly} renderDefault={() => <p>Native 4:5 editor placeholder</p>} onChange={patch => setGallery(patch.value)} />
    </Card>
  </ThemeProvider>;
}
window.resetQA = (count = 3, readOnly = false, kind = 'photo', scheme = 'light') => {
  window.albumPatches = null;
  window.coverPatches = null;
  window.uploads = [];
  window.failedFile = '';
  root.render(<QA key={++serial} count={count} readOnly={readOnly} kind={kind} scheme={scheme} />);
};
window.resetQA();
`);
const server = await createServer({
  configFile: false,
  cacheDir: `${folder}/vite-cache`,
  resolve: { alias: [{ find: /^sanity(?:\/structure)?$/, replacement: `${folder}/sanity.mjs` }] },
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 4345, strictPort: true },
});
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let browser;
try {
  const { default: config } = await server.ssrLoadModule('/sanity.config.ts');
  const project = config.schema.types.find(type => type.name === 'project');
  const album = project.fields.find(field => field.name === 'photos');
  assert.equal(album.options.layout, 'grid');
  assert.equal(album.group, 'album');
  assert.equal(project.groups.find(group => group.name === 'album').hidden({value: {kind: 'video'}}), true);
  assert.equal(project.groups.find(group => group.name === 'album').hidden({value: {kind: 'photo'}}), false);
  assert.equal(project.groups.find(group => group.name === 'video').hidden({value: {kind: 'photo'}}), true);
  const templates = config.schema.templates([]);
  assert.deepEqual(templates.find(template => template.id === 'photo-project').value, {kind: 'photo'});
  const nodeWithValues = values => new Proxy(values, {get: (target, key) => key === 'values' ? target : value => {target[key] = value; return nodeWithValues(target);}});
  const structure = config.plugins[0].structure(new Proxy({}, {get: (_, key) => value => nodeWithValues({builder: key, value})})).values;
  const videoMenu = structure.items.find(item => item.values.title === 'Video projects').values;
  const photoMenu = structure.items.find(item => item.values.title === 'Photo projects').values;
  assert.equal(videoMenu.id, 'project');
  assert.equal(videoMenu.child.values.filter, '_type == "project" && kind == "video"');
  assert.equal(videoMenu.child.values.initialValueTemplates[0].values.value, 'project');
  assert.equal(photoMenu.child.values.filter, '_type == "project" && kind == "photo"');
  const validate = async (field, value, kind) => {
    const context = {document: {kind}, path: [field.name], type: {jsonType: field.type}, i18n: {t: key => key}};
    return (await Promise.all(normalizeValidationRules({...field, jsonType: field.type}).map(rule => rule.validate(value, context)))).flat();
  };
  assert.ok((await validate(album, [], 'photo')).length);
  assert.ok((await validate(album, undefined, 'photo')).length);
  assert.deepEqual(await validate(album, undefined, 'video'), []);
  for (const count of [1, 20]) assert.deepEqual(await validate(album, Array.from({length: count}, () => ({_type: 'image'})), 'photo'), []);
  assert.ok((await validate(album, Array.from({length: 21}, () => ({_type: 'image'})), 'photo')).length);
  const source = project.fields.find(field => field.name === 'photoSourceUrl');
  for (const url of [undefined, 'https://drive.google.com/drive/folders/abc_123?usp=sharing', 'https://drive.google.com/drive/u/0/folders/abc-123']) assert.deepEqual(await validate(source, url, 'photo'), []);
  for (const url of ['https://example.com/drive/folders/abc', 'https://drive.google.com/file/d/abc/view', 'http://drive.google.com/drive/folders/abc']) assert.ok((await validate(source, url, 'photo')).length);
  assert.equal(project.fields.find(field => field.name === 'cover').options.hotspot.previews[0].aspectRatio, 16 / 9);
  assert.equal(project.fields.find(field => field.name === 'galleryCover').options.hotspot.previews[0].aspectRatio, .8);
  console.log('PASS: Schema, photo template, conditional tabs, 1-20 photos, Drive folder URL and existing cover ratios.');
  await server.listen();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({viewport: {width: 390, height: 884}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4345/work/photo-form-check/index.html');
  await page.getByText('3/20 foto', {exact: true}).waitFor();
  await page.getByRole('button', {name: 'Pilih beberapa foto', exact: true}).click();
  await page.getByRole('checkbox', {name: 'Pilih foto 2', exact: true}).check();
  await page.getByRole('button', {name: 'Keluarkan 1 foto dari album', exact: true}).click();
  await page.getByRole('button', {name: 'Batal', exact: true}).click();
  assert.equal(await page.evaluate(() => window.qaState.photos.length), 3);
  await page.getByRole('button', {name: 'Keluarkan 1 foto dari album', exact: true}).click();
  await page.getByRole('button', {name: 'Ya, keluarkan foto', exact: true}).click();
  await page.getByText('2/20 foto', {exact: true}).waitFor();
  assert.deepEqual(await page.evaluate(() => window.qaState.photos.map(photo => photo._key)), ['photo-0', 'photo-2']);
  assert.equal(await page.evaluate(() => window.qaState.cover.asset._ref), 'old-cover');
  await page.getByLabel('Foto untuk cover', {exact: true}).selectOption('photo-2');
  await page.getByRole('button', {name: 'Gunakan foto ini sebagai cover', exact: true}).click();
  const cover = await page.evaluate(() => window.qaState.cover);
  assert.equal(cover.asset._ref, 'image-fixture-2');
  assert.equal(cover.alt, 'Fixture foto lokal 3');
  assert.equal('crop' in cover, false);
  assert.equal('hotspot' in cover, false);
  await page.getByRole('button', {name: 'Use WORK cover image', exact: true}).click();
  assert.equal(await page.evaluate(() => window.qaState.gallery.asset._ref), cover.asset._ref);
  await page.getByRole('button', {name: 'Pilih beberapa foto', exact: true}).click();
  await page.getByRole('button', {name: 'Pilih semua', exact: true}).click();
  await page.getByRole('button', {name: 'Batalkan pilihan', exact: true}).click();
  assert.equal(await page.getByRole('checkbox', {checked: true}).count(), 0);
  await page.getByRole('button', {name: 'Pilih semua', exact: true}).click();
  await page.getByRole('button', {name: 'Keluarkan 2 foto dari album', exact: true}).click();
  await page.getByRole('button', {name: 'Ya, keluarkan foto', exact: true}).click();
  await page.getByText('0/20 foto', {exact: true}).waitFor();
  assert.equal(await page.getByRole('button', {name: 'Gunakan foto ini sebagai cover', exact: true}).isDisabled(), true);
  assert.equal(await page.evaluate(() => window.qaState.cover.asset._ref), cover.asset._ref);
  console.log('PASS: Select individual/all, cancel removal, keyed batch removal, preserve cover, choose album cover and reuse 4:5 cover.');
  for (const scheme of ['light', 'dark']) {
    await page.evaluate(scheme => window.resetQA(20, false, 'photo', scheme), scheme);
    await page.getByText('20/20 foto', {exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Upload foto sekaligus', exact: true}).isDisabled(), true);
    await page.getByRole('button', {name: 'Pilih beberapa foto', exact: true}).click();
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({width, height: 884});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${scheme}/${width}: no horizontal overflow`);
      const heights = await page.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
      assert.ok(heights.every(height => height >= 44), `${scheme}/${width}: custom controls have 44px touch targets`);
    }
    await page.setViewportSize({width: 390, height: 884});
    const contrasts = await page.locator('[data-ui="Text"]').evaluateAll(elements => {
      const channels = color => {
        const values = color.match(/[\d.]+/g)?.map(Number) || [];
        return color.startsWith('color(') ? values.slice(0, 3) : values.slice(0, 3).map(value => value / 255);
      };
      const luminance = color => channels(color).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      return elements.filter(element => element.textContent.trim() && !element.closest('button[disabled]')).map(element => {
        let parent = element;
        let background = 'rgba(0, 0, 0, 0)';
        while (parent && (background === 'rgba(0, 0, 0, 0)' || background === 'transparent')) {
          background = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        const foreground = getComputedStyle(element).color;
        const light = Math.max(luminance(foreground), luminance(background));
        const dark = Math.min(luminance(foreground), luminance(background));
        return {text: element.textContent, ratio: (light + .05) / (dark + .05), foreground, background};
      });
    });
    assert.ok(contrasts.length && contrasts.every(result => result.ratio >= 4.5), JSON.stringify({scheme, contrasts}));
    console.log(`PASS: ${scheme} custom text contrast minimum ${Math.min(...contrasts.map(result => result.ratio)).toFixed(2)}:1.`);
    await page.screenshot({path: `${folder}/album-${scheme}-390.png`, fullPage: true});
  }
  await page.evaluate(() => window.resetQA(21));
  await page.getByText('Album melebihi 20 foto.', {exact: false}).waitFor();
  await page.evaluate(() => window.resetQA(3, true));
  await page.getByText('3/20 foto', {exact: true}).waitFor();
  assert.equal(await page.getByRole('checkbox').count(), 0);
  assert.equal(await page.getByRole('button').count(), 0);
  await page.evaluate(() => window.resetQA(3));
  await page.getByText('3/20 foto', {exact: true}).waitFor();
  const upload = page.getByLabel('Upload foto sekaligus', {exact: true});
  const pickerPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', {name: 'Upload foto sekaligus', exact: true}).click();
  const picker = await pickerPromise;
  assert.equal(picker.isMultiple(), true);
  await picker.setFiles([{name: '02.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('QA image placeholder')}, {name: '01.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('QA image placeholder')}]);
  await page.getByText('5/20 foto', {exact: true}).waitFor();
  assert.deepEqual(await page.evaluate(() => window.uploads), ['01.jpg', '02.jpg']);
  assert.equal(await page.evaluate(() => window.qaState.photos[0]._key), 'photo-0', 'Batch upload appends to the existing album');
  await page.getByText('2 foto ditambahkan', {exact: false}).waitFor();
  await upload.setInputFiles({name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('Not an image')});
  await page.getByRole('alert').getByText('Ada file yang tidak didukung.', {exact: false}).waitFor();
  await page.evaluate(() => {window.failedFile = 'failed.jpg';});
  await upload.setInputFiles([{name: 'failed.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('QA image placeholder')}, {name: 'success.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('QA image placeholder')}]);
  await page.getByRole('alert').getByText('Foto yang belum masuk album: failed.jpg.', {exact: false}).waitFor();
  assert.equal(await page.evaluate(() => window.qaState.photos.length), 6);
  await page.evaluate(() => window.resetQA(19));
  await page.getByText('19/20 foto', {exact: true}).waitFor();
  await upload.setInputFiles([{name: '01.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('QA image placeholder')}, {name: '02.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('QA image placeholder')}]);
  await page.getByRole('alert').getByText('Tersisa 1 slot.', {exact: false}).waitFor();
  assert.deepEqual(await page.evaluate(() => window.uploads), []);
  await page.evaluate(() => window.resetQA(3));
  await page.getByText('3/20 foto', {exact: true}).waitFor();
  await page.getByRole('button', {name: 'Pilih beberapa foto', exact: true}).click();
  await page.getByRole('button', {name: 'Pilih semua', exact: true}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('checkbox', {checked: true}).count(), 3);
  await page.getByRole('button', {name: 'Keluarkan 3 foto dari album', exact: true}).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', {name: 'Batal', exact: true}).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', {name: 'Selesai memilih', exact: true}).click();
  await page.evaluate(() => window.resetQA(3, false, 'video'));
  await page.getByLabel('Video file', {exact: true}).waitFor();
  assert.equal(await page.getByLabel('Foto untuk cover', {exact: true}).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: Batch asset upload in filename order, preserve existing photos, retain partial successes on failure, reject unsupported files and reject an oversized batch before upload.');
  console.log('PASS: Empty/over-limit/read-only states, keyboard activation, light/dark, four widths and video cover input retained; no browser errors.');
} finally {
  await browser?.close();
  await server.close();
}
