import {selectTimeline,timelineMarkup} from './lib/timeline';
import type {TimelineFilters} from './lib/timeline';
import type {HistoryRecord,BranchData} from './lib/model';

const form=document.querySelector<HTMLFormElement>('#timeline-filters');
if(form){
  const entries=document.querySelector<HTMLDivElement>('#timeline-entries')!;
  const threads=document.querySelector<SVGSVGElement>('#timeline-threads')!;
  const status=document.querySelector<HTMLParagraphElement>('#timeline-status')!;
  const more=document.querySelector<HTMLButtonElement>('#timeline-more')!;
  const base=document.documentElement.dataset.base||'';
  let records:HistoryRecord[]=[],branches:BranchData,matches:HistoryRecord[]=[],limit=200;
  const params=new URLSearchParams(location.search);
  const control=(name:string)=>form.elements.namedItem(name) as HTMLInputElement|HTMLSelectElement;
  for(const name of ['q','era','family','kind','direction'])if(params.has(name)){
    const value=params.get(name)!;const el=control(name);
    if(el instanceof HTMLInputElement||[...el.options].some(o=>o.value===value))el.value=value;
  }
  (control('sources') as HTMLInputElement).checked=params.get('sources')==='1';
  function readFilters():TimelineFilters{return {q:control('q').value,era:control('era').value,kind:control('kind').value,family:control('family').value,direction:control('direction').value,sources:(control('sources') as HTMLInputElement).checked};}
  const svgNS='http://www.w3.org/2000/svg';
  function drawConnections(){
    if(!branches)return;
    threads.replaceChildren();
    const height=entries.offsetHeight;
    threads.setAttribute('viewBox',`0 0 64 ${height}`);threads.style.height=`${height}px`;
    const positions=new Map<string,number>();
    entries.querySelectorAll<HTMLElement>('[data-record]').forEach(el=>positions.set(el.dataset.record!,el.offsetTop+35));
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
    const filters=readFilters();matches=selectTimeline(records,branches,filters);
    const visible=matches.slice(0,limit);
    entries.innerHTML=visible.length?timelineMarkup(visible,records,branches,base):'<div class="atlas-empty"><h2>No histories match this view</h2><p>Choose a wider era, another stream, or reset the filters.</p></div>';
    status.textContent=`${matches.length.toLocaleString()} histories · showing ${visible.length}${filters.direction==='oldest'?' · beginnings to present':' · present to beginnings'}`;
    more.hidden=limit>=matches.length;
    if(updateURL){const p=new URLSearchParams();for(const [key,value]of Object.entries(filters))if(value && !(key==='direction'&&value==='newest'))p.set(key,value===true?'1':String(value));history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
    requestAnimationFrame(drawConnections);
  }
  function filter(){limit=200;render();}
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('change',filter);
  let timer:ReturnType<typeof setTimeout>;
  control('q').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(filter,180);});
  form.addEventListener('reset',()=>{setTimeout(()=>{control('kind').value='';limit=200;render();},0);});
  more.addEventListener('click',()=>{limit+=100;render(false);});
  document.querySelectorAll<HTMLAnchorElement>('[data-atlas-era]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();control('era').value=link.dataset.atlasEra!;filter();document.querySelector('.atlas-main')?.scrollIntoView({block:'start',behavior:'smooth'});
  }));
  function highlight(event:Event){
    const entry=(event.target as Element).closest<HTMLElement>('[data-record]');
    threads.querySelectorAll<SVGPathElement>('.timeline-thread').forEach(path=>path.classList.toggle('is-focused',!!entry&&[path.dataset.from,path.dataset.to].includes(entry.dataset.record)));
  }
  entries.addEventListener('pointerover',highlight);entries.addEventListener('focusin',highlight);
  entries.addEventListener('pointerleave',()=>threads.querySelectorAll('.is-focused').forEach(p=>p.classList.remove('is-focused')));
  new ResizeObserver(drawConnections).observe(entries);
  Promise.all([fetch(`${base}/assets/catalog.json`).then(r=>{if(!r.ok)throw Error('Timeline catalogue unavailable');return r.json();}),fetch(`${base}/assets/branches.json`).then(r=>{if(!r.ok)throw Error('Branch catalogue unavailable');return r.json();})]).then(([r,b]:[HistoryRecord[],BranchData])=>{records=r;branches=b;render(false);}).catch(()=>{status.textContent='The timeline is readable below. Reload to use the filters.';});
}
