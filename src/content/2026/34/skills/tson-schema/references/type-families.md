# Type families, constructors and facets

Condensed from `meta-kernel.tn`, `meta.tn` and `core.tn` (2026 Revision 34). A **constructor** (declared with `~` in a meta-schema) carries a family's constraint vocabulary; a **core instance** is `!constructor {}` — the unconstrained member you refine with `!instance ^ { facets }`. User schemas refine instances; they do not apply atom constructors directly unless they deliberately want a *fresh, unrelated* family (`dogs => !integer_type {}` has no relation to `integer`).

Bounds are written as **field groups**: per side, either the inclusive form (`min`, `max`) or the exclusive form (`exclusive_min`, `exclusive_max`), never both. `min > max` is a schema-load error.

## Numeric

### `integer_type` → `integer` (kernel; core re-declares `integer`)

| Facet | Type | Meaning |
|---|---|---|
| `size` | `{ bits: integer  signed: boolean }` | fixed two's-complement width; absent = arbitrary precision. Derives the range: signed n-bit `[-2^(n-1), 2^(n-1)-1]`, unsigned `[0, 2^n-1]`. A bound outside that range is an error |
| `min` / `exclusive_min` | integer | lower bound |
| `max` / `exclusive_max` | integer | upper bound |
| `multiple_of` | integer | step |

Core instances: `integer`; `int8 int16 int32 int64 int128 int256`; `uint8 … uint256` (via `size`); `positive_integer` (`min: 1`), `non_negative_integer` (`min: 0`), `negative_integer` (`max: -1`), `non_positive_integer` (`max: 0`). All `@ordered:TOTAL @exact:true`. Data forms: decimal or based integers, optional sign, `_` separators.

### `decimal_type` → `number` (meta)

The exact tier — SQL DECIMAL, ISO 11404 `scaled` radix 10 — and the JSON `number` mapping. Preserved as written; equality safe; ordering TOTAL.

| Facet | Meaning |
|---|---|
| `min`/`exclusive_min`, `max`/`exclusive_max` | bounds (value-typed: write them as numbers) |
| `multiple_of` | exact step (`0.05` admits nickel steps only) |
| `total_digits` | total significant digits (SQL precision) |
| `fraction_digits` | digits after the point (SQL scale). `fraction_digits: 2` admits any hundredth; `multiple_of: 0.05` is stricter |

Not accepted: `.inf`, `.nan`.

### `float_type` → `float32`, `float64` (meta)

Approximate tier: the value is rounded onto the IEEE 754-2019 grid named by `format` (ties-to-even); precision loss is expected. Ordering PARTIAL (NaN), `@exact:false`.

| Facet | Meaning |
|---|---|
| `format` | `BINARY16 BINARY32 BINARY64 BINARY128 BINARY256 DECIMAL32 DECIMAL64 DECIMAL128` — the decimal formats are base-10 *floating point*, still approximate. Set by core for `float32`/`float64`; a selector, so a refinement cannot change it |
| `min`/`exclusive_min`, `max`/`exclusive_max` | checked on the value as written, before rounding; do not bound the specials |
| `allow_nan`, `allow_infinity`, `allow_subnormal`, `allow_negative_zero` | default `true`; may be tightened to `false` |

There is deliberately **no `multiple_of`** — a step cannot hold on a binary grid. Use `number`.

### `rational_type` → `rational` (meta)

Exact ℚ. Facets: `min`/`exclusive_min`, `max`/`exclusive_max`, `multiple_of`. Constraints apply to the value (`"2/4"` and `"1/2"` are equal), the token is preserved. Data values are always quoted (`/`).

### `complex_type` → `complex` (meta)

One facet, `component: INTEGER | NUMBER | RATIONAL | FLOAT32 | FLOAT64` (default `NUMBER`). Exactness follows the component. No ordering, so no bounds. `gaussian => !complex ^ { component: INTEGER }`.

## Text family (`text_type`, kernel)

| Facet | Meaning |
|---|---|
| `min_length`, `max_length`, `length` | in code points |
| `pattern` | I-Regexp (RFC 9485) — the interoperable subset: no back-references, no look-around, no `\d` shorthand outside the defined set; anchored to the whole value |

Core instances: `text`, `non_empty_text` (`min_length: 1`).

Spec-bound sub-families compose `~text_type & atom_specification`, so they inherit all four facets and add a pinned `spec`:

| Constructor → instance | Extra facets | Notes |
|---|---|---|
| `uri_type` → `uri` | `scheme: text?` | RFC 3986 |
| `regex_type` → `regex` | — | RFC 9485 I-Regexp |
| `email_type` → `email` (meta) | — | dot-atom `@` dot-atom only |

`spec` is fixed (`=`) in each constructor; a refinement must not restate it with a different value.

## Temporal (meta)

| Constructor → instance | Facets | Ordering |
|---|---|---|
| `date_type` → `date` | `min`, `max` | TOTAL |
| `time_type` → `time` | `min`, `max`, `precision` | PARTIAL (offsets) |
| `datetime_type` → `datetime` | `min`, `max`, `precision` | PARTIAL |
| `duration_type` → `duration` | `min`, `max` | PARTIAL (calendar units) |

`precision: N` — at most N fractional-second digits on the written token (a validation bound, not truncation); `precision: 0` forbids a fraction. There is no timezone facet: RFC 3339 already mandates the offset. Bound values are written as the atom's own text, quoted where the content needs it: `min: "2026-01-01T00:00:00Z"`.

## Identifier and network (meta)

| Constructor → instance | Facets |
|---|---|
| `uuid_type` → `uuid` | `version: integer?` |
| `ipv4_type` → `ipv4` | `within: [cidr text]?`, `excluding: [cidr text]?` — inside at least one `within` (if present) and no `excluding` |
| `ipv6_type` → `ipv6` | same |
| `cidr4_type` → `cidr4` | `min_prefix`, `max_prefix` (0–32), `within` (subnet-of), `excluding` (no overlap) |
| `cidr6_type` → `cidr6` | same, 0–128 |
| `mac_type` → `mac` | none |

CIDR lists are quoted strings: `within: ["10.0.0.0/8" "192.168.0.0/16"]`.

## Binary (meta)

`binary => ~atom & atom_specification & { encoding: binary_encoding  min_length: integer?  max_length: integer? }`, `binary_encoding => !enum [BASE64 BASE64URL BASE32 HEX]`.

Core instances: `base64 => !binary BASE64`, `base64url`, `base32`, `hex` (positional form — `encoding` is the single required field). `encoding` is a selector: a refinement may not change it. `thumb => !base64 ^ { max_length: 65536 }` — lengths are in *encoded* characters.

## Unit atoms (kernel; `unit` constructor)

- `value` — the escape hatch: whatever base type resolution produces (null, boolean, integer, float, string). Not narrowable. Used by the meta layer for value-typed facets and available to user schemas for "some scalar".
- `identifier` — a name (identifier grammar, NFC). Not for data values.
- `void` — the only value is `_` (`null` accepted as a spelling). Target for bare annotations; a field typed `void` means "no value here". Core re-declares `void` so data documents can reach it.

## Enumerations

`enum => ~atom & { members: enum_set }`, `enum_set => !set { element_type: identifier  min_items: 1 }`. Members are identifiers, unique, at least one. Positional form: `!enum [A B C]`. Refinement of an enum may only *shrink* the member set: `open_states => !status ^ { members: [OPEN ACTIVE] }`. Discrimination class of an enum is its members' shared class (`[true false]` boolean; `[A B]` string; mixed → none).

Core: `boolean => !enum [true false]`.

## Sums (meta / kernel)

| Constructor | Fields | Notes |
|---|---|---|
| `choice` (kernel) | `variants: [type_ref]` | sugar `(A \| B)`; two or more; no `void` variant; `disjoint` derived |
| `extern` (meta) | `schema: uri`, `types: [type_name]?` | values from a foreign schema; data carries `!!schema` + `!type` |
| `unknown_type` (meta) → `unknown` (core) | none | any well-formed value of any type |

## Products (kernel)

| Constructor | Fields | Sugar |
|---|---|---|
| `record` | `fields: [record_field]`, `groups: [field_group]?`, `supertypes: [type_name]?` | `{ … }` |
| `array` | `element_type: type_ref`, `state: REQUIRED\|OPTIONAL ~ REQUIRED`, `unordered ~ false`, `unique_items ~ false`, `min_items?`, `max_items?` | `[T]`, `[T; N..M]`, `[T?]` |
| `set` (`~array ^`) | `state = REQUIRED`, `unordered = true`, `unique_items = true` | none — `!set { element_type: T  min_items: 1 }` |
| `map` | `key_type`, `value_type`, `state ~ REQUIRED`, `min_items?`, `max_items?` | `{K => V}`, `{K => V?; 1..}` |
| `tuple` | `elements: [{ element_type  state }]` | `[T, U?]` |

Explicit constructor applications are legal as declaration bodies (`lookup => !map { key_type: text  value_type: integer }`) and are the only way to reach `set` or a composite map key type.

## Which core names exist

Numeric: `integer int8 int16 int32 int64 int128 int256 uint8 uint16 uint32 uint64 uint128 uint256 positive_integer non_negative_integer negative_integer non_positive_integer number rational complex float32 float64`.
Text: `text non_empty_text regex uri email`.
Binary: `base64 base64url base32 hex`.
Temporal: `date time datetime duration`.
Identifier/network: `uuid ipv4 ipv6 cidr4 cidr6 mac`.
Other: `boolean void unknown`.
Annotation types for data documents: `annotation documentation doc alias`.

Names that do **not** exist in core: `string str int float double bool bytes binary timestamp decimal url ip any null list array map record object`.

## Annotation types available to schema documents (from `meta.tn`)

`@doc:"…"` (and `@documentation`), `@deprecated:"…"`, `@since:"…"`, `@todo:"…"`, `@lang:"en"`, `@ordered:NONE|PARTIAL|TOTAL`, `@bounded:true|false`, `@exact:true|false`, `@numeric` (bare), `@disjoint` (bare, on a choice), `@alias:"…"` and `@synthetic` (resolver-attached; do not write them).
