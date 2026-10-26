// Fills videoCategories / photoCategories from scripts/subcategory-mapping.json.
// Dry run:  npx sanity exec scripts/migrate-subcategories.mjs --with-user-token
// Apply:    npx sanity exec scripts/migrate-subcategories.mjs --with-user-token -- --apply
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { getCliClient } from 'sanity/cli';
import { categories } from '../src/lib/categories.mjs';

const client = getCliClient({ apiVersion: '2025-02-19' });
if (client.config().projectId !== 'n4rtv48x' || client.config().dataset !== 'production') {
  throw new Error('Run the migration only for NR Visual project n4rtv48x / production.');
}
const apply = process.argv.includes('--apply');

// Reviewed title -> sub-categories list. Projects missing from it are left untouched.
const mapping = JSON.parse(await readFile(new URL('./subcategory-mapping.json', import.meta.url), 'utf8'));

function suggest(doc) {
  const allowed = new Set(categories[doc.kind || 'video'].map(item => item.value));
  const values = mapping[doc.title] || [];
  const unknown = values.filter(value => !allowed.has(value));
  if (unknown.length) throw new Error(`Unknown sub-category for ${doc.title}: ${unknown.join(', ')}`);
  return values;
}

const docs = await client.fetch('*[_type == "project"]{_id,title,kind,category,videoCategories,photoCategories} | order(title asc)', {}, { perspective: 'raw' });
const rows = docs.map(doc => {
  const field = `${doc.kind || 'video'}Categories`;
  return { doc, field, existing: doc[field] || [], next: suggest(doc) };
});
const todo = rows.filter(row => !row.existing.length && row.next.length);
const manual = rows.filter(row => !row.existing.length && !row.next.length);

const line = row => `| ${row.doc.title} | ${row.doc.kind || 'video'} | ${row.doc.category || '—'} | ${row.next.join(', ') || '**skipped**'} | ${row.doc._id.startsWith('drafts.') ? 'draft' : 'published'} |`;
const report = [
  `# Sub-category migration (${apply ? 'applied' : 'dry run'})`, '',
  `${todo.length} to fill, ${manual.length} not in the mapping (skipped), ${rows.length - todo.length - manual.length} already done.`, '',
  '| Title | Type | Old category | New sub-categories | Status |', '|---|---|---|---|---|',
  ...[...todo, ...manual].map(line),
].join('\n');
await mkdir('work', { recursive: true });
await writeFile('work/subcategory-migration-report.md', `${report}\n`);
console.log(report);

if (apply && todo.length) {
  const transaction = client.transaction();
  // setIfMissing never overwrites a pick made in the Studio.
  for (const row of todo) transaction.patch(row.doc._id, patch => patch.setIfMissing({ [row.field]: row.next }));
  await transaction.commit({ visibility: 'async' });
  console.log(`Applied to ${todo.length} documents.`);
}
