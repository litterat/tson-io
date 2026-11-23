# Type families, constructors and facets

Condensed from `meta.tn`, `numeric.tn`, `temporal.tn`, `net.tn` and `core.tn` (2026 Revision 40), Part 2 §4.2,
§5.3–§5.5, §5.7, §7.4 and §9. Every name below is written as an importer writes it: the vocabulary an author uses sits at a
document's **root** (`text`, `int32`, `date`, `uuid`), and the machinery sits in **schema maps nested in the
root**, named by path (`numeric.decimal_type`, `meta.record`, `unicode.identifier_type`). Every name resolves from
the root, inside the bundled documents too; there is no lexical scope.

A **constructor** carries a family's constraint vocabulary. It is an entry that is `meta.top` or IS-A it, and any
schema whose closure holds the kernel may declare one (`extending.md`). A family's **instance** is
`!constructor {}`, the unconstrained member at the root, and you refine it with `!instance ^ { facets }`. Refine
instances. Apply a constructor directly only when you mean a *fresh, unrelated* family: `dogs =>
!numeric.integer_type {}` has the same body as `integer` and no relation to it.

`^` always follows `!name` and its body is values. Over an instance it refines (IS-A the source); over a
constructor of types, `!C ^ { values }`, it **constructs `C` and leaves it open**: the body leaves at least one
required field absent, and the entry is an **incomplete entry** — no type, no value, named only before `^` (to
write more of it) and as the head of a completion (`!X { … }`, `!X value`, `X<A>`). The kernel's `enum` and
`meta.set_type` are incomplete entries, so a slot that holds an enum *type* is `meta.enum_type`, and one that
holds set types is `meta.ref<meta.array>`.

**Facets are typed by their family's instance.** A bound, a step or a member of the constrained family is read
by that family's own instance, declared in the same document: `numeric.integer_type`'s bounds are `integer`,
`numeric.decimal_type`'s are `number` (and so are a float's), `temporal.date_type`'s are `date`,
`net.ipv4_type.within` is `[cidr4]`. Every facet that counts something (a length, an item count, a digit count, a
prefix length, a UUID version) is `numeric.count`, the kernel's `!int64 ^ { min: 0 }`. A facet value the type
refuses is a resolver error at load (`!number ^ { min: 0x10 }`, `!date ^ { min: 2026 }`). There is no `value`
type and no untyped facet.

Bounds are written as **field groups**: per side, either the inclusive form (`min`, `max`) or the exclusive form
(`exclusive_min`, `exclusive_max`), never both. `min > max` is a schema-load error.

## What to import

A schema reaches a type only through its import closure. Each library imports the kernel alone; `core.tn`
imports the three libraries and adds the author annotations, so **one `core.tn` import brings every bundled
type**. Import fewer when you want fewer names reserved.

| Document | Imports | At the root | Under its maps |
|---|---|---|---|
| `meta.tn` (kernel, pre-loaded) | nothing | `void boolean integer int64 text bytes iri iri_reference regex doc enum set schema` | `meta.*` (the type system), `atom.*`, `numeric.integer_type`/`integer_size`/`integer_member_set`/`count`, `unicode.*`, `net.iri_type`/`scheme_set`/`scheme_name`, `binary.*` |
| `numeric.tn` | `meta.tn` | `number rational complex int8 int16 int32 int128 int256 uint8 uint16 uint32 uint64 uint128 uint256 float32 float64` | adds to `numeric`: `decimal_type float_type rational_type complex_type ieee_format complex_component decimal_member_set` |
| `temporal.tn` | `meta.tn` | `date time datetime duration period` | `temporal`: `date_type time_type datetime_type duration_type period_type` |
| `net.tn` | `meta.tn` | `email ipv4 ipv6 cidr4 cidr6 mac hostname host media_type uri_reference uri uuid` | adds to `net`: `email_type ipv4_type ipv6_type cidr4_type cidr6_type mac_type hostname_type host_type media_type_type uri_type uuid_type` |
| `core.tn` | the three libraries | `deprecated title comment examples read_only write_only` | none |
| `policy.tn` | `meta.tn` | nothing | `policy`: `processor identifier_policy token_policy limits restriction_level limit` |

- `!!import:"https://tson.io/2026/40/m/core.tn"` — every bundled type.
- `!!import:"https://tson.io/2026/40/m/temporal.tn"` — `date`, `time`, … and the kernel; no `int32`, no `uuid`.
- `!!import:"https://tson.io/2026/40/m/meta.tn"` — the kernel's thirteen roots and its maps only.

**Every name in the closure is reserved.** A closure holding the kernel reserves its thirteen root names and the
map names `meta`, `atom`, `numeric`, `unicode`, `net` and `binary`; each library adds its root names (and
`temporal`); `core.tn` adds the six annotations. Declaring a reserved name is a resolver error (*"'title'
collides with an entry of the same name brought in by !!import"*). Under `core.tn`, `record`, `identifier`,
`type_ref`, `bounded`, `count`, `value`, `kind` and `core` stay free. A schema importing `temporal.tn` alone
may declare its own `int32`; one importing `net.tn` may not declare `mac`. The two maps two documents declare,
`numeric` and `net`, are open and hold both documents' members.

A schema with no import has no vocabulary at all: `!schema { a => { b: b }  b => {} }` is valid, and `{ b: text }`
there is an unresolved reference. The sugar forms (`{ … }`, `[T]`, `(A | B)`, `{K => V}`) need no import.

## Numeric

### `numeric.integer_type` → `integer` (kernel)

| Facet | Type | Meaning |
|---|---|---|
| `size` | `numeric.integer_size` = `{ bits: integer  signed: boolean }` | fixed two's-complement width; absent = arbitrary precision. Derives the range: signed n-bit `[-2^(n-1), 2^(n-1)-1]`, unsigned `[0, 2^n-1]`. A bound outside it is an error; `bits > 0` is a coherence check. A selector along the width chain: `!uint8 ^ { size: { bits: 16  signed: false } }` widens and is refused |
| `min` / `exclusive_min` | `integer` | lower bound |
| `max` / `exclusive_max` | `integer` | upper bound |
| `multiple_of` | `integer` | step |
| `members` | `numeric.integer_member_set` (set of `integer`, at least one) | **sparse** value set: `!integer ^ { members: [2 3 5 7] }`; `80` and `0x50` are one member |

Instances: `integer` and `int64` in the kernel; `int8 int16 int32 int128 int256` and `uint8 … uint256` in
`numeric.tn`, each `!integer ^ { size: … }`. All `@atom.ordering:TOTAL @atom.exact:true`. No library declares a
sign-bounded integer for authors: write the line yourself (`count => !integer ^ { min: 0 }`, `positive =>
!integer ^ { min: 1 }`). The kernel's `numeric.count` is reachable by path wherever the kernel is, and is the type
of the counting facets; a schema's own name reads better at a field. Data forms: decimal or based integers,
optional sign, `_` separators.

### `numeric.decimal_type` → `number` (`numeric.tn`)

The exact tier — SQL DECIMAL, ISO 11404 `scaled` radix 10 — and the JSON `number` mapping. Scale is no part of
the value (`1`, `1.0` and `1.00` are one value); ordering TOTAL.

| Facet | Type | Meaning |
|---|---|---|
| `min`/`exclusive_min`, `max`/`exclusive_max` | `number` | bounds; a based integer (`0x10`) is refused, as `!number 0x10` is in data |
| `multiple_of` | `number` | exact step (`0.05` admits nickel steps only) |
| `members` | `numeric.decimal_member_set` (set of `number`) | **sparse** value set; `1` and `1.0` are a duplicate |
| `total_digits` | `numeric.count` | total significant digits (SQL precision) |
| `fraction_digits` | `numeric.count` | digits after the point (SQL scale). `fraction_digits: 2` admits any hundredth; `multiple_of: 0.05` is stricter |

Not accepted: `.inf`, `.nan`.

### `numeric.float_type` → `float32`, `float64` (`numeric.tn`)

Approximate tier: the value is rounded onto the IEEE 754-2019 grid named by `format` (ties-to-even); precision
loss is expected. Ordering PARTIAL (NaN), `@atom.exact:false`. Pinned `spec` (IEEE 754).

| Facet | Type | Meaning |
|---|---|---|
| `format` (required) | `numeric.ieee_format` | `BINARY16 BINARY32 BINARY64 BINARY128 BINARY256 DECIMAL32 DECIMAL64 DECIMAL128` — the decimal formats are base-10 *floating point*, still approximate. A selector; `float32`/`float64` set it |
| `min`/`exclusive_min`, `max`/`exclusive_max` | `number` | exact, checked on the value as written, before rounding. A bound admits no NaN; ±infinity are ordered values a bound judges (`max: 100` refuses `+.inf`) |
| `allow_nan`, `allow_infinity`, `allow_subnormal`, `allow_negative_zero` | `boolean ~ true` | permissions: may be withdrawn, never granted back. While `allow_nan` or `allow_infinity` is true the type has **no discrimination class**, so `( float64 \| text )` needs tags; withdraw both to make it disjoint |

There is deliberately **no `multiple_of`** — a step cannot hold on a binary grid. Use `number`.

**Two rules stated once in `numeric.tn`'s header, across `numeric.integer_type`, `numeric.decimal_type`,
`numeric.rational_type`, `temporal.duration_type` and `temporal.period_type`**: `multiple_of` is strictly
positive, the sign of the value is ignored, and a refinement tightens only to an integer multiple. `members`
requires every member to satisfy the body's other facets (a derived width included), and a refinement may only
shrink the set — except `unicode.text_type.members`, which is settable once.

### `numeric.rational_type` → `rational` (`numeric.tn`)

Exact ℚ. Facets: `min`/`exclusive_min`, `max`/`exclusive_max` and `multiple_of`, all typed `rational`.
Constraints apply to the value (`"2/4"` and `"1/2"` are equal), the token is preserved. Data values are quoted
(they contain `/`): `half => !rational ^ { max: "1/2" }`.

### `numeric.complex_type` → `complex` (`numeric.tn`)

One facet, `component?: numeric.complex_component ~ NUMBER` over `INTEGER NUMBER RATIONAL FLOAT32 FLOAT64`.
Exactness follows the component. No ordering, so no bounds. `gaussian => !complex ^ { component: INTEGER }`.

`component` is a selector over a **partial order**: `INTEGER ⊂ NUMBER ⊂ RATIONAL` and `FLOAT32 ⊂ FLOAT64`, the two
families incomparable, and a refinement may move it only *down*. `!complex ^ { component: FLOAT64 }` is refused —
a float complex is its own instance, `!numeric.complex_type { component: FLOAT64 }`.

## Text family (`unicode.text_type`, kernel)

| Facet | Type | Meaning |
|---|---|---|
| `min_length`, `max_length`, `length` | `numeric.count` | in code points, of the value |
| `pattern` | `regex` | I-Regexp (RFC 9485), anchored to the whole value. **Settable once**: a refinement may set it where unset or restate it, never change it |
| `members` | `unicode.text_member_set` (set of `text`) | the admitted strings outright, still parsed by the family (`!uri ^ { members: ["https://a.example/" "https://b.example/"] }`). Every member must satisfy the other facets, the pattern included; two members that are one value in the type's form are a duplicate. Settable once, like `pattern` |
| `normalization` | `unicode.normalization ~ NONE` | the form a value is *put into*: `NONE` (the text as written), `NFC`, `NFKC`, `NFKC_CASEFOLD` (UAX #31's caseless form; `ß` → `ss`), `ASCII_CASEFOLD` (`A`–`Z` → `a`–`z`, nothing else). **Fixed at construction**: a refinement restates it or leaves it alone, so a folding type is a fresh `!unicode.text_type { normalization: ASCII_CASEFOLD }` |

**A text value is its token's text put into the type's form**, never refused for not already being in it, and
every other facet and every comparison — pins, map keys, set members, enum members — judges the value. No
comparison goes below NFC: a composed and a decomposed `É` are one value under every form. A round trip writes
the value, so `Content-Type` under a folding type is written back `content-type`.

Instance: `text` (kernel root). There is no `non_empty_text` — declare `title_text => !text ^ { min_length: 1 }`.

Spec-bound sub-families compose `unicode.text_type & atom.specification`, so they inherit the text facets and add a
pinned `spec` (`spec?: = "…"`; a refinement must not restate it with another value):

| Constructor (declared in) → instances | Extra facets | Notes |
|---|---|---|
| `net.iri_type` (kernel) → `iri_reference`, `iri` (kernel roots) | `schemes?: net.scheme_set`, `allow_relative?: boolean ~ true`, `allow_fragment?: boolean ~ true` | RFC 3987: `ucschar` beyond US-ASCII, judged through the URI it maps to. `iri => !iri_reference ^ { allow_relative: false }`. `normalization` fixed `NONE` |
| `net.uri_type` (`net.tn`) → `uri_reference`, `uri` (`net.tn` roots) | the same three | RFC 3986, US-ASCII. `uri` requires a scheme and IS-A `uri_reference`; `uri` is **not** IS-A `iri`. `normalization` fixed `NONE` |
| `unicode.regex_type` (kernel) → `regex` | — | RFC 9485 I-Regexp; `normalization` fixed `NONE` |
| `net.email_type` (`net.tn`) → `email` | — | RFC 5322; `normalization` fixed `NONE` |
| `unicode.identifier_type` (kernel) → `meta.identifier`, `net.scheme_name` | the profile facets (below) | UAX #31; `normalization ~ NFC`. No root `identifier` anywhere |

`schemes` is a set of `net.scheme_name`, which folds ASCII case, so `[HTTP http]` is a duplicate and
`HTTPS://a.example/` is in `[https]`. `allow_relative` and `allow_fragment` are permissions (true → false only),
`schemes` a member set (shrink only). A relative reference under `uri`, a scheme outside `schemes`, or a fragment
where withdrawn is a validation error; a character outside the grammar (`ü` under `uri`) is refused by the
parser. `allow_relative: false` with `allow_fragment: false` is RFC 3986's absolute-URI.

### Identifier families

`unicode.identifier_type` states a UAX #31 identifier profile as data: `start` and `continue`
(`unicode.identifier_base ~ XID`, over `XID ID ASCII NONE`; `ASCII` is XID's ASCII members — Start `A`–`Z`
`a`–`z`, Continue adding `0`–`9` and `_`), `start_add`, `continue_add`, `medial` and `exclude` (each `text`, read
as a set of code points; a `medial` character stands only between two others, never doubled or at an edge), plus
every text facet. The kernel's `meta.identifier => !unicode.identifier_type { continue_add: "-" }` is [TSON-DATA]
§7.7's grammar and the type of every naming position (`meta.type_name` and `meta.param_name` are its aliases,
and it is the name type of every record and enum that states no other); its second instance `net.scheme_name` is a URI scheme: `!unicode.identifier_type { start: ASCII
continue: ASCII  continue_add: "+-."  exclude: "_"  normalization: ASCII_CASEFOLD }`.

- **A value typed by an identifier family is a name**: name hygiene reaches it, and the keys of a map keyed by
  one and the elements of a set of one are look-alike scopes. A `text`-keyed map stays data.
- **No bundled document declares a root `identifier`**: the name is yours. Use `meta.identifier` by path, or
  declare `identifier => meta.identifier`, or a profile of your own, then `{identifier => handler}` or
  `!meta.identifier ^ { pattern: "[a-z_]+" }`.
- **Each profile is its own type** and string-class; IS-A between two comes from refinement alone. The profile
  facets and `normalization` are fixed at construction — a refinement narrows only the text facets
  (`!meta.identifier ^ { start_add: "_" }` is refused: setting it would *widen* the profile).
- A profile with an empty Start set, or a `medial` character that is also Start or Continue, is refused at load.
  **A floor no profile lifts**: `start_add`, `continue_add` and `medial` may not add a
  `Default_Ignorable_Code_Point` (so no `Bidi_Control`, no soft hyphen), a control, or a space other than U+0020 —
  a medial U+0020 is how a profile holds words.
- **An identifier family is what a `name_type` names** — an enum's members and a record's field names are values
  of one, and the slot is typed `meta.identifier_ref` (`declaration-forms.md`). As a name type its
  `normalization` must imply NFC: `NONE` is refused, and `ASCII_CASEFOLD` only over a profile whose every character
  is ASCII (`NFKC_CASEFOLD` folds any other). Common name types:

```
words     => !unicode.identifier_type { medial: " " }
json_name => !unicode.identifier_type { start_add: "@$" }
http_name => !unicode.identifier_type { start: ASCII  continue: ASCII  medial: "-"  normalization: ASCII_CASEFOLD }
```

`words` admits `lightly active`, `json_name` admits `@id` and `$ref`, and `http_name` is an HTTP field name
compared without case (`Content-Type` is `content-type`).

## Temporal (`temporal.tn`)

Every constructor composes `meta.atom & atom.specification` and pins RFC 3339 (`#appendix-A` for duration and
period). Each bound is typed by the family's own instance, so it is written in the atom's own lexical form,
quoted where the content needs it.

| Constructor → instance | Facets (types) | Ordering |
|---|---|---|
| `temporal.date_type` → `date` | bounds: `date` | TOTAL |
| `temporal.time_type` → `time` | bounds: `time`; `fraction_digits: numeric.count` | **TOTAL** — the value is the UTC time of day; second 60 is refused |
| `temporal.datetime_type` → `datetime` | bounds: `datetime`; `fraction_digits: numeric.count` | **TOTAL** — the value is the instant; second 60 (a leap second) is refused |
| `temporal.duration_type` → `duration` | bounds: `duration`; `fraction_digits: numeric.count`; `multiple_of: duration` | **TOTAL** — signed exact decimal **seconds** |
| `temporal.period_type` → `period` | bounds: `period`; `multiple_of: period` | **TOTAL** — signed integer **months** |

```
launch  => !date ^ { min: "2026-01-01" }
recent  => !datetime ^ { exclusive_min: "2026-01-01T00:00:00Z"  fraction_digits: 3 }
slot    => !duration ^ { multiple_of: PT15M  max: PT8H }
quarter => !period ^ { multiple_of: P3M }
```

**`time` and `datetime` are instants.** The offset RFC 3339 makes mandatory is a *spelling*:
`2026-01-01T10:00:00+01:00` and `2026-01-01T09:00:00Z` are one value, and `-00:00` is the same instant as `Z`. The
notation preserves the offset as written; equality, ordering and bounds compare the instant.

**`duration` and `period` are two atoms**, split from one ISO 8601 duration. `P1Y2M3DT4H5M6S` is an error under
both; a span that is genuinely both is a record with a field of each. A month has no fixed length beside a second
that has one, which is what makes each totally ordered. A week is 7 days and a day 86400 s, so the week form
belongs to `duration`. A `duration`'s magnitude is at most 2⁶³ − 1 nanoseconds.

`fraction_digits: N` is a constraint on the *value*: it admits a whole number of 10⁻ᴺ seconds, so
`fraction_digits: 3` is millisecond resolution and `fraction_digits: 0` whole seconds — the same facet name, and
the same digit count, as `numeric.decimal_type`'s. Reading admits any spelling of an admitted value, trailing zeros
included (`12:00:00.500` passes `fraction_digits: 1`); a writer writes at most N digits (`12:00:00.5`). Nothing is
truncated — a value off the grid is rejected. N is at most 9 (a larger value is a schema-load error), from the
`"." 1*9DIGIT` fraction shared by `time`, `datetime` and `duration`. There is no timezone facet: RFC 3339 already
mandates the offset.

## Network and identifier (`net.tn`)

**Import `https://tson.io/2026/40/m/net.tn` (or `core.tn`) to use any of these.** The kernel holds only
`net.iri_type` and its schemes; every name below comes from `net.tn`.

| Constructor → instance | Facets (types) |
|---|---|
| `net.ipv4_type` → `ipv4` | `within?: [cidr4]`, `excluding?: [cidr4]` — inside at least one `within` network (if present) and no `excluding` one |
| `net.ipv6_type` → `ipv6` | `within?: [cidr6]`, `excluding?: [cidr6]` |
| `net.cidr4_type` → `cidr4` | `min_prefix?`, `max_prefix?: numeric.count` (0–32), `within?: [cidr4]` (subnet-of), `excluding?: [cidr4]` (no overlap) |
| `net.cidr6_type` → `cidr6` | the same, 0–128, over `[cidr6]` |
| `net.mac_type` → `mac` | none |
| `net.hostname_type` → `hostname` | `allow_idn?: boolean ~ true` — a permission; `false` admits only names with no internationalized label, in either spelling |
| `net.host_type` → `host` | none — a position wanting only names or only addresses is typed `hostname`, `ipv4` or `ipv6` |
| `net.media_type_type` → `media_type` | `allow_parameters?: boolean ~ false` (a permission), `types?: [text]`, `suffixes?: [text]` (member sets) |
| `net.uri_type` → `uri_reference`, `uri` | see the text table above |
| `net.email_type` → `email` | the text facets |
| `net.uuid_type` → `uuid` | `version?: numeric.count` — RFC 9562's version field; **settable once** (a refinement may set or restate it, never change it) |

CIDR list entries are `cidr4`/`cidr6` values, quoted: `within: ["10.0.0.0/8" "192.168.0.0/16"]`. An entry with
nonzero host bits (`"10.0.0.1/8"`) is refused at load by the `cidr4` reader. **A `within`/`excluding` pair MUST
admit at least one value**, checked exactly, and a network family's prefix bounds take part in the check.

- **`hostname`** is a domain name (RFC 5890: LDH, A-label or U-label labels, in any mix) and its value is the name:
  `Example.COM` and `example.com` are one value, and so are `xn--bcher-kva.example` and `bücher.example`;
  canonical text is lowercase U-labels. Refused by the parser: uppercase beyond ASCII, a trailing dot, a last label
  beginning with a digit, percent-encoding. `allow_idn: false` judges the value, so it refuses both spellings of
  `bücher.example` (a validation error).
- **`host`** is a `hostname`, an IPv4 address or an IPv6 address, bracketed or not, in one string-class atom — so
  `localhost`, `"127.0.0.1"` and `"[::1]"` need no tag where `( hostname | ipv4 | ipv6 )` would. `[::1]` and `::1`
  are one value; a name never equals an address, nor an IPv4 address an IPv6 one.
- **`media_type`** is an RFC 6838 type and subtype, compared without ASCII case; net's instance admits **no
  parameters**. A refinement may withdraw a permission but never grant one, so a `Content-Type` position is a
  fresh instance: `content_type => !net.media_type_type { allow_parameters: true }` (parameters a map, the
  `charset` value folded). `types` and `suffixes` list admitted top-level types and RFC 6839 suffixes, compared
  without case (`suffixes: [json]` admits `application/json` and `application/ld+json`); each list, when given,
  must admit the value, and must not be empty. A media range (`text/*`) is not a media type.
- **`uuid`** versus a uuid-*built* type: `stock_id => !net.uuid_type {}` is a fresh family, not IS-A `uuid`, and
  `!uuid` is refused at a `stock_id` position. Refine (`v4 => !uuid ^ { version: 4 }`) to stay inside `uuid`.

## Bytes (`binary.bytes_type`, kernel)

`binary.bytes_type => meta.atom & { encoding?: binary.bytes_encoding ~ BASE64  length?: numeric.count
min_length?: numeric.count  max_length?: numeric.count }`, with `binary.bytes_encoding => !enum [BASE64 BASE64URL
BASE32 HEX]`. No `spec`: RFC 4648 governs spellings, not octets.

Instance: `bytes => !binary.bytes_type {}` (kernel root, the `BASE64` default) — the one binary type; there is no
`base64`, `base64url`, `base32` or `hex`.

**The value is the octets.** Equality, identity, content addressing and the length facets are all over octets,
never over a spelling — `length: 32` is a 32-byte digest whether it arrives as base64 or hex, and the same octets
are `"3q2+7w=="`, `"deadbeef"` and `"3WV37Q======"`.

`encoding` is a **selector with no narrowing relation at all**: a refinement may neither set nor change it.
Another alphabet is another *instance* — `hexdigest => !binary.bytes_type { encoding: HEX  length: 4 }` — because
a spelling narrows nothing. Refining for length inherits the alphabet: `sha256 => !bytes ^ { length: 32 }` is a
base64 sha256.

## `void` (kernel)

`meta.void_type => meta.atom & {}`, an empty vocabulary, and `void => !meta.void_type {}` at the root. A
processor recognises it by constructor, never by name. The only value is `_`. Target for bare annotations; a
field typed `void` holds no value (`a?: void?`). There is no `unit`, and **no `value`** type: a field's default or pin
is read by the field's own type, and every facet by its family.

## Enumerations (kernel)

```
meta.enum_type => meta.atom & { name_type: meta.identifier_ref  members: meta.enum_set }
enum           => !meta.enum_type ^ { name_type: meta.identifier }
```

Entries are listed by path; in `meta.tn` the first is declared as `enum_type` inside `meta => !schema { … }`, and
`enum` sits at the root.

**`enum` is an incomplete entry**, not a type: `meta.enum_type` with `name_type` written and `members` left open.
`!enum [A B C]` completes it — the positional form, `members` being the one field it leaves absent — and resolves
to `!meta.enum_type { name_type: meta.identifier  members: [A B C] }`. Declaring an enum and using it is `status =>
!enum [OPEN DONE]`, then `s: status`. Naming `enum` itself where a type stands (`a: enum`, `<E: enum>`) is a
resolver error, and `!enum` as a data tag a validation error; a field whose value is an enum *type*, a meta-level
slot, is typed `meta.enum_type`, which admits enums over any name type.

`meta.enum_set => !meta.set_type { element_type: text  min_items: 1 }`. An enum is a closed set of **names** and
the identifier family they are drawn from — the same `name_type` slot a record has for its field names:

- **`!enum [A B C]`** — a vocabulary of identifiers (`name_type` written as `meta.identifier`). Name hygiene
  applies to the set, and the class is the members' shared class read off their tokens (`[true false]` boolean;
  `[A B]` string; mixed → none).
- **`!meta.enum_type { name_type: words  members: ["sedentary" "lightly active"] }`** — names of an identifier
  family the schema declares (`words => !unicode.identifier_type { medial: " " }`). `name_type` must name an
  identifier family — a member of `meta.identifier_ref` — so `name_type: text` is refused; members are written
  quoted where they are no identifier.
- **A closed set of text that is no name is no enum**: write the text family's own facet, `!text ^ { members:
  ["80" "443"] }`, string-class as every text atom is.

Members are values of `name_type` (a member it refuses is a load error; two that are one value under its form are
a duplicate), unique, at least one. `name_type` is **fixed at construction**: a refinement only shrinks the
members (`open_states => !status ^ { members: [OPEN ACTIVE] }`). Numbers are never members (`!enum [1 2 3]` is
refused: *"'1' … cannot start an identifier"*) — use `!integer ^ { members: [...] }`. Parsing puts the token's
text into the name type's form and matches it; `"true"` and `true` are one value at `boolean`.

Kernel root: `boolean => !enum [true false]`.

## Sums (kernel)

| Constructor | Fields | Notes |
|---|---|---|
| `meta.choice` | `variants: [meta.type_expr]`, `disjoint?: boolean` | the closed sum; sugar `(A \| B)`; two or more; no `void` variant. A variant is a name or a type written in place. The resolver derives `disjoint` and writes it in the choice body; it is discarded and recomputed on ingest. Assert it with `@meta.disjoint` |
| `meta.declared_type` → `meta.declared` | — | the open sum: a value names its own type by its tag, among every type of the reading document's closure, and is validated in full against it. An untagged value is a validation error. It is what a schema map's entries are |
| `meta.dependent` (final) | `on: text` | a dependent field's type: a sum written in place at a record field's type, `{ of: !meta.dependent { on: kind } }`, sugar `kind!`. The value is read against the type its sibling `kind` names (`extending.md`). Never declared, and at no other slot |

Three rules shape a choice beyond disjointness:

- **A tag names a variant, or a type that IS-A exactly one variant.** At `item => ( text | shape )` with `shape`
  abstract and `circle => shape & { r: int32 }`, `!circle { … }` selects `shape` and validates as a `circle`. A
  tag whose type IS-A two variants and names neither selects none, a validation error.
- **A choice that is not disjoint names every variant.** A variant written in place has no name a tag could give,
  so `( [text] | [int32] )` is a resolver error: declare `texts => [text]` and `ints => [int32]`, then `( texts |
  ints )`. A disjoint choice may hold one, `( [text] | int32 )`.
- **A variant that is a choice is disjoint**, so a choice nests one deep. Over two records `either => ( a | b )`,
  `( text | either )` is a resolver error naming the fix, `( text | a | b )`. A nested choice has no class, so the
  outer choice is not disjoint and a value there carries the tag naming the nested choice: at `( boolean | narrow
  )` over `narrow => ( int32 | text )`, write `!narrow 5`.

A position admits a foreign schema's types by importing that schema, or one entry of a schema it cannot import
by an extern (below).

## Hops (kernel)

| Constructor | Fields | Notes |
|---|---|---|
| `meta.alias` | `target: meta.type_ref` | `user_id => uuid`: another name for the same entry. A hop, no type of its own; output keeps it as written |
| `meta.extern` | `schema: iri_reference`, `type: text` | `order_v1 => !meta.extern { schema: "https://example.com/order-1.tn"  type: order }`: one entry of another schema under a name of this one, none of that schema's names entering this one. It stands wherever a type's name does, and is sealed: no `&`, `-`, `^`, application, default or pin through it, and no qualified name selects through it. Values at its positions are read in the foreign schema's scope (`data-under-schema.md`) |

Both compose `meta.top` directly and reach no base kind, so neither entry is a type or carries a chain; a
judgement through either is made of the entry it reaches. Two externs of one entry, or an extern beside the
entry's own name, are one type written twice and cannot both be variants of a choice.

## References (kernel)

```
meta.ref            => meta.atom & { of: meta.type_ref }
meta.type_ref       => !meta.ref { of: meta.type }
meta.identifier_ref => !meta.type_ref ^ { of: unicode.identifier_type }
```

`meta.ref` is the one reference constructor, and `meta.ref<T>` its application, the construction `!meta.ref {
of: T }` (positionally `!meta.ref T`). `meta.type_ref` holds the names of the types a value can have,
`meta.identifier_ref` the names of the identifier families.

One atom whose values are **names**. A value conforms when the entry it names, past alias hops, holds a value
whose type is `of` or IS-A it, so the slot's meaning comes from `of`:

- **`of` a constructor** — the slot holds a *type's name*: `meta.type_ref` (any type a value can have),
  `meta.ref<meta.record>` (record types, and constructors, whose declarations are records),
  `meta.ref<meta.array>` (array types, every set type among them), `meta.ref<net.uuid_type>` (types built with
  `uuid_type`: `stock_id`, never a UUID), `meta.identifier_ref`.
- **`of` any other type** — the slot holds a value's **qualified name**: `meta.ref<method>` takes
  `orders.place_order`, never a method written inline (`extending.md`).

A reference is string-class, and its value is a **name, never an application**: a parametric record is named
only as the head of an application, so a slot holds the name a declaration gives one (`bt => box<int32>`, then
`bt`). `of` names a type or a constructor, never a value entry, a parametric record or an incomplete entry
(`meta.ref<meta.set_type>` is refused; `meta.ref<meta.array>` admits every set type). A refinement narrows `of` to
a type IS-A the source's. Any schema whose closure holds the kernel writes `meta.ref<T>` and `meta.type_ref` at a
field.

### Type slots

```
meta.type_inline => { of: meta.type }
meta.type_expr   => @meta.disjoint ( meta.type_ref | meta.type_inline )
```

Every slot that names the type of a value — `meta.record_field.type`, `meta.array.element_type`,
`meta.map.value_type`, `meta.tuple_element.element_type`, each of `meta.choice.variants`, and
`meta.type_chain.parents` — is a `meta.type_expr`: a **name**, or a **type written in place**, `{ of: !C { … }
}`. `tags: [text]` resolves to `type: { of: !meta.array { element_type: text } }`. Every other slot naming a type
is `meta.type_ref` and holds a name alone: a map's `key_type`, a parameter's `bound`, an alias's `target`, a
reference's `of`, a chain's `supertypes` and `subtypes`, and `meta.apply`'s `head` and `arguments`. Where only a
name stands, an application or a form is a resolver error (`{box<text> => int32}`, `meta.ref<box<text>>`):
declare it and name it.

**What may be written in place**: a container, a tuple, a choice, a reference, a completion (`set<text>`), an
applied constructor, a record body (`at: { x: int32  y: int32 }`), an application of a parametric record (which
closes to the record written in place), and, at a record field's type alone, a dependent type. **Declared and
named, never in place**: an atom refinement or construction (`!integer ^ { … }`), an enum, a namespace type,
`meta.declared`, a composition or a subtraction. A type written in place has no name, no chain and no tag, and is
IS-A nothing; two equal ones are one type, and a name and a type written in place are never one type.

### Applications

```
meta.apply => final meta.type & { head: meta.type_ref  arguments: [meta.type_ref; 1..] }
```

`H<a₁ … aₙ>` in schema source is sugar for `meta.apply`, and what it means depends on the head:

- **A constructor** — constructed over its **argument slots**, its required fields with no default and no pin
  that hold a type, in declaration order: `meta.array<text>` is `[text]`, `meta.map<text int32>` is `{text =>
  int32}`, `meta.ref<method>` is `!meta.ref { of: method }`. An argument is not followed through an alias, so
  `meta.array<user_id>` is `[user_id]`. A construction leaving another required field unwritten is refused
  (`meta.enum_type<meta.identifier>`).
- **An incomplete entry** — completed, the arguments filling the slots it left absent: `set<text>` is `!meta.array
  { element_type: text  ordered: false  unique_items: true }`; over `nonempty => !meta.array ^ { min_items: 1 }`,
  `nonempty<uuid>` is the type `[uuid; 1..]` is.
- **A parametric record** — substituted (`parametric-records.md`).

An argument is a type and never a literal: no number and no quoted token. A sugar form or record body is never an
argument, and a parametric record's argument is a name, or one of the enclosing parametric record's parameters
(`orders => [order]`, then `page<orders>`). An application of a constructor or incomplete entry may take another
application as an argument (`meta.map<text meta.array<T>>`). `meta.apply` stays in resolved output only inside a
parametric record over one of its parameters, and as `@meta.application`'s value. No data value carries an
argument list.

## Products (kernel)

| Constructor | Fields | Sugar |
|---|---|---|
| `meta.record` | `fields: meta.field_map` (name → `meta.record_field`, ordered), `parameters?: [meta.param; 1..]`, `groups?: [meta.field_group]`, `extension?: meta.record_extension_type ~ OPEN`, `discriminators?: [text; 1..]`, `name_type?: meta.identifier_ref` | `{ … }`; `abstract { … }`, `final { … }`; `=?` on a field; `<T> { … }`, `<T: text> { … }` for a parametric record (`meta.param` = `{ name: meta.param_name  bound?: meta.type_ref }`) |
| `meta.array` | `element_type: meta.type_expr`, `voidable? ~ false`, `ordered? ~ true`, `unique_items? ~ false`, `min_items?`, `max_items?: numeric.count` | `[T]`, `[T; N..M]`, `[T?]`, `meta.array<T>` |
| `meta.set_type` — incomplete | `!meta.array ^ { voidable: false  ordered: false  unique_items: true }`, `element_type` left open; the root's `set` is an alias of it | `set<T>`. No type: a slot holding set types is `meta.ref<meta.array>`. **A set may be empty**; say `min_items: 1` in a named completion for one that may not |
| `meta.map` | `key_type: meta.type_ref` (a name only), `value_type: meta.type_expr`, `voidable? ~ false`, `ordered? ~ false`, `min_items?`, `max_items?: numeric.count` | `{K => V}`, `{K => V?; 1..}`, `meta.map<K V>` |
| `meta.namespace` (`meta.map & { … }`) | `key_type: meta.identifier_ref`, `voidable? = false` | none — a map keyed by names, whose values a qualified name enters (`extending.md`). Its `key_type` admits no `.` |
| `meta.tuple` | `elements: [meta.tuple_element]` (`{ element_type: meta.type_expr  voidable? }`) | `[T, U?]`, two positions or more. One position is declared: `one_text => !meta.tuple [{ element_type: text }]` (add `voidable: true` to admit `[_]`) |

`ordered` says whether two values differing only in order are one value; it never changes what a document may
write, and output keeps the written order. A map whose entry order matters is `!meta.map { key_type: K
value_type: V  ordered: true }` — the sugar has no spelling for it. A container's part is a value or void, never
missing, so containers carry `voidable` and no `optional`.

A **construction** (`!C { … }`) and a **refinement** (`!I ^ { … }`) are declaration bodies, never written at a
field: `{ e: !enum [A B] }` is refused — name it first. The sugar, an applied constructor and a completion are
written in place (`ids: meta.array<uuid>`, `tags: set<text>`). Declarations are the way to an ordered map, a
composite map key, or a bounded set at a field (`tag_set => !meta.set_type { element_type: text  min_items: 1 }`,
then `tags: tag_set`). A shape reused over many element types is a **construction left open**: `nonempty =>
!meta.array ^ { min_items: 1 }`, then `nonempty<text>` wherever it is wanted.

## Which names exist

Kernel roots (any closure holding `meta.tn`): `void boolean integer int64 text bytes iri iri_reference regex doc
enum set schema`.
`numeric.tn`: `number rational complex int8 int16 int32 int128 int256 uint8 uint16 uint32 uint64 uint128 uint256
float32 float64`.
`temporal.tn`: `date time datetime duration period`.
`net.tn`: `email ipv4 ipv6 cidr4 cidr6 mac hostname host media_type uri_reference uri uuid`.
`core.tn` (annotations): `deprecated title comment examples read_only write_only`.
By path, the ones an author reaches for: `meta.identifier`, `meta.type_ref`, `meta.ref<T>`, `meta.type_expr`,
`meta.record`, `meta.array`, `meta.map`, `meta.set_type`, `meta.namespace`, `meta.enum_type`, `meta.extern`,
`meta.declared`, `numeric.count`, and the constructors for a fresh family (`!net.uuid_type {}`,
`!unicode.identifier_type { … }`, `!binary.bytes_type { encoding: HEX }`).

Names that do **not** exist: `string str int float double bool binary base64 base64url base32 hex timestamp decimal
url ip any null unknown unit value list array map record object identifier kind ref text_enum declared
dynamic non_empty_text positive_integer non_negative_integer negative_integer non_positive_integer annotation
documentation` at the root, nor any kernel constructor unqualified (`integer_type` is `numeric.integer_type`),
nor `meta.field_name` (a field name is a value of its record's `name_type`), `meta.template` or `meta.tuple1`. A
sign bound, a non-empty text and an `identifier` are one line a schema writes for itself. `set`, `bytes`,
`period`, `iri` and `doc` *do* exist at the root, `set` and `enum` as incomplete entries a schema completes
(`set<T>`, `!enum [ … ]`) and never names as a type.

## Annotation types

Resolved from the root like any name, in the annotating document's namespace:

- **Kernel**: `@doc:"…"` (CommonMark 0.31.2, no extensions; raw HTML never executed). `@atom.ordering:NONE|PARTIAL|TOTAL`
  (whether the value space has an order relation — not a container's `ordered`), `@atom.bounded:true|false`
  (whether the value space has a finite least and greatest value: `date`, `datetime`, `duration` and the fixed
  widths do, `uuid`, `mac` and the CIDR families do not), `@atom.exact:true|false`, `@atom.numeric` (bare).
  `@meta.disjoint` (bare, on a choice; checked at load). `meta.annotation` marks a type meant as an annotation.
  `@meta.application` (on a declared application's key: `{ head: pair  arguments: [text integer] }`, a
  `meta.apply` value) and `@meta.completion` (on a declared completion's key: `{ of: [meta.set_type] }`) are
  resolver-attached; writing either is a resolver error.
- **`core.tn`**: `@title:"…"` (plain text), `@comment:"…"` (for maintainers; a documentation tool leaves it out),
  `@examples:["…" "…"]` (a list of *text*, conventionally the value in TSON notation, `"{ x: 1 }"`; nothing parses
  it), `@deprecated` (bare; a reason belongs in `@doc`), `@read_only` / `@write_only` (bare, never both on one
  field). A schema importing the libraries without `core.tn` may declare these names itself.

There is no `@since`, `@todo`, `@lang`, `@documentation`, `@discriminator`, `@ordering` (it is `@atom.ordering`)
or `@rest`: a sealed family is `abstract` plus a `=?` selector, open-ended data is a map field, and any other
annotation is one line your schema declares (`since => @meta.annotation text`).
