import {normalize,escapeHTML as esc,ERAS} from './history.mjs';
import {translate} from './localization.mjs';
import type {HistoryRecord,BranchData} from './model';

export type TimelineDirection='oldest'|'newest';
export const TIMELINE_DIRECTION_KEY='history-timeline-direction';
export const timelineDirection=(value:unknown):TimelineDirection|undefined=>value==='oldest'||value==='newest'?value:undefined;
export function timelineEras(direction:unknown='oldest'){
  const sign=timelineDirection(direction)==='newest'?-1:1;
  return [...ERAS].sort((a,b)=>sign*(a.start-b.start));
}
export function readTimelineDirection():TimelineDirection{
  try{return timelineDirection(localStorage.getItem(TIMELINE_DIRECTION_KEY))||'oldest';}catch{return 'oldest';}
}
export function saveTimelineDirection(direction:TimelineDirection){
  try{localStorage.setItem(TIMELINE_DIRECTION_KEY,direction);}catch{/* Reading remains available when storage is blocked. */}
}
export interface TimelineFilters {q:string;era:string;kind:string;family:string;direction:string;sources:boolean}
export function primaryTimeline(records:HistoryRecord[]):HistoryRecord[]{
  return records.filter(r=>r.kind!=='story'||(r.headingLevel===3&&!!r.century)||(r.century===1&&r.category==='Source account'));
}
export function selectTimeline(records:HistoryRecord[],branches:BranchData,filters:TimelineFilters):HistoryRecord[]{
  let pool=filters.sources||filters.kind==='story'?records:primaryTimeline(records);
  if(filters.era)pool=pool.filter(r=>r.era===filters.era);
  if(filters.kind)pool=pool.filter(r=>r.kind===filters.kind);
  if(filters.family){
    const slugs=new Set(branches.nodes.filter(n=>n.family===filters.family).map(n=>n.slug));
    pool=pool.filter(r=>slugs.has(r.slug)||r.traditions.some(s=>slugs.has(s)));
  }
  const terms=normalize(filters.q).split(' ').filter(Boolean);
  if(terms.length)pool=pool.filter(r=>terms.every(term=>normalize([r.title,r.summary,...r.aliases].join(' ')).includes(term)));
  const sign=timelineDirection(filters.direction)==='newest'?-1:1;
  const eraOrder=new Map(timelineEras().map((era,index)=>[era.id,index]));
  return [...pool].sort((a,b)=>{
    const aEra=eraOrder.get(a.era),bEra=eraOrder.get(b.era);
    // Undated source context stays after the historical eras in either direction.
    if(aEra===undefined&&bEra!==undefined)return 1;
    if(bEra===undefined&&aEra!==undefined)return -1;
    const eraDifference=sign*((aEra??ERAS.length)-(bEra??ERAS.length));
    if(eraDifference)return eraDifference;
    // The Acts overview opens the first era; this is presentation order, not a date claim.
    const overview=sign*(Number(b.slug==='christian-beginnings')-Number(a.slug==='christian-beginnings'));
    if(overview)return overview;
    if(!a.date&&b.date)return 1;
    if(!b.date&&a.date)return -1;
    return sign*((a.date?.start??0)-(b.date?.start??0))||a.slug.localeCompare(b.slug);
  });
}
export function timelineMarkup(records:HistoryRecord[],all:HistoryRecord[],branches:BranchData,base:string,ui:Record<string,string>={}):string{
  const t=(key:string,vars:Record<string,string|number>={})=>translate(ui,key,vars);
  const bySlug=new Map(all.map(r=>[r.slug,r]));
  const seenEras=new Set<string>();
  return records.map(r=>{
    const family=branches.nodes.find(n=>n.slug===r.slug)?.family||'';
    const edges=branches.edges.filter(e=>e.from===r.slug||e.to===r.slug);
    const related=[...new Set([...r.people,...r.traditions,...r.places,...(r.sourceAccounts||[]),...edges.map(e=>e.from===r.slug?e.to:e.from)])].filter(s=>s!==r.slug).map(s=>bySlug.get(s)).filter((v):v is HistoryRecord=>!!v);
    const era=ERAS.find(e=>e.id===r.era);
    const eraTitle=!seenEras.has(r.era)?`<div class="atlas-era" id="era-${r.era}"><span>${esc(era?.short||'Source context')}</span><h2>${esc(t(era?.title||'Source context'))}</h2></div>`:'';
    seenEras.add(r.era);
    const century=r.kind==='story'&&r.headingLevel===3&&r.century;
    const ordinal=(n:number)=>String(n)+(n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'} as Record<number,string>)[n%10]||'th');
    const year=r.date?.label||(r.slug==='christian-beginnings'?'Acts and Christian beginnings':t(r.era==='living-traditions'?'Living history':'Date not assigned'));
    return `${eraTitle}<article id="record-${r.slug}" class="atlas-entry${century?' is-source':''}" data-record="${r.slug}" data-family="${family}"><span class="atlas-port" aria-hidden="true"></span><div class="atlas-entry-top"><span class="atlas-date">${esc(year)}</span><span class="atlas-kind">${esc(t(century?'Martyrs’ Mirror · century guide':r.kind==='story'?'Martyrs’ Mirror · source account':r.kind))}</span></div><h3><a href="${base}/${r.route}">${esc(r.title)}</a></h3><p>${esc(r.summary)}</p>${related.length?`<div class="atlas-relations">${related.slice(0,5).map(x=>`<a href="${base}/${x.route}">${esc(x.title)}</a>`).join('')}${related.length>5?`<a href="${base}/${r.route}">${esc(t('All {count} connections →',{count:related.length}))}</a>`:''}</div>`:''}${century?`<a class="atlas-source-link" href="${base}/stories/?era=${r.era}&century=${r.century}">${esc(t('Read the {century}-century accounts →',{century:ordinal(r.century!)}))}</a>`:''}<div class="atlas-entry-foot"><a href="${base}/${r.route}">${esc(t(century?'Read the source guide →':'Read the history →'))}</a>${r.kind!=='story'?`<a href="${base}/search/?q=${encodeURIComponent((r.aliases[0]||r.title).replace(/[:–].*$/,''))}&kind=story">${esc(t('Find related source accounts'))}</a>`:''}</div></article>`;
  }).join('');
}
