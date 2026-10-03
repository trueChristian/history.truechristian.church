# Content and maintenance

## Files

| File | Purpose |
| --- | --- |
| `content/site.json` | Site name, theme revision, and source catalogue |
| `content/martyrs-mirror.json.gz` | Reproducible normalized book import |
| `content/curated.json` | Authored people, events, and tradition records |
| `content/overrides.json` | Reviewed metadata additions/corrections keyed by an imported slug |
| `content/photographs.json` | Gallery inventory and required mural-credit flags |
| `sources/` | Original book and web-ready supplied source photographs |

## Records

Use an existing curated record as the complete editing example. The required identity fields are `slug`, `title`, and `kind`; supported kinds are `story`, `event`, `person`, and `tradition`. A record’s stable slug forms its readable URL. Imported duplicate headings receive numeric suffixes, never UUIDs.

`summary` gives the short card description. `paragraphs` contains the full authored account. `references` contains named links to the evidence. `aliases` contains documented alternate names and spellings. `people` and `traditions` contain related record slugs; the build rejects nonexistent relationships.

`date` is either null or an object with `start`, `end`, `label`, and `basis`. These values describe the event or dated activity being presented; they are not automatically a person’s birth/death years. Missing or approximate dates must remain explicit. Search includes an account when its date range overlaps the requested period. Undated records are excluded when the reader requests numeric date bounds.

`era` can explicitly assign an undated contextual record to one of the six eras. Otherwise the start of its dated range determines the era. Undated book context remains in **Source context**, which readers can select in the story collection and search.

`status: "Research needed"` makes an incomplete history invitation visible and changes its contribution action. Such requests are not selected as daily featured stories.

## Import and source display

The Python importer uses the standard library and preserves the original edition separately. A strict HTML allowlist removes executable markup and inline styling from extracted source sections. Footnotes link to the original document. The compressed JSON is reproducible with a fixed gzip timestamp.

Heading divisions include context as well as individual martyr accounts. A section is not necessarily a unique person or a distinct historical event. Keeping that distinction prevents a source count from becoming a misleading count of martyrs.

## Search and daily selection

The build creates a metadata catalogue and a separate normalized full-text index. The full-text index is fetched only when search is used and is searched in a worker so it does not block the interface. Search uses all entered words, folds accents, includes documented alternate names, and ranks title/name matches first. Indexed source accounts inherit alternate names from the known people whose full names they mention.

People profiles link to accounts mentioning their names. This is a navigation aid, not an automatic claim that every mention establishes a relationship. Further profiles can be added without changing the source import.

The daily selection orders eligible source stories consistently using a slug hash, then advances by six positions for each UTC calendar day. The six entries are distinct; adjacent days do not repeat when at least twelve eligible stories are present. The home page checks the date while open and refreshes when the reader returns to the tab.

## Markdown equivalents and contributions

Every generated route includes a `README.md` containing its readable text and contribution link. Source accounts retain paragraph divisions and image links. The original source book is a separate preserved document, not a generated navigational page.

Contribution links encode the title, canonical page URL, record slug, current date label, and prompts for evidence and image credit in a GitHub issue draft. Blank issues remain enabled because this supports prefilled body links. GitHub submission requires an account. Contributions are reviewed before becoming part of the published site.

## Validation

`npm run check` runs behavioural tests, builds the site, and validates every generated page’s internal links, required page chrome, Markdown equivalent, source-image credits, and protected theme assets. The same checks run against the repository project path in CI. The Pages publication build uses the actual configured base path and origin.

## Astro and the vertical timeline

`scripts/prepare.mjs` prepares source fragments, Markdown equivalents, the catalogue, and search data in ignored build directories. Astro generates the routes with `SiteLayout.astro` and renders the central timeline through `Timeline.astro`. `src/lib/model.ts` defines the shared types; `src/lib/timeline.ts` supplies selection and internal card navigation; `src/timeline.ts` draws and highlights the SVG connections.

`content/branches.json` contains the named families, dated nodes, and connections. Each connection has a type, explanation, and reference. `place` records generate `/places/` pages; their dates identify events or activity, not the founding date of a city.

The preparation step copies only Martyrs’ Mirror source assets into publication. Exhibit photographs and Behalt media remain research records in the repository. External links in historical overviews are presented in numbered references.
