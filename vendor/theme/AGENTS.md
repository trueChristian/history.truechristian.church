# Agent instructions for `trueChristian/theme`

## Purpose

This repository defines the unified visual identity and mandatory global page chrome for **all True Christian Church websites**. It is not a page-specific website and must not be narrowed to one ministry, project, event, or location.

The words **MUST**, **MUST NOT**, **SHOULD**, and **SHOULD NOT** in this file are requirements.

## Read before editing

Before changing this repository, read:

1. this file;
2. `docs/source-inventory.md` for evidence and provenance;
3. `docs/header.md` and `docs/footer.md` for the global chrome contract;
4. `docs/component-inventory.md` before changing page-body component styles;
5. `src/data/site-chrome.json` for canonical labels, URLs, grouping, and order;
6. `src/data/main-site-navigation.json` when working on the canonical main-site menu;
7. the supplied header/footer evidence in `docs/source/`;
8. the visual references in `docs/reference/`.

Do not infer a redesign from a single project page. The shared header and footer belong to the church-wide theme.

## Sources of truth

When sources disagree, use this order:

1. Explicit instructions from the repository owner.
2. `src/data/site-chrome.json` for navigation and footer content.
3. `src/html/site-header.html` and `src/html/site-footer.html` for structure and accessibility.
4. `src/css/` for visual implementation.
5. `docs/reference/header-desktop.png` and `docs/reference/footer-desktop.png` for visual comparison.
6. Human-readable documentation under `docs/`.

Do not silently change fixed labels, destinations, group order, logo proportions, footer layers, or brand colors.

## Mandatory global header

Every site MUST include a responsive header with the following behavior:

- The source logo is `assets/brand/logo.jpg`.
- Render the logo at its native aspect ratio, nominally `288px × 77px`.
- The logo alternative text MUST be `A True Christian Church`.
- The logo MUST link to the applicable True Christian Church home page.
- A visible `Home` link MUST be the first textual navigation entry.
- Navigation entries belonging to the site or page being built MUST follow `Home` and use the same visual treatment.
- On the main church site, the canonical entries are `The Holy Scriptures`, `Sermons`, `Articles`, `Daily`, and `Services` with the `Join us` subtitle. Preserve the full extracted menu data in `src/data/main-site-navigation.json`.
- Desktop navigation MUST use the white bar, thin cyan top rule, uppercase widely spaced labels, and active/hover contrast shown in the reference screenshot.
- The header MUST remain visible at the top of the page, hide when the visitor scrolls downward, and reveal again when the visitor scrolls upward. Portable implementations MUST provide this behavior through `dist/truechristian-theme.js` or an equivalent implementation.
- Below the desktop breakpoint, use a menu toggle and off-canvas or equivalent accessible navigation. Keep the logo centered and never squeeze the complete desktop menu into a narrow row.
- Dropdown triggers MUST be keyboard operable and expose `aria-expanded`; the mobile menu MUST have an accessible close control.
- Portable implementations MUST load `dist/truechristian-theme.js` (built from `src/js/site-header.js`) or provide equivalent menu, submenu, Escape-key, focus, and breakpoint behavior.
- Set `aria-current="page"` only on the actual current route. Never hardcode `Home` as active in a reusable template.
- Do not replace the logo with plain text, a generic church icon, or a project logo.

When a satellite site needs different page-specific links, change only the site-specific navigation data. Preserve the logo, home link, header silhouette, typography, spacing, responsive behavior, and accessible menu pattern.

## Mandatory footer assembly

Every site MUST finish with the complete footer assembly, directly after the page content. It has two visible bands and three named responsibilities:

1. **Directory/link footer** — the light `tm-bottom` band containing all grouped links and social outreach.
2. **Copyright footer** — the dark band containing the copyright statement and legal/project links.
3. **Bottom footer assembly** — the complete page-bottom unit formed by the directory footer followed immediately by the copyright footer. Nothing page-specific may be placed between those two bands.

This terminology prevents the YOOtheme region name `tm-bottom` from being confused with the entire footer.

### Directory/link footer requirements

- Use four desktop columns in this exact order: `Church Info`, `Projects`, `Welcome`, `Social Outreach`.
- Use the exact labels, URLs, order, and external-link behavior in `src/data/site-chrome.json`.
- The data preserves the source's root-relative URLs. On a different domain, resolve every root-relative global-footer URL against `https://truechristian.church`; the portable HTML template already does this.
- `Social Outreach` MUST contain only GitHub and Telegram icon links, in that order.
- The owner-supplied original skyline file is `assets/footer/city-skyline-skyscrapers-top.jpg`, matching the source-site path `/images/city-skyline-skyscrapers-top.jpg`. Preserve the original asset and its `270px × 180px` display slot; do not replace it with a screenshot crop or unrelated stock imagery.
- Directory link rows MUST have no sibling margin or gap. Apply the same zero-spacing rule to portable `.tcc-footer-group` markup and compatible `.tm-bottom .uk-list` markup.
- Directory links MUST render at full opacity in `#2d2e33` using Montserrat 500 so the small uppercase text remains dark and legible.
- On medium layouts, the four columns MAY become a two-by-two grid. On narrow layouts, stack them and center headings, links, and social controls.
- Keep the generous light-grey spacing, uppercase headings and links, circular social buttons, rounded image treatment, and subdued shadow shown in `docs/reference/footer-desktop.png`.

### Copyright footer requirements

- Render the copyright footer immediately after the directory footer.
- Use the exact text and link sequence from `src/data/site-chrome.json`:
  `Copyright © trueChristian.Church free distribution only | Privacy Policy | Mission | Revival | We Fear God | Why we believe the Bible | Trousseau Chest`.
- `free distribution only` links to `/copyright`.
- Preserve the vertical-bar separators on wide layouts. Allow wrapping on small screens without clipping or horizontal scrolling.
- Use the dark charcoal background and light text shown in the reference.

### Footer prohibitions

- MUST NOT omit either visible footer band.
- MUST NOT collapse all footer content into a single undifferentiated paragraph.
- MUST NOT replace the directory with a project-specific footer.
- MUST NOT move legal links out of the copyright band.
- MUST NOT reorder or rename groups or fixed links without explicit owner instruction.
- MUST NOT place a newsletter signup, advertisement, unrelated logo, or promotional call-to-action into the global footer unless explicitly requested.

## CSS and visual tokens

- `src/css/` is the authoritative implementation.
- `src/css/theme.css` defines module order; the files in `dist/` are generated.
- Preserve the measured flat colors documented in `docs/brand-guide.md`.
- Keep the header and footer selectors usable without Joomla while retaining compatibility selectors for the supplied YOOtheme/UIkit structure.
- Do not paste or vendor proprietary YOOtheme CSS. Record framework references and implement church-specific CSS here.
- The supplied HTML does not expose its compiled `@font-face` declarations. Montserrat and Raleway are forensic screenshot matches, not declarations extracted from the HTML; keep that provenance explicit.
- Maintain visible keyboard focus, reduced-motion behavior, print-safe output, and documented contrast behavior. The measured inactive-nav color reproduces the source but is below WCAG AA for small text; do not claim otherwise.
- Do not use CSS to hide missing required content.

## Assets

- Do not stretch, recolor, crop, redraw, or add effects to `assets/brand/logo.jpg`.
- Preserve `assets/favicons/favicon.ico` byte-for-byte unless the owner supplies a replacement.
- Generated YOOtheme cache files are outputs, not source assets.
- Do not introduce unrelated page photography into the theme package.

## Documentation expectations

Any change to header/footer structure, links, colors, typography, or assets MUST update the corresponding documentation and reference data in the same pull request.

If a value cannot be proven from the supplied files, document the uncertainty. Never present a guess as extracted fact.

## Required validation

Before committing:

```sh
npm run check
```

Also verify:

- both reference screenshots remain present;
- the logo and favicon remain present;
- the example contains the global header, directory footer, and copyright footer;
- the portable header script is present and syntax-valid;
- all fixed labels and URLs match `src/data/site-chrome.json`;
- no horizontal overflow is introduced at narrow widths;
- `dist/` was regenerated after any source CSS change.

Keep commits coherent. Do not merge a pull request unless the owner asks for the merge.
