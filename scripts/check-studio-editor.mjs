import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-02-19' });
const token = client.config().token;
assert.ok(token, 'Run through sanity exec --with-user-token');
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
const errors = [];
try {
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ token }) => {
    if (location.origin !== 'http://127.0.0.1:3333') return;
    localStorage.setItem('__studio_auth_token_n4rtv48x', JSON.stringify({ token }));
  }, { token });
  await page.goto('http://127.0.0.1:3333/admin/', { waitUntil: 'domcontentloaded' });
  await page.getByText('Website settings', { exact: true }).first().waitFor({ timeout: 30000 });
  await page.getByText('Website settings', { exact: true }).first().click();
  await page.getByText('Opening sentence', { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(new URL(page.url()).pathname, '/admin/structure/siteSettings');
  await page.screenshot({ path: 'work/editor-auth.png' });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ url: page.url(), editorLoaded: true, settingsLoaded: true, errors }));
} catch (error) {
  console.log(JSON.stringify({ url: page.url(), text: (await page.locator('body').innerText()).slice(0, 1500), errors }));
  await page.screenshot({ path: 'work/editor-auth-error.png' });
  throw error;
} finally {
  await browser.close();
}
