#!/usr/bin/env python3
"""Independently verify rendered English reader text against the source manifest."""
import gzip,html,json,re
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ReaderText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.stack=[];self.body=[];self.heading=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs);classes=attrs.get('class','').split()
        inherited=self.stack[-1][1] if self.stack else None
        scope='body' if 'reader-prose' in classes else ('heading' if tag=='h1' and 'source-reader-heading' in classes else inherited)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.stack.append((tag,scope))
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag:
                scope=self.stack[i][1]
                self.stack=self.stack[:i];break
    def handle_data(self,text):
        scope=self.stack[-1][1] if self.stack else None
        if scope:getattr(self,scope).append(text)
compact=lambda text:re.sub(r'\s+',' ',text).strip()
manifest=json.load(gzip.open(ROOT/'content/martyrs-reader.json.gz'))
for page in manifest['pages']:
    filename=ROOT/'_site/en'/page['route']/'index.html'
    parser=ReaderText();parser.feed(filename.read_text())
    rendered=compact(''.join(parser.heading)+ ' '+ ''.join(parser.body))
    expected=compact(page['text'])
    if rendered!=expected:
        point=next((i for i,(a,b) in enumerate(zip(rendered,expected)) if a!=b),min(len(rendered),len(expected)))
        raise AssertionError(f"Rendered source text differs on {page['route']} at {point}: {rendered[max(0,point-30):point+100]!r} != {expected[max(0,point-30):point+100]!r}")
print(f"Verified exact rendered source text across {manifest['pageCount']} native reader pages.")
