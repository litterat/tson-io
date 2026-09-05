---
name: tson-schema
description: Author, review, and explain TSON schema documents — `.tn` files with a `!!meta` header and name-to-type declarations that define records, enums, refined atoms with facets like min and max, choices, generic templates with type parameters, field groups, and constraints for the TSON (Typed Schema Object Notation) type system at tson.io. Use this skill whenever the user asks to write a TSON schema, model a domain in TSON, convert a JSON Schema / TypeScript / Protobuf / OpenAPI definition into TSON, add constraints or defaults to TSON types, or diagnose why a TSON schema fails to load or why data fails validation against it. Also use it when the user pastes anything containing `!!meta`, arrow declarations, `^`, `&`, or `~ default` syntax. For plain TSON *data* documents (no `!!meta`), use the tson-data skill.
---

# TSON schema documents

A TSON schema is a data document of a special kind: a header naming the meta-schema that governs it, then one braced map of `name => type-definition` declarations. Published schemas are immutable and hash-pinned, and a data document binds one with `!!schema:"…"`; every `!name` in that data then resolves against the schema. This skill covers *TSON Part 2: Type System and Schema*, 2026 Revision 35, together with the three bundled library files (`references/meta-kernel.tn`, `meta.tn`, `core.tn`).

Read `references/core.tn` when you need to know which named types exist to build with (`text`, `integer`, `uuid`, `date`, `int32`, `non_empty_text`, …), and `references/meta.tn` / `meta-kernel.tn` when you need the exact constraint fields a family accepts. `references/type-families.md` condenses both.

> Revision note: identifiers such as `https://tson.io/2026/35/m/meta.tn` carry the revision number. A new revision changes every such URL and every pin. Never invent a `?sha256=` digest — compute it with the tson-data skill's `pin.py`, copy one from a real file, or leave the reference unpinned.

## Workflow

1. **Header.** Three directives, this order, each on its own line, `:` glued to the name:
   ```
   !!id:"https://example.com/task.tn"
   !!meta:"https://tson.io/2026/35/m/meta.tn"
   !!import:"https://tson.io/2026/35/m/core.tn"
   ```
   `!!id` is optional in the grammar but required to publish; `!!meta` appears exactly once; `!!import` repeats. Almost every schema imports core: without it `text`, `integer`, `uuid` and friends are **not in scope** (in a user schema the kernel's types arrive only as `!` constructor targets, never as field types; a meta-schema is the exception — `references/extension-meta-schemas.md`). Schema documents never carry `!!schema`.
2. **Annotations on the schema**, if any, go between the header and the opening brace: `@doc:"…"`.
3. **Declarations** — pick the form from the table below for each type. Declare a named type for every constrained atom and every bare record; the only things allowed inline at a field position are named references and the container sugar (`[T]`, `[T, U]`, `(A | B)`, `{K => V}`, `name<args>`).
4. **Self-check** against the pitfalls below and the full table in `references/pitfalls.md`, then write a small data document (tson-data skill) that instantiates the root type to confirm the shape reads as intended.

## Declaration forms

Everything right of `=>` is a type definition. Decide by what you are making:

| You want | Form | Example | IS-A? |
|---|---|---|---|
| a new record | `{ fields }` | `person => { name: text  age: integer }` | none |
| a record extending others | `A & B & { more }` | `employee => person & contact & { dept: text }` | yes, each parent |
| a record tightened (values fixed/defaulted, fields narrowed) | `T ^ { fields }` | `production => config ^ { host: = "prod.example.com" }` | yes, `T` |
| a record with fields removed | `T - { names }`, `A & { … } - { names }` | `account_public => account - { password }` | **no** (lineage kept) |
| a constrained atom | `!I ^ { facets }` | `age => !integer ^ { min: 0  max: 150 }` | yes, `I` |
| an enum | `!enum [members]` | `status => !enum [OPEN ACTIVE DONE]` | none |
| a fresh atom family (rare) | `!constructor { }` | `dogs => !integer_type {}` — unrelated to `integer` | none |
| an alias | `name` | `id => uuid` | reference, flattened |
| a container as its own type | sugar | `tags => [text]`, `scores => [integer; 1..]`, `point => [number, number]`, `index => {text => [order]}` | none |
| a union by type | `(A \| B)` | `contact => (email \| phone \| address)` | sum |
| a union by label | single field group | `stamp => { ( created: datetime \| modified: datetime ) }` | product |
| a generic | `<P, …> body` | `pair => <T, U> { first: T  second: U }` | per body |
| binary | `!binary ENC` | `avatar => !binary BASE64` | none |
| any value | `unknown` (core) or `value` | `payload: unknown` | — |
| a value from another schema | `!extern { schema: "…" types: [a b]? }` | `attachment => !extern { schema: "https://…/claim.tn" }` | sum |

`name { … }` with no operator is a parse error — write `^` or `&`. A `~` before the body declares a *constructor* and is legal only in a meta-schema (a document whose `!!meta` is the kernel); user schemas never write it. To declare a vocabulary of your own — an HTTP operation, a method, anything a schema should be able to write after `!` — see `references/extension-meta-schemas.md`.

## Records and field states

```
config => {
  @doc:"REQUIRED"                                           host:   text
  @doc:"REQUIRED_DEFAULT: injected when omitted, overridable" port:   integer ~ 8080
  @doc:"REQUIRED_FIXED: must be this value; injected when omitted" debug:  boolean = false
  @doc:"OPTIONAL"                                           label:  text?
  @doc:"OPTIONAL_FIXED: if present must be json; never injected" format: text? = json
  @doc:"OPTIONAL_FIXED with no value: may not carry a value" legacy: text? = _
}
```

(The `@doc` annotations above are real TSON — the only way to comment a schema. `;`, `#` and `//` are not comments: `;` is the size-specifier separator and the other two are lexer errors. The TSON specification's own listings use `;` for commentary, but that is ABNF convention, not TSON.)

Fields separate by whitespace or comma; names are identifiers (no leading digit, no leading `_`); no trailing comma. Presence is the `?` suffix on the type; mutability is the modifier. Three combinations are resolver errors: `~ _` anywhere, `= _` on a required field, and `type? ~ value` (a default implies presence — use `type ~ value`).

Modifier values are **single scalar tokens** (numbers, quoted strings, identifiers such as enum members, `true`/`false`/`null`) and only on fields whose type is an atom or an enum. No default for a record, array, map, choice, or tuple field, and no compound values (`~ [1 2]` is a parse error). A default is parsed by the field's type at schema load, so `int32 ~ "nope"` fails there.

Records are **closed**: data may contain only declared fields. There is no `additionalProperties` and no open-record switch; put free-form content in a map field (`extra: {text => unknown}?`).

Field annotations go before the field name: `@doc:"…" @deprecated:"use email" phone: text?`.

## Type expressions (usable at every type position)

| Form | Meaning |
|---|---|
| `[T]` | array of T, any length |
| `[T; N]` | exactly N elements; `[T; N..M]`, `[T; N..]`, `[T; ..M]` bounded (`0..` is an error — write `[T]`) |
| `[T?]` | elements may be `_` |
| `[T, U, V]` | tuple — fixed length, two or more positions, `[T, U?]` for an optional position (slot still present, filled with `_`) |
| `(A \| B)` | choice, two or more named variants |
| `{K => V}` | map; `{K => V; 1..}` sized; `{K => V?}` values may be `_`; key is a simple name |
| `name<arg, arg>` | template application — every parameter must be supplied |
| `T?` on a field | field optional — distinct from `[T?]`, so `xs: [T?]?` is "optional field of an array whose elements may be absent" |

A single bracketed type is always an array, never a one-tuple; `[text,]` is a parse error. Nesting is free: `[[pixel; 3]; 3]`, `{text => [order; 1..]}`.

**Sets** have no sugar: `unique_tags => !set { element_type: text }`. Sets reject duplicates at validation and reject `_` elements.

## Atoms and facets

Core supplies the instances; each has a constructor whose fields are the facets you may tighten with `!instance ^ { … }`. Facets only ever narrow: bounds move inward, member sets shrink, a selector (`size`, `encoding`, `format`, `component`) can be set once and never changed. Unknown facet names are errors — `!integer ^ { minimum: 1 }` is refused, which is the JSON Schema spelling; TSON says `min`. Bounds come in pairs of alternatives: `min` *or* `exclusive_min`, `max` *or* `exclusive_max`. Which facets each family accepts is tabulated in `references/type-families.md` — consult it rather than guessing a name.


Examples:
```
percent    => !number ^ { min: 0  max: 100  fraction_digits: 2 }
sku        => !text ^ { pattern: "[A-Z]-[0-9]{3}" }
port       => !uint16 ^ { min: 1024 }
lan_addr   => !ipv4 ^ { within: ["192.168.0.0/16"] }
recent     => !datetime ^ { min: "2026-01-01T00:00:00Z"  precision: 3 }
```

Chained refinement keeps inherited facets (`bounded_byte => !int8 ^ { min: 0 }` still has `size: 8 bits`). Full facet documentation with each family's semantics: `references/type-families.md`.

## Enums

`status => !enum [OPEN ACTIVE DONE]`. Members are identifiers — names, unique, at least one. `!enum [1 2 3]` and `!enum ["in progress"]` are schema-load errors: for numeric codes use `!integer ^ { min: 1  max: 3 }`; for display strings map at the boundary and use `in_progress`. `true`/`false` are legal members (core's `boolean` is `!enum [true false]`). A field defaults to a member with `status: status ~ OPEN`.

## Choice vs field group

Use a **choice** `(A | B)` when alternatives are distinct *named types*. Data selects the variant with a type annotation (`!email "a@b.c"`), and the tag may be omitted only when the choice is *disjoint* — every variant has a different discrimination class among `boolean`, `number`, `string`, `brace` (record/map), `bracket` (array/tuple). `(text | integer)` is disjoint; `(email | phone)` is not (both string-class), so every value must be tagged. A variant may never be `void` — optionality is `?` on the position, not a variant. Assert intent with `@disjoint` before the declaration; the resolver refuses the schema if the assertion is false.

Use a **field group** when alternatives are distinguished by *label*, may share a type, or the choice would need tags anyway:

```
payment => {
  amount: number
  ( card: card_details | bank: bank_details | voucher: text )
  ( note: text | ref: text )?
}
```

The first group is REQUIRED — exactly one member present; the second, with `?`, is OPTIONAL — at most one.

Members take a bare type — no `?`, no modifier — and share the record's field namespace. A record whose whole body is one required group is the idiomatic labelled sum. Groups cannot stand at type positions; repeat alternatives with an array of a named choice.

## Composition, refinement, subtraction — the rules that bite

- **Composition `&`** — parents must contribute *disjoint* field names (a diamond that reaches the same field twice is an error). The trailing body may add new fields or tighten inherited ones; tightening entries may elide the type (`spec: = "…"`).
- **Refinement `^`** — may only touch existing fields; adding one is an error. State transitions only tighten: REQUIRED→REQUIRED_DEFAULT/FIXED ok; REQUIRED_DEFAULT→REQUIRED is an error (a default cannot be removed); FIXED is terminal; OPTIONAL may become anything, but nothing may become OPTIONAL. Fixed values may not change. Sources must have a record body — you cannot refine an alias to a constructor application (`lookup => {text => integer}` is finished; write the bounds on the sugar instead), a choice, or a template instantiation.
- **Subtraction `-`** — a removal clause on a construction head. It is the *whitespace before `-`* that makes it work: `account - { password }`. `account- { password }` lexes `account-` as one name. No removal on a `^` head. Removing a nonexistent field, or a field the same body adds, is an error. The result is not substitutable for its source.
- Parents and refinement sources are **named** references — `(a | b) & { … }` or `[x] ^ { … }` are not grammar.

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

Rules: every use supplies all arguments (`container<text>`; bare `container` is an error); every declared parameter is used (unused is an error); a parameter is either a type parameter or a value parameter, never both; a parameter may not shadow a schema type name (rename it); value arguments are scalars; there are no parameter bounds and no arithmetic; recursion must pass parameters through unchanged (`tree<T>`, not `tree<[T]>`); a parameterised atom refinement (`<N> !integer ^ { min: N }`) does not exist — use the constructor form `<N> !integer_type { min: N }`. Every recursive type needs a terminating path (`children: [tree<T>]?` or an optional/choice route); `item => { inner: item }` is refused at load. Details and the materialisation model: `references/templates.md`.

## Annotations

An annotation is a *type* in the namespace of the document's governing target, resolved one hop. Inside a schema document that means the **meta-schema's** namespace: `@doc`, `@deprecated:"…"`, `@since:"…"`, `@todo:"…"`, `@lang:"…"`, `@ordered:TOTAL`, `@bounded:true`, `@exact:true`, `@numeric`, `@disjoint` are available under `meta.tn`. A user schema cannot use its own declared types as annotations on itself; an annotation for schema documents is declared in an extension meta-schema (`references/extension-meta-schemas.md`).

For **data documents**, annotations resolve against the user schema's namespace (locals + imports). Core supplies `doc`, `documentation`, `annotation`, `alias`. To let data documents write `@expires:"2026-12-31"` or a bare `@internal`, declare them in the schema:

```
expires  => @annotation text
internal => @annotation void
```

`expires` takes a value (`@expires:"2026-12-31"`); `internal`, targeting `void`, is a bare marker (`@internal`).

Under a schema an unresolvable annotation is an error, not ignored.

Placement inside a schema: before a declaration name it annotates the *entry*; after `=>` it annotates the *definition*; before a field name it annotates the field.

## Data under a schema — what the schema author must anticipate

- The data document writes `!!schema:"…"` then annotates its root: `!task { … }`. The directive names a namespace, not a root type; an unannotated root cannot be validated.
- Built-in `!uuid`-style annotations do **not** apply under a schema; the same names work only because the schema imports core.
- Atom positions parse by the declared type, so `true`, `null`, `42` mean whatever the field type says. `null` is accepted only at a `void`-typed position, as a spelling of `_`.
- Omitted defaulted/fixed fields are injected on decode; an explicit `_` at a required-family field is an error — omit instead. Optional fields are never injected.

The rest — subtype admission, empty braces, the map separator, `extern`, the absent-sentinel table
and this layer's error categories — is in `references/data-under-schema.md`.

## Converting from another schema language

JSON Schema, OpenAPI, TypeScript and Protobuf constructs map to TSON construct by construct:
`references/converting.md` carries the table. The judgement it cannot make for you: do not fake
a feature the source has and TSON lacks (open records, regex-keyed properties, conditional
schemas, parameter bounds) — say so and choose the nearest honest shape.

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

and a conforming document:

```
!!schema:"https://example.com/task.tn"
!task {
  id:       550e8400-e29b-41d4-a716-446655440000
  title:    "Ship revision 35"
  priority: 3
  status:   OPEN
  due:      2026-08-01
  tags:     [spec editorial]
  history:  [{ entry: OPEN }  { entry: ACTIVE  priority: 4 }]
}
```

## Pitfalls — check before delivering

The eight most common. The full table — every mistake this skill has seen, with the fix — is
`references/pitfalls.md`; read it before handing over a schema.

| You wrote | Problem | Write instead |
|---|---|---|
| no `!!import` of core, then `name: text` | `text` unresolved — kernel types are not field types | add `!!import:"https://tson.io/2026/35/m/core.tn"` |
| `!!meta` after `!!import` | order is fixed | `!!id`, `!!meta`, `!!import…` |
| `age => integer { min: 0 }`, `age => integer ^ { min: 0 }` | atom refinement needs `!` | `age => !integer ^ { min: 0 }` |
| `employee => person { dept: text }` | no operator | `person & { dept: text }` |
| `!integer ^ { minimum: 0 }`, `{ maxLength: 5 }` | JSON Schema spellings are unknown facets | `min`, `max_length` |
| `!enum [1 2 3]`, `!enum ["Not Started"]` | members are identifiers | `!integer ^ { min: 1  max: 3 }`; `not_started` |
| `int`, `string`, `bool`, `float`, `double`, `str`, `timestamp`, `bytes` | not core names | `integer`/`int32`, `text`, `boolean`, `float64`, `datetime`, `base64` |
| `; comment`, `# comment`, `// comment` in a schema | no comment syntax (`;` is the size separator; `#` `/` are lexer errors) | `@doc:"…"` before the declaration or field |

## Reference files

- `references/type-families.md` — every atom family: constructor, core instances, facet fields with semantics, ordering/exactness, plus the container constructors' fields (`!array`, `!map`, `!set`, `!tuple`, `!choice`, `!extern`, `!binary`).
- `references/declaration-forms.md` — the operations in depth: canonical form and desugaring, field-state transition table, per-facet tightening rules, composition ordering, subtraction rules, field groups, choice disjointness and tagging.
- `references/templates.md` — parameters, held bodies, substitution, materialisation, recursion and productivity rules.
- `references/data-under-schema.md` — the text-encoding rules for data governed by a schema (Part 2 §7), the absent-sentinel table, extern.
- `references/converting.md` — construct-by-construct mappings from JSON Schema, OpenAPI, TypeScript and Protobuf.
- `references/extension-meta-schemas.md` — writing a meta-schema of your own: `~` constructors, base kinds, the `data` kind and what may not name it, `type_ref` slots, annotations for governed schemas, the mixin pattern for shared vocabulary.
- `references/pitfalls.md` — every mistake this skill has seen, with the fix. Read before delivering.
- `references/grammar.md` — the schema ABNF, disambiguation summary, adjacency table, error categories, name-hygiene at the schema layer.
- `references/core.tn`, `references/meta.tn`, `references/meta-kernel.tn` — the bundled library documents, Revision 35, with real hash pins. Also the best examples of idiomatic schema style.

## Implementations

Two implementations track this revision series:

- **Java** — https://github.com/litterat/ltr8-io-tson-java
- **TypeScript** — https://github.com/litterat/ltr8-io-tson-typescript — the parser behind the live validator on tson.io

Either will check work this skill produces: both parse, resolve and validate documents and report
the diagnostics the specification defines, so a document that looks right is cheap to confirm.
Language-specific guidance — APIs, bindings, build setup — belongs with those projects rather than
in this skill; look there for a `tson-java` or `tson-ts` skill.
