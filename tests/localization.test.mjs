import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateLocales,localePath,translatedRecord,translate,localizeMarkup,availableTranslations} from '../src/lib/localization.mjs';
import {normalize,eraFor} from '../src/lib/history.mjs';
import {timelineMarkup,selectTimeline} from '../src/lib/timeline.ts';
const config=JSON.parse(fs.readFileSync('content/locales/config.json'));
test('only English is published and every locale route retains a stable record identity',()=>{
 assert.deepEqual(validateLocales(config).map(l=>l.id),['en']);
 assert.equal(localePath('en','people/felix-manz/','/history.truechristian.church'),'/history.truechristian.church/en/people/felix-manz/');
 assert.throws(()=>validateLocales({...config,locales:[...config.locales,...config.locales]}),/duplicate/);
 assert.throws(()=>localePath('../de',''),/Invalid/);
});
test('future translations are repository overlays, reviewed and unable to mutate structural identity',()=>{
 const source={slug:'felix-manz',title:'Felix Manz',kind:'person',paragraphs:['English source'],date:{start:1527,end:1527,label:'1527'}};
 const fallback=translatedRecord(source,{},'af');assert.equal(fallback.contentLanguage,'en');assert.equal(fallback.locale,'af');
 const localized=translatedRecord(source,{'felix-manz':{reviewed:true,title:'Felix Manz',paragraphs:['Afrikaanse teks'],dateLabel:'5 Januarie 1527'}},'af');
 assert.equal(localized.slug,source.slug);assert.equal(localized.kind,source.kind);assert.equal(localized.date.start,1527);assert.equal(localized.contentLanguage,'af');assert.equal(localized.text,'Afrikaanse teks');
 assert.throws(()=>translatedRecord(source,{'felix-manz':{slug:'wrong',reviewed:true,title:'Test',paragraphs:['Test']}},'af'),/cannot replace slug/);
 assert.throws(()=>translatedRecord(source,{'felix-manz':{title:'Test',paragraphs:['Test']}},'af'),/Incomplete reviewed/);
});
test('localized UI is escaped, interpolated, and cannot rewrite behavior or source URLs',()=>{
 const ui={'Search':'Soek','Name, place, or event':'Naam, plek of gebeurtenis','{count} results · showing {shown}':'{count} resultate · {shown} vertoon'};
 assert.equal(translate(ui,'{count} results · showing {shown}',{count:12,shown:10}),'12 resultate · 10 vertoon');
 assert.equal(localizeMarkup('<a href="/en/search/">Search</a><input placeholder="Name, place, or event">',ui),'<a href="/en/search/">Soek</a><input placeholder="Naam, plek of gebeurtenis">');
 assert.equal(localizeMarkup('<b>Search</b>',{'Search':'<script>alert(1)</script>'}),'<b>&lt;script&gt;alert(1)&lt;/script&gt;</b>');
 assert.equal(normalize('Україна Ελληνικά Afrikaans'),'украіна ελληνικα afrikaans');
});
test('dated Mennonite beginnings have the right era and timeline groups never duplicate anchors',()=>{
 const rows=JSON.parse(fs.readFileSync('content/curated.json')).map(r=>({...r,era:r.date?eraFor({date:r.date}):eraFor(r),route:r.slug+'/',people:r.people||[],traditions:r.traditions||[],places:r.places||[],aliases:r.aliases||[]}));
 const branches=JSON.parse(fs.readFileSync('content/branches.json'));
 assert.equal(rows.find(r=>r.slug==='mennonites').era,'radical-reformation');
 const ordered=selectTimeline(rows,branches,{q:'',era:'',kind:'',family:'',direction:'newest',sources:false});
 const markup=timelineMarkup(ordered,rows,branches,'/en');
 const ids=[...markup.matchAll(/id="(era-[^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});

 test('source HTML cannot mask a paragraph translation and localized HTML drives its search text',()=>{
 const original={slug:'source',title:'Original',summary:'Source',html:'<p>Original English account</p>',text:'Original English account',paragraphs:['Original English account']};
 const paragraph=translatedRecord(original,{source:{title:'Vertaling',paragraphs:['Volledige Afrikaanse weergawe'],reviewed:true}},'af');
 assert.equal(paragraph.html,undefined);assert.equal(paragraph.text,'Volledige Afrikaanse weergawe');assert.equal(paragraph.contentLanguage,'af');
 const html=translatedRecord(original,{source:{title:'Vertaling',html:'<p>Geloof &amp; getuienis.</p>',reviewed:true}},'af');
 assert.equal(html.paragraphs,undefined);assert.equal(html.text,'Geloof & getuienis.');assert.ok(!html.text.includes('Original English'));
 });

test('source prose remains unchanged while interface labels are localized',()=>{
 const source='<h2>References</h2><div class="prose"><!--history-content:start--><p>Yes.</p><p>Search</p><!--history-content:end--></div>';
 const actual=localizeMarkup(source,{'References':'Verwysings','Yes.':'Ja.','Search':'Soek'});
 assert.ok(actual.includes('<h2>Verwysings</h2>'));assert.ok(actual.includes('<p>Yes.</p><p>Search</p>'));assert.ok(!actual.includes('<p>Ja.</p>'));
});
test('page and record language links are reciprocal and exclude unpublished content',()=>{
 const locales=[{id:'en'},{id:'af'}],pages={en:{},af:{'about/':{body:'Afrikaanse geskiedenis'}}},records={en:{},af:{witness:{reviewed:true}}};
 const ids=availableTranslations(locales,undefined,'about/',records,pages).map(l=>l.id);
 assert.deepEqual(ids,['en','af']);assert.deepEqual(availableTranslations(locales,undefined,'sources/behalt/',records,pages).map(l=>l.id),['en']);
 assert.deepEqual(availableTranslations(locales,'witness','people/witness/',records,pages).map(l=>l.id),['en','af']);
 assert.deepEqual(availableTranslations(locales,'missing','people/missing/',records,pages).map(l=>l.id),['en']);
});
