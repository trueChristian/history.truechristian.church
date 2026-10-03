import {defineConfig} from 'astro/config';
import {siteOrigin} from './src/lib/site-origin.mjs';
const base=(process.env.SITE_BASE_PATH||'/').replace(/\/$/,'')||'/';
export default defineConfig({
  site:siteOrigin(process.env.SITE_ORIGIN),
  base,
  output:'static',
  outDir:'./_site',
  publicDir:'./.history-public',
  build:{format:'directory'},
  devToolbar:{enabled:false}
});
