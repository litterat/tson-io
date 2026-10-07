/**
 * The revision registry for the specification series.
 *
 * Revisions are directories under `src/content/2026/{revision}/`, so the set of
 * revisions that exist is derived from the content collection — nothing here
 * needs updating to publish one. Only two things are declared by hand:
 * CURRENT_REVISION, which says which of them is the working draft, and
 * REVISION_NOTES, which carries an optional summary and change list for the listing.
 *
 * See AGENTS.md's revision checklist for the full "start a new revision" steps.
 */

/** The series these revisions belong to; the first path segment of every spec URL. */
export const SERIES = '2026';

/** Bump when starting a new spec revision. */
export const CURRENT_REVISION = '36';

/** One notable change: what changed, and briefly why. */
export interface RevisionChange {
  what: string;
  why?: string;
}

/** A revision's entry on the revisions index: a one-line summary, then its notable changes. */
export interface RevisionNote {
  summary: string;
  changes?: RevisionChange[];
}

/**
 * Optional notes per revision, shown on the revisions index. Keep each `what`
 * and `why` to a short clause a newcomer can follow; the change log carries the
 * detail. A revision with no entry still lists, without notes.
 */
export const REVISION_NOTES: Record<string, RevisionNote> = {
  // Plain text, except that `backticks` render as code.
  '36': {
    summary: 'Adjudicates the 21-entry spec-feedback register against revision 35.',
    changes: [
      {
        what: 'A record field is three slots, replacing six field states: `?` on the name (key omittable), `?` on the type (`_` admitted), and its modifier',
        why: 'the six states tangled three separate questions, leaving useful combinations such as `a: T?` unspellable',
      },
      {
        what: 'Records can be declared `abstract` or `final`',
        why: 'a record had no way to say whether it may be instantiated directly or extended',
      },
      {
        what: 'A field written `=?` is the selector a sealed family\'s members each pin, replacing `@discriminator`',
        why: 'it changes which values conform, and an annotation never may',
      },
      {
        what: '`@rest` is gone; a record is always closed',
        why: 'open-ended data is a map, written the same way in every encoding',
      },
      {
        what: 'A declaration naming an application is that application\'s entry',
        why: 'consumers see the name you declared, not a generated name behind a reference hop',
      },
      {
        what: 'Enums gain a TEXT profile, and `text` gains a member set',
        why: 'vocabularies like `"lightly active"` are not identifiers, and text had no way to list its allowed values',
      },
      {
        what: '`disjoint` means the same in every encoding',
        why: 'a choice safe to leave untagged in text, like `( float64 | text )`, could be ambiguous in JSON',
      },
      {
        what: 'An unobtainable schema is reported as not judged, rather than invalid',
        why: 'failing to fetch a schema says nothing about whether the document is valid',
      },
      {
        what: 'New Part 3, the JSON encoding, with the `TSON-Schema` out-of-band schema channel',
        why: 'JSON needs a defined mapping onto TSON types, and an encoding with no directives needs another way to name its schema',
      },
    ],
  },
  '35': {
    summary: 'Adjudicates the 36-entry implementation feedback register against revision 34.',
    changes: [
      {
        what: 'TSON is no longer a JSON superset; a JSON document is read through a JSON reader',
        why: 'the claim imposed rules on the notation that existed only for JSON\'s sake',
      },
      {
        what: '`null` leaves the notation; `void` admits `_` alone',
        why: 'it was a second spelling of absence that only the text format could see',
      },
      {
        what: 'A field name is an identifier at every layer',
        why: 'names were left loose only for JSON compatibility; a key that is not a name belongs in a map',
      },
      {
        what: 'A comma may follow a value: `[1, 2, ]`',
        why: 'TSON has no elision, so a trailing comma cannot be mistaken for a missing element',
      },
      {
        what: 'The `~` constructor marker goes; applicability becomes IS-A `top`',
        why: 'the marker decided nothing the type system did not already know',
      },
      {
        what: '`scoped` replaces `extern` and `unknown`',
        why: '`unknown` had no way to be read, and `extern` could name only one schema',
      },
      {
        what: 'One `bytes` type replaces the spelled alphabets (`!base64`, `!hex`, …)',
        why: 'they were four types over the same octets; an alphabet is an encoding, not a type',
      },
      {
        what: '`duration` splits into elapsed time (`duration`) and calendar period (`period`)',
        why: 'mixing seconds with months left durations without a total order (is `P1M` longer than `P30D`?)',
      },
      {
        what: 'Equality is stated over value spaces',
        why: 'two spellings of one value, such as `Z` and `+00:00`, are now the same value everywhere',
      },
      {
        what: 'Name hygiene and resource limits become reportable properties of a processor, with defaults',
        why: 'a policy refusal is not a verdict on validity, and unstated limits were not portable',
      },
    ],
  },
  '34': {
    summary: 'Adjudicates the 17-entry implementation feedback register against revision 33.',
    changes: [
      {
        what: 'Type names, field names and enum members must be identifiers',
        why: 'lookalike-name checks need a defined name grammar to attach to',
      },
      {
        what: 'Open template bodies are held rather than quoted',
        why: 'quoting needed special machinery and could not place a parameter inside a collection, as in `<T> ( T | error )`',
      },
      {
        what: 'New optional-value map form `{K => V?}`',
        why: 'a map had no way to admit `_` as a value, as an array already could',
      },
      {
        what: 'Fixed and default values are checked against the field\'s type',
        why: 'a default that does not fit its own field is an authoring error, caught at load',
      },
      {
        what: '`require_timezone` is gone; `precision` is at most N fractional digits',
        why: 'RFC 3339 already requires the offset, and `precision` had no defined meaning',
      },
      {
        what: 'Name hygiene is on by default',
        why: 'lookalike names (Latin `pass`, Cyrillic `раѕѕ`) are a spoofing risk, so the check runs unless code relaxes it',
      },
    ],
  },
  '33': {
    summary:
      'Adopts CR-structure-templates in full, and adjudicates the 59-entry implementation ' +
      'feedback register from revision 32.',
    changes: [
      {
        what: 'Cross-namespace template linkage removed; the container constructors de-parameterised',
        why: 'a generic name now resolves in one namespace, with no fallback order to reason about',
      },
      {
        what: 'A sugar form for the map type, `{K => V}`',
        why: 'a schema reads like the data it describes',
      },
      {
        what: 'Duplicate record fields and map keys are rejected (were last-value-wins)',
        why: 'last-value-wins silently discards data',
      },
      {
        what: 'One severity: every former warning is an error or is deleted',
        why: 'a warning leaves "valid" ambiguous; a rule is either enforced or not there',
      },
      {
        what: 'Imports are transitive',
        why: 'matching `!!meta`, so every schema in a chain sees the same names',
      },
      {
        what: 'Annotations are resolved and validated',
        why: 'they had no conformance force, so a misspelt annotation went unnoticed',
      },
      {
        what: 'The file extension is `.tn`; `.tn1` is reserved for version 1',
        why: '`.tn1` would claim version 1 conformance before version 1 exists',
      },
    ],
  },
  '32': {
    summary: 'Editorial refactor.',
    changes: [
      {
        what: 'Non-normative rationale and design history moved to the developer guide',
        why: 'the specification keeps to the rules; the guide carries the reasoning',
      },
      {
        what: 'The series framing restated around the type system',
        why: 'the schema system is the product; the text format is its notation',
      },
    ],
  },
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
