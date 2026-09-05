# Type families, constructors and facets

Condensed from `meta-kernel.tn`, `meta.tn` and `core.tn` (2026 Revision 35). A **constructor** carries a family's constraint vocabulary; it is an entry that IS-A `top`, declarable only by a schema whose own `!!meta` names the meta-kernel. A **core instance** is `!constructor {}` — the unconstrained member you refine with `!instance ^ { facets }`. User schemas refine instances; they do not apply atom constructors directly unless they deliberately want a *fresh, unrelated* family (`dogs => !integer_type {}` has no relation to `integer`).

Bounds are written as **field groups**: per side, either the inclusive form (`min`, `max`) or the exclusive form (`exclusive_min`, `exclusive_max`), never both. `min > max` is a schema-load error.

## Numeric

### `integer_type` → `integer` (kernel; core re-declares `integer`)

| Facet | Type | Meaning |
|---|---|---|
| `size` | `{ bits: non_negative_integer  signed: boolean }` | fixed two's-complement width; absent = arbitrary precision. Derives the range: signed n-bit `[-2^(n-1), 2^(n-1)-1]`, unsigned `[0, 2^n-1]`. A bound outside that range is an error. `bits > 0` is a coherence check |
| `min` / `exclusive_min` | integer | lower bound |
| `max` / `exclusive_max` | integer | upper bound |
| `multiple_of` | integer | step |
| `members` | `integer_member_set` | **sparse** value set: `!integer ^ { members: [2 3 5 7] }` |

Core instances: `integer`; `int8 int16 int32 int64 int128 int256`; `uint8 … uint256` (via `size`); `positive_integer` (`min: 1`), `non_negative_integer` (`min: 0`), `negative_integer` (`max: -1`), `non_positive_integer` (`max: 0`). All `@ordered:TOTAL @exact:true`. The **kernel** declares `non_negative_integer` too: every facet that counts — lengths, item counts, digit counts, bit widths, prefix lengths, precision — is typed by it. Data forms: decimal or based integers, optional sign, `_` separators.

### `decimal_type` → `number` (meta)

The exact tier — SQL DECIMAL, ISO 11404 `scaled` radix 10 — and the JSON `number` mapping. Preserved as written; equality safe; ordering TOTAL.

| Facet | Meaning |
|---|---|
| `min`/`exclusive_min`, `max`/`exclusive_max` | bounds (value-typed: write them as numbers) |
| `multiple_of` | exact step (`0.05` admits nickel steps only) |
| `members` | **sparse** value set, `set<value>`; each element is read under the constrained atom before the set is formed |
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

**Two rules stated once, across `integer_type`, `decimal_type`, `rational_type`, `duration_type` and
`period_type`**: `multiple_of` is strictly positive, the sign of the value is ignored, and a
refinement tightens only to an integer multiple. `members` requires every member to satisfy the body's other
facets (a derived width included), and a refinement may only shrink the set.

### `rational_type` → `rational` (meta)

Exact ℚ. Facets: `min`/`exclusive_min`, `max`/`exclusive_max`, `multiple_of`. Constraints apply to the value (`"2/4"` and `"1/2"` are equal), the token is preserved. Data values are always quoted (`/`).

### `complex_type` → `complex` (meta)

One facet, `component: INTEGER | NUMBER | RATIONAL | FLOAT32 | FLOAT64` (default `NUMBER`). Exactness follows the component. No ordering, so no bounds. `gaussian => !complex ^ { component: INTEGER }`.

`component` is a selector over a **partial order**: `INTEGER ⊂ NUMBER ⊂ RATIONAL` and `FLOAT32 ⊂ FLOAT64`, the two families incomparable, and a refinement may move it only *down*. So `!complex ^ { component: FLOAT64 }` is refused — a float complex is its own instance.

## Text family (`text_type`, kernel)

| Facet | Meaning |
|---|---|
| `min_length`, `max_length`, `length` | in code points |
| `pattern` | I-Regexp (RFC 9485) — the interoperable subset: no back-references, no look-around, no `\d` shorthand outside the defined set; anchored to the whole value |

Core instances: `text`, `non_empty_text` (`min_length: 1`).

Spec-bound sub-families compose `text_type & atom_specification`, so they inherit all four facets and add a pinned `spec`:

| Constructor → instance | Extra facets | Notes |
|---|---|---|
| `uri_type` → `uri` | `scheme: text?` | RFC 3986 |
| `regex_type` → `regex` | — | RFC 9485 I-Regexp |
| `email_type` → `email` (meta) | — | dot-atom `@` dot-atom only |

`spec` is fixed (`=`) in each constructor; a refinement must not restate it with a different value.

## Temporal (meta)

| Constructor → instance | Facets | Ordering |
|---|---|---|
| `date_type` → `date` | `min`/`exclusive_min`, `max`/`exclusive_max` | TOTAL |
| `time_type` → `time` | same, `precision` | **TOTAL** — the value is the UTC time of day |
| `datetime_type` → `datetime` | same, `precision` | **TOTAL** — the value is the instant |
| `duration_type` → `duration` | same, `precision`, `multiple_of` | **TOTAL** — signed exact decimal **seconds** |
| `period_type` → `period` | same, `multiple_of` | **TOTAL** — signed integer **months** |

Every family carries the **exclusive** bound forms as well as the inclusive ones, and every one is totally
ordered — an ordered-bound facet requires a totally ordered value space, which each of these has.

**`time` and `datetime` are instants.** The offset RFC 3339 makes mandatory is a *spelling*:
`2026-01-01T10:00:00+01:00` and `2026-01-01T09:00:00Z` are one value, and `-00:00` is the same instant as
`Z`. The notation preserves the offset as written; equality, ordering and bounds compare the instant.

**`duration` and `period` are two atoms**, split from one ISO 8601 duration. `P1Y2M3DT4H5M6S` is an error
under both; a span that is genuinely both is a record with a field of each. A month has no fixed length
beside a second that has one, which is what makes each totally ordered. A week is 7 days and a day 86400 s,
so the week form belongs to `duration`. A `duration`'s magnitude is at most 2⁶³ − 1 nanoseconds.

`precision: N` — at most N fractional-second digits on the written token (a validation bound, not
truncation); `precision: 0` forbids a fraction, and N is at most 9, which falls out of the `"." 1*9DIGIT`
token rule shared by `time`, `datetime` and `duration`. There is no timezone facet: RFC 3339 already
mandates the offset. Bound values are written as the atom's own text, quoted where the content needs it:
`exclusive_min: "2026-01-01T00:00:00Z"`.

## Identifier and network (meta)

| Constructor → instance | Facets |
|---|---|
| `uuid_type` → `uuid` | `version: integer?` |
| `ipv4_type` → `ipv4` | `within: [cidr text]?`, `excluding: [cidr text]?` — inside at least one `within` (if present) and no `excluding` |
| — | **A `within`/`excluding` pair MUST admit at least one value**, exactly, and a network family's prefix bounds participate in the check |
| `ipv6_type` → `ipv6` | same |
| `cidr4_type` → `cidr4` | `min_prefix`, `max_prefix` (0–32), `within` (subnet-of), `excluding` (no overlap) |
| `cidr6_type` → `cidr6` | same, 0–128 |
| `mac_type` → `mac` | none |

CIDR lists are quoted strings: `within: ["10.0.0.0/8" "192.168.0.0/16"]`.

## Bytes (meta)

`bytes_type => atom & { encoding: bytes_encoding ~ BASE64  length: non_negative_integer?  min_length: non_negative_integer?  max_length: non_negative_integer? }`, with
`bytes_encoding => !enum [BASE64 BASE64URL BASE32 HEX]`.

Core instance: `bytes => !bytes_type { encoding: BASE64 }` — the one binary type; there is no `base64`,
`base64url`, `base32` or `hex`.

**The value is the octets.** Equality, identity, content addressing and the length facets are all over
octets, never over a spelling — `length: 32` is a 32-byte digest whether it arrives as base64 or hex, and
the same octets are `"3q2+7w=="`, `"deadbeef"` and `"3WV37Q======"`.

`encoding` is a **selector with no narrowing relation at all**: a refinement may neither set nor change it.
Another alphabet is another *instance* — `hexdigest => !bytes_type { encoding: HEX }` — because a spelling
narrows nothing, so `hexdigest ^ bytes` would claim an IS-A that no base64 position could honour.

## Unit atoms (kernel; `unit` constructor)

- `value` — the escape hatch: the token, uninterpreted, read by the type the position hands it to. Its inhabitants are boolean, integer, float and string. Base type resolution never reads it, and a `value` position is **not** a scope. Not narrowable. Used by the meta layer for value-typed facets and available to user schemas for "some scalar".
- `identifier` — a name (identifier grammar, NFC). Not for data values.
- `void` — the only value is `_`. Target for bare annotations; a field typed `void` means "no value here". Core re-declares `void` so data documents can reach it.

## Enumerations

`enum => atom & { members: enum_set }`, `enum_set => !set_type { element_type: identifier }`. Members are identifiers, unique, at least one. Positional form: `!enum [A B C]`. Refinement of an enum may only *shrink* the member set: `open_states => !status ^ { members: [OPEN ACTIVE] }`. Discrimination class of an enum is its members' shared class (`[true false]` boolean; `[A B]` string; mixed → none).

Core: `boolean => !enum [true false]`.

## Sums (meta / kernel)

| Constructor | Fields | Notes |
|---|---|---|
| `choice` (kernel) | `variants: [type_ref]` | sugar `(A \| B)`; two or more; no `void` variant; `disjoint` derived |
| `scoped` (meta) | `scope: set<scope_kind>`, `schemas: {uri => [type_name; 1..]?; 1..}?` | open sum: the value names its own type, the instance names where that name resolves. `scope_kind => !enum [LOCAL EXTERN]` |

Core instances of `scoped`:
`declared => !scoped { scope: [LOCAL] }`, `extern => !scoped { scope: [EXTERN] }`,
`dynamic => !scoped { scope: [LOCAL EXTERN] }`, plus the templates
`extern_of => <S> !scoped { scope: [EXTERN]  schemas: { S => _ } }` and
`extern_type => <S, T> !scoped { scope: [EXTERN]  schemas: { S => [T] } }`.
A value naming no type at a scoped position is a validation error.

## Products (kernel)

| Constructor | Fields | Sugar |
|---|---|---|
| `record` | `fields: [record_field]`, `groups: [field_group]?`, `supertypes: [type_name]?` | `{ … }` |
| `array` | `element_type: type_ref`, `state: REQUIRED\|OPTIONAL ~ REQUIRED`, `unordered ~ false`, `unique_items ~ false`, `min_items?`, `max_items?` | `[T]`, `[T; N..M]`, `[T?]` |
| `set_type` (`array ^`) | `state = REQUIRED`, `unordered = true`, `unique_items = true`, `min_items ~ 1` | `set<T>` — the template meta and core each declare. A set is **non-empty by default** |
| `map` | `key_type`, `value_type`, `state ~ REQUIRED`, `min_items?`, `max_items?` | `{K => V}`, `{K => V?; 1..}` |
| `tuple` | `elements: [{ element_type  state }]` | `[T, U?]` |

Explicit constructor applications are legal as declaration bodies (`lookup => !map { key_type: text  value_type: integer }`) and are the way to reach a composite map key type, or a set that may be empty (`!set_type { element_type: T  min_items: 0 }`).

## Which core names exist

Numeric: `integer int8 int16 int32 int64 int128 int256 uint8 uint16 uint32 uint64 uint128 uint256 positive_integer non_negative_integer negative_integer non_positive_integer number rational complex float32 float64`.
Text: `text non_empty_text regex uri email`.
Binary: `base64 base64url base32 hex`.
Temporal: `date time datetime duration period`.
Identifier/network: `uuid ipv4 ipv6 cidr4 cidr6 mac`.
Other: `boolean void unknown`.
Annotation types for data documents: `annotation documentation doc alias`.

Names that do **not** exist in core: `string str int float double bool binary base64 base64url base32 hex timestamp decimal url ip any null unknown list array map record object`. (`bytes`, `period`, `declared`, `extern`, `dynamic`, `extern_of`, `extern_type` and `set` *do* exist.)

## Annotation types available to schema documents (from `meta.tn`)

`@doc:"…"` (and `@documentation`), `@title:"…"`, `@examples:[…]`, `@deprecated:"…"`, `@since:"…"`, `@todo:"…"`, `@lang:"en"`, `@ordered:NONE|PARTIAL|TOTAL`, `@bounded:true|false`, `@exact:true|false`, `@numeric` (bare), `@disjoint` (bare, on a choice), `@read_only` / `@write_only` (bare, never both on one field), `@discriminator:field_name` and `@rest` (bare) — the two *checked* representation directives — and `@synthetic` (resolver-attached; do not write it).
