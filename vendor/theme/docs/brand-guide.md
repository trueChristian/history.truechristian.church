# Brand guide

## Identity

The required masthead is the supplied `A True Christian Church` logo:

```text
assets/brand/logo.jpg
native size: 288 × 77
alt text: A True Christian Church
```

Use it on white. Preserve its aspect ratio and built-in shadow. Do not recolor, crop, redraw, stretch, or place text over it.

## Core palette

| Token | Value | Use | Provenance |
| --- | --- | --- | --- |
| `--tcc-color-white` | `#ffffff` | Header and light surfaces | Measured |
| `--tcc-color-cyan` | `#00cadb` | Thin header top rule and restrained focus accent | Measured |
| `--tcc-color-directory` | `#f7f7f7` | Directory/link footer | Measured |
| `--tcc-color-charcoal` | `#303033` | Copyright footer | Measured |
| `--tcc-color-ink` | `#2d2e33` | Active navigation and full-opacity directory text | Measured |
| `--tcc-color-nav-muted` | `#b4b5ba` | Inactive desktop navigation | Measured |
| `--tcc-color-social-icon` | `#6c6d74` | Social glyphs | Measured |
| `--tcc-color-footer-text` | `rgb(255 255 255 / 70%)` | Copyright prefix and separators | Measured composite |
The JPEG's dominant core samples are approximately red `#a40702`, gold `#ffdb3c`, and shadow grey `#a8a8a8`. JPEG compression and antialiasing produce many neighboring values, so these are documented observations rather than reusable CSS tokens. The logo remains the only authoritative rendering of its colors.

### Contrast note

The measured inactive navigation color `#b4b5ba` on white does not meet WCAG AA contrast for 11px text. It is retained because this repository records the supplied visual exactly. A deployment that must meet AA should override `--tcc-color-nav-muted` with at least `#6c6d74` and document that deliberate visual change. Keyboard focus uses a dark outline plus cyan halo rather than cyan alone.

## Shape and effects

- Global header and directory footer are square-edged full-width bands.
- Social buttons are circular.
- The directory footer's optional image uses modest rounding and a medium, soft shadow.
- Use borders and shadows sparingly. The brand depends on whitespace, typography, and restrained contrast rather than heavy decoration.

## Spacing rhythm

The screenshots were captured at an effective `1.25×` scale. Their `1500`-device-pixel content region corresponds to a `1200px` CSS container. Use `70px` vertical padding for both footer bands, a `40px` four-column gutter, and the spacing tokens elsewhere.
