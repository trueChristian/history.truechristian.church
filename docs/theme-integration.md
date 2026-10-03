# Shared theme integration

The site uses the unchanged `trueChristian/theme` snapshot at revision
`3bd0c28956610506f83e3ecd3af6ea775ac7cb45`, stored in `vendor/theme/`.

`scripts/build.mjs` copies the theme's generated CSS, header JavaScript, logo,
favicon, and skyline into the publishable site. It uses the canonical footer
fragment and resolves its asset URL against the deployment base path.

The site supplies its own navigation entries after Home, using the shared
header's structure and classes. The portable header script provides the mobile
menu, submenu controls, Escape handling, focus containment, breakpoint changes,
and scroll-direction behavior. The logo links to the main church website.

`src/site.css` defines the history page content and light/dark appearance. The
shared masthead and footer retain their specified colors and complete structure.

Run `npm run check` to verify required page chrome and compare the deployed logo,
favicon, and skyline byte-for-byte with the theme snapshot. The theme's own
source and validation scripts are included so its snapshot can also be checked
with `npm --prefix vendor/theme run check`.

To update the theme, replace the snapshot with a reviewed upstream revision,
update `content/site.json`, and run both checks. Keep the fixed labels, URLs,
asset proportions, directory groups, and footer assembly defined in
`vendor/theme/AGENTS.md`.
