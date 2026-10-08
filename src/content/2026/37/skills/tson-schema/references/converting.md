# Converting from JSON Schema, OpenAPI, TypeScript, Protobuf

Construct-by-construct mappings, for when the task starts from an existing schema or type
definition rather than from a domain.

| Source | TSON |
|---|---|
| `type: object`, `properties`, `required` | `{ … }`; listed in `required` → unmarked name (`a: T`); not listed → `?` on the name (`a?: T`); `additionalProperties: true` → a map field (`extras?: {text => dynamic}`) — records are always closed |
| `minimum`/`maximum`/`exclusiveMinimum` | `min`/`max`/`exclusive_min` via `!integer ^ { }` or `!number ^ { }`. Core has no sign-bounded integer: `minimum: 0` is a named `count => !integer ^ { min: 0 }` of your own |
| `minLength`/`maxLength`/`pattern` | `min_length`/`max_length`/`pattern` via `!text ^ { }`; `minLength: 1` is your own `title_text => !text ^ { min_length: 1 }` (core has no `non_empty_text`) |
| `minItems`/`maxItems`/`uniqueItems` | `[T; N..M]`; unique → `set<T>`, which admits `[]`; unique with `minItems: 1` → a named `!set_type { element_type: T  min_items: 1 }` |
| `prefixItems` (fixed tuple) | `[T, U]`; one item → `tuple1<T>` (`[T]` is an array) |
| `number` / `integer` | `number` / `integer` (JSON numbers are exact; use `float64` only when rounding is intended) |
| `format: uuid/date-time/email/ipv4` | `uuid`, `datetime`, `email`, `ipv4` from core |
| `format: uri` / `uri-reference` / `iri` / `iri-reference` | `uri` (scheme required, US-ASCII) / `uri_reference` (relative admitted) / `iri` / `iri_reference`; an allowed-schemes list → `!uri ^ { schemes: [https] }` |
| `enum: ["a","b"]` | `!enum [a b]` if members are identifiers (a vocabulary of names); otherwise `!text_enum ["lightly active" …]`; numeric enums → `!integer ^ { members: [ … ] }`; mixed → a choice of the two |
| `const`, `default` | `const` on a required property → `a: T = v` (a marker the document writes); on an optional one → `a?: T = v`; `default` → `a?: T ~ v` |
| `nullable` / `T \| null` | `?` on the **type**: required + nullable → `a: T?`; optional + nullable → `a?: T?`; nullable with a default → `a?: T? ~ v` (omitted → default, `_`/`null` → void). TSON has no `null`; `_` is the void sentinel |
| TypeScript `a?: T`, `a: T \| null`, `a?: T \| null` | `a?: T`, `a: T?`, `a?: T?` — the same three characters |
| `oneOf` of distinct types | `(a \| b)` — check disjointness; else a field group |
| `oneOf` + `discriminator` (propertyName, mapping) / sealed class / Rust enum | an abstract base with a selector: `pet => abstract { pet_type: text =?  … }`, each member `dog => pet & { pet_type: = "dog"  … }`, the position typed `pet`; `mapping` becomes the pins. `final` for a leaf nothing may extend |
| tagged union with no shared base | a field group, or a choice with mandatory tags |
| `anyOf` of `required` sets, `dependentRequired` | field groups: at least one of → `( email: E \| phone: P )+`; `oneOf: [{required: [host, port]}, {required: [socket]}]` → `( host: H  port: P \| socket: S )`; `a` requires `b` → `( b: B  a?: A )?` |
| `allOf` | `a & b & { … }` (fields must not overlap) |
| `$ref` | a named declaration |
| TypeScript `Pick`/`Omit` | `^` (fix/narrow) / `-` removal |
| generics `Box<T>`, `Result<T, E>`; `T extends string` | templates; a constraint → a bound, `<T: text>` (by IS-A only: the argument must refine `text`) |
| OpenAPI `components/schemas` | ordinary declarations, in a schema the description imports |
| OpenAPI `paths` / operations | not expressible in a user schema: an operation is not a type. Write (or use) an extension meta-schema declaring `operation => data & { … }` with `type_ref` slots, and a description schema governed by it — `extension-meta-schemas.md` |
| `operationId`, `description`, `deprecated`, `$comment`, `examples` | the entry's name; `@doc:"…"` (CommonMark) before the entry; bare `@deprecated` (a reason goes in `@doc`); `@comment:"…"`; `@examples:["…"]` as text |
| `requestBody` / `responses.<status>.content.schema` | `type_ref` slots on the operation, naming declared types; a status is a value slot (`status_code => !integer ^ { min: 100  max: 599 }`) or a fixed field on the error type (`sku_not_found => problem & { status: = 404 … }`) |
| `parameters` (path/query/header) | a record of `name`, location enum, `type: type_ref`, `required` — scalars only, and nothing enforces that |
| Protobuf `repeated`, `map<K,V>`, `oneof`, `optional` | `[T]`, `{K => V}`, field group, `?` on the name; `int32/uint64/bytes` → `int32`/`uint64`/`bytes` |
| an object whose key order matters | `!map { key_type: text  value_type: V  ordered: true }` — a map is unordered by default |

Do not fake a feature the source has and TSON lacks (open records, regex-keyed properties, conditional schemas, a bound on how an argument's type was built) — say so and choose the nearest honest shape.
