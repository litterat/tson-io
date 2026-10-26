---
name: tson-schema
description: Author, review, and explain TSON schema documents — `.tn` files with a `!!meta` header and name-to-type declarations that define records, enums, refined atoms with facets like min and max, choices, generic templates with type parameters, field groups, and constraints for the TSON (Typed Schema Object Notation) type system at tson.io. Use this skill whenever the user asks to write a TSON schema, model a domain in TSON, convert a JSON Schema / TypeScript / Protobuf / OpenAPI definition into TSON, add constraints or defaults to TSON types, or diagnose why a TSON schema fails to load or why data fails validation against it. Also use it when the user pastes anything containing `!!meta`, arrow declarations, `^`, `&`, or `~ default` syntax. For plain TSON *data* documents (no `!!meta`), use the tson-data skill.
---

# TSON schema documents

A TSON schema is a data document: a header naming its meta-schema, then one braced map of `name => type-definition` declarations. Published schemas are immutable and hash-pinned; a data document binds one with `!!schema:"…"`. This skill covers *TSON Part 2: Type System and Schema*, 2026 Revision 37, with the bundled library files (`references/meta-kernel.tn`, `meta.tn`, `core.tn`).

`references/core.tn` holds the named types you build with; `meta.tn` and `meta-kernel.tn` the facets each family accepts, condensed in `references/type-families.md`.

> Revision note: identifiers such as `https://tson.io/2026/37/m/meta.tn` carry the revision number. A new revision changes every such URL and every pin. Never invent a `?sha256=` digest — compute it with the tson-data skill's `pin.py`, copy one from a real file, or leave the reference unpinned.

## Workflow

1. **Header.** Three directives, in this order, each on its own line, `:` glued to the name:
   ```
   !!id:"https://example.com/task.tn"
   !!meta:"https://tson.io/2026/37/m/meta.tn"
   !!import:"https://tson.io/2026/37/m/core.tn"
   ```
   `!!id` is required to publish; `!!meta` appears once; `!!import` repeats. Without core, `text`, `integer`, `uuid` are **not in scope** — kernel types are `!` targets, never field types. A schema never carries `!!schema`.
2. **Annotations on the schema** go between the header and the opening brace: `@doc:"…"`.
3. **Declarations** — pick the form below. Name every constrained atom and bare record; inline you may write only names and sugar (`[T]`, `[T, U]`, `(A | B)`, `{K => V}`, `name<args>`).
4. **Self-check** against `references/pitfalls.md`, then write a small data document (tson-data skill) instantiating the root type.

## Declaration forms

Everything right of `=>` is a type definition. Pick by what you are making:

| You want | Form | Example | IS-A? |
|---|---|---|---|
| a new record | `{ fields }` | `person => { name: text  age: integer }` | none |
| a record extending others | `A & B & { more }` | `employee => person & contact & { dept: text }` | yes, each |
| a record tightened | `T ^ { fields }` | `production => config ^ { host?: = "prod.example.com" }` | yes, `T` |
| a sealed family | `abstract { … =? }` + members | `pet => abstract { kind: text =?  name: text }`, `dog => pet & { kind: = "dog" }` | yes, each member |
| a record nothing may extend | `final { fields }` | `leaf => final { id: uuid }` | none |
| a record with fields removed | `T - { names }` | `account_public => account - { password }` | **no** (lineage kept) |
| a constrained atom | `!I ^ { facets }` | `age => !integer ^ { min: 0  max: 150 }`, `code => !integer ^ { members: [2 3 5 7] }` | yes, `I` |
| an enum of names | `!enum [members]` | `status => !enum [OPEN ACTIVE DONE]` | none |
| a set of allowed texts | `!text_enum [members]` | `activity => !text_enum ["sedentary" "lightly active"]` | none |
| a fresh atom family (rare) | `!constructor { }` | `dogs => !integer_type {}` — unrelated to `integer` | none |
| an alias | `name` | `id => uuid` | reference — **a hop, not a rewrite** |
| a container as its own type | sugar | `tags => [text]`, `scores => [integer; 1..]`, `index => {text => [order]}` | none |
| a union by type | `(A \| B)` | `contact => (email \| phone \| address)` | sum |
| a union by label | field group | `endpoint => { ( host: text  port: uint16 \| socket: text ) }` | product |
| a generic | `<P, …> body` | `pair => <T, U> { first: T  second: U }`, `<T: text>` bounded | per body |
| a set (may be empty) | `set<T>` | `unique_tags => set<text>` | instance of `set_type` |
| binary | `bytes`, or `!bytes_type { encoding: E }` | `avatar: bytes`; `hexdigest => !bytes_type { encoding: HEX }` | instance |
| a value whose type the data names | `dynamic`, `declared`, `extern`, `extern_of<S>` | `payload: dynamic` | sum (`scoped`) |

`name { … }` with no operator is a parse error — write `^` or `&`. A constructor (an entry that IS-A `top`) is declarable only under the meta-kernel: `references/extension-meta-schemas.md`.

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

(`@doc` is the only comment; the spec's `;` commentary is ABNF convention, and `#`, `//` are lexer errors.)

Fields separate by whitespace or comma; names are identifiers. **A JSON-Schema-style optional property is `a?: T`, not `a: T?`** — `a: T?` keeps the key required and admits `_`. Refused: a default on an unmarked name (`a: T ~ v`), a pin on a voidable type (`a?: T? = v`), and `_` as a modifier value (write `a?: void?`). Full table: `references/declaration-forms.md`.

Modifier values are **single scalar tokens**, only on atom- or enum-typed fields — no default for a record, container, choice or tuple — and are parsed by the field's type at load (`int32 ~ "nope"` fails).

Records are **closed**, with no exception and no open-record switch; put free-form content in a map field (`extra?: {text => dynamic}`).

**Sealed families.** `pet => abstract { kind: text =?  name: text }` is a base with no direct instances whose members each pin the selector — `dog => pet & { kind: = "dog"  breed: text }` — so data at a `pet` position is placed by its `kind`, untagged. `=?` implies `abstract`; pins are distinct values across the whole import closure. **A member is declared**: a use-site application composing onto a record (`k: dog_of<text>` over `dog_of => <T> pet & { … }`) is refused — declare `dogs => dog_of<text>`. `abstract` alone makes the tag required; `final` forbids `&`/`^` onto the record.

Field annotations go before the field name: `@deprecated @doc:"Use email." phone?: text`.

## Type expressions (every type position)

| Form | Meaning |
|---|---|
| `[T]` | array of T, any length |
| `[T; N]` | exactly N; `[T; N..M]`, `[T; N..]`, `[T; ..M]` bounded (`0..` errors — write `[T]`) |
| `[T?]` | elements may be void (`_`) |
| `[T, U, V]` | tuple — fixed length, 2+ positions; `[T, U?]` a voidable position. One position: `tuple1<T>`, `voidable_tuple1<T>` |
| `(A \| B)` | choice, two or more named variants |
| `{K => V}` | map; `{K => V; 1..}` sized; `{K => V?}` values may be void |
| `name<arg, arg>` | template application — every parameter must be supplied |
| `T?` on a field | field voidable — distinct from `[T?]`; `xs?: [T?]` may be missing and holds void elements |

A single bracketed type is always an array, never a one-tuple. Nesting is free; a comma may follow the last element or argument.

**Sets** are `set<T>` over the `set_type` constructor; duplicates are judged by value, so two spellings of one value collide. **A set may be empty**; a non-empty set is a named entry, `tag_set => !set_type { element_type: text  min_items: 1 }`. **Order is a facet**: `array` is `ordered` by default, `map` is not; `!map { key_type: K  value_type: V  ordered: true }` makes entry order part of the value.

## Atoms and facets

Core supplies the instances; you tighten their constructor's facets with `!instance ^ { … }`. Facets only narrow: bounds move inward, member sets (`members`, a URI's `schemes`) shrink, permissions (`allow_nan`, `allow_relative`) go true → false, a text `pattern` or `members` is set once, a selector moves only along its own relation (`bytes.encoding` not at all). A facet **fixed at construction** — a text family's `normalization`, an identifier profile, an enum's `type` — is never set by `^`; a different one is a fresh `!constructor { … }`. Unknown facet names are errors (`minimum` — TSON says `min`); look facets up in `references/type-families.md` rather than guessing.

```
percent  => !number ^ { min: 0  max: 100  fraction_digits: 2 }
sku      => !text ^ { pattern: "[A-Z]-[0-9]{3}" }
web_url  => !uri ^ { schemes: [https]  allow_fragment: false }
lan_addr => !ipv4 ^ { within: ["192.168.0.0/16"] }
recent   => !datetime ^ { exclusive_min: "2026-01-01T00:00:00Z"  precision: 3 }
header   => !text_type { normalization: ASCII_CASEFOLD }
```

Refinement keeps inherited facets (`!int8 ^ { min: 0 }` is still 8 bits). A text value is its token put into the type's `normalization` form: under `header`, `Content-Type` *is* `content-type`. **`uri` requires a scheme and is US-ASCII**; a relative link is `uri_reference`, a non-ASCII one `iri`/`iri_reference`. **Core holds only what a schema cannot write itself** — no `non_empty_text` or sign-bounded integers: declare `title_text => !text ^ { min_length: 1 }`, `count => !integer ^ { min: 0 }`.

## Enums

`status => !enum [OPEN ACTIVE DONE]` is a vocabulary of **names**, so `!enum ["in progress"]` fails; a set of arbitrary texts is `!text_enum ["in progress" "on hold"]`, always string-class. Both pin the constructor `enum_type { type  members }`; `!enum_type { type: kebab  members: [make-tea drink-tea] }` draws labels from a text family you declare. Members are unique values of `type`, at least one; numbers never (`!integer ^ { members: [1 2 3] }`). Core's `boolean` is `!enum [true false]`. Default with `status?: status ~ OPEN`.

**`identifier` is a text family, not in core**: to type a value or map key as a name, declare `identifier => !identifier_type { continue_add: "-" }`. It is string-class, and its values are names under name hygiene (an identifier-keyed map's keys are a look-alike scope).

## Choice vs field group

Use a **choice** `(A | B)` when alternatives are distinct *named types*. Data tags the variant (`!email "a@b.c"`), omitted only when the choice is *disjoint* — every variant in a different class among `boolean`, `number`, `string`, `brace`, `bracket`. `(text | integer)` is disjoint; `(email | phone)` is not, nor `(float64 | text)` (a float admitting NaN has no class). No variant may be `void`. `@disjoint` asserts it, checked at load. Records told apart by a field they carry want a sealed family — a choice has no discriminator.

Use a **field group** when alternatives are told apart by *label*, share a type, or are combinations of fields:

```
payment => {
  amount: number
  ( card: card_details | bank: bank_details | voucher: text )
  ( note: text | ref: text )?
}
endpoint => { ( host: text  port: uint16 | socket: text ) }
contact  => { name: text  ( email: email | phone: text )+ }
query    => { ( include: text | name?: text  type?: text ) }
```

`|` separates **options** of one or more members. An option is *chosen* when any member is present and must then hold every member not marked `?` (`name?:` is optional *within its option*). A bare group admits exactly one chosen option, `)?` at most one, `)+` (single unmarked members only) at least one. Members take no modifier; a group never injects. Each presence rule has one spelling: a lone member takes no `?`, and a one-option group must be `( b: B  a?: A )?` ("`a` requires `b`") — `( a: A  b?: B )` is just fields, and is refused. Labels share the record's namespace; groups do not nest or stand at type positions. One required group as the whole body is the labelled sum.

## Composition, refinement, subtraction

- **Composition `&`** — parents contribute *disjoint* field names (a diamond is an error); the body may add fields or tighten inherited ones, eliding the type (`spec?: = "…"`).
- **Refinement `^`** — may only touch existing fields; adding one is an error. Each slot moves one way: omission nothing → required → injected, voidable → not, FREE → DEFAULT → FIXED; a default may change, a pin may not. The source must have a record body — not a constructor application (`lookup => {text => integer}` is finished), a choice, or a FINAL record.
- **Subtraction `-`** — on a construction head, *whitespace before `-`* (`account- {` lexes as one name). No removal on a `^` head; the result is not substitutable for its source.
- Parents and refinement sources are **named** references — `(a | b) & { … }` is not grammar.
- **Identity.** A declared entry is its **name** (two `!uuid_type {}` are two types); `bx => box<text>` *is* that application's entry; a reference is a hop. `!uuid ^ {}` is the nominal subtype.

## Templates

```
container   => <T> { items: [T] }
pair        => <T, U> { first: T  second: U }
vector      => <T, N> [T; N]
retry       => <N> { attempts?: int32 ~ N }
result      => <T> ( T | error )
tree        => <T> { value: T  children?: [tree<T>] }
uuid_pair   => <B> pair<uuid, B>
labelled    => <T: text, N: int8> { label: T  weight?: integer ~ N }
```

(`uuid_pair` is a partial application; it re-declares its open parameter `B`.)

**A parameter's type is derived from where it stands**: a type slot makes a *type parameter*; a value slot (`[T; N]`, `~ N`, `= N`, an enum member) a *value parameter* of the slot's or field's type (`retry`'s `N` is an `int32`). Several uses must agree by IS-A. `<T: text>` **bounds** a type parameter; `<N: int8>` narrows a value parameter. **Each application is checked against the parameter list**: `retry<text>` and `labelled<int32, 1>` are refused at the call site.

Rules: every use supplies all arguments (a record template named bare is a family base); every parameter is used and shadows no type name; value arguments are scalars, with no arithmetic or defaults; a routed modifier takes its literal's name mark (`a?: T ~ N`, never `a: T ~ N`); recursion passes parameters unchanged (`tree<T>`); no parameterised atom refinement — write `<N> !integer_type { min: N }`; a bound names a type, never a constructor. Every recursive type needs a terminating path. Details: `references/templates.md`.

## Annotations

An annotation is a *type* in the governing target's namespace — in a schema document, the **meta-schema's**. Under `meta.tn`: `@doc:"…"` (CommonMark 0.31.2, no extensions, raw HTML never executed), `@title`, `@comment` (for maintainers), `@examples:["…"]` (a list of *text*), bare `@deprecated` (the reason goes in `@doc`), `@ordering`, `@bounded`, `@exact`, `@numeric`, `@disjoint`, `@read_only`, `@write_only` — no `@since`, `@todo` or `@lang`. An annotation never changes a value or its validity, which is why `abstract`, `final` and `=?` are grammar. A schema's own types are not annotations on itself.

**Data documents** resolve annotations in the user schema's namespace: declare `expires => @annotation text` for `@expires:"2026-12-31"`, `internal => @annotation void` for a bare `@internal`. An unresolvable annotation is an error. Placement: before a declaration name → the *entry*, after `=>` → the *definition*, before a field name → the field.

## Data under a schema

- `!!schema:"…"` names a namespace, and **the root names its type** (`!task { … }`) or the document is invalid. `!uuid` works only because core is imported.
- **No base type resolution**: `true` and `42` mean whatever the position's type says. There is no `null`; `void` admits `_` alone.
- A nested `!!schema` is admitted only at a position typed by a `scoped` instance holding `EXTERN` (`extern`, `dynamic`, `extern_of<…>`); at a `declared` position it is a validation error, at a non-scoped one a resolver error, and in a schemaless document a validation error.
- An omitted `a?: T ~ v` or `a?: T = v` is injected on decode; an omitted unmarked name is a missing-field error; `_` is an error unless the type carries `?`. At `a?: T? ~ v`, `_` is void and a missing key *the default*.

Subtype admission, empty braces, the `scoped` cells, the void-sentinel table, errors: `references/data-under-schema.md`.

## Converting from another schema language

`references/converting.md` maps JSON Schema, OpenAPI, TypeScript and Protobuf. Do not fake what TSON lacks (open records, regex-keyed properties, conditional schemas) — say so and pick the nearest honest shape.

## Complete example

```
!!id:"https://example.com/task.tn"
!!meta:"https://tson.io/2026/37/m/meta.tn"
!!import:"https://tson.io/2026/37/m/core.tn"
@doc:"Task-tracking example schema."
{
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
!!schema:"https://example.com/task.tn"
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
| `int`, `string`, `bool`, `float`, `double`, `str`, `timestamp`, `binary` | not core names | `integer`/`int32`, `text`, `boolean`, `float64`, `datetime`, `bytes` |
| `non_empty_text`, `positive_integer`, `non_negative_integer`, `identifier`, `unit` | not in core | declare `!text ^ { min_length: 1 }`, `!integer ^ { min: 0 }`, `!identifier_type { continue_add: "-" }`; `void` |
| `!binary BASE64`, `base64`, `hex`, `unknown`, `!set { … }` | no such constructor or core type | `bytes` (`!bytes_type { encoding: HEX }`), `dynamic`, `set<text>` |
| `!enum { members: [ … ]  profile: TEXT }`, `!enum ["Not Started"]` | no `profile`; `enum` members are names | `!text_enum ["Not Started"]` |
| no `!!import` of core, then `name: text` | `text` unresolved — kernel types are not field types | add `!!import:"https://tson.io/2026/37/m/core.tn"` |
| `port: integer ~ 80`, `<N> { a: int32 ~ N }` | a default needs `?` on the name, a routed one too | `port?: integer ~ 80`, `a?: int32 ~ N` |
| `href: uri` for `"../x"`; `scheme: "https"` | `uri` requires a scheme and is ASCII; the facet is a set | `uri_reference` (`iri` beyond ASCII); `schemes: [https]` |
| `@deprecated:"use x"`, `@since`, `@todo`, `@ordered`, `@discriminator` | bare marker; the rest do not exist | `@deprecated @doc:"Use x."`, `@comment`, `@ordering`, `abstract` + `=?` |

## Reference files

- `type-families.md` — every family and container constructor: facets, core instances.
- `declaration-forms.md` — field slots, refinement orders, composition, subtraction, families, groups, disjointness.
- `templates.md` — parameter types, held bodies, materialisation, family bases, recursion.
- `data-under-schema.md` — governed data: subsumption, `_`, injection, `scoped` cells, errors.
- `converting.md`, `extension-meta-schemas.md`, `pitfalls.md`, `grammar.md` (ABNF, errors, hygiene, limits).
- `core.tn`, `meta.tn`, `meta-kernel.tn` — the library itself, and the best examples of idiomatic style.

## Implementations

[Java](https://github.com/litterat/ltr8-io-tson-java) and [TypeScript](https://github.com/litterat/ltr8-io-tson-typescript) (tson.io's live validator) check work this skill produces.
