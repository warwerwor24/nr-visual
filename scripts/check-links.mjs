import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir('work/links-check', { recursive: true });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const expected = ['WhatsApp', 'Website', 'Instagram', 'LinkedIn', 'Email'];

try {
  for (const width of [320, 390, 484, 705, 808, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/findmehere`, { waitUntil: 'networkidle' });
    await page.mouse.move(0, 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow at ${width}px`);
    assert.deepEqual(await page.locator('.links-destination-label').allTextContents(), expected);
    assert.equal(await page.locator('.links-destination').last().getAttribute('href'), 'mailto:nouvalrla@gmail.com');
    assert.equal(await page.getByText('Swipe to browse', { exact: true }).count(), 0);
    assert.equal(await page.locator('[data-carousel-toggle]').count(), 0);
    assert.equal(await page.locator('.links-destination').first().locator('.links-destination-detail').innerText(), "Let's talk about your vision");
    const website = page.locator('.links-destination-website');
    assert.equal(await website.locator('.links-destination-detail').innerText(), 'Slide in for more of my works');
    assert.equal(await page.locator('.links-destination').nth(3).locator('.links-destination-detail').innerText(), 'Get to know my career');
    assert.deepEqual(await website.evaluate(link => ({ background: getComputedStyle(link).backgroundColor, label: getComputedStyle(link.querySelector('.links-destination-label')).color, detail: getComputedStyle(link.querySelector('.links-destination-detail')).color })), { background: 'rgb(95, 204, 244)', label: 'rgb(0, 0, 0)', detail: 'rgb(0, 0, 0)' });
    for (const button of await page.locator('.links-destination, .links-carousel-controls button').all()) {
      const box = await button.boundingBox();
      assert(box.width >= 44 && box.height >= 44, `Touch target too small at ${width}px`);
    }
    const count = await page.locator('.links-project').count();
    if (count > 1) {
      const frame = await page.locator('.links-carousel-frame').boundingBox();
      const previous = await page.locator('[data-carousel-prev]').boundingBox();
      const next = await page.locator('[data-carousel-next]').boundingBox();
      assert(previous.x < frame.x + frame.width / 2 && next.x > frame.x + frame.width / 2, 'Arrows must flank the slideshow');
      assert(Math.abs(previous.y + previous.height / 2 - (frame.y + frame.height / 2)) < 1, 'Arrows must be vertically centered');
      assert(await page.locator('.links-carousel-controls button').evaluateAll(buttons => buttons.every(button => getComputedStyle(button).borderWidth === '0px' && getComputedStyle(button).borderRadius === '12px')), 'Arrow buttons must have rounded corners and no border');
      assert(await page.locator('.links-carousel').evaluate(element => getComputedStyle(element).maskImage.includes('linear-gradient')));
      assert(await page.locator('[data-carousel-prev]').isDisabled());
      await page.locator('[data-carousel-next]').click();
      await page.waitForFunction(() => document.querySelector('[data-carousel-count]').textContent.startsWith('2 /'));
      await page.locator('[data-carousel-prev]').click();
      await page.waitForFunction(() => document.querySelector('[data-carousel-count]').textContent.startsWith('1 /'));
      await page.locator('.links-carousel').evaluate(element => { element.scrollLeft = element.scrollWidth; });
      await page.waitForFunction(() => document.querySelector('[data-carousel-next]').disabled);
      await page.waitForFunction(() => document.querySelector('.links-carousel').classList.contains('is-at-end'));
      assert.equal(await page.locator('.links-carousel').evaluate(element => getComputedStyle(element).maskImage), 'none');
      assert.equal((await page.locator('[data-carousel-count]').innerText()).trim(), `${count} / ${count}`);
      await page.locator('.links-project').last().focus();
      await page.keyboard.press('Enter');
    } else if (count === 1) {
      await page.locator('.links-project').click();
    }
    if (count) {
      await page.waitForFunction(() => document.querySelector('#project-dialog').open);
      assert((await page.locator('#dialog-title').innerText()).length > 0);
      assert.equal(await page.locator('.dialog-thumbnail').count(), count);
      if (count > 1) {
        const title = await page.locator('#dialog-title').innerText();
        await page.locator('.dialog-next').click();
        assert.notEqual(await page.locator('#dialog-title').innerText(), title);
        await page.locator('.dialog-prev').click();
        assert.equal(await page.locator('#dialog-title').innerText(), title);
        await page.locator('.dialog-thumbnail').first().click();
        assert.equal(await page.locator('.dialog-thumbnail[aria-pressed="true"]').count(), 1);
      }
      await page.keyboard.press('Escape');
      assert(await page.locator('#project-dialog').evaluate(dialog => !dialog.open));
      assert(await page.locator('.links-project').evaluateAll(buttons => buttons.includes(document.activeElement)));
      await page.locator('.links-project').first().click();
      await page.locator('.dialog-close').click();
      assert(await page.locator('#project-dialog').evaluate(dialog => !dialog.open));
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `work/links-check/links-${width}.png`, fullPage: true });
    console.log(`PASS: ${width}px layout, contact targets, carousel and project popup (${count} published projects)`);
  }

  await page.locator('.links-destinations').evaluate(nav => {
    window.clickedDestinations = [];
    nav.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link) return;
      event.preventDefault();
      window.clickedDestinations.push(link.getAttribute('href'));
    });
  });
  for (const link of await page.locator('.links-destination').all()) await link.click();
  const clicked = await page.evaluate(() => window.clickedDestinations);
  assert(clicked[0].startsWith('https://wa.me/'));
  assert.equal(clicked[1], '/');
  assert(clicked[2].startsWith('https://www.instagram.com/'));
  assert(clicked[3].startsWith('https://www.linkedin.com/'));
  assert.equal(clicked[4], 'mailto:nouvalrla@gmail.com');
  await page.goto(`${base}/findmehere`, { waitUntil: 'networkidle' });
  await page.locator('.links-destination-website').click();
  await page.waitForURL(`${base}/`);
  assert(await page.locator('#work').count());
  console.log('PASS: All five links activate their expected destinations; Website opens the existing homepage');

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${base}/findmehere`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Text zoom overflow');
  assert(await page.locator('.links-destination').last().evaluate(link => link.scrollWidth <= link.clientWidth));
  await page.screenshot({ path: 'work/links-check/links-zoom.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${base}/findmehere`, { waitUntil: 'domcontentloaded' });
  await page.mouse.move(0, 0);
  const total = await page.locator('.links-project').count();
  if (total > 1) {
    await page.waitForTimeout(1500);
    assert((await page.locator('[data-carousel-count]').innerText()).startsWith('1 /'), 'Autoplay must not advance before the 2-second interval');
    await page.waitForFunction(() => document.querySelector('[data-carousel-count]').textContent.startsWith('2 /'), null, { timeout: 4000 });
    assert.equal(await page.locator('[data-carousel-count]').getAttribute('aria-live'), 'off');
    await page.locator('[data-carousel-next]').focus();
    await page.waitForTimeout(700);
    const pausedCount = await page.locator('[data-carousel-count]').innerText();
    await page.waitForTimeout(2300);
    assert.equal(await page.locator('[data-carousel-count]').innerText(), pausedCount, 'Keyboard focus must stop autoplay');
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForFunction(previous => document.querySelector('[data-carousel-count]').textContent !== previous, pausedCount, { timeout: 4000 });
    await page.locator('[data-carousel-next]').focus();
    const focusedCount = await page.locator('[data-carousel-count]').innerText();
    await page.waitForTimeout(2300);
    assert.equal(await page.locator('[data-carousel-count]').innerText(), focusedCount, 'Keyboard focus must stop autoplay');
    await page.locator('.links-carousel').evaluate(element => { element.scrollLeft = element.scrollWidth; });
    await page.waitForFunction(() => document.querySelector('.links-carousel').classList.contains('is-at-end'));
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForFunction(() => document.querySelector('[data-carousel-count]').textContent.startsWith('1 /'), null, { timeout: 4000 });
    await page.locator('[data-carousel-next]').focus();
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'work/links-check/links-autoplay-390.png', fullPage: true });
    await page.locator('.links-project').first().click();
    await page.waitForFunction(() => document.querySelector('#project-dialog').open);
    const dialogCount = await page.locator('[data-carousel-count]').innerText();
    await page.waitForTimeout(2300);
    assert.equal(await page.locator('[data-carousel-count]').innerText(), dialogCount, 'Open project must stop autoplay');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-carousel-toggle]').count(), 0);
    console.log('PASS: 2-second autoplay advances and loops without a Pause/Play control; focus and open-project pauses work; reduced motion disables autoplay');
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 200% text scaling at 320px, keyboard activation, Escape, focus return, no page errors');
} finally {
  await browser.close();
}
