import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({channel:'msedge',headless:true});
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for(const [width, cols] of [[1440,3],[768,2],[390,1]]) {
    await page.setViewportSize({width,height:884});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.locator('.work-card').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.work-card img').naturalWidth > 0);
    const data = await page.locator('.work-card').first().evaluate(el => {
      const img = el.querySelector('img');
      const box = el.querySelector('.cover-frame').getBoundingClientRect();
      const url = new URL(img.src);
      return {ratio:box.width/box.height, params:Object.fromEntries(url.searchParams), position:getComputedStyle(img).objectPosition};
    });
    assert(Math.abs(data.ratio - 16/9) < .005);
    assert.equal(Number(data.params.w)/Number(data.params.h),16/9);
    assert.equal(data.position,'50% 50%');
    // Nine clones exist only in this browser to prove the grid geometry with nine entries.
    const grid = await page.locator('.work-grid').evaluate(el => {
      const first = el.querySelector('.work-card');
      while(el.children.length<9) {const clone=first.cloneNode(true);clone.classList.remove('reveal-pending');el.append(clone);}
      return {columns:getComputedStyle(el).gridTemplateColumns.split(' ').length, rows:new Set([...el.children].map(child => Math.round(child.getBoundingClientRect().top))).size};
    });
    assert.equal(grid.columns,cols);
    if(width===1440) assert.equal(grid.rows,3);
    await page.screenshot({path:`work/dialog-check/16x9-${width}.png`});
    await page.goto(`${base}/projects/`,{waitUntil:'domcontentloaded'});
    assert(Math.abs(await page.locator('.cover-frame').first().evaluate(el=>{const r=el.getBoundingClientRect();return r.width/r.height;})-16/9)<.005);
    console.log(`PASS: ${base} ${width}px: WORK/archives 16:9, CDN crop 16:9, ${cols} columns${width===1440 ? ' and 3 rows for 9 projects' : ''}`);
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
