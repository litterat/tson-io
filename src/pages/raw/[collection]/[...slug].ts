/**
 * Serves raw markdown for research articles and spec documents.
 *
 * URLs:
 *   /raw/research/deep-dive-into-json/part-1-introduction-and-core-limitations.md
 *   /raw/2026-28/tson-spec-2026-28.md
 *
 * The response is plain text with the original frontmatter stripped,
 * so LLMs and tools receive clean markdown content.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const [researchEntries, specEntries] = await Promise.all([
    getCollection('research'),
    getCollection('spec'),
  ]);

  const researchPaths = researchEntries.map((entry) => ({
    params: {
      collection: 'research',
      slug: `${entry.id}.md`,
    },
    props: { body: entry.body ?? '', title: entry.data.title },
  }));

  const specPaths = specEntries.map((entry) => ({
    params: {
      collection: '2026-28',
      slug: `${entry.id}.md`,
    },
    props: { body: entry.body ?? '', title: entry.data.title },
  }));

  return [...researchPaths, ...specPaths];
};

export const GET: APIRoute = ({ props }) => {
  return new Response(props.body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
