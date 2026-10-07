import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const ratios = [[400,600],[600,400],[400,400],[800,450],[500,700]];
const image = (width, height, label) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#30342f"/><text x="50%" y="48%" text-anchor="middle" fill="#f4f4f4" font-family="Arial" font-size="24">${label}</text><text x="50%" y="55%" text-anchor="middle" fill="#b5b8ba" font-family="Arial" font-size="20">${width}:${height}</text></svg>`)}`;
const projectId = 'local-gallery-preview';
const photos = Array.from({length:15}, (_, index) => {
  const [width,height] = ratios[index % ratios.length];
  return `<button type="button" class="photo-tile" data-photo-index="${index}" aria-label="View placeholder photo ${index+1}"><img src="${image(width,height,`Placeholder ${index+1}`)}" alt="Placeholder photo ${index+1}" width="${width}" height="${height}"></button>`;
}).join('');
let html = await readFile('dist/projects/index.html','utf8');
html = html.replace(/<title>[^<]+<\/title>/, '<title>Local photo gallery preview | NR Visual</title>');
assert(html.includes('id="project-templates"'), 'Build the website before creating the local gallery preview');
html = html.replace(/<div class="projects-grid">[\s\S]*?<\/div>/, `<div class="projects-grid"><button class="work-card" data-project="${projectId}" aria-label="Open local gallery preview"><span class="cover-frame"><img src="${image(600,400,'Album preview')}" alt="Placeholder album cover"/><span class="cover-caption">Local gallery preview</span></span></button></div>`);
html = html.replace(/<div hidden id="project-templates">[\s\S]*?<\/template><\/div>/, `<div hidden id="project-templates"><template data-project-template="${projectId}" data-kind="photo" data-title="Album preview" data-completed-at="2026-09-22" data-description="Local preview only. All photos, title and date are placeholders."><div class="photo-gallery">${photos}</div></template></div>`);
html = html.replace('<h1>ALL PROJECTS</h1>', '<h1>PHOTO GALLERY PREVIEW</h1><p>Local only. Photos, title and date are placeholders.</p>');
html = html.replace('content="width=device-width, initial-scale=1"', 'content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"');
await mkdir('dist/photo-preview',{recursive:true});
await writeFile('dist/photo-preview/index.html',html);
console.log('Local preview created at /photo-preview/. This generated page is removed by the next regular build.');
