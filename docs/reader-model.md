# Martyrs’ Mirror: structured reading model

## What readers get

The complete book is presented as 2,123 manageable pages inside the shared site layout. The present source has 1,275 ordered sections: the 1,272 previously imported headings plus the edition notice, earlier front matter and edition license. The largest reading page contains 1,095 source words. Account and letter boundaries remain meaningful; a long account has numbered continuations, not a shortened replacement.

Contents, previous/next links, section-page links, original page markers, footnotes and note-return links all lead through the native reader. Historical profiles link directly to their full source accounts. Each reading page ends with a link to the corresponding passage on Project Gutenberg and edition details. The preserved local original is a secondary archival reference.

## Repository source and generation

- `sources/martyrs-mirror/original.html` and all 45 physical image files remain unchanged.
- `scripts/import_martyrs_reader.py` reconstructs the source body into ordered semantic blocks: headings, paragraphs, quotations, poetry, tables, illustrations, notes and other edition material.
- `content/martyrs-reader.json.gz` is the committed, locale-neutral reader model. Each page records its source block ranges, text and hash, original anchors, source page markers, illustrations, order and provenance.
- `src/lib/reader.mjs` validates the model and resolves its source references to the exact reading page that owns each anchor.
- `src/lib/reader-ui.mjs` and the preparation step create the site’s navigation and page structure. Gutenberg’s original global stylesheet and standalone page layout are not used.

The generator aims for about 800 words and never exceeds 1,100. It first respects source blocks. Oversize prose splits at sentence boundaries where possible; index material prefers complete line-break entries. Inline emphasis and each original ID survive structural splits. The committed segmentation is versioned and reproducible; it does not depend on screen width or translated word counts.

The complete source-body preservation ledger records 1,144,073 whitespace-normalized words, 2,024 IDs, 365 footnotes with return links and 50 image occurrences using 44 distinct inline files. The 45th archived image is the cover/favicon outside the body. The original bytes have their own SHA-256. These numbers describe this supplied edition, not a count of distinct martyrs.

Regenerate and verify with:

```bash
python3 scripts/import_martyrs_reader.py
python3 scripts/import_martyrs_reader.py --check
npm run check
```

`--check` performs deterministic regeneration without replacing the committed file. Unit tests verify the complete source and every block hash, sequence, relationship and anchor. The built-site check independently parses every English reading page and compares its source text with the model. Browser tests cover page and account boundaries, notes/backlinks, older fragments, original-site footers, reading controls and mobile presentation.

## Stable routes and future languages

The first page of every existing account retains `/en/stories/<old-slug>/`. Further pages use `/en/stories/<old-slug>/part-2/`, and so on. Stable page IDs are derived from the account and its first source block range; URLs and page boundaries come from the committed model. The full search index points to the relevant reading page rather than always opening the start of a long account. Timeline and daily-story entries continue to identify accounts.

Translations remain repository-local reviewed overlays in `content/locales/<locale>/records.json`, keyed by the stable reader page ID. The first page’s ID is the existing account slug; continuation IDs are listed in the manifest. Translate one reading page at a time. A translated page does not reflow or alter the source segmentation. Its missing source-anchor markers remain reachable at that page’s start; reviewed translated HTML can retain the exact note positions. Untranslated pages explicitly display the English source and are not advertised as translated. No translation service is invoked.

Old fragments on an account URL are redirected to their exact native owner when JavaScript is available. All newly generated book links already point to the correct owner and work without JavaScript. The unchanged archival original keeps its historical URL and anchors.

## Presentation and scope

Reader styling belongs to this site: bounded reading measure, responsive controls, light/dark appearance, persisted text size, poetry/stanza spacing and horizontally usable tables. No source words are rewritten. The book’s editorial, religious and historical wording remains attributed to the source. The user’s separate homepage/timeline design discussion is outside this reader change.

## Deployment cache compatibility

The application, transitive UI modules, search worker and site CSS are bundled by Astro with content-derived filenames. Runtime catalog, full-text search, branch and original-anchor data also use content-hashed JSON URLs. The shared theme is pinned by its revision in its stylesheet/script URLs. Unversioned data aliases remain for diagnostics and older links, but newly generated pages never request them.

This prevents returning readers from combining new page markup with an older cached reader application or data set. Browser tests serve stale payloads at all former unversioned runtime URLs and require the new reader to avoid them. Production upgrade verification retains the existing browser cache; it does not depend on a manual cache clear. The reader routes older fragments both on initial load and on later same-document hash changes, ignoring superseded lookups.

Reader-to-timeline links use the parent account’s catalog identity, never a continuation’s added page-number title. Edition-only material that has no historical catalog record does not offer a misleading timeline return. Generated-output checks cover every reading page; browser checks exercise the continuation → timeline → first page → next page round trip and linked people, events and places → full account in both directions.
