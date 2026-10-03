/** Shared, dependency-free history navigation and search utilities. */
export const REPOSITORY = 'https://github.com/trueChristian/history.truechristian.church';
export const ERAS = [
  {id:'living-traditions', title:'Living traditions', short:'1945–today', start:1945, end:9999, description:'Living communities, worldwide fellowship, and the histories still being gathered.'},
  {id:'across-the-world', title:'Across the world', short:'1800–1944', start:1800, end:1944, description:'Migration, new fellowships, mission, and the challenges of a changing world.'},
  {id:'confession-and-migration', title:'Confession & migration', short:'1600–1799', start:1600, end:1799, description:'Written confessions, the preservation of memory, new branches, and journeys across borders.'},
  {id:'radical-reformation', title:'Radical Reformation', short:'1500–1599', start:1500, end:1599, description:'Believers’ baptism, gathered churches, persecution, and the emergence of distinct Anabaptist streams.'},
  {id:'medieval-witness', title:'Medieval witness', short:'500–1499', start:500, end:1499, description:'The medieval accounts remembered by Martyrs’ Mirror, read in their historical and literary context.'},
  {id:'acts-and-early-church', title:'Acts & the early church', short:'30–499', start:1, end:499, description:'The Christian beginnings and early witnesses to whom later Anabaptists looked for inspiration.'}
];

export function normalize(value='') {
  return String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
    .replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
}
export function eraFor(record) {
  return record.era || ERAS.find(e=>record.date && record.date.start >= e.start && record.date.start <= e.end)?.id || 'source-context';
}
export function escapeHTML(value='') {
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function hash(value) {
  let state=2166136261;
  for (const char of String(value)) state=Math.imul(state ^ char.charCodeAt(0),16777619)>>>0;
  return state;
}
/** One shared daily set, with no repeats between adjacent days for >=12 entries. */
export function dailySelection(records, day=new Date().toISOString().slice(0,10), count=6) {
  const dayNumber=Math.floor(Date.parse(`${day}T00:00:00Z`)/86400000);
  if (!Number.isFinite(dayNumber)) throw new Error('Invalid daily selection date');
  const pool=records.filter(r=>r.kind==='story' && r.status!=='Research needed' && r.textLength>100 && r.category!=='Source context');
  const ordered=[...pool].sort((a,b)=>hash(a.slug)-hash(b.slug)||a.slug.localeCompare(b.slug));
  if (!ordered.length) return [];
  const size=Math.min(count,ordered.length), offset=((dayNumber*size)%ordered.length+ordered.length)%ordered.length;
  return Array.from({length:size},(_,i)=>ordered[(offset+i)%ordered.length]);
}
export function contributionURL(record={}, pageURL='', kind='correction') {
  const missing=kind==='missing' || record.status==='Research needed';
  const title=`${missing?'Add history':'Correction'}: ${record.title||'Anabaptist history'}`;
  const body=[`## Page or topic\n${record.title||'Anabaptist history'}`,
    pageURL?`Page: ${pageURL}`:'', record.slug?`Record: ${record.slug}`:'',
    record.date?`Date currently shown: ${record.date.label}`:'',
    `## ${missing?'History you can add':'Correction or addition'}\n\n`,
    '## Sources and evidence\nPlease include book/page references, archive links, or first-hand documentation.\n\n',
    '## Image credit (if applicable)\nCreator, source, and permission or public-domain basis.\n\n',
    'Submitted for review; this issue does not publish changes automatically.'
  ].filter(Boolean).join('\n\n');
  return `${REPOSITORY}/issues/new?${new URLSearchParams({title,body})}`;
}
export function searchRecords(records, query='', filters={}) {
  const terms=normalize(query).split(' ').filter(Boolean);
  return records.flatMap(record=>{
    if (filters.kind && record.kind!==filters.kind) return [];
    if (filters.era && record.era!==filters.era) return [];
    if (filters.category && record.category!==filters.category) return [];
    if (filters.century && record.century!==Number(filters.century)) return [];
    if (filters.from && (!record.date || record.date.end < Number(filters.from))) return [];
    if (filters.to && (!record.date || record.date.start > Number(filters.to))) return [];
    const title=normalize(record.title), aliases=normalize((record.aliases||[]).join(' '));
    const text=record.normalized || normalize([record.title,record.summary,record.text,...(record.aliases||[])].join(' '));
    if (!terms.every(term=>text.includes(term))) return [];
    const score=terms.reduce((n,term)=>n+(title.includes(term)?20:0)+(aliases.includes(term)?15:0),0)+(record.kind==='person'?5:0);
    return [{record,score}];
  }).sort((a,b)=>b.score-a.score||a.record.title.localeCompare(b.record.title)).map(r=>r.record);
}
