import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['node_modules/sanity/bin/sanity', 'deploy', 'work/studio-online', '--url', 'nr-visual-n4rtv48x', '--yes', '--schema-required'], {
  stdio: 'inherit',
  env: { ...process.env, SANITY_STUDIO_BASEPATH: '/' },
});
process.exit(result.status ?? 1);
