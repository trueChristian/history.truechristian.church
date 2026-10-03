import {selectTimeline,timelineMarkup,timelineEras,timelineDirection,readTimelineDirection,saveTimelineDirection} from './lib/timeline';
import type {TimelineFilters} from './lib/timeline';
import type {HistoryRecord,BranchData} from './lib/model';
import {t,messages,contentBase,catalogURL,branchesURL} from './ui.mjs';
import {ERAS} from './lib/history.mjs';

const form=document.querySelector<HTMLFormElement>('#timeline-filters');
if(form){
  const entries=document.querySelector<HTMLDivElement>('#timeline-entries')!;
  const threads=document.querySelector<SVGSVGElement>('#timeline-threads')!;
  const status=document.querySelector<HTMLParagraphElement>('#timeline-status')!;
  const more=document.querySelector<HTMLButtonElement>('#timeline-more')!;
  let records:HistoryRecord[]=[],branches:BranchData|undefined,matches:HistoryRecord[]=[],limit=200;
  const control=(name:string)=>form.elements.namedItem(name) as HTMLInputElement|HTMLSelectElement;
  const initialKind=document.querySelector<HTMLElement>('.history-atlas')?.dataset.initialKind||'';
  function restoreURL(){
    const params=new URLSearchParams(location.search);
    for(const name of ['q','era','family','kind','direction']){
      const el=control(name),fallback=name==='direction'?(timelineDirection(history.state?.timelineDirection)||readTimelineDirection()):name==='kind'?initialKind:'';
      const value=params.get(name)||fallback;
      if(el instanceof HTMLInputElement||[...el.options].some(o=>o.value===value))el.value=value;
      else el.value=fallback;
    }
    (control('sources') as HTMLInputElement).checked=params.get('sources')==='1';
    const hashEra=location.hash.replace(/^#(?:era-)?/,'');
    if(!params.has('era')&&ERAS.some(era=>era.id===hashEra))control('era').value=hashEra;
  }
  restoreURL();
  function readFilters():TimelineFilters{return {q:control('q').value,era:control('era').value,kind:control('kind').value,family:control('family').value,direction:control('direction').value,sources:(control('sources') as HTMLInputElement).checked};}
  const svgNS='http://www.w3.org/2000/svg';
  function drawConnections(){
    if(!branches)return;
    threads.replaceChildren();
    const height=entries.offsetHeight;
    threads.setAttribute('viewBox',`0 0 64 ${height}`);threads.setAttribute('preserveAspectRatio','none');threads.style.height=`${height}px`;
    const positions=new Map<string,number>();
    const canvasTop=entries.getBoundingClientRect().top;
    entries.querySelectorAll<HTMLElement>('[data-record]').forEach(el=>{
      const port=el.querySelector<HTMLElement>('.atlas-port')!;
      const box=port.getBoundingClientRect();positions.set(el.dataset.record!,box.top-canvasTop+box.height/2);
    });
    const spine=document.createElementNS(svgNS,'path');spine.setAttribute('d',`M54 0V${height}`);spine.classList.add('timeline-spine');threads.append(spine);
    const connected=branches.edges.filter(e=>positions.has(e.from)&&positions.has(e.to));
    connected.forEach((edge,i)=>{
      const y1=positions.get(edge.from)!,y2=positions.get(edge.to)!,x=8+(i%6)*7;
      const path=document.createElementNS(svgNS,'path');path.setAttribute('d',`M60 ${y1}H${x+6}Q${x} ${y1} ${x} ${y1+(y2>y1?6:-6)}V${y2+(y2>y1?-6:6)}Q${x} ${y2} ${x+6} ${y2}H60`);
      path.classList.add('timeline-thread');path.dataset.from=edge.from;path.dataset.to=edge.to;
      if(['influence','association','cooperation','community-account'].includes(edge.type))path.classList.add('is-dashed');
      const title=document.createElementNS(svgNS,'title');title.textContent=edge.label;path.append(title);threads.append(path);
    });
  }
  function render(updateURL=true){
    if(!branches)return;
    const filters=readFilters();matches=selectTimeline(records,branches,filters);
    const visible=matches.slice(0,limit);
    entries.innerHTML=visible.length?timelineMarkup(visible,records,branches,contentBase,messages):`<div class="atlas-empty"><h2>${t('No histories match this view')}</h2><p>${t('Choose a wider era, another stream, or reset the filters.')}</p></div>`;
    status.textContent=t('{count} histories · showing {shown} · {direction}',{count:matches.length.toLocaleString(),shown:visible.length,direction:t(filters.direction==='oldest'?'beginnings to present':'present to beginnings')});
    more.hidden=limit>=matches.length;
    for(const era of timelineEras(filters.direction)){
      const link=document.querySelector<HTMLAnchorElement>(`[data-atlas-era="${era.id}"]`);
      if(link)link.parentElement!.append(link);
      const option=control('era').querySelector<HTMLOptionElement>(`option[value="${era.id}"]`);
      if(option)control('era').append(option);
    }
    if(updateURL){
      const p=new URLSearchParams();for(const [key,value]of Object.entries(filters))if(value)p.set(key,value===true?'1':String(value));
      const next=location.pathname+(p.size?'?'+p:'');
      if(next!==location.pathname+location.search+location.hash)history.pushState({...history.state,timelineDirection:filters.direction},'',next);
    }
    history.replaceState({...history.state,timelineDirection:filters.direction},'',location.href);
    document.querySelectorAll<HTMLAnchorElement>('[data-atlas-era]').forEach(link=>{
      if(link.dataset.atlasEra===filters.era)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');
    });
    requestAnimationFrame(drawConnections);
  }
  function filter(){limit=200;render();}
  form.addEventListener('submit',e=>{e.preventDefault();filter();});
  form.addEventListener('change',event=>{
    if(event.target===control('direction'))saveTimelineDirection(timelineDirection(control('direction').value)||'oldest');
    filter();
  });
  let timer:ReturnType<typeof setTimeout>;
  control('q').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(filter,180);});
  form.addEventListener('reset',()=>{const direction=control('direction').value;clearTimeout(timer);setTimeout(()=>{control('direction').value=direction;control('kind').value=initialKind;limit=200;render();},0);});
  more.addEventListener('click',()=>{limit+=100;render(false);});
  document.querySelectorAll<HTMLAnchorElement>('[data-atlas-era]').forEach(link=>link.addEventListener('click',event=>{
    if(!branches||initialKind)return;event.preventDefault();control('era').value=link.dataset.atlasEra!;filter();
    document.querySelector('.atlas-main')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  }));
  function highlight(event:Event){
    const entry=(event.target as Element).closest<HTMLElement>('[data-record]');
    threads.querySelectorAll<SVGPathElement>('.timeline-thread').forEach(path=>path.classList.toggle('is-focused',!!entry&&[path.dataset.from,path.dataset.to].includes(entry.dataset.record)));
  }
  const clearFocus=()=>threads.querySelectorAll('.is-focused').forEach(p=>p.classList.remove('is-focused'));
  entries.addEventListener('pointerover',highlight);entries.addEventListener('focusin',highlight);
  entries.addEventListener('pointerleave',clearFocus);entries.addEventListener('focusout',clearFocus);
  addEventListener('popstate',()=>{restoreURL();limit=200;render(false);});
  addEventListener('hashchange',()=>{restoreURL();limit=200;render(false);});
  new ResizeObserver(drawConnections).observe(entries);
  document.fonts.ready.then(drawConnections);
  Promise.all([fetch(catalogURL!).then(r=>{if(!r.ok)throw Error('Timeline catalogue unavailable');return r.json();}),fetch(branchesURL!).then(r=>{if(!r.ok)throw Error('Branch catalogue unavailable');return r.json();})]).then(([r,b]:[HistoryRecord[],BranchData])=>{records=r;branches=b;render(false);control('direction').disabled=false;document.querySelector<HTMLElement>('.history-atlas')!.dataset.ready='true';}).catch(()=>{status.textContent=t('The timeline is readable below. Reload to use the filters.');});
}
