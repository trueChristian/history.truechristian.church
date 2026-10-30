# Homepage history discovery review

Branch: `feat/home-history-discovery`. This is an unmerged homepage experiment.

Only the homepage's **Navigate the history** section changes. The existing
masthead, navigation, language and appearance controls, introduction, statistics,
daily accounts, footer, and separate Timeline/Stories/Explore/Search/Contribute
pages retain their existing structure and behavior. No historical records,
publication exclusions, original source wording, or stable article routes change.

## Local review

Use Node.js 24 and the pinned dependencies in this branch:

```bash
git clone --branch feat/home-history-discovery --single-branch https://github.com/trueChristian/history.truechristian.church.git
cd history.truechristian.church
npm ci
export HISTORY_SOURCE_REF=feat/home-history-discovery
npm run check
npm run serve
```

Open **http://127.0.0.1:8080/en/** and scroll to **Navigate the history**.
After installation/build, the preview can run without an internet connection.
The external font service and external references require a connection; readable
fallback fonts and all bundled history pages remain available offline.

## Edit locally and update the GitHub review

Work in the clone above, on `feat/home-history-discovery`. Confirm the current
branch with `git branch --show-current`. The `HISTORY_SOURCE_REF` setting above
also makes the site's GitHub source-edit links point to this review branch.

Stop the static preview with Ctrl+C, then start the development server:

```bash
npm run dev -- --host 127.0.0.1 --port 4321
```

Open **http://127.0.0.1:4321/en/**. Edit and save files in your local editor to
preview the changes. The homepage section is defined in
`src/components/HistoryDiscovery.astro`; its styles are in
`src/history-discovery.css`, reader/navigation behavior in
`src/history-discovery.ts`, and wheel/title motion in
`src/history-discovery-motion.ts`. Interface wording is in
`content/locales/en/ui.json`. Restart the development server after changing
content JSON so the preparation step regenerates the page data.

When ready, stop the development server with Ctrl+C and validate the result:

```bash
npm run check
npm run serve
```

Review the built site at **http://127.0.0.1:8080/en/**, then stop the server with
Ctrl+C. Review, stage, commit, and push your changes:

```bash
git status
git diff
git add -p
git diff --cached
git commit -m "Refine homepage history navigation"
git push origin feat/home-history-discovery
```

`git add -p` lets you select changes to existing files. If you intentionally
create new source files, add those files explicitly before committing.

Push with a GitHub account that has write access to the repository. Each push
updates the existing [draft pull request #7](https://github.com/trueChristian/history.truechristian.church/pull/7),
where you can review **Files changed** and the checks. Keep the pull request
unmerged until the local review is complete. Branch pushes do not publish the
live site.

Before a later editing session, with your previous work committed, run
`git pull --ff-only` and `npm ci` to pick up updates on this same branch.

## GitHub build artifact

A draft pull request also produces the existing `history-site-preview` artifact.
That CI artifact is built under `/history.truechristian.church`; serve it using
this repository's server with `SITE_BASE_PATH=/history.truechristian.church` and
open `http://127.0.0.1:8080/history.truechristian.church/en/`.

## What to review

- The journey opens with the supplied Hebrews 12:1 excerpt, labelled KJV. The
  English Scripture text retains `lang="en"`; interface text uses the existing
  translation system. The invitation encourages reflection on historical lives
  without identifying every figure with the witnesses of Hebrews 11.
- The right wheel eases continuously with native scrolling. Upper and lower
  bands gently curve away from its clear centre. Perspective affects the faces;
  the adjacent, unrotated links remain separate click and keyboard targets.
- Titles drift down a small distance into clarity as they enter the reading
  area. Hover and keyboard focus make them immediately clear. Only nearby,
  expanded titles enter the animation loop, even in the complete collection.
- All introduction and era dividers end within the left column. The rail has
  its own opaque theme surface and reserved space on phones.
- Each era begins with up to five authored histories, oldest first. The Acts
  overview remains the introduction. Expand an era for every remaining published
  title, including Martyrs' Mirror accounts. Undated source context is separate.
- Scroll the page normally: the tall right-hand date bands move with the era
  sections. There is one page scrollbar, with no wheel interception or snapping.
- Click a date to jump to its section; use Tab, Up/Down, Home/End, and Enter on
  the date bands to navigate with a keyboard.
- Choose a title: the list folds toward the right and the published article opens
  on the left. Full headings, source text, citations, images, related links, and
  source-page continuations come from the existing generated article pages.
- Use **Back to timeline** or Escape. The expanded period, original title,
  viewport position, and keyboard focus return. Browser Back/Forward and reload
  preserve the enhanced reader state. The address can be shared; **Open article
  page** always opens the existing canonical article route.
- Try a long source account and its next reading page. Page divisions remain the
  archive's existing divisions; the complete account is available through those
  continuation links.
- Check phone widths, dark appearance, and reduced motion. The right rail has
  reserved space and the article remains the only reading surface. Reduced
  motion removes the curve, blur, and title movement and updates immediately.
- Without JavaScript, titles are real article links and the era disclosures and
  jump links still work. If an article request fails, its canonical link and the
  return action remain available.

The new UI labels use the existing localization mechanism. The full Timeline
and branch pages retain their saved chronology controls; this simpler homepage
journey always runs from the beginnings to the present.
