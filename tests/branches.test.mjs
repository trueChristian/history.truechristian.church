import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateBranches} from '../src/lib/branches.mjs';
const data=JSON.parse(await fs.readFile(new URL('../content/branches.json',import.meta.url)));
const merged=new Map();for(const file of ['curated.json','source-enrichments.json','panel-histories.json','education-histories.json','publication-histories.json','chart-milestone-histories.json'])for(const r of JSON.parse(await fs.readFile(new URL('../content/'+file,import.meta.url))))merged.set(r.slug,r);
const records=[...merged.values()].map(r=>({...r,route:`traditions/${r.slug}/`}));

test('every tradition has a usable sourced history and the branch connections form an acyclic graph',()=>{
  assert.equal(validateBranches(data,records),true);
  const traditions=records.filter(r=>r.kind==='tradition');
  assert.equal(data.nodes.length,traditions.length);
  for(const r of traditions){
    assert.ok(data.nodes.some(n=>n.slug===r.slug),r.slug);
    assert.ok(r.paragraphs.join(' ').length>300,r.slug);
    assert.ok(r.references.length,r.slug);
    assert.notEqual(r.status,'Research needed',r.slug);
  }
  assert.throws(()=>validateBranches({...data,edges:[...data.edges,{from:'agape-fellowships',to:'radical-reformation-roots',label:'Cycle',source:'https://example.test'}]},records),/Circular/);
});

