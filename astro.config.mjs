// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://krupa06-dotcom.github.io',
  base: '/Vinayak-Plastic',
  output: 'static',
  build: {
    // Inline the single global stylesheet into each page's <head>
    // to eliminate a separate render-blocking CSS request.
    inlineStylesheets: 'always'
  },
  image: {
    // Enable Sharp for image processing (better performance than Squoosh)
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  }
});
