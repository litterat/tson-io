---
name: tson-schema
description: Author, review, and explain TSON schema documents — `.tn` files with a `!!meta` header and name-to-type declarations that define records, enums, refined atoms with facets like min and max, choices, generic templates with type parameters, field groups, and constraints for the TSON (Typed Schema Object Notation) type system at tson.io. Use this skill whenever the user asks to write a TSON schema, model a domain in TSON, convert a JSON Schema / TypeScript / Protobuf / OpenAPI definition into TSON, add constraints or defaults to TSON types, or diagnose why a TSON schema fails to load or why data fails validation against it. Also use it when the user pastes anything containing `!!meta`, arrow declarations, `^`, `&`, or `~ default` syntax. For plain TSON *data* documents (no `!!meta`), use the tson-data skill.
---

# TSON schema documents

A TSON schema is a data document of a special kind: a header naming the meta-schema that governs it, then one braced map of `name => type-definition` declarations. Published schemas are immutable and hash-pinned; a data document binds one with `!!schema:"…"`, and every `!name` in it then resolves against that schema. This skill covers *TSON Part 2: Type System and Schema*, 2026 Revision 35, with the bundled library files (`references/meta-kernel.tn`, `meta.tn`, `core.tn`).

Read `references/core.tn` for the named types you build with (`text`, `integer`, `uuid`, `date`, `int32`, `bytes`, …), and `references/meta.tn` / `meta-kernel.tn` for the constraint fields a family accepts. `references/type-families.md` condenses both.

> Revision note: identifiers such as `https://tson.io/2026/35/m/meta.tn` carry the revision number. A new revision changes every such URL and every pin. Never invent a `?sha256=` digest — compute it with the tson-data skill's `pin.py`, copy one from a real file, or leave the reference unpinned.

## Workflow

1. **Header.** Three directives, in this order, each on its own line, `:` glued to the name:
   ```
   !!id:"https://example.com/task.tn"
   !!meta:"https://tson.io/2026/35/m/meta.tn"
   !!import:"https://tson.io/2026/35/m/core.tn"
   ```
   `!!id` is optional in the grammar but required to publish; `!!meta` appears exactly once; `!!import` repeats. Almost every schema imports core: without it `text`, `integer`, `uuid` and friends are **not in scope**, the kernel's types arriving only as `!` constructor targets and never as field types (a meta-schema is the exception — `references/extension-meta-schemas.md`). Schema documents never carry `!!schema`.
2. **Annotations on the schema** go between the header and the opening brace: `@doc:"…"`.
3. **Declarations** — pick the form from the table below. Declare a named type for every constrained atom and every bare record; inline at a field position you may write only named references and container sugar (`[T]`, `[T, U]`, `(A | B)`, `{K => V}`, `name<args>`).
4. **Self-check** against the pitfalls below and `references/pitfalls.md`, then write a small data document (tson-data skill) instantiating the root type to confirm the shape reads as intended.

## Declaration forms

Everything right of `=>` is a type definition. Pick by what you are making:

| You want | Form | Example | IS-A? |
|---|---|---|---|
| a new record | `{ fields }` | `person => { name: text  age: integer }` | none |
| a record extending others | `A & B & { more }` | `employee => person & contact & { dept: text }` | yes, each |
| a record tightened | `T ^ { fields }` | `production => config ^ { host: = "prod.example.com" }` | yes, `T` |
| a record with fields removed | `T - { names }` | `account_public => account - { password }` | **no** (lineage kept) |
| a constrained atom | `!I ^ { facets }` | `age => !integer ^ { min: 0  max: 150 }`, `code => !integer ^ { members: [2 3 5 7] }` | yes, `I` |
| an enum | `!enum [members]` | `status => !enum [OPEN ACTIVE DONE]` | none |
| a fresh atom family (rare) | `!constructor { }` | `dogs => !integer_type {}` — unrelated to `integer` | none |
| an alias | `name` | `id => uuid` | reference — **a hop, not a rewrite** |
| a container as its own type | sugar | `tags => [text]`, `scores => [integer; 1..]`, `index => {text => [order]}` | none |
| a union by type | `(A \| B)` | `contact => (email \| phone \| address)` | sum |
| a union by label | single field group | `stamp => { ( created: datetime \| modified: datetime ) }` | product |
| a generic | `<P, …> body` | `pair => <T, U> { first: T  second: U }` | per body |
| a set | `set<T>` | `unique_tags => set<text>` | instance of `set_type` |
| binary | `bytes`, or `!bytes_type { encoding: E }` | `avatar: bytes`; `hexdigest => !bytes_type { encoding: HEX }` | instance |
| a value whose type the data names | `dynamic`, `declared`, `extern` | `payload: dynamic` | sum (`scoped`) |
| …from one named foreign schema | `extern_of<"uri">`, `extern_type<"uri", t>` | `attachment: extern_of<"https://…/claim.tn">` | sum (`scoped`) |

`name { … }` with no operator is a parse error — write `^` or `&`. A constructor is an entry that IS-A `top`, declarable only by a schema whose own `!!meta` names the meta-kernel; the one `~` in the grammar is the field *default* marker (`port: integer ~ 8080`). To declare a vocabulary of your own, see `references/extension-meta-schemas.md`.

## Records and field states

```
config => {
  @doc:"REQUIRED"                                host:   text
  @doc:"REQUIRED_DEFAULT — injected, overridable" port:   integer ~ 8080
  @doc:"REQUIRED_FIXED — injected; must be this"  debug:  boolean = false
  @doc:"OPTIONAL"                                 label:  text?
  @doc:"OPTIONAL_FIXED — if present, must be json" format: text? = json
  @doc:"OPTIONAL_FIXED with no value"             legacy: text? = _
}
```

(The `@doc` annotations above are real TSON — the only way to comment a schema. `;` is the size-specifier separator; `#` and `//` are lexer errors. The specification's listings use `;` for commentary, but that is ABNF convention, not TSON.)

Fields separate by whitespace or comma, and a comma may follow the last; names are identifiers (no leading digit, no leading `_`). Presence is the `?` suffix on the type; mutability is the modifier. Three combinations are resolver errors: `~ _`, `= _` on a required field, and `type? ~ value` (a default implies presence).

Modifier values are **single scalar tokens** (numbers, quoted strings, enum members, `true`/`false`), only on atom- or enum-typed fields — no default for a record, array, map, choice or tuple field, and no compound values (`~ [1 2]` is a parse error). A default is parsed by the field's type at schema load, so `int32 ~ "nope"` fails there.

Records are **closed**: data may contain only declared fields. There is no `additionalProperties` and no open-record switch; put free-form content in a map field (`extra: {text => dynamic}?`), marked `@rest` if a flattening encoding should flatten into it.

Field annotations go before the field name: `@doc:"…" @deprecated:"use email" phone: text?`.

## Type expressions (every type position)

| Form | Meaning |
|---|---|
| `[T]` | array of T, any length |
| `[T; N]` | exactly N; `[T; N..M]`, `[T; N..]`, `[T; ..M]` bounded (`0..` errors — write `[T]`) |
| `[T?]` | elements may be `_` |
| `[T, U, V]` | tuple — fixed length, 2+ positions; `[T, U?]` for an optional slot |
| `(A \| B)` | choice, two or more named variants |
| `{K => V}` | map; `{K => V; 1..}` sized; `{K => V?}` values may be `_` |
| `name<arg, arg>` | template application — every parameter must be supplied |
| `T?` on a field | field optional — distinct from `[T?]`, so `xs: [T?]?` is both |

A single bracketed type is always an array, never a one-tuple. Nesting is free. A comma may follow the last element or argument: `[text, int32, ]` and `pair<uuid, B, >` are legal.

**Sets** are the `set<T>` template meta and core each declare: `tags: set<text>`. The constructor is `set_type`, a refinement of `array` whose `min_items` defaults to **1** — a set is non-empty unless you say otherwise (`!set_type { element_type: text  min_items: 0 }`). Sets reject duplicates and `_` elements; duplicates are detected over *value spaces*, so two spellings of one value collide.

## Atoms and facets

Core supplies the instances; each has a constructor whose fields are the facets you tighten with `!instance ^ { … }`. Facets only ever narrow: bounds move inward, member sets shrink, and a selector moves only along its own narrowing relation — a width chain for `size`, a partial order for `complex.component`, and **none at all for `bytes.encoding`**, which a refinement may neither set nor change (another alphabet is another instance). Unknown facet names are errors: `!integer ^ { minimum: 1 }` is the JSON Schema spelling and is refused; TSON says `min`. Bounds come in pairs of alternatives: `min` *or* `exclusive_min`, `max` *or* `exclusive_max`, on every ordered family including the five temporal ones. A `within`/`excluding` pair must admit at least one value. `members` gives a **sparse** set where `min`/`max` give a range and `multiple_of` a progression: `!integer ^ { members: [2 3 5 7] }`, on `integer_type` and `decimal_type` only. Which facets a family accepts is in `references/type-families.md` — consult it rather than guessing.


Examples:
```
percent  => !number ^ { min: 0  max: 100  fraction_digits: 2 }
sku      => !text ^ { pattern: "[A-Z]-[0-9]{3}" }
lan_addr => !ipv4 ^ { within: ["192.168.0.0/16"] }
recent   => !datetime ^ { exclusive_min: "2026-01-01T00:00:00Z"  precision: 3 }
```

Chained refinement keeps inherited facets (`bounded_byte => !int8 ^ { min: 0 }` still has `size: 8 bits`). Full documentation: `references/type-families.md`.

## Enums

`status => !enum [OPEN ACTIVE DONE]`. Members are identifiers — unique, at least one. `!enum [1 2 3]` and `!enum ["in progress"]` are schema-load errors: for a sparse numeric set write `!integer ^ { members: [1 2 3] }`, for display strings map at the boundary and write `in_progress`. `true`/`false` are legal members (core's `boolean` is `!enum [true false]`). A field defaults to a member with `status: status ~ OPEN`.

## Choice vs field group

Use a **choice** `(A | B)` when alternatives are distinct *named types*. Data selects the variant with a type annotation (`!email "a@b.c"`), and the tag may be omitted only when the choice is *disjoint* — every variant in a different discrimination class among `boolean`, `number`, `string`, `brace`, `bracket`. `(text | integer)` is disjoint; `(email | phone)` is not (both string-class), so every value must be tagged. A variant may never be `void`. Assert intent with `@disjoint`; the resolver refuses the schema if the assertion is false.

**`@discriminator` and `@rest`** are *checked* annotations — representation directives, verified at schema load, that force nothing in the model and never change what a type admits; TSON text still tags every variant of a non-disjoint choice. Their load-time checks are in `references/declaration-forms.md`.

Use a **field group** when alternatives are distinguished by *label*, share a type, or would need tags anyway:

```
payment => {
  amount: number
  ( card: card_details | bank: bank_details | voucher: text )
  ( note: text | ref: text )?
}
```

A group without `?` is REQUIRED — exactly one member present; with `?`, at most one. Members take a bare type — no `?`, no modifier — and share the record's field namespace. A record whose whole body is one required group is the idiomatic labelled sum, and the shape for a choice over two text-form types that would otherwise need tags. Groups cannot stand at type positions.

## Composition, refinement, subtraction

- **Composition `&`** — parents must contribute *disjoint* field names (a diamond reaching one field twice is an error). The trailing body may add fields or tighten inherited ones, eliding the type (`spec: = "…"`).
- **Refinement `^`** — may only touch existing fields; adding one is an error. States only tighten: REQUIRED→DEFAULT/FIXED ok, DEFAULT→REQUIRED is an error, FIXED is terminal, nothing may *become* OPTIONAL, and fixed values may not change. The source must have a record body — not an alias to a constructor application (`lookup => {text => integer}` is finished), a choice, or a template instantiation.
- **Subtraction `-`** — a removal clause on a construction head; the *whitespace before `-`* is what makes it work (`account - { password }`, since `account-` lexes as one name). No removal on a `^` head; removing a nonexistent field, or one the same body adds, is an error. The result is not substitutable for its source.
- Parents and refinement sources are **named** references — `(a | b) & { … }` or `[x] ^ { … }` are not grammar.
- **Two identities.** A *declared* entry's identity is its **name** — `stock_id => !uuid_type {}` and `other_id => !uuid_type {}` are two types however alike their bodies. A *minted* entry's identity is its **canonical content**, arguments compared after following references, so `box<user_id>` over `user_id => uuid` mints `box<uuid>`'s entry.
- **A reference is a hop, not a rewrite.** Resolved output states a chain as written; a processor collapses it only when compiling readers. Reference, refinement (`!uuid ^ {}` is legal, and is the nominal-subtype spelling) and fresh instance buy different things — `references/declaration-forms.md` compares them.

## Templates

```
container   => <T> { items: [T] }
pair        => <T, U> { first: T  second: U }
vector      => <T, N> [T; N]
retry       => <N> { attempts: int32 ~ N }
result      => <T> ( T | error )
tree        => <T> { value: T  children: [tree<T>]? }
uuid_pair   => <B> pair<uuid, B>
```

(`uuid_pair` is a partial application; it re-declares its open parameter `B`.)

Rules: every use supplies all arguments (bare `container` is an error); every declared parameter is used; a parameter is a type parameter or a value parameter, never both, the kind inferred from use — **one with no kind-determining use is a type parameter**, not an error; a parameter may not shadow a schema type name; value arguments are scalars; no bounds, no arithmetic; recursion passes parameters through unchanged (`tree<T>`, not `tree<[T]>`); a parameterised atom refinement does not exist — write `<N> !integer_type { min: N }`. Every recursive type needs a terminating path; `item => { inner: item }` is refused at load. Details: `references/templates.md`.

## Annotations

An annotation is a *type* in the namespace of the document's governing target — inside a schema document, the **meta-schema's**. Under `meta.tn`: `@doc`, `@title`, `@examples`, `@deprecated`, `@since`, `@todo`, `@lang`, `@ordered`, `@bounded`, `@exact`, `@numeric`, `@disjoint`, `@read_only`, `@write_only`, `@discriminator`, `@rest`. The criterion: an annotation never changes a value, its type, or its validity; it may add a load-time check, and may direct how a class of encodings represents a value. A user schema cannot use its own declared types as annotations on itself; those are declared in an extension meta-schema.

For **data documents**, annotations resolve against the user schema's namespace (locals + imports). Core supplies `doc`, `documentation` and `annotation`. To let data write `@expires:"2026-12-31"` or a bare `@internal`, declare them:

```
expires  => @annotation text
internal => @annotation void
```

`expires` takes a value (`@expires:"2026-12-31"`); `internal`, targeting `void`, is a bare marker (`@internal`).

Under a schema an unresolvable annotation is an error, not ignored. Placement: before a declaration name it annotates the *entry*, after `=>` the *definition*, before a field name the field.

## Data under a schema

- The data document writes `!!schema:"…"` then annotates its root: `!task { … }` — the directive names a namespace, not a root type.
- Built-in `!uuid`-style annotations do **not** apply here; those names work only because core is imported.
- **Base type resolution does not apply under a schema.** Atom positions parse by the declared type, so `true` and `42` mean whatever the field type says. There is no `null`; `void` admits `_` alone.
- **The root names its type or the document is invalid.** A schemaless document opens no schema scope: a nested `!!schema` in a document with no `!!schema` of its own is a validation error.
- Omitted defaulted/fixed fields are injected on decode; an explicit `_` at a required-family field is an error. Optional fields are never injected.

The rest — subtype admission, empty braces, the `scoped` cells, the absent-sentinel table and this layer's
error categories — is in `references/data-under-schema.md`.

## Converting from another schema language

JSON Schema, OpenAPI, TypeScript and Protobuf map construct by construct: `references/converting.md`
carries the table. The judgement it cannot make: do not fake a feature the source has and TSON lacks
(open records, regex-keyed properties, conditional schemas, parameter bounds) — say so and pick the
nearest honest shape.

## Complete example

```
!!id:"https://example.com/task.tn"
!!meta:"https://tson.io/2026/35/m/meta.tn"
!!import:"https://tson.io/2026/35/m/core.tn"
@doc:"Task-tracking example schema."
{
  priority => !integer ^ { min: 1  max: 5 }
  status   => !enum [OPEN ACTIVE DONE]
  flagged  => <T, N> { entry: T  priority: priority ~ N }
  task => {
    id:       uuid
    title:    non_empty_text
    priority: priority ~ 3
    status:   status ~ OPEN
    due:      date?
    tags:     [text]?
    history:  [flagged<status, 2>]?
  }
}
```

and a conforming document — `priority` omitted (defaulted, so injected) and `due` omitted (optional, so not):

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

Names most often reached for that do not exist, then the commonest structural slips. The full table is
`references/pitfalls.md`; read it before handing over a schema.

| You wrote | Problem | Write instead |
|---|---|---|
| `int`, `string`, `bool`, `float`, `double`, `str`, `timestamp`, `binary` | not core names | `integer`/`int32`, `text`, `boolean`, `float64`, `datetime`, `bytes` |
| `!binary BASE64`, `base64`, `hex` | no such constructor or core type | `bytes`, or `!bytes_type { encoding: HEX }` for another alphabet |
| `unknown`, `!extern { schema: "…" }` | no such core type or constructor | `dynamic`; `extern_of<"…">` / `extern_type<"…", t>` |
| `~ record_body` to declare a constructor | there is no constructor marker | declare it under the meta-kernel; applicability is IS-A `top` |
| `!set { element_type: text }` | the constructor is `set_type` | `set<text>` |
| no `!!import` of core, then `name: text` | `text` unresolved — kernel types are not field types | add `!!import:"https://tson.io/2026/35/m/core.tn"` |
| `age => integer { min: 0 }`, `age => integer ^ { min: 0 }` | atom refinement needs `!` | `age => !integer ^ { min: 0 }` |
| `employee => person { dept: text }` | no operator | `person & { dept: text }` |

## Reference files

- `references/type-families.md` — every atom family: constructor, core instances, facets, ordering/exactness, and the container constructors (`!array`, `!map`, `!set_type`, `!tuple`, `!choice`, `!scoped`, `!bytes_type`).
- `references/declaration-forms.md` — the operations in depth: canonical form, field-state transitions, per-facet tightening, composition, subtraction, field groups, disjointness, the checked annotations.
- `references/templates.md` — parameters, held bodies, substitution, materialisation, recursion, productivity.
- `references/data-under-schema.md` — text-encoding rules for governed data (Part 2 §7), the absent-sentinel table, the `scoped` cells.
- `references/converting.md` — mappings from JSON Schema, OpenAPI, TypeScript and Protobuf.
- `references/extension-meta-schemas.md` — writing a meta-schema of your own: declaring constructors, base kinds, the `data` kind, `type_ref` slots, annotations for governed schemas, the mixin pattern.
- `references/pitfalls.md` — every mistake this skill has seen, with the fix. Read before delivering.
- `references/grammar.md` — schema ABNF, disambiguation, adjacency, error categories, name hygiene, resource limits.
- `references/core.tn`, `references/meta.tn`, `references/meta-kernel.tn` — the library documents themselves, and the best examples of idiomatic style.

## Implementations

Two implementations will check work this skill produces:
[Java](https://github.com/litterat/ltr8-io-tson-java) and
[TypeScript](https://github.com/litterat/ltr8-io-tson-typescript), the parser behind tson.io's live
validator. Language-specific guidance belongs with those projects.
