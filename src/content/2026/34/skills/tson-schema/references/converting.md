# Converting from JSON Schema, OpenAPI, TypeScript, Protobuf

Construct-by-construct mappings, for when the task starts from an existing schema or type
definition rather than from a domain.

| Source | TSON |
|---|---|
| `type: object`, `properties`, `required` | `{ … }`; unlisted-in-`required` → `?`; `additionalProperties: true` → a map field or `unknown` (records are always closed) |
| `minimum`/`maximum`/`exclusiveMinimum` | `min`/`max`/`exclusive_min` via `!integer ^ { }` or `!number ^ { }` |
| `minLength`/`maxLength`/`pattern` | `min_length`/`max_length`/`pattern` via `!text ^ { }` |
| `minItems`/`maxItems`/`uniqueItems` | `[T; N..M]`; unique → `!set { element_type: T }` |
| `number` / `integer` | `number` / `integer` (JSON numbers are exact; use `float64` only when rounding is intended) |
| `format: uuid/date-time/email/uri/ipv4` | `uuid`, `datetime`, `email`, `uri`, `ipv4` from core |
| `enum: ["a","b"]` | `!enum [a b]` if members are identifiers; otherwise an atom refinement or documented mapping |
| `const`, `default` | `= value`, `~ value` |
| `nullable` / `T \| null` / `Optional[T]` | `field: T?` (absent, not null). Use `void` only for a field that means "no value" |
| `oneOf` of distinct types | `(a \| b)` — check disjointness; else a field group |
| `oneOf` by discriminator field / tagged union | a field group, or a choice with mandatory tags |
| `allOf` | `a & b & { … }` (fields must not overlap) |
| `$ref` | a named declaration |
| TypeScript `Pick`/`Omit` | `^` (fix/narrow) / `-` removal |
| generics `Box<T>`, `Result<T, E>` | templates |
| OpenAPI `components/schemas` | ordinary declarations, in a schema the description imports |
| OpenAPI `paths` / operations | not expressible in a user schema: an operation is not a type. Write (or use) an extension meta-schema declaring `operation => ~data & { … }` with `type_ref` slots, and a description schema governed by it — `extension-meta-schemas.md` |
| `operationId`, `description`, `deprecated` | the entry's name; `@doc:"…"` before the entry; `@deprecated:"…"` from `meta.tn` |
| `requestBody` / `responses.<status>.content.schema` | `type_ref` slots on the operation, naming declared types; a status is a value slot (`status_code => !integer ^ { min: 100  max: 599 }`) or a fixed field on the error type (`sku_not_found => problem & { status: = 404 … }`) |
| `parameters` (path/query/header) | a record of `name`, location enum, `type: type_ref`, `required` — scalars only, and nothing enforces that |
| Protobuf `repeated`, `map<K,V>`, `oneof`, `optional` | `[T]`, `{K => V}`, field group, `?`; `int32/uint64/bytes` → `int32`/`uint64`/`base64` |

Do not fake a feature the source has and TSON lacks (open records, regex-keyed properties, conditional schemas, parameter bounds) — say so and choose the nearest honest shape.
