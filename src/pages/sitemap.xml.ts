/**
 * /sitemap.xml — canonical page index per the sitemaps.org protocol.
 * https://www.sitemaps.org/protocol.html
 *
 * Lists rendered HTML pages only (home, research index/articles, spec
 * index/documents) — not the raw-markdown or llms.txt endpoints, which are
 * for LLM/tool consumption rather than search indexing.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { resolveBase } from '../lib/llmsTxt';

export const GET: APIRoute = async ({ site }) => {
  const base = resolveBase(site);

  const [researchEntries, specEntries] = await Promise.all([
    getCollection('research'),
    getCollection('spec'),
  ]);

  const urls = [
    `${base}/`,
    `${base}/research`,
    ...researchEntries.map(e => `${base}/research/${e.id}`),
    `${base}/2026-28`,
    ...specEntries.map(e => `${base}/2026-28/${e.id}`),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(url => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
