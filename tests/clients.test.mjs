import test from 'node:test';
import assert from 'node:assert/strict';
import { clientMatches, clientSlug, projectClients } from '../src/lib/clients.mjs';

test('client logos match projects by a distinctive word of the logo name', () => {
  assert.equal(clientMatches({ client: 'Bayu Skak', title: 'Bayu Skak x LinkAja' }, 'SKAK Studios'), true);
  assert.equal(clientMatches({ client: "For Skin's Sake x Rekket", title: 'Padel Event' }, "For Skin's Sake"), true);
  assert.equal(clientMatches({ client: '', title: '50th Yanmar Diesel Indonesia' }, 'Yanmar'), true);
  assert.equal(clientMatches({ client: 'Buttered', title: 'Soap Bar Buttered' }, 'Telkomsel'), false);
  assert.equal(clientMatches({ client: 'Studio X', title: 'Indonesia Tour' }, 'SKAK Studios'), false);
});

test('client slugs are URL-safe and stable', () => {
  assert.equal(clientSlug("For Skin's Sake"), 'for-skins-sake');
  assert.deepEqual(projectClients({ client: 'Euromedica', title: 'Euroskinlab' }, ['Euromedica', 'BBYU']), ['euromedica']);
});
