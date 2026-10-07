import { createImageUrlBuilder } from '@sanity/image-url';

export function photoUrl(source, width = 640) {
  let url;
  try { url = new URL(source); } catch { return source; }
  const path = url.pathname.match(/^\/images\/([a-z0-9]+)\/([a-z0-9_-]+)\//);
  if (url.origin !== 'https://cdn.sanity.io' || !path) return source;
  return createImageUrlBuilder({ projectId: path[1], dataset: path[2] }).image(source).width(width).fit('max').auto('format').quality(85).url();
}

export function coverPresentation(project, width = 1200, variant = 'work', ratio = variant === 'gallery' ? .8 : 16 / 9) {
  const gallery = variant === 'gallery' && project.galleryCover?.asset?._ref && project.galleryCover.url ? project.galleryCover : null;
  if (gallery) project = { cover: gallery.url, coverImage: gallery };
  const fallback = { src: project.cover, position: '50% 50%' };
  if (!project.coverImage?.asset?._ref) return fallback;
  const url = new URL(project.cover);
  const path = url.pathname.match(/^\/images\/([a-z0-9]+)\/([a-z0-9_-]+)\//);
  if (url.origin !== 'https://cdn.sanity.io' || !path) return fallback;
  return {
    src: createImageUrlBuilder({ projectId: path[1], dataset: path[2] }).image(project.coverImage).width(width).height(Math.round(width / ratio)).fit('crop').auto('format').quality(85).url(),
    position: '50% 50%',
  };
}
