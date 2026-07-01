/**
 * /research-llms.txt — index of the background research articles.
 * Linked from /llms.txt's Optional section. Not required to use TSON;
 * useful context for understanding why it's designed the way it is.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { resolveBase, researchLine } from '../lib/llmsTxt';

export const GET: APIRoute = async ({ site }) => {
  const base = resolveBase(site);

  const researchEntries = await getCollection('research');

  const protoSchema = researchEntries
    .filter(e => e.data.series === 'proto-schema')
    .sort((a, b) => a.data.part - b.data.part);
  const deepDive = researchEntries
    .filter(e => e.data.series === 'deep-dive-into-json')
    .sort((a, b) => a.data.part - b.data.part);

  const lines = [
    '# tson.io — Research & Papers',
    '',
    '> Background research that led to the design of TSON (Tagged Structure Object Notation).',
    '> This is background reading, not reference material — see /llms.txt for the specification',
    '> and schema files needed to actually read or write TSON.',
    '',
    '## Proto-Schema',
    '',
    ...protoSchema.map(e => researchLine(base, e)),
    '',
    '## A Deep Dive into JSON',
    '',
    ...deepDive.map(e => researchLine(base, e)),
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
