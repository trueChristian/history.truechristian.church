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
  const url=route=>`${origin}${info.base}/${route||''}`;
  browser=await chromium.launch({headless:true});
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
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#daily-date')?.textContent.startsWith('2026-10-03'));
    assert.deepEqual(await dailyLinks(),first);
    await page.clock.setSystemTime(new Date('2026-10-04T12:00:00Z'));
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(()=>document.querySelector('#daily-date')?.textContent.startsWith('2026-10-04'));
    assert.equal((await dailyLinks()).filter(link=>first.includes(link)).length,0);
    await page.screenshot({path:path.join(screenshots,'home-desktop.png'),fullPage:true});
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

  await check('Every era opens a single timeline panel and a linked event',async()=>{
    await page.goto(url('timeline/'));
    const ids=await page.locator('[data-era-link]').evaluateAll(links=>links.map(link=>link.dataset.eraLink));
    assert.equal(ids.length,6);
    for(const id of ids){
      await page.locator(`[data-era-link="${id}"]`).click();
      await page.waitForFunction(era=>{
        const panels=[...document.querySelectorAll('[data-era-panel]')].filter(panel=>!panel.hidden);
        return panels.length===1 && panels[0].dataset.eraPanel===era;
      },id);
    }
    await page.goto(url('timeline/#radical-reformation'));
    await page.locator('[data-era-panel="radical-reformation"] .timeline-event a').first().click();
    assert.match(page.url(),/\/events\//);
    assert.ok(await page.locator('.prose').innerText());
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
    assert.equal(await page.locator('.photo-card').count(),40);
    assert.equal(await page.getByText('Behalt artwork:',{exact:false}).count(),8);
  });

  await check('Missing-history contribution links carry the topic and canonical page URL',async()=>{
    await page.goto(url('traditions/agape-fellowships/'));
    const link=new URL(await page.locator('.research-notice a').getAttribute('href'));
    assert.equal(link.pathname,'/trueChristian/history.truechristian.church/issues/new');
    assert.equal(link.searchParams.get('title'),'Add history: Agape fellowships');
    assert.match(link.searchParams.get('body'),/Record: agape-fellowships/);
    assert.match(link.searchParams.get('body'),/traditions\/agape-fellowships\//);
  });

  await check('Mobile menus support Escape and restore focus without page overflow',async()=>{
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      for(const route of ['', 'timeline/#radical-reformation','stories/','search/','stories/mm-dirk-willems-a-d-1569/']){
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
    await page.screenshot({path:path.join(screenshots,'home-mobile.png'),fullPage:true});
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
