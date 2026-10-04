import { driveMedia, publishedProjects, socialUrl, whatsappUrl } from './media.mjs';
import { demoContent } from '../data/demo.mjs';

const project = `{_id,title,category,description,kind,driveUrl,videoFormat,client,role,completedAt,"cover":cover.asset->url,"coverImage":cover{asset,crop,hotspot},"alt":cover.alt,"galleryCover":galleryCover{"url":asset->url,asset,crop,hotspot,alt},"photos":photos[]{"url":asset->url,alt}}`;
export const contentQuery = `*[_type == "siteSettings" && _id == "siteSettings"][0]{brandName,heroText,heroPortrait{"url":asset->url,alt},experienceYears,aboutText,whatsapp,instagram,linkedin,"logo":logo.asset->url,"clientLogos":clientLogos[]{"url":asset->url,alt,tone},"shareImage":shareImage.asset->url,"highlights":highlights[]->${project},"collage":collage[]->${project},"projects":*[_type == "project"] | order(coalesce(completedAt,_createdAt) desc,_id asc)${project}}`;

export async function loadContent(env) {
  const id = env.SANITY_STUDIO_PROJECT_ID;
  if (!id) {
    if (env.REQUIRE_PRODUCTION === '1') throw new Error('Release blocked: connect Sanity and replace sample content first.');
    return demoContent;
  }
  const dataset = env.SANITY_STUDIO_DATASET || 'production';
  if (!/^[a-z0-9]+$/.test(id) || !/^[a-z0-9_-]+$/.test(dataset)) throw new Error('Invalid Sanity project or dataset.');
  const endpoint = new URL(`https://${id}.api.sanity.io/v2025-02-19/data/query/${dataset}`);
  endpoint.searchParams.set('perspective', 'published');
  endpoint.searchParams.set('query', contentQuery);
  const response = await fetch(endpoint, {
    headers: env.SANITY_READ_TOKEN ? { Authorization: `Bearer ${env.SANITY_READ_TOKEN}` } : {},
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Sanity could not be read (${response.status}). Existing deployment must be kept.`);
  const { result } = await response.json();
  if (!result) throw new Error('Publish the Website settings document in Sanity first.');
  const highlights = publishedProjects(result.highlights || [], true).slice(0, 9);
  const collage = publishedProjects(result.collage || []);
  const projects = publishedProjects(result.projects || []);
  for (const item of publishedProjects([...highlights, ...collage, ...projects])) {
    if (!item.cover || !item.title || !item.alt) throw new Error(`Missing cover, title or alternative text: ${item._id}`);
    if (item.kind === 'video' && !driveMedia(item.driveUrl)) throw new Error(`Invalid Drive URL: ${item.title}`);
    if (item.kind === 'photo' && (!item.photos?.length || !item.photos.every(photo => photo?.url && photo.alt))) throw new Error(`Missing photos or image descriptions: ${item.title}`);
  }
  const settings = { ...result, whatsapp: whatsappUrl(result.whatsapp), instagram: socialUrl(result.instagram, 'instagram.com'), linkedin: socialUrl(result.linkedin, 'linkedin.com') };
  if (env.REQUIRE_PRODUCTION === '1') {
    for (const key of ['brandName', 'heroText', 'aboutText', 'logo', 'shareImage', 'whatsapp', 'instagram', 'linkedin']) {
      if (!settings[key]) throw new Error(`Release blocked: complete Website settings > ${key}.`);
    }
    if (!env.SITE_URL || !/^https:\/\//.test(env.SITE_URL)) throw new Error('Release blocked: set the canonical HTTPS SITE_URL.');
  }
  return { demo: false, settings, highlights, collage, projects };
}
