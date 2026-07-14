# tson.io

tson.io is the home of the **TSON** (Tagged Structure Object Notation)
project: a schema and data format for data interchange, built around strong
semantic definitions and closed-world, verifiable schemas.

Where JSON-like formats optimise for visual readability, minimal syntax, and
convention, TSON optimises for the opposite priorities — semantic transparency,
explicit structure, and verifiable schemas. That makes it a natural fit for
systems where correctness matters more than terseness, including AI and LLM
pipelines that must read and write structured data without ambiguity.

TSON is built from an abstract data model and type system — a *proto-schema* —
for serialized data, derived from the physical constraints of serialization
itself. The name reflects that foundation:

- **Proto-** (prefix): first, original, primitive — the model from which
  concrete schemas are derived.
- **Schema** (noun): an outline of a plan or theory in the form of a model.

The format and its schema layer are defined in two parts:

- **Part 1 — Data Format:** the data model and its text encoding (lexer, data
  grammar, base type resolution, built-in type vocabulary).
- **Part 2 — Schemas and the Type System:** the schema layer and type system.
  It is self-hosting — a resolved schema is ordinary data of type
  `map<type_name, type_definition>` in TSON's own model.

On the surface, TSON can look like just another JSON format. It isn't: it rests
on extensive first-principles research, published as 18 articles on this site.
And unlike the recent LLM-oriented formats that prioritise reducing token
counts — such as TOON, and the several token-focused projects that also use the
name "TSON" — TSON is focused on semantic correctness and comprehension. Its
schemas are closed-world and SHA-256 verifiable, and data is pinned to a
specific, hash-identified schema rather than trading correctness away for loose
validation across many schema versions.

This site hosts the Specification, background research, developer guides, and the
SHA-256-pinned schemas: the **meta-kernel** (the self-referencing meta-schema),
**meta** (the extended meta-schema with the core type constructors), and **core**
(the common types required for data interchange, based on RFC standards).

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
      spec/            # TSON Part 1/2 and companion docs (tson-guide.md), 2026 working draft
      m/                # .tn1 schema source files (meta-kernel, meta, core)
      fixtures/          # Non-normative resolved-output fixtures for the schema source files
    research/
      deep-dive-into-json/   # "A Deep Dive into JSON" article series
      proto-schema/           # "Proto-Schema" article series
  content.config.ts    # Content collection schemas (research, spec)
  layout/
    Layout.astro       # Shared page shell (header, footer, license notice)
  pages/
    index.astro                     # Home page — TSON vs JSON comparison
    research/index.astro            # Research index
    research/[series]/[slug].astro  # Research article pages
    2026/index.astro                 # Specification index
    2026/[slug].astro                # Specification document pages
    raw/[collection]/[...slug].ts   # Serves raw markdown (frontmatter stripped) for LLMs/tools
    llms.txt.ts                     # /llms.txt — spec + schema index for LLMs
    research-llms.txt.ts            # /research-llms.txt — research index (optional/background)
    sitemap.xml.ts                   # /sitemap.xml — canonical page index
  lib/
    llmsTxt.ts          # Shared helpers for the llms.txt endpoints
public/
  2026/m/               # Static .tn1 schema + resolved-fixture files served as-is
  images/                # Images extracted from the research articles
  robots.txt             # Content-Signal preferences + sitemap reference
  _headers                # Cloudflare response headers (content types, Link header, etc.)
scripts/                 # One-off Python scripts used to migrate/format content
```

The TSON specification is split into two parts — **Part 1: Data Format** (the lexer, grammar,
base type resolution, and built-in type vocabulary) and **Part 2: Schemas and the Type System**
(the schema layer and type system) — plus companion specifications developed alongside it, currently
the **TSON Developer Guide** (`tson-guide.md`), a non-normative collection of design history and
rationale.

Every research article and specification document is available both as rendered HTML and as raw
markdown at `/raw/research/<series>/<slug>.md` or `/raw/2026/<slug>.md`, so the content is
readable by both humans and LLMs/tools.

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

The **written content** under `src/content/research/` and `src/content/2026/spec/` (the
research articles, the TSON specification, and any companion specifications) is licensed
separately under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). This covers the
specification *text* only — implementations of TSON (parsers, encoders, libraries) may be
licensed however their authors choose.

© 2026 [Litterat Pty Ltd](https://litterat.io)
