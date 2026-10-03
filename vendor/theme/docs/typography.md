# Typography

The supplied page source exposes semantic YOOtheme roles (`uk-h4`, `uk-h5`, `uk-h6`, `uk-text-lead`, `uk-text-meta`, and heading classes), but it does not contain the compiled font declarations from `theme.13.css`.

## Repository defaults

- Display, navigation, and footer labels: `Montserrat`, falling back to `Arial` and sans-serif.
- Body and copyright copy: `Raleway`, falling back to `Helvetica Neue`, `Arial`, and sans-serif.

These stacks are maintained implementation defaults chosen to reproduce the visual roles in the supplied screenshots. A consuming site must load the named fonts itself or accept the fallbacks. No font binaries are vendored here.

## Required visual roles

| Role | Default treatment |
| --- | --- |
| Desktop navigation | Montserrat 400, 11px, uppercase, 2px tracking |
| Directory headings | Montserrat 400, 16px/1.4, uppercase, 2px tracking |
| Directory links | Montserrat 500, 11px/1.4, uppercase, 2px tracking |
| Services subtitle | Montserrat 400, 12px, normal case, approximately 0.2px tracking |
| Copyright copy | Raleway 400, 16px/1.6, normal tracking |
| Body copy | 16px, 1.7 line-height |

Do not simulate the masthead with a text font. Always use the supplied logo image.

Montserrat and Raleway were identified by matching the screenshot geometry against font metrics; the supplied HTML does not contain the compiled `@font-face` rules. The portable head fragment loads Montserrat 400 and 500 plus Raleway 400 from Google Fonts. A privacy-restricted deployment may self-host licensed copies and retain the same family names.
