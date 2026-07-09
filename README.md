# tson.io

Source for [tson.io](https://tson.io) — the specification and background research for **TSON**
(Tagged Structure Object Notation), a data interchange format that extends JSON with richer
structural types, optional type annotations, references, structural composition, and a layered
type system.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

## Project structure

```
src/
  content/
    2026/
      spec/            # TSON Part 1/2 (2026 Revision 31), plus any companion specs
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
base type resolution, and built-in type vocabulary) and **Part 2: Schemas and Directives** — plus
room for companion specifications developed alongside it, if any exist for the current revision.

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
