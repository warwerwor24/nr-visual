import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir('work/dialog-check', { recursive: true });
const ratios = [16 / 9, 9 / 16, 1, .8, 16 / 9, 9 / 16, 16 / 9];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://drive.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<body style="background:#141414;color:white">Video player fixture</body>' }));
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 884});
    await page.goto(base, {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => scrollTo({top: 450, behavior: 'instant'}));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.site-header')).backdropFilter.includes('22px'));
    await page.screenshot({path: `work/dialog-check/navbar-${width}.png`});
    console.log(`PASS: Production-built navbar blur at ${width}px`);
  }
  await page.route(`${base}/projects/`, async route => {
    const response = await route.fetch();
    let html = await response.text();
    const marker = '<div hidden id="project-templates">';
    const start = html.indexOf(marker);
    const end = html.indexOf('</template></div>', start) + '</template></div>'.length;
    assert(start > 0 && end > start);
    const templates = ratios.map((ratio, index) => `<template data-project-template="check-${index}" data-title="Project ${index + 1}" data-description="Project description" data-ratio="${ratio}" data-embed="https://drive.google.com/file/d/fixturevideo${index}/preview"></template>`).join('');
    html = html.slice(0, start) + marker + templates + '</div>' + html.slice(end);
    const galleryStart = html.indexOf('<ul class="dialog-gallery"');
    const galleryEnd = html.indexOf('</ul>', galleryStart) + 5;
    const covers = ratios.map((_, index) => `<li><button class="dialog-thumbnail" data-dialog-project="check-${index}" aria-label="Open project ${index + 1}" aria-pressed="false"><img src="/hero-portrait-cover.png" alt="" width="160" height="100"><span class="visually-hidden">Project ${index + 1}</span></button></li>`).join('');
    html = html.slice(0, galleryStart) + `<ul class="dialog-gallery" aria-label="Browse projects">${covers}</ul>` + html.slice(galleryEnd);
    html = html.replace(/data-project="[^"]+"/, 'data-project="check-0"');
    await route.fulfill({ response, body: html });
  });
  for (const [width, height] of [[1440, 1000], [1260, 884], [390, 884], [320, 700], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${base}/projects/`, { waitUntil: 'domcontentloaded' });
    const card = page.locator('.work-card').first();
    await card.click();
    assert.equal(await page.locator('dialog').evaluate(element => element.scrollWidth > element.clientWidth), false, 'Accessible thumbnail labels must not expand dialog width');
    assert(await page.locator('dialog').evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.x === 0 && box.right >= innerWidth - 8 && box.top === 0 && box.height === innerHeight;
    }), `Popup scroll container must reach screen edge at ${width}`);
    assert.equal(await page.locator('dialog').evaluate(element => getComputedStyle(element, '::-webkit-scrollbar').width), '6px');
    for (let index = 0; index < ratios.length; index++) {
      if (index) await page.locator('.dialog-next').click();
      assert.equal(await page.locator('#dialog-title').innerText(), `Project ${index + 1}`);
      assert.equal(await page.locator('#dialog-media iframe').count(), 1);
      const frame = await page.locator('.video-frame').boundingBox();
      const heightLimit = await page.locator('#dialog-media').evaluate(element => parseFloat(getComputedStyle(element).maxHeight));
      assert(Math.abs(frame.height - Math.min(frame.width / ratios[index], heightLimit)) < 1, `Wrong fitted player height ${index} at ${width}`);
      assert(frame.width >= Math.min(252, width - 58, heightLimit * ratios[index]) - 1, `Player too narrow ${index} at ${width}`);
      assert(await page.locator('.video-frame').evaluate(element => {
        const frame = element.getBoundingClientRect();
        const container = element.parentElement.getBoundingClientRect();
        return Math.abs(frame.width - container.width) < 1 && Math.abs(frame.height - container.height) < 1;
      }), `Iframe does not fill its container ${index} at ${width}`);
      const panel = await page.locator('.dialog-shell').boundingBox();
      assert(panel.x >= 0 && panel.x + panel.width <= width, `Panel outside ${width}`);
      assert(frame.height > 0 && frame.y >= 0 && frame.y + frame.height <= height, `Video outside ${width}`);
      if (width <= 600) {
        for (const arrow of await page.locator('.dialog-arrow').all()) {
          const box = await arrow.boundingBox();
          assert(box.y >= frame.y + frame.height, `Navigation covers player ${index} at ${width}`);
          assert(box.width >= 44 && box.height >= 44, 'Navigation target too small');
        }
      }
      assert.equal(await page.locator('.dialog-thumbnail[aria-pressed=true]').count(), 1);
      assert(await page.locator('.dialog-thumbnail[aria-pressed=true]').evaluate(button => {
        const item = button.getBoundingClientRect();
        const gallery = button.closest('.dialog-gallery').getBoundingClientRect();
        return item.left >= gallery.left - 1 && item.right <= gallery.right + 1 && item.top >= gallery.top - 1 && item.bottom <= gallery.bottom + 1;
      }), `Active cover clipped at ${width}`);
      if (index === 1 && width <= 900) assert(await page.locator('.dialog-gallery').evaluate(gallery => gallery.scrollWidth <= gallery.clientWidth || gallery.scrollLeft > 0), `Scrollable gallery did not advance at ${width}`);
      if (index === 0) {
        const visible = await page.locator('.dialog-gallery').evaluate(gallery => [...gallery.children].filter(child => {
          const item = child.getBoundingClientRect();
          const area = gallery.getBoundingClientRect();
          return item.left >= area.left - 1 && item.right <= area.right + 1 && item.top >= area.top - 1 && item.bottom <= area.bottom + 1;
        }).length);
        assert(visible >= 2 && visible <= ratios.length, `Responsive navigation must show the active cover and an adjacent cover at ${width}`);
      }
      if (index === 1 && width !== 844) await page.screenshot({ path: `work/dialog-check/portrait-${width}.png` });
    }
    await page.locator('.dialog-next').click();
    assert.equal(await page.locator('#dialog-title').innerText(), 'Project 1');
    await page.locator('.dialog-next').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#dialog-title').innerText(), 'Project 7');
    await page.locator('.dialog-thumbnail').nth(2).click();
    assert.equal(await page.locator('#dialog-title').innerText(), 'Project 3');
    const pageScroll = await page.evaluate(() => scrollY);
    await page.locator('.dialog-content').evaluate(element => element.style.minHeight = '180vh');
    await page.locator('dialog').evaluate(element => element.scrollTop = 100);
    assert(await page.locator('dialog').evaluate(element => element.scrollTop === 100));
    assert.equal(await page.evaluate(() => scrollY), pageScroll);
    await page.locator('.dialog-content').evaluate(element => element.style.minHeight = '');
    await page.keyboard.press('Escape');
    await page.locator('#dialog-media iframe').waitFor({state: 'detached'});
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.locator('#dialog-media iframe').count(), 0);
    assert(await card.evaluate(button => button === document.activeElement));
    console.log(`PASS: fitted player, responsive cover navigation, screen-edge scrolling, keyboard and cleanup at ${width}×${height}`);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1260, height: 884 });
  await page.goto(`${base}/projects/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.work-card').first().click();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#dialog-media').evaluate(element => getComputedStyle(element).transform), 'none', 'Player keeps a transform after opening');
  await page.locator('.dialog-next').click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#dialog-media').evaluate(element => getComputedStyle(element).transform), 'none', 'Player keeps a transform after switching');
  assert(await page.locator('.dialog-thumbnail[aria-pressed=true]').evaluate(button => {
    const item = button.getBoundingClientRect();
    const gallery = button.closest('.dialog-gallery').getBoundingClientRect();
    return item.left >= gallery.left - 1 && item.right <= gallery.right + 1;
  }), 'Active cover clipped after animated resize');
  await page.locator('.dialog-close').click();
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  await page.locator('.work-card').first().click();
  await page.waitForTimeout(50);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  assert.equal(await page.locator('.video-frame').count(), 0, 'Fast close keeps a player alive');
  await page.locator('.work-card').first().click();
  await page.waitForTimeout(800);
  await page.locator('dialog').click({position: {x: 10, y: 10}});
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  assert.deepEqual(errors, []);
  console.log('PASS: opening, resizing and closing animations; no JavaScript errors');
} finally { await browser.close(); }
