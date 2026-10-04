import test from 'node:test';
import assert from 'node:assert/strict';
import { driveMedia, publishedProjects, socialUrl, whatsappUrl, videoAspectRatio } from '../src/lib/media.mjs';
import { loadContent } from '../src/lib/content.mjs';
import { coverPresentation } from '../src/lib/cover.mjs';

test('Drive links are normalized and preserve restricted-link resource keys', () => {
  const id = 'abcdefghijklmnop_123-456';
  const media = driveMedia(`https://drive.google.com/file/d/${id}/view?usp=sharing&resourcekey=0-abc`);
  assert.equal(media.embed, `https://drive.google.com/file/d/${id}/preview?resourcekey=0-abc`);
  assert.equal(driveMedia(`https://drive.google.com/open?id=${id}`).open, `https://drive.google.com/file/d/${id}/view`);
  for (const bad of ['javascript:alert(1)', `https://drive.google.com.evil.com/file/d/${id}/view`, `http://drive.google.com/file/d/${id}/view`, `https://user@drive.google.com/file/d/${id}/view`, `https://drive.google.com/file/d/${id}/view?resourcekey=<bad>`, 'https://drive.google.com/drive/folders/test', 'https://drive.google.com/file/d/tiny/view', null]) assert.equal(driveMedia(bad), null);
});

test('only published, unique video projects can be selected as highlights', () => {
  const video = { _id: 'one', kind: 'video' };
  assert.deepEqual(publishedProjects([null, video, video, { _id: 'drafts.two', kind: 'video' }, { _id: 'versions.release.three', kind: 'video' }, { _id: 'photo', kind: 'photo' }], true), [video]);
});

test('video formats preserve exact ratios and existing projects default to landscape', () => {
  for (const [format, ratio] of [['16:9', 16 / 9], ['9:16', 9 / 16], ['1:1', 1], ['4:5', .8]]) assert.equal(videoAspectRatio(format), ratio);
  for (const format of [undefined, 'invalid', 'constructor', '__proto__']) assert.equal(videoAspectRatio(format), 16 / 9);
});

test('cover crops use native Sanity hotspot framing at the actual WORK and gallery ratios', () => {
  const cover = 'https://cdn.sanity.io/images/n4rtv48x/production/3dcecfe6473ea785be50e922ee8dfbd923a5de79-900x1600.jpg';
  const project = { cover, coverImage: { asset: { _ref: 'image-3dcecfe6473ea785be50e922ee8dfbd923a5de79-900x1600-jpg' }, crop: { left: 0, right: 0, top: .1, bottom: .1 }, hotspot: { x: .5, y: .2, width: .2, height: .2 } } };
  const result = coverPresentation(project);
  assert.equal(new URL(result.src).searchParams.get('rect'), '0,160,900,506');
  assert.equal(new URL(result.src).searchParams.get('h'), '675');
  assert.equal(result.position, '50% 50%');
  project.coverImage.hotspot.y = .8;
  assert.equal(new URL(coverPresentation(project).src).searchParams.get('rect'), '0,934,900,506');
  delete project.coverImage.hotspot;
  assert.equal(coverPresentation(project).position, '50% 50%');
  assert.deepEqual(coverPresentation({ cover: '/cover.png' }), { src: '/cover.png', position: '50% 50%' });
  project.coverImage.hotspot = {x: .5, y: .2, width: .2, height: .2};
  project.galleryCover = { ...project.coverImage, url: cover, crop: {left: 0, right: 0, top: 0, bottom: .25}, hotspot: {x: .5, y: .6, width: .2, height: .2} };
  assert.equal(new URL(coverPresentation(project, 900, 'gallery').src).searchParams.get('rect'), '0,75,900,1125');
  assert.equal(new URL(coverPresentation(project).src).searchParams.get('rect'), '0,160,900,506');
  delete project.galleryCover;
  assert.equal(new URL(coverPresentation(project, 900, 'gallery').src).searchParams.get('rect'), '0,160,900,1125');
});

test('contact URLs cannot lead to arbitrary hosts or scripts', () => {
  assert.match(whatsappUrl('+62 812-3456-7890'), /^https:\/\/wa.me\/6281234567890\?/);
  assert.equal(whatsappUrl('081234567890'), null);
  assert.equal(socialUrl('https://www.instagram.com/nrvisual/', 'instagram.com'), 'https://www.instagram.com/nrvisual/');
  assert.equal(socialUrl('https://instagram.com.evil.test/user', 'instagram.com'), null);
  assert.equal(socialUrl('javascript:alert(1)', 'linkedin.com'), null);
});

test('demo has exactly 9 highlights and 15 distinct collage samples, release fails closed', async () => {
  const result = await loadContent({});
  assert.equal(result.highlights.length, 9);
  assert.equal(new Set(result.collage.map(p => p._id)).size, 15);
  await assert.rejects(() => loadContent({ REQUIRE_PRODUCTION: '1' }), /Release blocked/);
});

test('CMS errors fail the build instead of replacing a live site with demo data', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }));
  await assert.rejects(() => loadContent({ SANITY_STUDIO_PROJECT_ID: 'example' }), /Sanity could not be read/);
});

test('release allows an empty real portfolio but still requires branding and a canonical URL', async t => {
  const settings = { brandName: 'NR Visual', heroText: 'Make every idea matter', aboutText: 'Eight years of experience.', logo: 'logo', shareImage: 'share', whatsapp: '6281234567890', instagram: 'https://instagram.com/nrvisual', linkedin: 'https://linkedin.com/in/nrvisual' };
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ result: settings }) }));
  const env = { SANITY_STUDIO_PROJECT_ID: 'example', REQUIRE_PRODUCTION: '1', SITE_URL: 'https://example.com' };
  const content = await loadContent(env);
  assert.equal(content.demo, false);
  assert.deepEqual(content.projects, []);
  assert.deepEqual(content.highlights, []);
  assert.deepEqual(content.collage, []);
  await assert.rejects(() => loadContent({ ...env, SITE_URL: '' }), /canonical HTTPS/);
  settings.logo = '';
  await assert.rejects(() => loadContent(env), /complete Website settings > logo/);
});

test('CMS requests explicitly use published perspective and handle unpublish and reorder', async t => {
  let requested;
  t.mock.method(globalThis, 'fetch', async url => {
    requested = url;
    return { ok: true, json: async () => ({ result: { brandName: 'NR', highlights: [null, { _id: 'b', title: 'B', kind: 'video', cover: 'cover', alt: 'B', driveUrl: 'https://drive.google.com/file/d/abcdefghijk/view' }, { _id: 'a', title: 'A', kind: 'video', cover: 'cover', alt: 'A', driveUrl: 'https://drive.google.com/file/d/abcdefghijkl/view' }], collage: [] } }) };
  });
  const content = await loadContent({ SANITY_STUDIO_PROJECT_ID: 'example' });
  assert.equal(requested.searchParams.get('perspective'), 'published');
  assert.deepEqual(content.highlights.map(p => p._id), ['b', 'a']);
  assert.equal(content.demo, false);
});

test('all projects includes unfeatured work, excludes drafts and validates its media', async t => {
  const video = { _id: 'featured', title: 'Featured', kind: 'video', cover: 'cover', alt: 'Featured', driveUrl: 'https://drive.google.com/file/d/abcdefghijk/view' };
  const photo = { _id: 'unfeatured', title: 'Unfeatured', kind: 'photo', cover: 'cover', alt: 'Cover', photos: [{ url: 'photo', alt: 'Product photograph' }] };
  let requested;
  t.mock.method(globalThis, 'fetch', async url => {
    requested = url;
    return { ok: true, json: async () => ({ result: { highlights: [video], collage: [], projects: [photo, video, photo, { ...video, _id: 'drafts.hidden' }, null] } }) };
  });
  const content = await loadContent({ SANITY_STUDIO_PROJECT_ID: 'example' });
  assert.deepEqual(content.projects.map(item => item._id), ['unfeatured', 'featured']);
  assert.deepEqual(content.highlights.map(item => item._id), ['featured']);
  assert.match(requested.searchParams.get('query'), /"projects":\*\[_type == "project"\]/);
  photo.driveUrl = '';
  photo.kind = 'video';
  await assert.rejects(() => loadContent({ SANITY_STUDIO_PROJECT_ID: 'example' }), /Invalid Drive URL: Unfeatured/);
});
