# Implementation and review handover

Review date: 3 October 2026.

Repository: <https://github.com/trueChristian/history.truechristian.church>.
Pull request: <https://github.com/trueChristian/history.truechristian.church/pull/1>.
Working branch: `feat/anabaptist-history-explorer`.

This is a review handover for Jeff and other contributors. It does not claim
that the site is already deployed or that all historical research is complete.

## Delivered runtime

| Area | Implementation | Review entry point |
| --- | --- | --- |
| Home | Six distinct stories selected per UTC day, with browser refresh | `/` |
| Timeline | Six eras from present to Acts; horizontal era and event navigation | `/timeline/` |
| Original collection | 1,272 source sections, original source anchors, 45 source images | `/stories/`, `/sources/martyrs-mirror/` |
| People | 14 profiles, documented alternate names, links to matching accounts | `/people/` |
| Events | 16 source-referenced milestone overviews | `/events/` |
| Traditions | 25 entries; 18 are labelled research invitations | `/traditions/` |
| Search | Full imported text in a worker; type, era, alias, and overlapping year filters | `/search/` |
| Appearance | System light/dark preference and persistent manual override | Appearance selector |
| Photographs | All 40 supplied timeline/exhibit stills; credits on mural imagery | `/sources/church-history/` |
| Contributions | GitHub issue drafts with page title, canonical URL, record, and evidence prompts | Page contribution links |
| Markdown | A readable `README.md` alongside every generated route | Page Markdown links |
| Shared theme | Upstream header behavior, logo, fixed directory links, and copyright footer | `docs/theme-integration.md` |

The build produces 1,341 navigational pages. A source section can be a letter,
chapter introduction, index, or account; the section count is not a count of
unique martyrs or independently verified events. People mentioned only in the
book remain searchable even when they do not yet have their own curated profile.

## Validation and how to reproduce it

Node.js 22 or later is sufficient for the core site checks:

```bash
npm run check
SITE_BASE_PATH=/history.truechristian.church npm run check
npm --prefix vendor/theme run check
```

The six behavioural tests cover daily selection, research-request exclusion,
accent/alias/full-text search, overlapping date filters, contribution context,
and source-import preservation. The build validator checks every generated
page's local URLs, deployment base, Markdown equivalent, required page chrome,
protected theme assets, gallery size, and mural credits. Both root-path and
project-path builds have been exercised locally, as has the shared-theme check.

Browser checks are separate and require Chromium:

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:browser
```

`scripts/browser-check.mjs` runs nine scenarios: daily turnover, saved appearance,
era navigation, archive filters/pagination, the actual search worker, original
source/image/Markdown access, contribution context, mobile menu behavior and
overflow at 320/390/768/1024/1440 pixels, and the 404 page. It also detects uncaught
browser errors and failed local requests. Font-service access is stubbed so
behavioural tests do not depend on that external service.

**Browser execution passed in GitHub Actions.** This workspace's local browser
download returned invalid archives, so verification was completed on the runner
in [run 37120575900](https://github.com/trueChristian/history.truechristian.church/actions/runs/37120575900)
for runtime commit `f08ca25798b04158a877cc3828ac5d890ad79cfb`. All nine browser
scenarios passed with no uncaught errors or failed local assets. Desktop and
mobile screenshots were downloaded and visually reviewed. The screenshots use
fallback fonts because the behavioural check stubs the external font service.

CI artifacts are `history-site-preview` and `history-browser-review`. Download
the first into `_site/` to review the exact build with `npm run serve`; the second
contains screenshots for visual review. Tests and the build must pass before the
workflow permits publication.

## Review checklist

- [x] Six Node behavioural tests pass locally.
- [x] Generated pages and internal paths validate at the root and project path.
- [x] Shared theme validation passes locally.
- [x] Source date uncertainty and the Felix Mantz 1526/1527 discrepancy remain visible.
- [x] Modern research requests are labelled and excluded from daily stories.
- [x] PR validation and all nine browser scenarios pass for the implementation commit.
- [x] Desktop/mobile screenshots are visually reviewed; Chromium exercises the actual navigation.
- [ ] Enable GitHub Pages using the GitHub Actions source, if not already configured.
- [ ] Merge after owner review; verify the resulting Pages deployment and final URL.
- [ ] Review the transcribed timeline coverage and historical references as editorial work.

This PR does not merge or publish itself. `main` remains the publication branch.
The workflow reads the configured Pages origin and base path, so the custom
domain and repository project URL are both supported.

## Historical work still invited

The supplied timeline is a coverage guide. The site currently presents selected
milestones and searchable source sections, rather than a fully transcribed
interactive genealogy of every branch pictured in the exhibits.

The following entries explicitly request sources, dates, people, and a detailed
account in `content/curated.json`:

- Waterlander, Flemish, and Frisian Mennonites.
- Russian Mennonite communities and Old Colony Mennonites.
- Old Order Mennonites and General Conference Mennonites.
- Church of God in Christ, Mennonite; Conservative Amish Mennonites.
- Beachy Amish, Old Order Amish, and conservative Mennonite fellowships.
- Dutch Mennonite Conference; Evangelical Mennonite Brethren.
- Evangelical Mennonite Conference and Rudnerweider Mennonites.
- Charity Ministries and Agape fellowships.

The approximate 2010 Agape account is attributed to the owner. It is not treated
as an independently documented institutional history. Existing book accounts
retain their historical perspective and are not silently rewritten as modern
scholarship.

Use `content/curated.json` for new overviews and `content/overrides.json` for
reviewed source metadata. Read `docs/content-model.md` and `docs/sources.md` before
editing. Keep existing slugs stable, cite the relevant source photograph or
published reference, and run the checks after each coherent change.

## Changes made during verification

- Restored the theme's source, reference screenshots, and validation tools to the
  committed snapshot, so upstream instructions and documentation can be followed.
- Corrected imported century detection, ordinal labels, and summary truncation.
- Removed unsubstantiated alternate spellings from editorial profiles.
- Preserved paragraph boundaries in generated source Markdown.
- Changed repeat builds to use a fresh directory and reject mixed deployment bases.
- Invalid/empty searches invalidate older worker responses; failed catalog loads
  can be retried instead of leaving a permanently rejected cached promise.
- Added the tests, full-site validator, browser checks, Pages workflow, and
  contribution form previously missing from the pushed runtime commit.
