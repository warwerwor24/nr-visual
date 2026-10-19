const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = process.argv[2] || 'http://127.0.0.1:4321';
  const output = process.env.EUROMEDICA_OUTPUT || 'work/euromedica';
  await fs.mkdir(output, { recursive: true });
  try {
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal((await page.goto(base, { waitUntil: 'networkidle' })).status(), 200);
      const logo = page.locator('.client-euromedica img');
      await logo.scrollIntoViewIfNeeded();
      await logo.evaluate(image => image.decode());
      assert.deepEqual(await page.locator('.client-logos img').evaluateAll(images => images.map(image => image.alt)), ["For Skin's Sake", 'Buttered', 'SKAK Studios', 'Telkomsel', 'Yanmar', 'BBYU', 'Kokola', 'London Taxi', 'Euromedica']);
      const geometry = await page.locator('.client-logos').evaluate(list => {
        const last = list.lastElementChild;
        const prior = [...list.children].slice(0, -1);
        const image = last.querySelector('img');
        return { rowTop: last.getBoundingClientRect().top, priorBottom: Math.max(...prior.map(item => item.getBoundingClientRect().bottom)), filter: getComputedStyle(image).filter, nativeWidth: image.naturalWidth, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert(geometry.rowTop > geometry.priorBottom, 'Euromedica must occupy a new row');
      assert.equal(geometry.filter, 'invert(1)');
      assert.equal(geometry.nativeWidth, 3665);
      assert.equal(geometry.overflow, false);
      await page.locator('.client-logos').evaluate(async list => {
        await Promise.all([...list.querySelectorAll('img')].map(image => image.decode()));
      });
      const sectionHeight = await page.locator('.clients').evaluate(section => section.offsetHeight);
      await page.setViewportSize({ width, height: Math.ceil(sectionHeight + 200) });
      await page.locator('.clients').evaluate(section => scrollTo(0, section.getBoundingClientRect().top + scrollY - 120));
      await page.locator('.clients').screenshot({ path: `${output}/clients-${width}.png` });
      console.log(`PASS ${width}px: original eight logos preserved, Euromedica separate row, exact original asset inverted white, no overflow`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: zero browser JavaScript errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
