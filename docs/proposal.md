# Anabaptist history explorer

The homepage presents six stories that change daily and a horizontal timeline near the top, running from the present back to Acts. Selecting an era opens its overview, people, events, and stories. The main menu offers Timeline, Stories, People, Traditions, Sources, Search, and Contribute, using the shared True Christian Church header and complete footer.

Martyrs’ Mirror becomes a searchable collection of individual accounts, each preserving the original text, illustrations, source references, and links to related people and events. Era introductions help readers understand the wider history and distinguish the book’s historical perspective from later research. Mennonite, Amish, Hutterite, and other Anabaptist traditions form the current timeline; future fellowship histories can be added after source review. Unverified modern details remain explicit research requests.

The implementation builds static HTML for GitHub Pages, adds full-text search and daily selection in the browser, and follows the system’s light/dark setting with a saved override. Every generated page has a readable Markdown equivalent and a contribution link that opens a prefilled GitHub issue with that page’s context. Content and source metadata are versioned in this repository so reviewed contributions can extend the archive without changing the interface.

## Source availability

- Available: the supplied Martyrs’ Mirror HTML archive and its original illustrations.
- Available: IMG_9359.mp4, a video reference to inspect before identifying the painting or reproducing imagery from it.
- Available: Church History.zip, supplied again during implementation. It contains 40 HEIC photographs and their associated Live Photo movies, including an Anabaptist/Mennonite timeline and historical exhibit panels.
- Shared theme: https://github.com/trueChristian/theme, pinned to commit 3bd0c28956610506f83e3ecd3af6ea775ac7cb45.

## Publication

Build and validate on every pull request. Deploy through GitHub Actions to GitHub Pages after the implementation is merged to main. Support the repository’s project URL as well as a future custom domain without hardcoded asset paths.
