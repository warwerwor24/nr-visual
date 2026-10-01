import { spawnSync } from 'node:child_process';

const release = process.argv.includes('--release') || process.env.CONTEXT === 'production' || process.env.VERCEL_ENV === 'production';
if (release) process.env.REQUIRE_PRODUCTION = '1';
if (!process.env.SITE_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) process.env.SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
if (release && !process.env.SANITY_STUDIO_PROJECT_ID) throw new Error('Connect Sanity before a production deployment. Use npm run build for a local sample.');
function run(path, args) {
  const result = spawnSync(process.execPath, [path, ...args], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
run('node_modules/astro/bin/astro.mjs', ['build']);
if (process.env.SANITY_STUDIO_PROJECT_ID && !process.env.VERCEL) run('node_modules/sanity/bin/sanity', ['build', 'dist/admin', '--yes']);
else if (process.env.VERCEL) console.log('Portfolio build complete. Admin uses the hosted Sanity Studio.');
else console.log('Sample build complete. CMS login requires your Sanity project.');
