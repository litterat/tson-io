---
title: "The kernel under its own name: meta.integer_type"
description: "Step 7 of One Level: put the kernel's declarations under names of its own so that an importing schema reserves few names. As built, the kernel is one document holding six open concept maps (meta, atom, numeric, unicode, net, binary) beside thirteen root names an author writes, with every name resolved from the root and no re-exports."
against: "TSON 2026 Revision 38 (Working Draft)"
status: "Landed differently in Revision 39"
id: "CR-kernel-namespace"
---

# The kernel under its own name: `meta.integer_type`

**Status: landed differently in Revision 39.**
- **Proposed:** step 7 of [`one-level.md`](/2026/38/reports/one-level)'s order of work. The kernel's declarations go under one
  nested schema map, `meta`, so that a schema importing it reserves one name. Each map is closed, declared in one
  document (rule A below). A bare name inside a map resolves there first (lexical scope), and a synthetic is homed by
  the innermost map. `core.tn` re-exports the few constructors a data schema writes as aliases, and the two kernel
  documents merge into one.
- **What happened:** the nested `!schema` map, qualified names and qualified tags landed, and the kernel is one
  document. The rest was built differently:
  - **Six concept maps and a root vocabulary.** The kernel holds `meta` (the type system), `atom` (the datatype
    properties), and `numeric`, `unicode`, `net` and `binary` (its atom constructors by family). Thirteen names an
    author writes stay at its root: `void`, `boolean`, `integer`, `int64`, `text`, `bytes`, `iri`, `iri_reference`,
    `regex`, `doc`, `enum`, `set` and `schema`.
  - **Maps are open (rule C, not A).** A map is the union of every document's members. numeric.tn and net.tn add
    their constructors to the kernel's `numeric` and `net`, and temporal.tn declares `temporal`.
  - **Every name resolves from the root.** There is no lexical scope, so there is no shadowing rule. Synthetics are
    minted at the root, identified by their form.
  - **No re-exports.** The data-format libraries each import the kernel alone. core.tn imports the three and declares
    only the author annotations, no aliases. `meta.ref<T>` and `meta.declared` are written by path, `kind` and
    `scoped` are gone, and `doc`, `set` and `enum` sit at the kernel's root.
- **Where:** [TSON-SCHEMA] §2.2.3, §3.4, §4.1, §5.3, §5.12, §6, §8–§10, §12.1, §13.2; [TSON-DATA] §3.1, §4, §7.4.
  [SPEC-FEEDBACK.md #14](/2026/38/reports/implementation-feedback) (every `!schema` value declares, from the root) and
  [SPEC-FEEDBACK.md #15](/2026/38/reports/implementation-feedback) (the roots hold the common vocabulary), with the kernel's own layout in
  the `@doc` that opens `spec/m/meta.tn`.

It answers decision 2 of [`one-level.md`](/2026/38/reports/one-level) ("Decisions before the ladder goes", which names a schema may
use) for the kernel's footprint. It rides on two things one level brings: qualified names at type positions ("The
reference atom", step 6), and the rule that a namespace's members are types or values by what built them ("Entries are
types or values"). It was written against `construction-operator.md`'s `<-` spelling,
which was dropped. Read `c <- { … }` below as `!c { … }`.

## The problem

One level makes `core.tn` import `meta.tn`, which imports the kernel, and imports are transitive (§2.2.3). Every name
the kernel and `meta.tn` declare is then reserved in every schema that imports core: `record`, `map`, `set`,
`template`, `choice`, `namespace`, `reference`, and every `*_type` constructor. one-level.md records the cost: Revision
38 moved five network names out of core because `mac` and `hostname` are plausible schema type names, and `record`,
`template` and `map` are far more plausible ones. Its two candidate answers, non-transitive imports and local
shadowing, are rules about imports in general, and each weakens a rule Revision 38 relies on.

The names at risk are all constructors. They are the rare vocabulary: a schema that describes data names `integer`,
`text`, `date` and `uuid` on most lines and `integer_type` almost never. Core's instances are the names every schema
wants, and they are reserved today without complaint.

## The proposal

The kernel's declarations sit under one entry, a schema map nested in the document:

```
{
  meta => !schema {
    top          => { }
    type         => top & { … }
    atom         => type & { … }
    integer_type => atom & { … }
    integer      => integer_type <- {}
    record       => product & { … }
    schema       => namespace & { key_type: = type_name  value_type: = top }
    …
  }
}
```

A schema that extends the kernel or applies a constructor qualifies the name; a schema that uses core's instances does
not:

```
integer   => meta.integer_type <- {}          -- in core.tn
uuid_type => meta.atom & { … }                -- a kernel extension, visible as one per entry
order     => { sku: text  qty: uint8 }        -- a data schema: nothing changes
pick      => { t: kind<type> }                -- or meta.kind<meta.type>, under "What core re-exports"
```

**As built:** the instances an author writes stay at the kernel's root, not inside `meta`. Its constructors are split
by family, so the first line is `integer => !numeric.integer_type {}` at the kernel's root, and `net.tn` declares
`uuid => !net.uuid_type {}`. The data schema is unchanged, and the last line is `pick => { t: meta.ref<meta.type> }`,
with no `kind` (SPEC-FEEDBACK.md #11, #15).

**The construct already exists.** Revision 38's kernel declares `schema => namespace & { key_type: = type_name
value_type: = top }`: the type of a schema document's own root map. `meta => !schema { … }` is that map nested as an
entry, not a new kind of namespace. What changes is one sentence of §4.1, that a namespace value's entries are values,
"nothing in it lifting or minting". Under one level the rule becomes:

> The rules for a schema document's root map apply to every value of `schema`. Its members are declarations: they
> lift and mint, they may be types, constructors or values, and a qualified name reaches them at any position a bare
> name is admitted.

**As built:** that sentence is SPEC-FEEDBACK.md #14's proposed §4.1 text, almost word for word. A value of any other
namespace type stays a value map. The kernel's map type is `meta.schema`, and its root declares `schema => meta.schema`,
an alias, so `!schema` names the pre-loaded kernel's whatever a document imports or declares (SPEC-FEEDBACK.md #15).

The document root is then the outermost `!schema`, and the kernel's bootstrap is the same loop one level deeper:
`meta => meta.schema <- { … }`, closed by pre-loading as now. `slots.md`'s reading, a schema as an object
whose slots may hold objects, is this taken literally.

**What it buys.**
- The kernel's reserved footprint in an importing schema is one name, `meta`.
- A kernel extension is visible per entry with no header: a document that composes `meta.top`, `meta.atom` or
  `meta.product` is extending the kernel, and says so where it does, which is what one-level.md's decision 1 relies on
  in place of an opt-in.
- The elided constructions are unchanged: a bare `{ … }` is `meta.record <- { … }`, `[A B]` is `meta.enum <- [A B]`,
  and `{K => V}` is `meta.map <- { … }`. An author who never writes `meta.` never meets it.

**As built:** the footprint is the six map names and the thirteen root names. A schema importing core.tn also reserves
`temporal` and the libraries' roots. `record`, `identifier`, `type_ref`, `field_name`, `bounded`, `value`, `kind` and
`core` stay free. The elided constructions target `meta.record`, `meta.array`, `meta.map`, `meta.tuple`, `meta.choice`
and `meta.alias`. An enumeration is `!enum [A B]`, `enum` sitting at the kernel's root, so there is no `meta.enum`
(SPEC-FEEDBACK.md #15).

## What it needs

In order of weight, with what became of each.

**1. Qualified names at type positions.** `type-name = identifier` (§12.1), and `type_kind` holds one segment. A `<-`
operand, a supertype, a field type and a kind slot must admit `meta.integer_type`. This is one-level.md's step 6, the
one reference atom over a qualified name, which precedes this note's step 7, and [`reference.md`](/2026/38/reports/reference) is its
grammar: `kind<T>` and `ref<T>` are already one atom there, so a qualified name at a type position is that atom with
`of` in the `type` family. Under the ladder it is the one new thing, and it is why this step follows the ladder's
removal. **As built:** landed. A qualified name stands at every type position, as a reference's `of` and as an
application's head. `meta.reference_type.of` and a chain's `supertypes` and `subtypes` are typed `meta.type_ref`. A
declared key stays one identifier (SPEC-FEEDBACK.md #14).

**2. Lexical scope inside a `!schema` body.** Inside `meta`, `integer_type` must name its sibling bare, or the kernel
writes `meta.` on every line. The rule: a bare name resolves in the innermost enclosing `!schema` map first, then each
enclosing map outward, then the document's imports. It is Newspeak's rule for nested classes, and the one slots.md
proposes for parents; a name found at two depths is the inner one, with no diagnostic, since the inner declaration is
the one the author can see.

**As built: not adopted.** Every name resolves from the root: the first segment names an entry of the root namespace,
and each further segment selects a member. Inside `geo`, a sibling is written `geo.address`, and a bare `address`
names the root's `address` or fails. The bundled documents write paths throughout (`integer => !numeric.integer_type
{}`, `format: numeric.ieee_format`). The cost the rule was meant to avoid turned out to be small once the kernel was
split into six maps by concept, with its common vocabulary at the root. Relative lookup would also need a way to say
"from the root" and a shadowing rule, silent or diagnosed. Lexical scope stays open (SPEC-FEEDBACK.md #14).

**3. Synthetics and identity.** A minted entry (`array_text_1_3600e7d5`) needs a home: the innermost enclosing
`!schema` of the declaration that lifted it. §10's identity of an entry becomes `!!id` plus a path rather than a name,
and §8.2's one-entry-per-form rule holds per map, two maps minting the same form being two entries, as two schemas
are today.

**As built:** synthetics mint at the root, one entry per form across the document, sugar inside a nested map included.
A dotted name contributes its text with each dot written `_` (`array_geo_inner_tag_…`). A path under the kernel's
`meta` contributes its member's name (`array_record_…`), and one under another kernel map keeps its first segment. A
declared entry's identity is its declaring document and its path, as proposed. A synthetic's is its form, so two
documents minting one form declare one entry. Homing by the innermost map waits on lexical scope, since a name minted
inside `geo` would have to resolve where it is written, and stays open with it (SPEC-FEEDBACK.md #14).

**4. Qualified tags in data.** A resolved form is a data document, and it describes a type as `!record { fields: … }`.
Under this proposal that is `!meta.record { … }`. The lexer already takes `meta.record` as one unquoted token, but
[TSON-DATA] §7.4's tag production has to admit the dot, and a schemaless read has to leave a dotted tag unresolved
rather than refuse it. That is a Part 1 edit, made in [`reference.md`](/2026/38/reports/reference) ("Qualified tags"). **As built:**
landed as `"!" qualified-name`. An annotation's name became `"@" qualified-name` on the same terms, so the kernel's
annotations are written `@atom.ordering:TOTAL` and `@meta.disjoint` (SPEC-FEEDBACK.md #14, #15).

**5. Extension: who may add to `meta`.** Decided at the time ("Extending the kernel's namespace" below): nobody. A
`!schema` value is declared in one document, as an entry is, and `meta-kernel.tn` and `meta.tn` become one document.
**As built:** anybody. Maps are open, and the one-document merge landed (SPEC-FEEDBACK.md #14, #15).

**6. What core re-exports.** A handful of constructors are written by name in data schemas: `kind<T>`, `ref<T>`,
`scoped` and its instances, `doc`. Either they are spelled `meta.kind<T>` everywhere, or `core.tn` aliases them
(`kind => meta.kind`), an alias being the same entry and no sibling (§5.10's sibling rule being deleted by one level).
Aliases, for the ones a data schema names; the list is short and is core's to keep.

**As built: no aliases.** The list shrank until nothing was left to alias. `kind` and `ref` became one template,
`meta.ref<T>`, written by path (SPEC-FEEDBACK.md #11). `scoped` reduced to `meta.declared`, also written by path. `doc`, `set` and `enum`, the constructors a data schema does write
bare, sit at the kernel's root. core.tn declares no map of its own and holds only the author annotations
(`deprecated`, `title`, `comment`, `examples`, `read_only`, `write_only`) (SPEC-FEEDBACK.md #15).

## Extending the kernel's namespace

`uuid_type => meta.atom & { … }` is a kernel extension, and it raises the question that decides this design: may a
document that imports the kernel add to `meta`? `meta.tn` is the first case, since it declares the atom constructors
the kernel does not. Written as it would first be tried:

```
!!import:"…/meta-kernel.tn"
{ meta => !schema { decimal_type => atom & { … } } }
```

Three rules could answer it.

**A. Closed maps.** A `!schema` value is declared in one document. The document above collides on `meta` with the
kernel it imports, refused as any duplicate entry is under §2.2.3; and inside its body bare `atom` would not resolve
anyway, since lexical scope reaches the kernel's root, where `atom` is not, it being `meta.atom`. An extension is an
ordinary declaration composing `meta.atom`, wherever it lives, and nothing says "extension" because nothing needs to.

**B. Parents on a schema map.** `meta => meta & { decimal_type => atom & { … } }`: meta.tn's `meta` has the kernel's as
a parent, bare `atom` resolves through it, and an importer reaches `meta.integer_type` and `meta.decimal_type` by one
prefix, the first still the kernel's entry by delegation. This is `slots.md`'s parent-slot proposal applied
to a `!schema` value, and it is the relation an import already is at the root, so it is one mechanism. Its cost is the
diamond. If `core.tn` and `net.tn` each extend `meta`, a schema importing both has two `meta` values that differ, which
Self refuses as ambiguous and which only a linearisation rule (C3) resolves. TSON has no such rule and should not want
one, and the series' own libraries would be the first to hit it.

**C. Open namespaces.** Several documents contribute members to one `meta`, the member set being the union. This
reproduces the flat-namespace collision inside `meta.`, found only when two extenders are imported together, and leaves
the identity of `meta.decimal_type` to the contributing document, so that `meta.` means different things in different
closures.

**The direction taken in this note: A, and one kernel document.** `meta-kernel.tn` and `meta.tn` are two documents only
because the ladder put the atom constructors a rung below the kernel. Under one level they import nothing but each
other and become one document, so the series' constructors are under one `meta.` with no extension needed. `net.tn`'s
constructors go under `net.` (`net.ipv4_type`), honestly theirs, and a user's `uuid_type` composes `meta.atom` at the
user's root or under the user's own prefix. Nothing wants to be under `meta.` except for a uniform spelling, and that is
not worth a merge rule. Should parents on a schema map ever return, it is slots.md's question, weighed with the diamond
in view.

**As built: C, with one kernel document.** The merge landed: the kernel is `meta.tn` alone, pre-loaded and importing
nothing. The placement is what made C fit. The kernel's own closure needs the integer, text, identifier, regex and iri
constructors, and it keeps the octet sequence beside them. So the kernel itself holds constructors of four families,
under `numeric`, `unicode`, `net` and `binary`. Their siblings live in the libraries: `decimal_type` in numeric.tn,
`uuid_type` in net.tn. Under A a family's constructors would carry two prefixes by declaring document. Under C
numeric.tn and net.tn add their members to the kernel's `numeric` and `net`, and an importer sees one map holding both
documents' members. C's two costs,
weighed above, are answered this way:
- **Identity.** A member's identity is its declaring document and its path, so a user's `meta.code_type` is no kernel
  entry.
- **Collision.** A member path two documents declare is §2.2.3's collision, found when both are imported, as
  predicted. Nothing reserves a map's unclaimed paths for the document that declared it first. That is recorded as
  open in SPEC-FEEDBACK.md #14 and #15.

B was not taken up.

## Resolved forms

As proposed, a resolved form of the kernel is `{ meta => !meta.schema { … } }`, its entries' bodies described under the
kernel's qualified names. **As built:** `!schema { numeric => !meta.schema { … } … meta => !meta.schema { … } … }`,
the six maps' members in resolved form, with the thirteen root entries and the seven synthetics at the root. Each
library's form holds its own map with its own members and none of the kernel's. A body is tagged by its constructor's
name (`!meta.record`, `!enum`, `!numeric.decimal_type`). A library's resolved form holds instances of constructors its
own source declares, so it still reads back only beside its source (SPEC-FEEDBACK.md #4, #15).

## The alternative, and why not here

Importer-side qualification, `!!import:"…/meta.tn" as m` then `m.integer_type`, is what most module systems do, and it
is the general answer to two user libraries colliding. It is the wrong tool for the kernel. Resolved output carries no
import list (§8.1), so an alias has no canonical spelling in it and every ingest would need the importer's alias table
beside the source's header. The collision one-level.md measured is the kernel's footprint, and exporter-side naming
removes it without touching any importer. For user libraries the same answer holds, by one-level.md's decision 2: a
library groups its declarations under its own `!schema` entry, and two libraries colliding at the root is an error, so
import aliasing is not needed there either. **As built:** as argued. A user library declares `geo => !schema { … }`,
and no import alias exists.

## Outcome for one-level.md's decisions

- **Decision 2** is answered by exporter-side naming. The kernel's footprint is its six map names and thirteen root
  names, and a user library makes room under its own `!schema` entry. Neither non-transitive imports nor local
  shadowing was needed.
- **Decision 1** needs no header opt-in: an extension is spelled where it happens, composing a `meta.` constructor.
  One part is unfinished. A constructor composing a base kind directly makes a new form, and the first implementation
  backs only the forms the bundled documents declare, refusing an instance of any other (SPEC-FEEDBACK.md #4, #15).
- **"The reference atom"** gained its use: a qualified name at a type position is why it was needed.
- **Decision 3** is unchanged: `meta.namespace` stays a constructor, and `meta.schema` is one of its instances.

## Settled and open

- **Merging the two kernel documents.** Settled: one document, `meta.tn` (`https://tson.io/2026/39/m/meta.tn`). core.tn
  keeps its name as the bundle importing numeric.tn, temporal.tn and net.tn (SPEC-FEEDBACK.md #15).
- **Scope and shadowing.** Moot while every name resolves from the root. It returns with lexical scope, which is open
  (SPEC-FEEDBACK.md #14).
- **Who may contribute to a map.** Open: any document may, the collision rule guarding a member only by its being
  declared first (SPEC-FEEDBACK.md #14, #15).
- **Which names sit at a root.** Open: the bundled placement is a judgement per entry, "what an author writes" being
  the intent but not yet a test an entry can be put to (SPEC-FEEDBACK.md #15).
