/**
 * Serves raw markdown for research articles, spec documents, change logs,
 * and reports.
 *
 * URLs:
 *   /raw/research/deep-dive-into-json/part-1-introduction-and-core-limitations.md
 *   /raw/2026/33/tson-part1-data.md
 *   /raw/2026/33/tson-rev33-changelog.md
 *   /raw/2026/32/reports/avro-to-tson-mapping.md
 *
 * The response is plain text with the original frontmatter stripped,
 * so LLMs and tools receive clean markdown content.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { reportInfo } from '../../../lib/reports';

export const getStaticPaths: GetStaticPaths = async () => {
  const [researchEntries, specEntries, changelogEntries, reportEntries] = await Promise.all([
    getCollection('research'),
    getCollection('spec'),
    getCollection('changelog'),
    getCollection('reports'),
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
      collection: '2026',
      slug: `${entry.id}.md`,
    },
    props: { body: entry.body ?? '', title: entry.data.title },
  }));

  const changelogPaths = changelogEntries.map((entry) => ({
    params: {
      collection: '2026',
      slug: `${entry.id}.md`,
    },
    props: { body: entry.body ?? '', title: entry.data.title },
  }));

  const reportPaths = reportEntries.map((entry) => ({
    params: {
      collection: '2026',
      slug: `${entry.id}.md`,
    },
    props: {
      body: entry.body ?? '',
      title: reportInfo(entry.id, entry.body ?? '', entry.data).title,
    },
  }));

  return [...researchPaths, ...specPaths, ...changelogPaths, ...reportPaths];
};

export const GET: APIRoute = ({ props }) => {
  return new Response(props.body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
