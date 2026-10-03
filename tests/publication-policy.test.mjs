import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {validateBranches} from '../src/lib/branches.mjs';
import {
  validatePublicationPolicy, containsWithheldReference,
  filterPublicRecords, filterPublicBranches, filterPublicCoverage,
} from '../src/lib/publication.mjs';

const readJSON = async file => JSON.parse(await fs.readFile(new URL('../' + file, import.meta.url), 'utf8'));
const policy = await readJSON('content/publication-policy.json');
const authored = new Map();
for (const filename of ['curated.json', 'source-enrichments.json', 'panel-histories.json', 'education-histories.json', 'publication-histories.json', 'chart-milestone-histories.json']) {
  for (const record of await readJSON('content/' + filename)) authored.set(record.slug, record);
}
const records = [...authored.values()];
const branches = await readJSON('content/branches.json');
const coverage = await readJSON('docs/source-coverage.json');
const publicRecords = filterPublicRecords(records, policy);

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function noHeldReference(value) {
  if (typeof value === 'string') assert.equal(containsWithheldReference(value, policy), false, value);
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      assert.equal(containsWithheldReference(key, policy), false, key);
      noHeldReference(item);
    }
  }
}

test('publication holds identify specific organizations and three existing records', () => {
  assert.equal(validatePublicationPolicy(policy), true);
  assert.deepEqual(policy.excludedRecordSlugs, ['charity-ministries', 'agape-fellowships', 'charity-1982']);
  for (const slug of policy.excludedRecordSlugs) assert.ok(authored.has(slug), slug);
  assert.throws(() => validatePublicationPolicy({...policy, schemaVersion: 2}), /Unsupported/);
  assert.throws(() => validatePublicationPolicy({...policy, excludedRecordSlugs: ['unsafe/slug']}), /unique record slugs/);
  assert.throws(() => validatePublicationPolicy({...policy, excludedRecordSlugs: ['one', 'one']}), /unique record slugs/);
  for (const word of ['charity', 'agape', 'CHARITY ']) {
    assert.throws(() => validatePublicationPolicy({...policy, organizationReferences: [word]}), /not generic words/);
  }
});

test('matching is organization-specific, case-insensitive, and recognizes public links', () => {
  for (const value of [
    'CHARITY MINISTRIES', 'Charity Christian Fellowship’s history', 'The Agape fellowships.',
    'Agape Ministries', 'a Charity–related account', 'https://charitychristianfellowship.org/church/about-us/',
    '/en/traditions/agape-fellowships/', '/events/charity-1982/', 'the local Agape account',
  ]) assert.equal(containsWithheldReference(value, policy), true, value);
  for (const value of [
    'faith, hope, and charity', 'Charity suffereth long', 'the biblical word agape means love',
    'The community should show charity and maintain fellowship.', 'agape', 'charity',
    'unrelated-charity-19820',
  ]) assert.equal(containsWithheldReference(value, policy), false, value);
});

test('authored output omits only held records and cleans the mixed Pennsylvania account', () => {
  assert.equal(publicRecords.length, records.length - 3);
  for (const slug of policy.excludedRecordSlugs) assert.equal(publicRecords.some(record => record.slug === slug), false);
  const original = authored.get('pennsylvania');
  const published = publicRecords.find(record => record.slug === 'pennsylvania');
  assert.equal(original.traditions.includes('charity-ministries'), true);
  assert.equal(published.traditions.includes('charity-ministries'), false);
  assert.ok(original.paragraphs[1].includes('Charity Christian Fellowship'));
  assert.equal(published.paragraphs[1], 'The region also appears in the River Brethren history near Marietta. The linked pages follow each development within the Anabaptist account.');
  assert.deepEqual(published.references, original.references);
  assert.equal(published.text, published.paragraphs.join('\n\n'));
  noHeldReference(publicRecords);
});

test('filtering detaches all retained objects and leaves frozen source data unchanged', () => {
  const input = freeze(structuredClone(records));
  const before = JSON.stringify(input);
  const result = filterPublicRecords(input, freeze(structuredClone(policy)));
  assert.equal(JSON.stringify(input), before);
  result[0].date.label = 'Changed public projection only';
  result[0].paragraphs.push('Public-only paragraph');
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(filterPublicRecords(publicRecords, policy), publicRecords);
});

test('record projection cleans relationships, references, aliases, and stale search text', () => {
  const shared = {
    slug: 'sample', title: 'A retained account', summary: 'A public summary',
    paragraphs: ['Historical prose with charity and agape.', 'The Agape stream is later material.'],
    html: '<p>Historical prose.</p><p>Charity Ministries is later material.</p>',
    text: 'Historical prose. Charity Ministries is later material.', textLength: 99,
    normalized: 'old normalized index with agape ministries',
    aliases: ['ordinary charity', 'Charity Gospel Tape Ministry'],
    references: [
      {label: 'Preserved source', url: 'https://example.test/history'},
      {label: 'A related page', url: '/en/traditions/agape-fellowships/'},
      {label: 'Charity Ministries', url: 'https://example.test/ministry'},
    ],
    people: ['source-person', 'agape-fellowships'],
    traditions: ['charity-ministries', 'amish'],
    places: ['pennsylvania', 'charity-1982'],
    sourceAccounts: ['charity-1982', 'source-account'],
    relatedAccounts: ['related-account', 'agape-fellowships'],
    recordSlugs: ['retained', 'charity-ministries'],
  };
  const [record] = filterPublicRecords([shared], policy);
  assert.deepEqual(record.paragraphs, ['Historical prose with charity and agape.']);
  assert.equal(record.text, record.paragraphs[0]);
  assert.equal(record.textLength, record.text.length);
  assert.equal(Object.hasOwn(record, 'html'), false);
  assert.equal(Object.hasOwn(record, 'normalized'), false);
  assert.deepEqual(record.aliases, ['ordinary charity']);
  assert.deepEqual(record.references, [shared.references[0]]);
  assert.deepEqual(record.people, ['source-person']);
  assert.deepEqual(record.traditions, ['amish']);
  assert.deepEqual(record.places, ['pennsylvania']);
  assert.deepEqual(record.sourceAccounts, ['source-account']);
  assert.deepEqual(record.relatedAccounts, ['related-account']);
  assert.deepEqual(record.recordSlugs, ['retained']);
  noHeldReference(record);
});

test('source religious words and the original Martyrs’ Mirror remain intact', async () => {
  const amish = authored.get('amish-division-1693');
  assert.deepEqual(publicRecords.find(record => record.slug === amish.slug).paragraphs, amish.paragraphs);
  assert.match(amish.paragraphs.join(' '), /show charity/);
  const imported = JSON.parse(gunzipSync(await fs.readFile(new URL('../content/martyrs-mirror.json.gz', import.meta.url))));
  const original = JSON.stringify(imported.records);
  const published = filterPublicRecords(imported.records, policy);
  assert.equal(published.length, imported.records.length);
  for (let index = 0; index < published.length; index++) {
    assert.equal(published[index].text, imported.records[index].text);
    assert.equal(published[index].html, imported.records[index].html);
  }
  assert.equal(JSON.stringify(imported.records), original);
});

test('branch publication has no held nodes, dangling edges, or empty families', () => {
  const input = freeze(structuredClone(branches));
  const result = filterPublicBranches(input, policy, publicRecords);
  assert.equal(result.nodes.length, branches.nodes.length - 2);
  assert.equal(result.edges.length, branches.edges.length - 2);
  assert.equal(validateBranches(result, publicRecords), true);
  assert.equal(result.families.some(family => family.id === 'modern'), false);
  for (const family of result.families) assert.ok(result.nodes.some(node => node.family === family.id));
  noHeldReference(result);
  assert.deepEqual(filterPublicBranches(result, policy, publicRecords), result);
});

test('source coverage keeps source inventory but excludes held audit rows', () => {
  const input = freeze(structuredClone(coverage));
  const result = filterPublicCoverage(input, policy);
  assert.equal(result.recoveredRecordAudit.length, coverage.recoveredRecordAudit.length - 3);
  for (const key of ['overviewPanels', 'branchLabels', 'chartLeaderLines', 'chartMicroannotations']) {
    assert.deepEqual(result[key], coverage[key]);
  }
  noHeldReference(result);
  assert.deepEqual(filterPublicCoverage(result, policy), result);
  assert.equal(filterPublicCoverage(null, policy), null);
});

test('coverage projection drops organization rows but retains generic words and mixed history', () => {
  const input = {
    overviewPanels: [
      {title: 'Agape Ministries', recordSlugs: ['agape-fellowships']},
      {title: 'River Brethren', recordSlugs: ['brethren-in-christ', 'charity-ministries'], notes: 'Charity Ministries appears later.', references: [{label: 'Related history', url: '/en/traditions/charity-ministries/'}]},
      {title: 'Christian charity and agape', recordSlugs: ['christian-beginnings']},
    ],
    recoveredRecordAudit: [{slug: 'charity-1982'}, {slug: 'retained'}],
    remainingNamedGaps: [{name: 'Charity Christian Fellowship', detail: 'Needs a statement'}],
    notes: ['Charity Ministries is planned.', 'Practice charity.'],
  };
  const result = filterPublicCoverage(input, policy);
  assert.deepEqual(result.overviewPanels, [
    {title: 'River Brethren', recordSlugs: ['brethren-in-christ'], references: []},
    {title: 'Christian charity and agape', recordSlugs: ['christian-beginnings']},
  ]);
  assert.deepEqual(result.recoveredRecordAudit, [{slug: 'retained'}]);
  assert.deepEqual(result.remainingNamedGaps, []);
  assert.deepEqual(result.notes, ['Practice charity.']);
  noHeldReference(result);
});


test('new records named for a held organization cannot create new public paths or links', () => {
  const held = {slug: 'new-fellowship-name', title: 'Agape Ministries', paragraphs: ['Future research']};
  const linked = {
    slug: 'existing-history', title: 'Existing history', paragraphs: ['A retained account'],
    traditions: ['new-fellowship-name'], references: [{label: 'Related history', url: '/en/traditions/new-fellowship-name/'}],
  };
  const result = filterPublicRecords([held, linked], policy);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].traditions, []);
  assert.deepEqual(result[0].references, []);
  const graph = {families: [{id: 'retained', title: 'Retained family'}], nodes: [{slug: held.slug, family: 'retained'}], edges: []};
  assert.deepEqual(filterPublicBranches(graph, policy, result), {families: [], nodes: [], edges: []});
});
