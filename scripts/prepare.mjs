import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {ERAS,REPOSITORY,eraFor,escapeHTML as esc,normalize,dailySelection,contributionURL} from '../src/lib/history.mjs';
import {validateBranches} from '../src/lib/branches.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const TARGET=path.join(ROOT,'.history-public');
const CACHE=path.join(ROOT,'.history-data');
await fs.mkdir(CACHE,{recursive:true});
const pages=[];
const readJSON=async name=>JSON.parse(await fs.readFile(path.join(ROOT,name),'utf8'));
const site=await readJSON('content/site.json');
const curated=await readJSON('content/curated.json');
const branches=await readJSON('content/branches.json');
const photos=await readJSON('content/photographs.json');
const overrides=await readJSON('content/overrides.json');
const imported=JSON.parse(gunzipSync(await fs.readFile(path.join(ROOT,'content/martyrs-mirror.json.gz'))));
const base=(process.env.SITE_BASE_PATH||'').replace(/\/$/,'');
if(base && !/^\/(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+$/.test(base))throw new Error('Invalid SITE_BASE_PATH');
const origin=(process.env.SITE_ORIGIN||'https://truechristian.github.io').replace(/\/$/,'');
if(!/^https?:\/\/[^/?#]+$/.test(origin))throw new Error('SITE_ORIGIN must be an origin without a path');
const url=(route='')=>`${base}/${route.replace(/^\//,'')}`;
const canonical=route=>origin+url(route);
const pretty=title=>title===title.toUpperCase()?title.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase()):title;
function readableMarkdown(markup){
  const entities={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#x27;':"'",'&#39;':"'"};
  return markup.replace(/<img\b[^>]*>/g,'').replace(/<\/(?:p|div|blockquote|li|tr|h[1-6])>/g,'\n\n')
    .replace(/<br\s*\/?\s*>/g,'\n').replace(/<[^>]+>/g,'').replace(/&(?:amp|lt|gt|quot|#x27|#39);/g,e=>entities[e])
    .replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
const records=[...imported.records.map(r=>({...r,title:pretty(r.title),originalTitle:r.title})),...curated].map(r=>{
  const entry={...r,...(overrides[r.slug]||{})};
  if(!/^[a-z0-9-]+$/.test(entry.slug))throw new Error('Unsafe record slug');
  entry.era=eraFor(entry);
  entry.route=`${{story:'stories',event:'events',person:'people',tradition:'traditions',place:'places'}[entry.kind]}/${entry.slug}/`;
  entry.text=entry.text||(entry.paragraphs||[]).join('\n\n');
  entry.textLength=entry.text.length;
  return entry;
});
if(new Set(records.map(r=>r.slug)).size!==records.length)throw new Error('Duplicate record slugs');
const bySlug=new Map(records.map(r=>[r.slug,r]));
validateBranches(branches,records);
for(const slug of Object.keys(overrides))if(!bySlug.has(slug))throw new Error(`Unknown override ${slug}`);
for(const r of records)for(const id of [...(r.people||[]),...(r.traditions||[])])if(!bySlug.has(id))throw new Error(`Unknown relationship ${id}`);

const allPeople=records.filter(r=>r.kind==='person');
const personNames=new Map(allPeople.map(p=>[p.slug,[p.title,...p.aliases].map(normalize)]));
const mentions=new Map(records.map(record=>{
  const hay=normalize(record.title+' '+record.text);
  return [record.slug,allPeople.filter(p=>personNames.get(p.slug).some(name=>hay.includes(name)))];
}));
const mentionedPeople=record=>mentions.get(record.slug)||[];
for(const record of records)if(record.kind==='story')record.aliases=[...new Set(mentionedPeople(record).flatMap(p=>[p.title,...p.aliases]))];
const summary=r=>({slug:r.slug,title:r.title,kind:r.kind,route:r.route,era:r.era,date:r.date,
  status:r.status,category:r.category,summary:r.summary,aliases:r.aliases||[],textLength:r.textLength,
  image:r.images?.[0]||null,people:r.people||[],traditions:r.traditions||[],places:r.places||[],century:r.century||null,headingLevel:r.headingLevel||null,source:r.source||'editorial'});
const catalog=records.map(summary);
const footer=(await fs.readFile(path.join(ROOT,'vendor/theme/src/html/site-footer.html'),'utf8')).replaceAll('src="/assets/',`src="${base}/assets/`);

// Build in a new directory so repeated builds cannot reuse stale deployment URLs.
const OUT=await fs.mkdtemp(path.join(ROOT,'.history-build-'));
await fs.mkdir(path.join(OUT,'sources'),{recursive:true});
await fs.cp(path.join(ROOT,'sources/martyrs-mirror'),path.join(OUT,'sources/martyrs-mirror'),{recursive:true});
await fs.cp(path.join(ROOT,'vendor/theme/assets'),path.join(OUT,'assets'),{recursive:true});
await fs.cp(path.join(ROOT,'vendor/theme/dist'),path.join(OUT,'assets/theme'),{recursive:true});
await fs.cp(path.join(ROOT,'src/lib'),path.join(OUT,'assets/lib'),{recursive:true});
for(const filename of ['site.css','app.mjs','search-worker.mjs'])await fs.copyFile(path.join(ROOT,'src',filename),path.join(OUT,'assets',filename));
await fs.writeFile(path.join(OUT,'assets/catalog.json'),JSON.stringify(catalog));
await fs.writeFile(path.join(OUT,'assets/branches.json'),JSON.stringify(branches));
await fs.writeFile(path.join(OUT,'assets/search-index.json'),JSON.stringify(records.map(r=>({...summary(r),normalized:normalize([r.title,r.originalTitle,r.summary,r.text,...(r.aliases||[])].join(' '))}))));
const routes=[];
await fs.writeFile(path.join(CACHE,'records.json'),JSON.stringify(records));

function header(current){
  const item=(label,route,key)=>`<li${current===key?' class="is-active"':''}><a href="${url(route)}"${current===key?' aria-current="page"':''}>${label}</a></li>`;
  return `<header class="tcc-site-header tm-header" data-tcc-global-header><div class="tcc-header__container tcc-container">
    <a class="tcc-header__brand uk-logo" href="https://truechristian.church/" aria-label="A True Christian Church home"><img src="${url('assets/brand/logo.jpg')}" width="288" height="77" alt="A True Christian Church"></a>
    <button class="tcc-header__toggle" type="button" aria-controls="tcc-primary-navigation" aria-expanded="false"><span class="tcc-visually-hidden">Open menu</span><span aria-hidden="true">☰</span></button>
    <nav id="tcc-primary-navigation" class="tcc-header__navigation" aria-label="Primary navigation"><button class="tcc-header__close" type="button" aria-label="Close menu"><span aria-hidden="true">×</span></button><ul class="tcc-header__menu uk-navbar-nav">
    ${item('Home','','home')}${item('Timeline','timeline/','timeline')}${item('Stories','stories/','stories')}
    <li class="has-submenu"><button type="button" aria-expanded="false" aria-haspopup="true">Explore</button><ul>${item('Branch histories','branches/','branches')}${item('Places','places/','places')}${item('People','people/','people')}${item('Traditions','traditions/','traditions')}${item('Sources','sources/','sources')}${item('About this archive','about/','about')}</ul></li>
    ${item('Search','search/','search')}${item('Contribute','contribute/','contribute')}</ul></nav><button class="tcc-header__scrim" type="button" tabindex="-1" aria-label="Close menu"></button></div></header>`;
}
function card(r){
  return `<article class="story-card"><div class="card-meta"><span>${esc(r.date?.label||'Source context')}</span><span>${esc(r.kind==='story'?r.category:r.kind)}</span></div><h3><a href="${url(r.route)}">${esc(r.title)}</a></h3><p>${esc(r.summary||'Read this section in the source collection.')}</p><span class="card-action">${r.status==='Research needed'?'Help document this history':'Read the story'} <span aria-hidden="true">→</span></span></article>`;
}
const cards=list=>`<div class="card-grid">${list.map(card).join('')}</div>`;
function pageLinks(title,route,record={}){
  return `<aside class="page-tools" aria-label="Page sources and contributions"><a href="${url(route+'README.md')}">Read this page as Markdown</a><a href="${esc(contributionURL({...record,title:record.title||title},canonical(route)))}" rel="noopener">${record.status==='Research needed'?'Add the missing history':'Suggest a correction or addition'}</a></aside>`;
}
function lead(kicker,title,description){return `<div class="page-lead"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p class="lead">${esc(description)}</p></div>`;}
const referenceURL=value=>value.startsWith('sources/church-history/photos/')?`${REPOSITORY}/blob/main/${value}`:/^https?:/.test(value)?value:url(value);
function sourceRefs(list=[]){return list.length?`<section class="reference-list"><h2>References</h2><ol>${list.map((s,i)=>`<li id="reference-${i+1}"><a href="${esc(referenceURL(s.url))}" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ol></section>`:'';}

async function page(route,title,body,markdown,current='',record={}){
  routes.push(route);
  pages.push({route,title,body,description:record.summary||site.description,current,era:record.era||'',header:header(current),footer,tools:pageLinks(title,route,record)});
  const dir=path.join(OUT,route);await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'README.md'),`# ${title}\n\n${markdown}\n\n---\n\nPage: ${canonical(route)}\n\n[Contribute a correction or addition](${contributionURL({...record,title:record.title||title},canonical(route))})\n`);
}

const initialDaily=dailySelection(catalog);
await page('',site.title,`<section class="discovery-section"><div class="section-heading"><div><p class="eyebrow">A different window each day</p><h2>Today’s six accounts</h2></div><a class="text-link" href="${url('stories/')}">Browse the complete collection →</a></div><p class="section-note">Six selections from the archive, refreshed each day. <span id="daily-date"></span></p><div id="daily-stories">${cards(initialDaily)}</div></section>`,`${site.description}\n\n[Explore the vertical timeline](${url('timeline/')})\n\n[Read all source accounts](${url('stories/')})`,'home');
const connectionList=(slug='')=>branches.edges.filter(e=>!slug||e.from===slug||e.to===slug).map(e=>`<li><a href="${url(bySlug.get(e.from).route)}">${esc(bySlug.get(e.from).title)}</a> → <a href="${url(bySlug.get(e.to).route)}">${esc(bySlug.get(e.to).title)}</a><p>${esc(e.label)} · ${esc(e.type.replaceAll('-',' '))}.</p></li>`).join('');
for(const [route,title] of [['timeline/','Church history timeline'],['branches/','Branch histories']])await page(route,title,'',`${site.description}\n\n## Dated histories\n\n`+records.filter(r=>r.kind!=='story').sort((a,b)=>(b.date?.start||0)-(a.date?.start||0)).map(r=>`- ${r.date?.label||'Christian beginnings'}: [${r.title}](${url(r.route)}) — ${r.summary}`).join('\n')+'\n\n## Connections\n\n'+branches.edges.map(e=>`- ${bySlug.get(e.from).title} → ${bySlug.get(e.to).title}: ${e.label}. [Reference](${referenceURL(e.source)})`).join('\n'),'timeline');

const options=(items,valueKey='id',labelKey='title')=>items.map(e=>`<option value="${esc(e[valueKey])}">${esc(e[labelKey])}</option>`).join('');
await page('stories/','Stories and source accounts',lead('The source collection','Stories, letters, and witnesses','Read the individual accounts of Martyrs’ Mirror, with their original wording and a direct route back to the complete source.')+`<form class="filter-form" id="archive-filters"><label>Search titles<input name="q" type="search" placeholder="Name, place, or title"></label><label>Era<select name="era"><option value="">Every era</option>${options(ERAS)}<option value="source-context">Source introductions and context</option></select></label><label>Century<select name="century"><option value="">Every century</option>${Array.from({length:17},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><label>Section type<select name="category"><option value="">All sections</option>${[...new Set(imported.records.map(r=>r.category))].map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><button class="button" type="submit">Filter</button></form><p id="archive-count" class="result-count" aria-live="polite">${imported.recordCount} source sections</p><div id="archive-results">${cards(records.filter(r=>r.kind==='story').slice(0,36))}</div><button id="archive-more" class="button more-button" type="button" hidden>Show more stories</button><noscript><p>Enable JavaScript to filter the collection. The complete edition remains available below.</p></noscript><p><a href="${url('sources/martyrs-mirror/')}">Open the complete edition and chapter guide →</a></p>`,`${imported.recordCount} original source sections.\n\n`+records.filter(r=>r.kind==='story').map(r=>`- [${r.title}](${url(r.route)}) · ${r.date?.label||'Source context'}`).join('\n'),'stories');

for(const [kind,title,intro] of [['place','Places','Explore the cities, regions, settlements, and meeting places that connect the church history accounts.'],['person','People','Explore key individuals and the source accounts that mention them. Search also finds names throughout the complete text, including people who do not yet have a profile.'],['tradition','Traditions and related histories','Explore different Anabaptist streams. Follow the named branches on the photographed timeline, later fellowships, and shared institutions, with each history linked to its evidence.']]){
  const selection=records.filter(r=>r.kind===kind);
  await page(`${kind==='person'?'people':kind==='place'?'places':'traditions'}/`,title,lead('The wider story',title,intro)+(kind==='tradition'?`<p><a class="button primary" href="${url('branches/')}">Explore the dated branch diagram →</a></p>`:'')+cards(selection),intro+'\n\n'+selection.map(r=>`- [${r.title}](${url(r.route)})${r.status==='Research needed'?' — History invited':''}`).join('\n'),kind==='person'?'people':kind==='place'?'places':'traditions');
}

for(const r of records){
  const people=[...new Set([...(r.people||[]),...mentionedPeople(r).filter(p=>p.slug!==r.slug).map(p=>p.slug)])].map(id=>bySlug.get(id));
  const traditions=(r.traditions||[]).map(id=>bySlug.get(id));
  const places=(r.places||[]).map(id=>bySlug.get(id));
  const related=r.kind==='place'?records.filter(x=>x.places?.includes(r.slug)):r.kind==='person'?records.filter(x=>x.slug!==r.slug && (x.people?.includes(r.slug) || (x.kind==='story' && mentionedPeople(x).some(p=>p.slug===r.slug)))):records.filter(x=>x.slug!==r.slug && (x.traditions?.includes(r.slug) || (r.kind==='story' && x.kind==='story' && x.chapter===r.chapter)));
  const sourceNotice=r.source==='martyrs-mirror'?`<div class="source-notice"><strong>From Martyrs’ Mirror</strong><p>Original historical wording. ${esc(r.date?.basis||'This section has no event date assigned.')} </p>${r.slug==='mm-felix-mantz-a-d-1526'?`<p>The heading gives 1526; later references date Manz’s execution to 1527. <a href="${url('events/felix-manz-execution/')}">Compare the dates and sources.</a></p>`:''}</div>`:'';
  const account=r.status==='Community account'?`<div class="source-notice"><strong>Attributed community account</strong><p>${esc(r.date?.basis||'Account supplied by this community.')}</p></div>`:'';
  const gap=r.status==='Research needed'?`<div class="research-notice"><strong>Help document this history</strong><p>${esc(r.date?.basis||'Dates, people, and a detailed account are still being gathered.')} Share what you can add, with sources, for review.</p><a class="button" href="${esc(contributionURL(r,canonical(r.route),'missing'))}">Contribute this history →</a></div>`:'';
  const recordReferences=[...(r.references||[])];
  for(const edge of branches.edges.filter(e=>e.from===r.slug||e.to===r.slug))if(!recordReferences.some(s=>s.url===edge.source))recordReferences.push({label:'Branch connection: '+edge.label,url:edge.source});
  const article=r.html?r.html.replaceAll('__BASE__',base):(r.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('');
  const original=r.source==='martyrs-mirror'?`<details class="source-details"><summary>Original heading and source location</summary><p>${esc(r.originalTitle)}</p><p>${esc(r.part)} · ${esc(r.chapter)}</p><a href="${url('sources/martyrs-mirror/original.html')}#${esc(r.sourceAnchor||'')}" rel="noopener">Read this location in the complete edition</a>${r.sourcePages?.length?`<p>Original page markers: ${esc(r.sourcePages.join(', '))}</p>`:''}</details>`:'';
  const relationships=(list,label)=>list.length?`<section class="related-topics"><h2>${label}</h2><div class="topic-chips">${list.map(x=>`<a href="${url(x.route)}">${esc(x.title)}</a>`).join('')}</div></section>`:'';
  await page(r.route,r.title,`<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${url()}">Home</a><span aria-hidden="true">/</span><a href="${url(r.route.split('/')[0]+'/')}">${esc(r.kind==='story'?'Stories':r.kind==='person'?'People':r.kind==='event'?'Events':r.kind==='place'?'Places':'Traditions')}</a></nav><article class="reading-page"><div class="reading-heading"><p class="eyebrow">${esc(r.date?.label||'Source context')} · ${esc(r.kind==='story'?r.category:r.kind)}</p><h1>${esc(r.title)}</h1>${r.kind!=='story'?`<p class="lead">${esc(r.summary)}</p>`:''}${r.aliases?.length?`<p class="aliases">Also searchable as: ${esc(r.aliases.join(' · '))}</p>`:''}</div>${sourceNotice}${account}${gap}<div class="prose">${article}</div>${original}${sourceRefs(recordReferences)}${r.kind==='tradition'?`<section class="related-topics"><h2>Connections in the branch explorer</h2><ul class="connection-list">${connectionList(r.slug)}</ul><a class="button" href="${url('branches/')}?family=${branches.nodes.find(n=>n.slug===r.slug)?.family||''}">View this family on the diagram →</a></section>`:''}${relationships(people,'People in this history')}${relationships(traditions,'Related traditions')}${relationships(places,'Places in this history')}${related.length?`<section class="related-stories"><h2>${r.kind==='person'?'Accounts and events mentioning this person':'Continue exploring'}</h2>${cards(related.slice(0,6))}${r.kind==='person'?`<p><a href="${url('search/')}?q=${encodeURIComponent(r.title)}">Search the full archive for this name →</a></p>`:''}</section>`:''}</article>`,`${r.date?.label||'Date not assigned'} · ${r.status}\n\n${r.source==='martyrs-mirror'?`Source: Martyrs’ Mirror. Original heading: ${r.originalTitle}\n\n${r.date?.basis||''}\n\n`:''}${r.html?readableMarkdown(r.html):r.text}\n\n${r.images?.map(i=>`![Illustration from Martyrs’ Mirror](${url(i)})`).join('\n\n')||''}\n\n${r.references?.map(s=>`- [${s.label}](${referenceURL(s.url)})`).join('\n')||''}`,r.kind==='story'?'stories':r.kind==='person'?'people':r.kind==='tradition'?'traditions':'timeline',r);
}

await page('events/','Events and milestones',lead('Milestones','Events and milestones','Follow the events that connect the people, source accounts, and traditions.')+cards(records.filter(r=>r.kind==='event')),records.filter(r=>r.kind==='event').map(r=>`- [${r.title}](${url(r.route)})`).join('\n'),'timeline');
await page('search/','Search the archive',lead('The whole collection','Search the archive','Find names, places, phrases, and events throughout the complete source text and the growing historical overviews.')+`<form id="search-form" class="filter-form" role="search"><label class="query-field">Search<input id="search-query" name="q" type="search" placeholder="Try Anneken Jans, prison, or Zürich" autocomplete="off"></label><label>Record type<select name="kind"><option value="">Every type</option><option value="story">Stories and letters</option><option value="person">People</option><option value="event">Events</option><option value="tradition">Traditions</option><option value="place">Places</option></select></label><label>Era<select name="era"><option value="">Every era</option>${options(ERAS)}<option value="source-context">Source context</option></select></label><div class="year-fields"><label>From year<input name="from" type="number" min="1" max="9999" placeholder="1500"></label><label>To year<input name="to" type="number" min="1" max="9999" placeholder="2026"></label></div><button class="button primary" type="submit">Search</button></form><p class="section-note">Alternate spellings on people’s profiles are searchable. Dates assigned only to a century are treated as ranges.</p><p id="search-status" class="result-count" role="status">Enter a word, phrase, or name to begin.</p><div id="search-results"></div><button id="search-more" class="button more-button" hidden type="button">Show more results</button><noscript><p>Full-text search requires JavaScript. You can browse the timeline, people, and complete source edition without it.</p></noscript>`,`Search covers ${records.length} records and all imported text.\n\nFilter by record type, era, and date range. Source dates remain attributed to their headings or containing century. Search does not require an account.`,'search');

await page('sources/','Sources and acknowledgements',lead('Evidence and memory','Sources and acknowledgements','Read the foundation texts and see the numbered references behind the timeline and historical articles.')+`<div class="source-grid">${site.sources.map(s=>`<article class="source-card"><p class="eyebrow">${esc(s.author)}</p><h2>${esc(s.title)}</h2><p>${esc(s.description)}</p><a class="button" href="${url('sources/'+s.id+'/')}">Explore this source →</a></article>`).join('')}</div><div class="source-notice"><h2>How to read this archive</h2><p>Scripture, Martyrs’ Mirror, and the supplied Anabaptist history material form the foundation of this archive. Original accounts are preserved, and historical overviews bring their people, places, events, and branch histories together. References identify the material used for each page.</p></div>`,site.sources.map(s=>`## ${s.title}\n\n${s.author}\n\n${s.description}\n\n${s.url}`).join('\n\n'),'sources');
const chapterRecords=records.filter(r=>r.source==='martyrs-mirror' && r.headingLevel<4);
await page('sources/martyrs-mirror/','The Martyrs’ Mirror collection',lead('The foundation collection','Martyrs’ Mirror',`${imported.recordCount} source sections, ${imported.imageCount} supplied illustrations, and the complete original edition.`)+`<div class="actions"><a class="button primary" href="${url('stories/')}">Browse the individual accounts</a><a class="button" href="${url('sources/martyrs-mirror/original.html')}">Read the intact edition</a></div><div class="prose"><p>The supplied English text is preserved without rewriting the historical accounts. Its source heading, containing century, page markers, and original anchor accompany each imported section. Footnotes and cross-references lead back to the complete edition.</p><p>Public-domain book text and illustrations are distinct from the Behalt painting. The original Gutenberg notices are retained with the source document.</p></div><h2>Chapter and context guide</h2><ul class="chapter-list">${chapterRecords.map(r=>`<li><a href="${url(r.route)}">${esc(r.title)}</a></li>`).join('')}</ul>`,`${imported.recordCount} sections and ${imported.imageCount} images imported from the supplied ZIP.\n\nSource SHA-256: ${imported.sourceSha256}\n\n[Complete original edition](${url('sources/martyrs-mirror/original.html')})\n\n`+chapterRecords.map(r=>`- [${r.title}](${url(r.route)})`).join('\n'),'sources');

await page('sources/church-history/','Research behind the timeline',lead('Research provenance','Research behind the timeline','The supplied exhibit photographs informed the dated, connected timeline. The published navigation is recreated in HTML, CSS, TypeScript, and SVG.')+`<div class="prose"><p>Forty photographs document the source chart and related exhibits. The chart’s branch names, movements, and dates were used to organize this archive’s historical coverage. The original photographs are retained as research records in the repository and are not published as site images.</p><p>Each historical page explains its subject here and lists its references. The source chart is compared with institutional records and historical accounts, and uncertainties remain visible.</p></div><p><a class="button primary" href="${url('timeline/')}">Explore the redesigned timeline →</a></p>${sourceRefs([{label:'Research photographs retained in the repository',url:REPOSITORY+'/tree/main/sources/church-history/photos'},{label:'Amish & Mennonite Heritage Center: photographed exhibit location',url:'https://behalt.com/'}])}`,`The forty supplied photographs serve as research evidence. They are retained in the repository and excluded from the published assets.\n\n[Use the redesigned timeline](${url('timeline/')})`,'sources');
await page('sources/behalt/','Behalt: research acknowledgement',lead('Research acknowledgement','Behalt','The supplied recording and exhibit panels helped explain the historical material; the website presents its own sourced timeline and articles.')+`<div class="prose"><p>IMG_9359 is the complete supplied recording of the Behalt cyclorama. It was inspected for comprehension of the exhibit and is not used as a website video or navigation image.</p><p>Behalt is an artistic interpretation of Amish, Mennonite, and Hutterite history by Heinz Gaugel at the Amish & Mennonite Heritage Center in Holmes County, Ohio. The artist and project are acknowledged as research sources. No mural images or video are included in this site’s published assets.</p><p>The archive’s dated navigation is derived principally from the supplied source chart, the historical edition of Martyrs’ Mirror, and referenced historical research.</p></div><p><a class="button primary" href="${url('timeline/')}">Explore the church history timeline →</a></p>${sourceRefs([{label:'Behalt project: Amish & Mennonite Heritage Center',url:'https://behalt.com/behalt-cyclorama/'},{label:'Heinz Gaugel: the artist',url:'https://behalt.com/meet-heinz-gaugel/'}])}`,`Behalt by Heinz Gaugel, Amish & Mennonite Heritage Center.\n\nThe supplied IMG_9359 recording and mural-containing photographs are research inputs, excluded from the published site.\n\n[Explore the timeline](${url('timeline/')})`,'sources');

const gaps=records.filter(r=>r.status==='Research needed');
await page('contribute/','Contribute to the history',lead('An archive we build together','Contribute to the history','Share a source, correct an account, or help document a community that is missing from the story.')+`<div class="contribute-steps"><article><span>01</span><h2>Choose a page or topic</h2><p>Use the contribution link on any page. It carries that page’s title, address, and record into the issue.</p></article><article><span>02</span><h2>Add what you know</h2><p>Include dates, people, places, and sources. For photographs, include the creator and permission or public-domain basis.</p></article><article><span>03</span><h2>Submit for review</h2><p>A maintainer reviews the evidence and updates the archive. A GitHub account is needed to submit an issue.</p></article></div><p><a class="button primary" href="${esc(contributionURL({title:'New Anabaptist history contribution'},canonical('contribute/'),'missing'))}">Open a history contribution →</a> <a class="text-link" href="${REPOSITORY}/issues">View existing contributions</a></p><h2>Extend the living history</h2><p>Every tradition now has a source-linked overview. Add a documented local history, another voice, or a new event through its page contribution link.</p>${cards(records.filter(r=>['agape-fellowships','charity-ministries','conservative-mennonites'].includes(r.slug)))}`,`Contributions use GitHub issues and are reviewed before publication.\n\n1. Choose a page.\n2. Add sources, dates, people, places, and image credits.\n3. Submit for review.\n\n## Histories invited\n\n`+gaps.map(r=>`- [${r.title}](${url(r.route)})`).join('\n'),'contribute');
await page('about/','About this archive',lead('Purpose and approach','A shared record of Anabaptist history','An open archive of the Radical Reformation and the many communities whose histories grew from it.')+`<div class="prose"><p>This archive presents the history of those who held the convictions of the Radical Reformation. Scripture, Martyrs’ Mirror, and the supplied Anabaptist history chart form its foundation. The connected timeline follows the witnesses, communities, and later streams within that history.</p><p>The supporting fellowship identifies its background with Charity Ministries and the Agape stream. Charity’s institutional history and the owner’s local account are attributed separately on their pages.</p><p>Martyrs’ Mirror provides the extensive foundation collection. The Church History photographs guide coverage of later migrations and traditions. Original historical writing connects the records, with numbered references identifying its sources.</p><p>The site is published as static pages on GitHub Pages. Search and daily selections run in the visitor’s browser. Appearance follows the system by default, with an optional setting saved on the device.</p></div>`,`${site.description}\n\nThe archive includes the wider Anabaptist family. Original historical accounts and current editorial overviews retain their sources. Incomplete modern histories invite documented contributions.\n\nThe theme is taken from trueChristian/theme at ${site.themeCommit}.`,'about');
await page('not-found/','Page not found',lead('Find your way back','This page could not be found','The archive may have changed. Search for the person or event, or return to the timeline.')+`<div class="actions"><a class="button primary" href="${url('search/')}">Search the archive</a><a class="button" href="${url('timeline/')}">Open the timeline</a></div>`,'The requested page could not be found. Use the search or timeline.');

await fs.writeFile(path.join(OUT,'.nojekyll'),'');
await fs.writeFile(path.join(OUT,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${canonical('sitemap.xml')}\n`);
await fs.writeFile(path.join(OUT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(r=>`<url><loc>${esc(canonical(r))}</loc></url>`).join('')}</urlset>`);
await fs.writeFile(path.join(OUT,'build-info.json'),JSON.stringify({records:records.length,sourceSections:imported.recordCount,sourceImages:imported.imageCount,photographs:photos.length,branches:branches.nodes.length,connections:branches.edges.length,publishedExhibitMedia:0,pages:routes.length,base,themeCommit:site.themeCommit}));
await fs.writeFile(path.join(CACHE,'pages.json'),JSON.stringify(pages));
await fs.rm(TARGET,{recursive:true,force:true,maxRetries:3,retryDelay:100});
await fs.rename(OUT,TARGET);
console.log(`Prepared ${routes.length} Astro routes: ${imported.recordCount} source sections, ${curated.length} curated records, ${photos.length} photographs.`);
