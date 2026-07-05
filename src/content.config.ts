import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const researchSchema = z.object({
  title: z.string(),
  series: z.enum(['deep-dive-into-json', 'proto-schema']),
  seriesTitle: z.string(),
  part: z.number().int().positive(),
  description: z.string().optional(),
  abstract: z.string().optional(),
  originalUrl: z.string().url().optional(),
  originalDate: z.coerce.date().optional(),
});

const specSchema = z.object({
  title: z.string(),
  draft: z.string(),
  status: z.string(),
  part: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export const collections = {
  research: defineCollection({
    loader: glob({ pattern: '*/*.md', base: './src/content/research' }),
    schema: researchSchema,
  }),

  spec: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/2026/spec' }),
    schema: specSchema,
  }),
};
