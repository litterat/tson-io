---
name: tson-data
description: Write, read, convert, and fix TSON data documents (.tn files) — the Typed Schema Object Notation text format, JSON-like but not a JSON superset, with optional quotes and commas, records vs maps, the absent sentinel `_` (there is no `null`), annotations (`@`), type annotations (`!uuid`, `!date`, `!bytes`…) and directives (`!!id`, `!!schema`). Use this skill whenever the user mentions TSON, a `.tn` file, tson.io, or asks to convert JSON/YAML/TOML into TSON, to write example data for a TSON schema, or to explain why a TSON document fails to parse. Also use it when a user writes something that looks like TSON (unquoted keys, arrow-separated maps, `!type` prefixes, `_` values) even if they don't name the format. For writing schema documents (files with `!!meta`, name-to-type declarations) use the tson-schema skill instead.
---

# TSON data documents

TSON (Typed Schema Object Notation) is a Unicode text format in the JSON family: quotes and commas are optional where the structure is unambiguous, there are three containers instead of two (records, maps, arrays), a distinct absent sentinel `_`, and three kinds of augmentation — annotations `@name`, type annotations `!name`, and directives `!!name:"…"`.

**TSON is JSON-*like*, not a JSON superset.** A JSON document is not a TSON document, and JSON is a second encoding of the same model, read through a JSON reader that maps its `null` to absence. Do not paste JSON and call it TSON — convert it (see below).

This skill covers **data documents** — the Class 1 format defined by *TSON Part 1: Text Data Format*, 2026 Revision 35. The rules below are the ones an author actually needs; `references/` holds the details to consult when a case is unusual.

> Revision note: the 2026 series is a working draft. Identifiers such as `https://tson.io/2026/35/m/core.tn` carry the revision number; when the revision changes, so do those URLs and every hash pin against them.

## Workflow

1. **Decide the document kind.** A data document has an optional `!!id`, an optional `!!schema`, then exactly one value. If the file needs `!!meta` or `name => type` declarations, it is a *schema* document — switch to the tson-schema skill.
2. **Write the header.** `!!id:"…"` first (only if the document is published or hash-pinned), then `!!schema:"…"` if a schema governs it. Directive arguments are single-line quoted strings, the `:` is glued to the name, and each directive is on its own physical line.
3. **Write the value**, following the quoting rule and the container rules below. Under a schema, annotate the root with its type (`!order { … }`).
4. **Self-check** against the pitfalls table at the end and the full table in `references/pitfalls.md` — those are the errors that YAML/JSON habits produce. If a hash pin is needed, compute it with `scripts/pin.py`; never invent one.

## Structure

| Container | Syntax | Separator between name/key and value | Notes |
|---|---|---|---|
| Record | `{ name: value  other: value }` | `:` | fixed, named fields; names are identifiers, unique; at least one field |
| Map | `{ key => value  key2 => value }` | `=>` | keys are any data value (not only strings); keys unique; at least one entry |
| Array | `[ a b c ]` or `[a, b, c]` | whitespace or comma | ordered; `[]` is the empty array |

Values are separated by whitespace, a comma, or both, and **a comma may follow a value** — `[1 2 3]`, `[1,2,3]` and `[1, 2, 3,]` are identical, as are `{ x: 1 }` and `{ x: 1, }`. A trailing comma is safe here where it is not in JSON because TSON has no elision: absence is spellable and occupies a slot, so `[1, 2,]` is two elements and `[1 2 _]` is three. Still parse errors: a comma with no value before it (`[, 1]`, `[1, , 2]` — each fails as a missing value) and zero separation (`[1"a"]`). Indentation and line breaks are never significant, and no separator is needed next to a delimiter: `{name:Alice}` is fine.

The brace form is decided by the first thing inside it: `{}` is an *empty brace* (resolves to an empty record unless a schema says map); `{ name: …` is a record; `{ key => …` is a map. A record cannot contain `=>` entries and a map cannot contain `:` fields.

**There is no comment syntax.** `#`, `//`, `/* */` are all lexer errors. Put explanatory text in a `@doc:"…"` annotation on the value it describes.

## Tokens and the quoting rule

A scalar is a *token*: unquoted (`Alice`, `42`, `2025-03-13`, `A-100`, `名前`), single-line quoted (`"has spaces"`), or multi-line quoted (`"""…"""`). Quoting changes a value's identity in one place only: base type resolution, where `42` is a number and `"42"` is the string. Everywhere else form is not meaning — `name` and `"name"` are one field name, `!date 2025-03-13` equals `!date "2025-03-13"`.

An unquoted token may contain only letters and digits of any script (`XID_Continue`) plus `-`, `+`, `.`, and must start with one of those. Two-clause decision procedure for any string value:

1. **Quote if any character is outside that set** — space, `:`, `@`, `/`, `%`, `$`, `#`, `*`, `'`, `` ` ``, `\`, `&`, `<`, `>`, `?`, `|`, `;`, `(`, `)`, `^`, `=`, `!`, `~`, `{`, `}`, `[`, `]`, `,`, `"`. That makes the rule *always* for whole kinds of content: times and datetimes (`"14:30:00Z"`), URLs with a scheme, email addresses, file paths, IPv6 addresses, CIDR networks, rationals (`"2/3"`), money (`"$19.99"`), anything with `..`.
2. **Quote if the bare token would resolve to something other than the intended string.** `"true"`, `"false"`, `"42"`, `"1e5"`, `"-0.0"`, `".inf"`, and hex-shaped identifiers such as `"0x71C7656EC7ab88b098defB751B7401B5f6d8976F"` — an unquoted `0x…` token is a number. `null` is *not* on this list: it is an ordinary string, so bare `null` and `"null"` are the same value.

Also always quote, at a **value** position: a token that would start with `_` (`"_id"` — bare `_` is the absent sentinel, and `_` cannot start a token), and the single characters `"-"`, `"+"`, `"."`. At a **name** position quoting does not rescue these — see the next section.

Calendar dates (`2026-07-01`), UUIDs, hyphen-separated MACs, version strings (`v1.2.3`), and identifiers with hyphens (`A-100`) are all fine unquoted. **Single quotes are not a string delimiter** — `'x'` is a lexer error.

Unquoted tokens must be in Unicode NFC; if you generate non-ASCII names, emit NFC.

### Names are identifiers, at every layer

A **field name**, an annotation name and a type-annotation name are *names*, not arbitrary strings. Each is matched — after unquoting and NFC normalisation — in full against the identifier grammar: it starts with `XID_Start` and continues with `XID_Continue` or `-`. A token in name position whose decoded text is not an identifier is a **parse error**, schemaless or governed.

Quoting a name buys relief from the *lexical* accidents of the unquoted form; it does not buy a different set of names. So all of these fail:

So `{ "first name": 1 }` (space), `{ _id: 1 }` and `{ "_id": 1 }` (no identifier starts with `_`, and quoting does not help) and `{ 42x: 2 }` (must start with `XID_Start`) are all parse errors.

The remedy is the one the format already has: **a key that is not a name belongs in a map.** Write `{ "Content-Type" => "text/plain" }`, `{ "_id" => 1 }`. Record fields are the named members of a shape, which is what makes them declarable; map keys are values and are never matched against the identifier grammar.

`true`, `false` and `null` are identifiers like any other — there is no keyword list — so `{ true: 1 }` is a legal record with a field named `true`.

### Quoted strings

Single-line strings use the escapes `\" \\ \b \f \n \r \t` plus TSON's `\s` (a space). **`\/` is not an escape** — a solidus needs none. A literal tab must be escaped as `\t`.

Character escapes come in two spellings, `"\u" ( 4HEXDIG / "{" 1*6HEXDIG "}" )`, and the value denoted must be a Unicode scalar value — in range and not a surrogate code point. `A` and `\u{41}` are two spellings of one character; `\u{1F600}` names a supplementary character directly, as does `\u{E0100}` for an invisible variation selector. **There are no surrogate pairs**: the JSON spelling `\uD83D\uDE00` is two lexer errors, not one emoji — write `\u{1F600}`, or paste the character itself.

Multi-line strings open with `"""` plus a line break and close with `"""` on its own line. Common leading indentation (measured against the closing line too, character by character — tabs and spaces do not match) is stripped; trailing spaces are stripped (use `\s` to keep one); the final newline before the close is not part of the value. Literal `"` and `""` inside are content; literal tabs are allowed.

```
notes: """
  Leave the parcel with the concierge.
  Gift wrap — no prices on the slip.
  """
```

## What an unquoted token means (base type resolution)

Base type resolution assigns one of **three** host base types — boolean, number, string — and it applies **only in schemaless documents**: a document whose header carries no `!!schema`. Under a schema it does not apply at all; every value is typed by its position or its tag, and each declared atom owns its parsing contract. A built-in `!type` annotation also overrides it for its token.

Where it applies, every unquoted token is resolved in this order — first match wins, and the whole token must match:

1. `true` / `false` — exactly, lowercase. `yes`, `no`, `on`, `off`, `True`, `FALSE` are strings.
2. A number per the number grammar: integers (`42`, `-7`, `+3`, `1_000_000`), based integers (`0xFF`, `0o755`, `0b1010`, lowercase prefix), floats (`1.5`, `.5`, `6.02e23`, `-2e-3`, `+0.0`, `-0.0`), and the specials `.inf`, `-.inf`, `.infinity`, `.nan`. Leading zeros are not allowed (`007` is a string); `5.` is a string; `1.2.3` is a string; `3+4i` and `2/3` are not numbers under base resolution.
3. Otherwise a string — **`null` included**. There is no null keyword; a bare `null` is the four-character string.

The fall-through is deliberate and total: a resolver never refuses an untyped token. If you need `007` read as an integer or `2025-03-13` read as a date, say so with an annotation (`!int32 007` is refused, `!date 2025-03-13` is checked) or with a schema. Only `true` and `false` are keyword-like, and only here — under a schema they are the members of the kernel's `boolean` enum and ordinary identifiers everywhere else.

Numbers are arbitrary precision. Distinct spellings of one value are equal (`255` = `0xFF`, `.5` = `0.5`), and re-emitters should preserve the original spelling.

**Field names are names and map keys are text** — neither is resolved. Map key identity is textual (`07` and `7` are different keys; `Alice` and `"Alice"` are the same key).

## `_` — the absent sentinel

`_` means "present, with no value", and it is the only spelling of absence — there is no `null`. Use `_` for a field or entry that is deliberately blank. It can stand at any value position — field value, map entry value, array element (`[1 _ 3]` has three elements), or the whole document (`!!id:"…"` followed by `_` is a metadata-only document) — but never as a map key.

Under a schema, whether `_` is admitted at a position depends on the declared type (optional fields and `[T?]` elements admit it; required fields do not — omit the field instead and let the default inject).

## Augmentation

All three forms attach to the value that *follows* them, in this order: directive, annotations, type annotation, core value.

```
shipping: !!schema:"https://example.com/address.tn" @doc:"billing copy" !address { street: "12 Byron Rd"  city: London }
```

**Annotations `@name` or `@name:value`.** The `@` is glued to the name; with a value the `:` is glued too, and the value is exactly one data value. A valueless annotation needs whitespace after its name. Annotations attach to values, never to field names: `{ name: @deprecated Alice }`, not `{ @deprecated name: Alice }`. On a map entry, annotations before the key annotate the key and those after `=>` the value. The same annotation may repeat; order is preserved. Without a schema they are preserved and never validated; under a schema each `@name` must be a type in the schema's namespace (`@doc` needs core imported) and its value must conform.

**Type annotations `!name`.** Glued `!` plus an identifier, then whitespace (or directly a `{`/`[`). `!int32 "5"` needs the space; `!person{name:Alice}` is fine. It tags the value that follows, not its contents. Only a plain name may follow `!` — `![text]`, `!list<text>`, `!text?` are parse errors.

Without a schema, the built-in vocabulary applies (next section) and any other `!name` is preserved as an uninterpreted marker — never an error. Under a `!!schema`, **every** `!name`, built-in names included, must resolve in that schema's namespace; a schema that wants `!uuid` imports the core library.

**Directives `!!name:"…"`.** Only four exist, each with one legal position: `!!id` (first line), `!!schema` (data-document header, at most once; or immediately before a field value, map entry value or array element, to scope that one value), `!!meta` and `!!import` (schema documents only). Any other name is a parse error; there is no extension mechanism. A directive may not precede a field name, a map key or an annotation value. Parsing never fetches a directive's URL. **A schemaless document opens no schema scope** — a nested `!!schema` in a document with no `!!schema` of its own is a validation error.

## Built-in type annotations (schemaless)

When no schema is in scope, these names parse the following token by the named atom's contract instead of base resolution. They apply to scalars only — annotate elements individually (`[!int32 1 !int32 2]`), never the array. Names are case-sensitive (`!UUID` is not built in).

| Annotation | Accepts | Must quote? |
|---|---|---|
| `!int8 !int16 !int32 !int64 !int128 !int256`, `!uint8 … !uint256` | decimal or based integer; range-checked (`!uint8 300` fails validation; `!uint32 -1` fails) | no |
| `!positive_integer !non_negative_integer !negative_integer !non_positive_integer` | integer with sign bound | no |
| `!number` | exact decimal, preserved as written; no `.inf`/`.nan` | no |
| `!float32 !float64` | integer, float, hex-float (`0x1.8p3`), `.inf`, `.nan`; rounded to IEEE grid | no |
| `!rational` | `a/b`, b nonzero, not normalised | **yes** (`/`) |
| `!complex` | `3+4i`, `2.5-1j`, or plain number | no |
| `!text` | any token; asserts "this is a string" (`!text "42"`) | as content requires |
| `!date` | RFC 3339 `YYYY-MM-DD` | no |
| `!time` | RFC 3339 `HH:MM:SS[.frac](Z\|±HH:MM)` — offset mandatory; the value is the time of day **in UTC** | **yes** |
| `!datetime` | RFC 3339 `YYYY-MM-DDTHH:MM:SS…` with offset; the value is the **instant** | **yes** |
| `!duration` | elapsed time: `P`/`PT` with `W`, `D`, `H`, `M`, `S` components only — no `Y`, no month `M`; signed; fraction on seconds only | no (yes if written with colons) |
| `!period` | calendar span: `P` with a `Y` component, an `M` component, or both, and nothing else; signed | no |
| `!uuid` | RFC 9562 | no |
| `!uri` | RFC 3986 | yes if it has a scheme (`:`) |
| `!email` | `local@domain` (dot-atom only; no quoted local parts or `[ip]` literals) | **yes** (`@`) |
| `!ipv4` | dotted quad | no |
| `!ipv6` | RFC 4291 text form; no zone ids (`%eth0`) | **yes** (`:`) |
| `!cidr4 !cidr6` | `addr/prefix`; host bits must be zero | **yes** (`/`) |
| `!mac` | EUI-48, `aa-bb-cc-dd-ee-ff` or `aa:bb:…` | colon form yes, hyphen form no |
| `!bytes` | base64 (RFC 4648 §4), **padding required**; the value is the octets | recommended |

`!bytes` is the only binary tag: there is no `!base64`, `!base64url`, `!base32`, `!hex` or `!binary`, and no generic `!string`, `!int`, `!float`, `!bool` or `!timestamp`. An alphabet is a *spelling* of an octet sequence, not a kind of value; a schema wanting another declares another type over the same `bytes`. A token the atom cannot parse is a resolver error; a parsed value out of range is a validation error.

**Value is not spelling.** `!bytes` is octets; `!datetime` is an instant and `!time` a UTC time of day, so `+01:00` and `Z` spellings of one instant are one value. `!duration` (signed decimal seconds) and `!period` (signed integer months) are two value spaces — `P1Y2M3DT4H5M6S` is an error under both, and a span that is genuinely both is a record with a field of each. See `references/builtin-types.md`.

## Worked example

```
!!id:"https://example.com/orders/1042.tn"
!!schema:"https://example.com/order.tn"
@doc:"Order record exported 2026-07-03"
!order {
  order_id:  1042
  reference: !uuid 9f1c8e2a-4b7d-4e6f-9a3b-2c5d8e7f1a09
  customer: {
    name:  "Ada Lovelace"
    email: "ada@example.com"
    tier:  @deprecated GOLD
  }
  placed:   !date 2026-07-01
  total:    !number 199.90
  flags:    0b0110
  lead_time: !duration P3D
  receipt:  !bytes "iVBORw0KGgo="
  items: [
    { sku: A-100 qty: 2 price: 49.95 discount: .5 }
    { sku: B-205 qty: 1 price: 100.00 discount: _ },
  ]
  discounts: { @expires:"2026-12-31" WELCOME10 => "10%" loyalty => _ }
  headers:   { "Content-Type" => "application/json" }
  notes: """
    Leave the parcel with the concierge.
    """
}
```

## Converting from JSON and YAML

**JSON is not a paste-in.** Three things must change, and the first two are silent corruptions if you skip them:

1. **`null` → `_`.** JSON `null` means absence. Left as the bare token it becomes the *string* `null` — a valid document that says something else.
2. **Object keys that are not identifiers → a map.** `{"first name": …}`, `{"_id": …}`, `{"Content-Type": …}` are parse errors as records; write those objects with `=>`. A JSON object whose keys are arbitrary (a dictionary) should be a map anyway.
3. **`\/` → `/`**, and surrogate pairs → one `\u{…}` escape.

Then make it idiomatic: drop the quotes on names and on string values inside the unquoted profile, drop commas (or keep them, trailing one included), and keep quotes wherever clause 1 or 2 of the quoting rule applies. JSON numbers are exact `number`s; do not annotate them `!float64` unless the consumer wants rounding.

YAML: `key: value` carries over when the key is an identifier, but every list becomes `[ … ]` (no `- item`), `#` comments become `@doc:"…"` or are dropped, `yes`/`no`/`on`/`off` become `true`/`false` and `~`/`null` become `_`, block scalars become `"""` strings, anchors and merge keys (`&`, `*`, `<<`) must be expanded inline, and anything with a colon gets quoted.

## Pitfalls — check before delivering

The errors a JSON or YAML habit produces come first:

| You wrote | Problem | Write instead |
|---|---|---|
| `_id: 1` or `"_id": 1` | not an identifier, so not a field name; quoting does not help | `{ "_id" => 1 }` — use a map |
| `"first name": 1`, `"Content-Type": "…"`, `42x: 2` | field names must be identifiers | move them into a map with `=>` |
| `missing: null` meaning "no value" | `null` is the *string* `null` | `missing: _` |
| `"a\/b"`, `"\uD83D\uDE00"` | `\/` is not an escape; no surrogate pairs | `"a/b"`, `"\u{1F600}"` |
| `!base64 "…"`, `!hex "…"` | no such tag | `!bytes "…"` (base64, padded) |
| `!duration P1Y2M` | a year/month span is not a duration | `!period P1Y2M` |
| `!duration P1W2D` | the week form stands alone | `P9D`, or `PT216H` |
| `[, 1]`, `[1, , 2]` | a comma with no value before it | drop it — `[1, 2, 3,]` and `{ a: 1, }` are legal |
| `# comment` or `// comment` | `#`, `/` are lexer errors | `@doc:"comment"` on the value |
| `'text'` | `'` is a lexer error | `"text"` |

The full table — glued prefixes, directive placement, container mixing, YAML syntax, near-miss numbers — is in `references/pitfalls.md`. Read it before handing over a document.

## Reference files

- `references/builtin-types.md` — every built-in annotation's exact contract, host value, parse-vs-validation behaviour, and the number grammar.
- `references/grammar-notes.md` — lexer details: the unquoted-token and identifier profiles, whitespace and bidi marks, escape rules, multi-line stripping worked examples, adjacency table, error categories, and what TSON shares with JSON and where the two part.
- `references/pitfalls.md` — every mistake this skill has seen, with the fix. Read before delivering.
- `scripts/pin.py` — compute or verify a `?sha256=` content pin for a `.tn` file (hash of every byte after the `!!id` line).

## Implementations

Two implementations track this revision series:

- **Java** — https://github.com/litterat/ltr8-io-tson-java
- **TypeScript** — https://github.com/litterat/ltr8-io-tson-typescript

Either will check work this skill produces, reporting the diagnostics the specification defines.
Language-specific guidance belongs with those projects; look there for a `tson-java` or `tson-ts` skill.
