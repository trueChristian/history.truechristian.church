# Anabaptist Church History

An Astro 7 and TypeScript archive for A True Christian Church, using the shared [True Christian Church theme](https://github.com/trueChristian/theme). The vertical timeline is the main navigation: people, places, events, streams, and Martyrs’ Mirror accounts connect through internal detail pages.

## Run

Use Node.js 24 and the pinned dependencies:

```bash
npm ci
npm run check
npm run serve
```

Open http://127.0.0.1:8080. `npm run build` prepares the source data and generates `_site/` through Astro. `npm run dev` starts Astro’s development server. `npm run typecheck` validates the Astro components and TypeScript navigation.

## Included

- A vertical timeline with SVG branch connections, era/stream/type filters, chronology controls, title/name search, and source-account pagination.
- Original historical overviews for 42 traditions and shared institutions, 30 events, 14 people, and 10 places.
- All 1,272 supplied Martyrs’ Mirror sections and 45 book illustrations, the intact edition, source anchors, and readable Markdown equivalents.
- Century guides integrated into the timeline, with direct links to the corresponding accounts.
- Six daily source accounts and full-text search with aliases, types, eras, and date ranges.
- Internal links connecting people, places, events, branch histories, and source accounts.
- Numbered references; the historical explanation is written and presented on this site.
- Contextual GitHub issue drafts for corrections and additions.
- System-linked appearance with a saved override, accessible mobile menus, and unchanged shared-theme assets.

The supplied exhibit photographs and IMG_9359 recording are research inputs. They are excluded from the published assets and never embedded in the site. The repository preserves the source photographs and the existing research still. Their information is recreated in the timeline and articles. Martyrs’ Mirror’s original book illustrations remain part of the source collection.

## Verification and publication

`npm run check` runs the behavioural tests, builds all pages, checks the TypeScript/Astro components, and validates internal links, Markdown equivalents, theme assets, and exclusion of exhibit media. CI adds Chromium checks for the actual timeline, filters, linked histories, source accounts, search worker, daily selection, mobile menus, appearance, and 404 behavior.

```bash
npx playwright install chromium
npm run test:browser
```

Pull requests create `history-site-preview` and `history-browser-review` artifacts. Merged changes on `main` publish through GitHub Pages after both validation jobs pass. The workflow reads the configured Pages origin and base path.

To validate the repository project path locally:

```bash
SITE_BASE_PATH=/history.truechristian.church npm run check
SITE_BASE_PATH=/history.truechristian.church npm run serve
```

## Languages

English is published at `/en/`. Old URLs redirect to the same page. Stable record identities, repository-local UI dictionaries and reviewed translation overlays support future languages without an external source pipeline. Only available translations appear in the language menu. See [docs/localization.md](docs/localization.md).

## Edit the history

Edit `content/curated.json` for dated people, events, traditions, places, summaries, full paragraphs, relationships, and references. Edit `content/branches.json` for the branch families and documented connections. Every page’s contribution link opens an issue draft carrying its title, canonical URL, record, and current date label.

Use `content/overrides.json` for reviewed metadata changes to imported accounts. The book’s wording and original heading remain preserved. Reimport with:

```bash
python3 scripts/import_martyrs_mirror.py '/path/to/Martyrs Mirror.zip'
```

See [docs/content-model.md](docs/content-model.md), [docs/sources.md](docs/sources.md), and [docs/verification.md](docs/verification.md). The unchanged theme snapshot and its contract are described in [docs/theme-integration.md](docs/theme-integration.md).
