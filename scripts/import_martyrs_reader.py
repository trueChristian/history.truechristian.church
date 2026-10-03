#!/usr/bin/env python3
"""Build the deterministic, locale-neutral native reader from the preserved edition.

The legacy import remains untouched and supplies permanent account identities. The
original HTML supplies the complete text, original heading links, and front matter.
Run: python3 scripts/import_martyrs_reader.py [--check]

Pagination is an edition-level editorial boundary, never a browser or locale word
count decision. Commit this manifest with its generator. Changing boundaries is a
URL/translation migration: the source-derived page IDs must not be reassigned.
"""
from __future__ import annotations

import argparse
from bisect import bisect_left
from collections import Counter
import gzip
import hashlib
import html
import json
from pathlib import Path
import re

from import_martyrs_mirror import Document, Element, compact, VOID

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "content/martyrs-reader.json.gz"
TARGET_WORDS = 800
MAX_WORDS = 1100
SOURCE_WEBSITE = "https://www.gutenberg.org/cache/epub/65855/pg65855-images.html"
EDITION_URL = "https://www.gutenberg.org/ebooks/65855"
VOID.add("col")
ALLOWED = {"p", "div", "span", "a", "em", "i", "b", "strong", "sup", "sub",
           "blockquote", "ul", "ol", "li", "table", "tr", "td", "th", "tbody",
           "thead", "tfoot", "br", "hr", "img", "dl", "dt", "dd", "h1", "h2",
           "h3", "h4", "h5", "h6", "colgroup", "col"}


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def node_text(node: Element | str) -> str:
    return node.text() if isinstance(node, Element) else node


def walk(node: Element | str):
    return node.walk() if isinstance(node, Element) else []


def block_kind(node: Element | str) -> str:
    if isinstance(node, str):
        return "text" if node.strip() else "spacing"
    classes = node.attrs.get("class", "").split()
    if "footnote" in classes:
        return "footnote"
    if "poetry-container" in classes or "poetry" in classes:
        return "poetry"
    if any(n.tag == "table" for n in node.walk()):
        return "table"
    if any(n.tag == "img" for n in node.walk()):
        return "illustration"
    if node.tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
        return "heading"
    if node.tag == "p":
        return "paragraph"
    if node.tag in {"ul", "ol", "dl"}:
        return "list"
    if node.tag == "hr":
        return "separator"
    if node.tag == "blockquote":
        return "quotation"
    if "pagenum" in classes:
        return "page-marker"
    return "source-block"


def serialize(node: Element | str) -> str:
    """Preserve text and semantic markup, not executable source styling."""
    if isinstance(node, str):
        return html.escape(node)
    if node.tag in {"script", "style"}:
        raise ValueError("Unexpected executable source content")
    tag = "div" if node.tag in {"header", "footer"} else node.tag
    if tag == "h1":
        tag = "h2"  # The native document already has one h1.
    inner = "".join(serialize(child) for child in node.children)
    if tag not in ALLOWED:
        return inner
    attrs = []
    if "id" in node.attrs:
        if not re.fullmatch(r"[A-Za-z0-9_.:-]+", node.attrs["id"]):
            raise ValueError(f"Unsafe source ID: {node.attrs['id']}")
        attrs.append(("id", node.attrs["id"]))
    classes = node.attrs.get("class", "").split()
    semantic = {"pagenum": "source-page", "figcenter": "source-figure",
                "caption": "source-caption", "fnanchor": "source-note-reference",
                "footnote": "source-footnote", "label": "source-note-backlink"}
    if classes:
        attrs.append(("class", " ".join(semantic.get(c, "source-" + c) for c in classes
                                          if re.fullmatch(r"[A-Za-z0-9_-]+", c))))
    if "pagenum" in classes:
        attrs.append(("aria-label", "Original page " + compact(node.text())))
    if tag == "a":
        href = node.attrs.get("href", "")
        if href and not (href.startswith("#") or re.match(r"https?://", href)):
            raise ValueError(f"Unsupported source link: {href}")
        if href:
            attrs.append(("href", href))
        if href.startswith("http"):
            attrs.append(("rel", "noopener noreferrer"))
    if tag == "img":
        name = Path(node.attrs.get("src", "")).name
        if not re.fullmatch(r"[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png)", name, re.I):
            raise ValueError(f"Unsafe source image: {name}")
        if not (ROOT / "sources/martyrs-mirror/images" / name).is_file():
            raise ValueError(f"Missing source image: {name}")
        attrs.extend([("src", "__BASE__/sources/martyrs-mirror/images/" + name),
                      ("alt", node.attrs.get("alt", "")), ("loading", "lazy")])
    for name in ("colspan", "rowspan", "lang", "title"):
        if name in node.attrs:
            attrs.append((name, node.attrs[name]))
    attr_text = "".join(f' {k}="{html.escape(v, quote=True)}"' for k, v in attrs)
    return f"<{tag}{attr_text}>" + ("" if tag in VOID else inner + f"</{tag}>")


def slice_node(node: Element | str, start: int, end: int, offset=0, final=False):
    """Slice visible character ranges while cloning formatting and IDs only once.

    Empty source anchors/images/breaks belong to the slice starting at that
    position. A trailing empty node belongs to the last slice. No text is rewritten.
    """
    size = len(node_text(node))
    if size == 0:
        return node if start <= offset < end or (final and offset == end) else None
    if offset >= end or offset + size <= start:
        return None
    if isinstance(node, str):
        return node[max(0, start - offset):min(size, end - offset)]
    clone = Element(node.tag, list(node.attrs.items()))
    if offset < start:
        clone.attrs.pop("id", None)
    cursor = offset
    for child in node.children:
        sliced = slice_node(child, start, end, cursor, final)
        if sliced is not None:
            clone.children.append(sliced)
        cursor += len(node_text(child))
    return clone


def fragments(node: Element | str):
    """Prefer complete paragraphs/figures; split giant prose at sentence boundaries.

    The original index is one 9,252-word paragraph, so a paragraph-only strategy
    cannot bound the reader. Character-range slicing preserves inline formatting,
    every source ID exactly once, and all original text even in that index.
    """
    text = node_text(node)
    words = list(re.finditer(r"\S+", text))
    if len(words) <= MAX_WORDS:
        return [(node, 0)]
    starts = [word.start() for word in words]
    line_breaks = []

    def find_breaks(child, offset=0):
        if isinstance(child, str):
            return
        if child.tag == "br":
            line_breaks.append(bisect_left(starts, offset))
        for item in child.children:
            find_breaks(item, offset)
            offset += len(node_text(item))

    find_breaks(node)
    result, start, first = [], 0, 0
    while len(words) - first > MAX_WORDS:
        # Prefer actual line/entry breaks, not the source's arbitrary line wrapping.
        candidates = [index for index in line_breaks
                      if first + TARGET_WORDS - 100 <= index <= first + TARGET_WORDS + 100]
        sentence_endings = []
        for index in range(first + TARGET_WORDS - 100,
                           min(first + TARGET_WORDS + 100, len(words) - 1)):
            boundary = words[index].start()
            prefix = text[words[index - 1].start():boundary]
            if re.search(r"[.!?;:][\"'”’)]*\s*$", prefix):
                sentence_endings.append(index)
        candidates = candidates or sentence_endings
        chosen = min(candidates, key=lambda i: (abs(i - first - TARGET_WORDS), i)) if candidates else first + TARGET_WORDS
        end = words[chosen].start()
        result.append((slice_node(node, start, end), start))
        start, first = end, chosen
    result.append((slice_node(node, start, len(text), final=True), start))
    if "".join(node_text(n) for n, _ in result) != text:
        raise ValueError("Paragraph slicing changed source text")
    original_ids = [n.attrs["id"] for n in walk(node) if "id" in n.attrs]
    result_ids = [n.attrs["id"] for frag, _ in result for n in walk(frag) if "id" in n.attrs]
    if original_ids != result_ids:
        raise ValueError("Paragraph slicing changed source anchors")
    return result


def make_sections(body: Element, legacy: dict):
    """Match headings in source order, retaining legacy slugs without reslugging."""
    sections = []
    current = None
    index, enabled = 0, False

    def begin(slug, title, heading=None, metadata=None):
        nonlocal current
        current = {"recordSlug": slug, "title": title, "heading": heading,
                   "nodes": [], "metadata": metadata or {}}
        sections.append(current)

    def consume(node):
        nonlocal current, index, enabled
        if isinstance(node, str):
            if current is not None:
                current["nodes"].append(node)
            elif node.strip():
                raise ValueError("Unassigned text before first source section")
            return
        if node.attrs.get("id") == "pg-header":
            begin("mm-edition-notice", "Edition notice")
            current["nodes"].append(node)
            begin("mm-front-matter", "Title pages, contents, and publisher’s preface")
            return
        if node.attrs.get("id") == "pg-footer":
            begin("mm-edition-license", "Project Gutenberg license")
            current["nodes"].append(node)
            return
        if node.attrs.get("id") == "Translators_Preface":
            enabled = True
        if enabled and node.tag in {"h2", "h3", "h4"}:
            if index >= len(legacy["records"]):
                raise ValueError("Unexpected extra source heading")
            record = legacy["records"][index]
            title = compact(node.text(True))
            if title != record["title"]:
                raise ValueError(f"Source/legacy heading mismatch at {index}: {title}")
            begin(record["slug"], title, node, record)
            index += 1
            return
        if any(n.tag in {"h2", "h3", "h4"} for n in node.walk() if n is not node):
            # Keep all container IDs even where a chapter wrapper is flattened.
            if node.attrs.get("id"):
                current["nodes"].append(Element("span", [("id", node.attrs["id"])]))
            for child in node.children:
                consume(child)
        else:
            if current is None:
                begin("mm-front-matter", "Title pages, contents, and publisher’s preface")
            current["nodes"].append(node)

    for child in body.children:
        consume(child)
    if index != legacy["recordCount"]:
        raise ValueError(f"Matched {index}, expected {legacy['recordCount']} headings")
    return sections


def generate() -> dict:
    raw = (ROOT / "sources/martyrs-mirror/original.html").read_bytes()
    legacy_bytes = (ROOT / "content/martyrs-mirror.json.gz").read_bytes()
    legacy = json.loads(gzip.decompress(legacy_bytes))
    if hashlib.sha256(raw).hexdigest() != legacy["sourceSha256"]:
        raise ValueError("Original edition does not match the untouched legacy import")
    document = Document(raw.decode("utf-8"))
    body = next(n for n in document.root.walk() if n.tag == "body")
    sections = make_sections(body, legacy)
    pages, section_manifest, anchors, images = [], [], {}, []
    source_reassembled = []
    for section_index, section in enumerate(sections):
        heading = section["heading"]
        heading_text = heading.text() if heading else ""
        heading_html = (f'<span id="{html.escape(heading.attrs["id"], quote=True)}"></span>'
                        if heading and heading.attrs.get("id") else "")
        heading_html += "".join(serialize(c) for c in heading.children) if heading else html.escape(section["title"])
        chunks, current, word_count = [], [], len(heading_text.split())
        for block_index, node in enumerate(section["nodes"]):
            for frag, offset in fragments(node):
                words = len(node_text(frag).split())
                if current and word_count and words and (word_count + words > MAX_WORDS or word_count >= TARGET_WORDS):
                    chunks.append(current)
                    current, word_count = [], 0
                current.append((frag, f"b{block_index:05d}-o{offset:06d}"))
                word_count += words
        if current or not chunks:
            chunks.append(current)
        section_pages = []
        for part_index, chunk in enumerate(chunks):
            slug = section["recordSlug"]
            # First-page content identity stays compatible with existing records.
            # Continuations are identified by immutable original block/offset.
            first_content = next((block_id for node, block_id in chunk if node_text(node).strip()), chunk[0][1] if chunk else "empty")
            page_id = slug if part_index == 0 else slug + "--" + first_content
            nodes = ([heading] if part_index == 0 and heading else []) + [n for n, _ in chunk]
            text = (heading_text if part_index == 0 else "") + "".join(node_text(n) for n, _ in chunk)
            owned_ids = [n.attrs["id"] for node in nodes for n in walk(node) if "id" in n.attrs]
            page_images = ["sources/martyrs-mirror/images/" + Path(n.attrs["src"]).name
                           for node in nodes for n in walk(node) if n.tag == "img"]
            blocks = [{"id": slug + "--" + block_id, "kind": block_kind(node),
                       "sourceRange": block_id, "continued": not block_id.endswith("o000000"),
                       "html": serialize(node), "text": node_text(node),
                       "sourceTextSha256": digest(node_text(node)),
                       "sourceAnchorIds": [n.attrs["id"] for n in walk(node) if "id" in n.attrs]}
                      for node, block_id in chunk]
            # A source fragment belongs to exactly one native page.
            for anchor in owned_ids:
                if anchor in anchors:
                    raise ValueError(f"Duplicate source anchor: {anchor}")
                anchors[anchor] = page_id
            page = {"id": page_id, "contentId": page_id, "recordSlug": slug,
                    "title": section["title"], "headingHtml": heading_html if part_index == 0 else "",
                    "headingIsSource": bool(heading) and part_index == 0,
                    "html": "".join(serialize(n) for n, _ in chunk),
                    "text": compact(text), "wordCount": len(text.split()),
                    "part": part_index + 1, "partCount": len(chunks),
                    "sectionIndex": section_index, "bookIndex": len(pages),
                    "route": f"stories/{slug}/" + (f"part-{part_index + 1}/" if part_index else ""),
                    "sourceAnchorIds": owned_ids,
                    "blocks": blocks,
                    "sourcePages": [anchor[5:] for anchor in owned_ids if anchor.startswith("Page_")],
                    "images": page_images, "sourceTextSha256": digest(compact(text)),
                    "sourceRanges": [block_id for _, block_id in chunk]}
            if page["wordCount"] > MAX_WORDS:
                raise ValueError(f"Oversized native page: {page_id}: {page['wordCount']}")
            pages.append(page)
            section_pages.append(page_id)
            source_reassembled.append(text)
            images.extend(page_images)
        metadata = section["metadata"]
        section_manifest.append({"recordSlug": section["recordSlug"], "title": section["title"],
                                 "sectionIndex": section_index, "pageIds": section_pages,
                                 "headingLevel": metadata.get("headingLevel", 2),
                                 "chapter": metadata.get("chapter", section["title"]),
                                 "part": metadata.get("part", "Edition material"),
                                 "kind": "letter" if metadata.get("category") == "Letter" else
                                         "account" if metadata.get("category") == "Source account" else "context",
                                 "legacyRecord": bool(metadata)})
    previous_anchor = ""
    for index, page in enumerate(pages):
        page["previousId"] = pages[index - 1]["id"] if index else None
        page["nextId"] = pages[index + 1]["id"] if index + 1 < len(pages) else None
        # Every page cites the original website, using real source anchors only.
        # Pages without a new anchor retain the nearest preceding source location.
        page["sourceAnchor"] = page["sourceAnchorIds"][0] if page["sourceAnchorIds"] else previous_anchor
        page["sourceURL"] = SOURCE_WEBSITE + ("#" + page["sourceAnchor"] if page["sourceAnchor"] else "")
        previous_anchor = page["sourceAnchorIds"][-1] if page["sourceAnchorIds"] else page["sourceAnchor"]
    source_text = compact(body.text())
    assembled = compact("".join(source_reassembled))
    if source_text != assembled:
        position = next((i for i, (a, b) in enumerate(zip(source_text, assembled)) if a != b), min(len(source_text), len(assembled)))
        raise ValueError(f"Reader changed source text at {position}: {source_text[position:position+100]!r} / {assembled[position:position+100]!r}")
    source_ids = [n.attrs["id"] for n in body.walk() if "id" in n.attrs]
    if Counter(source_ids) != Counter(anchors.keys()):
        raise ValueError("Reader dropped source anchors")
    source_images = ["sources/martyrs-mirror/images/" + Path(n.attrs["src"]).name for n in body.walk() if n.tag == "img"]
    if source_images != images:
        raise ValueError("Reader changed source illustration ordering")
    fragment_links = [n.attrs["href"][1:] for n in body.walk() if n.attrs.get("href", "").startswith("#")]
    if any(anchor not in anchors for anchor in fragment_links):
        raise ValueError("Unresolved source link")
    return {"schemaVersion": 1, "source": "martyrs-mirror", "sourceLanguage": "en",
            "sourceWebsite": SOURCE_WEBSITE, "editionURL": EDITION_URL,
            "segmentationVersion": 1, "targetWords": TARGET_WORDS, "maxWords": MAX_WORDS,
            "sourceSha256": legacy["sourceSha256"], "legacyImportSha256": hashlib.sha256(legacy_bytes).hexdigest(),
            "sourceTextSha256": digest(source_text), "sourceWordCount": len(source_text.split()),
            "sourceCharacterCount": len(source_text), "sourceAnchorCount": len(source_ids),
            "sourceLinkCount": len(fragment_links), "sourceImageOccurrences": len(images),
            "sourceImageFiles": len(set(images)), "archivedImageFiles": legacy["imageCount"],
            "legacyRecordCount": legacy["recordCount"],
            "sectionCount": len(sections), "pageCount": len(pages),
            "anchorToPage": anchors, "sections": section_manifest, "pages": pages}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify reproducibility without writing")
    args = parser.parse_args()
    result = generate()
    encoded = (json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    data = gzip.compress(encoded, mtime=0)
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_bytes() != data:
            raise SystemExit("Reader manifest is stale; regenerate and review boundary changes")
    else:
        OUTPUT.write_bytes(data)
    print(f"{'Verified' if args.check else 'Prepared'} {result['pageCount']} native reader pages; "
          f"{result['sourceWordCount']} source words, {result['sourceAnchorCount']} anchors, "
          f"{result['sourceImageOccurrences']} illustration occurrences preserved")
