import { createReadStream } from 'node:fs';
import { getCliClient } from 'sanity/cli';
import { demoContent } from '../src/data/demo.mjs';

const client = getCliClient({ apiVersion: '2025-02-19' });
if (client.config().projectId !== 'n4rtv48x' || client.config().dataset !== 'production') {
  throw new Error('Run setup only for NR Visual project n4rtv48x / production.');
}
const existing = await client.fetch('*[_id in ["siteSettings", "drafts.siteSettings"]][0]{_id}', {}, { perspective: 'raw' });
if (existing) {
  console.log('Website settings already exist; keeping them unchanged.');
} else {
  async function image(file, alt) {
    const asset = await client.assets.upload('image', createReadStream(new URL(`../public/${file}`, import.meta.url)), { filename: file.split('/').at(-1) });
    return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, alt };
  }
  const logo = await image('nrvisual-logo-transparent.png', 'NR Visual');
  const portrait = await image('hero-portrait-cover.png', 'Portrait with cyan motion trails and warm light across the eyes.');
  const brands = [
    ["For Skin's Sake", 'for-skins-sake-white.png'],
    ['Buttered', 'buttered.png'],
    ['SKAK Studios', 'skak-studios-white.png'],
    ['Telkomsel', 'telkomsel.png'],
    ['Yanmar', 'yanmar.png'],
    ['BBYU', 'bbyu-transparent.png'],
    ['Kokola', 'kokola.png'],
    ['London Taxi', 'london-taxi.png'],
  ];
  const clientLogos = [];
  for (const [alt, file] of brands) {
    clientLogos.push({ ...await image(`client-logos/${file}`, alt), _key: file.replace('.png', ''), ...(alt === 'London Taxi' ? { tone: 'badge' } : {}) });
  }
  await client.createIfNotExists({
    _id: 'siteSettings', _type: 'siteSettings', ...demoContent.settings,
    logo, heroPortrait: portrait, shareImage: portrait, clientLogos,
    whatsapp: '628176383770', instagram: 'https://www.instagram.com/ivalrz/', linkedin: 'https://www.linkedin.com/in/nouvalrla/',
    highlights: [], collage: [],
  });
  console.log('Published NR Visual website settings with the approved branding and contacts. No sample projects imported.');
}
