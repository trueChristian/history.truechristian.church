import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read = async file => JSON.parse(await fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
const education = await read('content/education-histories.json');
const existing = (await Promise.all(['curated', 'source-enrichments', 'panel-histories'].map(name => read(`content/${name}.json`)))).flat();
const coverage = await read('docs/source-coverage.json');
const records = new Map(education.map(record => [record.slug, record]));
const all = new Map([...existing, ...education].map(record => [record.slug, record]));
const words = record => record.paragraphs.join(' ').trim().split(/\s+/u).length;
const text = slug => records.get(slug).paragraphs.join(' ');

const chartMappings = {
  'chart-9379-102': 'wadsworth-mennonite-school',
  'chart-9379-105': 'halstead-mennonite-seminary',
  'chart-9379-107': 'mennonite-collegiate-institute-gretna',
  'chart-9379-109': 'freeman-junior-college',
  'chart-9379-111': 'witmarsum-theological-seminary',
  'chart-9379-113': 'elim-bible-school-altona',
  'chart-9379-114': 'swift-current-bible-institute',
  'chart-9379-115': 'canadian-mennonite-bible-college',
  'chart-9379-116': 'grace-bible-institute-omaha',
  'chart-9379-117': 'mennonite-biblical-seminary-chicago',
  'chart-9379-118': 'associated-mennonite-biblical-seminaries',
  'chart-9379-120': 'tabor-college-hillsboro',
  'chart-9379-121': 'steinbach-bible-institute',
  'chart-9379-122': 'mennonite-brethren-bible-college-winnipeg',
  'chart-9379-123': 'pacific-bible-institute-fresno',
  'chart-9379-124': 'mennonite-brethren-biblical-seminary',
  'chart-9379-126': 'columbia-bible-institute-merger',
  'chart-9379-128': 'steinbach-bible-institute',
  'chart-9379-144': 'hesston-college-bible-school',
  'chart-9379-147': 'goshen-biblical-seminary',
  'chart-9379-148': 'associated-mennonite-biblical-seminaries',
  'chart-9379-154': 'messiah-college-grantham',
  'chart-9379-155': 'beulah-upland-college',
  'chart-9379-160': 'bethel-college-mishawaka'
};

test('all identified education topics have distinct substantive institutional histories', () => {
  assert.equal(education.length, 22);
  assert.equal(records.size, education.length);
  assert.equal(new Set(Object.values(chartMappings)).size, education.length);
  for (const [id, slug] of Object.entries(chartMappings)) {
    assert.ok(coverage.chartMicroannotations.some(row => row.id === id), id);
    assert.ok(records.has(slug), `${id}: ${slug}`);
  }
  for (const record of education) {
    assert.equal(record.kind, 'event', `${record.slug} must not invent a tradition`);
    assert.equal(record.status, 'Overview', record.slug);
    assert.equal(record.category, 'Event', record.slug);
    assert.match(record.slug, /^[a-z0-9-]+$/u);
    assert.ok(!existing.some(other => other.slug === record.slug), `${record.slug} overwrites an existing record`);
    assert.ok(record.summary.length >= 60, record.slug);
    assert.ok(record.paragraphs.length >= 2 && record.paragraphs.length <= 4, record.slug);
    assert.ok(words(record) >= 100, `${record.slug}: ${words(record)} words`);
    assert.ok(record.aliases.length > 0, record.slug);
    assert.ok(record.references.length >= 2, record.slug);
    for (const reference of record.references) {
      assert.ok(reference.label.length > 15, record.slug);
      assert.equal(new URL(reference.url).protocol, 'https:', `${record.slug}: ${reference.url}`);
    }
    assert.ok(Number.isInteger(record.date.start) && Number.isInteger(record.date.end), record.slug);
    assert.ok(record.date.start <= record.date.end, record.slug);
    assert.ok(record.date.label && record.date.basis.length > 60, record.slug);
    for (const related of [...record.people, ...record.places, ...record.traditions]) {
      assert.ok(all.has(related), `${record.slug}: unknown ${related}`);
    }
  }
});

test('education histories distinguish chart dates from independently verified institutional dates', () => {
  assert.equal(records.get('wadsworth-mennonite-school').date.start, 1868);
  assert.match(text('wadsworth-mennonite-school'), /1869/u);
  assert.match(text('wadsworth-mennonite-school'), /1868/u);
  assert.equal(records.get('mennonite-collegiate-institute-gretna').date.start, 1888);
  assert.match(text('mennonite-collegiate-institute-gretna'), /1887/u);
  assert.match(text('mennonite-collegiate-institute-gretna'), /1889/u);
  assert.match(text('canadian-mennonite-bible-college'), /1941/u);
  assert.match(text('canadian-mennonite-bible-college'), /1947/u);
  assert.match(text('elim-bible-school-altona'), /Gretna/u);
  assert.match(text('elim-bible-school-altona'), /Altona in 1940/u);
  assert.equal(records.get('swift-current-bible-institute').date.start, 1936);
  assert.match(records.get('swift-current-bible-institute').date.basis, /unreadable/u);
  assert.match(text('steinbach-bible-institute'), /1964/u);
  assert.match(text('steinbach-bible-institute'), /1971/u);
  assert.match(text('steinbach-bible-institute'), /has not been independently established/u);
});

test('similarly named institutions and distinct seminary milestones are not conflated', () => {
  assert.match(text('grace-bible-institute-omaha'), /Omaha, Nebraska/u);
  assert.match(text('grace-bible-institute-omaha'), /Michigan/u);
  assert.match(text('grace-bible-institute-omaha'), /1943/u);
  assert.match(text('grace-bible-institute-omaha'), /1962/u);
  assert.match(text('bethel-college-mishawaka'), /Mishawaka, Indiana/u);
  assert.match(text('bethel-college-mishawaka'), /North Newton, Kansas/u);
  assert.match(text('mennonite-brethren-bible-college-winnipeg'), /Collegiate Institute/u);
  assert.match(text('columbia-bible-institute-merger'), /separate Bethel Bible Institute/u);
  assert.match(text('freeman-junior-college'), /1923/u);
  assert.match(text('messiah-college-grantham'), /Classes began the following year/u);
  assert.match(text('goshen-biblical-seminary'), /1946/u);
  assert.match(text('goshen-biblical-seminary'), /Bachelor of Divinity/u);
  for (const year of [1958, 1969, 1994, 2012]) assert.match(text('associated-mennonite-biblical-seminaries'), new RegExp(String(year), 'u'));
  assert.match(text('beulah-upland-college'), /1965/u);
});

test('educational research adds no photo embeds or unsupported lineage nodes', async () => {
  const branches = await read('content/branches.json');
  const newSlugs = new Set(education.map(record => record.slug));
  assert.ok(branches.nodes.every(node => !newSlugs.has(node.slug)));
  for (const record of education) {
    assert.ok(!record.images?.length, record.slug);
    assert.ok(!record.html, record.slug);
    assert.ok(!record.paragraphs.some(paragraph => /<img|<video|!\[/iu.test(paragraph)), record.slug);
    assert.ok(record.references.every(reference => !reference.url.includes('sources/church-history/photos/')), record.slug);
  }
});
