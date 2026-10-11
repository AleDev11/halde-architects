import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number(),
      type: z.string(),
      location: z.string(),
      year: z.number(),
      area: z.string(),
      client: z.string(),
      status: z.string(),
      summary: z.string(),
      cover: image(),
      coverAlt: z.string(),
      gallery: z.array(z.object({ src: image(), alt: z.string(), layout: z.enum(['full', 'half', 'offset']) })),
      quote: z.object({ text: z.string(), author: z.string() }).optional(),
      facts: z.array(z.object({ label: z.string(), value: z.string() })),
      team: z.array(z.string()),
    }),
});

export const collections = { projects };
