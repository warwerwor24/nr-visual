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
    // The archive opens on every project with no type chosen; there is no All button.
    assert.equal(await page.locator('[data-filter="all"]').count(), 0);
    assert.equal(await page.locator('.projects-grid .work-card:visible').count(), total);
    assert.equal(await page.locator('.filter-pill [aria-pressed="true"]').count(), 0);
    // Title, nav pill and filter pill sit on one line on desktop and never overlap.
    const [title, nav, pill] = await page.evaluate(() => ['.projects-bar h1', '.site-header nav', '.filter-pill'].map(selector => { const box = document.querySelector(selector).getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }; }));
    const middle = box => (box.top + box.bottom) / 2;
    if (width >= 1280) assert(Math.abs(middle(title) - middle(nav)) < 3 && Math.abs(middle(pill) - middle(nav)) < 3);
    assert(pill.left >= nav.right || pill.top >= nav.bottom);
    const kinds = await cards.evaluateAll(items => items.map(item => item.dataset.kind));
    for (const kind of ['photo', 'video']) {
      const button = page.locator(`[data-filter="${kind}"]`);
      await button.click();
      const expected = kinds.filter(value => value === kind).length;
      assert.equal(await page.locator('.projects-grid .work-card:visible').count(), expected);
      assert.equal(await page.locator('.filter-pill [data-filter][aria-pressed="true"]').count(), 1);
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      // The title never moves when a filter chip appears, and the chip never covers the pill.
      assert.equal(await page.locator('.projects-bar h1').evaluate(h1 => h1.getBoundingClientRect().top), title.top);
      if (await page.locator('.category-chip').isVisible()) {
        const [chipBox, pillBox] = await page.evaluate(() => ['.category-chip', '.filter-pill'].map(selector => { const box = document.querySelector(selector).getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }; }));
        assert(chipBox.right <= pillBox.left || chipBox.top >= pillBox.bottom);
      }
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
    await page.locator('.category-chip').click();
    assert.equal(await page.locator('.projects-grid .work-card:visible').count(), total);
    console.log(`PASS ${width}px: opens on all, Photo/Video, chip reset, counts, 44px controls, bar aligned, no overflow`);
  }
  await page.locator('[data-filter="photo"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-filter="photo"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-filter="video"]').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('[data-filter="video"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-filter="video"]').evaluate(button => getComputedStyle(button).outlineStyle), 'solid');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#video-categories').isVisible(), false);
  await page.locator('.projects-grid .work-card:visible').first().click();
  assert(await page.locator('#project-dialog').evaluate(dialog => dialog.open));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#project-dialog').evaluate(dialog => dialog.open), false);
  assert.equal(await page.evaluate(() => document.activeElement.matches('.projects-grid .work-card:not([hidden])')), true);

  // A browser-only fixture proves photo filtering even when only videos are published.
  const photos = await page.locator('.projects-grid .work-card[data-kind="photo"]').count();
  await page.locator('.projects-grid .work-card[data-kind="video"]').first().evaluate(card => { card.dataset.kind = 'photo'; });
  await page.locator('[data-filter="photo"]').click();
  assert.equal(await page.locator('.projects-grid .work-card:visible').count(), photos + 1);
  assert((await page.locator('#project-count').innerText()).startsWith(`${photos + 1} ${photos ? 'projects' : 'project'}`));
  await page.locator('[data-filter="video"]').click();
  assert.equal(await page.locator('.projects-grid .work-card[data-kind="photo"]:visible').count(), 0);
  await page.route(`${base}/projects/`, async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<button class="work-card[^"]*"[\s\S]*?<\/button>/g, '');
    await route.fulfill({ response, body: html });
  });
  await page.goto(`${base}/projects/`);
  assert(await page.getByText('New projects are on the way.', { exact: true }).isVisible());
  await page.unroute(`${base}/projects/`);

  // Hovering a type opens its category dropdown; each item filters to that type and category.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/projects/`);
  for (const kind of ['video', 'photo']) {
    const dropdown = page.locator(`#${kind}-categories`);
    assert.equal(await dropdown.isVisible(), false);
    await page.locator(`[data-filter="${kind}"]`).hover();
    assert(await dropdown.isVisible());
    for (const item of await dropdown.locator('button[data-sub]').all()) {
      await page.locator(`[data-filter="${kind}"]`).hover();
      await item.click();
      const sub = await item.getAttribute('data-sub');
      const expected = await page.locator('.projects-grid .work-card').evaluateAll((items, [kind, sub]) => items.filter(card => card.dataset.kind === kind && (sub === 'all' || card.dataset.categories.split(' ').includes(sub))).length, [kind, sub]);
      assert.equal(await page.locator('.projects-grid .work-card:visible').count(), expected);
      assert.equal(await item.locator('.subfilter-count').innerText(), String(expected));
      assert.equal(await page.locator('.kind-dropdown [aria-pressed="true"]').count(), 1);
      assert.equal(await page.locator(`[data-filter="${kind}"]`).getAttribute('aria-pressed'), 'true');
      assert((await item.boundingBox()).height >= 44);
    }
    await page.mouse.move(10, 600);
    await page.locator('body').focus();
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(400);
    assert.equal(await dropdown.isVisible(), false);
  }
  await page.locator('.category-chip').click();
  assert.equal(await page.locator('.filter-pill [aria-pressed="true"]').count(), 0);
  console.log('PASS: hover dropdowns per type, category counts, pressed state, chip reset');

  // Touch screens: the first tap opens the dropdown instead of filtering.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  await phone.goto(`${base}/projects/`);
  await phone.locator('[data-filter="video"]').tap();
  assert(await phone.locator('#video-categories').isVisible());
  assert.equal(await phone.locator('.projects-grid .work-card:visible').count(), await phone.locator('.projects-grid .work-card').count());
  const firstSub = phone.locator('#video-categories button[data-sub]').nth(1);
  if (await firstSub.count()) {
    await firstSub.tap();
    await phone.evaluate(() => document.activeElement.blur());
    await phone.waitForTimeout(400);
    assert.equal(await phone.locator('#video-categories').isVisible(), false);
    assert.equal(await phone.locator('[data-filter="video"]').getAttribute('aria-pressed'), 'true');
  }
  assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await phone.close();
  console.log('PASS: touch tap opens dropdown, item filters and closes');

  const clientSlug = await page.locator('.projects-grid .work-card[data-clients]:not([data-clients=""])').first().evaluate(card => card.dataset.clients.split(' ')[0]).catch(() => null);
  if (clientSlug) {
    await page.goto(`${base}/projects/?client=${clientSlug}`);
    const expected = await page.locator('.projects-grid .work-card').evaluateAll((items, slug) => items.filter(item => item.dataset.clients?.split(' ').includes(slug)).length, clientSlug);
    assert.equal(await page.locator('.projects-grid .work-card:visible').count(), expected);
    assert(await page.locator('.category-chip').isVisible());
    await page.locator('.category-chip').click();
    assert.equal(await page.locator('.category-chip').isVisible(), false);
    assert.equal(await page.locator('.projects-grid .work-card:visible').count(), await page.locator('.projects-grid .work-card').count());
  }
  const search = page.locator('#project-search');
  assert.equal(await search.evaluate(input => input.getBoundingClientRect().width), 0);
  await page.locator('.search-toggle').click();
  assert(await search.evaluate(input => document.activeElement === input));
  const word = await page.locator('.projects-grid .work-card').first().evaluate(card => card.dataset.search.split(' ')[0]);
  await search.fill(word.toUpperCase());
  const matches = await page.locator('.projects-grid .work-card').evaluateAll((items, word) => items.filter(item => item.dataset.search.includes(word)).length, word);
  assert.equal(await page.locator('.projects-grid .work-card:visible').count(), matches);
  await search.fill('zzqx nothing');
  assert.equal(await page.locator('.projects-grid .work-card:visible').count(), 0);
  assert((await page.locator('#projects-empty').innerText()).startsWith('No projects match'));
  await search.press('Escape');
  assert.equal(await page.locator('.projects-grid .work-card:visible').count(), await page.locator('.projects-grid .work-card').count());
  await page.waitForTimeout(400);
  assert.equal(await search.evaluate(input => input.getBoundingClientRect().width), 0);
  console.log(`PASS: client link filter${clientSlug ? ` (${clientSlug})` : ' (no client data)'}, search icon open/match/no-match/Escape`);

  const noScript = await browser.newPage({ javaScriptEnabled: false });
  await noScript.goto(`${base}/projects/`);
  assert.equal(await noScript.locator('.filter-pill').isVisible(), false);
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
