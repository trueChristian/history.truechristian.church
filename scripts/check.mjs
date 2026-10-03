/** Verify every generated page, local link, README equivalent, and shared-theme asset. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {containsWithheldReference} from '../src/lib/publication.mjs';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'_site');
const publicationPolicy=JSON.parse(await fs.readFile(path.join(ROOT,'content/publication-policy.json'),'utf8'));
const info=JSON.parse(await fs.readFile(path.join(OUT,'build-info.json'),'utf8'));
async function walk(dir){const files=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);files.push(...(e.isDirectory()?await walk(p):[p]));}return files;}
const files=await walk(OUT),existing=new Set(files.map(f=>path.relative(OUT,f).split(path.sep).join('/'))),errors=[];
const allHtmlFiles=files.filter(f=>f.endsWith('.html')&&!f.endsWith('/sources/martyrs-mirror/original.html'));
for(const filename of files.filter(f=>/\.(?:html|md|json|xml)$/.test(f)&&!f.endsWith('/sources/martyrs-mirror/original.html'))){
 const text=await fs.readFile(filename,'utf8');
 assert.ok(!containsWithheldReference(text,publicationPolicy),`Withheld organization reference in ${path.relative(OUT,filename)}`);
}
for(const slug of publicationPolicy.excludedRecordSlugs)assert.ok(!files.some(f=>f.split(path.sep).includes(slug)),`Withheld route ${slug}`);
const htmlFiles=[];for(const f of allHtmlFiles)if(!(await fs.readFile(f,'utf8')).includes('data-legacy-redirect'))htmlFiles.push(f);
const anchors=new Map(),assetHashes=new Map();
async function assetHash(relative){if(!assetHashes.has(relative))assetHashes.set(relative,createHash('sha256').update(await fs.readFile(path.join(OUT,relative))).digest('hex').slice(0,16));return assetHashes.get(relative);}
async function hasAnchor(relative,hash){
 if(!anchors.has(relative)){const text=await fs.readFile(path.join(OUT,relative),'utf8');anchors.set(relative,new Set([...text.matchAll(/\b(?:id|name)="([^"]+)"/g)].map(m=>m[1])));}
 return anchors.get(relative).has(decodeURIComponent(hash.slice(1)));
}
for(const filename of htmlFiles){
  const html=await fs.readFile(filename,'utf8'),relative=path.relative(OUT,filename).split(path.sep).join('/');
  const renderedBase=html.match(/data-base(?:="([^"]*)")?/);
  if(!renderedBase || (renderedBase[1]||'')!==info.base)errors.push(`${relative}: inconsistent deployment base path`);
  for(const marker of ['data-tcc-global-header','data-tcc-directory-footer','data-tcc-copyright-footer','Read this page as Markdown'])if(!html.includes(marker))errors.push(`${relative}: missing ${marker}`);
  if(relative!=='404.html' && !existing.has(relative.replace(/index\.html$/,'README.md')))errors.push(`${relative}: missing README equivalent`);
  if(!html.includes('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500')||!html.includes('family=Raleway:wght@400'))errors.push(`${relative}: missing shared-theme font stylesheet`);
  if(!html.includes(`https://github.com/trueChristian/history.truechristian.church/edit/${info.sourceRef}/`))errors.push(`${relative}: edit link is not on the source branch`);
  if(/(?:src|href)="[^"]*\/assets\/(?:app\.mjs|site\.css)"/.test(html))errors.push(`${relative}: unversioned application asset`);
  for(const [,dataURL] of html.matchAll(/data-(?:catalog-url|index-url|branches-url|reader-anchor-map)="([^"]+)"/g)){
    const match=dataURL.match(/\.([a-f0-9]{16})\.json$/);if(!match){errors.push(`${relative}: unversioned data URL ${dataURL}`);continue;}
    const local=dataURL.slice(info.base.length).replace(/^\//,'');
    if(await assetHash(local)!==match[1])errors.push(`${relative}: data content/hash mismatch ${dataURL}`);
  }
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
    else if(resolved.hash){const target=existing.has(local)?local:indexFile;if(target.endsWith('.html')&&!await hasAnchor(target,resolved.hash))errors.push(`${relative}: missing anchor ${link}`);}
  }
}
for(const asset of ['brand/logo.jpg','favicons/favicon.ico','footer/city-skyline-skyscrapers-top.jpg']){
  const digest=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(digest(await fs.readFile(path.join(OUT,'assets',asset))),digest(await fs.readFile(path.join(ROOT,'vendor/theme/assets',asset))),`Theme asset changed: ${asset}`);
}
assert.equal(info.publishedExhibitMedia,0);
assert.ok(!files.some(f=>/\/sources\/(church-history|behalt)\/.*\.(?:jpe?g|png|webp|gif|mp4|mov|heic)$/i.test(f)),'Exhibit research media must not be published');
for(const filename of htmlFiles){
  const html=await fs.readFile(filename,'utf8');
  assert.ok(!/<(?:img|video|source)\b[^>]*(?:church-history|behalt)/i.test(html),`Exhibit media embedded in ${filename}`);
}
const timeline=await fs.readFile(path.join(OUT,info.defaultLocale,'timeline/index.html'),'utf8');
assert.ok(new RegExp(`<strong>${info.connections}</strong>\\s*branch connections`).test(timeline),'Server-rendered branch count must use public graph');
assert.ok(files.some(file=>/_astro[\\/]search-worker-[^/]+\.js$/.test(file)),'Search worker must be content-hashed');
assert.ok(timeline.includes('timeline-threads')&&timeline.includes('timeline-entries'));
assert.ok(!timeline.includes('era-scroll'),'Superseded dotted era strip remains');
const catalog=JSON.parse(await fs.readFile(path.join(OUT,'assets',info.defaultLocale,'catalog.json'),'utf8'));
assert.equal(catalog.filter(r=>r.kind==='story').length,1272);
assert.equal(info.pages,htmlFiles.length-1);
assert.ok(existing.has('index.html'),'Default-language redirect must exist');
for(const candidate of ['af','de'])if(!info.locales.includes(candidate))assert.ok(!existing.has(candidate+'/index.html'),'Unpublished languages must not be advertised');
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

const readerManifest=JSON.parse(gunzipSync(await fs.readFile(path.join(ROOT,'content/martyrs-reader.json.gz'))));
assert.equal(info.readerPages,readerManifest.pageCount);
for(const p of readerManifest.pages){
 const html=await fs.readFile(path.join(OUT,info.defaultLocale,p.route,'index.html'),'utf8');
 for(const token of ['data-reader-page','reader-prose','reader-navigation','www.gutenberg.org/cache/epub/65855/pg65855-images.html'])assert.ok(html.includes(token),`${p.route}: missing ${token}`);
 const timelineLink=html.match(/href="([^"]+)">Open this record on the timeline<\/a>/)?.[1];
 const account=catalog.find(record=>record.slug===p.recordSlug);
 if(account){
   assert.ok(timelineLink,`${p.route}: missing account-level timeline return`);
   const target=new URL(timelineLink.replaceAll('&amp;','&'),'https://check.test');
   assert.equal(target.searchParams.get('q'),account.title,`${p.route}: continuation title must not replace account identity`);
 }else assert.equal(timelineLink,undefined,`${p.route}: edition-only material must not link to a nonexistent timeline record`);
 const body=html.match(/class="prose reader-prose"[^>]*><!--history-content:start-->([\s\S]*?)<!--history-content:end-->/)?.[1];
 assert.ok(body!==undefined&&!/href="[^"]*original\.html/.test(body),`${p.route}: source note leaves native reader`);
}
execFileSync('python3',['scripts/check_reader_output.py'],{cwd:ROOT,stdio:'inherit'});

if(errors.length){console.error(errors.slice(0,30).join('\n'));throw new Error(`${errors.length} site validation errors`);}
console.log(`Validated ${info.pages} Astro pages, local links, Markdown equivalents, theme assets, vertical timeline, and exclusion of exhibit media.`);
