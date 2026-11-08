# Declaration forms in depth

Part 2 §3–§6 and §8.3, condensed. The SKILL.md decision table picks the form; this file has the rules each form is checked against.

## Contents

1. Canonical form — what every declaration becomes
2. Records, field slots, name types and dependent fields
3. Type expressions, synthetic entries, declared applications
4. Constructor application, value entries, and value refinement
5. Refinement `^` — the three orders
6. Composition `&`
7. Subtraction `-`
8. Record extension (`abstract`, `final`) and sealed families (`=?`)
9. Choice types and disjointness
10. Field groups
11. Annotations in schemas — what an annotation may do
12. One namespace — what a name means where

---

## 1. Canonical form

**An entry is its value.** Every closed declaration resolves to `!C { bindings }` — a constructor applied to a record of its own fields — with no wrapper around it: `person => !meta.record { fields: { … } }`, `id => !meta.alias { target: uuid }`. A type's value carries `chain: { parents? supertypes? subtypes? }`, its IS-A order, computed by the resolver and never written by a declaration (`!meta.record { chain: … }` in source is a resolver error); an empty chain is omitted. A kind is derived from the value's tag and chain, never recorded. (An *open* entry is a `!meta.record_template` or a `!meta.template`; see `templates.md`.) Sugar desugars, its targets the kernel's entries by path whatever the document imports:

| Source | Canonical |
|---|---|
| `{ a: text }` | `!meta.record { fields: { a => !meta.record_field { type: text } } }` — `fields` is a map from name to field |
| `[T]` | `!meta.array { element_type: T }` |
| `[T; N]` | `!meta.array { element_type: T  min_items: N  max_items: N }` |
| `[T; N..M]`, `[T; N..]`, `[T; ..M]` | `min_items`/`max_items` as given |
| `[T?]` | `voidable: true` on the array |
| `(A \| B)` | `!meta.choice { variants: [A B]  disjoint: … }` — the resolver always writes `disjoint` |
| `{K => V}` | `!meta.map { key_type: K  value_type: V }` |
| `[T, U?]` | `!meta.tuple { elements: [ { element_type: T } { element_type: U  voidable: true } ] }` |
| `set<T>` | `!meta.set_type { element_type: T }`, through the kernel's root template `set` |
| `!enum [a b]` | `!meta.enum_type { members: [a b] }` — `name_type` pinned to `meta.identifier` by `enum` |
| `!integer ^ { min: 0 }` | `!numeric.integer_type { chain: { supertypes: [integer] }  min: 0 }` |
| `employee => person & { dept: text }` | `!meta.record { chain: { supertypes: [person] }  fields: { name => … dept => … } }` — flattened |
| `!int8 ^ { min: 0 }` | `!numeric.integer_type { chain: { supertypes: [int8 integer] }  size: { bits: 8  signed: true }  min: 0 }` — inherited facets survive |
| `name => T` | `!meta.alias { target: T }` — a hop, kept as written |

**Positional form.** When a constructor has exactly one field whose *name is unmarked* (whatever its modifier), the value after `!C` fills it directly: `!enum [true false]`, `!meta.array text`. Fields whose name carries `?` never count — `binary.bytes_type.encoding?` is *not* a positional slot, so write `!binary.bytes_type { encoding: HEX }`. `enum` pins `name_type?: = meta.identifier`, which leaves `members` the one unmarked field; the general `!meta.enum_type { name_type: kebab  members: [...] }` has two and needs braces. `meta.record_field` has one (`type`), so the explicit record form may write `fields: { x => text }` for `fields: { x => { type: text } }`. In a schema document a bare token fills a positional field only where that field is atom-typed; at a record whose positional field is a record or a choice, write the braces.

**Bodies are closed.** Every member of a construction or refinement body must be a field the constructor declares; an unknown member is a resolver error. This is why `!integer ^ { minimum: 1 }` is refused rather than silently ignored.

**Top-level constructor applications are constructions**: `lookup => {text => integer}` and `lookup => !meta.map { … }` are the same thing — a finished type with no supertypes, which cannot be refined further.

**The explicit record form** is the brace form spelled out: `person => !meta.record { fields: { name => { type: text }  nick => { type: text  optional: true } } }` is `{ name: text  nick?: text }`. It is rarely worth writing, except to state a record's `name_type` (§2).

## 2. Records and field slots

A field answers three independent questions, one slot each — `name?: type? ~ default`, `name?: type? = fixed`, `name: type =?`:

1. **May the key be omitted?** `?` on the *name*. Unmarked, the key must be written.
2. **May a written value be `_`?** `?` on the *type* — the field is *voidable*, exactly as `?` means at an array element or map value.
3. **What may a written value be?** The modifier: none (free), `~ v` (default, injected on omission, overridable), `= v` (fixed — a written value must equal `v`), `=?` (selector, §8).

| Spelling | Key | `_` | Value | A missing key yields |
|---|---|---|---|---|
| `a: T` | written | refused | any | — (a validation error) |
| `a?: T` | may be omitted | refused | any | nothing |
| `a: T?` | written | admitted | any | — (an error) |
| `a?: T?` | may be omitted | admitted | any | nothing |
| `a?: T ~ v` | may be omitted | refused | any | `v` |
| `a?: T? ~ v` | may be omitted | admitted | any | `v` (and `_` is void) |
| `a?: T = v` | may be omitted | refused | `v` only | `v` |
| `a: T = v` | written | refused | `v` only | — (an error): a **marker** the document states (`"jsonrpc": "2.0"`) |
| `a?: void?` | may be omitted | admitted | none | nothing |
| `a: void?` | written | admitted | none | — (an error) |
| `a?: void` | may be omitted | refused | none | nothing |

Refused, as rules: a default on an unmarked name (`a: T ~ v` — only omission reaches a default; write `a?: T ~ v`); a pin on a voidable type (`a: T? = v`, `a?: T? = v`); any modifier on a `void` field, and `_` as a modifier value (`~ _`, `= _` — write `a?: void?`); `a: void` (no document satisfies the record). What a missing key yields is derived, never stored: unmarked → the missing-field error; marked with a value → the value, injected; marked without → nothing, the field stays missing.

Resolved output keys each field by its name in the record's `fields` map and stores its `type` and four facts per `meta.record_field`: `optional` (name's `?`), `voidable` (type's `?`), `role` (`FREE`/`DEFAULT`/`FIXED`) and `value`; defaults `false`/`false`/`FREE` are omitted. `value` is itself a dependent field (`value?: type!`), read against the type the field's own `type` names.

**Which fields may carry a value:** only fields whose declared type, after following its alias chain, is an atom-family instance or an enum (a reference among them). Value modifiers are single scalar tokens; no arrays/records/maps, never `_`. Values are read by the field's own type at schema load — a default that fails its type is a load error. At a field typed by a reference naming values (`handler?: meta.ref<method> ~ orders.place_order`) the token is a qualified name, judged at link. In a template body the value may be a parameter, and **the name's mark is the author's, as beside a literal**: `a?: T ~ N` is a default, `a?: T = N` an injected pin, `a: T = N` a marker, and `a: T ~ N` is refused.

**Encoders with the schema** must write a void value as `_` at `a: T?` (omission is the missing-key error) and at `a?: T? ~ v` (omission reads back as the default). A marker `a: T = v` must always be written. Otherwise encoders should write defaulted values out (a document that states its defaults reads without its schema); omitting a field equal to its default is a permitted optimisation.

**Elided types:** in a `^` or `&` body a tightening entry may omit the type — `port?: = 9090` — inheriting it from the source. Keep the name's `?` when restating an optional field: `port: = 9090` would also move it to required, making it a marker the document must write. In a fresh `{ … }` every field needs a type.

### Field names and the name type

A record's field names are values of its **name type**, `meta.record.name_type` — an identifier family, by default the kernel's `meta.field_name` (`meta.identifier`), the same slot an enum has for its members. A declared field name is any single-line token, quoted where it is no identifier, and is judged when the schema links: under the default `{ "first name": text }` is a resolver error (*field name 'first name' is not an identifier*), not a parse error. A schema translated from JSON-LD, JSON Schema or OpenAPI, whose members are `@id`, `$ref`, `@context`, declares the profile its names need **once, on a fieldless abstract base**, and its records compose it — the brace form has no syntax of its own for a name type:

```
json_name   => !unicode.identifier_type { start_add: "@$" }
json_record => !meta.record { name_type: json_name  extension: ABSTRACT  fields: {} }
node        => json_record & { "@id": text  "@type": text  label: text }
```

- **One name type, inherited.** A record with supertypes takes theirs; supertypes with different name types do not compose — `json_record & address`, where `address` states none and so has `meta.field_name`, is a resolver error. Declare the record over the same type, `address => json_record & { city: text }`. A refinement keeps its source's (`node ^ { "@id": = "n1" }`).
- **Its form implies NFC.** A document's names are matched in the name type's `normalization`: under `http_name => !unicode.identifier_type { start: ASCII  continue: ASCII  medial: "-"  normalization: ASCII_CASEFOLD }`, `Content-Type` in a document is the field `content-type`, and both spellings in one record are a duplicate. `NONE` is refused at load; `ASCII_CASEFOLD` only over a profile whose every character is ASCII.
- **The schema's own references match exactly.** A group member, a restated or removed field, a sibling reference and a `discriminators` entry name a field by its declared spelling, under a folding type too.
- **A document's names are judged by the record that reads them**: a name it does not declare is an unrecognised field (a validation error), and a record nested in a relaxed one judges its own names. Hygiene runs under the name type's profile.
- **When to use it**: the names are given by a vocabulary, a protocol or a system of record. Never for keys — a key that is no name (`""`, a leading space) belongs in a map.

### Dependent fields

A field's type may be a **sibling reference** — `kind!`, a field name with an adjacent `!` followed by whitespace — naming an earlier field of the same record whose *value* names the type this field is read against, instance by instance:

```
setting => { kind: meta.type_ref  value?: kind! }
cell    => { of: meta.ref<meta.atom>  v: of! }
```

`{ kind: int32  value: 7 }` reads `7` as an `int32`; `{ kind: int32  value: seven }` is a validation error at `value`. Checked at the declaration, against the flattened record, each a resolver error:

- **Position**: only at a record field's type (the slot typed `meta.field_type_ref`) — refused as an alias target, refinement source, operand, array element (`[kind!]`), map key or value, tuple element, choice variant or template argument. A field whose name needs quoting cannot be a sibling.
- **The sibling is declared before** the dependent field — inherited fields come first, so a base's sibling serves a subtype's dependent field.
- **The sibling names a type**: typed by a reference whose `of` is a constructor or `meta.top`, past its alias hops (`meta.type_ref`, `meta.field_type_ref`, `meta.ref<C>` over a constructor, a refinement of one). `int32`, a reference naming values (`meta.ref<method>`) and another dependent field are refused. There is no path through a value (`exchange!.request` is not grammar).
- **The sibling is there whenever the dependent field is**: required, defaulted, pinned, or a member of a field group with the dependent field optional. Optional with no default, or voidable, is refused.
- **Its pin or default names a type a value can be read against** — not a template.
- **The dependent field** is never voidable, carries no default or pin, and is restated only as itself (a refinement may make it required; pinning the sibling is what fixes its type).
- A sibling may be a discriminator; removing a sibling (§7) must remove its dependent field too.

In data the type is known from a pinned sibling, a discriminator, or a free sibling written **before** the dependent field (or its default): a dependent field written before a free sibling with no default is a validation error. In a schema document, a dependent field in a value entry holds its value as written and is judged when the schema links.

**Inline prohibition.** Bare records (`{ name: text }`) and atom refinements or constructor applications (`!integer ^ { … }`, `!enum [A B]`) may appear only as a declaration's own body — never at a field type, group member, tuple element, array element, choice variant, type argument, or composition position. Container sugar carries no such restriction.

## 3. Type expressions and synthetic entries

One form per container, legal at every type position. Arrays: `[T]`, `[T; N]`, `[T; N..M]`, `[T; N..]`, `[T; ..M]`; bounds are non-negative decimal integers (or, in a template body, a value parameter). `[T; 0..]` is an error (write `[T]`); `[T; N..N]` is the same as `[T; N]` (prefer `N`). `min_items <= max_items` is checked at load (or at materialisation when parameter-bound). A count facet admits any `numeric.count` (0 to 2⁶³−1).

Tuples need two or more positions; a position may be voidable, `T?` (the slot is still mandatory — a short tuple is a validation error; write `_`). For a tail that may be left off use `[T; 1..]`. A one-position tuple has no bracket spelling (`[T]` is an array): the kernel's `meta.tuple1<T>` admits `[a]`, and `meta.voidable_tuple1<T>` admits `[a]` and `[_]`.

Maps: `{K => V}`, one entry only; key is a qualified name (with optional `<args>`), never a paren/bracket/map form — declare a named key type or use `!meta.map { key_type: … }`. `?` is legal on the value side only. No annotations inside the sugar braces. A map is unordered unless it says otherwise; `!meta.map { key_type: K  value_type: V  ordered: true }` makes entry order part of its value. Sets (`set<T>`) may be empty; a non-empty one is a named `!meta.set_type { element_type: T  min_items: 1 }`.

Every inline sugar form **lifts** to a resolver-created synthetic entry (structurally keyed, so `[text]` written in ten places is one entry, minted at the document's root even when written inside a nested map). Only a declaration's own body stays in place. This has one practical consequence: a *use site* never carries arguments in resolved output — `[box<text>]` and `grid<pixel, 3>` resolve to references to entries.

**A declaration naming an application is that application's entry.** `bx => box<text>` resolves to the closed instantiation itself, under `bx` — `@meta.application:box<text>` on its key, no minted `box_text_…` beside it, no alias hop — and a use site writing `box<text>` elsewhere in the schema resolves to `bx`. **An application nothing declares is its expansion**: the closed synthetic entry its substituted form lands on, keyed on content, the same entry any other spelling of that form lands on — no instantiation entry is minted (a self-reaching one such as `tree<text>` excepted, `templates.md`). Two declarations naming one application are two entries. Minted names are never a consumer's key: bind generated code and configuration to the declared name. **A minted record is a member of nothing.** An application at a use site whose result would compose onto a *declared* record would be a member of that record's family, so it is a resolver error (`k: dog_of<text>` over `dog_of => <T> pet & { … }`; declare `dogs => dog_of<text>`). A parent application nothing declares gives the minted record no edge at all. An application of a record template written at a use site is a type read where it stands, and no member of the template's family.

## 4. Constructor application, value entries, and value refinement

`!T value` is always **an instance of `T`**, in a schema as in data; what the entry *is* follows from `T`:

- **`T` a constructor** — `meta.top` or an entry that IS-A it, not abstract (so not `meta.top`, `meta.type`, `meta.atom`, `meta.product`, `meta.sum`): `enum`, `meta.enum_type`, `meta.array`, `meta.map`, `meta.set_type`, `meta.tuple`, `meta.choice`, `meta.namespace`, `meta.alias`, `numeric.integer_type`, `unicode.text_type`, `binary.bytes_type`, `net.uuid_type`, a constructor the schema declares itself… The entry is a **type**. Construction transfers kind only; no IS-A. Founding a new family with an atom constructor is legal but rarely what you want. An alias of a constructor is applied as its target is (`my_enum => enum`, then `!my_enum [A B]`).
- **`T` an ordinary type** — a record, a namespace type: the entry is a **value entry**, read against `T` as data is (`orders => !interface { … }`, `create_order => !operation { … }`). Nothing can be typed by it, no reference over a constructor admits it, and a `meta.ref<T>` slot names it (§12). A value body lifts and mints nothing: a reference slot in it holds one bare name, never a `{ … }` record or an application (name the application with an alias, `bt => box<text>`).
- **`!schema { … }`** (or `!meta.schema { … }`) as an entry is a **nested schema map**: its members are entries named by path (`geo.address`), §12.

`!I ^ { values }` — **value refinement**. `I` must be, past its alias chain, a value whose type states refinement rules: an atom-family **instance** (`integer`, `text`, `int8`, `date`, a refined atom of your own) or one of the kernel's reference instances (`meta.type_ref`) — never a constructor, whose body is the vocabulary record describing one (`numeric.integer_type` carries `!meta.record { … }`, and is refined with the record form, `numeric.integer_type ^ { … }`). Establishes IS-A `I`; facets merge over `I`'s. The body is data (`size: { bits: 8  signed: true }` binds a nested value); a bare value, a second `!`, an annotation, or a map in body position is a parse error. A container instance and a namespace value are finished: `^` on them is refused.

Kind determination: the constructor's base kind (`meta.atom`, `meta.product`, `meta.sum`) reached through its chain; none → PRODUCT; two → error. `!C {}` inherits it.

Category errors in data mirror this: `!numeric.integer_type 42` and `!age { min: 0 }` are both type errors — constructors type constraint records, instances type scalars.

### The three spellings of "like `uuid`"

| Spelling | Example | What it buys |
|---|---|---|
| alias | `id => uuid` | one type under two names; a hop, resolved but not rewritten |
| refinement | `id => !uuid ^ {}` | a **new** type that IS-A `uuid` — the empty refinement is legal and is the nominal-subtype spelling |
| fresh instance | `id => !net.uuid_type {}` | a new atom family with **no** relation to `uuid` |

## 5. Refinement `^`

`T ^ { … }` — copy `T`, tighten, keep IS-A. Only existing fields may appear; adding one is an error. The source, after following its alias chain, must be an entry with a `!meta.record` body — a fresh/refined/composed record, an *applied* record template (`box<text> ^ { … }`; a record template named bare is refused), or a constructor (a constructor is a record: `code_type => unicode.text_type ^ { max_length?: = 4 }` is a narrower constructor). Not refinable: a top-level constructor application or sugar body (`{text => integer}`, `vector<text, 3>`), an alias to one, a choice, a value entry, and a **FINAL** record (§8). No removal clause on a refinement head.

Field facts move along three orders, and a restatement refines its source exactly when **no question moves backwards**:

- **omission** — nothing (`a?: T`) → required (`a: T`) → injected (`a?: T ~ v` / `= v`);
- **voidable** — true (`T?`) → false (`T`);
- **role** — FREE → DEFAULT → FIXED.

So `a: T` → `a?: T ~ v` is fine (required → injected); `a?: T ~ v` → `a: T` is refused (a default is not removable); `a?: T?` → `a?: T` and `a?: T` → `a: T` are fine, each reverse refused. `a?: T? ~ v` reaches a pin only as `a?: T = v`, since a pin on a voidable type is refused. A marker `a: T = v` may be relaxed by a subtype to `a?: T = v`. A restatement may change a **default**, never a **pin**. A restated field's type must be the inherited type or IS-A it (or `void` at a voidable position) — `[int8]` restating `[int32]` is refused, no IS-A edge joining them.

Per-facet tightening (applies to record refinement and value refinement alike):

| Facet kind | Examples | Rule |
|---|---|---|
| ordered bound | `min`, `max`, `min_length`, `max_items`, `precision`, exclusive bounds | may only move inward |
| step | `multiple_of` | strictly positive; tightens only to an integer multiple (`15` under `5`) |
| permission | `allow_nan`, `allow_infinity`, …, `allow_relative`, `allow_fragment`, `allow_idn`, `allow_parameters`, `allow_sibling` | true → false only (`allow_parameters` is withheld by default, so only a fresh instance grants it) |
| member set | enum `members`, numeric `members`, a URI's or IRI's `schemes`, a media type's `types` and `suffixes` | subset only, compared by the family's value identity |
| settable once | `unicode.text_type.pattern`, `unicode.text_type.members` | set where the source left it unset, or restated verbatim; never changed |
| fixed at construction | `normalization`, the identifier profile facets (`start`, `continue`, `start_add`, `continue_add`, `medial`, `exclude`), an enum's or a record's `name_type` | pinned where the type is constructed; a refinement restates it or leaves it alone, never sets or moves it — a different one is a fresh `!constructor { … }` |
| selector | `size`, `component`, `format`, `encoding` | only along the family's own narrowing relation: a width chain for `size` (`!int8 ^ { size: { bits: 16 } }` widens and fails), a partial order for `component`; `encoding` never moves |
| reference `of` | `!meta.type_ref ^ { of: unicode.identifier_type }` | narrows to a type IS-A the source's |
| fixed value | `= v` | a pin never changes; a written value is compared as a value |

Every facet value is read by its declared type at load — a bound on `numeric.decimal_type` is a `number`, on `temporal.date_type` a `date` (`type-families.md`) — so a value the family refuses is a resolver error before any tightening rule is consulted.

Body materialisation: the refined entry re-emits the whole inherited field set in source order, so resolver output is self-describing.

Narrowing a voidable field to `void` — `a?: void?` — is the IS-A-preserving way to forbid a field's value while keeping it in the contract.

## 6. Composition `&`

`A & B & { body }` — the trailing body is optional. Parents must contribute **disjoint** field names (a field reaching the result through two paths — even from one origin — is an error). Body entries matching an inherited field are tightenings (§5 rules, elided types allowed); others are new fields, appended after all inherited fields. Field order: parents left to right, each in declared order, tightened fields in place. Parents may carry arguments (`ok => <T> result<T> & { note: text }`) — the open parameters must be re-declared, and the template's `chain.parents` holds the application, so `ok<text>` is IS-A `result<text>`, not `result<int32>`. An application at an operand mints no entry. Operands are named references only; no inline forms before `&`, no parameter (`<T> T & { … }` is a resolver error), and no bare record template. Composing onto a **FINAL** parent is a resolver error, and so is composing parents with different name types (§2). A restated **group member** stays a member, in its own option; a `?` on its name is the in-option mark, which a restatement may drop and may not add.

**Constructorness is inherited through composition**: an entry composing with something IS-A `meta.top` — `meta.atom`, `unicode.text_type` — is a constructor, in any schema whose closure holds the kernel. A record mixin such as `atom.specification` lends vocabulary without conferring it, and `box => <T> base & { value: T }` over a plain record is an ordinary template. A constructor composing a base kind directly declares a new *form*, which a processor must back with a reader; prefer refining or composing one it already backs (`extension-meta-schemas.md`).

A restated field's annotations are the restatement's own, in source order, followed by the inherited field's — a restatement adds and never removes.

## 7. Subtraction `-`

`head - { f1 f2 }` on a construction head (bare source, or `&` chain with or without body). Order: merge supertypes (disjointness still enforced — subtraction cannot mend a diamond), apply body, then remove. Rules: whitespace before `-` is mandatory (`account- {` absorbs the hyphen); removing a nonexistent field is an error; removing a field the same body adds is an error; the body may not tighten a removed field; the removal set is non-empty by grammar; removing a dependent field's sibling must remove the dependent field too; removing a group member takes it out of its option, an emptied option leaves the group, and a group the declaration rules would then refuse is rewritten as the spelling it equals (a lone one-member option dissolves into a plain field taking the group's `optional` as its name's mark). Result: a record with an empty chain — not substitutable for the source, and nothing records what it was subtracted from. A subtraction headed by a constructor is no longer one.

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

The mark is never inherited (`dog` is OPEN), and it lowers into the kernel's `meta.record.extension`. An abstract base with no subtype in its own schema is legal — importers supply members.

**The selector `=?`** makes a *discriminated* family, where a value is placed by a field it carries rather than by a tag (OpenAPI's `discriminator`, a sealed interface):

```
pet => abstract { pet_type: text =?  name: text }
dog => pet & { pet_type: = "dog"  breed: text }
cat => pet & { pet_type: = "cat"  indoor: boolean }
```

`=?` reads *pinned, but not here — the members pin it*, and implies ABSTRACT (`abstract` beside it is allowed; `final` is refused). Checked at load:

1. the marked field is typed by an atom-family instance or an enum, its name unmarked, its type not voidable, not a group member, not a dependent field (it may be a dependent field's sibling), and it carries no value;
2. every subtype, transitively, restates it FIXED (`pet_type: = "dog"` or `pet_type?: = "dog"`);
3. the pins are pairwise distinct **as values** (`= 255` and `= 0xFF` collide; text pins compare in the field type's normalization form) — as tuples, in declaration order, where several fields are marked.

**A family is judged over the closure that holds it.** An importing schema may add members; one that adds a member failing to pin, or colliding with an imported one — or that merely imports two schemas whose members collide — is refused, in the importing schema, with both origins named.

At a position typed `pet`, data is placed by reading `pet_type` and matching the pins; the tag becomes optional and, if written, must agree. A family discriminates one level. The marked fields lower into `meta.record.discriminators`, which is non-empty when present: present means the members are selected by those fields, absent means by the tag. The base cannot pin the field itself — a pin never changes, so no member could then pin its own.

A **record template** may also stand at a type position as a family base (`payload: result`): it is ABSTRACT by construction, its members are the applications a declaration names (`bt => box<int32>`, `dog => pet<"dog", dog_details> & { … }`) and no others, and a field pinned to a value parameter is a selector whatever its name's mark (`pet => <N, T> { type: text = N  pet: T }`); a selector's declared type may mention none of the template's parameters, value ones included. `final` on a template is refused. A mark written on a template applies to its *applications*: `result => abstract <T> { payload: T }` makes `result<text>` an abstract base for `ok<text>` and `err<text>`. Alias, container, constructor-application and atom templates are never bases.

## 9. Choice types and disjointness

`(A | B | …)`, two or more named variants, each a distinct type; no variant may resolve to `void`. Every choice records a derived `disjoint` fact — a `disjoint` field in the `!meta.choice` body, never written by a declaration — by **discrimination class**:

| Class | Types |
|---|---|
| boolean | `boolean` |
| number | every numeric family |
| string | every text family — `text`, identifier families, `uri`/`uri_reference`, `iri`/`iri_reference`, `regex`, `email` — and `uuid`, temporal, `bytes`, network (`hostname`, `host`, `media_type` included), references (`meta.type_ref`, `meta.ref<…>`), and their refinements |
| brace | records, maps |
| bracket | arrays, tuples |

An enum takes its members' shared class (`[true false]` boolean, `[A B]` string); a text member set (`!text ^ { members: ["80" "443"] }`) is string-class, so `( ports | integer )` is disjoint. `meta.identifier` is string-class, so `( meta.identifier | int32 )` is disjoint and `( meta.identifier | text )` is not. `rational`, `complex`, **a float still admitting NaN or infinity** (`float32`/`float64` as declared), **a map whose key is not an atom or enum**, nested choices, `meta.declared`, and unresolved or cyclic aliases have **no** class and make the choice non-disjoint. So `( float64 | text )` needs tags unless the float narrows `allow_nan` and `allow_infinity` to false — the same in every encoding. Disjoint iff every variant has a class and none repeats. Value-set separation (disjoint ranges, patterns, enum members) does **not** count.

Data: a variant is selected with `!variant`. Tag optional only when disjoint; otherwise a missing tag is a validation error. Emitter rule: if two variants share a class, tag every value; at a disjoint choice write each untagged value in its variant's form (a text `42` quoted). `@meta.disjoint` on the declaration asserts the derived fact and fails the load if false.

When the tag would be mandatory, prefer a single-group record (§10) — label discrimination needs no tag and permits same-typed alternatives. A choice has **no discriminator field**: for records told apart by a member they carry, type the position by an abstract base with a `=?` selector (§8) instead of a choice over the members.

## 10. Field groups

```
( a: T | b: U | c: V )                    exactly one of a, b, c
( a: T | b: U )?                          at most one
( email: E | phone: P )+                  at least one
( host: H  port: P | socket: S )          host and port together, or socket
( include: I | name?: N  type?: T )       include alone, or at least one of name and type
( b: B  a?: A )?                          a requires b; b may appear alone
( a: A  b: B )?                           both or neither
```

A group lists **options** separated by `|`; an option holds one or more members, separated as fields are. Three rules decide validity: an option is **chosen** when any of its members is present; a chosen option must contain every member whose name is not marked `?` (a `?` on a member's name makes it optional *within its option*); and a bare group admits exactly one chosen option, a `?` after the `)` at most one. `)+` is sugar for "at least one of": `( a: A | b: B )+` lowers to the one-option group `( a?: A  b?: B )`, and is allowed only where every option is a single unmarked member.

**Each presence rule has one spelling**, and a group that restates plain fields or another group is refused at load: the only member of an option takes no `?` (`( a?: A | b: B )` is `( a: A | b: B )`); a written one-option group is `?`-marked, with two or more members and at least one unmarked (`( b: B  a?: A )?`) — bare with an unmarked member it is plain fields, bare with every member marked it is what `+` writes, and `?`-marked with every member marked it is optional fields; `+` takes only single unmarked members. Groups do not nest, and a field sits in one option of one group.

Members are `name: type`, `name?: type` or with a voidable type (`name: type?`) — no modifier, since the group answers presence and never injects. A member's type may be a sibling reference, and a member may be a dependent field's sibling (the dependent field is then optional). A voidable member written `_` is present and chooses its option. Labels share the record's field namespace including inherited fields. Resolution flattens members into fields with `optional: true` plus a `groups` entry, `!meta.field_group { members: [[host port] [socket]]  optional_members?: [...]  optional?: … }`; validation runs after field validation, reporting a chosen option's missing members, then counting. In `^`/`&` bodies a restated member stays a member, in its option: it may drop its `?` but not add one; its type may go voidable → not or narrow (`a: void?` leaves a member that can only be written `_`); it may take `= v` (checked, never injected), never `~ v`, never `=?`. A restated group must keep its options, labels and order, and may only go optional → required. Groups are not type expressions — `[( a: T | b: U )]` is not expressible; use an array of a named choice.

Labelled-sum idiom: a record whose entire body is one required group of one-member options, e.g. `event => { ( created: datetime | modified: datetime | accessed: datetime ) }`, instance `{ modified: "2026-05-21T13:05:00Z" }`; where an option holds several fields, the variant it lowers to is record-shaped.

## 11. Annotations in schemas

An annotation names a type of the **annotating document's one namespace**, resolved from the root — for a schema document, its own entries and its import closure; for a data document, the closure its `!!import`s bind. There is no separate annotation namespace and no rung: an annotation a schema declares is usable on the schema's own declarations and in the data documents that import it alike.

| From | Annotations |
|---|---|
| `meta.tn` | `@doc` (root), `@meta.annotation`, `@meta.disjoint`, `@atom.ordering`, `@atom.bounded`, `@atom.exact`, `@atom.numeric`; the resolver's `@meta.synthetic` and `@meta.application` |
| `core.tn` | `@title`, `@comment`, `@examples`, `@deprecated`, `@read_only`, `@write_only` |
| your schema | anything you declare: `expires => @meta.annotation text`, `internal => @meta.annotation void` |

`@doc` is CommonMark 0.31.2 (no extensions, raw HTML never executed); `@deprecated`, `@read_only`, `@write_only` are bare; `@examples` is a list of text. A schema importing a library without `core.tn` has no `@title` or `@deprecated` and may declare them itself.

Usage: `@expires:"2026-12-31"`; `@internal` (bare — shorthand for `@internal:_`). A bare annotation is valid only against a `void`-targeted type; a valued one only against a non-void type. Any type in the namespace can serve as an annotation; the `@meta.annotation` marker is advisory. An annotation whose name does not resolve is a resolver error. An annotation typed by an abstract entry (`@meta.top`, `@meta.type`, an abstract record) is a schema error. A type annotated with itself (`note => @note:"x" text`) is a wait cycle. `@meta.synthetic` and `@meta.application` are the resolver's, on output keys; writing either is a resolver error. Placement: before the declaration name → entry metadata; after `=>` → definition metadata; before a field name → field metadata. All preserved in resolver output.

Schemas have no comment syntax; `@doc:"…"` is the way to annotate. The `;` used for commentary in the specification's listings is ABNF convention and a parse error in a real schema.

### What an annotation may do

An annotation never changes a value, its type, or its validity — a schema with every annotation erased
admits exactly the same values. Within that it may carry a **load-time check** (`@meta.disjoint`, verified
against the derived fact or the load fails — the one checked annotation), or be a representation directive
for a named class of encodings (none is declared). Facts that *do* change what conforms are grammar, not
annotations: `abstract`/`final` and `=?` (§8). So `@discriminator`, `@rest`, `@abstract`, `@final` and
`@sealed` are unresolved-name errors, and a record is closed with no exception — open-ended data goes in a
map-typed field (`extras?: {text => text}`).

**The restated-field rule:** a restated field's annotations are the restatement's own, in source order,
followed by the inherited field's, in source order. A restatement **adds and never removes**.

## 12. One namespace — what a name means where

**A document's namespace is its own entries plus every entry of its import closure — one set, consulted at every position**: a constructor head (`!C`), a refinement source, an operand, a field type, a variant, an argument, a reference's `of`, a template bound, an annotation. The only lookup before it is the enclosing template's parameter list. The kernel is an ordinary import (`meta.tn`, pre-loaded), reached through `core.tn` or a library or directly; a schema whose closure lacks it sees none of its names, though it may still write record and container sugar, whose desugar targets are the kernel's whatever the document imports.

- **Names resolve from the root.** A one-segment name is a root entry; each further segment selects a member of a nested `!schema` map (`geo.address`), and — for a *value's* qualified name at a `meta.ref<T>` slot — a key of a namespace value or a field of a record value (`orders.place_order`). Inside a nested map a sibling is still written `geo.address`; a bare `address` names the root's. No relative lookup, so no shadowing rule.
- **Imports are transitive and flat.** One name means one thing across the closure. The same schema reached twice (the diamond through `meta.tn`) unifies; two *different* schemas declaring one name, or a local declaration reusing a name the closure binds, fail the load — no hiding, no redefinition, no aliasing to escape with. So every closure name is reserved: under `core.tn` you cannot declare `date`, `uuid` or `title`; under `numeric.tn` alone you may declare `date`, but never `numeric` (a kernel map).
- **Nested maps are open.** `geo => !schema { … }` declared by two documents of a closure is one map holding both documents' members; the kernel's own maps are open the same way (`net.tn` adds to the kernel's `net`), and a schema may add a member to one (`extension-meta-schemas.md`). Within one document, declare a map once.
- **Merged entries keep their home resolution.** An imported entry's own references were resolved in its defining schema and are not re-resolved against the importer.
- **Order and cycles.** Declaration order carries nothing; forward references are fine. What is refused is a *wait* cycle — entries whose declarations must each be read before the other: `a => b & {}` beside `b => a & {}`, `c1 => !c2 {}` beside `c2 => !c1 {}`. A name at a reference-typed slot (a field's type, an argument) waits on nothing, so `tree => { t?: tree }` and mutual recursion are fine. Import cycles are errors; share types through a third schema.
- **Data documents** resolve every `!tag` and `@annotation` in the namespace their `!!import`s bind, never against definitions of their own. A foreign type is used by importing its schema; no value opens a namespace.

**Value entries and qualified names.** A slot typed `meta.ref<T>` over an ordinary type `T` holds a value's qualified name; the referent is found first and judged after, and the whole walk is written:

| Written at `method: meta.ref<method>` | Result |
|---|---|
| `orders.place_order` | accepted: `orders` an `interface` entry, `place_order` a key of its map, the value a `method` |
| `orders` | refused: an `interface` value, where a `method` is wanted |
| `orders.cancel_order` | refused: no such key; the keys are listed |
| `place_order` | refused: a member is reached through its entry |
| `place_order_request` | refused: a record type, where a `method` value is wanted |

A map that is no namespace is not entered, a type entry admits no further segment, and a quoted token is text, never a name. Building the namespace types and value entries: `extension-meta-schemas.md`.
