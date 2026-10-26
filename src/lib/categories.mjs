// Shared by the Studio schema and the site. Values are stored in Sanity, so rename titles freely but keep values.
export const categories = {
  video: [
    { title: 'Brand Campaign', value: 'brand-campaign' },
    { title: 'Short-form', value: 'short-form' },
    { title: 'Long-form', value: 'long-form' },
    { title: 'Event', value: 'event' },
    { title: 'Company Profile', value: 'company-profile' },
    { title: 'Education', value: 'education' },
    { title: 'Music & Creative', value: 'music-creative' },
    { title: 'Opening & Bumper', value: 'opening-bumper' },
    { title: 'Motion Graphics', value: 'motion-graphics' },
  ],
  photo: [
    { title: 'Product', value: 'product' },
    { title: 'Event', value: 'event' },
    { title: 'Concert & Music', value: 'concert-music' },
    { title: 'Behind the Scenes', value: 'behind-the-scenes' },
    { title: 'Portrait', value: 'portrait' },
    { title: 'Editorial', value: 'editorial' },
  ],
};

export const categoryTitle = (kind, value) => categories[kind]?.find(item => item.value === value)?.title;

// Card label: first sub-category, falling back to the legacy free category until every project is migrated.
export const projectLabel = project => categoryTitle(project.kind, project.categories?.[0]) || project.category || '';
