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

// A revision's change log: what was accepted into it, and from which inputs.
// It sits alongside the spec documents but is not one of them — it carries no
// draft/part, and its `status` is a sentence about the adjudication rather than
// a document status.
const changelogSchema = z.object({
  title: z.string(),
  /** The revision this one is a change log against. */
  against: z.string().optional(),
  /** Where the adjudication stands. */
  status: z.string().optional(),
  /** The documents the changes were adjudicated from. */
  inputs: z.array(z.string()).default([]),
  description: z.string().optional(),
});

// Reports are author-supplied working documents. Early ones carry no
// frontmatter at all and take their titles from src/lib/reports.ts; newer ones
// declare it here, which wins. Change reports are identified by a `CR-` id.
const reportSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  /** What the report argues against — a revision, or another report. */
  against: z.string().optional(),
  /** e.g. "Proposed", "Accepted". */
  status: z.string().optional(),
  /** The report's own identifier; a `CR-` prefix marks a change report. */
  id: z.string().optional(),
});

export const collections = {
  research: defineCollection({
    loader: glob({ pattern: '*/*.md', base: './src/content/research' }),
    schema: researchSchema,
  }),

  spec: defineCollection({
    // Change logs live beside the spec documents but load separately.
    loader: glob({ pattern: ['*/*.md', '!*/*-changelog.md'], base: './src/content/2026' }),
    schema: specSchema,
  }),

  changelog: defineCollection({
    loader: glob({ pattern: '*/*-changelog.md', base: './src/content/2026' }),
    schema: changelogSchema,
  }),

  reports: defineCollection({
    loader: glob({ pattern: '*/reports/*.md', base: './src/content/2026' }),
    schema: reportSchema,
  }),
};
