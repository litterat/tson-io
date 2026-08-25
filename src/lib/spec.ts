/**
 * The revision registry for the specification series.
 *
 * Revisions are directories under `src/content/2026/{revision}/`, so the set of
 * revisions that exist is derived from the content collection — nothing here
 * needs updating to publish one. Only two things are declared by hand:
 * CURRENT_REVISION, which says which of them is the working draft, and
 * REVISION_NOTES, which carries an optional one-line summary for the listing.
 *
 * See AGENTS.md's revision checklist for the full "start a new revision" steps.
 */

/** The series these revisions belong to; the first path segment of every spec URL. */
export const SERIES = '2026';

/** Bump when starting a new spec revision. */
export const CURRENT_REVISION = '33';

/**
 * Optional one-line summary per revision, shown on the revisions index.
 * A revision with no entry still lists, without a summary.
 */
export const REVISION_NOTES: Record<string, string> = {
  // Plain text — rendered as-is, so no markdown.
  '33':
    'In progress. Adopts CR-structure-templates in full: cross-namespace template linkage ' +
    'removed, the container constructors de-parameterised, and a sugar form for the map type ' +
    'that mirrors the data notation. Also adjudicates the 59-entry implementation feedback ' +
    'register from revision 32 — the change log carries a disposition for every input.',
  '32':
    'Editorial refactor: non-normative rationale and design history moved to the developer ' +
    'guide, and the series framing restated around the type system. Carries the schema-mapping ' +
    'and implementation-feedback reports prepared as input to revision 33.',
};

export type RevisionStatus = 'current' | 'retained';

/** Revisions are numeric strings; sort newest first. */
export function compareRevisionsDesc(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return nb - na;
  return b.localeCompare(a);
}

export function isCurrentRevision(revision: string): boolean {
  return revision === CURRENT_REVISION;
}

export function revisionStatus(revision: string): RevisionStatus {
  return isCurrentRevision(revision) ? 'current' : 'retained';
}

/** Human label for a revision's status, used in banners and listings. */
export function revisionStatusLabel(revision: string): string {
  return isCurrentRevision(revision) ? 'Current working draft' : 'Retained revision';
}

/** `/2026/33` */
export function revisionPath(revision: string): string {
  return `/${SERIES}/${revision}`;
}

/** The revisions index for the series. */
export const REVISIONS_PATH = `/${SERIES}/revisions`;

/**
 * The same document under a different revision — used to point a retained
 * revision's reader at the current text. `slug` is the entry id's tail
 * (`tson-part1-data`, `reports/avro-to-tson-mapping`).
 */
export function documentPath(revision: string, slug: string): string {
  return `${revisionPath(revision)}/${slug}`;
}

/** The revision segment of a `{revision}/{slug}` collection entry id. */
export function revisionOf(id: string): string {
  return id.split('/')[0];
}

/** The `{slug}` tail of a `{revision}/{slug}` collection entry id. */
export function slugOf(id: string): string {
  return id.split('/').slice(1).join('/');
}

/** The normative schema sources published under `/{series}/{revision}/m/`. */
export const SCHEMA_FILES = ['meta-kernel.tn', 'meta.tn', 'core.tn'];

/** Their non-normative resolved-output fixtures, served from the same directory. */
export const FIXTURE_FILES = [
  'meta-kernel-resolved.tn',
  'meta-resolved.tn',
  'core-resolved.tn',
];
