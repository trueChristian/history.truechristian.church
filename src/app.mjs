import {dailySelection,ERAS,escapeHTML as esc,searchRecords} from './lib/history.mjs';

const base=document.documentElement.dataset.base||'';
const route=value=>`${base}/${value}`;
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

function activateEra(){
  if(!document.querySelector('[data-era-panel]'))return;
  const active=ERAS.some(e=>'#'+e.id===location.hash)?location.hash.slice(1):ERAS[0].id;
  document.querySelectorAll('[data-era-panel]').forEach(el=>el.hidden=el.dataset.eraPanel!==active);
  document.querySelectorAll('[data-era-link]').forEach(el=>{
    const selected=el.dataset.eraLink===active;
    el.classList.toggle('is-current',selected);
    if(selected)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');
  });
}
addEventListener('hashchange',activateEra);activateEra();

let catalogPromise;
function loadCatalog(){
  return catalogPromise||=fetch(new URL('./catalog.json',import.meta.url)).then(response=>{
    if(!response.ok)throw new Error('Could not load the archive. Please refresh and try again.');
    return response.json();
  }).catch(error=>{catalogPromise=undefined;throw error;});
}
function card(record){
  return `<article class="story-card"><div class="card-meta"><span>${esc(record.date?.label||'Date to document')}</span><span>${esc(record.kind==='story'?record.category:record.kind)}</span></div><h3><a href="${route(record.route)}">${esc(record.title)}</a></h3><p>${esc(record.summary||'Read this section in the source collection.')}</p><span class="card-action">${record.status==='Research needed'?'Help document this history':'Read the story'} <span aria-hidden="true">→</span></span></article>`;
}
const cards=items=>`<div class="card-grid">${items.map(card).join('')}</div>`;
let dailyDay='';
async function refreshDaily(){
  const target=document.querySelector('#daily-stories');if(!target)return;
  const day=new Date().toISOString().slice(0,10);if(day===dailyDay)return;
  try{
    target.innerHTML=cards(dailySelection(await loadCatalog(),day));
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
    output.innerHTML=matches.length?cards(matches.slice(0,limit)):'<p>No source sections match these filters. Try a different spelling or era.</p>';
    count.textContent=`${matches.length.toLocaleString()} source sections · showing ${Math.min(limit,matches.length)}`;
    more.hidden=limit>=matches.length;
  };
  async function filter(updateURL=true){
    const id=++sequence,values=Object.fromEntries(new FormData(archiveForm));
    try{
      const catalog=await loadCatalog();if(id!==sequence)return;
      matches=searchRecords(catalog.filter(r=>r.kind==='story'),values.q,{era:values.era,category:values.category});limit=36;render();
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
    output.innerHTML=results.length?cards(results.slice(0,limit)):'<p>No results found. Try an alternate spelling, fewer words, or a wider date range.</p>';
    status.textContent=`${results.length.toLocaleString()} results · showing ${Math.min(limit,results.length)}`;
    more.hidden=limit>=results.length;
  };
  const initial=new URLSearchParams(location.search);
  for(const control of searchForm.elements)if(control.name && initial.has(control.name))control.value=initial.get(control.name);
  function submit(updateURL=true){
    const id=++requestId;
    const values=Object.fromEntries(new FormData(searchForm));
    if(values.from && values.to && Number(values.from)>Number(values.to)){status.textContent='The start year must be before the end year.';results=[];output.innerHTML='';more.hidden=true;return;}
    if(!values.q.trim() && !values.kind && !values.era && !values.from && !values.to){status.textContent='Enter a word, phrase, or name to begin.';results=[];output.innerHTML='';more.hidden=true;if(updateURL)history.replaceState(null,'',location.pathname);return;}
    status.textContent='Searching the complete archive…';more.hidden=true;
    if(updateURL){const params=new URLSearchParams(Object.entries(values).filter(([,v])=>v));history.replaceState(null,'',location.pathname+'?'+params);}
    if(!worker){
      try{
        worker=new Worker(new URL('./search-worker.mjs',import.meta.url),{type:'module'});
        worker.onmessage=event=>{
          if(event.data.id!==requestId)return;
          if(event.data.error){status.textContent=event.data.error;return;}
          results=event.data.results;limit=30;render();
        };
        worker.onerror=()=>{status.textContent='Search could not start. Refresh the page, or use the story collection and timeline.';worker?.terminate();worker=null;};
      }catch{status.textContent='Search could not start in this browser. Use the story collection and timeline.';return;}
    }
    worker.postMessage({id,query:values.q,filters:{kind:values.kind,era:values.era,from:values.from,to:values.to}});
  }
  searchForm.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);submit();});
  searchForm.querySelectorAll('select').forEach(el=>el.addEventListener('change',()=>submit()));
  searchForm.querySelector('[name=q]').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>submit(),300);});
  more.addEventListener('click',()=>{limit+=30;render();});
  if(initial.size)submit(false);
}
