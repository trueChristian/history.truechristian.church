import test from 'node:test';
import assert from 'node:assert/strict';
import {primaryTimeline,selectTimeline,timelineMarkup,timelineEras,timelineDirection,readTimelineDirection,saveTimelineDirection,TIMELINE_DIRECTION_KEY} from '../src/lib/timeline.ts';
const record=(slug,kind,year,extra={})=>({slug,title:slug,kind,route:`${kind==='story'?'stories':'traditions'}/${slug}/`,date:{start:year,end:year,label:String(year)},era:year<1500?'medieval-witness':'radical-reformation',summary:'A sourced history.',aliases:[],people:[],traditions:[],places:[],century:null,headingLevel:null,status:'Overview',...extra});
const records=[record('swiss','tradition',1525),record('amish','tradition',1693),record('witness','story',1527),record('century-guide','story',1201,{headingLevel:3,century:13})];
const branches={families:[{id:'swiss',title:'Swiss'}],nodes:[{slug:'swiss',family:'swiss',year:1525},{slug:'amish',family:'swiss',year:1693}],edges:[{from:'swiss',to:'amish',type:'division',label:'A later branch',source:'https://example.test'}]};
const filters={q:'',era:'',kind:'',family:'',direction:'oldest',sources:false};

test('the default vertical timeline integrates century guides and starts with the oldest histories',()=>{
  assert.deepEqual(primaryTimeline(records).map(r=>r.slug),['swiss','amish','century-guide']);
  assert.deepEqual(selectTimeline(records,branches,filters).map(r=>r.slug),['century-guide','swiss','amish']);
  assert.equal(selectTimeline(records,branches,{...filters,direction:'newest'})[0].slug,'amish');
  assert.equal(selectTimeline(records,branches,{...filters,sources:true}).length,4);
});

test('timeline filters combine era, type, stream, and query without losing the source record',()=>{
  assert.deepEqual(selectTimeline(records,branches,{...filters,kind:'story',era:'radical-reformation'}).map(r=>r.slug),['witness']);
  assert.deepEqual(selectTimeline(records,branches,{...filters,family:'swiss',q:'amish'}).map(r=>r.slug),['amish']);
  assert.equal(selectTimeline(records,branches,{...filters,q:'no match'}).length,0);
});

test('timeline drill-downs stay internal and source-century navigation is correctly labelled',()=>{
  const html=timelineMarkup(records,records,branches,'/history.truechristian.church');
  assert.ok(!html.includes('href="https:'));
  assert.match(html,/href="\/history.truechristian.church\/stories\/witness\//);
  assert.match(html,/13th-century accounts/);
  assert.match(html,/century=13/);
  const escaped=timelineMarkup([record('test','tradition',1525,{title:'<script>x</script>'})],records,branches,'');
  assert.ok(!escaped.includes('<script>'));
});


test('era groups reverse with their dated entries and undated records keep honest context',()=>{
  const rows=[record('late','event',1990,{era:'living-traditions'}),record('early','event',1960,{era:'living-traditions'}),record('unknown','event',0,{era:'living-traditions',date:null}),record('medieval','event',1200),record('context','story',0,{era:'source-context',date:null}),record('same-b','event',1960,{era:'living-traditions'}),record('same-a','event',1960,{era:'living-traditions'})];
  assert.deepEqual(selectTimeline(rows,branches,{...filters,sources:true}).map(r=>r.slug),['medieval','early','same-a','same-b','late','unknown','context']);
  assert.deepEqual(selectTimeline(rows,branches,{...filters,sources:true,direction:'newest'}).map(r=>r.slug),['late','early','same-a','same-b','unknown','medieval','context']);
  assert.deepEqual(timelineEras('newest').map(e=>e.id),timelineEras().map(e=>e.id).reverse());
  assert.equal(timelineDirection('corrupt'),undefined);
  assert.equal(selectTimeline(records,branches,{...filters,direction:'corrupt'})[0].slug,'century-guide');
  assert.equal(rows.find(r=>r.slug==='unknown').date,null);
});

test('Acts opens the existing first-century accounts without changing dates or source wording',()=>{
  const rows=[record('century','story',1,{headingLevel:3,century:1,era:'acts-and-early-church'}),record('christian-beginnings','tradition',30,{era:'acts-and-early-church'}),record('apostle','story',70,{category:'Source account',century:1,era:'acts-and-early-church'}),record('later-account','story',1527,{category:'Source account',century:16})];
  assert.deepEqual(selectTimeline(rows,branches,filters).map(r=>r.slug),['christian-beginnings','century','apostle']);
  assert.equal(rows[1].date.start,30);
  assert.match(timelineMarkup(rows.slice(2,3),rows,branches,''),/Martyrs’ Mirror · source account/);
});

test('saved ordering accepts only supported values and tolerates blocked storage',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  let value='corrupt';
  try{
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>{assert.equal(key,TIMELINE_DIRECTION_KEY);return value;},setItem:(key,next)=>{assert.equal(key,TIMELINE_DIRECTION_KEY);value=next;}}});
    assert.equal(readTimelineDirection(),'oldest');saveTimelineDirection('newest');assert.equal(readTimelineDirection(),'newest');saveTimelineDirection('oldest');assert.equal(readTimelineDirection(),'oldest');
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Blocked');}});
    assert.equal(readTimelineDirection(),'oldest');assert.doesNotThrow(()=>saveTimelineDirection('newest'));
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
