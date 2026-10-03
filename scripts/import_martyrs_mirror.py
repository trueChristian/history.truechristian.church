#!/usr/bin/env python3
"""Import the supplied Gutenberg HTML ZIP using only the Python standard library.

Source wording is retained. Heading dates are metadata, not independently verified
historical assertions. Century ranges are used when a heading has no explicit date.
Run from anywhere: python3 scripts/import_martyrs_mirror.py /path/to/archive.zip
"""
from __future__ import annotations

import argparse
import hashlib
import gzip
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unicodedata
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
VOID = {"img", "br", "hr", "meta", "link", "input", "wbr"}
ALLOWED = {"p", "div", "span", "a", "em", "i", "b", "strong", "sup", "sub",
           "blockquote", "ul", "ol", "li", "table", "tr", "td", "th", "tbody",
           "thead", "br", "hr", "img", "dl", "dt", "dd", "h5", "h6"}


class Element:
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]]):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def text(self, omit_notes: bool = False) -> str:
        if omit_notes and (self.tag == "sup" or "pagenum" in self.attrs.get("class", "")):
            return ""
        return "".join(c.text(omit_notes) if isinstance(c, Element) else c for c in self.children)

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.walk()


class Document(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.root = Element("document", [])
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs)
        self.stack[-1].children.append(element)
        if tag not in VOID:
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def compact(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:120].rstrip("-") or "section"


def safe_html(node: Element | str) -> str:
    if isinstance(node, str):
        return html.escape(node)
    if node.tag in {"script", "style", "header", "footer", "nav"}:
        return ""
    inner = "".join(safe_html(c) for c in node.children)
    if node.tag not in ALLOWED:
        return inner
    attrs = []
    source_id = node.attrs.get("id")
    if source_id and re.fullmatch(r"[A-Za-z0-9_.:-]+", source_id):
        attrs.append(("id", source_id))
    if node.tag == "a":
        href = node.attrs.get("href", "")
        if href.startswith("#"):
            # Link to the intact edition: cross-section footnotes stay functional.
            attrs.append(("href", "__BASE__/sources/martyrs-mirror/original.html" + href))
        elif re.match(r"https?://", href):
            attrs.extend([("href", href), ("rel", "noopener noreferrer")])
    if node.tag == "img":
        name = Path(node.attrs.get("src", "")).name
        if not re.fullmatch(r"[A-Za-z0-9_.-]+\.(jpg|png|jpeg)", name, re.I):
            return ""
        attrs.extend([("src", "__BASE__/sources/martyrs-mirror/images/" + name),
                      ("alt", node.attrs.get("alt") or "Illustration from Martyrs’ Mirror"),
                      ("loading", "lazy")])
    if node.tag == "span" and "pagenum" in node.attrs.get("class", ""):
        attrs.extend([("class", "source-page"), ("aria-label", "Original page " + compact(node.text()))])
    if node.tag == "div" and "figcenter" in node.attrs.get("class", ""):
        attrs.append(("class", "source-figure"))
    if node.tag == "div" and "caption" in node.attrs.get("class", ""):
        attrs.append(("class", "source-caption"))
    attr_text = "".join(f' {k}="{html.escape(str(v), quote=True)}"' for k, v in attrs)
    return f"<{node.tag}{attr_text}>" + ("" if node.tag in VOID else inner + f"</{node.tag}>")


def extract_date(title: str, century: int | None):
    match = re.search(r"(?:A\.?\s*D\.?|ANNO|YEAR(?:\s+OF\s+OUR\s+LORD)?)\s*(\d{1,4})(?:\s*[–—-]\s*(\d{1,4}))?", title, re.I)
    if match:
        year = int(match[1])
        end = int(match[2]) if match[2] else year
        if match[2] and len(match[2]) < len(match[1]):
            end += (year // (10 ** len(match[2]))) * (10 ** len(match[2]))
        if 1 <= year <= 1700 and year <= end <= 1700:
            return {"start": year, "end": end, "label": ("c. " if re.search(r"ABOUT|TOWARDS|CIRCA", title, re.I) else "") + str(year) + (f"–{end}" if end != year else ""), "basis": "Source heading; not independently verified"}
    if century:
        return {"start": (century - 1) * 100 + 1, "end": century * 100,
                "label": f"{century}th century (source section)", "basis": "Century of containing source section; exact event date not assigned"}
    return None


def import_archive(path: Path) -> dict:
    with ZipFile(path) as archive:
        html_names = [n for n in archive.namelist() if n.endswith(".html") and not n.startswith("__MACOSX/")]
        if len(html_names) != 1:
            raise ValueError("Expected exactly one source HTML document in the archive")
        raw = archive.read(html_names[0])
        source_dir = ROOT / "sources/martyrs-mirror"
        (source_dir / "images").mkdir(parents=True, exist_ok=True)
        (source_dir / "original.html").write_bytes(raw)
        copied_images = []
        for item in archive.infolist():
            if "/images/" in item.filename and not item.is_dir() and not item.filename.startswith("__MACOSX/"):
                name = Path(item.filename).name
                if re.fullmatch(r"[A-Za-z0-9_.-]+\.(jpg|png|jpeg)", name, re.I):
                    (source_dir / "images" / name).write_bytes(archive.read(item))
                    copied_images.append(name)
    document = Document(raw.decode("utf-8"))
    body = next(n for n in document.root.walk() if n.tag == "body")
    sections, current = [], None
    century, chapter, chapter_id, part = None, "Front matter", "", "Front matter"
    enabled = False
    counts = {}

    def finish():
        nonlocal current
        if current is None:
            return
        blocks = current.pop("nodes")
        current["html"] = "".join(safe_html(n) for n in blocks).strip()
        paragraphs = [compact(n.text()) for n in blocks if isinstance(n, Element) and n.tag == "p" and compact(n.text())]
        text = compact(" ".join(n.text(True) if isinstance(n, Element) else n for n in blocks))
        current["text"] = text
        current["summary"] = (paragraphs[0] if paragraphs else text)[:280].rsplit(" ", 1)[0] + ("…" if len((paragraphs[0] if paragraphs else text)) > 280 else "")
        images = [n for b in blocks if isinstance(b, Element) for n in b.walk() if n.tag == "img"]
        current["images"] = ["sources/martyrs-mirror/images/" + Path(n.attrs.get("src", "")).name for n in images]
        pages = [n.attrs["id"].replace("Page_", "") for b in blocks if isinstance(b, Element) for n in b.walk() if n.attrs.get("id", "").startswith("Page_")]
        current["sourcePages"] = list(dict.fromkeys(pages))
        if pages:
            current["sourceAnchor"] = "Page_" + pages[0]
        # Keep introductions as navigable records too; never silently drop a heading.
        sections.append(current)
        current = None

    def consume(node):
        nonlocal current, enabled, century, chapter, chapter_id, part
        if isinstance(node, str):
            if current and node.strip():
                current["nodes"].append(node)
            return
        if node.attrs.get("id") in {"pg-header", "pg-footer"}:
            return
        if node.tag in {"h2", "h3", "h4"}:
            title = compact(node.text(True))
            if node.attrs.get("id") == "Translators_Preface":
                enabled = True
            if not enabled:
                return
            finish()
            if node.tag == "h2" and "Part" in title:
                part = title
                century = None
            if node.tag in {"h2", "h3"}:
                chapter = title
                chapter_id = node.attrs.get("id", "")
                m = re.search(r"_(\d{1,2})C?$", chapter_id)
                if m and 1 <= int(m[1]) <= 17:
                    century = int(m[1])
                elif node.tag == "h2":
                    century = None
            base_slug = slug(title)
            counts[base_slug] = counts.get(base_slug, 0) + 1
            record_slug = "mm-" + base_slug + (f"-{counts[base_slug]}" if counts[base_slug] > 1 else "")
            category = "Source account" if node.tag == "h4" and century else "Source context"
            if re.search(r"LETTER|EPISTLE", title, re.I):
                category = "Letter"
            elif re.search(r"CONFESSION|OF HOLY|BAPTISM|SUPPER|CREED", title, re.I):
                category = "Belief and practice"
            current = {"slug": record_slug, "title": title, "kind": "story", "category": category,
                       "date": extract_date(title, century), "century": century, "chapter": chapter,
                       "part": part, "source": "martyrs-mirror", "sourceAnchor": node.attrs.get("id") or chapter_id,
                       "headingLevel": int(node.tag[-1]), "status": "Historical source", "nodes": []}
            return
        if any(n.tag in {"h2", "h3", "h4"} for n in node.walk() if n is not node):
            for child in node.children:
                consume(child)
        elif current:
            current["nodes"].append(node)

    for element in body.children:
        consume(element)
    finish()
    payload = {"source": "martyrs-mirror", "sourceSha256": hashlib.sha256(raw).hexdigest(),
               "imageCount": len(copied_images), "recordCount": len(sections), "records": sections}
    out = ROOT / "content/martyrs-mirror.json.gz"
    out.parent.mkdir(exist_ok=True)
    data = (json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    out.write_bytes(gzip.compress(data, mtime=0))
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    result = import_archive(args.archive)
    print(f"Imported {result['recordCount']} sections and {result['imageCount']} images; SHA-256 {result['sourceSha256']}")
