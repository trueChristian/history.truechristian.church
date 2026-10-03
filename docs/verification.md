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

The branch data contains 47 histories and 52 documented connections. Its graph is checked for unknown records, inconsistent dates, and cycles. Internal detail pages contain the historical text; external citations are collected in numbered references.

Pull request checks produce a static preview artifact and a screenshot artifact. Publication on `main` requires both core validation and browser validation to pass.

## Additional acceptance checks

- Both root and GitHub-project paths: generated local links **and fragment anchors**, unique era anchors, legacy redirects, readable Markdown content, original-source checksums and research-media exclusion.
- `npm run test:locales` builds a disposable two-language Astro fixture. It verifies real prefixed HTML, reciprocal alternate links, paragraph and HTML translations, localized search and explicit original-English fallback. The fixture is deleted and does not publish a translation.
- Source coverage tests validate every overview caption and prominent label against its internal record or explicit contextual disposition. Microannotations retain their legibility flags and evidence requests.
- Browser review includes legacy era deep links, Back/Forward/reset/repeated filtering, same-record language availability, direct source-account links and visible timeline/detail screenshots in desktop, mobile, light and dark views.

The local Chromium executable cannot start in this cloud container because its socket syscall is unavailable. Browser execution is therefore verified on the GitHub Actions runner; test code and screenshots accompany the exact tested commit. A successful earlier checkpoint is not represented as final-head verification.
