import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: { projectId: process.env.SANITY_STUDIO_PROJECT_ID || '', dataset: process.env.SANITY_STUDIO_DATASET || 'production' },
  project: { basePath: '/admin' },
  deployment: { appId: 'bu2yirht1iifi8wfaft3u51f', autoUpdates: false },
});
