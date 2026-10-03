# Repository-local language architecture

English is the only published language. No translation job, external source repository, API service, or paid translation is required or invoked by the build.

## Identity and routes

`content/locales/config.json` is the explicit publication registry. Every record keeps its original English `slug` as its permanent content identity across languages. The public English URL is `/en/<kind>/<slug>/`; the deployment base precedes `/en/` when hosted at a GitHub project path. Old unprefixed URLs redirect to the same English record and preserve query parameters and era anchors.

Pages have a locale-neutral `logicalRoute`, a stable `contentId`, the interface `locale`, and the actual `contentLanguage`. Canonical URLs identify the localized route. Alternate links list only published, reviewed content; English supplies `x-default`. The language menu stays on the same article and does not offer nonexistent translations.

## Files retained in this repository

- Original English history remains in `content/curated.json`, source-specific authored collections, the imported `content/martyrs-mirror.json.gz`, and `sources/martyrs-mirror/`.
- `content/locales/<locale>/ui.json` maps stable English UI message keys to localized strings. Placeholders such as `{count}` stay intact. Controls, live search/timeline messages, navigation and accessibility labels use this dictionary.
- `content/locales/<locale>/records.json` maps stable source slugs to reviewed text overlays. An overlay can contain `title`, `summary`, `paragraphs` (or `html`), `aliases`, reference labels, `dateLabel`, and `reviewed: true`. It cannot replace the slug, record kind, numeric dates, chronology, relationships, or source identity.
- `content/locales/<locale>/pages.json` holds translated explanatory pages keyed by their locale-neutral route. Entries may supply `title`, `description`, `body`, and `markdown`. The English page remains the fallback.

A missing translation is never represented as a reviewed translation. A configured locale can show an explicit original-language notice, label the retained article text with its source language, and link to English. The same record is always recoverable. Search indexes and catalogue assets are generated separately for each published locale; search normalization preserves non-Latin alphabets.

## Add a language later

1. Add the language directory and translate the full English UI dictionary, keeping message keys and placeholders unchanged.
2. Supply reviewed record overlays and explanatory-page translations. Keep original references and stable source IDs.
3. Add its BCP-47-style language code, display names and direction to the registry. Keep `published: false` until review is complete.
4. Enable publication, build at both root and project prefixes, and review availability notices, same-article switching, search, canonical/alternate links, Markdown, direction and mobile navigation.
5. Commit the source and all translations together in this repository. There is no external translation pipeline.

The tests include an in-memory future-language fixture to verify translation identity, explicit English fallback, escaped UI labels and Unicode search without publishing a new language.

GitHub edit links use `GITHUB_HEAD_REF` for pull-request previews and `main` for production. Local preview builds may set `HISTORY_SOURCE_REF` explicitly. This keeps source-edit links pointed at files that exist in the reviewed branch before merge.
