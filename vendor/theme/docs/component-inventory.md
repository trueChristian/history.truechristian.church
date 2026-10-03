# Page-source CSS and component inventory

This inventory records what the owner-supplied page source proves beyond the global header and footer. It prevents future agents from mistaking an absent stylesheet body for permission to invent a new visual system.

## Referenced stylesheets

The page source loads these files in this order:

1. `/media/vendor/joomla-custom-elements/css/joomla-alert.min.css?0.4.1`
2. `/media/system/css/joomla-fontawesome.min.css?5.0.35` using stylesheet preload/onload
3. `/templates/yootheme/css/theme.13.css?1782988037`

The compiled contents of `theme.13.css` were not included in the supplied HTML. This repository therefore does not claim to reproduce every page-body declaration from that file. It records the roles visible in the markup and provides an evidence-based church-specific global chrome layer.

## Framework roles present in the supplied markup

| Area | Source roles/classes | Meaning for implementations |
| --- | --- | --- |
| Page shell | `tm-page`, `tm-main`, `uk-container`, `uk-container-expand` | Full-width bands with centered content containers |
| Header | `tm-header`, `tm-header-mobile`, `uk-navbar*`, `uk-logo`, `uk-sticky` | Sticky navbar that hides on downward scroll and reveals on upward scroll, plus mobile replacement |
| Navigation | `uk-nav*`, `uk-navbar-dropdown`, `uk-drop`, `uk-offcanvas`, `uk-nav-accordion` | Dropdown/mega-menu and accessible mobile drawer behavior |
| Sections | `uk-section-default`, `uk-section-primary`, `uk-section-muted`, `uk-section-large`, `uk-section-xlarge` | Semantic surface and spacing variants |
| Layout | `uk-grid*`, `uk-width-*`, `uk-flex*`, `uk-tile*` | Responsive grids, widths, alignment, and matched tiles |
| Type | `uk-heading-xlarge`, `uk-heading-small`, `uk-h4`, `uk-h5`, `uk-h6`, `uk-text-lead`, `uk-text-meta`, `uk-text-small` | Page heading, lead, metadata, and footer label roles |
| Links/buttons | `uk-button-primary`, `uk-button-secondary`, `uk-button-default`, `uk-button-small`, `uk-link-*` | Framework-provided action and link variants |
| Cards/media | `uk-card*`, `uk-background-*`, `uk-box-shadow-medium`, `uk-border-rounded`, `uk-img` | Cards, responsive imagery, cover positioning, shadow, and radius |
| Motion/content | `uk-parallax`, `uk-scrollspy`, `uk-slider`, `uk-height-viewport` | Optional YOOtheme/UIkit behavior rather than brand constants |
| Utilities | `uk-margin*`, `uk-padding*`, `uk-text-*`, `uk-visible@m`, `uk-hidden@m`, `uk-light` | Responsive visibility, spacing, alignment, and inverse text |

## What is fixed here

The following are supported by supplied assets/source/screenshots and are implemented in this repository:

- brand logo and favicon;
- global header silhouette, navigation roles, responsive breakpoints, and portable behavior;
- global directory/link footer, social controls, image slot, and responsive columns;
- global copyright footer;
- measured colors, container geometry, spacing, font roles, and exact fixed links;
- Joomla/YOOtheme compatibility selectors for the global chrome.

## What requires additional source

Exact styling for page-body buttons, cards, tiles, sliders, hero sections, forms, tables, alerts, and content modules remains owned by the referenced compiled YOOtheme stylesheet. Do not fabricate exact values for those components from class names alone. If the owner later supplies `theme.13.css`, add an audited token/component layer and update this inventory, source provenance, examples, and validation together.
