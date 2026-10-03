import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const enrichment=read('content/source-enrichments.json');
const corrections=read('content/source-metadata-corrections.json');
const imported=JSON.parse(gunzipSync(fs.readFileSync(path.join(root,'content/martyrs-mirror.json.gz'))));
const source=new Map(imported.records.map(r=>[r.slug,r]));
const merged=new Map(read('content/curated.json').concat(enrichment).map(r=>[r.slug,r]));
const existingPeople=['conrad-grebel','felix-manz','george-blaurock','michael-sattler','jakob-hutter','menno-simons','dirk-willems','anna-jans','hans-landis','thieleman-van-braght','jakob-ammann','eberhard-arnold','emmy-arnold','else-von-hollander'];

test('enrichments retain identities and supply substantive referenced profiles',()=>{
 assert.equal(new Set(enrichment.map(r=>r.slug)).size,enrichment.length);
 for(const slug of existingPeople){
  const record=enrichment.find(r=>r.slug===slug);
  assert.ok(record,`Missing original profile: ${slug}`);
  assert.equal(record.kind,'person');
 }
 for(const r of enrichment){
  assert.match(r.slug,/^[a-z0-9-]+$/);
  assert.ok(r.title&&r.summary&&r.status&&r.category);
  assert.ok(r.paragraphs.length>=2&&r.paragraphs.length<=4,r.slug);
  assert.ok(r.paragraphs.every(p=>typeof p==='string'&&p.length>80),r.slug);
  assert.ok(r.references.length,r.slug);
  if(r.date){assert.ok(r.date.start<=r.date.end,r.slug);assert.ok(r.date.label&&r.date.basis,r.slug);}
  for(const key of ['people','places','traditions'])for(const slug of r[key]||[])assert.ok(merged.has(slug),`${r.slug} → ${key}:${slug}`);
 }
});

test('source links and illustration associations resolve to the exact preserved sections',()=>{
 for(const r of enrichment){
  for(const slug of r.sourceAccounts){
   assert.ok(source.has(slug),`${r.slug}: ${slug}`);
   assert.ok(r.references.some(ref=>ref.url===`stories/${slug}/`));
  }
  for(const image of r.images||[]){
   assert.ok(fs.existsSync(path.join(root,image)),image);
   const owner=r.imageSources[image];
   assert.ok(r.sourceAccounts.includes(owner),`${r.slug}: unlinked image owner`);
   assert.ok(source.get(owner).images.includes(image),`${r.slug}: wrong illustration`);
  }
 }
 assert.ok(merged.get('anna-jans').sourceAccounts.includes('mm-anna-of-rotterdam-put-to-death-in-that-place-a-d-1539'));
 assert.ok(merged.get('john-of-cordova').imageSources['sources/martyrs-mirror/images/i0487.jpg'].startsWith('mm-grievous-and-lamentable'));
 assert.ok(merged.get('orleans-witnesses-1022').imageSources['sources/martyrs-mirror/images/i0531.jpg'].startsWith('mm-further-observations'));
});

test('named witnesses and events cover every source century from Acts through the medieval period',()=>{
 const coverage=new Set(enrichment.filter(r=>['person','event'].includes(r.kind)).flatMap(r=>r.sourceAccounts.map(s=>source.get(s).century)).filter(Boolean));
 for(let century=1;century<=15;century++)assert.ok(coverage.has(century),`Missing source century ${century}`);
 assert.notEqual(merged.get('stephen-of-jerusalem').slug,merged.get('stephen-of-vienna').slug);
 assert.ok(merged.get('adrian-the-teacher').paragraphs.join(' ').includes('does not establish'));
 assert.ok(merged.get('john-of-cordova').paragraphs.join(' ').includes('could not discover'));
 assert.ok(merged.get('henry-of-toulouse').date.label.includes('apprehension'));
});

test('metadata corrections are bounded and preserve date qualifications and relationships',()=>{
 const allowed=new Set(['date','people','places','relatedAccounts']);
 for(const [slug,patch] of Object.entries(corrections)){
  assert.ok(source.has(slug),slug);
  assert.ok(Object.keys(patch).every(key=>allowed.has(key)),slug);
  if(patch.date){assert.ok(patch.date.start<=patch.date.end,slug);assert.ok(patch.date.label&&patch.date.basis,slug);}
  for(const key of ['people','places'])for(const target of patch[key]||[])assert.ok(merged.has(target),`${slug}: ${target}`);
  for(const target of patch.relatedAccounts||[])assert.ok(source.has(target),`${slug}: ${target}`);
 }
 const first=prefix=>Object.entries(corrections).find(([s])=>s.startsWith(prefix))[1];
 assert.deepEqual([first('mm-peter-bruis').date.start,first('mm-peter-bruis').date.end],[1145,1147]);
 assert.deepEqual([first('mm-bruno-bishop').date.start,first('mm-bruno-bishop').date.end],[1059,1079]);
 assert.equal(first('mm-about-forty-pious-christians').date.label,'566');
 assert.equal(first('mm-the-cruelty-of-the-arian-king').date.label,'477');
 assert.equal(source.get('mm-felix-mantz-a-d-1526').date.start,1526);
 assert.equal(merged.get('felix-manz').date.start,1527);
});

test('the source archive remains complete and byte-identical to the supplied edition',()=>{
 assert.equal(imported.recordCount,1272);
 assert.equal(source.size,1272);
 assert.equal(imported.imageCount,45);
 assert.equal(fs.readdirSync(path.join(root,'sources/martyrs-mirror/images')).length,45);
 const hash=createHash('sha256').update(fs.readFileSync(path.join(root,'sources/martyrs-mirror/original.html'))).digest('hex');
 assert.equal(hash,'5c06ed230bf8ce32bedfee70b983aba1ae4cdf50893129fbac6fae3299cb2e10');
 assert.equal(hash,imported.sourceSha256);
});

test('core formation and martyr events have full narratives, chronology, and navigable relationships',()=>{
 const slugs=['community-of-goods','jakob-hutter-execution','dirk-willems-rescue','hans-landis-1614','zurich-baptisms-1525','felix-manz-execution','schleitheim-articles','martyrs-mirror-1660'];
 for(const slug of slugs){
  const r=enrichment.find(r=>r.slug===slug);
  assert.ok(r,slug);assert.equal(r.kind,'event');
  assert.ok(r.paragraphs.length>=3,slug);
  assert.ok(r.paragraphs.join(' ').split(/\s+/).length>=100,slug);
  assert.ok(r.date&&r.references.length,slug);
  assert.ok(r.people.length&&r.places.length,slug);
 }
 assert.ok(merged.get('jakob-hutter-execution').places.includes('innsbruck'));
 assert.ok(merged.get('dirk-willems-rescue').places.includes('asperen'));
 assert.ok(merged.get('martyrs-mirror-1660').places.includes('dordrecht'));
 assert.match(merged.get('dirk-willems-rescue').date.label,/sentence dated 16 May/);
 assert.match(merged.get('hans-landis-1614').date.label,/September 1614/);
});
