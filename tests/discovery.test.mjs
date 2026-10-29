import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {discoveryGroups,discoveryLabel} from '../src/lib/discovery.ts';
import {eraFor} from '../src/lib/history.mjs';
import {filterPublicRecords,filterPublicBranches} from '../src/lib/publication.mjs';
const read=name=>JSON.parse(fs.readFileSync(name,'utf8'));
const policy=read('content/publication-policy.json');
const authored=new Map();
for(const file of ['curated','source-enrichments','panel-histories','education-histories','publication-histories','chart-milestone-histories'])for(const record of read(`content/${file}.json`))authored.set(record.slug,record);
const imported=JSON.parse(gunzipSync(fs.readFileSync('content/martyrs-mirror.json.gz'))).records;
const overrides={...read('content/overrides.json'),...read('content/source-metadata-corrections.json')};
const records=filterPublicRecords([...authored.values(),...imported].map(record=>{const r={...record,...overrides[record.slug]};return {...r,era:r.date?eraFor({date:r.date}):eraFor(r)};}),policy);
const branches=filterPublicBranches(read('content/branches.json'),policy,records);

test('homepage offers every published record exactly once, including source context',()=>{
  const groups=discoveryGroups(records,branches);
  const all=groups.flatMap(group=>[...group.opening,...group.more]);
  assert.equal(all.length,records.length);
  assert.equal(new Set(all.map(record=>record.slug)).size,records.length);
  assert.equal(groups[0].opening[0].slug,'christian-beginnings');
  assert.equal(groups.at(-1).id,'source-context');
  assert.ok(groups.every(group=>group.opening.length<=5));
  for(const slug of policy.excludedRecordSlugs)assert.ok(!all.some(record=>record.slug===slug));
});

test('short navigation labels retain the complete original record and dates',()=>{
  const before=JSON.stringify(records);
  const groups=discoveryGroups(records,branches);
  for(const record of groups.flatMap(group=>[...group.opening,...group.more])){
    const label=discoveryLabel(record.title);
    assert.ok(label.length<=110);
    if(record.title.length<=110)assert.equal(label,record.title);
  }
  assert.equal(JSON.stringify(records),before);
  assert.deepEqual(discoveryGroups([],branches),[]);
});
