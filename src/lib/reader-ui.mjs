import {escapeHTML as esc} from './history.mjs';

/** Render ordinary links so reading and book order work with JavaScript disabled. */
export function readerNavigation(reader,page,{url,t,key='top'}){
 const previous=reader.byPageId.get(page.previousId),next=reader.byPageId.get(page.nextId);
 return `<nav class="reader-navigation" aria-label="${esc(t('Book reading navigation'))}" data-reader-navigation="${key}">${previous?`<a class="reader-previous" rel="prev" href="${url(previous.route)}"><span aria-hidden="true">←</span><span><small>${esc(t('Previous page'))}</small><strong>${esc(previous.title)}</strong></span></a>`:'<span></span>'}<a class="reader-contents-link" href="${url('sources/martyrs-mirror/')}#book-contents">${esc(t('Book contents'))}</a>${next?`<a class="reader-next" rel="next" href="${url(next.route)}"><span><small>${esc(t('Next page'))}</small><strong>${esc(next.title)}</strong></span><span aria-hidden="true">→</span></a>`:'<span></span>'}</nav>`;
}

export function readerOutline(reader,page,{url,t}){
 const parts=reader.byRecord.get(page.recordSlug)||[page];
 return `<aside class="reader-sidebar" aria-label="${esc(t('Reading tools'))}"><div class="reader-position"><p class="eyebrow">${esc(t('Martyrs’ Mirror reader'))}</p><p>${esc(t('Reading page {number} of {total}',{number:page.bookIndex+1,total:reader.pages.length}))}</p><progress max="${reader.pages.length}" value="${page.bookIndex+1}" aria-label="${esc(t('Position in the book'))}"></progress></div><label class="reader-text-control">${esc(t('Text size'))}<select id="reader-text-size"><option value="standard">${esc(t('Standard'))}</option><option value="large">${esc(t('Large'))}</option><option value="larger">${esc(t('Larger'))}</option></select></label><a href="${url('sources/martyrs-mirror/')}#book-contents">${esc(t('Browse the book’s contents'))} →</a><details class="reader-section-pages"${parts.length>1?' open':''}><summary>${esc(t('Pages in this section'))} · ${parts.length}</summary><ol>${parts.map((p,i)=>`<li><a href="${url(p.route)}"${p.id===page.id?' aria-current="page"':''}>${esc(t('Page {number}',{number:i+1}))}${p.sourcePages?.length?` <span>${esc(t('Original page markers'))}: ${esc(p.sourcePages.join(', '))}</span>`:''}</a></li>`).join('')}</ol></details></aside>`;
}

export function readerMarkdownNavigation(reader,page,{url,t}){
 const previous=reader.byPageId.get(page.previousId),next=reader.byPageId.get(page.nextId);
 return [previous?`[${t('Previous page')}: ${previous.title}](${url(previous.route)})`:'',`[${t('Book contents')}](${url('sources/martyrs-mirror/')}#book-contents)`,next?`[${t('Next page')}: ${next.title}](${url(next.route)})`:''].filter(Boolean).join(' · ');
}
