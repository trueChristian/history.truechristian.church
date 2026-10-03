import {t,contentBase,catalogURL,indexURL} from './ui.mjs';
import {dailySelection,ERAS,escapeHTML as esc,searchRecords} from './lib/history.mjs';

const base=document.documentElement.dataset.base||'';
const route=value=>`${contentBase}/${value}`;
const prefersDark=matchMedia('(prefers-color-scheme: dark)');
const themeControl=document.querySelector('#theme-mode');
let theme='system';
try{theme=localStorage.getItem('history-theme')||'system';}catch{}
if(!['system','light','dark'].includes(theme))theme='system';
function applyTheme(){
  document.documentElement.dataset.theme=theme==='system'?(prefersDark.matches?'dark':'light'):theme;
  if(themeControl)themeControl.value=theme;
}
themeControl?.addEventListener('change',()=>{
  theme=themeControl.value;
  try{localStorage.setItem('history-theme',theme);}catch{}
  applyTheme();
});
prefersDark.addEventListener('change',applyTheme);applyTheme();

let catalogPromise;
function loadCatalog(){
  return catalogPromise||=fetch(catalogURL).then(response=>{
    if(!response.ok)throw new Error(t("Could not load the archive. Please refresh and try again."));
    return response.json();
  }).catch(error=>{catalogPromise=undefined;throw error;});
}
function card(record){
  return `<article class="story-card"><div class="card-meta"><span>${esc(record.date?.label||t("Source context"))}</span><span>${esc(record.kind==='story'?record.category:record.kind)}</span></div><h3><a href="${route(record.route)}">${esc(record.title)}</a></h3><p>${esc(record.summary||t("Read this section in the source collection."))}</p><span class="card-action">${record.status==='Research needed'?t("Help document this history"):t("Read the story")} <span aria-hidden="true">→</span></span></article>`;
}
const cards=items=>`<div class="card-grid">${items.map(card).join('')}</div>`;
let dailyDay='';
async function refreshDaily(){
  const target=document.querySelector('#daily-stories');if(!target)return;
  const day=new Date().toISOString().slice(0,10);if(day===dailyDay)return;
  try{
    const selected=dailySelection(await loadCatalog(),day);
    target.innerHTML=cards(selected);
    const titles=document.querySelector('#daily-title-links');
    if(titles)titles.innerHTML=selected.map(r=>`<li><a href="${route(r.route)}" title="${esc(r.title)}">${esc(r.title)}</a></li>`).join('');
    document.querySelector('#daily-date').textContent=`${day} · UTC`;
    dailyDay=day;
  }catch{/* The built daily selection remains readable if the request fails. */}
}
if(document.querySelector('#daily-stories')){
  refreshDaily();setInterval(refreshDaily,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDaily();});
}

const archiveForm=document.querySelector('#archive-filters');
if(archiveForm){
  const output=document.querySelector('#archive-results'),count=document.querySelector('#archive-count'),more=document.querySelector('#archive-more');
  let matches=[],limit=36,sequence=0;
  const render=()=>{
    output.innerHTML=matches.length?cards(matches.slice(0,limit)):`<p>${esc(t('No source sections match these filters. Try a different spelling or era.'))}</p>`;
    count.textContent=t('{count} source sections · showing {shown}',{count:matches.length.toLocaleString(),shown:Math.min(limit,matches.length)});
    more.hidden=limit>=matches.length;
  };
  async function filter(updateURL=true){
    const id=++sequence,values=Object.fromEntries(new FormData(archiveForm));
    try{
      const catalog=await loadCatalog();if(id!==sequence)return;
      matches=searchRecords(catalog.filter(r=>r.kind==='story'),values.q,{era:values.era,category:values.category,century:values.century});limit=36;render();
      if(updateURL){const params=new URLSearchParams(Object.entries(values).filter(([,v])=>v));history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}
    }catch(error){count.textContent=error.message;}
  }
  const initial=new URLSearchParams(location.search);
  for(const control of archiveForm.elements)if(control.name && initial.has(control.name))control.value=initial.get(control.name);
  archiveForm.addEventListener('submit',event=>{event.preventDefault();filter();});
  archiveForm.querySelectorAll('select').forEach(el=>el.addEventListener('change',()=>filter()));
  more.addEventListener('click',()=>{limit+=36;render();});filter(false);
}

const searchForm=document.querySelector('#search-form');
if(searchForm){
  const status=document.querySelector('#search-status'),output=document.querySelector('#search-results'),more=document.querySelector('#search-more');
  let worker,results=[],limit=30,requestId=0,timer;
  const render=()=>{
    output.innerHTML=results.length?cards(results.slice(0,limit)):`<p>${esc(t('No results found. Try an alternate spelling, fewer words, or a wider date range.'))}</p>`;
    status.textContent=t('{count} results · showing {shown}',{count:results.length.toLocaleString(),shown:Math.min(limit,results.length)});
    more.hidden=limit>=results.length;
  };
  const initial=new URLSearchParams(location.search);
  for(const control of searchForm.elements)if(control.name && initial.has(control.name))control.value=initial.get(control.name);
  function submit(updateURL=true){
    const id=++requestId;
    const values=Object.fromEntries(new FormData(searchForm));
    if(values.from && values.to && Number(values.from)>Number(values.to)){status.textContent=t("The start year must be before the end year.");results=[];output.innerHTML='';more.hidden=true;return;}
    if(!values.q.trim() && !values.kind && !values.era && !values.from && !values.to){status.textContent=t("Enter a word, phrase, or name to begin.");results=[];output.innerHTML='';more.hidden=true;if(updateURL)history.replaceState(null,'',location.pathname);return;}
    status.textContent=t("Searching the complete archive…");more.hidden=true;
    if(updateURL){const params=new URLSearchParams(Object.entries(values).filter(([,v])=>v));history.replaceState(null,'',location.pathname+'?'+params);}
    if(!worker){
      try{
        worker=new Worker(new URL('./search-worker.mjs',import.meta.url),{type:'module'});
        worker.onmessage=event=>{
          if(event.data.id!==requestId)return;
          if(event.data.error){status.textContent=event.data.error;return;}
          results=event.data.results;limit=30;render();
        };
        worker.onerror=()=>{status.textContent=t("Search could not start. Refresh the page, or use the story collection and timeline.");worker?.terminate();worker=null;};
      }catch{status.textContent=t("Search could not start in this browser. Use the story collection and timeline.");return;}
    }
    worker.postMessage({id,indexURL,query:values.q,filters:{kind:values.kind,era:values.era,from:values.from,to:values.to}});
  }
  searchForm.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);submit();});
  searchForm.querySelectorAll('select').forEach(el=>el.addEventListener('change',()=>submit()));
  searchForm.querySelector('[name=q]').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>submit(),300);});
  more.addEventListener('click',()=>{limit+=30;render();});
  if(initial.size)submit(false);
}

const readerPage=document.querySelector('[data-reader-page]');
if(readerPage){
 const control=document.querySelector('#reader-text-size');
 let size='standard';try{size=localStorage.getItem('history-reader-text-size')||size;}catch{}
 if(!['standard','large','larger'].includes(size))size='standard';
 readerPage.dataset.textSize=size;if(control)control.value=size;
 control?.addEventListener('change',()=>{readerPage.dataset.textSize=control.value;try{localStorage.setItem('history-reader-text-size',control.value);}catch{}});
 if(control)control.disabled=false;readerPage.dataset.readerReady='true';
}
const bookFilter=document.querySelector('#book-contents-query');
bookFilter?.addEventListener('input',()=>{
 const query=bookFilter.value.normalize('NFKD').toLowerCase().trim();
 for(const group of document.querySelectorAll('.book-contents>details')){
  let visible=0;
  for(const item of group.querySelectorAll('li[data-book-section]')){item.hidden=!item.textContent.normalize('NFKD').toLowerCase().includes(query);if(!item.hidden)visible++;}
  group.hidden=!visible;if(query&&visible)group.open=true;
 }
});

// Older account fragments can be entered either on load or later in the same document.
let readerAnchorPromise,readerFragmentRequest=0;
function routeReaderFragment(){
 const request=++readerFragmentRequest;if(!readerPage||!location.hash)return;
 let anchor='';try{anchor=decodeURIComponent(location.hash.slice(1));}catch{return;}
 if(!anchor||document.getElementById(anchor))return;
 readerAnchorPromise||=fetch(readerPage.dataset.readerAnchorMap).then(response=>response.ok?response.json():{}).catch(()=>{readerAnchorPromise=undefined;return {};});
 readerAnchorPromise.then(anchors=>{
  if(request!==readerFragmentRequest)return;
  const target=anchors[anchor];
  if(typeof target==='string'&&/^stories\/[a-z0-9-]+\/(?:part-\d+\/)?$/.test(target)){
   const destination=`${contentBase}/${target}`;
   if(destination!==location.pathname)location.replace(`${destination}#${encodeURIComponent(anchor)}`);
  }
 });
}
if(readerPage){routeReaderFragment();addEventListener('hashchange',routeReaderFragment);}
