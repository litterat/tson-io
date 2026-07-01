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
    2026-28/          # The draft TSON specification (Draft 2026-28) and .tn1 schema source files
    research/
      deep-dive-into-json/   # "A Deep Dive into JSON" article series
      proto-schema/           # "Proto-Schema" article series
  content.config.ts    # Content collection schemas (research, spec)
  layout/
    Layout.astro       # Shared page shell (header, footer, license notice)
  pages/
    index.astro                     # Home page
    research/index.astro            # Research index
    research/[series]/[slug].astro  # Research article pages
    2026-28/index.astro             # Specification index
    2026-28/[slug].astro            # Specification document pages
    raw/[collection]/[...slug].ts   # Serves raw markdown (frontmatter stripped) for LLMs/tools
    llms.txt.ts                     # /llms.txt — spec + schema index for LLMs
    research-llms.txt.ts            # /research-llms.txt — research index (optional/background)
  lib/
    llmsTxt.ts          # Shared helpers for the llms.txt endpoints
public/
  2026-28/              # Static .tn1 schema files served as-is
  images/                # Images extracted from the research articles
scripts/                 # One-off Python scripts used to migrate/format content
```

Every research article and specification document is available both as rendered HTML and as raw
markdown at `/raw/research/<series>/<slug>.md` or `/raw/2026-28/<slug>.md`, so the content is
readable by both humans and LLMs/tools.

## Development

```
npm install
npm run dev       # starts the dev server at localhost:4321
npm run build     # builds the static site to ./dist
npm run preview   # preview the production build locally
```

## Deployment

The site builds to static output (`npm run build` → `./dist`) and is deployed on
[Cloudflare Pages](https://pages.cloudflare.com). No adapter is required — every route is
pre-rendered or generated via `getStaticPaths`.

## License

The **source code** in this repository (Astro components, scripts, configuration, and styles) is
licensed under the [MIT License](./LICENSE).

The **written content** under `src/content/research/` and `src/content/2026-28/` (the research
articles and the TSON specification) is licensed separately under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

© 2026 [Litterat Pty Ltd](https://litterat.io)
