import { defineConfig, defineField, defineType } from 'sanity';
import { structureTool } from 'sanity/structure';
import { driveMedia, socialUrl, whatsappUrl } from './src/lib/media.mjs';
import { categories, projectLabel } from './src/lib/categories.mjs';
import { VideoCoverInput } from './sanity/VideoCoverInput';
import { GalleryCoverInput } from './sanity/GalleryCoverInput';
import { PhotoAlbumInput } from './sanity/PhotoAlbumInput';

const imageFields = [defineField({ name: 'alt', title: 'Image description (accessibility)', type: 'string', validation: rule => rule.required() })];
const project = defineType({
  name: 'project', title: 'Project', type: 'document',
  groups: [
    { name: 'info', title: 'Info project', default: true },
    { name: 'album', title: 'Album foto', hidden: ({ value }) => value?.kind !== 'photo' },
    { name: 'video', title: 'Video', hidden: ({ value }) => value?.kind === 'photo' },
    { name: 'covers', title: 'Cover' },
  ],
  fields: [
    defineField({ name: 'kind', group: 'info', title: 'Type of project', type: 'string', options: { list: [{ title: 'Video', value: 'video' }, { title: 'Photography', value: 'photo' }], layout: 'radio' }, initialValue: 'video', validation: rule => rule.required() }),
    defineField({ name: 'title', group: 'info', type: 'string', validation: rule => rule.required().max(80) }),
    ...(['video', 'photo'] as const).map(kind => defineField({ name: `${kind}Categories`, group: 'info', title: 'Sub-categories', description: 'Pick every type that fits, e.g. Brand Campaign + Short-form. The first one is shown on the card.', type: 'array', of: [{ type: 'string' }], options: { list: categories[kind], layout: 'grid' }, hidden: ({ document }) => (document?.kind || 'video') !== kind, validation: rule => rule.unique().custom((value, context) => (context.document?.kind || 'video') !== kind || value?.length ? true : 'Pick at least one sub-category.') })),
    defineField({ name: 'category', group: 'info', type: 'string', options: { list: ['Brand Campaign Video', 'Event Videography', 'Product photography', 'Event photography', 'Portrait photography', 'Editorial photography'] } }),
    defineField({ name: 'client', group: 'info', title: 'Brand / client', type: 'string', validation: rule => rule.max(100) }),
    defineField({ name: 'role', group: 'info', title: 'Your role', description: 'For example: photographer, director, editor, cinematographer or colorist.', type: 'string', validation: rule => rule.max(160) }),
    defineField({ name: 'completedAt', group: 'info', title: 'Project date', description: 'All projects are sorted newest first. Leave blank to use the creation date.', type: 'date' }),
    defineField({ name: 'description', group: 'info', type: 'text', rows: 3, validation: rule => rule.required().max(1200) }),
    defineField({ name: 'photoSourceUrl', group: 'album', title: 'Folder sumber Google Drive', description: 'Simpan link folder berisi foto pilihan. Impor dari Drive dijalankan lewat chat Codex; link ini tidak otomatis mengupload foto.', type: 'url', hidden: ({ document }) => document?.kind !== 'photo', validation: rule => rule.custom(value => !value || /^https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/[A-Za-z0-9_-]+\/?(?:[?#].*)?$/.test(value) ? true : 'Gunakan link folder https://drive.google.com/drive/folders/…') }),
    defineField({ name: 'photos', group: 'album', title: 'Album foto', description: 'Maksimal 20 foto. Upload sekaligus, geser untuk mengurutkan, lalu isi deskripsi setiap foto.', type: 'array', options: { layout: 'grid' }, components: { input: PhotoAlbumInput }, of: [{ type: 'image', options: { hotspot: true }, fields: imageFields, validation: rule => rule.assetRequired() }], hidden: ({ document }) => document?.kind !== 'photo', validation: rule => rule.max(20).custom((value, context) => context.document?.kind !== 'photo' || (Array.isArray(value) && value.length > 0) ? true : 'Tambahkan minimal satu foto.') }),
    defineField({ name: 'cover', group: 'covers', title: 'WORK cover', description: 'WORK and all-project cards use 16:9 at every screen size. Open the image editor and check the WORK (16:9) preview. Popup thumbnails also use this image.', type: 'image', options: { hotspot: { previews: [{title: 'WORK (16:9)', aspectRatio: 16 / 9}] } }, components: { input: VideoCoverInput }, fields: imageFields, validation: rule => rule.required().assetRequired() }),
    defineField({ name: 'coverRecommendations', group: 'covers', title: 'Kandidat cover tersimpan', type: 'object', hidden: true, readOnly: true, fields: [
      defineField({ name: 'version', type: 'number' }),
      defineField({ name: 'sourceUrl', type: 'url' }),
      defineField({ name: 'duration', type: 'number' }),
      defineField({ name: 'generatedAt', type: 'datetime' }),
      defineField({ name: 'frames', type: 'array', validation: rule => rule.max(6), of: [{ name: 'coverRecommendationFrame', type: 'object', fields: [
        defineField({ name: 'time', type: 'number' }),
        defineField({ name: 'image', type: 'image', options: { hotspot: true }, validation: rule => rule.assetRequired() }),
      ] }] }),
    ] }),
    defineField({ name: 'galleryCover', group: 'covers', title: 'Gallery cover', description: 'Optional separate crop for the yellow gallery (4:5). Use the WORK image, then adjust its Crop/Hotspot here. Leave empty to use the WORK cover.', type: 'image', options: { hotspot: { previews: [{title: 'Yellow gallery', aspectRatio: .8}] } }, components: { input: GalleryCoverInput }, fields: imageFields, validation: rule => rule.assetRequired() }),
    defineField({ name: 'driveUrl', group: 'video', title: 'Google Drive video link', description: 'Use an HTTPS file sharing link. Set the video to Anyone with the link / Viewer and test without signing in.', type: 'url', hidden: ({ document }) => document?.kind !== 'video', validation: rule => rule.custom((value, context) => context.document?.kind !== 'video' || driveMedia(value) ? true : 'Paste a valid https://drive.google.com/file/d/…/view link.') }),
    defineField({ name: 'videoFormat', group: 'video', title: 'Video format', description: 'Choose the actual video format; it is not detected from the Drive link. This controls the popup, while WORK covers keep a uniform grid.', type: 'string', initialValue: '16:9', options: { list: [{ title: 'Landscape (16:9)', value: '16:9' }, { title: 'Portrait (9:16)', value: '9:16' }, { title: 'Square (1:1)', value: '1:1' }, { title: 'Portrait (4:5)', value: '4:5' }] }, hidden: ({ document }) => document?.kind !== 'video' }),
  ],
  preview: { select: { title: 'title', kind: 'kind', video: 'videoCategories', photo: 'photoCategories', category: 'category', media: 'cover' }, prepare: ({ title, kind, video, photo, category, media }) => ({ title, media, subtitle: projectLabel({ kind: kind || 'video', categories: kind === 'photo' ? photo : video, category }) }) },
});
const settings = defineType({
  name: 'siteSettings', title: 'Website settings', type: 'document',
  fields: [
    defineField({ name: 'brandName', title: 'Brand name', type: 'string', initialValue: 'NR VISUAL', validation: rule => rule.required().max(18) }),
    defineField({ name: 'logo', title: 'Logo / wordmark', description: 'Use a transparent light-colored PNG or WebP for the dark background.', type: 'image', validation: rule => rule.required().assetRequired() }),
    defineField({ name: 'clientLogos', title: 'Client logos', description: 'Logos appear above the experience section. Use transparent images and enter each client name as the image description. Drag to reorder.', type: 'array', of: [{ type: 'image', fields: [...imageFields, defineField({ name: 'tone', title: 'Logo sizing', type: 'string', options: { list: [{ title: 'Standard', value: 'standard' }, { title: 'Badge (London Taxi)', value: 'badge' }, { title: 'Tile (square logo with its own background)', value: 'tile' }] } })], validation: rule => rule.assetRequired() }] }),
    defineField({ name: 'heroText', title: 'Opening sentence', type: 'text', rows: 2, initialValue: 'Make every idea matter', validation: rule => rule.required().max(160) }),
    defineField({ name: 'heroVideo', title: 'Showreel video', description: 'Fullscreen opening loop. Muted cut-to-cut compilation, MP4 or WebM, 1080p, ideally under 20 MB.', type: 'file', options: { accept: 'video/mp4,video/webm' } }),
    defineField({ name: 'heroVideoMobile', title: 'Showreel video (phone)', description: 'Optional portrait 9:16 version of the showreel for phones held upright. Muted MP4, 720×1280, ideally under 10 MB. Leave empty to use the landscape video everywhere.', type: 'file', options: { accept: 'video/mp4,video/webm' } }),
    defineField({ name: 'heroPortrait', title: 'Showreel poster', description: 'Shown while the showreel loads and for visitors who prefer reduced motion. Use a frame from the showreel.', type: 'image', fields: imageFields }),
    defineField({ name: 'contactPhoto', title: 'Contact photo', description: 'A photo of you or behind the scenes, shown beside the contact section.', type: 'image', fields: imageFields }),
    defineField({ name: 'experienceYears', title: 'Years of experience', type: 'number', initialValue: 8, validation: rule => rule.required().integer().min(1).max(80) }),
    defineField({ name: 'aboutText', title: 'About your experience', type: 'text', rows: 4, initialValue: 'Eight years working across product campaigns, launches, events and diverse visual projects. I help bring your project into focus.', validation: rule => rule.required().max(700) }),
    defineField({ name: 'whatsapp', title: 'WhatsApp number', description: 'International format, e.g. country code 62 followed by your number without its initial 0.', type: 'string', validation: rule => rule.required().custom(value => whatsappUrl(value) ? true : 'Enter a valid international number.') }),
    ...(['instagram', 'linkedin'] as const).map(name => defineField({ name, type: 'url', validation: rule => rule.required().custom(value => socialUrl(value, `${name}.com`) ? true : `Enter an https://${name}.com/ profile URL.`) })),
    defineField({ name: 'shareImage', title: 'Social sharing image', description: 'A real portfolio image, preferably 1200 × 630 pixels.', type: 'image', validation: rule => rule.required().assetRequired() }),
    defineField({ name: 'highlights', title: 'Featured videos (up to 11)', description: 'Select published video projects. Drag to reorder. The homepage shows 11 (empty slots use the newest other videos); the links page shows all. Publishing settings updates the homepage after the next successful build.', type: 'array', of: [{ type: 'reference', to: [{ type: 'project' }], options: { filter: 'kind == "video"' } }], validation: rule => rule.max(11).unique() }),
    defineField({ name: 'collage', title: 'Project collage', description: 'Select 8 projects. Drag to reorder. The same project may also appear in featured videos.', type: 'array', of: [{ type: 'reference', to: [{ type: 'project' }] }], validation: rule => rule.unique() }),
  ],
  preview: { prepare: () => ({ title: 'Website settings' }) },
});

export default defineConfig({
  name: 'nr-visual', title: 'NR Visual', basePath: '/',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || '',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool({ structure: S => S.list().title('Portfolio').items([
    S.listItem().title('Website settings').id('siteSettings').child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    S.listItem().title('Photo projects').id('photoProjects').child(S.documentList().title('Photo projects').schemaType('project').filter('_type == "project" && kind == "photo"').initialValueTemplates([S.initialValueTemplateItem('photo-project')])),
    S.listItem().title('Video projects').id('project').child(S.documentList().title('Video projects').schemaType('project').filter('_type == "project" && kind == "video"').initialValueTemplates([S.initialValueTemplateItem('project')])),
  ]) })],
  schema: { types: [project, settings], templates: templates => [...templates.filter(template => template.schemaType !== 'siteSettings'), { id: 'photo-project', title: 'Photo project', schemaType: 'project', value: { kind: 'photo' } }] },
  document: { actions: (actions, context) => context.schemaType === 'siteSettings' ? actions.filter(action => !['delete', 'duplicate', 'unpublish'].includes(action.action || '')) : actions },
});
