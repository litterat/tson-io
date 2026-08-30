# Converting from JSON Schema, TypeScript, Protobuf

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
| Protobuf `repeated`, `map<K,V>`, `oneof`, `optional` | `[T]`, `{K => V}`, field group, `?`; `int32/uint64/bytes` → `int32`/`uint64`/`base64` |

Do not fake a feature the source has and TSON lacks (open records, regex-keyed properties, conditional schemas, parameter bounds) — say so and choose the nearest honest shape.
