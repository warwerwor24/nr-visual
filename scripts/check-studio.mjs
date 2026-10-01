import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// Compilation only. This ID is a fixture, never an account or a deployment target.
const result = spawnSync(process.execPath, ['node_modules/sanity/bin/sanity', 'build', 'work/studio-check', '--yes'], {
  stdio: 'inherit',
  env: { ...process.env, SANITY_STUDIO_PROJECT_ID: 'previewtest', SANITY_STUDIO_DATASET: 'production', XDG_CONFIG_HOME: resolve('.cache') },
});
process.exit(result.status ?? 1);
