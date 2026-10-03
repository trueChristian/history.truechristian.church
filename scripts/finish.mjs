import fs from 'node:fs/promises';
import path from 'node:path';
import {siteOrigin} from '../src/lib/site-origin.mjs';
const out=new URL('../_site/',import.meta.url);
const info=JSON.parse(await fs.readFile(new URL('build-info.json',out)));
const pages=JSON.parse(await fs.readFile(new URL('../.history-data/pages.json',import.meta.url)));
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Preserve every old entry point and its query/hash without creating duplicate indexed content.
for(const page of pages.filter(p=>p.locale===info.defaultLocale)){
  const destination=`${info.base}/${page.route}`;
  const html=`<!doctype html><html lang="en" data-legacy-redirect><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="canonical" href="${esc(new URL(destination,siteOrigin(process.env.SITE_ORIGIN)).href)}"><meta http-equiv="refresh" content="0;url=${esc(destination)}"><title>${esc(page.title)}</title><script>location.replace(${JSON.stringify(destination)}+location.search+location.hash)</script></head><body><p><a href="${esc(destination)}">Continue to ${esc(page.title)}</a></p></body></html>`;
  const directory=new URL(page.logicalRoute,out);await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(new URL('index.html',directory),html);
  await fs.copyFile(new URL(page.route+'README.md',out),new URL('README.md',directory));
}
await fs.copyFile(new URL(`${info.defaultLocale}/not-found/index.html`,out),new URL('404.html',out));
info.redirects=pages.filter(p=>p.locale===info.defaultLocale).length;
await fs.writeFile(new URL('build-info.json',out),JSON.stringify(info));
