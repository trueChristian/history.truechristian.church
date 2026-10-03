/** Repository-local locale and identity contracts. No network translation service. */
export function validateLocales(config){
  if(!config.locales?.length || !config.locales.some(l=>l.id===config.defaultLocale&&l.published))throw Error('Default locale must be published');
  const ids=new Set();
  for(const locale of config.locales){
    if(!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(locale.id)||ids.has(locale.id))throw Error(`Invalid or duplicate locale: ${locale.id}`);
    if(!locale.name||!locale.nativeName||!['ltr','rtl'].includes(locale.dir))throw Error(`Incomplete locale: ${locale.id}`);
    ids.add(locale.id);
  }
  return config.locales.filter(l=>l.published);
}
export function localePath(locale,route='',base=''){
  if(!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(locale))throw Error('Invalid locale');
  return `${base.replace(/\/$/,'')}/${locale}/${route.replace(/^\//,'')}`;
}
export function translate(ui,key,variables={}){
  return String(ui[key]??key).replace(/\{(\w+)\}/g,(_,name)=>String(variables[name]??`{${name}}`));
}
export function translatedRecord(record,translations,locale,defaultLocale='en'){
  const overlay=translations[record.slug];
  if(overlay){
    const allowed=new Set(['title','summary','paragraphs','aliases','html','text','references','dateLabel','reviewed']);
    for(const key of Object.keys(overlay))if(!allowed.has(key))throw Error(`Translation cannot replace ${key} on ${record.slug}`);
    if(overlay.reviewed!==true || !overlay.title || (!overlay.paragraphs?.length&&!overlay.html))throw Error(`Incomplete reviewed translation: ${locale}/${record.slug}`);
  }
  const result={...record,...overlay,locale,contentLanguage:overlay||locale===defaultLocale?locale:defaultLocale};
  if(overlay?.dateLabel&&record.date)result.date={...record.date,label:overlay.dateLabel};
  if(overlay?.paragraphs){delete result.html;result.text=overlay.paragraphs.join('\n\n');}
  else if(overlay?.html){delete result.paragraphs;result.text=overlay.html.replace(/<\/(?:p|div|li|h[1-6])>/g,'\n\n').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'\"').replace(/&#39;|&#x27;/g,"'").replace(/[ \t]+/g,' ').trim();}
  if(overlay)result.aliases=[...new Set([record.title,...(record.aliases||[]),...(overlay.aliases||[])])];
  return result;
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=value=>value.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'");
/** Translate template labels, never URLs, IDs, attributes controlling behavior, or source prose. */
export function localizeMarkup(markup,ui){
  const protectedParts=markup.split(/(<!--history-content:start-->[\s\S]*?<!--history-content:end-->)/g);
  return protectedParts.map(fragment=>fragment.startsWith('<!--history-content:start-->')?fragment:localizeTemplate(fragment,ui)).join('');
}
function localizeTemplate(markup,ui){
  return markup.split(/(<[^>]+>)/g).map(part=>{
    if(part.startsWith('<'))return part.replace(/\b(aria-label|placeholder|title)="([^"]*)"/g,(all,key,value)=>Object.hasOwn(ui,decode(value))?`${key}="${escape(ui[decode(value)])}"`:all);
    const match=part.match(/^(\s*)([\s\S]*?)(\s*)$/);if(!match)return part;
    const key=decode(match[2]);return Object.hasOwn(ui,key)?match[1]+escape(ui[key])+match[3]:part;
  }).join('');
}

/** Compute reciprocal availability from the complete repository translation set. */
export function availableTranslations(locales,contentId,route,recordTranslations,pageTranslations,defaultLocale='en'){
 const generated=new Set(['','timeline/','branches/','stories/','people/','places/','events/','traditions/','search/','contribute/']);
 return locales.filter(locale=>locale.id===defaultLocale||(contentId?recordTranslations[locale.id]?.[contentId]?.reviewed===true:generated.has(route)||!!pageTranslations[locale.id]?.[route]?.body));
}
