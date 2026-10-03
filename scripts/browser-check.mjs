/** Exercise generated pages in Chromium; no browser packages ship with the site. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const info=JSON.parse(await fs.readFile(path.join(root,'_site/build-info.json'),'utf8'));
const screenshots=path.join(root,'test-results');
await fs.mkdir(screenshots,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{
  cwd:root,env:{...process.env,PORT:'0',SITE_BASE_PATH:info.base},stdio:['ignore','pipe','pipe']
});
let browser,checks=0;

try{
  const origin=await new Promise((resolve,reject)=>{
    let output='',errors='';
    const timeout=setTimeout(()=>reject(new Error('Preview server did not start within 20 seconds.')),20000);
    server.once('error',error=>{clearTimeout(timeout);reject(error);});
    server.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Preview server exited (${code}): ${errors}`));});
    server.stderr.on('data',data=>{errors+=data;});
    server.stdout.on('data',data=>{
      output+=data;
      const match=output.match(/History preview: (http:\/\/127\.0\.0\.1:\d+)/);
      if(match){clearTimeout(timeout);resolve(match[1]);}
    });
  });
  const url=route=>`${origin}${info.base}/${info.defaultLocale||'en'}/${route||''}`;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']}:{} )});
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});
  // Keep the behavioural checks independent of the external font service.
  await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  const page=await context.newPage(),errors=[],badResponses=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
    if(response.url().startsWith(origin+'/') && response.status()>=400 && !response.url().includes('/missing-browser-test/')){
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  page.setDefaultTimeout(20000);
  await page.clock.install({time:new Date('2026-10-03T12:00:00Z')});
  const check=async(label,action)=>{await action();checks++;console.log(`PASS ${label}`);};
  const dailyLinks=()=>page.locator('#daily-stories h3 a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  const waitForResults=()=>page.waitForFunction(()=>/results · showing/.test(document.querySelector('#search-status')?.textContent||''));
  const waitForArchive=()=>page.waitForFunction(()=>/source sections · showing/.test(document.querySelector('#archive-count')?.textContent||''));

  await check('Six daily stories are distinct, stable, and refresh on the next UTC day',async()=>{
    await page.goto(url(''));
    await page.waitForFunction(()=>document.querySelector('#daily-date')?.textContent.startsWith('2026-10-03'));
    const first=await dailyLinks();assert.equal(first.length,6);assert.equal(new Set(first).size,6);
    assert.equal(await page.locator('#daily-title-links a:visible').count(),6);
    await page.locator('#daily-discovery summary').click();
    assert.ok(await page.locator('#daily-stories .story-card').first().isVisible());
    await page.locator('#daily-discovery summary').click();
    assert.equal(await page.locator('#daily-stories .story-card').first().isVisible(),false);
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#daily-date')?.textContent.startsWith('2026-10-03'));
    assert.deepEqual(await dailyLinks(),first);
    await page.clock.setSystemTime(new Date('2026-10-04T12:00:00Z'));
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(()=>document.querySelector('#daily-date')?.textContent.startsWith('2026-10-04'));
    assert.equal((await dailyLinks()).filter(link=>first.includes(link)).length,0);
    await page.screenshot({path:path.join(screenshots,'home-desktop.png')});
  });

  await check('System appearance tracks the browser and saved overrides survive reload',async()=>{
    await page.emulateMedia({colorScheme:'dark'});
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    await page.selectOption('#theme-mode','light');
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#theme-mode')?.value==='light');
    assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    await page.selectOption('#theme-mode','system');
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    await page.selectOption('#theme-mode','light');
  });

  await check('Vertical timeline filters eras and opens an internal milestone',async()=>{
    await page.goto(url('timeline/'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    assert.equal(await page.locator('.atlas-navigation [data-atlas-era]').count(),6);
    await page.locator('[data-atlas-era="radical-reformation"]').click();
    await page.waitForFunction(()=>document.querySelector('#timeline-filters [name=era]').value==='radical-reformation' && !document.querySelector('#era-living-traditions'));
    await page.selectOption('#timeline-filters [name=kind]','event');
    await page.locator('#timeline-entries h3 a').first().click();
    assert.match(page.url(),/\/events\//);assert.ok(await page.locator('.prose').innerText());
  });

  await check('Story filters, query links, and pagination load the complete archive',async()=>{
    await page.goto(url('stories/?era=radical-reformation'));
    await waitForArchive();
    assert.equal(await page.locator('[name=era]').inputValue(),'radical-reformation');
    assert.equal(await page.locator('#archive-results .story-card').count(),36);
    await page.locator('#archive-more').click();
    assert.equal(await page.locator('#archive-results .story-card').count(),72);
    await page.locator('[name=q]').fill('Dirk Willems');
    await page.locator('#archive-filters button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('#archive-results')?.textContent.includes('Dirk Willems'));
    assert.match(page.url(),/q=Dirk\+Willems/);
  });

  await check('The actual search worker resolves aliases and full text with date and type filters',async()=>{
    await page.goto(url('search/?q=Felix+Mantz&kind=person'));
    await waitForResults();
    assert.equal(await page.locator('#search-results .story-card').count(),1);
    assert.equal(await page.locator('#search-results h3').innerText(),'Felix Manz');
    await page.goto(url('search/?q=prison&kind=story&from=1500&to=1600'));
    await waitForResults();
    assert.equal(await page.locator('#search-results .story-card').count(),30);
    await page.locator('#search-more').click();
    assert.equal(await page.locator('#search-results .story-card').count(),60);
    await page.locator('[name=from]').fill('1700');
    await page.locator('#search-form button[type=submit]').click();
    assert.equal(await page.locator('#search-status').innerText(),'The start year must be before the end year.');
  });

  await check('Articles preserve source illustrations, original anchors, and readable Markdown',async()=>{
    await page.goto(url('stories/mm-dirk-willems-a-d-1569/'));
    await page.waitForFunction(()=>[...document.querySelectorAll('.prose img')].some(image=>image.complete && image.naturalWidth>0));
    await page.locator('.source-details summary').click();
    const source=new URL(await page.locator('.source-details a').getAttribute('href'),origin);
    assert.match(source.pathname,/sources\/martyrs-mirror\/original\.html$/);assert.ok(source.hash);
    const markdown=await context.request.get(url('stories/mm-dirk-willems-a-d-1569/README.md'));
    assert.equal(markdown.status(),200);assert.match(await markdown.text(),/Asperen/);
    await page.goto(url('sources/church-history/'));
    assert.equal(await page.locator('main img, main video').count(),0);
  });

  await check('Community-account contribution links carry the topic and canonical page URL',async()=>{
    await page.goto(url('traditions/agape-fellowships/'));
    assert.ok(await page.getByText('Attributed community account',{exact:true}).isVisible());
    const link=new URL(await page.locator('.page-tools a[href*="/issues/new?"]').first().getAttribute('href'));
    assert.equal(link.pathname,'/trueChristian/history.truechristian.church/issues/new');
    assert.equal(link.searchParams.get('title'),'Correction: Agape fellowships');
    assert.match(link.searchParams.get('body'),/Record: agape-fellowships/);
    assert.match(link.searchParams.get('body'),/traditions\/agape-fellowships\//);
  });

  await check('Branch streams have connected SVG paths and internal people and place links',async()=>{
    await page.goto(url('branches/?family=amish'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    assert.ok(await page.locator('.timeline-thread').count()>0);
    assert.equal(await page.locator('[data-record="agape-fellowships"]').count(),0);
    await page.locator('[data-record="beachy-amish"] h3 a').click();
    assert.match(page.url(),/traditions\/beachy-amish/);
    assert.ok(await page.locator('.reference-list ol').innerText());
    await page.locator('.related-topics a[href$="/places/somerset-county/"]').click();
    assert.match(page.url(),/places\/somerset-county/);
    assert.ok(await page.locator('.prose').innerText());
    await page.goto(url('timeline/?era=radical-reformation'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    await page.screenshot({path:path.join(screenshots,'timeline-desktop.png')});
  });

  await check('Martyrs’ Mirror is integrated into the timeline and research media is excluded',async()=>{
    await page.goto(url('timeline/?era=medieval-witness&kind=story'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    assert.equal(await page.locator('.atlas-entry').count(),200);
    await page.locator('#timeline-more').click();assert.ok(await page.locator('.atlas-entry').count()>200);
    await page.goto(url('timeline/?era=acts-and-early-church'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    await page.locator('.atlas-source-link').first().click();
    await waitForArchive();
    assert.ok(Number(await page.locator('[name=century]').inputValue())>0);
    for(const route of ['sources/church-history/','sources/behalt/']){
      await page.goto(url(route));assert.equal(await page.locator('main img, main video, main source').count(),0);
    }
    const media=await context.request.get(url('sources/behalt/IMG_9359.mp4'));assert.equal(media.status(),404);
  });

  await check('Mobile menus support Escape and restore focus without page overflow',async()=>{
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      for(const route of ['', 'timeline/?era=radical-reformation','branches/','sources/behalt/','stories/','search/','stories/mm-dirk-willems-a-d-1569/']){
        await page.goto(url(route));
        await page.waitForFunction(()=>document.documentElement.dataset.theme);
        const dimensions=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
        assert.ok(dimensions.content<=dimensions.viewport+1,`Overflow at ${width}px on ${route}: ${dimensions.content}`);
      }
      if(width<960){
        await page.locator('.tcc-header__toggle').click();
        assert.equal(await page.locator('.tcc-header__toggle').getAttribute('aria-expanded'),'true');
        assert.ok(await page.locator('.tcc-header__close').evaluate(button=>button===document.activeElement));
        await page.locator('.has-submenu > button').click();
        assert.equal(await page.locator('.has-submenu > button').getAttribute('aria-expanded'),'true');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.tcc-header__toggle').getAttribute('aria-expanded'),'false');
        assert.ok(await page.locator('.tcc-header__toggle').evaluate(button=>button===document.activeElement));
      }
    }
    await page.setViewportSize({width:390,height:844});
    await page.goto(url(''));
    await page.waitForFunction(()=>document.querySelector('#daily-date')?.textContent);
    await page.screenshot({path:path.join(screenshots,'home-mobile.png')});
    await page.goto(url('timeline/?era=radical-reformation'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    await page.screenshot({path:path.join(screenshots,'timeline-mobile.png')});
  });

  await check('English routes preserve legacy era links and expose truthful same-record language availability',async()=>{
    await page.goto(`${origin}${info.base}/timeline/#radical-reformation`);
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    assert.match(page.url(),/\/en\/timeline\/#radical-reformation$/);
    assert.equal(await page.locator('#timeline-filters [name=era]').inputValue(),'radical-reformation');
    await page.goto(url('people/dirk-willems/'));
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    assert.match(await page.locator('link[rel=canonical]').getAttribute('href'),/\/en\/people\/dirk-willems\/$/);
    await page.locator('.language-control summary').click();
    assert.equal(await page.locator('.language-control nav a').count(),1);
    assert.equal(await page.locator('.language-control nav a').innerText(),'English');
    assert.ok((await page.locator('.prose').innerText()).length>400);
    const edit=new URL(await page.locator('.page-tools a[href*="/edit/"]').getAttribute('href'));
    assert.equal(edit.pathname,`/trueChristian/history.truechristian.church/edit/${info.sourceRef}/content/source-enrichments.json`);
    assert.ok(await page.locator('a[href$="/stories/mm-dirk-willems-a-d-1569/"]').count()>0);
    const markdown=await context.request.get(url('README.md'));
    const text=await markdown.text();assert.match(text,/Today’s six accounts/);assert.match(text,/The connected timeline/);
  });

  await check('Timeline filters survive Back and Forward, reset, empty results, and repeated changes',async()=>{
    await page.goto(url('timeline/?era=radical-reformation'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    await page.selectOption('#timeline-filters [name=kind]','person');
    assert.match(page.url(),/kind=person/);
    await page.goBack();await page.waitForFunction(()=>document.querySelector('#timeline-filters [name=kind]').value==='');
    await page.goForward();await page.waitForFunction(()=>document.querySelector('#timeline-filters [name=kind]').value==='person');
    await page.locator('#timeline-filters [name=q]').fill('zzzz-no-history');
    await page.locator('#timeline-filters [name=q]').press('Enter');
    assert.equal(await page.locator('.atlas-entry').count(),0);
    await page.locator('#timeline-filters button[type=reset]').click();
    await page.waitForFunction(()=>document.querySelectorAll('.atlas-entry').length>100);
    const ids=await page.locator('.atlas-era').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(ids).size,ids.length);
    await page.selectOption('#timeline-filters [name=kind]','event');
    await page.selectOption('#timeline-filters [name=kind]','person');
    assert.ok(await page.locator('[data-record="stephen-of-jerusalem"]').count()>0);
  });

  await check('Visual review captures connected timeline nodes, original illustrations, and mobile content',async()=>{
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(url('branches/?family=amish'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    await page.locator('.atlas-canvas').scrollIntoViewIfNeeded();
    const lineContrast=await page.locator('.timeline-thread').first().evaluate(element=>{
      const rgb=value=>value.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number);
      const paper=rgb(getComputedStyle(document.body).backgroundColor),stroke=rgb(getComputedStyle(element).stroke),alpha=Number(getComputedStyle(element).opacity);
      const mixed=stroke.map((value,i)=>value*alpha+paper[i]*(1-alpha));
      const luminance=values=>values.map(value=>(value/=255)<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);
      const a=luminance(mixed),b=luminance(paper);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    assert.ok(lineContrast>=3,`Connection lines need readable contrast: ${lineContrast}`);
    await page.screenshot({path:path.join(screenshots,'timeline-connections-desktop.png')});
    await page.selectOption('#theme-mode','dark');
    await page.locator('[data-record="amish"] h3 a').focus();
    const contrast=await page.locator('[data-record="amish"] h3').evaluate(element=>{
      const linear=c=>(c/=255)<=.04045?c/12.92:((c+.055)/1.055)**2.4;
      const luminance=value=>{const rgb=value.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number).map(linear);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
      const ink=luminance(getComputedStyle(element).color),paper=luminance(getComputedStyle(element.closest('.atlas-entry')).backgroundColor);
      return (Math.max(ink,paper)+.05)/(Math.min(ink,paper)+.05);
    });
    assert.ok(contrast>=4.5,`Dark timeline headings need readable contrast: ${contrast}`);
    await page.screenshot({path:path.join(screenshots,'timeline-connections-dark.png')});
    await page.selectOption('#theme-mode','light');
    await page.goto(url('people/dirk-willems/'));
    await page.locator('.prose').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(screenshots,'sourced-history-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.goto(url('branches/?family=amish'));
    await page.waitForFunction(()=>document.querySelector('.history-atlas')?.dataset.ready==='true');
    await page.locator('.atlas-entry').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(screenshots,'timeline-connections-mobile.png')});
    await page.goto(url('people/dirk-willems/'));
    await page.locator('.prose p').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(screenshots,'sourced-history-mobile.png')});
    await page.setViewportSize({width:1440,height:1000});
  });

  await check('All six daily titles and the timeline remain visible without JavaScript',async()=>{
    const noScript=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    await noScript.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
    const staticPage=await noScript.newPage();await staticPage.goto(url(''));
    assert.equal(await staticPage.locator('#daily-title-links a:visible').count(),6);
    assert.ok(await staticPage.locator('.atlas-entry').count()>100);
    await staticPage.locator('#daily-discovery summary').click();
    assert.ok(await staticPage.locator('#daily-stories .story-card').first().isVisible());
    await noScript.close();
  });

  await check('404 responses keep navigation and the shared page chrome',async()=>{
    const response=await page.goto(url('missing-browser-test/'));
    assert.equal(response.status(),404);
    assert.equal(await page.locator('[data-tcc-global-header]').count(),1);
    assert.equal(await page.locator('[data-tcc-directory-footer]').count(),1);
    assert.equal(await page.locator('[data-tcc-copyright-footer]').count(),1);
  });
  assert.deepEqual(errors,[],'Uncaught browser errors');
  assert.deepEqual(badResponses,[],'Failed local assets');
  console.log(`Passed ${checks} browser scenarios against ${info.base||'/'} with no uncaught errors or missing assets.`);
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
