// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://halde.example',
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
