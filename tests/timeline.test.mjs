import test from 'node:test';
import assert from 'node:assert/strict';
import {primaryTimeline,selectTimeline,timelineMarkup} from '../src/lib/timeline.ts';
const record=(slug,kind,year,extra={})=>({slug,title:slug,kind,route:`${kind==='story'?'stories':'traditions'}/${slug}/`,date:{start:year,end:year,label:String(year)},era:year<1500?'medieval-witness':'radical-reformation',summary:'A sourced history.',aliases:[],people:[],traditions:[],places:[],century:null,headingLevel:null,status:'Overview',...extra});
const records=[record('swiss','tradition',1525),record('amish','tradition',1693),record('witness','story',1527),record('century-guide','story',1201,{headingLevel:3,century:13})];
const branches={families:[{id:'swiss',title:'Swiss'}],nodes:[{slug:'swiss',family:'swiss',year:1525},{slug:'amish',family:'swiss',year:1693}],edges:[{from:'swiss',to:'amish',type:'division',label:'A later branch',source:'https://example.test'}]};
const filters={q:'',era:'',kind:'',family:'',direction:'newest',sources:false};

test('the default vertical timeline integrates century guides and places later histories first',()=>{
  assert.deepEqual(primaryTimeline(records).map(r=>r.slug),['swiss','amish','century-guide']);
  assert.deepEqual(selectTimeline(records,branches,filters).map(r=>r.slug),['amish','swiss','century-guide']);
  assert.equal(selectTimeline(records,branches,{...filters,direction:'oldest'})[0].slug,'century-guide');
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
