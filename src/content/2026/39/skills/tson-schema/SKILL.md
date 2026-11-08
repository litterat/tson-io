---
name: tson-schema
description: Author, review, and explain TSON schema documents — `.tn` files whose root is tagged `!schema` (after `!!id` and `!!import` header lines), holding `name => type-definition` declarations: records, enums, refined atoms with typed facets like min and max, choices, generic templates, field groups, dependent fields and references, for the TSON (Typed Schema Object Notation) type system at tson.io. Use this skill whenever the user asks to write a TSON schema, model a domain in TSON, convert a JSON Schema / TypeScript / Protobuf / OpenAPI definition into TSON, add constraints or defaults to TSON types, or diagnose why a TSON schema fails to load or data fails validation against it. Also use it when the user pastes `!schema {`, arrow declarations, `^`, `&`, `~ default`, `meta.ref<…>` or `kind!` — or an older schema with a `!!meta` header, which it migrates. For plain TSON *data* documents (no `!schema` root), use the tson-data skill.
---

# TSON schema documents

A TSON schema is a document: a header of directives, then one braced map of `name => type-definition` declarations tagged `!schema`. Published schemas are immutable and hash-pinned; a data document uses one with `!!import:"…"`. This skill covers *TSON Part 2: Type System and Schema*, 2026 Revision 39, with the bundled libraries in `references/`: `meta.tn` (the kernel), `numeric.tn`, `temporal.tn`, `net.tn`, and `core.tn`, which imports the three. Their facets are condensed in `references/type-families.md`.

> Identifiers such as `https://tson.io/2026/39/m/core.tn` carry the revision; a new revision changes every URL and pin. Never invent a `?sha256=` digest — compute it (`tson hash`, or the tson-data skill's `pin.py`), copy one from a real file, or leave the reference unpinned.

## Workflow

1. **Header.** `!!id`, then an `!!import` per schema whose names you use (`:` glued to the name); schema annotations; the root, tagged `!schema`:
   ```
   !!id:"https://example.com/task.tn"
   !!import:"https://tson.io/2026/39/m/core.tn"
   @doc:"Task-tracking example schema."
   !schema {
     …
   }
   ```
   `!!id` is required to publish. No other directive exists (`!!meta` and `!!schema` were retired in revision 39), and an untagged `{` root makes the file a data document.
2. **Imports.** A name resolves only where the import closure holds it:

   | Import | Brings |
   |---|---|
   | `meta.tn` | `void boolean integer int64 text bytes iri iri_reference regex doc enum set schema`; maps `meta atom numeric unicode net binary` |
   | `numeric.tn` | + `number rational complex int8`…`int256 uint8`…`uint256 float32 float64` |
   | `temporal.tn` | + `date time datetime duration period`; map `temporal` |
   | `net.tn` | + `uuid email uri uri_reference ipv4 ipv6 cidr4 cidr6 mac hostname host media_type` |
   | `core.tn` | all three, + annotations `title comment examples deprecated read_only write_only` |

   Each library imports `meta.tn` (full table in `type-families.md`). Import `core.tn` unless you want names free: every closure name is reserved (`date` under core, not under `numeric.tn` alone).
3. **Names resolve from the root, in one namespace.** Root names are bare (`text`, `uuid`, `!enum`, `set<T>`, `@doc`); machinery is written by path — `meta.record`, `meta.type_ref`, `meta.ref<T>`, `!meta.enum_type`, `!meta.set_type`, `!meta.map`, `!numeric.integer_type`, `!unicode.text_type`, `!unicode.identifier_type`, `@meta.disjoint`. No lexical scope or shadowing; redeclaring a name the closure binds is a load error. Declaration order carries nothing; a *wait* cycle (`a => b & {}`, `b => a & {}`) is refused.
4. **Declarations** — pick the form below. Name every constrained atom and bare record; inline you may write only names and sugar (`[T]`, `[T, U]`, `(A | B)`, `{K => V}`, `name<args>`).
5. **Self-check** against `references/pitfalls.md` (and `tson compile` if available), then write a small data document (tson-data skill) instantiating the root type.

## Declaration forms


| You want | Form | Example | IS-A? |
|---|---|---|---|
| a new record | `{ fields }` | `person => { name: text  age: integer }` | none |
| a record extending others | `A & B & { more }` | `employee => person & contact & { dept: text }` | yes, each |
| a record tightened | `T ^ { fields }` | `production => config ^ { host: = "prod.example.com" }` | yes, `T` |
| a sealed family | `abstract { … =? }` + members | `pet => abstract { species: text =?  name: text }`, `dog => pet & { species: = "dog" }` | yes, each member |
| a record nothing may extend | `final { fields }` | `leaf => final { id: uuid }` | none |
| a record with fields removed | `T - { names }` | `account_public => account - { password }` | **no** |
| a constrained atom | `!I ^ { facets }` | `age => !integer ^ { min: 0  max: 150 }`, `code => !integer ^ { members: [2 3 5 7] }` | yes, `I` |
| an enum of names | `!enum [members]` | `status => !enum [OPEN ACTIVE DONE]` | none |
| a fresh atom family (rare) | `!constructor { }` | `dogs => !numeric.integer_type {}` | none |
| an alias | `name` | `id => uuid` | — **a hop, not a rewrite** |
| a container as its own type | sugar | `tags => [text]`, `scores => [integer; 1..]`, `index => {text => [order]}` | none |
| a union by type | `(A \| B)` | `contact => (email \| phone \| address)` | sum |
| a union by label | field group | `endpoint => { ( host: text  port: uint16 \| socket: text ) }` | product |
| a generic | `<P, …> body` | `pair => <T, U> { first: T  second: U }`, `<T: text>` bounded | per body |
| a set (may be empty) | `set<T>` | `unique_tags => set<text>` | — |
| a field typed by a sibling | `kind!` | `setting => { kind: meta.type_ref  value?: kind! }` | — |
| a field holding a name | a reference | `t: meta.type_ref`, `r: meta.ref<meta.record>`, `m: meta.ref<method>` | — |
| a value naming its own type | `meta.declared` | `payload: meta.declared` (tag required) | open sum |
| a nested group of entries | `!schema { … }` | `geo => !schema { address => { city: text } }`, then `geo.address` | — |

`name { … }` with no operator is a parse error — write `^` or `&`. `!T { … }` is an *instance of `T`*: over a constructor (`numeric.integer_type`) a type, over an ordinary type a **value entry** (`orders => !interface { … }`), which types nothing. Any schema may declare constructors, namespace types and value entries: `references/extension-meta-schemas.md`.

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

Fields separate by whitespace or comma. A field name is judged by the record's **name type**, an identifier by default, so `{ "first name": text }` is a resolver error; JSON names (`"@id"`, `"$ref"`) take a name type on a fieldless abstract base (`declaration-forms.md` §2). **A JSON-Schema-style optional property is `a?: T`, not `a: T?`** — `a: T?` keeps the key required and admits `_`. Refused: `a: T ~ v`, `a?: T? = v`, and `_` as a modifier value (write `a?: void?`). Modifier values are **single scalar tokens**, only on atom- or enum-typed fields, read by the field's type at load (`int32 ~ "nope"` fails).

Records are **closed**, with no exception; free-form content goes in a map field (`extra?: {text => text}`).

**Sealed families.** In the table's `pet`/`dog`, data at a `pet` position is placed by its `species`, untagged. `=?` implies `abstract`; pins are distinct values across the import closure, and a pin never changes. **A member is declared**: `k: dog_of<text>` over `dog_of => <T> pet & { … }` is refused — declare `dogs => dog_of<text>`. `abstract` without `=?` makes the tag required.

**Dependent fields.** `kind!` (a field name, adjacent `!`, then whitespace) types a field by the type its sibling's *value* names: `setting => { kind: meta.type_ref  value?: kind! }` reads `{ kind: int32  value: 7 }`. The sibling comes earlier (inherited fields first), is typed by a reference over a constructor (`meta.type_ref`, `meta.ref<meta.atom>` — not `int32` or `meta.ref<method>`), and is there whenever the dependent field is (required, defaulted, pinned, or a group member). The dependent field is never voidable, takes no modifier, and stands only at a record field's type. Data writes a free sibling first.

## Type expressions (every type position)

| Form | Meaning |
|---|---|
| `[T]` | array of T, any length |
| `[T; N]` | exactly N; `[T; N..M]`, `[T; N..]`, `[T; ..M]` bounded (`0..` errors — write `[T]`) |
| `[T?]` | elements may be void (`_`) |
| `[T, U, V]` | tuple — fixed length, 2+ positions; `[T, U?]` a voidable position. One position: `meta.tuple1<T>`, `meta.voidable_tuple1<T>` |
| `(A \| B)` | choice, two or more named variants |
| `{K => V}` | map; `{K => V; 1..}` sized; `{K => V?}` values may be void |
| `name<arg, arg>` | template application — every parameter must be supplied |
| `T?` on a field | field voidable — distinct from `[T?]` |

**Sets** are `set<T>`; duplicates are judged by value. **A set may be empty**; a non-empty one is named, `tag_set => !meta.set_type { element_type: text  min_items: 1 }`. **Order is a facet**: an array is `ordered`, a map is not unless `!meta.map { key_type: K  value_type: V  ordered: true }`.

## Atoms and facets

You tighten an instance's facets with `!instance ^ { … }`. **A facet is typed by its family**: a bound on `number` is a `number`, on `date` a `date`; `within` on `ipv4` is `[cidr4]`; a length, count or precision is a `numeric.count`. A value the type refuses is a load error (`!number ^ { min: 0x10 }`; `!duration ^ { max: P1Y }` — a month is a `period`). Facets only narrow: bounds inward, member sets shrink, permissions (`allow_nan`) true → false, a text `pattern` or `members` set once, a selector along its own relation (`bytes.encoding` never). A facet **fixed at construction** — `normalization`, an identifier profile, a `name_type` — needs a fresh `!constructor { … }`. Unknown facet names are errors (`minimum` — TSON says `min`); look facets up in `references/type-families.md`.

```
percent  => !number ^ { min: 0  max: 100  fraction_digits: 2 }
sku      => !text ^ { pattern: "[A-Z]-[0-9]{3}" }
web_url  => !uri ^ { schemes: [https]  allow_fragment: false }
lan_addr => !ipv4 ^ { within: ["192.168.0.0/16"] }
recent   => !datetime ^ { exclusive_min: "2026-01-01T00:00:00Z"  precision: 3 }
this_year => !date ^ { min: 2026-01-01  max: 2026-12-31 }
header   => !unicode.text_type { normalization: ASCII_CASEFOLD }
```

Refinement keeps inherited facets (`!int8 ^ { min: 0 }` is still 8 bits). Under `header`, `Content-Type` *is* `content-type`. **`uri` requires a scheme and is US-ASCII**; otherwise `uri_reference`, `iri`, `iri_reference`. **No library declares a bound a schema can write** (no `non_empty_text`): declare `title_text => !text ^ { min_length: 1 }`.

## Enums

`status => !enum [OPEN ACTIVE DONE]` is a vocabulary of **names** (identifiers), so `!enum ["in progress"]` fails. `enum` is `meta.enum_type { name_type  members }` with `name_type` pinned to `meta.identifier`; for other names, `!meta.enum_type { name_type: words  members: ["in progress" "on hold"] }` over `words => !unicode.identifier_type { medial: " " }`. Numbers are never members (`!integer ^ { members: [1 2 3] }`); a closed set of non-name texts is `ports => !text ^ { members: ["80" "443"] }`. `boolean` is `!enum [true false]`. Default with `status?: status ~ OPEN`.

**No library declares `identifier`**: type a name as `meta.identifier`, or declare `identifier => !unicode.identifier_type { continue_add: "-" }`.

## Choice vs field group

Use a **choice** `(A | B)` for distinct *named types*. Data tags the variant (`!email "a@b.c"`), untagged only when the choice is *disjoint* — each variant in a different class of `boolean`, `number`, `string`, `brace`, `bracket`: `(text | integer)` is, `(email | phone)` and `(float64 | text)` (NaN has no class) are not. No variant may be `void`. `@meta.disjoint` asserts it at load. Records told apart by a field want a sealed family.

Use a **field group** when alternatives are told apart by *label*, share a type, or combine fields:

```
payment => { amount: number  ( card: card_details | bank: bank_details )  ( note: text | ref: text )? }
endpoint => { ( host: text  port: uint16 | socket: text ) }
contact  => { name: text  ( email: email | phone: text )+ }
```

`|` separates **options** of one or more members. An option is *chosen* when any member is present and must then hold every member not marked `?`. A bare group admits exactly one chosen option, `)?` at most one, `)+` (single unmarked members only) at least one. Members take no modifier; a group never injects. Each presence rule has one spelling (`( b: B  a?: A )?` is "`a` requires `b`"; `declaration-forms.md` §10). Groups do not nest or stand at type positions.

## Composition, refinement, subtraction

- **Composition `&`** — parents contribute *disjoint* field names (a diamond is an error); the body adds fields or tightens inherited ones, eliding the type (`spec?: = "…"`).
- **Refinement `^`** — touches only existing fields. Each slot moves one way: omission nothing → required → injected, voidable → not, FREE → DEFAULT → FIXED; a default may change, a pin may not. The source has a record body — not a container (`{text => integer}` is finished), a choice, or a FINAL record.
- **Subtraction `-`** — on a construction head, *whitespace before `-`* (`account- {` lexes as one name); never on a `^` head; the result is not substitutable for its source.
- Operands are **named** references. A declared entry is its **name** (two `!net.uuid_type {}` are two types); `bx => box<text>` *is* that application's entry; an alias is a hop; `!uuid ^ {}` is the nominal subtype.

## Templates

```
pair     => <T, U> { first: T  second: U }
vector   => <T, N> [T; N]
retry    => <N> { attempts?: int32 ~ N }
result   => <T> ( T | error )
tree     => <T> { value: T  children?: [tree<T>] }
labelled => <T: text, N: int8> { label: T  weight?: integer ~ N }
```

**A parameter's type is derived from where it stands**: a type slot makes a *type parameter*; a value slot (`[T; N]`, `~ N`, `= N`, an enum member) a *value parameter* of the slot's or field's type (`retry`'s `N` is an `int32`, `vector`'s a `numeric.count`). `<T: text>` **bounds** a type parameter; `<N: int8>` narrows a value parameter and must IS-A what the uses derive. **Each application is checked against the parameter list**: `retry<text>` and `labelled<int32, 1>` are refused at the call site.

Rules: every use supplies all arguments (a record template named bare is a family base, never an operand); every parameter is used, shadows no entry, and is never an operand; value arguments are scalars; a routed modifier keeps its literal's name mark (`a?: T ~ N`); recursion passes parameters unchanged and terminates; `<N> !integer ^ { min: N }` is no form — write `<N> !numeric.integer_type { min: N }`; a bound is a type, never a constructor. See `references/templates.md`.

## References: names held as values

`meta.reference_type` types every slot holding a name; its `of` says what the name reaches. **A type's name**: `meta.type_ref` (any type), `meta.ref<C>` over a constructor (`meta.ref<meta.record>`: record types only; `meta.ref<net.uuid_type>` holds `stock_id`, never a UUID). **A value's qualified name**: `meta.ref<T>` over an ordinary type, written `orders.place_order`. An application stands unquoted where a name does: `pair<text integer>`. The slot holds the name, never the thing.

## Annotations

An annotation is a *type* of the document's one namespace. The kernel has `@doc:"…"` (CommonMark 0.31.2, raw HTML never executed), `@meta.disjoint` and the `@atom.*` markers; `core.tn` adds `@title`, `@comment` (for maintainers), `@examples:["…"]` (*text*), and bare `@deprecated` (reason in `@doc`), `@read_only`, `@write_only` — no `@since`, `@todo` or `@lang`. An annotation never changes validity, which is why `abstract`, `final` and `=?` are grammar.

**Your own** are entries, usable in the schema and its data alike: `expires => @meta.annotation text` for `@expires:"2026-12-31"`, `internal => @meta.annotation void` for a bare `@internal`. Before a declaration name an annotation binds the *entry*; after `=>`, the *definition*; before a field name, the field.

## Data under a schema

- `!!import:"…"` names the namespace, and **the root names its type** (`!task { … }`). `!uuid` works only where the closure holds `net.tn`.
- **No base type resolution**: `true` and `42` mean what the position's type says. No `null`; `void` admits `_` alone.
- No directive below the header: a foreign type comes by importing its schema, and a `meta.declared` position needs a tag.
- An omitted `a?: T ~ v` or `a?: T = v` is injected; an omitted unmarked name is a missing-field error; `_` is refused unless the type carries `?`. At `a?: T? ~ v`, `_` is void and a missing key *the default*.

Subtype admission, empty braces, the void-sentinel table, errors: `references/data-under-schema.md`.

**Converting** from JSON Schema, OpenAPI, TypeScript, Protobuf or a revision 38 schema: `references/converting.md`. Do not fake what TSON lacks (open records, regex-keyed properties, conditional schemas) — say so and pick the nearest honest shape.

## Complete example

```
!!id:"https://example.com/task.tn"
!!import:"https://tson.io/2026/39/m/core.tn"
@doc:"Task-tracking example schema."
!schema {
  priority   => !integer ^ { min: 1  max: 5 }
  title_text => !text ^ { min_length: 1 }
  status     => !enum [OPEN ACTIVE DONE]
  flagged    => <T, N> { entry: T  priority?: priority ~ N }
  task => {
    id:        uuid
    title:     title_text
    priority?: priority ~ 3
    status?:   status ~ OPEN
    due?:      date
    tags?:     [text]
    history?:  [flagged<status, 2>]
  }
}
```

and a conforming document — `priority` omitted (defaulted, so injected) and `due` omitted (no value, so it stays missing):

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
| `!!meta:"…"`, a bare `{` root; `!!schema:"…"` in data | retired in revision 39 | `!!import`s and `!schema { … }`; data uses `!!import` |
| `!enum_type`, `!text_type`, `!set_type`, `!map`, `ref<T>`, `kind<C>`, `tuple1<T>`, `@disjoint` | machinery is written by path | `!meta.enum_type`, `!unicode.text_type`, `!meta.set_type`, `!meta.map`, `meta.ref<T>`, `meta.ref<C>`, `meta.tuple1<T>`, `@meta.disjoint` |
| `meta.tn` alone, then `id: uuid`, `n: int32`, `d: date` | those are the libraries' | import `core.tn` (or `net.tn`, `numeric.tn`, `temporal.tn`) |
| `dynamic`, `extern`, `extern_of<S>`; `type_kind` | retired | `meta.declared`, the foreign schema imported; `meta.type_ref` |

## Reference files

- `type-families.md` — every family and container constructor: facets, their types, instances.
- `declaration-forms.md` — field slots, refinement orders, composition, subtraction, families, groups, disjointness, namespaces.
- `templates.md` — parameter types, held bodies, materialisation, family bases, recursion.
- `data-under-schema.md` — governed data: subsumption, `_`, injection, declared positions, errors.
- `extension-meta-schemas.md` — extending the vocabulary: namespace types, value entries, constructors.
- `converting.md`, `pitfalls.md`, `grammar.md` (ABNF, errors, hygiene, limits).
- `meta.tn`, `numeric.tn`, `temporal.tn`, `net.tn`, `core.tn` — the libraries.

[Java](https://github.com/litterat/ltr8-io-tson-java) and [TypeScript](https://github.com/litterat/ltr8-io-tson-typescript) (tson.io's live validator) implementations check this skill's work.
