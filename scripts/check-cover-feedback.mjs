import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.emulateMedia({ reducedMotion: 'reduce' });
try {
  for (const route of ['/', '/projects/']) {
    await page.goto(new URL(route, process.env.PREVIEW_URL || 'http://127.0.0.1:4321/').href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1920, 1260, 875, 824, 601, 600, 390, 320, 1440]) {
      await page.setViewportSize({ width, height: 884 });
      await page.waitForTimeout(100);
      const results = await page.locator('.cover-caption').evaluateAll(captions => captions.map(caption => {
        const text = document.createRange();
        text.selectNodeContents(caption);
        return {
        title: caption.textContent,
        width: caption.clientWidth,
        scrollWidth: caption.scrollWidth,
        lines: text.getClientRects().length,
        fontSize: parseFloat(getComputedStyle(caption).fontSize),
        filter: getComputedStyle(caption.parentElement.querySelector('img')).filter,
      }; }));
      assert.ok(results.length, `${route} has project titles`);
      for (const result of results) {
        assert.ok(result.scrollWidth <= result.width + 1, `${width}: ${result.title} fits its width`);
        assert.ok(result.lines <= (width > 600 ? 1 : 2) + .08, `${width}: ${result.title} stays within allowed lines`);
        assert.equal(result.filter, 'none');
        assert.ok(result.fontSize >= (width > 1000 ? 15 : 10), `${width}: ${result.title} remains readable`);
      }
      if (route === '/') {
        const workSizes = await page.locator('#work .cover-frame').evaluateAll(covers => covers.map(cover => ({ width: cover.getBoundingClientRect().width, height: cover.getBoundingClientRect().height })));
        for (const size of workSizes) {
          assert.ok(Math.abs(size.width - workSizes[0].width) < 1, `${width}: all work covers have equal widths`);
          assert.ok(Math.abs(size.height - workSizes[0].height) < 1, `${width}: all work covers have equal heights`);
        }
        assert.ok((await page.locator('.collage-card img').evaluateAll(images => images.map(image => getComputedStyle(image).filter))).every(filter => filter === 'none'));
        const cards = await page.locator('.collage-card').evaluateAll(cards => cards.map(card => {
          const caption = card.querySelector('[data-collage-title]');
          const image = card.querySelector('img');
          const text = document.createRange();
          text.selectNodeContents(caption);
          return { width: card.offsetWidth, height: card.offsetHeight, imageBottom: image.offsetTop + image.offsetHeight, captionTop: caption.offsetTop, lines: text.getClientRects().length, fits: caption.scrollWidth <= caption.clientWidth, truncated: caption.textContent !== caption.dataset.collageTitle, suffix: caption.textContent.endsWith('..'), title: caption.title, fullTitle: caption.dataset.collageTitle };
        }));
        for (const card of cards) {
          assert.equal(card.width, cards[0].width, `${width}: all collage cards match Dioic width`);
          assert.equal(card.height, cards[0].height, `${width}: all collage cards match Dioic height`);
          assert.ok(card.captionTop >= card.imageBottom, `${width}: caption is below the cover`);
          assert.equal(card.lines, 1);
          assert.ok(card.fits);
          assert.ok(!card.truncated || card.suffix);
          assert.equal(card.title, card.fullTitle);
        }
        if ([1260, 390].includes(width)) {
          await page.locator('#collection img').evaluateAll(images => Promise.race([
            Promise.all(images.map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); })),
            new Promise(resolve => setTimeout(resolve, 5000)),
          ]));
          await page.locator('#collection').screenshot({ path: `work/feedback-review/collage-captions-${width}.png` });
        }
        if (width > 600) {
          const bounds = await page.evaluate(() => ({ card: document.querySelector('.position-2').getBoundingClientRect().toJSON(), title: document.querySelector('#collection-title').getBoundingClientRect().toJSON() }));
          assert.ok(bounds.card.bottom <= bounds.title.top + 40, `${width}: center card only slightly overlaps headline: ${JSON.stringify(bounds)}`);
        }
      }
    }
  }
  console.log('Cover colors, equal work sizes, titles, equal collage sizes, one-line captions, truncation and spacing passed on both pages at nine widths.');
} finally {
  await browser.close();
}
