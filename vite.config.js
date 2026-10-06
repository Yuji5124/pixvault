import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// A new catalog gets a new URL, independent of the site's HTML/JS cache.
const catalogVersion = createHash('sha256')
  .update(readFileSync(new URL('./public/data/assets.json', import.meta.url)))
  .digest('hex').slice(0, 16);

export default defineConfig({
  base: process.env.PIXVAULT_PATH || '/pixvault/',
  define: { 'import.meta.env.VITE_CATALOG_VERSION': JSON.stringify(catalogVersion) },
});
