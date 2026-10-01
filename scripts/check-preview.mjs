import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.emulateMedia({ reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir('work/preview-check', { recursive: true });

try {
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.collage-card').count(), 15);
  assert.equal(await page.locator('#about-title').innerText(), '8 YEARS\nOF EXPERIENCE.');
  assert.equal(await page.locator('.about-tagline').innerText(), 'YOUR VISION IN FOCUS.');
  assert.equal(await page.locator('.collage-card b').count(), 0);
  assert.equal(await page.locator('.client-placeholder').count(), 0);
  assert.deepEqual(await page.locator('.client-logos img').evaluateAll(images => images.map(img => img.alt)), ["For Skin's Sake", 'Buttered', 'SKAK Studios', 'Telkomsel', 'Yanmar', 'BBYU', 'Kokola', 'London Taxi']);
  assert(await page.locator('.client-logos li').evaluateAll(items => items.every(item => getComputedStyle(item).backgroundColor === 'rgba(0, 0, 0, 0)')));
  assert(await page.locator('.client-logos img').evaluateAll(images => images.every(img => img.getAttribute('src').endsWith('.png'))));
  for (const logo of await page.locator('.client-logos img').all()) {
    await logo.evaluate(image => { image.loading = 'eager'; });
    await logo.scrollIntoViewIfNeeded();
    await logo.evaluate(image => image.decode());
    assert(await logo.evaluate(image => image.naturalWidth > 0));
  }
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), '/nr-favicon.png');
  assert(await page.evaluate(async () => { const icon = new Image(); icon.src = '/nr-favicon.png'; await icon.decode(); return icon.naturalWidth === icon.naturalHeight; }));
  assert.equal(await page.locator('.clients + #about').count(), 1);
  assert.equal(await page.locator('.card-bottom, .hero-bottom').count(), 0);
  assert.equal(await page.locator('#work-title').innerText(), 'WORK');
  assert.equal(await page.locator('#work > .section-heading .all-projects-link').getAttribute('href'), '/projects/');
  assert.equal(await page.locator('.clients-more').innerText(), 'and many more..');
  await page.locator('.all-projects-link').hover();
  assert.equal(await page.locator('.all-projects-label').evaluate(el => getComputedStyle(el).visibility), 'visible');
  await page.mouse.move(1000, 0);
  assert.equal(await page.locator('.all-projects-label').evaluate(el => getComputedStyle(el).visibility), 'hidden');
  await page.locator('.all-projects-link').focus();
  assert.equal(await page.locator('.all-projects-label').evaluate(el => getComputedStyle(el).visibility), 'visible');
  await page.locator('.all-projects-link').blur();
  assert.equal(await page.locator('.sample-banner, .collection-top, .clients-heading p, #about > .eyebrow, #services > .section-heading > span').count(), 0);
  assert.equal(await page.locator('.site-header nav a').nth(2).innerText(), 'CONTACT');
  assert.equal(await page.locator('.site-header nav a').nth(2).getAttribute('href'), '#about');
  for (const service of await page.locator('.hero-services li').all()) {
    const last = await service.evaluate(el => el === el.parentElement.lastElementChild);
    assert.equal(await service.evaluate(el => getComputedStyle(el).paddingBottom), last ? '0px' : '10px');
  }
  assert.equal(await page.locator('.brand img, #hero-title img, .footer-logo').count(), 3);
  for (const logo of await page.locator('.brand img, #hero-title img, .footer-logo').all()) {
    await logo.evaluate(image => { image.loading = 'eager'; });
    await logo.scrollIntoViewIfNeeded();
    await logo.waitFor({ state: 'visible' });
    await page.waitForFunction(image => image.complete && image.naturalWidth > 0, await logo.elementHandle());
    await logo.evaluate(image => image.decode());
    assert.equal(await logo.evaluate(image => image.naturalWidth), 1636);
  }
  assert.equal(await page.locator('.collection-bottom').count(), 0);
  assert.equal(await page.locator('.footer img + p').count(), 1);
  assert((await page.locator('.footer-logo').boundingBox()).width <= 170);
  assert.equal(await page.locator('.contact-button').getAttribute('href'), 'https://wa.me/628176383770');
  assert.equal(await page.locator('.social-links a').nth(0).getAttribute('href'), 'https://www.instagram.com/ivalrz/');
  assert.equal(await page.locator('.social-links a').nth(1).getAttribute('href'), 'https://www.linkedin.com/in/nouvalrla/');
  assert.equal(await page.locator('.social-links svg').count(), 3);
  assert.equal(await page.locator('.social-links a + .contact-location').innerText(), 'Jakarta, Indonesia');
  await page.context().route(/^https:\/\/(wa\.me|www\.instagram\.com|www\.linkedin\.com)\//, route => route.fulfill({ contentType: 'text/plain', body: 'Local test: destination captured.' }));
  for (const link of await page.locator('.nav-contact, .contact-button, .social-links a').all()) {
    const destination = await link.getAttribute('href');
    const opened = page.waitForEvent('popup');
    await link.click();
    const popup = await opened;
    await popup.waitForURL(destination);
    await popup.close();
  }
  assert.equal(await page.locator('.hero-slide, .nav-contact').count(), 0);
  await page.locator('.hero-portrait').evaluate(image => image.decode());
  assert(await page.locator('.hero-portrait').evaluate(image => image.naturalWidth > 1000));
  const palette = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return ['--ink', '--cream', '--accent'].map(name => root.getPropertyValue(name).trim());
  });
  assert.deepEqual(palette, ['#11120f', '#FAEF59', '#5FCCF4']);

  for (const width of [1440, 1189, 1000, 768, 600, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
    assert(await page.locator('.hero').evaluate(el => Math.abs(el.getBoundingClientRect().height - innerHeight) < 2), `Hero not fullscreen at ${width}px`);
    assert(await page.locator('.hero-description p').evaluate(el => {
      const rect = el.getBoundingClientRect();
      const logo = document.querySelector('#hero-title img').getBoundingClientRect();
      const kicker = document.querySelector('.hero-kicker').getBoundingClientRect();
      return getComputedStyle(el).fontWeight === '800' && rect.bottom < logo.top && rect.top > kicker.bottom && parseFloat(getComputedStyle(el).fontSize) < logo.height;
    }), `Hero statement overlaps or exceeds logo size at ${width}px`);
    assert(await page.locator('#services-title').evaluate(el => {
      const rect = el.getBoundingClientRect();
      const rail = el.parentElement.getBoundingClientRect();
      const list = document.querySelector('.service-list').getBoundingClientRect();
      return Math.abs(rail.height - list.height) < 1 && Math.abs(rail.top - list.top) < 1 &&
        Math.abs((rect.left + rect.right) / 2 - (rail.left + rail.right) / 2) < 1 &&
        Math.abs((rect.top + rect.bottom) / 2 - (rail.top + rail.bottom) / 2) < 1 &&
        getComputedStyle(el).writingMode === 'vertical-rl';
    }), `Service heading not centered at ${width}px`);
    assert(await page.evaluate(() => {
      const grid = document.querySelector('.work-grid').getBoundingClientRect();
      const collection = document.querySelector('#collection').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.work-card')].map(el => el.getBoundingClientRect());
      const title = document.querySelector('#work-title').getBoundingClientRect();
      const work = document.querySelector('#work').getBoundingClientRect();
      const rail = document.querySelector('#work > .section-heading').getBoundingClientRect();
      const hero = document.querySelector('#top').getBoundingClientRect();
      return Math.abs(rail.left) < 1 && Math.abs(grid.left - rail.right) < 1 && Math.abs(grid.right - innerWidth) < 1 &&
        Math.abs(grid.bottom - collection.top) < 1 && Math.abs(cards.at(-1).bottom - grid.bottom) < 1 &&
        Math.abs(grid.top - work.top) < 1 && Math.abs(hero.bottom - work.top) < 1 &&
        Math.abs(rail.top - grid.top) < 1 && Math.abs(rail.height - work.height) < 1 &&
        Math.abs((title.left + title.right) / 2 - (rail.left + rail.right) / 2) < 1 &&
        Math.abs((title.top + title.bottom) / 2 - (rail.top + rail.bottom) / 2) < 1 &&
        title.left >= rail.left && title.right <= rail.right && getComputedStyle(document.querySelector('#work-title')).writingMode === 'vertical-rl' &&
        cards.slice(1).every((card, i) => Math.abs(card.top - cards[i].top) < 1 ? Math.abs(card.left - cards[i].right) < 1 : Math.abs(card.top - cards[i].bottom) < 1) &&
        (innerWidth > 1000 || Math.abs(cards.at(-1).width - grid.width) < 1);
    }), `Works grid has a gap or misalignment at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.footer').scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); }));
  });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'work/preview-check/desktop.png', fullPage: true });
  await page.locator('.hero').screenshot({ path: 'work/preview-check/hero.png' });
  await page.locator('#work').screenshot({ path: 'work/preview-check/works-desktop.png' });
  await page.setViewportSize({ width: 975, height: 884 });
  await page.locator('#work').screenshot({ path: 'work/preview-check/works-tablet.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.clients').screenshot({ path: 'work/preview-check/clients.png' });
  await page.locator('#services').screenshot({ path: 'work/preview-check/services.png' });
  await page.locator('.collection').screenshot({ path: 'work/preview-check/collection.png' });
  await page.locator('.work-card').first().click();
  assert.equal(await page.locator('#project-dialog .sample-notice, #project-dialog figcaption, #dialog-category, #drive-link').count(), 0);
  assert.equal((await page.locator('.dialog-close').innerText()).trim(), '×');
  assert((await page.locator('#project-dialog').boundingBox()).width <= 820);
  assert(await page.locator('.site-header').evaluate(el => getComputedStyle(el).backdropFilter.includes('blur')));
  await page.screenshot({ path: 'work/preview-check/project-glass.png' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 772, height: 884 });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'work/preview-check/hero-tablet.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });

  const cards = page.locator('.work-card, .collage-card');
  for (let i = 0; i < await cards.count(); i++) {
    await cards.nth(i).click();
    await page.locator('#project-dialog[open]').waitFor();
    assert((await page.locator('#dialog-title').innerText()).length > 0);
    if (i % 2) await page.keyboard.press('Escape');
    else await page.locator('.dialog-close').click();
    assert.equal(await page.locator('#project-dialog[open]').count(), 0);
    assert(await cards.nth(i).evaluate(button => button === document.activeElement), `Focus not restored: ${i}`);
  }
  for (const link of await page.locator('.site-header a[href^="#"], .hero-bottom a').all()) {
    const href = await link.getAttribute('href');
    await link.click();
    assert.equal(new URL(page.url()).hash, href);
    assert.equal(await page.locator(href).count(), 1);
  }
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  assert(await page.locator('.skip-link').evaluate(link => link === document.activeElement));
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '#main');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.cover-frame img').first().evaluate(img => getComputedStyle(img).transitionDuration), '0s');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); }));
  });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'work/preview-check/mobile.png', fullPage: true });
  await page.screenshot({ path: 'work/preview-check/mobile-top.png' });
  await page.locator('.clients').screenshot({ path: 'work/preview-check/mobile-clients.png' });
  await page.locator('.work-card').first().click();
  await page.locator('.dialog-close').click();
  await page.locator('.collage-card').last().click();
  await page.keyboard.press('Escape');
  await page.locator('.footer').screenshot({ path: 'work/preview-check/footer.png' });
  await page.locator('.about-bottom').screenshot({ path: 'work/preview-check/contact.png' });
  assert.deepEqual(errors, []);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.work-card').first().click();
    assert.equal(await page.locator('#project-dialog').evaluate(el => getComputedStyle(el).animationName), 'project-open');
    assert.deepEqual(await page.evaluate(() => ['dialog-media', 'dialog-title', 'dialog-description'].map(id => document.getElementById(id).getAnimations()[0].effect.getTiming().delay)), [440, 500, 560]);
    await page.waitForFunction(() => !document.querySelector('#project-dialog').classList.contains('is-opening'));
    await page.waitForFunction(() => ['dialog-media', 'dialog-title', 'dialog-description'].every(id => getComputedStyle(document.getElementById(id)).opacity === '1'));
    assert.equal(await page.locator('#project-dialog').evaluate(el => getComputedStyle(el).transform), 'none');
    await page.keyboard.press('Escape');
    assert(await page.locator('#project-dialog').evaluate(el => el.classList.contains('is-closing') && el.getAnimations().some(animation => animation.playState === 'running')));
    await page.locator('#project-dialog').waitFor({ state: 'hidden' });
    await page.locator('.work-card').first().click();
    await page.keyboard.press('Escape');
    await page.locator('#project-dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#project-dialog[open]').count(), 0);
    assert(await page.locator('.work-card').first().evaluate(el => el === document.activeElement));
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => [...document.querySelectorAll('.hero-description p span')].every(el => !el.classList.contains('reveal-pending')));
  assert.deepEqual(await page.locator('.hero-description p span').evaluateAll(lines => lines.map(el => getComputedStyle(el).transitionDelay)), ['0.06s', '0.18s']);
  assert(await page.locator('.site-header').evaluate(el => getComputedStyle(el).transitionProperty.includes('backdrop-filter')));
  assert(await page.locator('.work-card').last().evaluate(el => el.classList.contains('reveal-pending')));
  await page.locator('.work-card').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.work-card')].slice(0, 3).every(el => !el.classList.contains('reveal-pending')));
  const workDelays = await page.locator('.work-card').evaluateAll(cards => cards.slice(0, 3).map(el => parseFloat(getComputedStyle(el).transitionDelay) * 1000));
  assert(workDelays.slice(1).every((delay, i) => Math.abs(delay - workDelays[i] - 180) < 10), `Work cards must enter sequentially: ${workDelays}`);
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('.work-card').first().evaluate(el => getComputedStyle(el).opacity), '1');
  await page.locator('#collection').evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight / 2, behavior: 'instant' }));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  const beforeFloat = await page.locator('.position-0').evaluate(el => getComputedStyle(el).translate);
  await page.evaluate(() => scrollBy({ top: 220, behavior: 'instant' }));
  await page.waitForTimeout(400);
  const afterFloat = await page.locator('.position-0').evaluate(el => getComputedStyle(el).translate);
  assert.notEqual(beforeFloat, afterFloat, 'Collage must move as the page scrolls');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(100);
  const middle = await page.evaluate(() => scrollY);
  assert(middle > 0 && middle < 600, `Scroll should interpolate: ${middle}`);
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => scrollY), 600);
  await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(80);
  assert(await page.evaluate(() => scrollY > 0 && scrollY < 600));
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => scrollY), 0);
  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.evaluate(y => scrollTo({ top: y - 250, behavior: 'instant' }), bottom);
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(80);
  assert(await page.evaluate(y => scrollY < y && scrollY > y - 250, bottom));
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => scrollY), bottom);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => scrollY), bottom);
  await page.evaluate(() => scrollTo({ top: 1000, behavior: 'instant' }));
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(60);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => scrollY), 1000);
  await page.mouse.wheel(0, 800);
  await page.keyboard.press('Home');
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => scrollY), 0);
  await page.locator('.work-card').first().click();
  const behindDialog = await page.evaluate(() => scrollY);
  await page.locator('#project-dialog').hover();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => scrollY), behindDialog);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#project-dialog').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => !document.querySelector('.reveal-pending'));
  assert.equal(await page.locator('.reveal-pending').count(), 0);
  assert.equal(await page.locator('.position-0').evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.deepEqual(errors, []);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => scrollY), 500);
  const noScript = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await noScript.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4321/');
  assert(await noScript.locator('.hero-portrait').isVisible());
  assert.equal(await noScript.locator('.work-card').first().evaluate(el => getComputedStyle(el).opacity), '1');
  await noScript.close();
  await page.locator('.all-projects-link').click();
  await page.waitForURL('**/projects/');
  assert.equal(await page.locator('.projects-grid .work-card').count(), 15);
  assert.equal(await page.locator('#project-templates template').count(), 15);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Project archive overflow at ${width}px`);
  }
  for (const index of [0, 9, 14]) {
    const card = page.locator('.projects-grid .work-card').nth(index);
    await card.click();
    assert.equal(await page.locator('#dialog-title').textContent(), await card.locator('.cover-caption').textContent());
    await page.keyboard.press('Escape');
    await page.locator('#project-dialog').waitFor({ state: 'hidden' });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'work/preview-check/all-projects.png' });
  await page.locator('.back-link').click();
  await page.waitForURL('**/#work');
  assert.deepEqual(errors, []);
  console.log('PASS: centered left panels for WORK and WHAT I DO at 7 widths, 8 decoded brand logos, square nr favicon, seamless section joins, sequential entrances, 24 dialogs, contacts, scroll motion, reduced motion and no-JS visibility.');
} finally {
  await browser.close();
}
