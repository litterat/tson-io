/**
 * /llms.txt — machine-readable site index for LLMs.
 * Spec: https://llmstxt.org
 *
 * Scoped to what an LLM needs to use TSON: the specification and schema
 * source files. Background research is intentionally not inlined here —
 * see /research-llms.txt — since it's context for how TSON was designed,
 * not material needed to read or write it.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { resolveBase, specLine } from '../lib/llmsTxt';

export const GET: APIRoute = async ({ site }) => {
  const base = resolveBase(site);

  const specEntries = await getCollection('spec');
  const tsonParts = specEntries
    .filter(e => e.data.part !== undefined)
    .sort((a, b) => (a.data.part ?? 0) - (b.data.part ?? 0));
  const otherSpecs = specEntries.filter(e => e.data.part === undefined);

  const lines = [
    '# tson.io',
    '',
    '> TSON (Tagged Structure Object Notation) is a Unicode text-based data interchange format',
    '> that extends JSON with richer structural types, optional type annotations, references,',
    '> structural composition, and a layered type system. This file indexes the specification',
    '> and schema source files needed to read, write, and validate TSON. The specification text',
    '> is CC BY-SA 4.0; implementations (parsers, encoders, libraries) may be licensed however',
    '> you choose.',
    '',
    '## Specification',
    '',
    ...tsonParts.map(e => specLine(base, e)),
    '',
    '## Companion Specifications',
    '',
    ...otherSpecs.map(e => specLine(base, e)),
    '',
    '## Schema Source Files',
    '',
    `- [meta-kernel.tn1](${base}/2026-30/meta-kernel.tn1): Base kind constructors and the IS-A lattice root`,
    `- [meta.tn1](${base}/2026-30/meta.tn1): Annotation types and schema-level directives`,
    `- [core.tn1](${base}/2026-30/core.tn1): Core type library for data interchange`,
    '',
    '## Optional',
    '',
    `- [Research & Papers](${base}/research-llms.txt): Background research articles that led to TSON's design — not required to use TSON, useful for understanding why it's designed the way it is.`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
