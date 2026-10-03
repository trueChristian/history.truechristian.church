# Implementation verification

The implementation uses Astro 7.3.5 for static page generation, TypeScript for timeline behavior, and CSS/SVG for the connected vertical display. It remains deployable to GitHub Pages without a server runtime.

## Required checks

- `npm ci`
- `npm run check`
- `npm --prefix vendor/theme run check`
- `npx playwright install chromium`
- `npm run test:browser`

The root URL and `/history.truechristian.church` deployment prefix are supported. Every generated page must use the correct deployment prefix, preserve the shared chrome, provide its Markdown equivalent, and resolve its internal links.

The browser suite verifies daily selection, appearance persistence, era and stream filtering, SVG connections, people/place drill-downs, Martyrs’ Mirror century filtering and pagination, the actual search worker, source provenance, issue context, mobile keyboard navigation, page overflow, and 404 responses. Screenshots cover the desktop and mobile landing page and Reformation timeline.

## Source and publishing invariants

All 1,272 imported sections and 45 original book image files remain available with the intact source edition. The supplied exhibit photographs and painting/video material remain research inputs and must not be copied to `_site/` or embedded in generated pages. The site validator checks this explicitly.

The published branch data contains 45 histories and 50 documented connections. Its graph is checked for unknown records, inconsistent dates, and cycles. Internal detail pages contain the historical text; external citations are collected in numbered references.

Pull request checks produce a static preview artifact and a screenshot artifact. Publication on `main` requires both core validation and browser validation to pass.

## Additional acceptance checks

- Both root and GitHub-project paths: generated local links **and fragment anchors**, unique era anchors, legacy redirects, readable Markdown content, original-source checksums and research-media exclusion.
- `npm run test:locales` builds a disposable two-language Astro fixture. It verifies real prefixed HTML, reciprocal alternate links, paragraph and HTML translations, localized search and explicit original-English fallback. The fixture is deleted and does not publish a translation.
- Source coverage tests validate every overview caption and prominent label against its internal record or explicit contextual disposition. Microannotations retain their legibility flags and evidence requests.
- Browser review includes legacy era deep links, Back/Forward/reset/repeated filtering, same-record language availability, direct source-account links and visible timeline/detail screenshots in desktop, mobile, light and dark views.

The local Chromium executable cannot start in this cloud container because its socket syscall is unavailable. Browser execution is therefore verified on the GitHub Actions runner; test code and screenshots accompany the exact tested commit. A successful earlier checkpoint is not represented as final-head verification.

## Final review scope (3 October 2026)

The source collection contains 269 authored histories. The publication scope currently includes 266: 74 people, 127 events, 45 traditions and shared institutions, and 20 places; three future-extension records are held without altering the archive. All 1,272 book sections and 45 physical image files remain intact. Every in-scope overview-panel subject and every prominent branch/leader label is mapped to a sourced internal history or its documented context. The seven smaller named chart figures and distinct Old Order/Swiss regional histories also have researched accounts.

This does not claim an exhaustive independent article for each of the 201 small chart annotations: the inventory explicitly distinguishes 110 mapped narratives, 84 related overviews, three bounded evidence requests, and four context/credit entries. The three requests concern an unidentified junior college, an unnamed relief agency (1934), and an unexplained 1970s disciplinary label. They cannot responsibly be resolved from a name guess or an unsupported allegation. The new education, publication, settlement, conference and service histories address the remaining identifiable details. Seven source regions need clearer evidence; the panels leave some local mission participants unnamed. These boundaries are visible in the public coverage guide with contextual issue drafts.

Final visual checks must include the page-body dark-heading contrast regression (4.5:1 minimum), connection-line contrast (3:1 minimum), six visible daily title links near the top, expanded detail views, mobile layout, and no-JavaScript visibility. Header/footer brand assets remain unchanged.

The approved shared-theme font stylesheet loads Montserrat 400/500 and Raleway 400 with `display=swap`. Browser behavioral tests deliberately stub that external stylesheet, so their artifacts use documented fallback fonts; the production head retains the real font request. The build validator checks that the font loading contract remains present.

## Native reader acceptance

The complete source body is preserved across 2,123 reading pages. `npm run check` independently compares the generated English reader text with the structured source manifest, in addition to all local links and fragment anchors. The eight reader-model tests cover deterministic regeneration, every original word/block hash, all 365 note-return pairs, 2,024 anchors, all old account routes, stable locale-prefixed continuations and original-source website provenance. Browser scenarios additionally cover the 44-page Confession of Faith, cross-section next/previous, notes/backlinks, older fragments, profile-to-full-account navigation, persisted text size, mobile poetry/tables and visible source footers.

Deployment-cache regressions require content-hashed runtime script, worker, stylesheet and JSON URLs, including transitive application modules. The browser suite poisons the former unversioned asset URLs with stale payloads and asserts that no new page requests them. It also enters an older source-page fragment after reader initialization to verify the same-document `hashchange` path. Production checks must use an existing cached browser context as well as a fresh reader tab.

## Timeline chronology and saved order

The homepage, timeline, and branch view default to oldest first, including their server-rendered and Markdown content. The Acts overview opens the first era as an editorial introduction without changing its historical date. Existing first-century source accounts are visible in the default timeline and explicitly labelled as Martyrs’ Mirror. Their wording and source dates are unchanged. Undated histories remain at the end of their assigned era; undated source context follows the historical eras. Equal dates use stable record IDs as a tie-breaker.

The labelled Timeline order selector reverses eras and dated entries together, including the era rail and era menu. Its validated oldest/newest preference is shared through browser local storage across home, timeline, and branch pages. Explicit URL direction overrides that saved choice for a view without overwriting it. History state and explicit changed-view URLs preserve Back/Forward order. Reset clears filters while retaining the selected order. Blocked or corrupt storage falls back gracefully to oldest first; the control becomes enabled only after timeline initialization.

Regression coverage includes early apostolic-account visibility, both orders, same-date ties, undated records, saved cross-page/reload preference, explicit URL overrides, Back/Forward, era hashes, filters/reset/no-results, pagination/connections, corrupt and blocked storage, and oldest-first output without JavaScript. Desktop/mobile screenshots show the opening timeline entries.

The shared layout omits the repeated archive home link beneath the logo. Language and Appearance remain right-aligned in a compact row without the previous vertical padding. Browser checks cover the homepage, timeline, profile, and native reader at desktop and mobile widths.
