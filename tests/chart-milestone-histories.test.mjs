import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=async name=>JSON.parse(await fs.readFile(new URL(`../${name}`,import.meta.url),'utf8'));
const milestones=await read('content/chart-milestone-histories.json');
const coverage=await read('docs/source-coverage.json');
const all=new Map((await Promise.all(['curated','source-enrichments','panel-histories','education-histories','publication-histories','chart-milestone-histories'].map(name=>read(`content/${name}.json`)))).flat().map(r=>[r.slug,r]));
const text=slug=>all.get(slug).paragraphs.join(' ');
test('settlement, service and conference milestones have substantive sourced internal histories',()=>{
  assert.equal(milestones.length,14);
  assert.equal(new Set(milestones.map(r=>r.slug)).size,14);
  for(const r of milestones){
    assert.equal(r.kind,'event',r.slug);
    assert.ok(r.paragraphs.length>=3,r.slug);
    assert.ok(r.paragraphs.join(' ').split(/\s+/u).length>=100,r.slug);
    assert.ok(r.references.length>=2 && r.references.every(ref=>ref.label&&ref.url),r.slug);
    assert.ok(!r.html&&!r.images?.length,r.slug);
    for(const id of [...(r.people||[]),...(r.places||[]),...(r.traditions||[])])assert.ok(all.has(id),`${r.slug}: ${id}`);
    if(r.date)assert.ok(r.date.start<=r.date.end&&r.date.label&&r.date.basis,r.slug);
    else assert.equal(r.slug,'source-map-global-reach');
  }
});
test('source dates, ambiguous abbreviations and undated map labels retain their qualifications',()=>{
  assert.match(text('christian-funk-separation'),/1851/u);
  assert.equal(all.get('eastern-district-1847').date.start,1847);
  assert.match(text('eastern-district-1847'),/1863/u);
  assert.match(text('evangelical-united-conference-1882'),/Canadian/u);
  assert.match(text('evangelical-united-conference-1882'),/abbreviat/iu);
  assert.match(text('evangelical-united-conference-1882'),/1879/u);
  assert.match(text('evangelical-united-conference-1882'),/not its founding/u);
  assert.equal(coverage.chartMicroannotations.find(r=>r.id==='chart-9379-140').coverage,'partial-overview');
  assert.equal(all.get('source-map-global-reach').date,null);
  assert.match(text('source-map-global-reach'),/do not/iu);
  assert.match(text('lone-tree-conference-1896'),/1896/u);
});
test('the researchable detail pass leaves only three explicit bounded evidence requests',()=>{
  assert.equal(all.size,269);
  const counts={};for(const row of coverage.chartMicroannotations)counts[row.coverage]=(counts[row.coverage]||0)+1;
  assert.deepEqual(counts,coverage.counts.chartAnnotationCoverage);
  assert.deepEqual(coverage.chartMicroannotations.filter(r=>r.coverage==='scoped-gap').map(r=>r.id),['chart-9379-110','chart-9379-162','chart-9380-197']);
  assert.equal(coverage.closedMicroannotationGaps.length,48);
  for(const item of coverage.closedMicroannotationGaps){
    const row=coverage.chartMicroannotations.find(r=>r.id===item.id);
    assert.ok(row.recordSlugs.includes(item.recordSlug)&&all.has(item.recordSlug),item.id);
    assert.ok(row.research_note,item.id);
  }
  assert.equal(coverage.counts.genuineLegibilityRegions,7);
  assert.match(coverage.chartMicroannotations.find(r=>r.id==='chart-9379-086').transcription_history,/1915/u);
  assert.match(coverage.chartMicroannotations.find(r=>r.id==='chart-9376-035').transcription_history,/1549/u);
});
