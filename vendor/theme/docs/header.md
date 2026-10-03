# Global header contract

![Desktop header reference](reference/header-desktop.png)

## Desktop composition

The supplied page source uses:

```text
header.tm-header.uk-visible@m
  sticky wrapper: media="@m", show-on-up, slide-top animation
  .uk-navbar-container
    .uk-container
      nav.uk-navbar
        .uk-navbar-left  -> linked logo
        .uk-navbar-right -> navigation
```

The white bar has a thin cyan top rule. The logo sits on the left, and navigation aligns right. `Home` is visibly active in the supplied screenshot; inactive entries are muted until hover/focus.

The source logo markup declares `288 × 77`, links to `https://truechristian.church/`, and uses the alt text `A True Christian Church`.

| Part | Desktop contract |
| --- | --- |
| Surface | White with `1px solid #00cadb` top rule |
| Container | `1200px` maximum width |
| Navbar | `80px` minimum height |
| Logo | `288 × 77px`, intrinsic aspect ratio |
| Navigation | Montserrat 400, `11px`, uppercase, `2px` tracking |
| Active text | `#2d2e33` |
| Inactive text | `#b4b5ba` as measured in the supplied source screenshot |
| Link spacing | Approximately `15px` inline hit-area padding on each side |
| Services icon/subtitle | `20px` world icon; `Join us` is Montserrat 400 at `12px` |

The screenshot is a 1.25× capture; its device-pixel geometry is larger than the CSS contract.

The supplied screenshot is the home page, so `Home` is active there. The reusable fragment intentionally has no hardcoded current item; the consuming page must add `aria-current="page"` and `.is-active` to its actual route.

The header is visible when the page is at the top. Once the visitor scrolls down past the header, it slides out of view; scrolling upward reveals it again. Keep it visible while the mobile menu is open or keyboard focus is inside the header. The portable script applies small direction thresholds so minor trackpad or touch movement does not make the bar flicker.

## Canonical main-site order

1. Home
2. The Holy Scriptures
3. Sermons
4. Articles
5. Daily
6. Services — subtitle: Join us

For another True Christian Church site, the logo and `Home` remain fixed. Navigation required by that site follows `Home` using the same spacing, typography, active state, and accessible dropdown behavior.

The canonical main-site mega-menu is not a generic requirement for every satellite. Its full static labels, nesting, and URLs are preserved in `src/data/main-site-navigation.json`, and the supplied desktop markup is retained in `docs/source/header-desktop-source.html`. Date-sensitive cards inside the Articles and Daily mega-menus remain content, not theme constants.

## Mobile composition

The source uses `tm-header-mobile uk-hidden@m`, a left menu toggle, centered logo, and a slide-mode off-canvas menu. Nested entries become an accordion. Implementations on other frameworks must preserve this behavior even when class names differ.

The portable template uses `src/js/site-header.js` for scroll-direction visibility, open/close state, submenu state, Escape, focus containment, inert off-screen navigation, and breakpoint synchronization. Load the built script with `defer`.

## Reusable markup

Use `src/html/site-header.html` as the generic portable shell. It intentionally demonstrates the top-level/dropdown pattern without freezing the content-heavy Articles mega-menu into every site. A canonical main-site implementation must render the complete `src/data/main-site-navigation.json`; a satellite replaces the example entries after `Home` with its own links.
