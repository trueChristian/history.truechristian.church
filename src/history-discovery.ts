import {t} from './ui.mjs';
import {createDiscoveryMotion} from './history-discovery-motion';

interface TimelinePosition {y:number;anchor?:{id:string;top:number};expanded:string[];era:number;focus?:string}
interface DiscoveryState extends TimelinePosition {route:string;depth:number;origin?:TimelinePosition}

const root=document.querySelector<HTMLElement>('[data-home-history]');
if(root)initializeDiscovery(root);

function initializeDiscovery(root:HTMLElement) {
  const titles=root.querySelector<HTMLElement>('.discovery-titles')!;
  const reader=root.querySelector<HTMLElement>('.discovery-reader')!;
  const article=root.querySelector<HTMLElement>('[data-discovery-article]')!;
  const original=root.querySelector<HTMLAnchorElement>('[data-discovery-original]')!;
  const status=root.querySelector<HTMLElement>('[data-discovery-status]')!;
  const wheel=root.querySelector<HTMLElement>('.discovery-wheel')!;
  const marker=root.querySelector<HTMLElement>('.discovery-marker')!;
  const bands=[...root.querySelectorAll<HTMLAnchorElement>('[data-discovery-band]')];
  const sections=[...root.querySelectorAll<HTMLElement>('[data-discovery-era]')];
  const links=[...titles.querySelectorAll<HTMLAnchorElement>('[data-discovery-open]')];
  const byRoute=new Map(links.map(link=>[link.dataset.discoveryOpen!,link]));
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const movement=createDiscoveryMotion({titles,wheel,bands,marker,motion});
  const base=root.dataset.contentBase!+'/';
  const pageTitle=document.title;
  const cache=new Map<string,string>();
  let state:DiscoveryState={route:'',depth:0,y:scrollY,era:0,expanded:[]};
  let request=0,controller:AbortController|undefined,changing=false,frame=0;
  let saveTimer:ReturnType<typeof setTimeout>|undefined;
  let wheelFocus:number|null=null,pinnedY:number|null=null;
  let animation:Animation|undefined;

  const top=()=>parseFloat(getComputedStyle(root).getPropertyValue('--discovery-top'))||116;
  const pageY=(element:Element)=>element.getBoundingClientRect().top+scrollY;
  const routeURL=(route:string)=>new URL(base+route,location.origin);
  function routeFor(url:URL):string {
    if(url.origin!==location.origin||!url.pathname.startsWith(base))return '';
    const route=url.pathname.slice(base.length);
    return /^(?:people|events|traditions|places|stories)\/[a-z0-9-]+\/(?:part-\d+\/)?$/.test(route)?route:'';
  }
  function locationRoute() {
    const route=new URL(location.href).searchParams.get('history')||'';
    return routeFor(routeURL(route));
  }
  function urlFor(route:string,hash='') {
    const url=new URL(location.href);
    if(route)url.searchParams.set('history',route);else url.searchParams.delete('history');
    url.hash=hash;return url;
  }
  function snapshot(focus?:HTMLAnchorElement):TimelinePosition {
    const focused=focus||(document.activeElement instanceof HTMLAnchorElement&&titles.contains(document.activeElement)?document.activeElement:undefined);
    const anchor=focused||links.find(link=>link.checkVisibility()&&link.getBoundingClientRect().bottom>top()+30);
    return {y:scrollY,era:state.era,expanded:[...titles.querySelectorAll<HTMLDetailsElement>('details[open]')].map(el=>el.id),
      anchor:anchor?{id:anchor.id,top:anchor.getBoundingClientRect().top}:undefined,focus:focused?.id};
  }
  function remember() {
    if(changing)return;
    state={...state,...(state.route?{y:scrollY}:snapshot())};
    history.replaceState({...history.state,historyDiscovery:state},'',location.href);
  }
  function setEra(index:number) {
    state.era=Math.max(0,Math.min(bands.length-1,index));
    bands.forEach((band,i)=>band.setAttribute('aria-current',String(i===state.era)));
  }
  function progress() {
    if(state.route||changing||pinnedY!==null)return state.era;
    const line=scrollY+top()+Math.min(200,(innerHeight-top())*.3);
    const anchors=sections.map(section=>pageY(section));
    for(let i=0;i<anchors.length-1;i++)if(line<anchors[i+1])return i+Math.max(0,Math.min(1,(line-anchors[i])/(anchors[i+1]-anchors[i])));
    return anchors.length-1;
  }
  function renderWheel(snap=false) {
    movement.update(wheelFocus??progress(),state.era,snap);
  }
  function onScroll() {
    frame=0;
    if(!changing&&!state.route){
      if(pinnedY!==null&&Math.abs(scrollY-pinnedY)>2)pinnedY=null;
      if(pinnedY===null){
        const line=top()+Math.min(200,(innerHeight-top())*.3);
        let index=0;
        sections.forEach((section,i)=>{if(section.getBoundingClientRect().top<=line)index=i;});
        setEra(index);
      }
    }
    renderWheel();
    clearTimeout(saveTimer);if(!changing)saveTimer=setTimeout(remember,180);
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(onScroll);};
  async function animate(element:HTMLElement,opening:boolean) {
    if(motion.matches||!element.animate)return;
    animation?.cancel();
    animation=element.animate(opening?[{opacity:0,transform:'translateX(-45px)'},{opacity:1,transform:'none'}]:[{opacity:1,transform:'none'},{opacity:0,transform:'translateX(80px) scaleX(.94)'}],{duration:opening?280:180,easing:'cubic-bezier(.22,.75,.2,1)'});
    try{await animation.finished;}catch{/* A newer navigation cancels the old transition. */}
  }
  function restore(position:TimelinePosition,focus=true) {
    titles.querySelectorAll<HTMLDetailsElement>('details').forEach(detail=>{detail.open=position.expanded.includes(detail.id);});
    const anchor=position.anchor&&document.getElementById(position.anchor.id);
    scrollTo({top:anchor?pageY(anchor)-position.anchor!.top:position.y,behavior:'instant'});
    if(focus&&position.focus)document.getElementById(position.focus)?.focus({preventScroll:true});
    pinnedY=scrollY;
  }
  function showFragment(hash:string) {
    if(!hash)return false;
    let id='';try{id=decodeURIComponent(hash.slice(1));}catch{return false;}
    const target=document.getElementById(id);
    if(!target||!article.contains(target))return false;
    target.scrollIntoView({block:'start',behavior:'instant'});
    target.setAttribute('tabindex','-1');target.focus({preventScroll:true});return true;
  }
  function prepareArticle(html:string,url:URL) {
    const parsed=new DOMParser().parseFromString(html,'text/html');
    const body=parsed.querySelector<HTMLElement>('.reading-page,.reader-page');
    if(!body)throw new Error('Missing article');
    // Keep canonical links usable outside this enhanced reader, including source fragments.
    body.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link=>{link.href=new URL(link.getAttribute('href')!,url).href;});
    body.querySelectorAll<HTMLImageElement>('img[src]').forEach(img=>{img.src=new URL(img.getAttribute('src')!,url).href;});
    body.querySelectorAll('script').forEach(script=>script.remove());
    // The period wheel is the orientation control here; retain the source page list and text size.
    body.querySelector('.reader-position')?.remove();
    body.querySelector('.reader-breadcrumbs')?.remove();
    article.replaceChildren();
    const fallback=parsed.querySelector('.translation-notice');if(fallback)article.append(fallback);
    article.append(body);
    const control=body.querySelector<HTMLSelectElement>('#reader-text-size');
    if(control){
      let size='standard';try{size=localStorage.getItem('history-reader-text-size')||size;}catch{}
      control.value=['standard','large','larger'].includes(size)?size:'standard';
      body.dataset.textSize=control.value;control.disabled=false;
      control.addEventListener('change',()=>{body.dataset.textSize=control.value;try{localStorage.setItem('history-reader-text-size',control.value);}catch{}});
    }
    const heading=body.querySelector<HTMLElement>('h1');heading?.setAttribute('tabindex','-1');
    document.title=(heading?.textContent||pageTitle)+' · '+t('Navigate the history');
    return heading;
  }
  async function display(next:DiscoveryState,{initial=false,restorePosition=false}={}) {
    const token=++request;controller?.abort();animation?.cancel();clearTimeout(saveTimer);
    changing=true;root.dataset.changing='true';root.setAttribute('aria-busy','true');
    const previous=state;state=next;setEra(next.era);wheelFocus=null;
    if(!next.route){
      if(previous.route&&!initial)await animate(reader,false);
      if(token!==request)return;
      reader.hidden=true;titles.hidden=false;document.title=pageTitle;
      restore(next,!initial);article.replaceChildren();
      if(previous.route&&!initial)await animate(titles,true);
      if(token!==request)return;
      // Reapply the anchor after layout/scroll anchoring settles during the view swap.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      if(token!==request)return;
      restore(next,!initial);
      status.textContent=initial?'':t('Returned to the timeline.');
    }else{
      if(!previous.route&&!initial)await animate(titles,false);
      if(token!==request)return;
      titles.hidden=true;reader.hidden=false;
      article.textContent=t('Opening history…');original.href=routeURL(next.route).href;
      scrollTo({top:Math.max(0,pageY(reader)-top()),behavior:'instant'});
      controller=new AbortController();
      try{
        let html=cache.get(next.route);
        if(!html){
          const response=await fetch(routeURL(next.route),{signal:controller.signal});
          if(!response.ok)throw new Error('Article unavailable');
          html=await response.text();
          if(cache.size>=12)cache.delete(cache.keys().next().value!);cache.set(next.route,html);
        }
        if(token!==request)return;
        const heading=prepareArticle(html,routeURL(next.route));
        if(restorePosition)scrollTo({top:next.y,behavior:'instant'});
        else if(!showFragment(location.hash))heading?.focus({preventScroll:true});
        if(!initial)await animate(reader,true);
        status.textContent=t('Reading {title}',{title:heading?.textContent||''});
      }catch(error){
        if(token!==request)return;
        article.textContent=t('This article could not open here. Use “Open article page” above, or return to the timeline.');
        status.textContent=article.textContent;original.focus({preventScroll:true});
      }
    }
    if(token!==request)return;
    changing=false;delete root.dataset.changing;root.removeAttribute('aria-busy');
    remember();renderWheel();
  }
  function openArticle(route:string,hash='',trigger?:HTMLAnchorElement) {
    remember();
    const origin=state.origin||snapshot(trigger);
    if(trigger){origin.era=sections.findIndex(section=>section.dataset.discoveryEra===trigger.dataset.era);origin.focus=trigger.id;}
    const known=byRoute.get(route)||byRoute.get(route.replace(/part-\d+\/$/,''));
    const era=known?sections.findIndex(section=>section.dataset.discoveryEra===known.dataset.era):state.era;
    const next:DiscoveryState={...state,route,y:0,era,origin,depth:state.depth+1};
    history.pushState({...history.state,historyDiscovery:next},'',urlFor(route,hash));
    void display(next);
  }
  function back() {
    controller?.abort();
    if(state.depth>0&&state.origin){history.go(-state.depth);return;}
    const link=byRoute.get(state.route)||byRoute.get(state.route.replace(/part-\d+\/$/,''));
    const next:DiscoveryState={...(state.origin||snapshot()),route:'',depth:0};
    if(link){link.closest('details')?.setAttribute('open','');next.expanded=[...titles.querySelectorAll<HTMLDetailsElement>('details[open]')].map(el=>el.id);next.anchor={id:link.id,top:top()+80};next.focus=link.id;}
    history.pushState({...history.state,historyDiscovery:next},'',urlFor('','#era-'+sections[next.era].dataset.discoveryEra));
    void display(next);
  }
  root.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const backButton=event.target.closest('[data-discovery-back]');if(backButton){back();return;}
    const link=event.target.closest<HTMLAnchorElement>('a');
    if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||link.target==='_blank'||link.hasAttribute('download'))return;
    if(link.dataset.discoveryBand){
      event.preventDefault();remember();
      const index=bands.indexOf(link);const target=sections[index];
      const next:DiscoveryState={...(state.origin||snapshot()),route:'',depth:0,era:index,anchor:{id:target.id,top:top()+16},focus:`discovery-era-${target.dataset.discoveryEra}`,y:0};
      history.pushState({...history.state,historyDiscovery:next},'',urlFor('',link.hash));
      if(!state.route&&!changing){
        state=next;setEra(index);wheelFocus=null;pinnedY=null;
        scrollTo({top:pageY(target)-top()-16,behavior:motion.matches?'instant':'smooth'});
        document.getElementById(next.focus!)?.focus({preventScroll:true});
        renderWheel();
      }else void display(next);
      return;
    }
    if(link.dataset.discoveryOpen){event.preventDefault();openArticle(link.dataset.discoveryOpen,'',link);return;}
    if(article.contains(link)){
      const url=new URL(link.href);const route=routeFor(url);
      if(route){
        event.preventDefault();
        if(route===state.route&&url.hash){
          remember();state={...state,depth:state.depth+1};
          history.pushState({...history.state,historyDiscovery:state},'',urlFor(route,url.hash));
          showFragment(url.hash);remember();
        }else openArticle(route,url.hash);
      }
    }
  });
  titles.addEventListener('toggle',schedule,true);
  wheel.addEventListener('focusin',event=>{const band=(event.target as Element).closest<HTMLAnchorElement>('[data-discovery-band]');if(band){wheelFocus=bands.indexOf(band);renderWheel(true);}});
  wheel.addEventListener('focusout',event=>{if(!wheel.contains(event.relatedTarget as Node)){wheelFocus=null;renderWheel();}});
  wheel.addEventListener('keydown',event=>{
    const index=bands.indexOf(event.target as HTMLAnchorElement);if(index<0)return;
    const target=event.key==='ArrowDown'?Math.min(index+1,bands.length-1):event.key==='ArrowUp'?Math.max(index-1,0):event.key==='Home'?0:event.key==='End'?bands.length-1:-1;
    if(target<0)return;event.preventDefault();bands[target].focus({preventScroll:true});
  });
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.route){event.preventDefault();back();}});
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  new ResizeObserver(schedule).observe(root);motion.addEventListener('change',()=>renderWheel(true));
  addEventListener('pagehide',remember);
  addEventListener('popstate',()=>{
    const saved=history.state?.historyDiscovery as DiscoveryState|undefined;
    const route=locationRoute();
    void display(saved?.route===route?saved:{...snapshot(),route,depth:0},{restorePosition:!!saved});
  });
  history.scrollRestoration='manual';root.dataset.ready='true';
  const saved=history.state?.historyDiscovery as DiscoveryState|undefined;
  const route=locationRoute();
  const initialLink=byRoute.get(route)||byRoute.get(route.replace(/part-\d+\/$/,''));
  if(initialLink)state.era=sections.findIndex(section=>section.dataset.discoveryEra===initialLink.dataset.era);
  if(route||saved){void display(saved?.route===route?saved:{...state,route},{initial:true,restorePosition:!!saved});}
  else {setEra(0);renderWheel();schedule();}
}
