import fs from 'node:fs/promises';
await fs.copyFile(new URL('../_site/not-found/index.html',import.meta.url),new URL('../_site/404.html',import.meta.url));
