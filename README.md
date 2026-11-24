# tson.io

tson.io is the home of the **TSON** (Typed Schema Object Notation)
project: a schema and data format for data interchange, focused on exact
schemas built from the shape of data. Its schemas are closed-world — a schema
admits nothing it doesn't declare — and immutable: every document names the
schema it follows by SHA-256 hash, and every schema its libraries. Names and
tokens are checked against Unicode confusables and restricted scripts, so
look-alike characters can't pass as trusted names.

Where JSON-like formats optimise for visual readability, minimal syntax, and
convention, TSON optimises for the opposite priorities — semantic transparency,
explicit structure, and verifiable schemas. That exactness is what lets AI both
author schemas and write data against them, and what makes TSON a foundation
for APIs, RPCs and identity.

TSON is built from an abstract data model and type system — a *proto-schema* —
for serialized data, derived from the physical constraints of serialization
itself. The name reflects that foundation:

- **Proto-** (prefix): first, original, primitive — the model from which
  concrete schemas are derived.
- **Schema** (noun): an outline of a plan or theory in the form of a model.

The format and its schema layer are defined in three parts:

- **Part 1 — Text Data Format:** the data model and its text encoding (lexer,
  data grammar, base type resolution, built-in type vocabulary).
- **Part 2 — Type System and Schema:** the schema layer and type system.
  It is self-hosting — a resolved schema is ordinary data in TSON's own model:
  a value of the kernel's `schema` type, a map from each type's name to its definition.
- **Part 3 — JSON Encoding:** how schema-governed TSON values are carried in
  JSON, read and validated against the same schemas.

On the surface, TSON can look like just another JSON format. It isn't: it rests
on extensive first-principles research, published as 18 articles on this site.
And unlike the recent LLM-oriented formats that prioritise reducing token
counts — such as TOON, and the several token-focused projects that also use the
name "TSON" — TSON is focused on semantic correctness and comprehension. Its
schemas are closed-world and SHA-256 verifiable, and data is pinned to a
specific, hash-identified schema rather than trading correctness away for loose
validation across many schema versions.

This site hosts the Specification, background research, developer guides, and the
SHA-256-pinned schemas: the **kernel**, `meta.tn` (the type system, pre-loaded, with the
common vocabulary at its root), the **numeric**, **temporal** and **net** type libraries (exact,
sized and floating-point numbers; dates, times and durations; IP addresses, host names, media
types, URIs and UUIDs, each based on RFC standards), **core** (every bundled type in one import,
with the author annotations), and **policy** (the vocabulary a deployment writes its processor
policy in).

The specification is a 2026 working draft, with revisions actively underway. When
it is ready, it will be pinned as version 1.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

## Other TSONs

The TSON acronym has been used by a number of unrelated projects. These other JSON-like
formats have different priorities. The following is not exhaustive and all of them are
unrelated to each other and tson.io:

- **[tercen/TSON](https://github.com/tercen/TSON)** — Typed JSON, a binary-encoded serialization of JSON-like document that support javascript typed data.
- **[tsonformat.com](https://tsonformat.com/)** — Token Serialized Object Notation by Muhammad Yasir is columnar notation of JSON designed to reduce token usage by 30-60% while improving readability for both humans and AI.
- **[zenoaihq/tson](https://github.com/zenoaihq/tson)** — Token-efficient Structured Object Notation by Zeno AI is a compact, delimiter-based serialization format that also targets LLMs with 11-18% token savings over compact JSON.
- **[thevpc/tson](https://github.com/thevpc/tson/)** — Human-Friendly, Strongly-Typed Superset of JSON is a structured text format for data that preservers human readability while providing built-in type safety, rich literals, and DSL-friendly constructs. It is a configuration format and data interchange format with strong typing baked into the syntax.

## Project structure

```
src/
  content/
    2026/
      {revision}/        # One directory per revision — see "Revision-scoped paths" below
        *.md             # TSON Part 1/2/3, the developer guide, and the revision's change log
        m/               # .tn schema source files (meta, numeric, temporal, net, core, policy)
        fixtures/        # Non-normative resolved-output fixtures for the schema source files
        reports/         # Design notes and feedback registers filed under this revision
        skills/          # Agent skills (tson-data, tson-schema), packaged as .skill bundles
    research/
      deep-dive-into-json/   # "A Deep Dive into JSON" article series
      proto-schema/          # "Proto-Schema" article series
  content.config.ts    # Content collection schemas (research, spec, changelog, reports)
  layout/
    Layout.astro       # Shared page shell (header, footer, license notice)
  components/
    SEO.astro            # Title, canonical URL, Open Graph and JSON-LD for every page
    RevisionNotice.astro # "Current working draft" / "retained revision" banner
    Validator.astro      # The home page's in-browser validator
  pages/
    index.astro                       # Home page — what TSON is, with the live validator
    compare.astro                     # /compare — TSON beside other schema languages
    research/index.astro              # Research index
    research/[series]/[slug].astro    # Research article pages
    2026/index.astro                  # /2026 — static redirect fallback to the current revision
    2026/revisions.astro              # /2026/revisions — every revision, current and retained
    2026/[revision]/index.astro       # Specification index for one revision
    2026/[revision]/[slug].astro      # Specification documents and change logs
    2026/[revision]/reports/[slug].astro  # Report pages
    raw/[collection]/[...slug].ts     # Serves raw markdown (frontmatter stripped) for LLMs/tools
    llms.txt.ts                       # /llms.txt — spec + schema index for LLMs
    research-llms.txt.ts              # /research-llms.txt — research index (optional/background)
    sitemap.xml.ts                    # /sitemap.xml — canonical page index
  lib/
    spec.ts             # The revision registry: CURRENT_REVISION and the per-revision notes
    reports.ts          # Report titles, descriptions and listing order
    llmsTxt.ts          # Shared helpers for the llms.txt endpoints
    rehypeTables.mjs    # Markdown table rendering
public/
  2026/{revision}/m/      # Static .tn schema + resolved-fixture files served as-is
  2026/{revision}/skills/ # The packaged .skill bundles
  _redirects              # /2026 -> /2026/{current revision}, a real 302
  images/                 # Images extracted from the research articles, and the share card
  robots.txt              # Content-Signal preferences + sitemap reference
  _headers                # Cloudflare response headers (content types, Link header, etc.)
vendor/                   # The @ltr8/tson TypeScript library, as a committed tarball
scripts/                  # One-off Python scripts used to migrate/format content
```

The TSON specification is split into three parts — **Part 1: Text Data Format** (the lexer,
grammar, base type resolution, and built-in type vocabulary), **Part 2: Type System and Schema**
(the schema layer and type system) and **Part 3: JSON Encoding** — plus companion specifications developed alongside it, currently
the **TSON Developer Guide** (`tson-guide.md`), a non-normative collection of design history and
rationale.

### Revision-scoped paths

The spec/schema files are drafted directly at a revision-scoped path (`/2026/40/...`) so that once
a revision is finalized enough to hash-pin, its URL never changes — no rename, no broken pins.
Starting a new revision is a copy-forward (`src/content/2026/40/` → `src/content/2026/41/`), never
an in-place rewrite of a published one. `/2026` itself is not a document — it's a redirect (a real
302 via `public/_redirects`) to whichever revision is current.

Every research article and specification document is available both as rendered HTML and as raw
markdown at `/raw/research/<series>/<slug>.md` or `/raw/2026/<revision>/<slug>.md`, so the content
is readable by both humans and LLMs/tools.

## Development

```
npm install
npm run dev       # starts the dev server at localhost:4321
npm run build     # builds the static site to ./dist
npm run preview   # preview the production build locally
```

## Deployment

The site builds to static output (`npm run build` → `./dist`) and deploys to Cloudflare via the
unified Workers-with-assets path (`wrangler deploy`, configured in `wrangler.jsonc`), triggered
automatically on push to `main` via the Cloudflare Workers & Pages GitHub integration.

## License

The **source code** in this repository (Astro components, scripts, configuration, and styles) is
licensed under the [MIT License](./LICENSE).

The **written content** under `src/content/research/` and `src/content/2026/` (the
research articles, the TSON specification, and any companion specifications) is licensed
separately under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). This covers the
specification *text* only — implementations of TSON (parsers, encoders, libraries) may be
licensed however their authors choose.

© 2026 [Litterat Pty Ltd](https://litterat.io)
