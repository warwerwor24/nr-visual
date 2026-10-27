import test from 'node:test';
import assert from 'node:assert/strict';
import { isPersonal, projectSlugs } from '../src/lib/project-url.mjs';

test('project slugs are URL-safe and unique', () => {
  const slugs = projectSlugs([
    { _id: 'a', title: 'Ardiles Basketball — Speedy Weedy x Kevinswork' },
    { _id: 'b', title: "AHA Line Series For Skin's Sake" },
    { _id: 'c', title: 'Niat Baik' },
    { _id: 'd', title: 'Niat Baik' },
    { _id: 'e', title: '—' },
  ]);
  assert.equal(slugs.get('a'), 'ardiles-basketball-speedy-weedy-x-kevinswork');
  assert.equal(slugs.get('b'), 'aha-line-series-for-skins-sake');
  assert.equal(slugs.get('c'), 'niat-baik');
  assert.equal(slugs.get('d'), 'niat-baik-2');
  assert.equal(slugs.get('e'), 'project');
});

test('personal projects are recognised by sub-category or legacy category', () => {
  assert.equal(isPersonal({ categories: ['personal', 'long-form'] }), true);
  assert.equal(isPersonal({ category: 'Personal', categories: ['long-form'] }), true);
  assert.equal(isPersonal({ category: 'Brand Campaign Video', categories: ['brand-campaign'] }), false);
});
