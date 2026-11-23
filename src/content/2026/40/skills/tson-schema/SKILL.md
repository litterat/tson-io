---
name: tson-schema
description: Author, review, and explain TSON schema documents — `.tn` files whose root is tagged `!schema` (after `!!id` and `!!import` header lines), holding `name => type-definition` declarations: records, enums, refined atoms with typed facets like min and max, choices, parametric records, open constructions, field groups, dependent fields, references and externs, for the TSON (Typed Schema Object Notation) type system at tson.io. Use this skill whenever the user asks to write a TSON schema, model a domain in TSON, convert a JSON Schema / TypeScript / Protobuf / OpenAPI definition into TSON, add constraints or defaults to TSON types, or diagnose why a TSON schema fails to load or data fails validation against it. Also use it when the user pastes `!schema {`, arrow declarations, `^`, `&`, `~ default`, `meta.ref<…>`, `!meta.extern` or `kind!`. For plain TSON *data* documents (no `!schema` root), use the tson-data skill.
---

# TSON schema documents

A TSON schema is a header of directives, then one braced map of `name => type-definition` declarations tagged `!schema`. Published schemas are immutable and hash-pinned; a data document uses one with `!!import:"…"`. This skill covers *TSON Part 2*, 2026 Revision 40, with the bundled libraries in `references/`: `meta.tn` (the kernel), `numeric.tn`, `temporal.tn`, `net.tn`, and `core.tn`, which imports the three.

> Identifiers such as `https://tson.io/2026/40/m/core.tn` carry the revision; a new revision changes every URL and pin. Never invent a `?sha256=` digest — compute it (`tson hash`, or the tson-data skill's `pin.py`), copy one from a real file, or leave the reference unpinned.

## Workflow

1. **Header.** `!!id`, then an `!!import` per schema whose names you use (`:` glued to the name); schema annotations; the root, tagged `!schema`:
   ```
   !!id:"https://example.com/task.tn"
   !!import:"https://tson.io/2026/40/m/core.tn"
   @doc:"Task-tracking example schema."
   !schema {
     …
   }
   ```
   `!!id` is required to publish. No other directive exists, and an untagged `{` root makes the file a data document.
2. **Imports.** A name resolves only where the import closure holds it:

   | Import | Brings |
   |---|---|
   | `meta.tn` | `void boolean integer int64 text bytes iri iri_reference regex doc enum set schema`; maps `meta atom numeric unicode net binary` |
   | `numeric.tn` | + `number rational complex int8`…`int256 uint8`…`uint256 float32 float64` |
   | `temporal.tn` | + `date time datetime duration period`; map `temporal` |
   | `net.tn` | + `uuid email uri uri_reference ipv4 ipv6 cidr4 cidr6 mac hostname host media_type` |
   | `core.tn` | all three, + annotations `title comment examples deprecated read_only write_only` |

   Import `core.tn` unless you want names free: every closure name is reserved. Two schemas that both declare a name you need are reached through externs.
3. **Names resolve from the root, in one namespace.** Root names are bare (`text`, `uuid`, `!enum`, `set<T>`, `@doc`); machinery is written by path — `meta.type_ref`, `meta.ref<T>`, `!meta.enum_type`, `!meta.map`, `!numeric.integer_type`, `!unicode.text_type`, `@meta.disjoint`. No shadowing; redeclaring a name the closure binds is a load error. Order carries nothing; a *wait* cycle (`a => b & {}`, `b => a & {}`) is refused.
4. **Declarations** — pick the form below. Name every constrained atom, enum and namespace type; at a type slot you may write names, sugar (`[T]`, `[T, U]`, `(A | B)`, `{K => V}`), a record body `{ … }` and applications `name<args>`.
5. **Self-check** against `references/pitfalls.md` (and `tson compile`), then write a small data document (tson-data skill).

## Declaration forms


| You want | Form | Example | IS-A? |
|---|---|---|---|
| a new record | `{ fields }` | `person => { name: text  age: integer }` | none |
| a record extending others | `A & B & { more }` | `employee => person & contact & { dept: text }` | yes, each |
| a record with fields tightened | `T & { restated }` | `production => config & { host?: = "prod.example.com" }` | yes, `T` |
| a sealed family | `abstract { … =? }` + members | `pet => abstract { species: text =?  name: text }`, `dog => pet & { species: = "dog" }` | yes, each member |
| a record nothing may extend | `final { fields }` | `leaf => final { id: uuid }` | none |
| a record with fields removed | `T - { names }` | `account_public => account - { password }` | **no** |
| a constrained atom | `!I ^ { facets }` | `age => !integer ^ { min: 0  max: 150 }` | yes, `I` |
| an enum of names | `!enum [members]` | `status => !enum [OPEN ACTIVE DONE]` | none |
| a construction left open | `!C ^ { values }` | `nonempty => !meta.array ^ { min_items: 1 }`, then `nonempty<text>` | — **no type until completed** |
| a fresh atom family (rare) | `!C { }` | `dogs => !numeric.integer_type {}` | none |
| an alias | `name` | `id => uuid` | — **a hop, not a rewrite** |
| a container as its own type | sugar | `tags => [text]`, `scores => [integer; 1..]`, `index => {text => [order]}` | none |
| a union by type | `(A \| B)` | `contact => (email \| phone \| address)` | sum |
| a union by label | field group | `endpoint => { ( host: text  port: uint16 \| socket: text ) }` | product |
| a generic record | `<P, …> { … }` | `pair => <T, U> { first: T  second: U }`, `<T: text>` bounded | per application |
| a set (may be empty) | `set<T>` | `unique_tags => set<text>` | — |
| a field typed by a sibling | `kind!` | `setting => { kind: meta.type_ref  value?: kind! }` | — |
| a field holding a name | a reference | `t: meta.type_ref`, `r: meta.ref<meta.record>`, `m: meta.ref<method>` | — |
| a value naming its own type | `meta.declared` | `payload: meta.declared` (tag required) | open sum |
| another schema's type | `!meta.extern` | `order_v1 => !meta.extern { schema: "…/order-1.tn"  type: order }` | a hop |
| a nested group of entries | `!schema { … }` | `geo => !schema { address => { city: text } }`, then `geo.address` | — |

**`^` follows `!name` alone and takes values**: `person ^ { … }` and `name { … }` are parse errors — derive a record with `&`. `!T { … }` is an *instance of `T`*: over a constructor a type, over an incomplete entry (`enum`, `nonempty`) its completion, over an ordinary type a **value entry** (`orders => !interface { … }`), which types nothing (`references/extending.md`).

## Records and fields

A field has three slots — `name?: type? ~ default` / `= fixed` / `=?` — each answering one question:
`?` on the **name**: may the key be omitted? `?` on the **type**: may a written value be `_`? The
**modifier**: none (any value), `~ v` (injected when omitted), `= v` (the only value), `=?` (a selector).

```
config => {
  @doc:"key written; _ refused"                 host:     text
  @doc:"may be omitted; omission injects 8080"  port?:    integer ~ 8080
  @doc:"may be omitted; _ refused"              label?:   text
  @doc:"key written; _ admitted ('no timeout')" timeout:  duration?
  @doc:"omitted: default; _: void"              proxy?:   uri? ~ "http://gw"
  @doc:"a marker the document must write"       version:  text = "2.0"
  @doc:"may be omitted or _, nothing else"      legacy?:  void?
}
```

(`@doc` is the only comment: the spec's `;` notes are ABNF convention, and `#`, `//` are errors.)

A field name is a value of the record's **name type**, `meta.identifier` by default, so `{ "first name": text }` is a resolver error; JSON names (`"@id"`) take a name type on an abstract base (`declaration-forms.md` §2). **A JSON-Schema-style optional property is `a?: T`, not `a: T?`** — `a: T?` keeps the key required and admits `_`. Refused: `a: T ~ v`, `a?: T? = v`, and `_` as a modifier value (write `a?: void?`). Modifier values are **single scalar tokens**, only on atom-, enum- or reference-typed fields, read by the field's type at load (`int32 ~ "nope"` fails).

Records are **closed**; free-form content goes in a map field (`extra?: {text => text}`).

**Sealed families.** In the table's `pet`/`dog`, data at a `pet` position is placed by its `species`, untagged. `=?` implies `abstract`; pins are distinct values across the closure and never change. `abstract` without `=?` makes the tag required. A member is always declared, never an application closed in place.

**Dependent fields.** `kind!` (adjacent `!`, then whitespace) types a field by the type its sibling's *value* names: `setting => { kind: meta.type_ref  value?: kind! }` reads `{ kind: int32  value: 7 }`. It is schema grammar only, a field's whole type (`[kind!]` is a parse error). The sibling comes earlier, is typed `meta.type_ref`, `meta.type_expr` or `meta.ref<C>` over a constructor, and is there whenever the dependent field is (required, defaulted, pinned, or a group member). The dependent field is never voidable and takes no modifier.

## Type expressions (every type position)

| Form | Meaning |
|---|---|
| `[T]` | array of T, any length |
| `[T; N]` | exactly N; `[T; N..M]`, `[T; N..]`, `[T; ..M]` bounded (`0..` errors — write `[T]`) |
| `[T?]` | elements may be void (`_`) |
| `[T, U, V]` | tuple — fixed length, 2+ positions; `[T, U?]` a voidable position. One position is declared: `!meta.tuple [{ element_type: T }]` |
| `(A \| B)` | choice, two or more variants |
| `{K => V}` | map, `K` a name; `{K => V; 1..}` sized; `{K => V?}` values may be void |
| `{ fields }` | a record written in place — structural, unnamed, a member of nothing |
| `name<arg, arg>` | an application: a parametric record substituted, a constructor constructed (`meta.array<T>` is `[T]`), an incomplete entry completed (`set<T>`); every argument a name |
| `T?` on a field | field voidable — distinct from `[T?]` |

**A form at a slot is written in place**: unnamed and untagged in data. Atom refinements, enums, namespace types and compositions are named, never written in place. **Sets** are `set<T>`; duplicates are judged by value. **A set may be empty**; a non-empty one is named, `tag_set => !meta.set_type { element_type: text  min_items: 1 }`. **Order is a facet**: an array is `ordered`, a map is not unless `!meta.map { key_type: K  value_type: V  ordered: true }`.

## Atoms and facets

You tighten an instance's facets with `!instance ^ { … }`. **A facet is typed by its family**: a bound on `number` is a `number`, on `date` a `date`; `within` on `ipv4` is `[cidr4]`; a length or count is a `numeric.count`. A value the type refuses is a load error (`!number ^ { min: 0x10 }`; `!duration ^ { max: P1Y }` — a month is a `period`). Facets only narrow: bounds inward, member sets shrink, permissions (`allow_nan`) true → false, a text `pattern` or a UUID `version` set once. A facet **fixed at construction** — `normalization`, an identifier profile, a `name_type` — needs a fresh `!constructor { … }`. Unknown facet names are errors (`minimum` — TSON says `min`); look facets up in `references/type-families.md`.

```
percent  => !number ^ { min: 0  max: 100  fraction_digits: 2 }
sku      => !text ^ { pattern: "[A-Z]-[0-9]{3}" }
web_url  => !uri ^ { schemes: [https]  allow_fragment: false }
lan_addr => !ipv4 ^ { within: ["192.168.0.0/16"] }
recent   => !datetime ^ { exclusive_min: "2026-01-01T00:00:00Z"  fraction_digits: 3 }
this_year => !date ^ { min: 2026-01-01  max: 2026-12-31 }
header   => !unicode.text_type { normalization: ASCII_CASEFOLD }
```

Refinement keeps inherited facets (`!int8 ^ { min: 0 }` is still 8 bits), and a declared collection refines too (`!tags ^ { min_items: 1 }`). **`uri` requires a scheme and is US-ASCII**; otherwise `uri_reference`, `iri`, `iri_reference`. **No library declares a bound a schema can write** (no `non_empty_text`): declare `title_text => !text ^ { min_length: 1 }`.

## Enums

`status => !enum [OPEN ACTIVE DONE]` is a vocabulary of **names** (identifiers), so `!enum ["in progress"]` fails. `enum` is the kernel's construction left open, `!meta.enum_type ^ { name_type: meta.identifier }`, which `!enum [ … ]` completes; `a: enum` is refused. For other names, `!meta.enum_type { name_type: words  members: ["in progress" "on hold"] }` over `words => !unicode.identifier_type { medial: " " }`. Numbers are never members (`!integer ^ { members: [1 2 3] }`); a closed set of non-name texts is `ports => !text ^ { members: ["80" "443"] }`. `boolean` is `!enum [true false]`. Default with `status?: status ~ OPEN`.

**No library declares `identifier`**: type a name as `meta.identifier`, or declare `identifier => !unicode.identifier_type { continue_add: "-" }`.

## Choice vs field group

Use a **choice** `(A | B)` for distinct *types*. Data tags the variant or a subtype of one (`!email "a@b.c"`), untagged only when the choice is *disjoint* — each variant in a different class of `boolean`, `number`, `string`, `brace`, `bracket`: `(text | integer)` is, `(email | phone)` and `(float64 | text)` are not. A non-disjoint choice names every variant; a nested choice must be disjoint; no variant is `void`. Records told apart by a field want a sealed family.

Use a **field group** when alternatives are told apart by *label*, share a type, or combine fields:

```
payment => { amount: number  ( card: card_details | bank: bank_details )  ( note: text | ref: text )? }
endpoint => { ( host: text  port: uint16 | socket: text ) }
contact  => { name: text  ( email: email | phone: text )+ }
```

`|` separates **options** of one or more members. An option is *chosen* when any member is present and must then hold every member not marked `?`. A bare group admits exactly one chosen option, `)?` at most one, `)+` (single unmarked members only) at least one. Members take no modifier. Each presence rule has one spelling (`( b: B  a?: A )?` is "`a` requires `b`"; `declaration-forms.md` §10).

## Composition, open construction, subtraction

- **Composition `&`** — parents contribute *disjoint* field names; the body adds fields or **restates** inherited ones, eliding the type (`spec?: = "…"`). Each fact moves one way: nothing → required → injected, voidable → not, FREE → DEFAULT → FIXED; a pin never changes; a type narrows by IS-A. **A misspelt restatement adds a new field.** Operands are records — not a container, a choice, an extern or a FINAL record.
- **Open construction `!C ^ { values }`** leaves a required field absent: an **incomplete entry**, no type, completed where used (`nonempty<text>`). Each field is written once.
- **Subtraction `-`** — *whitespace before `-`* (`account- {` is one name); the result is not substitutable for its source.
- Two `!net.uuid_type {}` are two types; an alias is a hop; `!uuid ^ {}` and `person & {}` are nominal subtypes.

## Parametric records

```
pair     => <T, U> { first: T  second: U }
result   => <T> { value?: T  error?: error_info }
tree     => <T> { value: T  children?: [tree<T>] }
labelled => <T: text> { label: T  tags?: [T] }
```

Only a **record** takes parameters (`<T> [T]` is refused: write the form at the use site, or a construction left open). **A parameter is a type** — at a field's type, inside a type written there, or as an argument; never a default, facet, size or enum member. A value differing per application is restated where it is declared: `created => response<order> & { status?: = 201 }`. `<T: text>` **bounds** by IS-A; a bound is written, never inherited, and never a constructor.

**Applying**: every argument is **a name** (`pair<box<text>, int32>` is refused; declare `box_text => box<text>` first). A parametric record is never named bare. `order_page => page<order>` is the substituted record under that name; `f: page<order>` closes in place to an unnamed record. A recursive application is declared (`tree_text => tree<text>`). Families, bounds, recursion: `references/parametric-records.md`.

## References: names held as values

`meta.ref` is the one atom whose values are names; its `of` says what the name reaches. **A type's name**: `meta.type_ref` (any type), `meta.ref<C>` over a constructor (`meta.ref<meta.record>`: record types only; `meta.ref<net.uuid_type>` holds `stock_id`, never a UUID). **A value's qualified name**: `meta.ref<T>` over an ordinary type, written `orders.place_order`. **A reference holds a name, never an application**: declare `bt => box<text>` and write `bt`. A quoted token there is the name it spells (`"orders.place_order"`). The slot holds the name, never the thing.

An **extern** (the table's `order_v1`) names one type of a schema not imported, so two schemas declaring `order` can both be used. It stands wherever a type's name does and is **sealed**: no `&`, `-`, `^`, `!order_v1 { … }`, default, or `order_v1.field` (`declaration-forms.md` §13).

## Annotations

An annotation is a *type* of the document's one namespace. The kernel has `@doc:"…"` (CommonMark 0.31.2, raw HTML never executed), `@meta.disjoint` and the `@atom.*` markers; `core.tn` adds `@title`, `@comment`, `@examples:["…"]` (*text*), and bare `@deprecated`, `@read_only`, `@write_only` — no `@since` or `@todo`. An annotation never changes validity, which is why `abstract`, `final` and `=?` are grammar. `@meta.application` and `@meta.completion` are the resolver's; never write them.

**Your own** are entries, usable in the schema and its data alike: `expires => @meta.annotation text` for `@expires:"2026-12-31"`, `internal => @meta.annotation void` for a bare `@internal`. Before a name it binds the *entry*; after `=>`, the *definition*.

## Data under a schema

- `!!import:"…"` names the namespace, and **the root names its type** (`!task { … }`).
- **No base type resolution**: `true` and `42` mean what the position's type says. No `null`; `void` admits `_` alone.
- **No argument list and no `kind!` in data**: tag a generic type by its declared name (`!order_page`). A `meta.declared` position needs a tag.
- An omitted `a?: T ~ v` or `a?: T = v` is injected; an omitted unmarked name is a missing-field error; `_` is refused unless the type carries `?`.

Subtype admission, empty braces, the void sentinel, declared and extern positions, errors: `references/data-under-schema.md`.

**Converting** from JSON Schema, OpenAPI, TypeScript or Protobuf: `references/converting.md`. Do not fake what TSON lacks (open records, conditional schemas) — say so.

## Complete example

```
!!id:"https://example.com/task.tn"
!!import:"https://tson.io/2026/40/m/core.tn"
@doc:"Task-tracking example schema."
!schema {
  priority   => !integer ^ { min: 1  max: 5 }
  title_text => !text ^ { min_length: 1 }
  status     => !enum [OPEN ACTIVE DONE]
  flagged    => <T> { entry: T  priority?: priority }
  task => {
    id:        uuid
    title:     title_text
    priority?: priority ~ 3
    status?:   status ~ OPEN
    due?:      date
    tags?:     [text]
    history?:  [flagged<status>]
  }
}
```

and a conforming document — `priority` omitted is injected, `due` omitted stays missing:

```
!!import:"https://example.com/task.tn"
!task {
  id:      550e8400-e29b-41d4-a716-446655440000
  title:   "Ship the draft"
  status:  OPEN
  tags:    [spec editorial]
  history: [{ entry: OPEN }  { entry: ACTIVE  priority: 4 }]
}
```

## Pitfalls — check before delivering

The full table is `references/pitfalls.md`; read it before handing over a schema.

| You wrote | Problem | Write instead |
|---|---|---|
| a bare `{` root; `!!schema:"…"` | an untagged root is data; the only directives are `!!id` and `!!import` | `!!import`s and `!schema { … }` |
| `!enum_type`, `!text_type`, `!set_type`, `!map`, `ref<T>`, `@disjoint` | machinery is written by path | `!meta.enum_type`, `!unicode.text_type`, `!meta.set_type`, `!meta.map`, `meta.ref<T>`, `@meta.disjoint` |
| `employee => person ^ { … }`, `<N> { a?: int32 ~ N }` | `^` follows `!name`; a parameter is a type | `person & { … }`; restate the value where the application is declared |
| `any`, `dynamic`; `type` for a type's name | no such types | `meta.declared` (tag required); `meta.type_ref` |

## Reference files

- `type-families.md` — every atom family and container constructor: facets, their types, instances.
- `declaration-forms.md` — field slots, forms in place, open construction, refinement, composition, families, groups, choices, namespaces, externs.
- `parametric-records.md` — parameters, bounds, applications, families, recursion.
- `data-under-schema.md` — governed data: subsumption, `_`, injection, declared positions, errors.
- `extending.md` — extending the vocabulary: namespace types, value entries, constructors.
- `converting.md`, `pitfalls.md`, `grammar.md` (ABNF, errors, hygiene, limits).
- `meta.tn`, `numeric.tn`, `temporal.tn`, `net.tn`, `core.tn` — the libraries.

The [Java](https://github.com/litterat/ltr8-io-tson-java) and [TypeScript](https://github.com/litterat/ltr8-io-tson-typescript) implementations check this skill's work.
