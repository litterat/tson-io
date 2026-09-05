# Declaration forms in depth

Part 2 §4–§5 and §6, condensed. The SKILL.md decision table picks the form; this file has the rules each form is checked against.

## Contents

1. Canonical form — what every declaration becomes
2. Records and field states
3. Type expressions and synthetic entries
4. Constructor application vs atom refinement
5. Refinement `^`
6. Composition `&`
7. Subtraction `-`
8. Choice types and disjointness
9. Field groups
10. Annotations in schemas — including the checked ones (`@discriminator`, `@rest`)
11. Namespaces — what a name means where

---

## 1. Canonical form

Every closed declaration resolves to a `type_definition` whose body is `!C { bindings }` — a constructor applied to a record of its own fields. (An *open* one — a template — has a `!template { parameters  template }` body instead; see `templates.md`.) A `type_definition` carries `source`, `supertypes`, `subtypes` and `body`, and nothing else: a kind is derived from the body, not recorded. Sugar desugars:

| Source | Canonical |
|---|---|
| `{ a: text }` | `!record { fields: [ { name: a  type: text } ] }` |
| `[T]` | `!array { element_type: T }` |
| `[T; N]` | `!array { element_type: T  min_items: N  max_items: N }` |
| `[T; N..M]`, `[T; N..]`, `[T; ..M]` | `min_items`/`max_items` as given |
| `[T?]` | `state: OPTIONAL` on the array |
| `[T, U]` | `!tuple { elements: [ { element_type: T } { element_type: U } ] }` |
| `(A \| B)` | `!choice { variants: [A B] }` |
| `{K => V}` | `!map { key_type: K  value_type: V }` |
| `!enum [a b]` | `!enum { members: [a b] }` |
| `!bytes_type HEX` | `!bytes_type { encoding: HEX }` |
| `!integer ^ { min: 0 }` | `!integer_type { min: 0 }`, `supertypes: [integer]` |
| `!int8 ^ { min: 0 }` | `!integer_type { size: { bits: 8  signed: true }  min: 0 }` — inherited facets survive |

**Positional form.** When a constructor has exactly one REQUIRED field (no default, no fixed), the value after `!C` fills it directly: `!enum [true false]`, `!array text`. Note `bytes_type.encoding` carries a default (`~ BASE64`), so it is *not* a positional slot — write `!bytes_type { encoding: HEX }`. With zero or two-plus required fields, use braces.

**Bodies are closed.** Every member of a construction or refinement body must be a field the constructor declares; an unknown member is a resolver error. This is why `!integer ^ { minimum: 1 }` is refused rather than silently ignored.

**Top-level constructor applications are constructions**: `lookup => {text => integer}` and `lookup => !map { … }` are the same thing — a finished type with no supertypes, which cannot be refined further.

## 2. Records and field states

Five states, six spellings:

| Syntax | State | Data behaviour |
|---|---|---|
| `f: T` | REQUIRED | must be present |
| `f: T ~ v` | REQUIRED_DEFAULT | omitted → `v` injected on decode; overridable by refinement |
| `f: T = v` | REQUIRED_FIXED | omitted → `v` injected; written value must equal `v` (else validation error) |
| `f: T?` | OPTIONAL | may be omitted or `_`; never injected |
| `f: T? = v` | OPTIONAL_FIXED | if present must be `v`; never injected |
| `f: T? = _` | OPTIONAL_FIXED (no value) | may be omitted or `_`; may not carry a value |

Resolver errors: `~ _`; `= _` on a REQUIRED field; `T? ~ v`.

**Which fields may carry a value:** only fields whose declared type, after following its reference chain, is an atom-family instance or an enum. Value modifiers are single scalar tokens or `_`; no arrays/records/maps. Values are parsed by the field's type at schema load (eager) — a default that fails its own type is a load error.

**Elided type-refs:** in a `^` or `&` body a tightening entry may omit the type — `port: = 9090` — inheriting it from the source. In a fresh `{ … }` every field needs a type.

**Encoders** should write defaulted values out (a document that states its defaults reads without its schema); omitting a field equal to its default is a permitted optimisation.

**Inline prohibition.** Bare records (`{ name: text }`) and atom refinements (`!integer ^ { … }`) may appear only as a declaration's own body — never at a field type, group member, tuple element, array element, choice variant, type argument, or composition position. Container sugar carries no such restriction.

## 3. Type expressions and synthetic entries

One form per container, legal at every type position. Arrays: `[T]`, `[T; N]`, `[T; N..M]`, `[T; N..]`, `[T; ..M]`; bounds are non-negative decimal integers (or, in a template body, a value parameter). `[T; 0..]` is an error (write `[T]`); `[T; N..N]` is the same as `[T; N]` (prefer `N`). `min_items <= max_items` is checked at load (or at materialisation when parameter-bound).

Tuples need two or more positions; positions may be `?` (the slot is still mandatory — a short tuple is a validation error; write `_`). For trailing-optional semantics use `[T; 1..]`.

Maps: `{K => V}`, one entry only; key is a simple name (with optional `<args>`), never a paren/bracket/map form — declare a named key type or use `!map { key_type: … }`. `?` is legal on the value side only. No annotations inside the sugar braces.

Every inline sugar form **lifts** to a resolver-created synthetic entry (structurally keyed, so `[text]` written in ten places is one entry). Only a declaration's own body stays in place. This has one practical consequence: a *use site* never carries arguments in resolved output — `[box<text>]` and `grid<pixel, 3>` resolve to references to materialised entries.

## 4. Constructor application vs atom refinement

- `!C value` — **application**. `C` must be a constructor — an entry that IS-A `top`, resolved through the meta-schema's *structure namespace*: `enum`, `bytes_type`, `array`, `map`, `set_type`, `tuple`, `choice`, `scoped`, `integer_type`, `text_type`, …. Transfers kind only; no IS-A. Founding a new family with an atom constructor is legal but rarely what you want.
- `!I ^ { values }` — **atom refinement**. `I` must be a non-constructor *instance* from the type-name namespace (`integer`, `text`, `int8`, `date`, a user-declared refined atom). Establishes IS-A `I`; facets merge over `I`'s. The body is data (`size: { bits: 8  signed: true }` binds a nested value); a bare value, a second `!`, an annotation, or a map in body position is a parse error.

Kind determination: the constructor's base kind (`atom`, `product`, `sum`, `data`) reached through its supertypes; none → PRODUCT; two → error. `!C {}` inherits it.

Category errors in data mirror this: `!integer_type 42` and `!age { min: 0 }` are both type errors — constructors type constraint records, instances type scalars.

### The three spellings of "like `uuid`"

| Spelling | Example | What it buys |
|---|---|---|
| reference | `id => uuid` | one type under two names; a hop, resolved but not rewritten |
| refinement | `id => !uuid ^ {}` | a **new** type that IS-A `uuid` — the empty refinement is legal and is the nominal-subtype spelling |
| fresh instance | `id => !uuid_type {}` | a new atom family with **no** relation to `uuid` |

## 5. Refinement `^`

`T ^ { … }` — copy `T`, tighten, keep IS-A. Only existing fields may appear; adding one is an error. The source, after following its reference chain, must be an entry with a `!record` body — a fresh/refined/composed record, an open record template, or (in a meta-schema) a constructor. For an *atom* refinement the source must be an atom-family **instance** — an entry whose body *is* an atom application (`integer` carrying `!integer_type {}`), not the constructor whose body is the vocabulary record describing one (`integer_type` carrying `!record { … }`). The test is on the body and nothing else: both are ATOM-kinded, and neither has supertypes. Not refinable: a top-level constructor application or sugar body (`{text => integer}`), a template instantiation, an alias to either, a choice. No removal clause on a refinement head.

State transitions:

```
From \ To          | REQUIRED | OPTIONAL | REQ_DEFAULT | REQ_FIXED | OPT_FIXED
REQUIRED           | ok       | error    | ok          | ok        | error
OPTIONAL           | ok       | ok       | ok          | ok        | ok
REQUIRED_DEFAULT   | error    | error    | ok (new default) | ok   | error
REQUIRED_FIXED     | error    | error    | error       | ok (same value) | error
OPTIONAL_FIXED     | error    | error    | error       | error     | ok (same value)
```

Per-facet tightening (applies to record refinement and atom refinement alike):

| Facet kind | Examples | Rule |
|---|---|---|
| ordered bound | `min`, `max`, `min_length`, `max_items`, `precision`, exclusive bounds | may only move inward |
| permission | `allow_nan`, `allow_infinity`, … | true → false only |
| member set | enum `members`, `within`/`excluding` lists | subset only (for `within`), superset for `excluding` |
| selector | `size`, `encoding`, `format`, `component` | may be set where the source left the default; thereafter restated only, never changed (`!int8 ^ { size: { bits: 16 } }` is an error) |
| fixed value | `= v` | FIXED rules above |

Body materialisation: the refined entry re-emits the whole inherited field set in source order, so resolver output is self-describing.

A refinement taking an OPTIONAL field to `= _` is the IS-A-preserving way to forbid a field.

## 6. Composition `&`

`A & B & { body }` — the trailing body is optional. Parents must contribute **disjoint** field names (a field reaching the result through two paths — even from one origin — is an error). Body entries matching an inherited field are tightenings (§5 rules, elided types allowed); others are new fields, appended after all inherited fields. Field order: parents left to right, each in declared order, tightened fields in place. Parents may carry arguments (`vip => <T> customer & box<T> & { … }`) — the open parameters must be re-declared. Operands are named references only; no inline forms before `&`. Constructor-ness is *not* something a body inherits: an entry is a constructor exactly when it IS-A `top`, and only a schema whose own `!!meta` names the meta-kernel may declare one.

## 7. Subtraction `-`

`head - { f1 f2 }` on a construction head (bare source, or `&` chain with or without body). Order: merge supertypes (disjointness still enforced — subtraction cannot mend a diamond), apply body, then remove. Rules: whitespace before `-` is mandatory (`account- {` absorbs the hyphen); removing an absent field is an error; removing a field the same body adds is an error; the body may not tighten a removed field; the removal set is non-empty by grammar; removing a group member shrinks the group (one survivor → plain field with the group's state; none → group gone). Result: `type_definition.supertypes` empty (not substitutable for the source), lineage kept in the body's `record.supertypes`.

`- { f }` removes; `f: T? = _` forbids while keeping the contract. Choose by whether substitutability matters.

## 8. Choice types and disjointness

`(A | B | …)`, two or more named variants, each a distinct type; no variant may resolve to `void`. Every choice records a derived `disjoint` fact — a `disjoint` field in the `!choice` body, discarded and recomputed on ingest — by **discrimination class**:

| Class | Types |
|---|---|
| boolean | `boolean` |
| number | every numeric family |
| string | `text` and refinements, `uuid`, `uri`, `email`, temporal, binary, network |
| brace | records, maps |
| bracket | arrays, tuples |

An enum's class is its members' shared class. `rational`, `complex`, `value`, `identifier`, nested choices, `scoped` instances (`extern`, `dynamic`, `declared`), unresolved references have **no** class and make the choice non-disjoint. Disjoint iff every variant has a class and none repeats. Value-set separation (disjoint ranges, patterns, enum members) does **not** count.

Data: a variant is selected with `!variant`. Tag optional only when disjoint; otherwise a missing tag is a validation error. Emitter rule: if two variants share a class, tag every value. `@disjoint` on the declaration asserts the derived fact and fails the load if false.

When the tag would be mandatory, prefer a single-group record (§9) — label discrimination needs no tag and permits same-typed alternatives.

## 9. Field groups

```
( a: T | b: U | c: V )
( a: T | b: U )?
```

The bare group is REQUIRED (exactly one member present); with `?` it is OPTIONAL (at most one).

Two or more members; members are `name: type` only (no `?`, no modifier); labels share the record's field namespace including inherited fields. Resolution flattens members into ordinary OPTIONAL fields plus a `groups` entry; validation counts present members after field validation. In `^`/`&` bodies members are tightened as ordinary fields (a refinement that makes two members of one group always present is an error); a restated group must keep members and order and may only go OPTIONAL→REQUIRED. Groups are not type-refs — `[( a: T | b: U )]` is not expressible; use an array of a named choice.

Labelled-sum idiom: a record whose entire body is one REQUIRED group, e.g. `event => { ( created: datetime | modified: datetime | accessed: datetime ) }`, instance `{ modified: "2026-05-21T13:05:00Z" }`.

## 10. Annotations in schemas

Annotations are types resolved **one hop** against the governing target — for a schema document, its `!!meta` target. Under `meta.tn`: `doc documentation` (through the kernel import) and `ordered bounded exact numeric disjoint deprecated since todo lang title examples read_only write_only discriminator rest`. Local declarations and `!!import`s do not contribute to the schema document's own annotation namespace; custom annotations for schema documents require an extended meta-schema (`extension-meta-schemas.md`).

For data documents governed by the schema, annotations resolve against the schema's namespace (locals + imports). Declare them:

```
expires  => @annotation text
internal => @annotation void
```

Usage in data: `@expires:"2026-12-31"`; `@internal` (bare — shorthand for `@internal:_`).

Schemas have no comment syntax; `@doc:"…"` is the way to annotate. The `;` used for commentary in the specification's listings is ABNF convention and a parse error in a real schema.

A bare annotation is valid only against a `void`-targeted type; a valued one only against a non-void type. Any type in the namespace can serve as an annotation; the `@annotation` marker is advisory. Placement: before the declaration name → entry metadata; after `=>` → definition metadata; before a field name → field metadata. All preserved in resolver output.

### Checked annotations: `@discriminator` and `@rest`

Beyond the documentary and the resolver-attached kinds there is a third: a **checked** annotation, honoured
at either declaration position and carrying a load-time check, on `@disjoint`'s verified-or-error precedent. The criterion for
putting something here rather than in the model: an annotation never changes a value, its type, or its
validity; it may add a load-time check, and it may direct how a *class* of encodings represents a value.
Force is confined to the encoding class that claims it — TSON text keeps `!variant` at every non-disjoint
choice regardless, and a discriminated choice admits exactly the variants it admitted.

`@discriminator: field_name` names the field a member-dispatching encoding selects a choice's variant on.
Checked at schema load, two outcomes and no third:

1. every variant is a record declaring the named field;
2. that field is REQUIRED_FIXED in every variant — never REQUIRED_DEFAULT, since a default is omissible and
   so cannot dispatch;
3. the fixed values are pairwise distinct.

`field_name` is an identifier, so a non-name spelling fails at the annotation's own type.

`@rest` (bare, on `void`) designates the map-typed field a flattening encoding puts a record's undeclared
entries in, a record being closed under its type. Checked: the field's type resolves to a text-keyed map,
and at most one field per composed chain carries the mark.

**The restated-field rule** these need either way: a restated field's annotations are the restatement's own,
in source order, followed by the inherited field's, in source order. A restatement **adds and never
removes**.

## 11. Namespaces — what a name means where

Two namespaces, consulted at different grammar positions:

- **Structure namespace** = the `!!meta` target's full closure (for `meta.tn` that is meta + kernel). Consulted only for `!C` application targets and the sugar desugar targets. This is where `enum`, `bytes_type`, `array`, `map`, `set_type`, `tuple`, `choice`, `scoped`, `integer_type`, `text_type`, … live. They are **not** usable as field types (`f: enum` is unresolved).
- **Type-name namespace** = parameters of the enclosing definition, then local declarations, then `!!import` entries in order. Consulted for every type reference: field types, arguments, variants, `&`/`^`/`-` operands, refinement sources (`!I ^` looks `I` up here).

Imports are transitive and the namespace is flat: one name means one thing across the closure; the same schema reached twice unifies; two *different* schemas declaring one name, or a local redeclaring an imported name, fail the load (no shadowing, no aliasing). Import cycles are errors; share types via a third schema or use a `scoped` position (`extern`, `extern_of<…>`).

Forward references within a schema are fine (two-pass resolution). A schema never resolves `!name` against its own definitions when used as *data* — only against its `!!schema` target.
