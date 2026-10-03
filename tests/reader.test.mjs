import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildReader,remapReaderLinks,readerHref} from '../src/lib/reader.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(gunzipSync(fs.readFileSync(new URL('../content/martyrs-reader.json.gz',import.meta.url))));
const legacy=JSON.parse(gunzipSync(fs.readFileSync(new URL('../content/martyrs-mirror.json.gz',import.meta.url))));
const hash=text=>createHash('sha256').update(text).digest('hex');
const compact=text=>text.replace(/\s+/g,' ').trim();
const reader=buildReader(manifest);

test('reader regeneration is deterministic and verifies the complete original source',()=>{
  const result=spawnSync('python3',['-B','scripts/import_martyrs_reader.py','--check'],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.equal(manifest.sourceSha256,legacy.sourceSha256);
  assert.equal(manifest.legacyImportSha256,hash(fs.readFileSync(new URL('../content/martyrs-mirror.json.gz',import.meta.url))));
  assert.equal(manifest.sourceTextSha256,hash(compact(manifest.pages.map(page=>page.text).join(' '))));
  assert.equal(manifest.sourceWordCount,1144073);
});

test('every legacy account keeps its first-page identity and the original is completely paginated',()=>{
  assert.equal(manifest.legacyRecordCount,1272);
  assert.equal(reader.sections.filter(section=>section.legacyRecord).length,1272);
  assert.equal(reader.byRecord.size,1275);
  for(const record of legacy.records){
    const pages=reader.byRecord.get(record.slug);
    assert.ok(pages?.length,record.slug);
    assert.equal(pages[0].id,record.slug);
    assert.equal(pages[0].route,`stories/${record.slug}/`);
    assert.equal(pages[0].title,record.title);
    assert.equal(pages[0].headingIsSource,true);
    for(const [index,page] of pages.entries()){
      assert.equal(page.part,index+1);
      assert.equal(page.partCount,pages.length);
      if(index)assert.match(page.id,new RegExp(`^${record.slug}--b\\d+-o\\d+$`));
    }
  }
  assert.equal(reader.firstPage.recordSlug,'mm-edition-notice');
  assert.equal(reader.lastPage.recordSlug,'mm-edition-license');
  assert.match(reader.byRecord.get('mm-front-matter').map(page=>page.text).join(' '),/As the English language, year by year/);
});

test('all reader pages are bounded, semantic, and lossless down to every block',()=>{
  const blockIds=new Set();
  for(const page of manifest.pages){
    assert.ok(page.wordCount<=1100,page.id);
    assert.equal(page.sourceTextSha256,hash(page.text));
    assert.equal(page.html,page.blocks.map(block=>block.html).join(''));
    for(const block of page.blocks){
      assert.ok(!blockIds.has(block.id),block.id);blockIds.add(block.id);
      assert.equal(block.sourceTextSha256,hash(block.text));
      assert.ok(block.kind);
      assert.match(block.sourceRange,/^b\d+-o\d+$/);
    }
    assert.ok(!/<(?:script|style|iframe)\b/i.test(page.html));
    assert.ok(!/\s(?:style|on\w+)=/i.test(page.html));
  }
  for(const slug of ['mm-confession-of-faith-according-to-the-holy-word-of-god','mm-index','mm-footnotes']){
    assert.ok(reader.byRecord.get(slug).length>8,slug);
  }
  assert.ok(manifest.pages.flatMap(page=>page.blocks).some(block=>block.kind==='paragraph'&&block.continued));
  assert.ok(manifest.pages.flatMap(page=>page.blocks).some(block=>block.kind==='footnote'));
  assert.ok(manifest.pages.flatMap(page=>page.blocks).some(block=>block.kind==='poetry'));
});

test('previous and next form one complete sequence across accounts and structural headings',()=>{
  assert.equal(reader.pages[0].previousId,null);
  assert.equal(reader.pages.at(-1).nextId,null);
  for(const [index,page] of reader.pages.entries()){
    assert.equal(page.bookIndex,index);
    assert.equal(page.previousId,reader.pages[index-1]?.id||null);
    assert.equal(page.nextId,reader.pages[index+1]?.id||null);
  }
  const visited=new Set();let current=reader.firstPage;
  while(current){assert.ok(!visited.has(current.id));visited.add(current.id);current=reader.byPageId.get(current.nextId);}
  assert.equal(visited.size,manifest.pageCount);
});

test('all original anchors, illustrations, footnotes, and return links have one native owner',()=>{
  assert.equal(reader.anchorToPage.size,2024);
  assert.equal(manifest.sourceImageOccurrences,50);
  assert.equal(manifest.sourceImageFiles,44);
  assert.equal(manifest.archivedImageFiles,45); // The cover is a head/favicon asset, outside the source body.
  assert.equal(reader.pages.flatMap(page=>page.images).length,50);
  for(let index=1;index<=365;index++){
    const note=reader.anchorToPage.get(`Footnote_${index}`);
    const reference=reader.anchorToPage.get(`FNanchor_${index}`);
    assert.ok(note&&reference,`Footnote ${index}`);
    assert.ok(note.html.includes(`${reference.url}#FNanchor_${index}`));
    assert.ok((reference.html+reference.headingHtml).includes(`${note.url}#Footnote_${index}`));
  }
  for(const page of reader.pages){
    const markup=page.headingHtml+page.html;
    assert.ok(!/href="[^"]*original\.html/.test(markup),page.id);
    assert.ok(!/href="#/.test(markup),page.id);
    for(const match of markup.matchAll(/href="(\/en\/stories\/[^"#]+)#([^"]+)"/g)){
      assert.equal(reader.anchorToPage.get(match[2])?.url,match[1],`${page.id} → ${match[2]}`);
    }
  }
});

test('every page cites the original source website at a real source location',()=>{
  assert.equal(manifest.editionURL,'https://www.gutenberg.org/ebooks/65855');
  assert.equal(manifest.sourceWebsite,'https://www.gutenberg.org/cache/epub/65855/pg65855-images.html');
  for(const page of manifest.pages){
    assert.ok(page.sourceAnchor&&reader.anchorToPage.has(page.sourceAnchor),page.id);
    assert.equal(page.sourceURL,`${manifest.sourceWebsite}#${page.sourceAnchor}`);
  }
});

test('locale and project prefix change URLs without changing source boundaries or IDs',()=>{
  const translated=buildReader(manifest,{base:'/history.truechristian.church',locale:'de'});
  assert.deepEqual(translated.pages.map(page=>page.id),reader.pages.map(page=>page.id));
  for(const [index,page] of translated.pages.entries()){
    assert.equal(page.text,reader.pages[index].text);
    assert.equal(page.contentLanguage,'en');
    assert.match(page.url,/^\/history\.truechristian\.church\/de\/stories\//);
    assert.ok(!page.html.includes('__BASE__'));
    assert.ok(!page.html.includes('href="/en/'));
  }
  const reference=reader.anchorToPage.get('Footnote_1');
  assert.equal(remapReaderLinks('<a href="__BASE__/sources/martyrs-mirror/original.html#Footnote_1">1</a>',reader.anchorToPage,{base:'/project',locale:'de'}),`<a href="/project/de/${reference.route}#Footnote_1">1</a>`);
  assert.throws(()=>remapReaderLinks('<a href="#missing">bad</a>',reader.anchorToPage),/Unknown reader source anchor/);
  assert.throws(()=>readerHref(reader.firstPage,{base:'https://wrong.test'}),/Invalid reader base/);
});

test('reader rejects reordered pages, bad anchor ownership, and inconsistent render caches',()=>{
  assert.throws(()=>buildReader({...manifest,pages:[manifest.pages[1],manifest.pages[0],...manifest.pages.slice(2)]}),/book order/);
  assert.throws(()=>buildReader({...manifest,anchorToPage:{...manifest.anchorToPage,Footnote_1:'wrong'}}),/ownership/);
  assert.throws(()=>buildReader({...manifest,pages:[{...manifest.pages[0],html:'wrong'},...manifest.pages.slice(1)]}),/block\/render mismatch/);
});
