import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import driveVideo from '../api/drive-video.mjs';

process.env.DRIVE_VIDEO_SIGNING_SECRET ||= randomBytes(32).toString('hex');

const server = createServer((request, response) => {
  if (request.url?.split('?')[0] === '/api/drive-video') return driveVideo(request, response);
  response.statusCode = 404;
  response.end();
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(3334, '127.0.0.1', () => {
  const studio = spawn(process.execPath, ['node_modules/sanity/bin/sanity', 'dev', '--host', '127.0.0.1'], {
    stdio: 'inherit',
    env: { ...process.env, SANITY_STUDIO_DRIVE_VIDEO_URL: 'http://127.0.0.1:3334/api/drive-video' },
  });
  const stop = () => { studio.kill(); server.close(); server.closeAllConnections(); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  studio.once('error', error => { console.error(error.message); stop(); process.exitCode = 1; });
  studio.once('exit', code => { server.close(); server.closeAllConnections(); process.exitCode = code || 0; });
});
