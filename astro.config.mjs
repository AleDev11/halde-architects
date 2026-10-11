// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://aledev11.github.io',
  base: '/halde-architects',
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
