/**
 * /sitemap.xml — canonical page index per the sitemaps.org protocol.
 * https://www.sitemaps.org/protocol.html
 *
 * Lists rendered HTML pages only (home, research index/articles, the revisions
 * index, spec index/documents, change logs, reports) — not the raw-markdown or llms.txt
 * endpoints, which are for LLM/tool consumption rather than search indexing.
 *
 * Retained revisions are listed alongside the current one: they stay published
 * as distinct, citable documents, and each carries a banner pointing at the
 * current text.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { resolveBase } from '../lib/llmsTxt';
import { reportSlug } from '../lib/reports';
import { REVISIONS_PATH, compareRevisionsDesc, revisionOf } from '../lib/spec';

export const GET: APIRoute = async ({ site }) => {
  const base = resolveBase(site);

  const [researchEntries, specEntries, changelogEntries, reportEntries] = await Promise.all([
    getCollection('research'),
    getCollection('spec'),
    getCollection('changelog'),
    getCollection('reports'),
  ]);

  const revisions = [...new Set(specEntries.map(e => revisionOf(e.id)))].sort(compareRevisionsDesc);

  const urls = [
    `${base}/`,
    `${base}/research`,
    ...researchEntries.map(e => `${base}/research/${e.id}`),
    `${base}${REVISIONS_PATH}`,
    ...revisions.map(revision => `${base}/2026/${revision}`),
    ...specEntries.map(e => `${base}/2026/${e.id}`),
    ...changelogEntries.map(e => `${base}/2026/${e.id}`),
    // e.id is `{revision}/reports/{slug}`; the URL keeps that same shape.
    ...reportEntries.map(e => `${base}/2026/${revisionOf(e.id)}/reports/${reportSlug(e.id)}`),
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
