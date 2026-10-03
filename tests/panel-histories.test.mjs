import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';

const read = async file => JSON.parse(await fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
const base = await read('content/curated.json');
const source = await read('content/source-enrichments.json');
const panels = await read('content/panel-histories.json');
const coverage = await read('docs/source-coverage.json');
const imported = JSON.parse(gunzipSync(await fs.readFile(new URL('../content/martyrs-mirror.json.gz', import.meta.url)))).records;
const all = new Map([...imported, ...base, ...source, ...panels].map(record => [record.slug, record]));
const words = record => record.paragraphs.join(' ').trim().split(/\s+/u).length;

test('panel narratives contain substantive sourced text and no research-photo embeds', () => {
  assert.ok(panels.length >= 79);
  assert.equal(new Set(panels.map(record => record.slug)).size, panels.length);
  for (const record of panels) {
    assert.match(record.slug, /^[a-z0-9-]+$/u);
    assert.ok(record.paragraphs.length >= 2, record.slug);
    assert.ok(words(record) >= 80, `${record.slug}: ${words(record)} words`);
    assert.ok(record.references.length, record.slug);
    assert.ok(record.references.every(reference => reference.label && reference.url), record.slug);
    assert.ok(!record.images?.length, `Research image embedded by ${record.slug}`);
    assert.ok(!record.html, `Unexpected markup in ${record.slug}`);
    assert.ok(!record.paragraphs.some(paragraph => /<img|<video|!\[/iu.test(paragraph)), record.slug);
    for (const slug of [...(record.people || []), ...(record.places || []), ...(record.traditions || []), ...(record.relatedAccounts || []), ...(record.sourceAccounts || [])]) {
      assert.ok(all.has(slug), `${record.slug} links unknown ${slug}`);
    }
  }
});

test('panel additions do not overwrite the separately researched original people', () => {
  const originalPeople = new Set(base.filter(record => record.kind === 'person').map(record => record.slug));
  assert.equal(panels.filter(record => originalPeople.has(record.slug)).length, 0);
  assert.equal(panels.filter(record => source.some(other => other.slug === record.slug)).length, 0);
});

test('every lettered exhibit caption has an explicit narrative or scoped-context disposition', () => {
  const expected = {9360: 13, 9361: 11, 9362: 11, 9363: 15, 9364: 19, 9365: 15, 9366: 14, 9367: 11};
  const rows = new Map(coverage.overviewPanels.map(row => [row.id, row]));
  assert.equal(rows.size, 110);
  for (const [photo, count] of Object.entries(expected)) {
    for (let index = 0; index < count; index += 1) {
      const id = `${photo}-${String.fromCharCode(65 + index)}`;
      const row = rows.get(id);
      assert.ok(row, id);
      assert.equal(row.photo, `sources/church-history/photos/IMG_${photo}.jpg`);
      assert.ok(row.title && row.scope && row.coverage, id);
      if (row.coverage === 'context-only') assert.ok(row.scope_note, id);
      else assert.ok(row.recordSlugs.length, `${id} has no internal history`);
      for (const slug of row.recordSlugs) assert.ok(all.has(slug), `${id}: ${slug}`);
    }
  }
  assert.equal(coverage.overviewPanels.filter(row => row.coverage === 'context-only').length, 10);
  assert.match(rows.get('9367-statistics').notes, /2012/u);
});

test('all prominent branches and leader names are retained and mapped or explicitly scoped', () => {
  assert.equal(coverage.branchLabels.length, 60);
  assert.equal(coverage.chartLeaderLines.length, 12);
  for (const row of [...coverage.branchLabels, ...coverage.chartLeaderLines]) {
    assert.ok(row.recordSlugs.length || row.coverage === 'scoped-gap', row.label || row.name_as_printed);
    for (const slug of row.recordSlugs) assert.ok(all.has(slug), slug);
  }
});

test('small chart annotations preserve uncertainty instead of creating invented facts', () => {
  assert.equal(coverage.chartMicroannotations.length, coverage.counts.chartMicroannotations);
  assert.ok(coverage.chartMicroannotations.length >= 201);
  assert.equal(coverage.unresolvedChartRegions.length, coverage.counts.chartUnresolvedRegions);
  assert.equal(coverage.chartMicroannotations.filter(row => row.uncertainty_flags.length).length, coverage.counts.chartUncertainEntries);
  for (const row of coverage.chartMicroannotations) {
    assert.ok(row.legible_text && row.location && row.coverage && row.scope_note, row.id);
    assert.ok(row.legibility && row.ingestion, row.id);
    for (const slug of row.recordSlugs) assert.ok(all.has(slug), `${row.id}: ${slug}`);
    if (row.tentative_visual_date_readings?.length) assert.ok(row.uncertainty_flags.length, row.id);
  }
});

test('inherited event stubs in the later-panel scope now have complete internal narratives', () => {
  for (const slug of ['amish-division-1693', 'schwarzenau-1708', 'germantown-1683', 'chortitza-1789', 'kleine-gemeinde-1812', 'holdeman-1859', 'mennonite-brethren-1860', 'hutterite-migration-1874', 'old-order-divisions', 'bruderhof-1920', 'mwc-1925', 'mcc-1920', 'beachy-1927', 'rudnerweider-1937', 'emmc-1959', 'emc-1960', 'missionary-union-1969', 'charity-1982', 'mcusa-2002']) {
    assert.ok(all.get(slug).paragraphs.length >= 2, slug);
    assert.ok(words(all.get(slug)) >= 80, slug);
  }
});

test('source conflicts remain visible and no missing death date is invented', () => {
  const krefeld = all.get('krefeld-mennonite-refuge');
  assert.match(krefeld.paragraphs.join(' '), /Friedrich II/u);
  assert.match(krefeld.paragraphs.join(' '), /Friedrich Wilhelm II/u);
  assert.match(all.get('ephrata-martyrs-mirror').paragraphs.join(' '), /1748/u);
  assert.match(all.get('ephrata-martyrs-mirror').paragraphs.join(' '), /1776/u);
  const gerber = all.get('daniel-gerber-and-ruth-wilting');
  assert.match(gerber.paragraphs.join(' '), /May 1962/u);
  assert.match(gerber.paragraphs.join(' '), /May 30/u);
  assert.match(gerber.paragraphs.join(' '), /May 31/u);
});


test('adjacent chart movements have contextual histories with primary-account links', () => {
  for (const slug of ['jorists-and-david-joris', 'batenburgers-and-the-sword', 'st-gallen-early-anabaptists']) {
    const record = all.get(slug);
    assert.equal(record.kind, 'event');
    assert.ok(record.paragraphs.length >= 3);
    assert.ok(record.sourceAccounts.length);
    assert.ok(record.sourceAccounts.every(id => all.has(id)));
  }
  assert.equal(coverage.branchLabels.find(row => row.label === 'Jorists').coverage, 'source-linked-narrative');
  assert.equal(coverage.branchLabels.find(row => row.label === 'Batenburgers').coverage, 'source-linked-narrative');
  assert.equal(coverage.branchLabels.find(row => row.label === 'St. Gallen').coverage, 'source-linked-narrative');
});
