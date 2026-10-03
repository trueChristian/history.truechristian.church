import {translate} from './lib/localization.mjs';
/** @type {Record<string,string>} */
let ui={};try{ui=JSON.parse(document.querySelector('#history-ui')?.textContent||'{}');}catch{}
export const t=(key,variables={})=>translate(ui,key,variables);
export const contentBase=document.documentElement.dataset.contentBase||document.documentElement.dataset.base||'';
export const locale=document.documentElement.lang||'en';
export const catalogURL=document.documentElement.dataset.catalogUrl;
export const indexURL=document.documentElement.dataset.indexUrl;
export const branchesURL=document.documentElement.dataset.branchesUrl;

export const messages=ui;
