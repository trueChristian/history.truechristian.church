import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {dailySelection,contributionURL,searchRecords,normalize,eraFor} from '../src/lib/history.mjs';

test('daily stories stay stable for a date and change without repeats on the next day',()=>{
  const records=Array.from({length:60},(_,i)=>({slug:`story-${i}`,kind:'story',status:'Historical source',category:'Source account',textLength:500}));
  const one=dailySelection(records,'2026-10-03'),same=dailySelection([...records].reverse(),'2026-10-03'),two=dailySelection(records,'2026-10-04');
  assert.equal(one.length,6);assert.deepEqual(one,same);
  assert.equal(new Set(one.map(r=>r.slug)).size,6);
  assert.equal(one.filter(r=>two.some(x=>x.slug===r.slug)).length,0);
  assert.deepEqual(dailySelection([],'2026-10-03'),[]);
  assert.throws(()=>dailySelection(records,'invalid'));
});

test('daily selections exclude research requests and non-story records',()=>{
  const records=[{slug:'request',kind:'story',status:'Research needed',textLength:500},{slug:'person',kind:'person',textLength:500},{slug:'valid',kind:'story',textLength:500}];
  assert.deepEqual(dailySelection(records,'2026-10-03').map(r=>r.slug),['valid']);
});

test('search resolves accents and alternate names, and searches full text',()=>{
  const records=[{slug:'manz',title:'Felix Manz',kind:'person',aliases:['Felix Mantz'],text:'Zürich baptism'},{slug:'account',title:'The witness',kind:'story',text:'A prisoner wrote to the community in Zürich.'}];
  assert.equal(normalize('Zürich'),'zurich');
  assert.deepEqual(searchRecords(records,'Felix Mantz').map(r=>r.slug),['manz']);
  assert.equal(searchRecords(records,'zurich').length,2);
  assert.deepEqual(searchRecords(records,'prisoner').map(r=>r.slug),['account']);
  assert.deepEqual(searchRecords(records,'zurich',{kind:'person'}).map(r=>r.slug),['manz']);
});

test('date filtering includes overlapping century ranges and excludes undated records',()=>{
  const records=[{slug:'century',title:'Letter',date:{start:1501,end:1600}},{slug:'later',title:'Later',date:{start:1700,end:1700}},{slug:'undated',title:'Undated'}];
  assert.deepEqual(searchRecords(records,'',{from:1525,to:1550}).map(r=>r.slug),['century']);
});

test('contribution issues carry the complete page context without publishing an issue',()=>{
  const link=new URL(contributionURL({title:'Agape & fellowships',slug:'agape-fellowships',status:'Research needed',date:{label:'c. 2010'}},'https://example.org/traditions/agape-fellowships/'));
  assert.equal(link.origin,'https://github.com');
  assert.equal(link.pathname,'/trueChristian/history.truechristian.church/issues/new');
  assert.equal(link.searchParams.get('title'),'Add history: Agape & fellowships');
  assert.match(link.searchParams.get('body'),/https:\/\/example.org\/traditions\/agape-fellowships\//);
  assert.match(link.searchParams.get('body'),/Record: agape-fellowships/);
  assert.match(link.searchParams.get('body'),/Sources and evidence/);
});

test('import retains the supplied section count, images, source date discrepancy, and century context',async()=>{
  const imported=JSON.parse(gunzipSync(await fs.readFile(new URL('../content/martyrs-mirror.json.gz',import.meta.url))));
  assert.equal(imported.recordCount,1272);assert.equal(imported.imageCount,45);
  assert.equal(new Set(imported.records.map(r=>r.slug)).size,1272);
  const dirk=imported.records.find(r=>r.slug==='mm-dirk-willems-a-d-1569');
  assert.equal(dirk.date.start,1569);assert.match(dirk.text,/Asperen/);
  assert.ok(dirk.images.includes('sources/martyrs-mirror/images/i1437.jpg'));
  assert.equal(imported.records.find(r=>r.slug==='mm-felix-mantz-a-d-1526').date.start,1526);
  const twelfth=imported.records.find(r=>r.chapter==='AN ACCOUNT OF THE HOLY BAPTISM IN THE TWELFTH CENTURY.');
  assert.equal(twelfth.century,12);
  assert.equal(eraFor({date:{start:1525,end:1525}}),'radical-reformation');
});
