import { defineConfig, defineField, defineType } from 'sanity';
import { structureTool } from 'sanity/structure';
import { driveMedia, socialUrl, whatsappUrl } from './src/lib/media.mjs';
import { VideoCoverInput } from './sanity/VideoCoverInput';
import { GalleryCoverInput } from './sanity/GalleryCoverInput';

const imageFields = [defineField({ name: 'alt', title: 'Image description (accessibility)', type: 'string', validation: rule => rule.required() })];
const project = defineType({
  name: 'project', title: 'Project', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: rule => rule.required().max(80) }),
    defineField({ name: 'category', type: 'string', options: { list: ['Brand Campaign Video', 'Event Videography', 'Offline & Online Editing', 'Color Grading & VFX', 'Product photography', 'Campaign film', 'Brand launch', 'Event coverage', 'Online course', 'Editorial', 'Creative film'] }, validation: rule => rule.required() }),
    defineField({ name: 'client', title: 'Brand / client', type: 'string', validation: rule => rule.max(100) }),
    defineField({ name: 'role', title: 'Your role', description: 'For example: director, editor, cinematographer or colorist.', type: 'string', validation: rule => rule.max(160) }),
    defineField({ name: 'completedAt', title: 'Project date', description: 'All projects are sorted newest first. Leave blank to use the creation date.', type: 'date' }),
    defineField({ name: 'description', type: 'text', rows: 3, validation: rule => rule.required().max(1200) }),
    defineField({ name: 'kind', title: 'Type of project', type: 'string', options: { list: [{ title: 'Video', value: 'video' }, { title: 'Photography', value: 'photo' }], layout: 'radio' }, initialValue: 'video', validation: rule => rule.required() }),
    defineField({ name: 'cover', title: 'WORK cover', description: 'WORK and all-project cards use 16:9 at every screen size. Open the image editor and check the WORK (16:9) preview. Popup thumbnails also use this image.', type: 'image', options: { hotspot: { previews: [{title: 'WORK (16:9)', aspectRatio: 16 / 9}] } }, components: { input: VideoCoverInput }, fields: imageFields, validation: rule => rule.required().assetRequired() }),
    defineField({ name: 'galleryCover', title: 'Gallery cover', description: 'Optional separate crop for the yellow gallery (4:5). Use the WORK image, then adjust its Crop/Hotspot here. Leave empty to use the WORK cover.', type: 'image', options: { hotspot: { previews: [{title: 'Yellow gallery', aspectRatio: .8}] } }, components: { input: GalleryCoverInput }, fields: imageFields, validation: rule => rule.assetRequired() }),
    defineField({ name: 'driveUrl', title: 'Google Drive video link', description: 'Use an HTTPS file sharing link. Set the video to Anyone with the link / Viewer and test without signing in.', type: 'url', hidden: ({ document }) => document?.kind !== 'video', validation: rule => rule.custom((value, context) => context.document?.kind !== 'video' || driveMedia(value) ? true : 'Paste a valid https://drive.google.com/file/d/…/view link.') }),
    defineField({ name: 'videoFormat', title: 'Video format', description: 'Choose the actual video format; it is not detected from the Drive link. This controls the popup, while WORK covers keep a uniform grid.', type: 'string', initialValue: '16:9', options: { list: [{ title: 'Landscape (16:9)', value: '16:9' }, { title: 'Portrait (9:16)', value: '9:16' }, { title: 'Square (1:1)', value: '1:1' }, { title: 'Portrait (4:5)', value: '4:5' }] }, hidden: ({ document }) => document?.kind !== 'video' }),
    defineField({ name: 'photos', type: 'array', of: [{ type: 'image', options: { hotspot: true }, fields: imageFields, validation: rule => rule.assetRequired() }], hidden: ({ document }) => document?.kind !== 'photo', validation: rule => rule.custom((value, context) => context.document?.kind !== 'photo' || (Array.isArray(value) && value.length > 0) ? true : 'Add at least one photo.') }),
  ],
  preview: { select: { title: 'title', subtitle: 'category', media: 'cover' } },
});
const settings = defineType({
  name: 'siteSettings', title: 'Website settings', type: 'document',
  fields: [
    defineField({ name: 'brandName', title: 'Brand name', type: 'string', initialValue: 'NR VISUAL', validation: rule => rule.required().max(18) }),
    defineField({ name: 'logo', title: 'Logo / wordmark', description: 'Use a transparent light-colored PNG or WebP for the dark background.', type: 'image', validation: rule => rule.required().assetRequired() }),
    defineField({ name: 'clientLogos', title: 'Client logos', description: 'Logos appear above the experience section. Use transparent images and enter each client name as the image description. Drag to reorder.', type: 'array', of: [{ type: 'image', fields: [...imageFields, defineField({ name: 'tone', title: 'Logo sizing', type: 'string', options: { list: [{ title: 'Standard', value: 'standard' }, { title: 'Badge (London Taxi)', value: 'badge' }] } })], validation: rule => rule.assetRequired() }] }),
    defineField({ name: 'heroText', title: 'Opening sentence', type: 'text', rows: 2, initialValue: 'Make every idea matter', validation: rule => rule.required().max(160) }),
    defineField({ name: 'heroPortrait', title: 'Fullscreen portrait', description: 'Use your own low-key portrait with the eyes near the upper center and dark space on both sides for text.', type: 'image', fields: imageFields }),
    defineField({ name: 'experienceYears', title: 'Years of experience', type: 'number', initialValue: 8, validation: rule => rule.required().integer().min(1).max(80) }),
    defineField({ name: 'aboutText', title: 'About your experience', type: 'text', rows: 4, initialValue: 'Eight years working across product campaigns, launches, events and diverse visual projects. I help bring your project into focus.', validation: rule => rule.required().max(700) }),
    defineField({ name: 'whatsapp', title: 'WhatsApp number', description: 'International format, e.g. country code 62 followed by your number without its initial 0.', type: 'string', validation: rule => rule.required().custom(value => whatsappUrl(value) ? true : 'Enter a valid international number.') }),
    ...(['instagram', 'linkedin'] as const).map(name => defineField({ name, type: 'url', validation: rule => rule.required().custom(value => socialUrl(value, `${name}.com`) ? true : `Enter an https://${name}.com/ profile URL.`) })),
    defineField({ name: 'shareImage', title: 'Social sharing image', description: 'A real portfolio image, preferably 1200 × 630 pixels.', type: 'image', validation: rule => rule.required().assetRequired() }),
    defineField({ name: 'highlights', title: 'Featured videos (up to 9)', description: 'Select published video projects. Drag to reorder. Publishing settings updates the homepage after the next successful build.', type: 'array', of: [{ type: 'reference', to: [{ type: 'project' }], options: { filter: 'kind == "video"' } }], validation: rule => rule.max(9).unique() }),
    defineField({ name: 'collage', title: 'Project collage', description: 'Select roughly 15 projects. Drag to reorder. The same project may also appear in featured videos.', type: 'array', of: [{ type: 'reference', to: [{ type: 'project' }] }], validation: rule => rule.unique() }),
  ],
  preview: { prepare: () => ({ title: 'Website settings' }) },
});

export default defineConfig({
  name: 'nr-visual', title: 'NR Visual', basePath: '/',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || '',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool({ structure: S => S.list().title('Portfolio').items([
    S.listItem().title('Website settings').id('siteSettings').child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    S.documentTypeListItem('project').title('Projects'),
  ]) })],
  schema: { types: [project, settings], templates: templates => templates.filter(template => template.schemaType !== 'siteSettings') },
  document: { actions: (actions, context) => context.schemaType === 'siteSettings' ? actions.filter(action => !['delete', 'duplicate', 'unpublish'].includes(action.action || '')) : actions },
});
