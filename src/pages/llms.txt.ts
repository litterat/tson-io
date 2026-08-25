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
import { CURRENT_REVISION, isCurrentRevision, revisionOf } from '../lib/spec';
import about from '../lib/llms-about.txt?raw';
import otherTsons from '../lib/llms-other-tsons.txt?raw';

export const GET: APIRoute = async ({ site }) => {
  const base = resolveBase(site);

  // Scoped to the current revision: retained revisions stay published and
  // linkable, but the index an LLM reads must name one text, not several.
  const [allSpec, allChangelogs] = await Promise.all([
    getCollection('spec'),
    getCollection('changelog'),
  ]);
  const specEntries = allSpec.filter(e => isCurrentRevision(revisionOf(e.id)));
  const changelogs = allChangelogs.filter(e => isCurrentRevision(revisionOf(e.id)));
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
    `- [meta-kernel.tn](${base}/2026/${CURRENT_REVISION}/m/meta-kernel.tn): Base kind constructors and the IS-A lattice root`,
    `- [meta.tn](${base}/2026/${CURRENT_REVISION}/m/meta.tn): Annotation types and schema-level directives`,
    `- [core.tn](${base}/2026/${CURRENT_REVISION}/m/core.tn): Core type library for data interchange`,
    '',
    otherTsons.trim(),
    '',
    '## Optional',
    '',
    `- [Research & Papers](${base}/research-llms.txt): Background research articles that led to TSON's design — not required to use TSON, useful for understanding why it's designed the way it is.`,
    '',
    '## Revisions',
    '',
    `This index describes revision ${CURRENT_REVISION}, the current working revision of the 2026 series. Earlier revisions stay published at their own paths so hash-pinned references keep resolving: [all revisions](${base}/2026/revisions).`,
    '',
    ...changelogs.map(
      e =>
        `- [${e.data.title}](${base}/raw/2026/${e.id}.md)${
          e.data.against ? `: what this revision changed against ${e.data.against}, with a disposition for every input.` : ''
        }`,
    ),
    ...(changelogs.length > 0 ? [''] : []),
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
