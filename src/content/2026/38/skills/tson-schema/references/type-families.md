# Type families, constructors and facets

Condensed from `meta-kernel.tn`, `meta.tn`, `core.tn` and `net.tn` (2026 Revision 38). A **constructor** carries a family's constraint vocabulary; it is an entry that IS-A `top`, declarable only by a schema whose own `!!meta` names the meta-kernel. A **core instance** is `!constructor {}` — the unconstrained member you refine with `!instance ^ { facets }`; the network families' instances live in `net.tn`, which a schema imports beside core when it wants them. User schemas refine instances; they do not apply atom constructors directly unless they deliberately want a *fresh, unrelated* family (`dogs => !integer_type {}` has no relation to `integer`).

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

Core instances: `integer`; `int8 int16 int32 int64 int128 int256`; `uint8 … uint256` (via `size`). All `@ordering:TOTAL @exact:true`. Core declares **no** sign-bounded integer: a schema that wants one writes the line itself (`count => !integer ^ { min: 0 }`, `positive => !integer ^ { min: 1 }`). The **kernel** declares `non_negative_integer` for its own use — every facet that counts (lengths, item counts, digit counts, bit widths, prefix lengths, precision) is typed by it — but it is a structure-namespace type, not a field type in a user schema. Data forms: decimal or based integers, optional sign, `_` separators.

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
| `allow_nan`, `allow_infinity`, `allow_subnormal`, `allow_negative_zero` | default `true`; may be tightened to `false`. While `allow_nan` or `allow_infinity` is true the type has **no discrimination class**, so `( float64 \| text )` needs tags; narrow both to `false` to make it disjoint |

There is deliberately **no `multiple_of`** — a step cannot hold on a binary grid. Use `number`.

**Two rules stated once, across `integer_type`, `decimal_type`, `rational_type`, `duration_type` and
`period_type`**: `multiple_of` is strictly positive, the sign of the value is ignored, and a
refinement tightens only to an integer multiple. `members` requires every member to satisfy the body's other
facets (a derived width included), and a refinement may only shrink the set — except `text_type.members`, which is settable once.

### `rational_type` → `rational` (meta)

Exact ℚ. Facets: `min`/`exclusive_min`, `max`/`exclusive_max`, `multiple_of`. Constraints apply to the value (`"2/4"` and `"1/2"` are equal), the token is preserved. Data values are always quoted (`/`).

### `complex_type` → `complex` (meta)

One facet, `component: INTEGER | NUMBER | RATIONAL | FLOAT32 | FLOAT64` (default `NUMBER`). Exactness follows the component. No ordering, so no bounds. `gaussian => !complex ^ { component: INTEGER }`.

`component` is a selector over a **partial order**: `INTEGER ⊂ NUMBER ⊂ RATIONAL` and `FLOAT32 ⊂ FLOAT64`, the two families incomparable, and a refinement may move it only *down*. So `!complex ^ { component: FLOAT64 }` is refused — a float complex is its own instance.

## Text family (`text_type`, kernel)

| Facet | Meaning |
|---|---|
| `min_length`, `max_length`, `length` | in code points, of the value |
| `pattern` | I-Regexp (RFC 9485) — the interoperable subset: no back-references, no look-around, no `\d` shorthand outside the defined set; anchored to the whole value. **Settable once**: a refinement may set it where unset or restate it, never change it |
| `members` | `text_member_set` — the admitted strings outright, still parsed by the family (`!uri ^ { members: ["https://a.example/" "https://b.example/"] }`). Every member must satisfy the other facets, the pattern included; two members that are one value in the type's form are a duplicate. Settable once, like `pattern` |
| `normalization` | the form a value is *put into*: `NONE` (default — the text as written), `NFC`, `NFKC`, `NFKC_CASEFOLD` (UAX #31's caseless form; `ß` → `ss`), `ASCII_CASEFOLD` (`A`–`Z` → `a`–`z`, nothing else). **Fixed at construction**: a refinement restates it or leaves it alone, so a folding type is a fresh `!text_type { normalization: ASCII_CASEFOLD }` |

**A text value is its token's text put into the type's form**, never refused for not already being in it, and every other facet and every comparison — pins, map keys, set members, enum members — judges the value. No comparison goes below NFC: a composed and a decomposed `É` are one value under every form. A round trip writes the value, so `Content-Type` under a folding type is written back `content-type`.

Core instance: `text`. There is no `non_empty_text` — declare `title_text => !text ^ { min_length: 1 }`.

Spec-bound sub-families compose `text_type & atom_specification`, so they inherit all six facets and add a pinned `spec`:

| Constructor → instances | Extra facets | Notes |
|---|---|---|
| `uri_type` (meta) → core `uri_reference => !uri_type {}`, `uri => !uri_reference ^ { allow_relative: false }` | `schemes?: scheme_set`, `allow_relative? ~ true`, `allow_fragment? ~ true` | RFC 3986, US-ASCII. `uri` requires a scheme and IS-A `uri_reference`. `normalization` fixed `NONE` |
| `iri_type` (kernel) → core `iri_reference`, `iri` (also the kernel's `iri`) | the same three | RFC 3987: `ucschar` beyond US-ASCII, judged through the URI it maps to. `uri` is **not** IS-A `iri` |
| `regex_type` (kernel) → `regex` | — | RFC 9485 I-Regexp; `normalization` fixed `NONE` |
| `email_type` (meta) → `email` | — | dot-atom `@` dot-atom only; `normalization` fixed `NONE` |
| `identifier_type` (kernel) → kernel `identifier`, `scheme_name` | the profile facets (below) | UAX #31; `normalization ~ NFC`. Core declares no `identifier` |

`schemes` is a set of the kernel's `scheme_name`, which folds ASCII case, so `[HTTP http]` is a duplicate and `HTTPS://a.example/` is in `[https]`. `allow_relative` and `allow_fragment` are permissions (true → false only), `schemes` a member set (shrink only). A relative reference under `uri`, a scheme outside `schemes`, or a fragment where withdrawn is a validation error; a character outside the grammar (`ü` under `uri`) is refused by the parser. `allow_relative: false` with `allow_fragment: false` is RFC 3986's absolute-URI.

`spec` is pinned (`spec?: = "…"`) in each constructor; a refinement must not restate it with a different value.

### Identifier families

`identifier_type` states a UAX #31 identifier profile as data: `start` and `continue` (`identifier_base => !enum [XID ID ASCII NONE]`, default `XID`; `ASCII` is XID's ASCII members — Start `A`–`Z` `a`–`z`, Continue adding `0`–`9` and `_`), `start_add`, `continue_add`, `medial` and `exclude` (each a text read as a set of code points; a `medial` character stands only between two others, never doubled or at an edge), plus every text facet. The kernel's `identifier => !identifier_type { continue_add: "-" }` is [TSON-DATA] §7.7's grammar, and its second instance `scheme_name` is a URI scheme, written over the `ASCII` base: `!identifier_type { start: ASCII  continue: ASCII  continue_add: "+-."  exclude: "_"  normalization: ASCII_CASEFOLD }`.

- **A value typed by an identifier family is a name**: name hygiene reaches it, and the keys of a map keyed by one and the elements of a set of one are look-alike scopes. A `text`-keyed map stays data.
- **Core does not declare `identifier`**; a schema that wants one writes `identifier => !identifier_type { continue_add: "-" }`, then `{identifier => handler}` or `!identifier ^ { pattern: "[a-z_]+" }`.
- **Each profile is its own type** and string-class; IS-A between two comes from refinement alone. The profile facets and `normalization` are fixed at construction — a refinement narrows only the text facets (`!identifier ^ { start_add: "_" }` is refused).
- A profile with an empty Start set, or a `medial` character that is also Start or Continue, is refused at load. **A floor no profile lifts**: `start_add`, `continue_add` and `medial` may not add a `Default_Ignorable_Code_Point` (so no `Bidi_Control`, no soft hyphen), a control, or a space other than U+0020 — a medial U+0020 is how a profile holds words.
- **An identifier family is what a `name_type` names** — an enum's members and a record's field names are values of one (`declaration-forms.md` §2). As a name type its `normalization` must imply NFC: `NONE` is refused, and `ASCII_CASEFOLD` only over a profile whose every character is ASCII (`NFKC_CASEFOLD` folds any other). Common name types:

```
words     => !identifier_type { medial: " " }
json_name => !identifier_type { start_add: "@$" }
http_name => !identifier_type { start: ASCII  continue: ASCII  medial: "-"  normalization: ASCII_CASEFOLD }
```

`words` admits `lightly active`, `json_name` admits `@id` and `$ref`, and `http_name` is an HTTP field name compared without case (`Content-Type` is `content-type`).

## Temporal (meta)

| Constructor → instance | Facets | Ordering |
|---|---|---|
| `date_type` → `date` | `min`/`exclusive_min`, `max`/`exclusive_max` | TOTAL |
| `time_type` → `time` | same, `precision` | **TOTAL** — the value is the UTC time of day; second 60 is refused |
| `datetime_type` → `datetime` | same, `precision` | **TOTAL** — the value is the instant; second 60 (a leap second) is refused |
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

`precision: N` — a constraint on the *value*: it admits a whole number of 10⁻ᴺ seconds, so `precision: 3` is
millisecond resolution and `precision: 0` whole seconds. Reading admits any spelling of an admitted value,
trailing zeros included (`12:00:00.500` passes `precision: 1`); a writer writes at most N digits. Nothing is
truncated — a value off the grid is rejected. N is at most 9, from the `"." 1*9DIGIT` fraction shared by
`time`, `datetime` and `duration`. There is no timezone facet: RFC 3339 already
mandates the offset. Bound values are written as the atom's own text, quoted where the content needs it:
`exclusive_min: "2026-01-01T00:00:00Z"`.

## Identifier (meta)

| Constructor → instance | Facets |
|---|---|
| `uuid_type` → `uuid` (core) | `version?: non_negative_integer` |

## Network (meta constructors; instances in `net.tn`)

**Import `https://tson.io/2026/38/m/net.tn` to use any of these.** Core does not declare them, so a schema importing core alone may declare a `mac` or a `hostname` of its own; one that imports `net.tn` may not.

| Constructor → instance | Facets |
|---|---|
| `ipv4_type` → `ipv4` | `within?: [cidr text]`, `excluding?: [cidr text]` — inside at least one `within` (if present) and no `excluding` |
| — | **A `within`/`excluding` pair MUST admit at least one value**, exactly, and a network family's prefix bounds participate in the check |
| `ipv6_type` → `ipv6` | same |
| `cidr4_type` → `cidr4` | `min_prefix`, `max_prefix` (0–32), `within` (subnet-of), `excluding` (no overlap) |
| `cidr6_type` → `cidr6` | same, 0–128 |
| `mac_type` → `mac` | none |
| `hostname_type` → `hostname` | `allow_idn? ~ true` — a permission; `false` admits only names with no internationalized label, in either spelling |
| `host_type` → `host` | none — a position wanting only names or only addresses is typed `hostname`, `ipv4` or `ipv6` |
| `media_type_type` → `media_type` | `allow_parameters? ~ false` (a permission), `types?: [text]`, `suffixes?: [text]` (member sets) |

CIDR lists are quoted strings: `within: ["10.0.0.0/8" "192.168.0.0/16"]`.

- **`hostname`** is a domain name (RFC 5890: LDH, A-label or U-label labels, in any mix) and its value is the name: `Example.COM` and `example.com` are one value, and so are `xn--bcher-kva.example` and `bücher.example`; canonical text is lowercase U-labels. Refused by the parser: uppercase beyond ASCII, a trailing dot, a last label beginning with a digit, percent-encoding. `allow_idn: false` judges the value, so it refuses both spellings of `bücher.example` (a validation error).
- **`host`** is a `hostname`, an IPv4 address or an IPv6 address, bracketed or not, in one string-class atom — so `localhost`, `"127.0.0.1"` and `"[::1]"` need no tag where `( hostname | ipv4 | ipv6 )` would. `[::1]` and `::1` are one value; a name never equals an address, nor an IPv4 address an IPv6 one.
- **`media_type`** is an RFC 6838 type and subtype, compared without ASCII case; net's instance admits **no parameters**. A refinement may withdraw a permission but never grant one, so a `Content-Type` position is a fresh instance: `content_type => !media_type_type { allow_parameters: true }` (parameters a map, the `charset` value folded). `types` and `suffixes` list admitted top-level types and RFC 6839 suffixes, compared without case (`suffixes: [json]` admits `application/json` and `application/ld+json`); each list, when given, must admit the value. A media range (`text/*`) is not a media type.

## Bytes (meta)

`bytes_type => atom & { encoding?: bytes_encoding ~ BASE64  length?: non_negative_integer  min_length?: non_negative_integer  max_length?: non_negative_integer }`, with
`bytes_encoding => !enum [BASE64 BASE64URL BASE32 HEX]`.

Core instance: `bytes => !bytes_type {}` (the `BASE64` default) — the one binary type; there is no `base64`,
`base64url`, `base32` or `hex`.

**The value is the octets.** Equality, identity, content addressing and the length facets are all over
octets, never over a spelling — `length: 32` is a 32-byte digest whether it arrives as base64 or hex, and
the same octets are `"3q2+7w=="`, `"deadbeef"` and `"3WV37Q======"`.

`encoding` is a **selector with no narrowing relation at all**: a refinement may neither set nor change it.
Another alphabet is another *instance* — `hexdigest => !bytes_type { encoding: HEX }` — because a spelling
narrows nothing, so `hexdigest ^ bytes` would claim an IS-A that no base64 position could honour.

## `value` and `void` (kernel)

Each has a constructor with an empty vocabulary, `value_type => atom & {}` and `void_type => atom & {}`, and a processor recognises both by constructor, never by name. There is no `unit`.

- `value => !value_type {}` — the escape hatch: the token, uninterpreted, read by the type the position hands it to. Its inhabitants are boolean, integer, float and string. A `value` position is **not** a scope. Not narrowable. Used by the meta layer for value-typed facets; core declares no `value`, so a user schema wanting "some scalar" declares `scalar => !value_type {}`.
- `void => !void_type {}` — the only value is `_`. Target for bare annotations; a field typed `void` holds no value (`a?: void?`). Core re-declares `void` so data documents can reach it.

## Enumerations (kernel)

```
enum_type => atom & { name_type: identifier_kind  members: enum_set }
enum      => enum_type ^ { name_type?: = identifier }
```

`enum_set => !set_type { element_type: text  min_items: 1 }`. An enum is a closed set of **names** and the identifier family they are drawn from — the same `name_type` slot a record has for its field names:

- **`!enum [A B C]`** — a vocabulary of identifiers (`name_type` is the kernel's `identifier`, wherever the enum is reached). Name hygiene applies to the set, and the class is the members' shared class read off their tokens (`[true false]` boolean; `[A B]` string; mixed → none).
- **`!enum_type { name_type: words  members: ["sedentary" "lightly active"] }`** — names of an identifier family the schema declares (`words => !identifier_type { medial: " " }`, `kebab => !identifier_type { continue_add: "-" }`). `name_type` must name an identifier family — a member of the kernel's `identifier_kind` — so `name_type: text` is refused; members are written quoted where they are no identifier.
- **A closed set of text that is no name is no enum**: write the text family's own facet, `!text ^ { members: ["80" "443"] }`, string-class as every text atom is. There is no `text_enum`.

Members are values of `name_type` (a member it refuses is a load error; two that are one value under its form are a duplicate), unique, at least one. `name_type` is **fixed at construction**: a refinement only shrinks the members (`open_states => !status ^ { members: [OPEN ACTIVE] }`). Numbers are never members — use `!integer ^ { members: [...] }`. Parsing puts the token's text into the name type's form and matches it; `"true"` and `true` are one value at `boolean`. Binding: a host boolean at `boolean`, host text elsewhere, a host enum through a mapping the binder owns.

Core: `boolean => !enum [true false]`.

## Sums (meta / kernel)

| Constructor | Fields | Notes |
|---|---|---|
| `choice` (kernel) | `variants: [type_kind]`, `disjoint?: boolean` | sugar `(A \| B)`; two or more; no `void` variant. The resolver derives `disjoint` and writes it in the choice body; it is discarded and recomputed on ingest |
| `scoped` (meta) | `scope: scope_set`, `schemas?: {schema_identity => [type_name; 1..]?; 1..}` | open sum: the value names its own type, the instance names where that name resolves. `scope_kind => !enum [LOCAL EXTERN]`; `schema_identity => !iri_type { allow_fragment: false }` |

Core instances of `scoped`:
`declared => !scoped { scope: [LOCAL] }`, `extern => !scoped { scope: [EXTERN] }`,
`dynamic => !scoped { scope: [LOCAL EXTERN] }`, plus the templates
`extern_of => <S> !scoped { scope: [EXTERN]  schemas: { S => _ } }` and
`extern_type => <S, T> !scoped { scope: [EXTERN]  schemas: { S => [T] } }`.
A value naming no type at a scoped position is a validation error.

## Kinds (kernel; `kind` also in core)

```
kind_type => atom & { of: type_name  members?: [type_name] }
kind      => <T> !kind_type { of: T }
```

A **kind** is an atom whose values are the *names* of the types in the schema's closure built with the constructor `of` — `kind<record>` holds `person`, never a person; `kind<uuid_type>` holds `stock_id`, never a UUID. `of` names a constructor (`record`, `uuid_type`, `identifier_type`, `type`), never a type of your own (`kind<stock_id>` is refused), and a kind is not a bound. Members are computed at link over the closure — abstract records and record-template bases included — and a name that is no member is refused (`'uuid' is not a member of this kind`). Core declares `kind`, so a user schema writes `handler: kind<record>` directly, and may not declare a type named `kind`. A kind and a reference are string-class. The kernel's own type slots are kinds: `type_kind` (every type a value can have — `record_field.type`, `array.element_type`, `map.key_type`/`value_type`, `choice.variants`), `identifier_kind` (both `name_type` slots) and `atom_kind`.

`ref_type => atom & { of: type_name }` with `ref => <T> !ref_type { of: T }` holds a **qualified name** of a value (`orders.place_order`). It is kernel vocabulary only — core declares no `ref`, and a user schema writing `ref<T>` gets an unresolved reference — since only a meta-schema can declare the namespace types whose entries hold values: `extension-meta-schemas.md`.

## Products (kernel)

| Constructor | Fields | Sugar |
|---|---|---|
| `record` | `fields: field_map` (name → `record_field`, in order), `groups?: [field_group]`, `extension?: record_extension_type ~ OPEN`, `discriminators?: [text; 1..]`, `name_type?: identifier_kind`, `parameters?: [template_param]` | `{ … }`; `abstract { … }`, `final { … }`; `=?` on a field; `<T> { … }` |
| `array` | `element_type: type_kind`, `voidable? ~ false`, `ordered? ~ true`, `unique_items? ~ false`, `min_items?`, `max_items?` | `[T]`, `[T; N..M]`, `[T?]` |
| `set_type` (`array ^`) | `voidable? = false`, `ordered? = false`, `unique_items? = true`; bounds as `array`'s | `set<T>` — the template meta and core each declare. **A set may be empty**; say `min_items: 1` for one that may not |
| `map` | `key_type`, `value_type` (both `type_kind`), `voidable? ~ false`, `ordered? ~ false`, `min_items?`, `max_items?` | `{K => V}`, `{K => V?; 1..}` |
| `tuple` | `elements: [{ element_type  voidable? }]` | `[T, U?]`; one position: core's `tuple1<T>`, `voidable_tuple1<T>` |

`ordered` says whether two values differing only in order are one value; it never changes what a document may write, and output keeps the written order. A map whose entry order matters is `!map { key_type: K  value_type: V  ordered: true }` — the sugar has no spelling for it. A container's part is a value or void, never missing, so containers carry `voidable` and no `optional`.

Explicit constructor applications are legal as declaration bodies (`lookup => !map { key_type: text  value_type: integer }`) and are the way to reach a composite map key type, an ordered map, or a bounded set at a field (`tag_set => !set_type { element_type: text  min_items: 1 }`, then `tags: tag_set`).

## Which core names exist

Numeric: `integer int8 int16 int32 int64 int128 int256 uint8 uint16 uint32 uint64 uint128 uint256 number rational complex float32 float64`.
Text: `text regex uri_reference uri iri_reference iri email`.
Binary: `bytes`.
Temporal: `date time datetime duration period`.
Identifier: `uuid`.
Scoped: `declared extern dynamic`, and the templates `extern_of extern_type`.
Templates: `set kind tuple1 voidable_tuple1`.
Other: `boolean void`.
Annotation type for data documents: `doc`.

In `net.tn`, not core: `ipv4 ipv6 cidr4 cidr6 mac hostname host media_type`.

Names that do **not** exist in core: `string str int float double bool binary base64 base64url base32 hex timestamp decimal url ip any null unknown unit list array map record object identifier text_enum ref non_empty_text positive_integer non_negative_integer negative_integer non_positive_integer annotation documentation`, nor the eight network names above. A sign bound, a non-empty text and an `identifier` are one line a schema writes for itself. (`bytes`, `period`, `declared`, `extern`, `dynamic`, `extern_of`, `extern_type`, `set`, `kind`, `tuple1` and `iri` *do* exist.)

## Annotation types available to schema documents (from `meta.tn`)

`@doc:"…"` (CommonMark 0.31.2, no extensions; raw HTML never executed), `@title:"…"` (plain text), `@comment:"…"` (for maintainers; a documentation tool leaves it out), `@examples:["…" "…"]` (a list of *text*, conventionally the value in TSON notation, `"{ x: 1 }"`; nothing parses it), `@deprecated` (bare; a reason belongs in `@doc`), `@ordering:NONE|PARTIAL|TOTAL` (whether the value space has an order relation — not a container's `ordered`), `@bounded:true|false` (whether the value space has a finite least and greatest value: `date`, `datetime`, `duration` and the fixed widths do, `uuid`, `mac` and the CIDR families do not), `@exact:true|false`, `@numeric` (bare), `@disjoint` (bare, on a choice), `@read_only` / `@write_only` (bare, never both on one field), and `@synthetic` and `@application` (resolver-attached; writing either is a resolver error). There is no `@since`, `@todo`, `@lang`, `@documentation`, `@discriminator` or `@rest`: a sealed family is `abstract` plus a `=?` selector, and open-ended data is a map field.
