// Client logos link to the archive filtered to that client's projects.
// A project belongs to a logo when a distinctive word of the logo name appears in its client or title.
const generic = new Set(['studios', 'studio', 'indonesia', 'the', 'and', 'for', 'co']);
const words = text => (text || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean);

export const clientSlug = name => words(name).join('-');

export function clientMatches(project, name) {
  const keys = words(name).filter(word => word.length > 2 && !generic.has(word));
  const haystack = new Set(words(`${project.client} ${project.title}`));
  return keys.some(key => haystack.has(key));
}

// Slugs of every logo a project belongs to, for the archive cards.
export const projectClients = (project, names) => names.filter(name => clientMatches(project, name)).map(clientSlug);
