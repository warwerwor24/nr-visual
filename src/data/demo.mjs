// Preview fixtures only. Never used when a Sanity project is connected.
const categories = ['Campaign film', 'Product story', 'Event coverage', 'Fashion film', 'Brand launch', 'Online course', 'Event highlights', 'Product campaign', 'Creative film', 'Product photography', 'Editorial', 'Behind the scenes', 'Campaign photography', 'Event photography', 'Visual study'];
const subcategories = [['brand-campaign', 'short-form'], ['brand-campaign'], ['event'], ['music-creative'], ['opening-bumper'], ['education', 'long-form'], ['event', 'short-form'], ['brand-campaign'], ['music-creative'], ['product'], ['editorial'], ['behind-the-scenes'], ['product'], ['event'], ['portrait']];
const stock = [
  ['photo-1604494089111-d1b569f5ec24', 'Laura Chouette', 'https://unsplash.com/photos/n1eC1eaQVq0'],
  ['photo-1603808033192-082d6919d3e1', 'Mojtaba Fahiminia', 'https://unsplash.com/photos/t4g1gctAaKk'],
  ['photo-1470229722913-7c0e2dbbafd3', 'Yvette de Wit', 'https://unsplash.com/photos/NYrVisodQ2M'],
  ['photo-1662532577856-e8ee8b138a8b', 'Marjan Taghipour', 'https://unsplash.com/photos/1tjMpBTvFAA'],
  ['photo-1776438805326-f118ddb48b89', 'Viv Fren Israel Torda', 'https://unsplash.com/photos/nekoGSI8gLk'],
  ['photo-1635321101901-7ac6eec3d371', 'ASIA CULTURECENTER', 'https://unsplash.com/photos/57oPg_ksI4k'],
  ['photo-1665035212282-3e117d618b36', 'Danny Howe', 'https://unsplash.com/photos/W9vc6T0NLps'],
  ['photo-1516961642265-531546e84af2', 'Yoann Siloine', 'https://unsplash.com/photos/_T4w3JDm6ug'],
  ['photo-1440404653325-ab127d49abc1', 'Noom Peerapong', 'https://unsplash.com/photos/2uwFEAGUm6E'],
  ['photo-1598520106830-8c45c2035460', 'Kvalifik', 'https://unsplash.com/photos/5Q07sS54D0Q'],
];
const projects = categories.map((category, index) => ({
  _id: `sample-${index + 1}`,
  title: category,
  category,
  categories: subcategories[index],
  description: 'Layout sample only. Replace this with your own project, cover image and description before publishing.',
  kind: index < 9 ? 'video' : 'photo',
  cover: `https://images.unsplash.com/${stock[index % stock.length][0]}?auto=format&fit=crop&w=1000&q=80`,
  credit: stock[index % stock.length][1],
  source: stock[index % stock.length][2],
  alt: `${category} sample cover`,
  driveUrl: '',
  photos: [0, 1].map(offset => ({ url: `https://images.unsplash.com/${stock[(index + offset) % stock.length][0]}?auto=format&fit=crop&w=1400&q=85`, alt: 'Temporary stock image, not NR Visual work', credit: stock[(index + offset) % stock.length][1], source: stock[(index + offset) % stock.length][2] })),
  sample: true,
}));

export const demoContent = {
  demo: true,
  settings: { brandName: 'NR VISUAL', heroText: 'Make every idea matter', experienceYears: 8, aboutText: 'Eight years working across product campaigns, launches, events and diverse visual projects. I help bring your project into focus.' },
  highlights: projects.slice(0, 9),
  collage: projects,
  projects,
};
