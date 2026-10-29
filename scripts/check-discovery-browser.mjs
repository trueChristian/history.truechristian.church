import assert from 'node:assert/strict';

/** Run against the actual built homepage, including the GitHub project-path build. */
export async function checkDiscovery({page,context,check,url,capture}) {
  const ready=()=>page.waitForFunction(()=>document.querySelector('[data-home-history]')?.dataset.ready==='true'&&!document.querySelector('[data-home-history]')?.hasAttribute('aria-busy'));
  const reading=()=>page.waitForFunction(()=>!document.querySelector('#discovery-reader')?.hidden&&!!document.querySelector('[data-discovery-article] h1')&&!document.querySelector('[data-home-history]').hasAttribute('aria-busy'));
  const timeline=()=>page.waitForFunction(()=>!document.querySelector('#discovery-titles')?.hidden&&!document.querySelector('[data-home-history]').hasAttribute('aria-busy'));
  const active=()=>page.locator('[data-discovery-band][aria-current=true]').getAttribute('data-discovery-band');
  const back=()=>page.locator('[data-discovery-back]').first().click();

  await check('Homepage keeps its introduction and chrome, with every history behind a small set of titles',async()=>{
    await page.goto(url(''));await ready();
    assert.equal(await page.locator('#timeline-filters').count(),0);
    assert.equal(await page.locator('.atlas-intro h1').innerText(),'Follow the witness.\nTrace the living streams.');
    assert.equal(await page.locator('#daily-title-links a:visible').count(),6);
    const catalogURL=await page.locator('html').getAttribute('data-catalog-url');
    const catalog=await (await page.request.get(new URL(catalogURL,url('')).href)).json();
    assert.equal(await page.locator('[data-discovery-open]').count(),catalog.length);
    assert.ok(await page.locator('.discovery-era > .discovery-list').evaluateAll(lists=>lists.every(list=>list.children.length<=5)));
    assert.equal(await page.locator('.discovery-more[open]').count(),0);
    assert.equal(await page.locator('.discovery-list img').count(),0);
    assert.equal(await page.locator('.discovery-list a').first().getAttribute('id'),'discover-christian-beginnings');
    await page.locator('#navigate-history').scrollIntoViewIfNeeded();
    await capture('home-discovery-desktop.png');
  });

  await check('Era wheel follows the one page scroll and its dates jump to matching sections',async()=>{
    await page.locator('[data-discovery-band="medieval-witness"]').click();
    await page.waitForFunction(()=>Math.abs(document.querySelector('#era-medieval-witness').getBoundingClientRect().top-132)<3);
    assert.equal(await active(),'medieval-witness');
    const before=Number(await page.locator('.discovery-wheel').getAttribute('data-position'));
    await page.mouse.wheel(0,400);
    await page.waitForFunction(before=>Number(document.querySelector('.discovery-wheel').dataset.position)>before,before);
    const geometry=await page.locator('.discovery-rail').evaluate(el=>({height:el.getBoundingClientRect().height,overflow:getComputedStyle(el).overflowY}));
    assert.ok(geometry.height>700);assert.ok(!['auto','scroll'].includes(geometry.overflow));
    await page.locator('[data-discovery-band="radical-reformation"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-discovery-band="radical-reformation"]').getAttribute('aria-current')==='true');
    await capture('home-discovery-era.png');
  });

  await check('Opening a history preserves the complete article, citations, scroll position and keyboard focus',async()=>{
    await page.goto(url(''));await ready();
    const link=page.locator('#discover-christian-beginnings');await link.scrollIntoViewIfNeeded();await link.focus();
    const before=await link.boundingBox();
    const href=await link.getAttribute('href');
    const response=await page.request.get(new URL(href,url('')).href);const canonical=await response.text();
    const expected=await page.evaluate(html=>{
      const doc=new DOMParser().parseFromString(html,'text/html');
      return {heading:doc.querySelector('.reading-page h1').textContent,prose:doc.querySelector('.reading-page .prose').textContent,refs:doc.querySelector('.reference-list').textContent};
    },canonical);
    await link.press('Enter');await reading();
    assert.equal(await page.locator('#discovery-titles').isVisible(),false);
    assert.equal(await page.locator('[data-discovery-article] h1').textContent(),expected.heading);
    assert.equal(await page.locator('[data-discovery-article] .prose').textContent(),expected.prose);
    assert.equal(await page.locator('[data-discovery-article] .reference-list').textContent(),expected.refs);
    assert.equal(await page.evaluate(()=>document.activeElement?.tagName),'H1');
    const body=await page.locator('.discovery-reader').boundingBox(),rail=await page.locator('.discovery-rail').boundingBox();
    assert.ok(body.x+body.width<rail.x);
    await capture('home-discovery-reader.png');
    await page.locator('.discovery-reader .citation-note a').first().click();
    assert.ok((await page.url()).endsWith('#reference-1'));
    await back();await timeline();
    assert.ok(Math.abs((await link.boundingBox()).y-before.y)<3);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'discover-christian-beginnings');
    await page.goForward();await reading();
    await page.goBack();await timeline();
    assert.ok(Math.abs((await link.boundingBox()).y-before.y)<3);
  });

  await check('Expanded periods, long source pages and continuation links survive return and reload',async()=>{
    await page.goto(url(''));await ready();
    await page.locator('#discovery-more-radical-reformation summary').click();
    const target=page.locator('[data-discovery-open="stories/mm-confession-of-faith-according-to-the-holy-word-of-god/"]');
    await target.scrollIntoViewIfNeeded();await target.focus();
    const id=await target.getAttribute('id'),position=await target.boundingBox();
    await target.press('Enter');await reading();
    assert.ok(await page.locator('.discovery-reader .reader-prose').isVisible());
    assert.ok(await page.locator('.discovery-reader .reader-original').count());
    const next=page.locator('.discovery-reader .reader-next').first();
    await next.click();await reading();assert.ok(new URL(await page.url()).searchParams.get('history').endsWith('/part-2/'));
    await page.reload();await reading();
    await back();await timeline();
    assert.ok(await page.locator('#discovery-more-radical-reformation').getAttribute('open')!==null);
    assert.equal(await page.evaluate(()=>document.activeElement.id),id);
    assert.ok(Math.abs((await page.locator('#'+id).boundingBox()).y-position.y)<3);
  });

  await check('Narrow screens reserve the right rail; reduced motion and keyboard era navigation remain usable',async()=>{
    await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(url(''));await ready();
    await page.locator('#discover-christian-beginnings').press('Enter');await reading();
    const reader=await page.locator('.discovery-reader').boundingBox(),rail=await page.locator('.discovery-rail').boundingBox();
    assert.ok(reader.x+reader.width<rail.x);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.locator('[data-home-history]').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
    await capture('home-discovery-mobile-reader.png');
    await page.locator('[data-discovery-band]').first().focus();
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.discoveryBand),'source-context');
    await page.keyboard.press('Enter');await timeline();
    assert.equal(await active(),'source-context');
    await page.selectOption('#theme-mode','dark');
    await capture('home-discovery-mobile-dark.png');
    await page.selectOption('#theme-mode','system');
    await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});
  });

  await check('Article fetch failure offers a working canonical link and a return to the titles',async()=>{
    await page.goto(url(''));await ready();
    await context.route('**/events/christian-beginnings/',route=>route.abort());
    await page.locator('#discover-christian-beginnings').click();
    await page.waitForFunction(()=>document.querySelector('[data-discovery-article]')?.textContent.includes('could not open here'));
    assert.ok((await page.locator('[data-discovery-original]').getAttribute('href')).endsWith('/events/christian-beginnings/'));
    await back();await timeline();
    await context.unroute('**/events/christian-beginnings/');
  });
}
