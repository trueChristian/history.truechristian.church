/**
 * Locale-neutral source-reader model. Page boundaries and identities come only
 * from the committed source manifest; translated word counts never repaginate it.
 * The original HTML is an ingestion/provenance file, not the reading interface.
 */
const safeBase=base=>{
  const value=String(base||'').replace(/\/$/,'');
  if(value&&!/^\/(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+$/.test(value))throw Error('Invalid reader base path');
  return value;
};
const safeLocale=locale=>{
  if(!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(locale))throw Error('Invalid reader locale');
  return locale;
};
const attribute=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function readerHref(page,{base='',locale='en'}={}){
  if(!page?.route||!/^stories\/[a-z0-9-]+\/(?:part-\d+\/)?$/.test(page.route))throw Error('Invalid reader page route');
  return `${safeBase(base)}/${safeLocale(locale)}/${page.route}`;
}

/** Rewrite source links to their exact native owner, including note backlinks. */
export function remapReaderLinks(markup,anchorToPage,{base='',locale='en'}={}){
  const prefix=safeBase(base);
  safeLocale(locale);
  return String(markup).replaceAll('__BASE__',prefix).replace(/\bhref="([^"]*)"/g,(attributeText,href)=>{
    const fragment=href.startsWith('#')?href.slice(1):
      href.match(/(?:^|\/)sources\/martyrs-mirror\/original\.html#(.+)$/)?.[1];
    if(fragment===undefined)return attributeText;
    const target=anchorToPage instanceof Map?anchorToPage.get(fragment):anchorToPage[fragment];
    if(!target)throw Error(`Unknown reader source anchor: ${fragment}`);
    return `href="${attribute(readerHref(target,{base:prefix,locale})+'#'+fragment)}"`;
  });
}

/**
 * Return pages, ordered sections, and Maps byRecord, byPageId, and anchorToPage.
 * headingHtml is INNER HTML for a native h1 (original note links are retained).
 * blocks is the semantic source model; html is its precompiled rendering cache.
 * First pages retain the existing story slug/route. Source material is English
 * until the caller supplies a reviewed page overlay keyed by immutable page.id.
 */
export function buildReader(manifest,{base='',locale='en'}={}){
  safeBase(base);safeLocale(locale);
  if(manifest?.schemaVersion!==1||manifest.segmentationVersion!==1)throw Error('Unsupported reader manifest');
  if(!Array.isArray(manifest.pages)||manifest.pageCount!==manifest.pages.length)throw Error('Invalid reader page count');
  const pages=manifest.pages.map(page=>({...page,contentLanguage:manifest.sourceLanguage||'en',locale}));
  const byPageId=new Map(),byRecord=new Map(),anchorToPage=new Map();
  for(const [index,page] of pages.entries()){
    if(byPageId.has(page.id))throw Error(`Duplicate reader page: ${page.id}`);
    if(page.bookIndex!==index)throw Error('Reader pages are out of book order');
    if(page.wordCount>manifest.maxWords)throw Error(`Reader page exceeds word limit: ${page.id}`);
    if(page.html!==page.blocks.map(block=>block.html).join(''))throw Error(`Reader block/render mismatch: ${page.id}`);
    page.url=readerHref(page,{base,locale});
    byPageId.set(page.id,page);
    if(!byRecord.has(page.recordSlug))byRecord.set(page.recordSlug,[]);
    byRecord.get(page.recordSlug).push(page);
    for(const anchor of page.sourceAnchorIds){
      if(anchorToPage.has(anchor))throw Error(`Duplicate reader source anchor: ${anchor}`);
      anchorToPage.set(anchor,page);
    }
  }
  for(const [anchor,pageId] of Object.entries(manifest.anchorToPage)){
    if(anchorToPage.get(anchor)?.id!==pageId)throw Error(`Reader anchor ownership mismatch: ${anchor}`);
  }
  if(anchorToPage.size!==manifest.sourceAnchorCount)throw Error('Reader source anchor count mismatch');
  for(const [index,page] of pages.entries()){
    if(page.previousId!==(pages[index-1]?.id||null)||page.nextId!==(pages[index+1]?.id||null))throw Error(`Broken reader sequence: ${page.id}`);
    page.previousRoute=byPageId.get(page.previousId)?.route||null;
    page.nextRoute=byPageId.get(page.nextId)?.route||null;
    page.html=remapReaderLinks(page.html,anchorToPage,{base,locale});
    page.headingHtml=remapReaderLinks(page.headingHtml,anchorToPage,{base,locale});
    page.blocks=page.blocks.map(block=>({...block,html:remapReaderLinks(block.html,anchorToPage,{base,locale})}));
  }
  for(const [recordSlug,recordPages] of byRecord){
    for(const [index,page] of recordPages.entries()){
      if(page.part!==index+1||page.partCount!==recordPages.length)throw Error(`Broken account sequence: ${recordSlug}`);
    }
  }
  return {pages,sections:manifest.sections,byRecord,byPageId,anchorToPage,
          contentsRoute:'sources/martyrs-mirror/',firstPage:pages[0],lastPage:pages.at(-1)};
}
