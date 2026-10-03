# Joomla, YOOtheme, and UIkit integration

The supplied source is a Joomla page rendered through YOOtheme Pro and UIkit.

## Source load order

1. Joomla alert CSS.
2. Joomla Font Awesome CSS, preloaded and promoted to a stylesheet.
3. Compiled YOOtheme site stylesheet `theme.13.css`.
4. Joomla core/messages scripts.
5. UIkit.
6. UIkit fused icons.
7. YOOtheme site script.

The portable stylesheet in this repository belongs after the framework stylesheet when used as a church-specific override:

```html
<link rel="stylesheet" href="/templates/yootheme/css/theme.13.css">
<link rel="stylesheet" href="/theme/dist/truechristian-theme.css">
```

When used outside Joomla/YOOtheme, load the repository stylesheet and portable header script, then render the `tcc-*` classes from the supplied HTML templates:

```html
<link rel="stylesheet" href="/theme/dist/truechristian-theme.css">
<script defer src="/theme/dist/truechristian-theme.js"></script>
```

When UIkit already owns the mobile off-canvas and dropdown behavior, do not initialize the portable script against that separate UIkit markup. The `data-tcc-global-header` hook belongs only on the portable header fragment.

## Compatibility selectors

The CSS intentionally recognizes these source regions:

- `.tm-header`
- `.tm-header-mobile`
- `.tm-bottom`
- `#license`

Do not rely solely on UIkit utility classes for the brand contract. The `tcc-*` classes make the required structure explicit and portable.
