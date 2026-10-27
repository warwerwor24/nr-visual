import { clientSlug } from './clients.mjs';

// Each project gets a shareable /projects/<slug>/ page. Duplicate titles get -2, -3 in archive order.
// shortcut: the slug follows the title, so renaming a project changes its link; add a slug field if shared links must survive renames.
export function projectSlugs(projects) {
  const slugs = new Map();
  const used = new Set();
  for (const project of projects) {
    const base = clientSlug(project.title) || 'project';
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    slugs.set(project._id, slug);
  }
  return slugs;
}

// Personal and education pieces go last so client work leads the archive.
export const isPersonal = project => project.categories?.includes('personal') || project.category === 'Personal';
