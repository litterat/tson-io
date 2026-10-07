# Declaration forms in depth

Part 2 §4–§5 and §6, condensed. The SKILL.md decision table picks the form; this file has the rules each form is checked against.

## Contents

1. Canonical form — what every declaration becomes
2. Records and field slots
3. Type expressions, synthetic entries, declared applications
4. Constructor application vs atom refinement
5. Refinement `^` — the three orders
6. Composition `&`
7. Subtraction `-`
8. Record extension (`abstract`, `final`) and sealed families (`=?`)
9. Choice types and disjointness
10. Field groups
11. Annotations in schemas — what an annotation may do
12. Namespaces — what a name means where

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

**Positional form.** When a constructor has exactly one field whose *name is unmarked* (whatever its modifier), the value after `!C` fills it directly: `!enum [true false]`, `!array text`. Fields whose name carries `?` never count — `bytes_type.encoding?` is *not* a positional slot, so write `!bytes_type { encoding: HEX }`, and an enum with a profile is `!enum { members: [...]  profile: TEXT }`. With zero or two-plus unmarked names, use braces.

**Bodies are closed.** Every member of a construction or refinement body must be a field the constructor declares; an unknown member is a resolver error. This is why `!integer ^ { minimum: 1 }` is refused rather than silently ignored.

**Top-level constructor applications are constructions**: `lookup => {text => integer}` and `lookup => !map { … }` are the same thing — a finished type with no supertypes, which cannot be refined further.

## 2. Records and field slots

A field answers three independent questions, one slot each — `name?: type? ~ default`, `name?: type? = fixed`, `name: type =?`:

1. **May the key be omitted?** `?` on the *name*. Unmarked, the key must be written.
2. **May a written value be `_`?** `?` on the *type* — the field is *voidable*, exactly as `?` means at an array element or map value.
3. **What may a written value be?** The modifier: none (free), `~ v` (default, injected on omission, overridable), `= v` (fixed — a written value must equal `v`), `=?` (selector, §8).

| Spelling | Key | `_` | Value | Omitted yields |
|---|---|---|---|---|
| `a: T` | written | refused | any | missing — validation error |
| `a?: T` | may be omitted | refused | any | absence |
| `a: T?` | written | admitted | any | missing |
| `a?: T?` | may be omitted | admitted | any | absence |
| `a?: T ~ v` | may be omitted | refused | any | `v` |
| `a?: T? ~ v` | may be omitted | admitted | any | `v` (and `_` means *none*) |
| `a?: T = v` | may be omitted | refused | `v` only | `v` |
| `a: T = v` | written | refused | `v` only | missing — a **marker** the document states (`"jsonrpc": "2.0"`) |
| `a?: void?` | may be omitted | admitted | none | absence |
| `a: void?` | written | admitted | none | missing |
| `a?: void` | may be omitted | refused | none | absence |

Refused, as rules: a default on an unmarked name (`a: T ~ v` — only omission reaches a default; write `a?: T ~ v`); a pin on a voidable type (`a: T? = v`, `a?: T? = v`); any modifier on a `void` field, and `_` as a modifier value (`~ _`, `= _` — the old `= _` is now `a?: void?`); `a: void` (no document satisfies the record). What omission yields is derived, never stored: unmarked → missing; marked with a value → injected; marked without → absent.

Resolved output stores four facts per `record_field`: `optional` (name's `?`), `voidable` (type's `?`), `role` (`FREE`/`DEFAULT`/`FIXED`) and `value`; defaults `false`/`false`/`FREE` are omitted.

**Which fields may carry a value:** only fields whose declared type, after following its reference chain, is an atom-family instance or an enum. Value modifiers are single scalar tokens; no arrays/records/maps, never `_`. Values are parsed by the field's type at schema load (eager) — a default that fails its own type is a load error.

**Encoders with the schema** must write an absent value as `_` at `a: T?` (omission is the missing-key error) and at `a?: T? ~ v` (omission reads back as the default). A marker `a: T = v` must always be written.

**Elided type-refs:** in a `^` or `&` body a tightening entry may omit the type — `port?: = 9090` — inheriting it from the source. Keep the name's `?` when restating an optional field: `port: = 9090` would also move it to required, making it a marker the document must write. In a fresh `{ … }` every field needs a type.

**Encoders** should write defaulted values out (a document that states its defaults reads without its schema); omitting a field equal to its default is a permitted optimisation.

**Inline prohibition.** Bare records (`{ name: text }`) and atom refinements (`!integer ^ { … }`) may appear only as a declaration's own body — never at a field type, group member, tuple element, array element, choice variant, type argument, or composition position. Container sugar carries no such restriction.

## 3. Type expressions and synthetic entries

One form per container, legal at every type position. Arrays: `[T]`, `[T; N]`, `[T; N..M]`, `[T; N..]`, `[T; ..M]`; bounds are non-negative decimal integers (or, in a template body, a value parameter). `[T; 0..]` is an error (write `[T]`); `[T; N..N]` is the same as `[T; N]` (prefer `N`). `min_items <= max_items` is checked at load (or at materialisation when parameter-bound).

Tuples need two or more positions; positions may be `?` (the slot is still mandatory — a short tuple is a validation error; write `_`). For trailing-optional semantics use `[T; 1..]`.

Maps: `{K => V}`, one entry only; key is a simple name (with optional `<args>`), never a paren/bracket/map form — declare a named key type or use `!map { key_type: … }`. `?` is legal on the value side only. No annotations inside the sugar braces.

Every inline sugar form **lifts** to a resolver-created synthetic entry (structurally keyed, so `[text]` written in ten places is one entry). Only a declaration's own body stays in place. This has one practical consequence: a *use site* never carries arguments in resolved output — `[box<text>]` and `grid<pixel, 3>` resolve to references to entries.

**A declaration naming an application is that application's entry.** `bx => box<text>` resolves to the closed instantiation itself, under `bx` — `source` the application, no minted `box_text_…` beside it, no `!reference` hop — and a use site writing `box<text>` elsewhere in the schema resolves to `bx`. Only an application no declaration names mints an internal entry. Two declarations naming one application are two entries. Minted names are never a consumer's key: bind generated code and configuration to the declared name.

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

`T ^ { … }` — copy `T`, tighten, keep IS-A. Only existing fields may appear; adding one is an error. The source, after following its reference chain, must be an entry with a `!record` body — a fresh/refined/composed record, an open record template, or (in a meta-schema) a constructor. For an *atom* refinement the source must be an atom-family **instance** — an entry whose body *is* an atom application (`integer` carrying `!integer_type {}`), not the constructor whose body is the vocabulary record describing one (`integer_type` carrying `!record { … }`). The test is on the body and nothing else: both are ATOM-kinded, and neither has supertypes. Not refinable: a top-level constructor application or sugar body (`{text => integer}`, `vector<text, 3>`), an alias to one, a choice, and a **FINAL** record (§8). A *record* template's instantiation closes to a `!record` and refines like any record. No removal clause on a refinement head.

Field facts move along three orders, and a restatement refines its source exactly when **no question moves backwards**:

- **omission** — absent (`a?: T`) → required (`a: T`) → injected (`a?: T ~ v` / `= v`);
- **voidable** — true (`T?`) → false (`T`);
- **role** — FREE → DEFAULT → FIXED.

So `a: T` → `a?: T ~ v` is fine (required → injected); `a?: T ~ v` → `a: T` is refused (a default is not removable); `a?: T?` → `a?: T` and `a?: T` → `a: T` are fine, each reverse refused. `a?: T? ~ v` reaches a pin only as `a?: T = v`, since a pin on a voidable type is refused. A marker `a: T = v` may be relaxed by a subtype to `a?: T = v`. A restatement may change a **default**, never a **pin**.

Per-facet tightening (applies to record refinement and atom refinement alike):

| Facet kind | Examples | Rule |
|---|---|---|
| ordered bound | `min`, `max`, `min_length`, `max_items`, `precision`, exclusive bounds | may only move inward |
| permission | `allow_nan`, `allow_infinity`, … | true → false only |
| member set | enum `members`, `within`/`excluding` lists | subset only (for `within`), superset for `excluding` |
| settable once | `text_type.pattern`, `text_type.members`, enum `profile` (`IDENTIFIER` inside `TEXT`) | set where the source left it unset, or restated verbatim; never changed |
| selector | `size`, `encoding`, `format`, `component` | may be set where the source left the default; thereafter restated only, never changed (`!int8 ^ { size: { bits: 16 } }` is an error) |
| fixed value | `= v` | a pin never changes; a written value is compared as a value |

Body materialisation: the refined entry re-emits the whole inherited field set in source order, so resolver output is self-describing.

Narrowing a voidable field to `void` — `a?: void?` — is the IS-A-preserving way to forbid a field's value while keeping it in the contract.

## 6. Composition `&`

`A & B & { body }` — the trailing body is optional. Parents must contribute **disjoint** field names (a field reaching the result through two paths — even from one origin — is an error). Body entries matching an inherited field are tightenings (§5 rules, elided types allowed); others are new fields, appended after all inherited fields. Field order: parents left to right, each in declared order, tightened fields in place. Parents may carry arguments (`ok => <T> result<T> & { note: text }`) — the open parameters must be re-declared, and `record.supertypes` holds the application, so `ok<text>` is IS-A `result<text>`, not `result<int32>`. An application at an operand mints no entry. Operands are named references only; no inline forms before `&`. Composing onto a **FINAL** parent is a resolver error. A restated **group member** stays a member and takes no name mark. Constructor-ness is *not* something a body inherits: an entry is a constructor exactly when it IS-A `top`, and only a schema whose own `!!meta` names the meta-kernel may declare one.

## 7. Subtraction `-`

`head - { f1 f2 }` on a construction head (bare source, or `&` chain with or without body). Order: merge supertypes (disjointness still enforced — subtraction cannot mend a diamond), apply body, then remove. Rules: whitespace before `-` is mandatory (`account- {` absorbs the hyphen); removing an absent field is an error; removing a field the same body adds is an error; the body may not tighten a removed field; the removal set is non-empty by grammar; removing a group member shrinks the group (one survivor → plain field with the group's state; none → group gone). Result: `type_definition.supertypes` empty (not substitutable for the source), lineage kept in the body's `record.supertypes`.

`- { f }` removes; `f?: void?` forbids the value while keeping the contract. Choose by whether substitutability matters. Subtraction is admissible on a **FINAL** record — it mints no IS-A edge, which is all FINAL constrains.

## 8. Record extension and sealed families

A record may carry one **definition mark** between `=>` and its body (before a template's `<…>`):

```
pet     => abstract { name: text  age: integer }
dog     => pet & { breed: text }
leaf    => final { id: uuid  payload: bytes }
```

- **OPEN** (no mark, the default) — direct instances; anything may compose onto or refine it.
- **ABSTRACT** — no direct instances. A position typed by it admits exactly its subtypes, and the tag is **required** there (`!dog { … }`); a tag naming the base itself is refused.
- **FINAL** — direct instances, no subtypes: `&` or `^` naming it is a resolver error, here or in any importing schema. `-` stays admissible.

The mark is never inherited (`dog` is OPEN), and it lowers into the kernel's `record.extension`. An abstract base with no subtype in its own schema is legal — importers supply members.

**The selector `=?`** makes a *discriminated* family, where a value is placed by a field it carries rather than by a tag (OpenAPI's `discriminator`, a sealed interface):

```
pet => abstract { pet_type: text =?  name: text }
dog => pet & { pet_type: = "dog"  breed: text }
cat => pet & { pet_type: = "cat"  indoor: boolean }
```

`=?` reads *pinned, but not here — the members pin it*, and implies ABSTRACT (`abstract` beside it is allowed; `final` is refused). Checked at load:

1. the marked field is typed by an atom-family instance or an enum, its name unmarked, its type not voidable, not a group member, and it carries no value;
2. every subtype, transitively, restates it FIXED (`pet_type: = "dog"` or `pet_type?: = "dog"`);
3. the pins are pairwise distinct **as values** (`= 255` and `= 0xFF` collide) — as tuples, in declaration order, where several fields are marked.

At a position typed `pet`, data is placed by reading `pet_type` and matching the pins; the tag becomes optional and, if written, must agree. A family discriminates one level. The marked fields lower into `record.discriminators`. The base cannot pin the field itself — a pin never changes, so no member could then pin its own.

A **record-bodied template** may also stand at a type position as a family base (`payload: result`): it is ABSTRACT by derivation, its members are its applications, and a field pinned to a value parameter is a selector (`pet => <N, T> { type: text = N  pet: T }`); a selector's declared type may not mention a type parameter. `final` on a template is refused. A mark written on a template applies to its *applications*: `result => abstract <T> { payload: T }` makes `result<text>` an abstract base for `ok<text>` and `err<text>`. Reference, container, constructor-application and atom templates are never bases.

## 9. Choice types and disjointness

`(A | B | …)`, two or more named variants, each a distinct type; no variant may resolve to `void`. Every choice records a derived `disjoint` fact — a `disjoint` field in the `!choice` body, discarded and recomputed on ingest — by **discrimination class**:

| Class | Types |
|---|---|
| boolean | `boolean` |
| number | every numeric family |
| string | `text` and refinements, `uuid`, `uri`, `email`, temporal, binary, network |
| brace | records, maps |
| bracket | arrays, tuples |

An `IDENTIFIER` enum's class is its members' shared class; a `TEXT` enum is string-class. `rational`, `complex`, `value`, `identifier`, **a float still admitting NaN or infinity** (core's `float32`/`float64` as declared), **a map whose key is not an atom or enum**, nested choices, `scoped` instances (`extern`, `dynamic`, `declared`), unresolved references have **no** class and make the choice non-disjoint. So `( float64 | text )` needs tags unless the float narrows `allow_nan` and `allow_infinity` to false — the same in every encoding. Disjoint iff every variant has a class and none repeats. Value-set separation (disjoint ranges, patterns, enum members) does **not** count.

Data: a variant is selected with `!variant`. Tag optional only when disjoint; otherwise a missing tag is a validation error. Emitter rule: if two variants share a class, tag every value. `@disjoint` on the declaration asserts the derived fact and fails the load if false.

When the tag would be mandatory, prefer a single-group record (§10) — label discrimination needs no tag and permits same-typed alternatives. A choice has **no discriminator field**: for records told apart by a member they carry, type the position by an abstract base with a `=?` selector (§8) instead of a choice over the members.

## 10. Field groups

```
( a: T | b: U | c: V )
( a: T | b: U )?
```

The bare group is REQUIRED (exactly one member present); with `?` it is OPTIONAL (at most one).

Two or more members; members are `name: type` or `name: type?` — no `?` on the name and no modifier, since the group answers omission and never injects. A voidable member written `_` is present and selects its alternative. Labels share the record's field namespace including inherited fields. Resolution flattens members into fields with `optional: true` plus a `groups` entry; validation counts present members after field validation. In `^`/`&` bodies a restated member stays a member: no name mark; its type may go voidable → not or narrow (`a: void?` forbids that alternative's value); it may take `= v` (checked, never injected), never `~ v`, never `=?`. A restated group must keep members and order and may only go OPTIONAL→REQUIRED. Groups are not type-refs — `[( a: T | b: U )]` is not expressible; use an array of a named choice.

Labelled-sum idiom: a record whose entire body is one REQUIRED group, e.g. `event => { ( created: datetime | modified: datetime | accessed: datetime ) }`, instance `{ modified: "2026-05-21T13:05:00Z" }`.

## 11. Annotations in schemas

Annotations are types resolved **one hop** against the governing target — for a schema document, its `!!meta` target. Under `meta.tn`: `doc documentation` (through the kernel import) and `ordered bounded exact numeric disjoint deprecated since todo lang title examples read_only write_only`. Local declarations and `!!import`s do not contribute to the schema document's own annotation namespace; custom annotations for schema documents require an extended meta-schema (`extension-meta-schemas.md`).

For data documents governed by the schema, annotations resolve against the schema's namespace (locals + imports). Declare them:

```
expires  => @annotation text
internal => @annotation void
```

Usage in data: `@expires:"2026-12-31"`; `@internal` (bare — shorthand for `@internal:_`).

Schemas have no comment syntax; `@doc:"…"` is the way to annotate. The `;` used for commentary in the specification's listings is ABNF convention and a parse error in a real schema.

A bare annotation is valid only against a `void`-targeted type; a valued one only against a non-void type. Any type in the namespace can serve as an annotation; the `@annotation` marker is advisory. Placement: before the declaration name → entry metadata; after `=>` → definition metadata; before a field name → field metadata. All preserved in resolver output.

### What an annotation may do

An annotation never changes a value, its type, or its validity — a schema with every annotation erased
admits exactly the same values. Within that it may carry a **load-time check** (`@disjoint`, verified
against the derived fact or the load fails — the one checked annotation), or be a representation directive
for a named class of encodings (none is declared). Facts that *do* change what conforms are grammar, not
annotations: `abstract`/`final` and `=?` (§8). So `@discriminator`, `@rest`, `@abstract`, `@final` and
`@sealed` are unresolved-name errors under `meta.tn`, and a record is closed with no exception — open-ended
data goes in a map-typed field (`extras?: {text => dynamic}`).

**The restated-field rule:** a restated field's annotations are the restatement's own, in source order,
followed by the inherited field's, in source order. A restatement **adds and never removes**.

## 12. Namespaces — what a name means where

Two namespaces, consulted at different grammar positions:

- **Structure namespace** = the `!!meta` target's full closure (for `meta.tn` that is meta + kernel). Consulted only for `!C` application targets and the sugar desugar targets. This is where `enum`, `bytes_type`, `array`, `map`, `set_type`, `tuple`, `choice`, `scoped`, `integer_type`, `text_type`, … live. They are **not** usable as field types (`f: enum` is unresolved).
- **Type-name namespace** = parameters of the enclosing definition, then local declarations, then `!!import` entries in order. Consulted for every type reference: field types, arguments, variants, `&`/`^`/`-` operands, refinement sources (`!I ^` looks `I` up here).

Imports are transitive and the namespace is flat: one name means one thing across the closure; the same schema reached twice unifies; two *different* schemas declaring one name, or a local redeclaring an imported name, fail the load (no shadowing, no aliasing). Import cycles are errors; share types via a third schema or use a `scoped` position (`extern`, `extern_of<…>`).

Forward references within a schema are fine (two-pass resolution). A schema never resolves `!name` against its own definitions when used as *data* — only against its `!!schema` target.
