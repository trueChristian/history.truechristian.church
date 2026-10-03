# Anabaptist Church History

A static, source-linked history explorer for GitHub Pages, using the shared [True Christian Church theme](https://github.com/trueChristian/theme).

## Run locally

Node.js 22 or later is the only runtime dependency. No npm packages or external services are required.

```bash
npm run check
npm run serve
```

Open http://127.0.0.1:8080. `npm run build` creates the publishable site in `_site/`.

## Included

- A horizontal era navigator from the present back to Acts, with selectable era views and event milestones.
- Six daily stories, selected consistently by UTC date and updated in the browser without a server or daily rebuild.
- All 1,272 sections of the supplied Martyrs’ Mirror, with all 45 original images and the intact edition.
- Full-text search in a browser worker, with alternate names, record type, era, and overlapping date-range filters.
- People profiles linked to source accounts mentioning their names, event overviews, and tradition pages.
- Forty supplied Church History photographs, including timeline overviews and close-ups.
- System-linked light/dark appearance with a saved manual override.
- A Markdown equivalent for every generated page, including every source account.
- Prefilled GitHub contribution links carrying the page title, URL, record, and current date label into an issue draft.
- The shared logo, responsive accessible menu, scroll-direction header, complete link directory, and copyright footer.

## Publish on GitHub Pages

1. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
2. Merge the reviewed implementation to `main`.
3. The workflow tests and builds the site, reads the configured Pages URL, and publishes it.

Pull requests run validation and produce a downloadable `history-site-preview` artifact. Publishing happens only from `main`. The build supports both the repository’s project URL and a configured custom domain; it obtains the base path from `actions/configure-pages`.

The browser job checks nine scenarios in Chromium, including daily refresh,
appearance persistence, the real search worker, filters, source pages,
contribution links, mobile menus, and overflow at five viewport widths. It saves
desktop and mobile screenshots as the `history-browser-review` artifact.
Publishing depends on both validation jobs passing.

To run those browser checks locally after building:

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:browser
```

The browser tooling is used only for verification; the published site has no npm
runtime dependencies. See [docs/handover.md](docs/handover.md) for review status
and the outstanding historical research and publishing steps.

To check a project-path deployment locally:

```bash
SITE_BASE_PATH=/history.truechristian.church npm run check
SITE_BASE_PATH=/history.truechristian.church npm run serve
```

Open http://127.0.0.1:8080/history.truechristian.church/.

## Add or correct history

Readers use **Contribute** or a page’s correction link. This opens an issue draft; the reader adds evidence and submits it through GitHub. Nothing is published automatically.

Maintainers edit `content/curated.json` for people, events, and traditions. Each record includes a stable slug, title, kind, summary, paragraphs, source references, and optional dated activity and relationships. Existing records show complete examples.

Use `content/overrides.json`, keyed by the imported record’s slug, for reviewed metadata corrections or added relationships. The original imported heading and text remain available alongside editorial metadata. Changes to the source import are made through `scripts/import_martyrs_mirror.py`.

## Reproduce the book import

Python 3 is needed only when reimporting the supplied book. The importer uses the standard library.

```bash
python3 scripts/import_martyrs_mirror.py '/path/to/Martyrs Mirror.zip'
npm run check
```

The compressed normalized source is stored reproducibly in `content/martyrs-mirror.json.gz`. The importer preserves original source wording, source anchors, page markers, and illustrations. It derives dates only from explicit heading dates or a containing source century. It does not treat those dates as independently verified facts.

## Sources and attribution

See [docs/sources.md](docs/sources.md) for import details and attribution, [docs/content-model.md](docs/content-model.md) for editing, and [docs/theme-integration.md](docs/theme-integration.md) for the shared-theme contract.

Book text and illustrations are distinct from Behalt imagery. **Behalt** is credited to **Heinz Gaugel** and the [Amish & Mennonite Heritage Center](https://behalt.com/), with credits on every page displaying the mural or its exhibit-panel reproductions. The supplied timeline material is described as public domain by the contributor; this does not classify the Behalt painting as public domain.

The repository’s GPL license remains in `LICENSE`. Source notices and artwork credits are preserved separately.
