export function driveMedia(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.port || url.username || url.password) return null;
    const match = url.pathname.match(/^\/file\/d\/([\w-]+)\/(?:view|preview)\/?$/);
    const id = match?.[1] || (['/open', '/uc'].includes(url.pathname) ? url.searchParams.get('id') : null);
    if (!id || !/^[\w-]{10,200}$/.test(id)) return null;
    const key = url.searchParams.get('resourcekey');
    if (key && !/^[\w-]{1,200}$/.test(key)) return null;
    const suffix = key ? `?resourcekey=${encodeURIComponent(key)}` : '';
    return { embed: `https://drive.google.com/file/d/${id}/preview${suffix}`, open: `https://drive.google.com/file/d/${id}/view${suffix}` };
  } catch { return null; }
}

// Direct video file, e.g. a public Cloudflare R2 URL, played by the browser's own <video> player.
export function videoFileUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && /\.(mp4|m4v|webm)$/i.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

export function videoAspectRatio(format) {
  const ratios = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 4 / 5 };
  return Object.hasOwn(ratios, format) ? ratios[format] : 16 / 9;
}

export function socialUrl(value, host) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && [host, `www.${host}`].includes(url.hostname) && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

export function whatsappUrl(value) {
  const phone = String(value || '').replace(/[\s()+-]/g, '');
  if (!/^[1-9]\d{7,14}$/.test(phone)) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent('Halo NR Visual, ada project yang ingin kuobrolin!')}`;
}

export function publishedProjects(items = [], videoOnly = false) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?._id || /^(drafts|versions)\./.test(item._id) || seen.has(item._id) || (videoOnly && item.kind !== 'video')) return false;
    seen.add(item._id);
    return true;
  });
}
