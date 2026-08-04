/**
 * Titles and descriptions for the non-normative reports under
 * `src/content/2026/{revision}/reports/`.
 *
 * The report documents are written outside this repo and carry no frontmatter,
 * so their metadata lives here rather than in the files — a regenerated report
 * keeps its listing. REPORT_ORDER drives the order they're listed in; a report
 * with no entry here still publishes, falling back to its first markdown
 * heading with no description.
 */

export interface ReportMeta {
  title: string;
  description: string;
}

/** Keyed by the file's slug (the basename without `.md`). */
export const REPORT_META: Record<string, ReportMeta> = {
  'schema-mappings-synthesis': {
    title: 'Schema Language Mappings: Synthesis',
    description:
      'Consolidates the five mapping reports into cross-cutting findings, a prioritised worklist for Part 2, and a shared converter architecture. Its headline result is that every construct in all five languages landed on existing machinery, a planned addition, or a principled decline — leaving the meta-kernel untouched.',
  },
  'json-schema-to-tson-mapping': {
    title: 'JSON Schema and OpenAPI → TSON',
    description:
      'Maps JSON Schema 2020-12 and OpenAPI one-directionally and strictness-first, so that format annotations become validated core types while the constraint-algebra keywords (not, if/then/else, unevaluated*) stay excluded by design. Introduces the discriminator token and the rest field that let records stay closed.',
  },
  'protobuf-to-tson-mapping': {
    title: 'Protocol Buffers → TSON',
    description:
      'Maps the protobuf IDL with protojson documents as the validation target. All three protobuf presence disciplines land on existing TSON field states with matching injection semantics, and field numbers and wire-encoding variants are preserved as annotations rather than type semantics.',
  },
  'asn1-to-tson-mapping': {
    title: 'ASN.1 (X.680–X.683) → TSON',
    description:
      'Maps ASN.1’s abstract syntax — the most architecturally TSON-like language examined, having separated abstract syntax from transfer syntax since 1984. Subtype constraints become refinements almost term-for-term; extensibility markers are the systematic tension against TSON’s closure.',
  },
  'avro-to-tson-mapping': {
    title: 'Apache Avro → TSON',
    description:
      'Maps Avro, the one source language designed around schema evolution as its primary use case, which forces the writer/reader resolution question every other report deferred. Avro’s union JSON encoding turns out to be TSON’s labelled sum materialised on the wire.',
  },
  'graphql-to-tson-mapping': {
    title: 'GraphQL SDL → TSON',
    description:
      'Maps GraphQL SDL, which is a capability schema rather than a data schema: a response’s shape comes from the query, not from the type alone. Covers the input universe, the output type graph, and the per-query derivation that would make response contract validation possible.',
  },
  'implementation-feedback': {
    title: 'Implementation Feedback',
    description:
      'Issues, ambiguities, and inconsistencies found in the specification while building the first implementation, each recorded with the reading that implementation chose and a suggested resolution. The most direct feedback loop the draft currently has.',
  },
};

/** Listing order on the specification page; unlisted reports follow, alphabetically. */
export const REPORT_ORDER = [
  'schema-mappings-synthesis',
  'json-schema-to-tson-mapping',
  'protobuf-to-tson-mapping',
  'asn1-to-tson-mapping',
  'avro-to-tson-mapping',
  'graphql-to-tson-mapping',
  'implementation-feedback',
];

/** `32/reports/avro-to-tson-mapping` -> `avro-to-tson-mapping` */
export function reportSlug(id: string): string {
  return id.split('/').pop() ?? id;
}

/** Metadata for a report, falling back to its first markdown heading. */
export function reportInfo(id: string, body = ''): ReportMeta {
  const slug = reportSlug(id);
  const meta = REPORT_META[slug];
  if (meta) return meta;

  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return { title: heading ?? slug, description: '' };
}

/** Sorts report ids by REPORT_ORDER, with anything unlisted after, alphabetically. */
export function byReportOrder(a: string, b: string): number {
  const ia = REPORT_ORDER.indexOf(reportSlug(a));
  const ib = REPORT_ORDER.indexOf(reportSlug(b));
  if (ia === -1 && ib === -1) return reportSlug(a).localeCompare(reportSlug(b));
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
