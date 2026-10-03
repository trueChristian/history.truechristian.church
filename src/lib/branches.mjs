export function validateBranches(data,records){
  const bySlug=new Map(records.map(r=>[r.slug,r]));
  const slugs=new Set(data.nodes.map(n=>n.slug));
  if(slugs.size!==data.nodes.length)throw new Error('Duplicate branch node');
  for(const n of data.nodes){
    const r=bySlug.get(n.slug);
    if(!r || r.kind!=='tradition' || !r.date || n.year!==r.date.start)throw new Error(`Invalid branch date or record: ${n.slug}`);
    if(!data.families.some(f=>f.id===n.family))throw new Error(`Unknown branch family: ${n.family}`);
  }
  for(const e of data.edges)if(!slugs.has(e.from)||!slugs.has(e.to)||!e.label||!e.source||e.from===e.to)throw new Error('Invalid branch connection');
  const visit=(slug,stack=new Set())=>{
    if(stack.has(slug))throw new Error('Circular branch ancestry');
    const next=new Set([...stack,slug]);
    for(const e of data.edges.filter(e=>e.from===slug))visit(e.to,next);
  };
  for(const slug of slugs)visit(slug);
  return true;
}
