# Source inventory and evidence

This document distinguishes extracted facts from repository implementation decisions.

## Supplied authoritative materials

| Material | What it establishes |
| --- | --- |
| Full True Christian Church page source | Document metadata, favicon references, stylesheet references, Joomla/YOOtheme/UIkit integration, responsive header structure, `tm-bottom` link footer, and copyright footer markup |
| Supplied header HTML | Complete desktop navbar and mega-menu markup |
| `assets/brand/logo.jpg` | Source logo, `288 × 77`, with source alt text `A True Christian Church` |
| `assets/favicons/favicon.ico` | Supplied 16 × 16 browser icon |
| `assets/footer/city-skyline-skyscrapers-top.jpg` | Owner-supplied original skyline image, `1920 × 1280`, used in the desktop directory footer |
| `docs/reference/header-desktop.png` | Desktop header silhouette, spacing, colors, navigation presentation, and services subtitle |
| `docs/reference/footer-desktop.png` | Directory footer and copyright footer composition |

The supplied desktop header excerpt is retained in `docs/source/header-desktop-source.html` with trailing whitespace normalized for version control. Its stable static menu content is normalized in `src/data/main-site-navigation.json`. The global footer is retained as a whitespace-normalized semantic extract in `docs/source/footer-source-extract.html` and as canonical data in `src/data/site-chrome.json`.

Protected source assets are checked byte-for-byte by `npm run check`; this prevents an automated edit from silently replacing the logo, favicon, skyline, or visual references.

## Exact references found in the page source

### Icons

```text
/images/icon.png                  rel="icon" sizes="any"
/images/250x250.png               rel="apple-touch-icon"
```

The supplied `favicon.ico` is retained in this repository. The separately referenced `icon.png` and `250x250.png` were not included as source files and are therefore not fabricated here.

### Stylesheets

```text
/media/vendor/joomla-custom-elements/css/joomla-alert.min.css?0.4.1
/media/system/css/joomla-fontawesome.min.css?5.0.35
/templates/yootheme/css/theme.13.css?1782988037
```

### Theme scripts

```text
/templates/yootheme/vendor/assets/uikit/dist/js/uikit.min.js?5.0.35
/templates/yootheme/vendor/assets/uikit/dist/js/uikit-icons-fuse.min.js?5.0.35
/templates/yootheme/assets/site/js/theme.js?5.0.35
```

The GetBible loader and analytics scripts found in the page source are functional integrations, not theme dependencies.

## Framework evidence

- Joomla document structure and system assets.
- YOOtheme Pro theme assets, version query `5.0.35`.
- UIkit component and responsive classes.
- Desktop `tm-header` with a sticky, show-on-up navbar.
- Mobile `tm-header-mobile` with an off-canvas menu.
- `tm-bottom uk-section-muted` for the directory footer.
- `uk-section-primary` inside the final `footer` for the copyright band.

## Measured screenshot values and capture scale

The screenshots use an effective `1.25×` capture scale. This is proven by the native `288 × 77` logo appearing as `360 × 96` device pixels, `36px` UIkit social buttons appearing as `45` device pixels, and the `1200px` container occupying `1500` device pixels. Geometry below is reported in CSS pixels after de-scaling.

| Role | Value |
| --- | --- |
| Header background | `#ffffff` |
| Header top rule | `#00cadb`, `1px` CSS |
| Directory footer background | `#f7f7f7` |
| Copyright footer background | `#303033` |
| Active/directory text | `#2d2e33` |
| Inactive navigation | `#b4b5ba` |
| Desktop container | `1200px` |
| Navbar minimum height | `80px` |
| Footer band padding | `70px` block |
| Footer grid gutter | `40px` |
| Social controls | `36px`, `20px` gap |
| Social image slot | `270 × 180` |
| Desktop header reference size | `1917 × 112` |
| Desktop footer reference size | `1920 × 767` |
| Directory/copyright transition | device y=560 in the footer reference |

Montserrat and Raleway are metric-matched font identifications rather than declarations extracted from the supplied HTML. See `docs/typography.md`.

## Implementation defaults

The portable `tcc-*` CSS reproduces the supplied structure without requiring Joomla. Its typography stacks and spacing tokens are maintained as repository defaults. They are documented in `docs/typography.md` and `docs/brand-guide.md` and should be revised if the owner supplies the original compiled CSS or font files.

The owner's follow-up footer comparison establishes zero sibling margin between directory rows and full-opacity `#2d2e33` link text. The portable implementation uses Montserrat 500 for those small uppercase links so their rendered weight matches the darker reference.
