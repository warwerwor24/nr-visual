import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('work/studio-online/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))"/g)].map(match => match[1]);
assert.ok(assets.length > 0, 'The Studio build must include its JavaScript entry');
for (const path of assets) {
  assert.ok(path.startsWith('/static/'), `Hosted Studio asset has the wrong base path: ${path}`);
  const response = await fetch(`https://nr-visual-n4rtv48x.sanity.studio${path}`, { redirect: 'manual' });
  assert.equal(response.status, 200, `${path} must load without redirecting to Dashboard`);
  assert.match(response.headers.get('content-type') || '', path.endsWith('.js') ? /javascript/ : /text\/css/);
}
const response = await fetch(`https://nr-visual-n4rtv48x.sanity.studio/static/create-manifest.json?check=${Date.now()}`);
assert.equal(response.status, 200);
const manifest = await response.json();
assert.equal(manifest.workspaces[0].basePath, '/');
assert.equal(manifest.workspaces[0].projectId, 'n4rtv48x');
console.log(JSON.stringify({ assets, redirects: false, workspaceBasePath: '/' }));
