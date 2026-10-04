import { createImageUrlBuilder } from '@sanity/image-url';

export function coverPresentation(project, width = 1200, variant = 'work') {
  const gallery = variant === 'gallery' && project.galleryCover?.asset?._ref && project.galleryCover.url ? project.galleryCover : null;
  if (gallery) project = { cover: gallery.url, coverImage: gallery };
  const fallback = { src: project.cover, position: '50% 50%' };
  if (!project.coverImage?.asset?._ref) return fallback;
  const url = new URL(project.cover);
  const path = url.pathname.match(/^\/images\/([a-z0-9]+)\/([a-z0-9_-]+)\//);
  if (url.origin !== 'https://cdn.sanity.io' || !path) return fallback;
  const { crop, hotspot } = project.coverImage;
  const coordinate = (axis, before, after) => {
    const start = crop?.[before] || 0;
    const span = 1 - start - (crop?.[after] || 0);
    const point = hotspot?.[axis] ?? .5;
    return span > 0 ? Math.max(0, Math.min(1, (point - start) / span)) * 100 : 50;
  };
  return {
    src: createImageUrlBuilder({ projectId: path[1], dataset: path[2] }).image(project.coverImage).width(width).fit('max').auto('format').quality(85).url(),
    // ponytail: CSS follows the hotspot centre at any card ratio; use per-ratio CDN crops if the entire hotspot area must fit.
    position: hotspot ? `${coordinate('x', 'left', 'right')}% ${coordinate('y', 'top', 'bottom')}%` : '50% 50%',
  };
}
