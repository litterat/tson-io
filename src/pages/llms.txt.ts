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
import { CURRENT_REVISION } from '../lib/spec';
import about from '../lib/llms-about.txt?raw';
import otherTsons from '../lib/llms-other-tsons.txt?raw';

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
    about.trim(),
    '',
    '## Specification',
    '',
    ...tsonParts.map(e => specLine(base, e)),
    '',
    ...(otherSpecs.length > 0
      ? ['## Companion Specifications', '', ...otherSpecs.map(e => specLine(base, e)), '']
      : []),
    '## Schema Source Files',
    '',
    `- [meta-kernel.tn1](${base}/2026/${CURRENT_REVISION}/m/meta-kernel.tn1): Base kind constructors and the IS-A lattice root`,
    `- [meta.tn1](${base}/2026/${CURRENT_REVISION}/m/meta.tn1): Annotation types and schema-level directives`,
    `- [core.tn1](${base}/2026/${CURRENT_REVISION}/m/core.tn1): Core type library for data interchange`,
    '',
    otherTsons.trim(),
    '',
    '## Optional',
    '',
    `- [Research & Papers](${base}/research-llms.txt): Background research articles that led to TSON's design — not required to use TSON, useful for understanding why it's designed the way it is.`,
    '',
    '## Licensing',
    '',
    'The specification text is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); implementations (parsers, encoders, libraries) may be licensed however their authors choose.',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
