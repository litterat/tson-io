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
export const CURRENT_REVISION = '37';

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
  '37': {
    summary: 'Adjudicates the 21-entry spec-feedback register against revision 36.',
    changes: [
      {
        what: '`identifier` is a text family, and an enum states which text type its members are',
        why: 'name checks now follow a value\'s type rather than where it sits, so identifier-typed data and map keys get look-alike protection too',
      },
      {
        what: '`value` and `void` each get a constructor, and `unit` is gone',
        why: '`unit` was the one type a processor had to recognise by its name',
      },
      {
        what: 'Template parameters carry a type, which a declaration may narrow: `<T: text, N: int8>`',
        why: 'an argument can be checked where the template is applied, not only once it has been substituted',
      },
      {
        what: 'A field group\'s option may hold several fields, and `( … )+` means at least one',
        why: 'shapes like "host and port, or a socket" and "email or phone, or both" had no spelling',
      },
      {
        what: '`optional` (the key may be missing) and `voidable` (the value may be `_`) replace the state vocabulary, and `_` is the void sentinel',
        why: 'one word, "absent", covered both kinds of nothing',
      },
      {
        what: '`ordered` replaces `unordered` and maps state it too; a set may be empty',
        why: 'every container now says whether order is part of its value, and a set\'s bounds work like an array\'s',
      },
      {
        what: '`uri` requires a scheme and is US-ASCII, beside new `uri_reference`, `iri` and `iri_reference` types',
        why: 'RFC 3986 gives every URI a scheme, yet `uri` admitted relative references, and identifiers beyond ASCII (RFC 3987) had no type',
      },
      {
        what: '`normalization` is a text facet: a value is its text put into the type\'s form',
        why: 'whether two spellings of "café" are one value is for the type to say, not the processor',
      },
      {
        what: 'Core drops seven entries, such as the sign-bound integers; meta\'s annotations are trimmed, and `@doc` is CommonMark',
        why: 'core holds only what a schema cannot do without, and a bound like "non-negative" is a one-line declaration of a schema\'s own',
      },
      {
        what: 'A record family\'s member must be declared, not created by a template application at a use site',
        why: 'a member with no name cannot be selected or referred to',
      },
      {
        what: 'New `policy.tn` declares the vocabulary of a processor\'s identifier, token and limits policy',
        why: 'a deployment can write its policy down as data, and a processor can report the policy it judged under in one shape',
      },
    ],
  },
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
 * The normative schema sources published under `/{series}/{revision}/m/`, derived
 * from `src/content/2026/{revision}/m/*.tn`, each paired with its non-normative
 * resolved-output fixture from `fixtures/{name}-resolved.tn` where one exists.
 * Both are served from that same directory, and the listing shows them together
 * so a source and its resolver output are never a scroll apart.
 */
const SCHEMA_SOURCES = import.meta.glob('../content/2026/*/m/*.tn', { query: '?raw', import: 'default' });
const SCHEMA_FIXTURES = import.meta.glob('../content/2026/*/fixtures/*-resolved.tn', { query: '?raw', import: 'default' });

/** The schema chain's own order; any other source follows it, alphabetically. */
const SCHEMA_ORDER = ['meta-kernel.tn', 'meta.tn', 'core.tn'];

/** One line per schema source, for `/llms.txt`; a source not named here is listed without one. */
export const SCHEMA_DESCRIPTIONS: Record<string, string> = {
  'meta-kernel.tn': 'Base kind constructors and the IS-A lattice root',
  'meta.tn': 'Annotation types and schema-level directives',
  'core.tn': 'Core type library for data interchange',
  'policy.tn': 'Processor policy vocabulary: what a processor admits and spends',
};

export interface SchemaFile {
  source: string;
  /** The resolved-output fixture, when the revision publishes one for this source. */
  resolved?: string;
}

export function schemaFilesFor(revision: string): SchemaFile[] {
  const base = `../content/2026/${revision}/`;
  const rank = (name: string) => {
    const i = SCHEMA_ORDER.indexOf(name);
    return i === -1 ? SCHEMA_ORDER.length : i;
  };
  return Object.keys(SCHEMA_SOURCES)
    .filter(path => path.startsWith(`${base}m/`))
    .map(path => path.slice(`${base}m/`.length))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map(source => {
      const resolved = source.replace(/\.tn$/, '-resolved.tn');
      return `${base}fixtures/${resolved}` in SCHEMA_FIXTURES ? { source, resolved } : { source };
    });
}
