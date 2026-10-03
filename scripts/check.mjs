/** Verify every generated page, local link, README equivalent, and shared-theme asset. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'_site');
const info=JSON.parse(await fs.readFile(path.join(OUT,'build-info.json'),'utf8'));
async function walk(dir){const files=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);files.push(...(e.isDirectory()?await walk(p):[p]));}return files;}
const files=await walk(OUT),existing=new Set(files.map(f=>path.relative(OUT,f).split(path.sep).join('/'))),errors=[];
const allHtmlFiles=files.filter(f=>f.endsWith('.html')&&!f.endsWith('/sources/martyrs-mirror/original.html'));
const htmlFiles=[];for(const f of allHtmlFiles)if(!(await fs.readFile(f,'utf8')).includes('data-legacy-redirect'))htmlFiles.push(f);
for(const filename of htmlFiles){
  const html=await fs.readFile(filename,'utf8'),relative=path.relative(OUT,filename).split(path.sep).join('/');
  const renderedBase=html.match(/data-base(?:="([^"]*)")?/);
  if(!renderedBase || (renderedBase[1]||'')!==info.base)errors.push(`${relative}: inconsistent deployment base path`);
  for(const marker of ['data-tcc-global-header','data-tcc-directory-footer','data-tcc-copyright-footer','Read this page as Markdown'])if(!html.includes(marker))errors.push(`${relative}: missing ${marker}`);
  if(relative!=='404.html' && !existing.has(relative.replace(/index\.html$/,'README.md')))errors.push(`${relative}: missing README equivalent`);
  if(html.includes('__BASE__'))errors.push(`${relative}: unresolved base token`);
  for(const [,href] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const link=href.replaceAll('&amp;','&');
    if(/^(https?:|mailto:|data:)/.test(link))continue;
    const resolved=new URL(link,'https://preview.test'+info.base+'/'+relative);
    let pathname=decodeURIComponent(resolved.pathname);
    if(info.base){
      if(!pathname.startsWith(info.base+'/')){errors.push(`${relative}: wrong base path ${pathname}`);continue;}
      pathname=pathname.slice(info.base.length);
    }
    const local=pathname.replace(/^\//,'');
    const indexFile=local?local.replace(/\/$/,'')+'/index.html':'index.html';
    if(!existing.has(local) && !existing.has(indexFile))errors.push(`${relative}: broken link ${link}`);
  }
}
for(const asset of ['brand/logo.jpg','favicons/favicon.ico','footer/city-skyline-skyscrapers-top.jpg']){
  const digest=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(digest(await fs.readFile(path.join(OUT,'assets',asset))),digest(await fs.readFile(path.join(ROOT,'vendor/theme/assets',asset))),`Theme asset changed: ${asset}`);
}
assert.equal(info.publishedExhibitMedia,0);
assert.ok(!files.some(f=>/\/sources\/(church-history|behalt)\/.*\.(jpg|mp4|heic)$/i.test(f)),'Exhibit research media must not be published');
for(const filename of htmlFiles){
  const html=await fs.readFile(filename,'utf8');
  assert.ok(!/<(?:img|video|source)\b[^>]*(?:church-history|behalt)/i.test(html),`Exhibit media embedded in ${filename}`);
}
const timeline=await fs.readFile(path.join(OUT,info.defaultLocale,'timeline/index.html'),'utf8');
assert.ok(timeline.includes('timeline-threads')&&timeline.includes('timeline-entries'));
assert.ok(!timeline.includes('era-scroll'),'Superseded dotted era strip remains');
const catalog=JSON.parse(await fs.readFile(path.join(OUT,'assets',info.defaultLocale,'catalog.json'),'utf8'));
assert.equal(catalog.filter(r=>r.kind==='story').length,1272);
assert.equal(info.pages,htmlFiles.length-1);
assert.ok(existing.has('index.html'),'Default-language redirect must exist');
assert.ok(!existing.has('af/index.html')&&!existing.has('de/index.html'),'Unpublished languages must not be advertised');
const eraIds=[...timeline.matchAll(/id="(era-[^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(eraIds).size,eraIds.length,'Timeline era anchors must be unique');
for(const locale of info.locales){
 const home=await fs.readFile(path.join(OUT,locale,'index.html'),'utf8');
 assert.ok(home.includes(`lang="${locale}"`));
 assert.ok(home.includes(`/${locale}/timeline/`),'Localized navigation');
 assert.ok(home.includes('hreflang="en"'),'English is always available');
 const markdown=await fs.readFile(path.join(OUT,locale,'README.md'),'utf8');
 assert.ok(markdown.includes('Today’s six accounts')&&markdown.includes('The connected timeline'),'Home Markdown must contain its main readable content');
}

if(errors.length){console.error(errors.slice(0,30).join('\n'));throw new Error(`${errors.length} site validation errors`);}
console.log(`Validated ${info.pages} Astro pages, local links, Markdown equivalents, theme assets, vertical timeline, and exclusion of exhibit media.`);
