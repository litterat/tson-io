---
title: "Revision 40: a guide to the revision"
description: "A companion to the change log. It shows which design note each Revision 40 change came from, the rulings taken while the revision was open, what was deferred or decided against, and where the first implementation does not yet run what the text states. The aim throughout is fewer ways of writing the same thing."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Complete in text, 2026-11-21"
---

# Revision 40: a guide to the revision

**Status: a guide to a revision complete in text (2026-11-21).** §2 is what Revision 40 carries; §4 is what was
decided against or deferred; §5 is what the text states and the first implementation does not yet run; §6 is what
remained before publication, and is done. §3 keeps the list of candidates the revision began with, and where each ended.

- **The aim of Revision 40** is less complexity and a more correct system: fewer ways of writing the same thing, so a
  schema author and an implementer each meet one rule where there were several.
- **The record of the change** is the [Revision 40 change log](/2026/40/tson-rev40-changelog), which states each
  section's rule before and after. This guide says which proposal each change came from and what was not taken.
- **How each change started:** with a census of what the kernel, the libraries, the corpus and the consumer schemas
  write, then a design note signed off by the spec author, then vectors and the first implementation.

## 1. In one page

| Revision 39 | Revision 40 |
|---|---|
| A template had two representations, and a parameter was a type or a value | A parametric record is a record with parameters; a parameter is a type |
| A form written at a use site lifted to an entry named by its content | A type slot holds a name or a type written in place; nothing is lifted or minted |
| `kind!` was a reference value, in data and in schemas | A dependent field's type is a sum written in place; `kind!` is schema grammar only |
| A reference could carry an argument list, in data too | A reference is a name; an application is `meta.apply`, schema grammar only |
| Five reference entries and a permission facet | One reference constructor, `meta.ref` |
| `^` and `&` could both restate a record's field | `^` follows `!name` and takes values; `&` is the one way to derive a record |
| `meta.set_type` and `enum` were refined constructors | A construction may be left open; both are incomplete entries |
| A schema could name only the namespace its imports bind | An extern names one entry of another schema under a local name |

The lexer is unchanged. The data grammar is tokens and structures again. Every bundled pin changes.

## 2. What Revision 40 carries

Items are the change log's, in its §3.1 (Part 1), §3.2 (Part 2) and §3.4 (Part 3); a bare item number is Part 2's. A
register entry is one of the first implementation's [spec-feedback entries](/2026/39/reports/specification-feedback), published with the revision as its
close-out record; the change log disposes of each in its §2.

| Change | Proposal | Change log |
|---|---|---|
| **Parametric records.** `meta.record` carries `parameters`; `C<args>` over a constructor constructs it; no value parameters, no inherited bounds, no parametric record a position names, no parametric alias | [`template-simplification.md`](/2026/40/reports/template-simplification), with [`refinement-source.md`](/2026/40/reports/refinement-source) | Register #3, #20. Part 2 items 1–32 and 131, Part 1 items 1–5, Part 3 items 1–5 and 12 |
| **Inline types.** A type slot is `( meta.type_ref \| meta.type_inline )`; `@meta.synthetic`, minted names and the merge of lifted forms go | [`inline-types.md`](/2026/40/reports/inline-types) | Register #5. Part 2 items 33–57 and 70, Part 3 item 6 |
| **A dependent field's type is a sum in place.** `meta.dependent`; `allow_sibling` and `meta.field_type_ref` go; `kind!` leaves the data grammar | [`references-and-dependent-fields.md`](/2026/40/reports/references-and-dependent-fields) | Register #6. Part 2 items 58–69, Part 1 items 6–13, Part 3 items 7–8 |
| **Inline records.** A record body is written at a type slot; an abstract record in place is empty | [`inline-records.md`](/2026/40/reports/inline-records) | Part 2 items 71–76 |
| **A parameter at any slot of a type written in place.** `[T; 1..]`, `( T \| int32 )`, `{ cursor: T }` | [`inline-records.md`](/2026/40/reports/inline-records) §5, [`names-only-reference.md`](/2026/40/reports/names-only-reference) step 1 | Part 2 items 77–83 |
| **The reference holds only names.** `meta.apply`, final; the argument list leaves the data grammar; one constructor `meta.ref` | [`names-only-reference.md`](/2026/40/reports/names-only-reference) | Register #14. Part 2 items 84–100, Part 1 items 14–19 and 25, Part 3 items 9–10 |
| **The kernel reviewed.** A chain's `supertypes` and `subtypes` are sets; every bundled `@doc` rewritten for a reader of one entry | `misc.md`, an outside review and its validation; the earlier text is in `removed-bundled-docs.md` | Part 2 items 103–104, change log §3.3 |
| **Open construction.** `!C ^ { values }` over a constructor declares an incomplete entry; `enum` and `set` are two; record `^` goes and `refined-def` leaves the grammar; a type a collection constructor builds, a namespace type among them, takes `^` | [`open-construction-design.md`](/2026/40/reports/open-construction-design); its working record is `refine-and-compose.md`, and `construction-operator.md` is the operator that was dropped on the way | Register #10–#12. Part 2 items 105–109 and 120–121, Part 3 item 11 |
| **The extern.** One entry of another schema under a local name, read in that schema's scope (below) | [`extern.md`](/2026/40/reports/extern) | Register #13. Part 2 items 114–116 and 124, Part 1 item 21, Part 3 items 13 and 16 |
| **A reference reaches every name.** A quoted token at a reference-typed position is the reference its text spells, each segment a name of the family it enters; no such family admits `.` | `reference-reach.md` | Register #2. Part 2 items 117–118, Part 1 item 22, Part 3 item 14 |
| **A tag at a choice reaches a variant's subtypes.** The tag names a variant or a type that IS-A exactly one; a tag that IS-A two is refused at the data | none | Register #4. Part 2 item 119, Part 3 item 15 |
| **Four register sentences.** The worked example under an import; a free sibling's warning; a name in an annotation's value; `uuid`'s `version` | none | Register #1, #7, #8, #9. Part 2 items 110–112, Part 1 item 20 |
| **One name for the fraction-digit grid.** `precision` on `time_type`, `datetime_type` and `duration_type` is `fraction_digits`, as on `decimal_type`; the cap of 9 is unchanged | `facets-by-property.md`, the one piece of it taken | Register #21. Part 2 item 113 |

### 2.1 The extern

A schema could address only the namespace it had: Revision 38 had external forms, and Revision 39 removed them and
put nothing in their place, so a description of a service serving two versions of one schema, both declaring
`order`, could name only one. [TSON-SCHEMA] §5.13 and §7.9 and [TSON-JSON] §8.6 state the replacement.

- **The form.** `order_v1 => !meta.extern { schema: "…/order-1.tn"  type: order }`. A hop, as an alias is, whose
  identity is the foreign entry's. None of the foreign schema's names enter the importer's namespace. `schema` is an
  `iri_reference`, as an `!!import` value is; `type` is `text`, judged in the foreign namespace (item 114).
- **A scope change.** A value at a position typed by an extern uses the names of its own schema inside its body; the
  tag in front of it is the enclosing scope's. A name means one type throughout a scope, and only the schema shows
  where a scope starts, so a directive at a value position stays a parse error ([TSON-DATA] §3.3; item 116).
- **Sealed.** It names a type a value can have and nothing else. `&`, `-`, `^`, an application head, a constructor
  head, a default and a pin at a field typed by it are refused, and no qualified name selects through it (item 114).
- **Bounded.** Its schema joins the reference closure as an import's does. The declaring schema is refused unless
  every foreign schema loads, holds the same kernel and closes no cycle, and the import closure limit counts externs
  (item 115; [TSON-SCHEMA] §11.5).

### 2.2 Rulings taken during the revision

Rules settled while the revision was open, most on the spec author's rulings. Where the change log records the
alternative that lost, it is given.

| Rule | Alternative not taken | Change log |
|---|---|---|
| A choice over a parameter, `( T \| int32 )`, loads at the parametric record and is judged where each application closes | Refusing it at the declaration, or requiring disjointness for every argument | Part 2 items 77–83 |
| A value a family places by its pins waits on each declaration that may be its member | none recorded | Part 2 item 101 |
| A declared `!meta.apply` is a resolver error; a declared application is written `x => H<args>` | none recorded | Part 2 item 102 |
| The source of `^` is a type built by `meta.array`, by `meta.map` or by a constructor that IS-A either | Keeping the source to the two constructors | Part 2 item 120 |
| A facet fixed at construction that holds a type's name is one by the entry the name reaches, not by spelling | none recorded | Part 2 item 121 |
| A type value written as data is held to the kernel's types alone and declares nothing | Typing `meta.type_inline.of` by a narrower kernel type | Part 2 item 122 |
| `meta.field_name` is removed; a record stating no name type has `meta.identifier`'s | none recorded | Part 2 item 123 |
| Across an extern's boundary a subtype is tagged by a name of the enclosing scope; the target stays any type a value can have | Refusing an abstract record or a choice as a target | Part 2 item 124 |
| One value, one type name: a JSON wrapper's `$value` carries no `$type` of its own | A second tag in text, `!order_v1 !rush { … }` | Part 3 item 16 |
| A tag names a variant by the entry it reaches, past an alias chain and an extern | none recorded | Part 2 item 125 |
| A variant that is a choice is disjoint, its tag spent naming it; a nested choice that is not disjoint is refused, through an extern as through an alias, so a choice nests one deep | Refusing every nested choice | Part 2 item 126 |
| The rules for a restated field stand in §5.8; §5.7 states refinement alone | Retitling §5.7 to cover both | Part 2 item 127 |
| IS-A is declared and promises subsumption; a choice's variants compare in order | none recorded | Part 2 items 128–129 |
| Instantiation terminates because an argument is a name; §5.10.1's regularity rule stands, its reason corrected | none recorded | Part 2 item 130 |
| A record with parameters is a **parametric record**, its use an **application** | "Open record"; "generic record" | Part 2 item 131 |
| An entry has no derived kind | none recorded | Part 2 item 132 |
| `discriminators` on a `!meta.record` requires `extension: ABSTRACT`; a missing `extension` is `OPEN`, and refused | Deriving ABSTRACT over what is stated | Part 2 item 133 |
| An alias of a parametric record is another name for it: `bx<text>` over `bx => box` is `box<text>` | Refusing the alias | Part 2 item 135 |
| A definition mark stands before a record definition alone; before `!C { … }` or a declared application it is a parse error, one application marked alone being `x => abstract box<text> & {}` | Admitting the mark before `!meta.record` where `extension` is unwritten or agrees | Part 2 item 136 |
| A body entry naming a field absorbed from an applied operand restates it, judged by §5.8 whether or not a declaration names the application | Reading it as a new field that replaces the absorbed one | Part 2 item 137 |
| An application at an operand reaches the entry a declaration gives the application itself, beside its head's written parents' | none recorded | Part 2 item 138 |
| A qualified name's segment may select a dependent field, taking the type the sibling names | Refusing the segment | §5, no text change |
| The token policy's type is `policy.token_policy`; its two loosest levels judge alike over a token | none recorded | Part 1 items 23–24 |
| The arbitrary-JSON choice names its map variant, `json_object`, so §8.3.1's escape has a name to write | A wrapper with no `$type`, read by class | Part 3 item 17 |
| §3.3's sentence that sorting puts the annotation members first holds for records of `meta.identifier` names | Reading the annotation members anywhere in the leading run of `$` members (§4.1) | Part 3 item 18 |

What the revision gives up, and the replacement for each, is the change log's §4.11.

**Supporting notes.**
- `complexity-ledger.md`: the measurement that ranked the rules by what they cost the first
  implementation. Inline types came from its first candidate.
- `amplification-vectors.md`: small schemas that ask for large work. Two are measured.
  `max_materialisation_depth` is removed, guarding nothing (change log §1). The rest waits (§4.2).
- `cognitive-load-testing.md`: a protocol for measuring the schema syntax against
  language models. Not run.
- `slots.md`, `computation.md`, `identity.md`: essays, nothing owed.

## 3. The candidate list, and where each ended

| Candidate | Outcome |
|---|---|
| References and their membership: five entries, `allow_sibling`, two readings of `of` | Done in part. One constructor, no permission facet (items 97–100). Whether a reference names types or values is still read from `of`, kept on purpose |
| Undeclared applications of a Revision 39 template | Superseded by inline types: an application at a slot closes in place, and only a recursive one must be declared |
| Dependent fields | Kept, retyped as a sum in place (items 58–69) |
| `&` and `^` overlap | Done: the operator decides the body (item 108) |
| Restatement judged one phase late (ledger §4.6) | Done: a restated field's rules stand in §5.8 (item 127), and an absorbed field is restated like an inherited one (item 137). One gap remains in the first implementation (§5) |
| Where a parameter stands, and a literal argument (ledger §4.7, §4.8) | Done: one positive rule (item 80), and `type-arg = type-expr` (item 30) |
| Four ways to say "one of": untagged choice, tag dispatch, `=?` dispatch, field group | Not taken. A choice that is not disjoint names every variant, a nested choice is disjoint (item 126), and a choice over a parameter is judged where it closes. How sums are expressed waits for Revision 41 (§4.1) |
| Parameter bounds (ledger §4.3) | Not taken. Bounds are written and never inherited; removing them was not examined |
| Three kinds of nothing: `optional`, `voidable`, `void` | Not taken. Cheap to implement; an author's question |
| What makes an entry a type ([`template-simplification.md`](/2026/40/reports/template-simplification) §9) | Not taken. The derived kind is removed (item 132), the nearest piece |
| Facets by property | Deferred, the rename of `precision` taken (item 113; §4.2) |

## 4. Decided against or deferred

### 4.1 Deferred to Revision 41

Each needs a design this revision does not carry; the spec author named Revision 41 for each.

- **[TSON-JSON] §3.3's leading-member rule relaxed**, so canonical output of a tagged value of a record whose name
  type admits `$ref`, `$id` or `$defs` is readable. At a choice or a declared position no record bounds the run of
  `$` members, so it waits for the sum types. Revision 40 holds §3.3's sorting sentence to identifier names (Part 3
  item 18).
- **A wrapper with no `$type`**, `{ "$value": … }` read by class. A named variant covers the case it was for
  (Part 3 item 17).
- **How sums are expressed**: a nested choice standing for its variants, so a tag names a variant's variant, and sum
  types generally. It would lift item 126's refusal and refuse nothing Revision 40 admits (change log §5, "#15").
- **Dropping §5.10.1's regularity rule.** Name-only arguments already make instantiation terminate; what the rule
  buys is one verdict at the parametric record (item 130).
- **A constructor declared by composition that adds a field**, `my_map => meta.map & { label?: text }`: where the
  added field lives in the schema model and the resolved form. Until then the declaration loads, and the first
  implementation reports an instance of it as not implemented. One that adds no field is applied and constructed as
  its parent is, a composition of `meta.record` aside (§5).

### 4.2 Deferred, no revision named

- **Facets by property** (`facets-by-property.md`): each constraint facet declared once, as
  a mixin in the kernel's `atom` namespace typed by the family's instance, each family composing the mixins its value
  space licenses, and whether a family is ordered an IS-A edge to `atom.ordered`. The ruling: a facet's kind is not
  normative, so the mixins would keep facets aligned across the families and no more, and making kinds normative needs
  more focus than this revision gives. Text's `members` stays settable-once ([TSON-SCHEMA] §5.7). Taken: the grid's
  one name, `fraction_digits` (item 113).
- **Resource bounds on types written in place**, with the rest of
  `amplification-vectors.md`. This revision is not about resource bounds.
- **What open construction left out**: named tops over `meta.array` and `meta.map`; `!X { … }` reading as a
  completion or a value entry by what `X` is; incomplete entries beside `record`, `tuple`, `choice` and `ref`.
- **What inline types left out**: an enum or a refined atom written in place; a construction as an argument,
  `page<[order]>`.

### 4.3 No change

- **The `@atom.*` annotations on `numeric.count` and `policy.limit`** (`misc.md`, kernel declarations
  item 7): no change in this revision.

## 5. Gaps in the first implementation

Where the text states a rule and the first implementation does not yet run it. None changes the text. Each is in the
first implementation's backlog, and those the change log's §5 carries as open are marked "(§5)".

**On deriving and constructing.**
- An instance of a constructor composed from `meta.record` is refused as not implemented, even where the composition
  adds no field. Any schema may declare a constructor ([TSON-SCHEMA] §4.2).
- A JSON `$type` naming an incomplete entry reports a gap where the text encoding reports a mismatch
  ([TSON-SCHEMA] §5.5).
- A field of an incomplete entry typed by a type written in place is read only where the entry is completed
  ([TSON-SCHEMA] §5.5).

**On parametric records and types written in place.**
- A record written as `!meta.record` is not judged against [TSON-SCHEMA] §8.1's invariants for a field, and
  `extension: FINAL` on a parametric record written so loads (§5.2).
- A value entry is not read against a field typed by an application written in place ([TSON-SCHEMA] §4.1, §5.10).
- A tree read, in either encoding, does not read a dependent value against a sibling written in place
  ([TSON-SCHEMA] §5.2). (§5)

**On externs.** (§5, the first five)
- In TSON text, a root typed by an extern and an extern reached through an alias of a container write no boundary
  tag ([TSON-SCHEMA] §7.9).
- A tag naming an extern at a position no extern types is refused in both encodings, where [TSON-SCHEMA] §8.3
  follows an extern as it follows an alias.
- A map key typed by an extern reports outside the foreign scope in JSON.
- No JSON writer writes a `$type`, a boundary's included ([TSON-JSON] §8.6, §9.2).
- The import closure limit is counted by nothing, externs included ([TSON-SCHEMA] §11.5).
- A dependent value in a value entry is not read across an extern into a third schema ([TSON-SCHEMA] §5.2, §7.9).

**Elsewhere.**
- A name in a schema document's annotation value is not judged at link ([TSON-SCHEMA] §5.12). (§5)
- Under a schema, `kind!` or an argument list in a data value is reported as a validation error, where
  [TSON-DATA] §8.1 files it as a parse error.
- A tag that names nothing reports a type mismatch below the root, in both encodings, where [TSON-DATA] §8.1 makes
  an unresolved type a resolver error. It predates this revision.
- A variant bound through a bridge, read through a choice in bind mode, fails as a bind mismatch on a valid document
  ([TSON-SCHEMA] §7.4).
- An argument list a few thousand deep overflows the stack; nothing bounds its depth ([TSON-DATA] §9.1,
  [TSON-SCHEMA] §11.5).
- Vectors owed: a parameter at a facet; an application through an alias of a parametric record at a declaration and
  at a field's type; an aliased application declared in an import and composed as a parent in the importer.

## 6. Before publication

- The Developer Guide is revised to Revision 40, and all three Parts reference it at `/2026/40/` (Part 1 item 5,
  Part 2 item 32, Part 3 item 5). The schema and data authoring skills are revised to Revision 40: they teach
  parametric records, `^` after `!name` alone, `enum` and `set` as incomplete entries, and `kind!` as schema
  grammar only.
- The text, the bundled schemas, the resolved fixtures and the guide are published together at `/2026/40/`, so the
  series references ([TSON-DATA] §10.2, [TSON-SCHEMA] §13.2, [TSON-JSON] §11.2) resolve.
