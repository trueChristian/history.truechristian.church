/** Build a disposable two-language fixture; no translation is published or commissioned. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=await fs.mkdtemp(path.join(root,'.history-fixture-'));
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const write=async(file,value)=>fs.writeFile(file,JSON.stringify(value));
try{
 for(const dir of ['content','src','scripts'])await fs.cp(path.join(root,dir),path.join(fixture,dir),{recursive:true});
 for(const file of ['package.json','astro.config.mjs','tsconfig.json'])await fs.copyFile(path.join(root,file),path.join(fixture,file));
 for(const dir of ['sources','vendor','node_modules'])await fs.symlink(path.join(root,dir),path.join(fixture,dir),'dir');
 const config=await read(path.join(fixture,'content/locales/config.json'));
 config.locales.push({id:'af',name:'Afrikaans',nativeName:'Afrikaans',dir:'ltr',published:true});
 await write(path.join(fixture,'content/locales/config.json'),config);
 const languageDir=path.join(fixture,'content/locales/af');await fs.mkdir(languageDir,{recursive:true});
 await write(path.join(languageDir,'ui.json'),{Search:'Soek',People:'Mense',References:'Verwysings'});
 await write(path.join(languageDir,'pages.json'),{'about/':{title:'Oor hierdie geskiedenis',body:'<h1>Oor hierdie geskiedenis</h1><p>Voorbeeld vir roetetoets.</p>',markdown:'# Oor hierdie geskiedenis\n\nVoorbeeld vir roetetoets.'}});
 await write(path.join(languageDir,'records.json'),{
  'mm-dirk-willems-a-d-1569':{reviewed:true,title:'Dirk Willems bron',summary:'Toetsvertaling van die bron.',paragraphs:['Afrikaanse brongetuienis vir die roetetoets.']},
  'dirk-willems':{reviewed:true,title:'Dirk Willems profiel',summary:'Toetsvertaling van die profiel.',html:'<p>Afrikaanse profielgetuienis &amp; liefde.</p>'}
 });
 const env={...process.env,ASTRO_TELEMETRY_DISABLED:'1',SITE_BASE_PATH:'/history-fixture',SITE_ORIGIN:'https://history.example.test',NODE_OPTIONS:'--max-old-space-size=1024'};
 execFileSync(process.execPath,['scripts/prepare.mjs'],{cwd:fixture,env,stdio:'pipe',maxBuffer:10*1024*1024});
 const pages=await read(path.join(fixture,'.history-data/pages.json'));
 const selected=pages.filter(p=>['about/','people/dirk-willems/','stories/mm-dirk-willems-a-d-1569/','stories/mm-hans-landis-a-d-1614/'].includes(p.logicalRoute));
 await write(path.join(fixture,'.history-data/pages.json'),selected);
 execFileSync(process.execPath,[path.join(root,'node_modules/astro/bin/astro.mjs'),'build','--silent'],{cwd:fixture,env,stdio:'pipe',maxBuffer:10*1024*1024});
 const html=async route=>fs.readFile(path.join(fixture,'_site',route,'index.html'),'utf8');
 for(const locale of ['en','af']){
  const about=await html(`${locale}/about`);
  assert.ok(about.includes(`lang="${locale}"`));
  assert.ok(about.includes(`href="https://history.example.test/history-fixture/${locale}/about/"`));
  for(const alternate of ['en','af'])assert.ok(about.includes(`hreflang="${alternate}"`),'Reciprocal explanatory-page language links');
 }
 const translated=await html('af/stories/mm-dirk-willems-a-d-1569');
 assert.ok(translated.includes('Afrikaanse brongetuienis vir die roetetoets.'));
 assert.ok(translated.includes('lang="af"'));
 assert.ok(!translated.includes('This article is available in English'));
 const fallback=await html('af/stories/mm-hans-landis-a-d-1614');
 assert.ok(fallback.includes('This article is available in English'));
 assert.match(fallback,/class="prose(?: reader-prose)?" lang="en"/);
 assert.ok(!fallback.includes('hreflang="af"'),'Untranslated source is not advertised as Afrikaans');
 const index=await read(path.join(fixture,'.history-public/assets/af/search-index.json'));
 assert.ok(index.find(r=>r.slug==='mm-dirk-willems-a-d-1569').normalized.includes('afrikaanse brongetuienis'));
 assert.ok(index.find(r=>r.slug==='dirk-willems').normalized.includes('afrikaanse profielgetuienis liefde'));
 assert.equal(index.find(r=>r.slug==='dirk-willems').contentId,'dirk-willems');
 console.log('PASS real two-language Astro fixture: prefixed routes, reciprocal availability, source fallback, translated HTML/paragraphs, and localized search');
}finally{await fs.rm(fixture,{recursive:true,force:true});}
