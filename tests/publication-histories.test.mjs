import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';

const read = async file => JSON.parse(await fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
const publications = await read('content/publication-histories.json');
const existing = (await Promise.all(['curated', 'source-enrichments', 'panel-histories'].map(name => read(`content/${name}.json`)))).flat();
const imported = JSON.parse(gunzipSync(await fs.readFile(new URL('../content/martyrs-mirror.json.gz', import.meta.url)))).records;
const all = new Map([...imported, ...existing, ...publications].map(record => [record.slug, record]));
const bySlug = new Map(publications.map(record => [record.slug, record]));
const text = slug => bySlug.get(slug).paragraphs.join(' ');

const chartMappings = {
  'chart-9378-082': 'mennonitische-blaetter-1854',
  'chart-9379-086': 'friesen-russian-mennonite-history-1911',
  'chart-9379-100': 'religioeser-botschafter-1852',
  'chart-9379-136': 'herald-of-truth-1864-1908',
  'chart-9379-146': 'mennonite-quarterly-review-1927',
  'chart-9379-153': 'evangelical-visitor-1887',
  'chart-9379-166': 'der-zionspilger-1882',
  'chart-9376-035': 'maria-ursula-van-beckum-1544',
  'chart-9377-041': 'amsterdam-boat-worship-1569'
};

test('publication and illustration histories are substantive additions with valid relationships', () => {
  assert.equal(publications.length, 9);
  assert.equal(bySlug.size, publications.length);
  for (const record of publications) {
    assert.equal(record.kind, 'event', record.slug);
    assert.match(record.slug, /^[a-z0-9-]+$/u);
    assert.ok(!existing.some(other => other.slug === record.slug), `Overwrites existing ${record.slug}`);
    assert.ok(!imported.some(other => other.slug === record.slug), `Overwrites source ${record.slug}`);
    assert.ok(record.paragraphs.length >= 2 && record.paragraphs.length <= 4, record.slug);
    assert.ok(record.paragraphs.join(' ').trim().split(/\s+/u).length >= 100, record.slug);
    assert.ok(record.date.start <= record.date.end && record.date.label && record.date.basis, record.slug);
    assert.ok(record.references.length >= 2 && record.references.every(reference => reference.label && reference.url), record.slug);
    assert.ok(!record.images?.length && !record.html, `Research photo or source markup embedded in ${record.slug}`);
    assert.ok(!record.paragraphs.some(paragraph => /<img|<video|!\[/iu.test(paragraph)), record.slug);
    for (const id of [...record.people, ...record.places, ...record.traditions, ...(record.sourceAccounts || [])]) {
      assert.ok(all.has(id), `${record.slug}: unknown relationship ${id}`);
    }
  }
});

test('each targeted chart annotation has its own history and the correct photograph reference', async () => {
  const coverage = await read('docs/source-coverage.json');
  for (const [chartId, slug] of Object.entries(chartMappings)) {
    const row = coverage.chartMicroannotations.find(item => item.id === chartId);
    assert.ok(row, chartId);
    assert.ok(bySlug.has(slug), `${chartId}: ${slug}`);
    assert.ok(bySlug.get(slug).references.some(reference => reference.url === row.source_photo), chartId);
  }
});

test('independently established publication dates do not promote uncertain chart readings', () => {
  const friesen = bySlug.get('friesen-russian-mennonite-history-1911');
  assert.equal(friesen.date.start, 1911);
  assert.equal(friesen.date.end, 1911);
  assert.match(text(friesen.slug), /1915.*source-reading discrepancy/u);
  assert.match(text(friesen.slug), /1978/u);
  const zionspilger = bySlug.get('der-zionspilger-1882');
  assert.equal(zionspilger.date.start, 1882);
  assert.match(zionspilger.date.basis, /tentative 1862/u);
  assert.match(text(zionspilger.slug), /twice monthly/u);
  assert.match(text(zionspilger.slug), /Later issues were published weekly/u);
  assert.match(text('mennonite-quarterly-review-1927'), /1926/u);
  assert.equal(bySlug.get('mennonite-quarterly-review-1927').date.start, 1927);
});

test('the newspaper histories distinguish predecessors and language editions', () => {
  assert.match(text('religioeser-botschafter-1852'), /Religiöser Botschafter/u);
  assert.match(text('religioeser-botschafter-1852'), /Der Evangelische Botschafter in 1836/u);
  assert.match(text('religioeser-botschafter-1852'), /first successful Mennonite journal/u);
  assert.equal(bySlug.get('herald-of-truth-1864-1908').date.end, 1908);
  assert.match(text('herald-of-truth-1864-1908'), /German companion has a different publication history/u);
  assert.deepEqual(bySlug.get('herald-of-truth-1864-1908').people, ['john-fretz-funk']);
});

test('illustration histories identify exact preserved accounts without inventing source images', () => {
  const ursula = bySlug.get('maria-ursula-van-beckum-1544');
  assert.equal(ursula.date.start, 1544);
  assert.deepEqual(ursula.sourceAccounts, ['mm-maria-van-beckum-and-ursula-her-brothers-wife-a-d-1544']);
  assert.match(text(ursula.slug), /Deventer.*Delden/u);
  assert.match(text(ursula.slug), /earlier inventory had read the small date as 1549/u);
  const boat = bySlug.get('amsterdam-boat-worship-1569');
  assert.match(boat.date.label, /c\. 1569/u);
  assert.match(boat.date.basis, /meetings themselves have no exact date/u);
  assert.equal(boat.sourceAccounts.length, 2);
  for (const id of [...ursula.sourceAccounts, ...boat.sourceAccounts]) {
    assert.equal(all.get(id).source, 'martyrs-mirror', id);
    assert.equal(all.get(id).images.length, 0, 'Do not invent an engraving absent from this preserved edition');
  }
  assert.match(all.get(boat.sourceAccounts[1]).text, /26th of February, A\. D\. 1569/u);
});
