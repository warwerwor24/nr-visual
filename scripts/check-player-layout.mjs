import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('https://drive.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<body style="margin:0;background:#131313;color:white">Video fixture</body>' }));
await mkdir('work/player-layout', { recursive: true });
try {
  for (const [width, height] of [[1920, 1000], [1260, 884], [1000, 768], [768, 1000], [390, 884], [320, 700], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4321/', { waitUntil: 'domcontentloaded' });
    await page.locator('.work-card').first().waitFor();
    if (width <= 600) assert.equal(await page.locator('.all-projects-link').isVisible(), false);
    if (width > 600) assert(await page.locator('.all-projects-link').evaluate(el => el.getBoundingClientRect().top - document.querySelector('#work').getBoundingClientRect().top >= 23));
    for (const ratio of [16 / 9, 9 / 16, 1, 4 / 5]) {
      await page.evaluate(ratio => {
        const id = document.querySelector('.work-card').dataset.project;
        const template = [...document.querySelectorAll('template[data-project-template]')].find(template => template.dataset.projectTemplate === id);
        template.dataset.ratio = String(ratio);
        template.dataset.embed = 'https://drive.google.com/file/d/playerfixture/preview';
      }, ratio);
      await page.locator('.work-card').first().click();
      await page.waitForTimeout(100);
      const layout = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        const text = document.createRange(); text.selectNodeContents(document.querySelector('#dialog-title'));
        return { shell: rect('.dialog-shell'), media: rect('#dialog-media'), frame: rect('.video-frame'), gallery: rect('.dialog-gallery'), prev: rect('.dialog-prev'), next: rect('.dialog-next'), close: rect('.dialog-close'), info: rect('.dialog-info'), content: rect('.dialog-content'), titleLines: text.getClientRects().length, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(layout.titleLines, 1, `Single title at ${width}`);
      assert.equal(await page.locator('#dialog-title').evaluate(el => getComputedStyle(el).textAlign), 'center');
      assert(!layout.overflow);
      assert(layout.content.left >= 0 && layout.content.right <= width);
      assert(layout.content.top >= 56 && layout.content.bottom <= height + 2, `Content within viewport ${width}×${height}: ${layout.content.top}..${layout.content.bottom}`);
      assert(Math.abs(layout.media.width - layout.frame.width) < 1 && Math.abs(layout.media.height - layout.frame.height) < 1);
      assert(Math.abs(layout.media.width / layout.media.height - ratio) < .02, `Ratio at ${width}: expected ${ratio}, box ${layout.media.width}×${layout.media.height}`);
      assert(layout.close.right <= width && layout.close.top >= 0 && layout.close.top < 40);
      if (width > 900) {
        assert(layout.gallery.right < layout.shell.left);
        assert(layout.info.left > layout.shell.right);
        assert(layout.next.top > layout.prev.bottom);
        assert(layout.prev.left > layout.shell.right);
      } else {
        assert(Math.abs((layout.gallery.top + layout.gallery.bottom) / 2 - (layout.prev.top + layout.prev.bottom) / 2) < 2);
        assert(layout.gallery.left >= layout.prev.right && layout.gallery.right <= layout.next.left);
      }
      await page.locator('.dialog-focus').click();
      assert.equal(await page.locator('.dialog-focus').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.dialog-gallery').isVisible(), false);
      assert.equal(await page.locator('.dialog-info').isVisible(), false);
      const focused = await page.locator('#dialog-media').boundingBox();
      assert(focused.width + 1 >= layout.media.width && focused.height + 1 >= layout.media.height);
      await page.screenshot({ path: `work/player-layout/focus-${width}-${ratio.toFixed(2)}.png` });
      await page.locator('.dialog-focus').click();
      await page.screenshot({ path: `work/player-layout/default-${width}-${ratio.toFixed(2)}.png` });
      await page.keyboard.press('ArrowDown');
      assert.equal(await page.locator('.dialog-thumbnail[aria-pressed="true"]').count(), 1);
      await page.keyboard.press('Escape');
      await page.locator('#project-dialog').waitFor({ state: 'hidden' });
      assert(await page.locator('.work-card').first().evaluate(el => el === document.activeElement));
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.work-card').first().click();
  await page.waitForTimeout(850);
  assert.equal(await page.locator('#dialog-media').evaluate(el => getComputedStyle(el).transform), 'none');
  await page.locator('.dialog-focus').click();
  assert(await page.locator('.dialog-arrow').first().evaluate(el => el.getAnimations().some(animation => animation.playState === 'running')));
  await page.waitForFunction(() => !document.querySelector('dialog').classList.contains('is-focus-changing'));
  assert.equal(await page.locator('.dialog-shell').evaluate(el => getComputedStyle(el).transform), 'none');
  assert.equal(await page.locator('.dialog-focus').getAttribute('aria-pressed'), 'true');
  await page.locator('.dialog-focus').click();
  assert(await page.locator('.dialog-shell').evaluate(el => el.getAnimations().some(animation => animation.playState === 'running')));
  await page.waitForFunction(() => !document.querySelector('dialog').classList.contains('is-focus-changing'));
  assert.equal(await page.locator('.dialog-gallery').evaluate(el => getComputedStyle(el).opacity), '1');
  await page.locator('.dialog-focus').click();
  await page.keyboard.press('Escape');
  await page.locator('#project-dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('PASS: 7 viewports × 4 ratios, desktop sidebar layout, mobile single navigation row, one-line title, focus size, switching, Escape, focus restore and animation cleanup.');
} finally { await browser.close(); }
