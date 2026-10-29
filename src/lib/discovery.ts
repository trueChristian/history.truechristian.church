import {selectTimeline, timelineEras} from './timeline.ts';
import type {HistoryRecord, BranchData} from './model';

/** Use only the already published, localized catalogue; never the demo's sample records. */
export function discoveryGroups(records:HistoryRecord[], branches:BranchData) {
  const ordered=selectTimeline(records,branches,{q:'',era:'',kind:'',family:'',direction:'oldest',sources:true});
  const eras=[...timelineEras(),{id:'source-context',title:'Source context',short:'Undated',start:0,end:0,description:'Introductions, letters, and context from the source collection.'}];
  return eras.map(era=>{
    const all=ordered.filter(record=>record.era===era.id);
    // Start with approachable authored histories; keep every source account in the disclosure.
    const opening=all.filter(record=>record.kind!=='story').slice(0,5);
    if(!opening.length)opening.push(...all.slice(0,5));
    const selected=new Set(opening.map(record=>record.slug));
    return {...era,opening,more:all.filter(record=>!selected.has(record.slug)),count:all.length};
  }).filter(era=>era.count>0);
}

/** Only navigation labels are shortened. The reader retains the published heading. */
export function discoveryLabel(title:string) {
  return title.length<=110?title:title.slice(0,107).replace(/\s+\S*$/,'')+'…';
}
