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
export const CURRENT_REVISION = '35';

/**
 * Optional one-line summary per revision, shown on the revisions index.
 * A revision with no entry still lists, without a summary.
 */
export const REVISION_NOTES: Record<string, string> = {
  // Plain text — rendered as-is, so no markdown.
  '35':
    'In progress. Adjudicates the 36-entry implementation feedback register against ' +
    'revision 34. Drops the JSON-superset claim and the rules that existed only for it: ' +
    'null leaves the notation, a field name is an identifier at every layer, and a comma ' +
    'may follow a value. The constructor marker goes, applicability becoming IS-A top; ' +
    'scoped replaces extern and unknown; one bytes type replaces the four spelled ' +
    'alphabets; duration splits into elapsed time and calendar period; and equality is ' +
    'stated over value spaces. Name hygiene and resource limits become reportable ' +
    'properties of a processor, with defaults.',
  '34':
    'Adjudicates the 17-entry implementation feedback register against revision 33. ' +
    'Names and enum members become identifiers, open template bodies are held rather ' +
    'than quoted, the optional-value map form is added, and name hygiene is on by ' +
    'default — the change log carries a disposition for every input. Carries the ' +
    'implementation feedback register written against it, which revision 35 adjudicates.',
  '33':
    'Adopts CR-structure-templates in full: cross-namespace template linkage ' +
    'removed, the container constructors de-parameterised, and a sugar form for the map type ' +
    'that mirrors the data notation. Also adjudicates the 59-entry implementation feedback ' +
    'register from revision 32 — the change log carries a disposition for every input. ' +
    'Carries the reports written against it: the implementation feedback register ' +
    'that revision 34 adjudicates, the open-form representation addendum, and the ' +
    'review-input summary.',
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

/**
 * Skill bundles belonging to a revision, derived from the source directories at
 * `src/content/2026/{revision}/skills/{name}/SKILL.md` — so which revisions ship
 * skills is derived, like which revisions exist, and nothing here needs editing
 * when the next one opens.
 *
 * The source is what you edit; the published artifact is the zip served from
 * `public/2026/{revision}/skills/{name}.skill`, rebuilt with the step in
 * AGENTS.md. A skill is revision-scoped because it bundles that revision's own
 * `m/*.tn` files and cites its `/2026/{revision}/` URLs throughout.
 */
const SKILL_SOURCES = import.meta.glob('../content/2026/*/skills/*/SKILL.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface SkillFile {
  /** The skill's own `name:`, which is also its directory and bundle name. */
  name: string;
  /** The "what it does" half of the frontmatter description — its first sentence. */
  summary: string;
}

/** Reads one field out of a SKILL.md's YAML frontmatter. */
function skillField(source: string, field: string): string {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  return frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
}

/**
 * The skills a revision publishes, alphabetical. A skill's `description` states
 * what it does and when to use it; the listing wants only the first, so this
 * takes the sentence before the "Use this skill when…" half.
 */
export function skillsFor(revision: string): SkillFile[] {
  const prefix = `../content/2026/${revision}/skills/`;
  return Object.entries(SKILL_SOURCES)
    .filter(([path]) => path.startsWith(prefix))
    .map(([, source]) => {
      const description = skillField(source, 'description');
      const [summary] = description.split(/\.\s+/, 1);
      return {
        name: skillField(source, 'name'),
        summary: summary ? `${summary}.` : description,
      };
    })
    .filter(skill => skill.name !== '')
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The normative schema sources published under `/{series}/{revision}/m/`, each
 * paired with its non-normative resolved-output fixture. Both are served from
 * that same directory, and the listing shows them together so a source and its
 * resolver output are never a scroll apart.
 */
export const SCHEMA_FILES = [
  { source: 'meta-kernel.tn', resolved: 'meta-kernel-resolved.tn' },
  { source: 'meta.tn', resolved: 'meta-resolved.tn' },
  { source: 'core.tn', resolved: 'core-resolved.tn' },
];
