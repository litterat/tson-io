# TSON.IO — Website

tson.io is the home of the TSON project: a schema and data format for data
interchange, built around strong semantic definitions and closed-world,
verifiable schemas. The README.md contains additional background and details about TSON.

This site hosts the Specification, background research, developer guides, and the
SHA-256-pinned schemas: the **meta-kernel** (the self-referencing meta-schema),
**meta** (the extended meta-schema with the core type constructors), and **core**
(the common types required for data interchange, based on RFC standards).

The specification is a 2026 working draft, with revisions actively underway. When
it is ready, it will be pinned as version 1.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Revision-scoped `/2026` paths

The spec/schema files live under a revision number so a hash-pinned reference never breaks:
`src/content/2026/{revision}/*.md` (Part 1/2, the guide), `src/content/2026/{revision}/m/*.tn1`
(meta-kernel, meta, core), and `src/content/2026/{revision}/fixtures/*.tn1` (their resolved-output
fixtures). `CURRENT_REVISION` in `src/lib/spec.ts` is the single source of truth for which
revision is "current" — the home page, `/llms.txt`, `/sitemap.xml`, and `public/_redirects` all
key off it. `/2026` itself is a redirect (real 302 via `public/_redirects`, plus a static
meta-refresh fallback page for local preview) to `/2026/{CURRENT_REVISION}` — it is never itself a
real, hash-pinnable document.

**Starting a new revision** (e.g. 32 -> 33):
1. Copy `src/content/2026/32/` to `src/content/2026/33/` (all three subtrees).
2. Update the copies' self-referencing `!!id`/`!!meta`/`!!import`/`!!schema` URLs from
   `/2026/32/...` to `/2026/33/...`.
3. Bump `CURRENT_REVISION` in `src/lib/spec.ts` to `'33'`.
4. Add a `/2026/33/m/*.tn1` block to `public/_headers` (leave the old revision's block in place —
   it's still served).
5. Update the target in `public/_redirects` to `/2026/33`.
6. Run the public-sync step below for the new revision's files.

## Schema files and public sync

`src/content/2026/{revision}/m/*.tn1` and `src/content/2026/{revision}/fixtures/*.tn1` are the
sources of truth, but they're served live from `public/2026/{revision}/m/` as static files outside
Astro's content-collection pipeline. After editing any of them, copy the changed files into
`public/2026/{revision}/m/` — otherwise the deployed site serves stale schemas even though the
source and the build both look correct:

```
cp src/content/2026/32/m/*.tn1 src/content/2026/32/fixtures/*.tn1 public/2026/32/m/
```

Run `npx astro build` before committing spec or schema changes — it's the only check that
catches a broken content-collection frontmatter field or a stale cross-reference between the
`.tn1` files and the spec prose that describes them.

## Working on the specification

Part 1 (`tson-part1-data.md`), Part 2 (`tson-part2-schema.md`), the developer guide
(`tson-guide.md`), the three `.tn1` schema sources, and their resolved fixtures are edited
directly by the author outside of Claude Code and land as batches of changes to summarize and
commit. When asked to summarize and commit a landed batch:

- Read every changed file's diff before writing the commit message — the `.tn1` files usually
  carry the real semantic change (new fields, constructors, grammar), while the spec prose
  documents it; a commit message written from only one side will miss half the change.
- Write commit messages that describe the actual design change (what construct was added/changed
  and why), not a reworded diff.
- Don't silently "fix" inconsistencies in in-progress spec text — the author is mid-revision and
  earlier sections may deliberately lag behind. The exception is unambiguous artifacts (a
  duplicated heading, a resolved fixture that's fallen out of sync with its `.tn1` source) —
  those are safe to fix, and worth calling out explicitly in the commit message.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
