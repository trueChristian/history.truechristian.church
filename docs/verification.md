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

All 1,272 imported sections and 45 book images remain available with the intact source edition. The supplied exhibit photographs and painting/video material remain research inputs and must not be copied to `_site/` or embedded in generated pages. The site validator checks this explicitly.

The branch data contains 42 histories and 45 documented connections. Its graph is checked for unknown records, inconsistent dates, and cycles. Internal detail pages contain the historical text; external citations are collected in numbered references.

Pull request checks produce a static preview artifact and a screenshot artifact. Publication on `main` requires both core validation and browser validation to pass.
