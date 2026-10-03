import {defineConfig} from 'astro/config';
const base=(process.env.SITE_BASE_PATH||'/').replace(/\/$/,'')||'/';
export default defineConfig({
  site:process.env.SITE_ORIGIN||'https://truechristian.github.io',
  base,
  output:'static',
  outDir:'./_site',
  publicDir:'./.history-public',
  build:{format:'directory'},
  devToolbar:{enabled:false}
});
