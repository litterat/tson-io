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
`astro dev stop` only tracks the most recent instance, so repeated restarts leave orphans
listening on 4321, 4322, 4323 … — check with `lsof -nP -iTCP:4321-4330 -sTCP:LISTEN` if the site
looks stale or broken locally, since the browser is probably pointed at an older one.

Markdown is rendered through a rehype plugin (`src/lib/rehypeTables.mjs`), and Astro caches the
rendered result in `.astro/`. **Editing that plugin changes nothing until the cache is cleared** —
`rm -rf .astro node_modules/.astro` — and a dev server left running across the delete serves
broken pages.

## Dependencies must be declared

Anything imported by `src/` or named in `astro.config.mjs` belongs in `package.json`
`dependencies`, even when it already resolves locally. A local `node_modules` hoists transitive
packages, so an undeclared import works here and fails on Cloudflare, whose clean install from the
lockfile skips optional peers. This has broken deploys twice: `micromark` (imported by
`/research`) and `@astrojs/markdown-remark` (required for `markdown.rehypePlugins` to run at all
under Astro 7's new default processor — its absence silently disables the plugin rather than
erroring).

Note `@astrojs/markdown-remark` is pinned **exactly**, not with a caret: astro declares a
`peerOptional` on one exact version, so `^7.2.0` resolves higher and fails `npm ci` with ERESOLVE.

To verify a dependency change the way Cloudflare sees it, clone to a temp dir, copy in
`package.json`/`package-lock.json`, then `npm ci` and build — `npx astro build` in this working
tree will not catch a missing declaration.

## Revision-scoped `/2026` paths

The spec/schema files live under a revision number so a hash-pinned reference never breaks:
`src/content/2026/{revision}/*.md` (Part 1/2, the guide), `src/content/2026/{revision}/m/*.tn`
(meta-kernel, meta, core), and `src/content/2026/{revision}/fixtures/*.tn` (their resolved-output
fixtures). Every revision stays published at its own path forever; nothing is deleted when the
next one opens.

`src/lib/spec.ts` is the revision registry. **Which** revisions exist is derived from the content
directories, so every page, the sitemap, and the revisions index pick a new one up automatically.
Only two things are declared by hand: `CURRENT_REVISION` (which one is the working draft — the
home page, `/llms.txt`, `/sitemap.xml`, and `public/_redirects` key off it) and `REVISION_NOTES`
(an optional one-line summary per revision for the listing).

Routes:

- `/2026` — a redirect (real 302 via `public/_redirects`, plus a static meta-refresh fallback page
  for local preview) to `/2026/{CURRENT_REVISION}`. Never itself a real, hash-pinnable document.
- `/2026/revisions` — the index of every revision, current and retained. A static route, so it
  wins over `[revision]`; revisions are numeric, so the name can never collide.
- `/2026/{revision}/…` — the revision's own pages. Each renders `RevisionNotice`: a quiet
  "current working draft" line on `CURRENT_REVISION`, and an amber "retained revision" banner
  everywhere else, linking to the same document in the current revision. Retained pages also get
  a `(Revision N)` title suffix so search results distinguish them.

### What a revision directory holds

| Path | Collection | Shown as |
| --- | --- | --- |
| `{revision}/tson-part1-data.md`, `tson-part2-schema.md` | `spec` (`part` set) | "TSON Specification", first |
| `{revision}/tson-guide.md`, any other spec doc | `spec` (no `part`) | "TSON Specification", after the parts |
| `{revision}/*-changelog.md` | `changelog` | "Reports" → "Change Log" |
| `{revision}/reports/*.md` | `reports` | "Reports", split by kind |
| `{revision}/m/*.tn`, `{revision}/fixtures/*.tn` | — (static, see below) | "Schema Source Files", each source with its fixture in parentheses |
| `{revision}/skills/{name}/SKILL.md` + its `references/`, `scripts/` | — (static, see below) | "Skills", each with its bundle download |

**Change logs** are matched by the `-changelog.md` filename suffix, and the `spec` glob excludes
that suffix — so a change log must be named `…-changelog.md` or it will load as a spec document
and fail the schema (it has no `draft`). Frontmatter is `title` plus optional `against`, `status`,
and `inputs` (a list). It renders through the same `[slug].astro` route as the spec documents,
branching on the absence of `draft`.

**Reports** are revision-scoped and are **not** carried forward: a report is written against the
revision it names, as input to the next one, and stays there. Retained-revision report pages say
so rather than claiming they've been superseded.

Report metadata resolves frontmatter first, then `REPORT_META` in `src/lib/reports.ts`, then the
file's first markdown heading — title and description resolve independently, so a report that
declares only a `title` in frontmatter still takes its listing description from `REPORT_META`. The
early reports carry no frontmatter at all and depend entirely on `REPORT_META`; don't remove those
entries. A report whose frontmatter `id` starts with `CR-` is listed as a **change report**
(a proposal for specific edits, shown with its `status` and `against`); everything else is an
**analysis report**. `REPORT_ORDER` drives listing order within each group.

**Why `.tn`, not `.tn1`** — the versioned extension belongs to a released version. Part 1 reserves
`.tn1` for TSON version 1 (and `.tn2`, … for later major versions), and the spec is still a working
draft, so no file here has earned that name yet: writing `.tn1` today would claim a conformance the
format hasn't frozen into. Everything unversioned therefore uses the bare `.tn` extension, which
reads as "development file, pre-v1 spec". When the draft freezes as version 1, the released
artifacts take `.tn1`.

**Starting a new revision** (e.g. 33 -> 34):
1. Copy the previous revision's `*.md`, `m/`, `fixtures/`, and `skills/` into
   `src/content/2026/34/`. Do **not** copy `reports/` or the previous revision's
   `*-changelog.md` — both belong to the revision they were written against.
2. In the copies, rewrite `2026/33` -> `2026/34` (the self-referencing
   `!!id`/`!!meta`/`!!import`/`!!schema` URLs and the spec's own cross-references), and the
   `## 2026 Revision 33` headings. Drop the previous revision's "what changed" sentence from the
   **Status:** paragraph — it describes the old revision, not the new one. The skills carry the
   same URLs and a "2026 Revision 33" line of their own, and bundle copies of `m/*.tn` that must
   be re-copied from the new revision.
3. Bump `CURRENT_REVISION` in `src/lib/spec.ts` to `'34'`, and add `REVISION_NOTES` entries: one
   for the new revision, and a closing summary for the one it supersedes.
4. Update the target in `public/_redirects` to `/2026/34`.
5. Run the public-sync step below for the new revision's files.
6. `npx astro build`, and check `/2026/revisions` lists both, `/llms.txt` names only the new
   revision, and the retained revision's pages carry the banner.

`public/_headers` needs **no** change: the `/2026/:revision/m/*` and `/2026/:revision/skills/*`
rules cover every revision. Each uses one Cloudflare placeholder plus one splat, which is the
maximum a single rule allows.

The `.tn` files' hash pins are placeholders, not computed digests: from revision 33 they spell
the digest as the literal token `xxhash` (`?sha256=xxhash`, and `…_xxhash` in synthetic entry
names), which keeps the pin's *shape* normative without freezing draft byte content — the
meta-kernel header says so. Copying them forward is therefore safe; real digests are computed
bottom-up at publication, not when a revision opens.

## Schema files and public sync

`src/content/2026/{revision}/m/*.tn` and `src/content/2026/{revision}/fixtures/*.tn` are the
sources of truth, but they're served live from `public/2026/{revision}/m/` as static files outside
Astro's content-collection pipeline. After editing any of them, copy the changed files into
`public/2026/{revision}/m/` — otherwise the deployed site serves stale schemas even though the
source and the build both look correct:

```
mkdir -p public/2026/33/m
cp src/content/2026/33/m/*.tn src/content/2026/33/fixtures/*.tn public/2026/33/m/
```

**Skills** work the same way, with a packaging step in the middle. The source is the unpacked
directory `src/content/2026/{revision}/skills/{name}/`; the published artifact is the zip at
`public/2026/{revision}/skills/{name}.skill`. Never edit the `.skill` — rebuild it. The `-x`
matters, since a stray `.DS_Store` otherwise ships inside the bundle:

```
mkdir -p public/2026/34/skills
cd src/content/2026/34/skills
for d in */; do
  d=${d%/}
  rm -f ../../../../../public/2026/34/skills/$d.skill
  zip -qrX ../../../../../public/2026/34/skills/$d.skill $d -x '*.DS_Store'
done
```

**Both `SKILL.md` bodies must stay under 5k tokens** — roughly 20,000 characters, and treat that
as a ceiling rather than a target, since character-count over four *under*-estimates tokens for
markdown tables. `SKILL.md` loads in full every time the skill triggers, so it pays for itself on
every invocation; a `references/` file costs nothing until it is read. When a section grows past
its worth, move it to `references/` and leave a pointer naming the file — lookup tables consulted
at one moment (facet lists, conversion mappings, the full pitfalls table) belong there, while the
rules and judgement a task needs from the start belong in `SKILL.md`. Check with:

```
python3 -c "
import re,sys; s=open(sys.argv[1]).read(); b=s[re.match(r'---\n.*?\n---\n',s,re.S).end():]
print(f'{len(b)} chars ~{len(b)//4} tokens')" src/content/2026/34/skills/tson-schema/SKILL.md
```

A `.skill` is a zip whose single top-level directory is the skill, so the archive must be built
from the `skills/` directory itself — zipping from anywhere else buries `SKILL.md` under the
wrong prefix and the bundle will not install. Which revisions publish skills is derived from
these directories by `skillsFor()` in `src/lib/spec.ts`, so the listing and `/llms.txt` pick a
new one up with no edit; a revision without a `skills/` directory simply renders no section.

Run `npx astro build` before committing spec or schema changes — it's the only check that
catches a broken content-collection frontmatter field or a stale cross-reference between the
`.tn` files and the spec prose that describes them.

## Working on the specification

Part 1 (`tson-part1-data.md`), Part 2 (`tson-part2-schema.md`), the developer guide
(`tson-guide.md`), the three `.tn` schema sources, and their resolved fixtures are edited
directly by the author outside of Claude Code and land as batches of changes to summarize and
commit. When asked to summarize and commit a landed batch:

- Read every changed file's diff before writing the commit message — the `.tn` files usually
  carry the real semantic change (new fields, constructors, grammar), while the spec prose
  documents it; a commit message written from only one side will miss half the change.
- Write commit messages that describe the actual design change (what construct was added/changed
  and why), not a reworded diff.
- Don't silently "fix" inconsistencies in in-progress spec text — the author is mid-revision and
  earlier sections may deliberately lag behind. The exception is unambiguous artifacts (a
  duplicated heading, a resolved fixture that's fallen out of sync with its `.tn` source) —
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
