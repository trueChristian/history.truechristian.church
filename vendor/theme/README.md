# True Christian Church unified theme

This repository is the shared visual and structural source of truth for websites built for **A True Christian Church**.

It records the church-wide brand, CSS, header, navigation, link directory, copyright footer, favicon, and implementation rules so a person or an automated agent can reproduce the same site chrome consistently.

## Non-negotiable site chrome

Every site using this theme must render both of these assemblies:

1. The global header: the `A True Christian Church` logo links home, followed by `Home`, the navigation belonging to the site being built, and the services entry where applicable.
2. The complete footer stack:
   - the light directory/link footer with `Church Info`, `Projects`, `Welcome`, and `Social Outreach`;
   - the dark copyright/legal footer beneath it.

The exact contracts are in [AGENTS.md](AGENTS.md), [docs/header.md](docs/header.md), and [docs/footer.md](docs/footer.md). Future agents must read `AGENTS.md` before changing this repository or applying the theme elsewhere.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/css/` | Authoritative modular CSS source |
| `src/js/` | Accessible portable header behavior |
| `src/html/` | Reusable document-head, header, and footer markup |
| `src/data/site-chrome.json` | Canonical labels, URLs, grouping, and order |
| `src/data/main-site-navigation.json` | Full static menu data extracted from the supplied main-site header |
| `assets/brand/logo.jpg` | Source church logo, 288 × 77 |
| `assets/favicons/favicon.ico` | Supplied browser favicon |
| `assets/footer/city-skyline-skyscrapers-top.jpg` | Owner-supplied 1920 × 1280 footer skyline image |
| `dist/` | Built, directly consumable CSS and header JavaScript |
| `docs/` | Human-readable brand and implementation guide |
| `docs/component-inventory.md` | Supplied page-source framework/CSS roles and evidence limits |
| `docs/reference/` | Supplied desktop header/footer screenshots |
| `examples/style-guide.html` | Working reference page using the package |

## Use

Load the built stylesheet and use the supplied structural templates:

```html
<link rel="icon" href="/assets/favicons/favicon.ico">
<link rel="stylesheet" href="/dist/truechristian-theme.css">
<script defer src="/dist/truechristian-theme.js"></script>
```

The templates deliberately carry both portable `tcc-*` classes and the relevant YOOtheme/UIkit class names from the supplied page source.

`src/html/site-header.html` is the generic portable shell: logo, Home, a main-site top-level example, dropdown behavior, and the insertion point for the links belonging to the site being built. It is not a pre-rendered copy of the main site's content-heavy Articles mega-menu. Main-site renderers must use `src/data/main-site-navigation.json` or the retained YOOtheme source excerpt.

## Build and validate

The package has no npm dependencies.

```sh
npm run build
npm run check
```

`npm run check` rebuilds the distribution files and verifies mandatory assets, exact fixed labels/URLs/order, source-to-template parity, key selectors, and JavaScript syntax.

## Evidence and provenance

The implementation was derived from the supplied True Christian Church page source, supplied header HTML, the source `logo.jpg`, the supplied favicon, and the supplied desktop header/footer screenshots. See [docs/source-inventory.md](docs/source-inventory.md).

The supplied page source references Joomla, YOOtheme Pro 5.0.35, UIkit, and a compiled site stylesheet named `theme.13.css`. Third-party framework code is not copied into this repository. This package implements the reusable church-specific layer and records the external integration points.

## Software license

No software license was supplied for this repository. The website phrase `free distribution only` is preserved as required footer content; it is not treated as a software license. The repository owner should add the intended code/assets license explicitly before third-party distribution.
