import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4333';
assert.equal(new URL(base).hostname, '127.0.0.1');
await mkdir('work/project-filter-check', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/projects/`);
    const cards = page.locator('.projects-grid .work-card');
    const total = await cards.count();
    assert(total > 0);
    const kinds = await cards.evaluateAll(items => items.map(item => item.dataset.kind));
    for (const kind of ['photo', 'video', 'all']) {
      const button = page.locator(`[data-filter="${kind}"]`);
      await button.click();
      const expected = kind === 'all' ? total : kinds.filter(value => value === kind).length;
      assert.equal(await page.locator('.projects-grid .work-card:visible').count(), expected);
      assert.equal(await page.locator('.project-filters [aria-pressed="true"]').count(), 1);
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#projects-empty').isVisible(), expected === 0);
      assert((await page.locator('#project-count').innerText()).startsWith(`${expected} `));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const dimensions = await button.boundingBox();
      assert(dimensions.height >= 44 && dimensions.width >= 44);
      if (width === 1440 || width === 390) {
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.querySelectorAll('.projects-grid .work-card:not([hidden]) img')].slice(0, 6).map(image => image.decode().catch(() => {})));
        });
        await page.screenshot({ path: `work/project-filter-check/${kind}-${width}.png` });
      }
    }
    console.log(`PASS ${width}px: All/Photo/Video, counts, empty states, pressed state, 44px controls, no overflow`);
  }
  await page.locator('[data-filter="photo"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-filter="photo"]').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.filter), 'video');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('[data-filter="video"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-filter="video"]').evaluate(button => getComputedStyle(button).outlineStyle), 'solid');
  await page.locator('.projects-grid .work-card:visible').first().click();
  assert(await page.locator('#project-dialog').evaluate(dialog => dialog.open));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#project-dialog').evaluate(dialog => dialog.open), false);
  assert.equal(await page.evaluate(() => document.activeElement.matches('.projects-grid .work-card:not([hidden])')), true);

  // A browser-only fixture proves photo filtering even when only videos are published.
  await page.locator('.projects-grid .work-card').first().evaluate(card => { card.dataset.kind = 'photo'; });
  await page.locator('[data-filter="photo"]').click();
  assert.equal(await page.locator('.projects-grid .work-card:visible').count(), 1);
  assert.equal(await page.locator('#project-count').innerText(), '1 photo project');
  await page.locator('[data-filter="video"]').click();
  assert.equal(await page.locator('.projects-grid .work-card[data-kind="photo"]:visible').count(), 0);
  await page.route(`${base}/projects/`, async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<button class="work-card"[\s\S]*?<\/button>/g, '');
    await route.fulfill({ response, body: html });
  });
  await page.goto(`${base}/projects/`);
  await page.locator('[data-filter="all"]').click();
  assert(await page.getByText('New projects are on the way.', { exact: true }).isVisible());
  await page.unroute(`${base}/projects/`);

  const noScript = await browser.newPage({ javaScriptEnabled: false });
  await noScript.goto(`${base}/projects/`);
  assert.equal(await noScript.locator('.project-filters').isVisible(), false);
  assert(await noScript.locator('.projects-grid .work-card:visible').count() > 0);
  await noScript.close();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${base}/projects/`);
  await page.locator('[data-filter="photo"]').click();
  await page.locator('[data-filter="video"]').click();
  await page.waitForFunction(() => {
    const card = document.querySelector('.projects-grid .work-card:not([hidden])');
    return card && getComputedStyle(card).opacity === '1';
  });
  assert.deepEqual(errors, []);
  console.log('PASS: keyboard/focus, dialog/return focus, photo fixture, empty collection, no-JS fallback, normal motion, zero JS errors');
} finally { await browser.close(); }
