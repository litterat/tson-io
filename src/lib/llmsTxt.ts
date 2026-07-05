import type { CollectionEntry } from 'astro:content';

export function subtitle(title: string) {
  return title.includes(':') ? title.split(':').slice(1).join(':').trim() : title;
}

export function researchLine(base: string, e: CollectionEntry<'research'>) {
  const sub = subtitle(e.data.title);
  const url = `${base}/raw/research/${e.id}.md`;
  const abstract = e.data.abstract
    ? e.data.abstract.replace(/\]\(\/research\//g, `](${base}/research/`)
    : '';
  const desc = abstract ? `: ${abstract}` : '';
  return `- [${sub}](${url})${desc}`;
}

export function specLine(base: string, e: CollectionEntry<'spec'>) {
  const url = `${base}/raw/2026/${e.id}.md`;
  const desc = e.data.description ? `: ${e.data.description}` : '';
  return `- [${e.data.title}](${url})${desc}`;
}

export function resolveBase(site: URL | undefined) {
  return site ? site.toString().replace(/\/$/, '') : 'https://tson.io';
}
