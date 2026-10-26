---
name: tson-data
description: Write, read, convert, and fix TSON data documents (.tn files) — the Typed Schema Object Notation text format, JSON-like but not a JSON superset, with optional quotes and commas, records vs maps, the void sentinel `_` (there is no `null`), annotations (`@`), type annotations (`!uuid`, `!date`, `!bytes`…) and directives (`!!id`, `!!schema`). Use this skill whenever the user mentions TSON, a `.tn` file, tson.io, or asks to convert JSON/YAML/TOML into TSON, to write example data for a TSON schema, or to explain why a TSON document fails to parse. Also use it when a user writes something that looks like TSON (unquoted keys, arrow-separated maps, `!type` prefixes, `_` values) even if they don't name the format. For writing schema documents (files with `!!meta`, name-to-type declarations) use the tson-schema skill instead.
---

# TSON data documents

TSON (Typed Schema Object Notation) is a Unicode text format in the JSON family: quotes and commas are optional where the structure is unambiguous, there are three containers instead of two (records, maps, arrays), a void sentinel `_`, and three kinds of augmentation — annotations `@name`, type annotations `!name`, and directives `!!name:"…"`.

**TSON is JSON-*like*, not a JSON superset.** A JSON document is not a TSON document, and JSON is a second encoding of the same model (*TSON Part 3: JSON Encoding*), read through a JSON reader that maps its `null` to void. Do not paste JSON and call it TSON — convert it (see below).

This skill covers **data documents** — the Class 1 format defined by *TSON Part 1: Text Data Format*, 2026 Revision 37. The rules below are the ones an author needs; `references/` holds the unusual cases.

> The 2026 series is a working draft: URLs such as `https://tson.io/2026/37/m/core.tn` carry the revision number, and pins against them change with it.

## Workflow

1. **Decide the document kind.** A data document has an optional `!!id`, an optional `!!schema`, then exactly one value. If the file needs `!!meta` or `name => type` declarations, it is a *schema* document — switch to the tson-schema skill.
2. **Write the header.** `!!id:"…"` first (only if the document is published or hash-pinned), then `!!schema:"…"` if a schema governs it. A directive argument is a single-line quoted IRI-reference, the `:` is glued to the name, and each directive is on its own physical line.
3. **Write the value**, following the quoting rule and the container rules below. Under a schema, annotate the root with its type (`!order { … }`).
4. **Self-check** against the pitfalls table at the end and the full table in `references/pitfalls.md`. If a hash pin is needed, compute it with `scripts/pin.py`; never invent one.

## Structure

| Container | Syntax | Separator between name/key and value | Notes |
|---|---|---|---|
| Record | `{ name: value  other: value }` | `:` | fixed, named fields; names are identifiers, unique; at least one field |
| Map | `{ key => value  key2 => value }` | `=>` | keys are any data value (not only strings); keys unique; at least one entry |
| Array | `[ a b c ]` or `[a, b, c]` | whitespace or comma | ordered; `[]` is the empty array |

Values are separated by whitespace, a comma, or both, and **a comma may follow a value** — `[1 2 3]`, `[1,2,3]` and `[1, 2, 3,]` are identical, as are `{ x: 1 }` and `{ x: 1, }`. TSON has no elision — a void value is spelled `_` and occupies a slot — so `[1, 2,]` is two elements and `[1 2 _]` three. Still parse errors: a comma with no value before it (`[, 1]`, `[1, , 2]`) and zero separation (`[1"a"]`). Indentation is never significant, and no separator is needed next to a delimiter: `{name:Alice}` is fine.

The brace form is decided by the first thing inside it: `{}` is an *empty brace* (resolves to an empty record unless a schema says map); `{ name: …` is a record; `{ key => …` is a map. A record cannot contain `=>` entries and a map cannot contain `:` fields.

**There is no comment syntax.** `#`, `//`, `/* */` are all lexer errors. Put explanatory text in a `@doc:"…"` annotation on the value it describes.

## Tokens and the quoting rule

A scalar is a *token*: unquoted (`Alice`, `42`, `2025-03-13`, `A-100`, `名前`), single-line quoted (`"has spaces"`), or multi-line quoted (`"""…"""`). Quoting changes a value's identity in one place only: base type resolution, where `42` is a number and `"42"` is the string. Everywhere else form is not meaning — `name` and `"name"` are one field name, `!date 2025-03-13` equals `!date "2025-03-13"`.

An unquoted token may contain only letters and digits of any script (`XID_Continue`) plus `-`, `+`, `.`, and must start with one of those. Two-clause decision procedure for any string value:

1. **Quote if any character is outside that set** — a space, or any of ``: @ / % $ # * ' ` \ & < > ? | ; ( ) ^ = ! ~ { } [ ] , "``. That makes the rule *always* for whole kinds of content: times and datetimes (`"14:30:00Z"`), URLs with a scheme, email addresses, file paths, IPv6 addresses, CIDR networks, rationals (`"2/3"`), money (`"$19.99"`), anything with `..`.
2. **Quote if the bare token would resolve to something other than the intended string.** `"true"`, `"false"`, `"42"`, `"1e5"`, `"-0.0"`, `".inf"`, and hex-shaped identifiers such as `"0x71C7…"` — an unquoted `0x…` token is a number. `null` is *not* on this list: it is an ordinary string, so bare `null` and `"null"` are the same value.

Also always quote, at a **value** position: a token that would start with `_` (`"_id"` — bare `_` is the void sentinel, and `_` cannot start a token), and the single characters `"-"`, `"+"`, `"."` (a bare `-` or `+` is a schema-grammar special token and a parse error in data; a bare `.` is a lexer error). At a **name** position quoting does not rescue these — see the next section.

Calendar dates (`2026-07-01`), UUIDs, hyphen-separated MACs, version strings (`v1.2.3`), and identifiers with hyphens (`A-100`) are all fine unquoted. **Single quotes are not a string delimiter** — `'x'` is a lexer error.

Unquoted tokens must be in Unicode NFC (a lexer error otherwise), so emit NFC. A quoted value keeps its exact code points, but wherever two values are compared they compare in NFC: `"cafe\u0301"` and `"caf\u00E9"` are two strings as written and one map key.

### Names are identifiers, at every layer

A **field name**, an annotation name and a type-annotation name are *names*. Each is matched — after unquoting and NFC normalisation — in full against the identifier grammar: it starts with `XID_Start` and continues with `XID_Continue` or `-`. Anything else in name position is a **parse error**, schemaless or governed, and quoting does not buy a different set of names. So `{ "first name": 1 }` (space), `{ _id: 1 }` and `{ "_id": 1 }` (no identifier starts with `_`, and quoting does not help) and `{ 42x: 2 }` (must start with `XID_Start`) are all parse errors.

The remedy: **a key that is not a name belongs in a map.** Write `{ "Content-Type" => "text/plain" }`, `{ "_id" => 1 }`. Map keys are values, not names. The one exception is a schema's to make: a key — or any value — whose declared type is an **identifier family** is a name, matched against that family's profile.

Names also meet **name hygiene**: a processor refuses look-alikes under its policy (Cyrillic `а` in `аdmin`, two skeleton-equal names in one record or in one identifier-keyed map). A refusal is a policy outcome, not an invalid document; keep names in one script per word.

`true`, `false` and `null` are identifiers like any other — there is no keyword list — so `{ true: 1 }` is legal.

### Quoted strings

Single-line strings use the escapes `\" \\ \b \f \n \r \t` plus TSON's `\s` (a space). **`\/` is not an escape** — a solidus needs none. A literal tab must be escaped as `\t`.

Character escapes are `\uXXXX` or `\u{1-6 hex}`, denoting a Unicode scalar value. **There are no surrogate pairs**: JSON's `\uD83D\uDE00` is two lexer errors — write `\u{1F600}`, or paste the character.

Multi-line strings open with `"""` plus a line break and close with `"""` on its own line. Common leading indentation (the closing line included; tabs and spaces do not match) and trailing spaces are stripped (`\s` keeps one); the final newline is not part of the value. See `notes` in the worked example, and `references/grammar-notes.md`.

## What an unquoted token means (base type resolution)

Base type resolution assigns one of **three** host base types — boolean, number, string — and it applies **only where nothing types the position**: a document with no `!!schema`, read into no declared type. Under a schema — or when a processor binds into a host type naming a family Part 1 defines — the type's own contract reads the token. A built-in `!type` annotation also overrides it for its token.

Where it applies, every unquoted token is resolved in this order — first match wins, and the whole token must match:

1. `true` / `false` — exactly, lowercase. `yes`, `no`, `on`, `off`, `True`, `FALSE` are strings.
2. A number per the number grammar: integers (`42`, `-7`, `+3`, `1_000_000`), based integers (`0xFF`, `0o755`, `0b1010`, lowercase prefix), floats (`1.5`, `.5`, `6.02e23`, `-2e-3`, `+0.0`, `-0.0`), and the specials `.inf`, `-.inf`, `.infinity`, `.nan`. Leading zeros are not allowed (`007` is a string); `5.` is a string; `1.2.3` is a string; `3+4i` and `2/3` are not numbers under base resolution.
3. Otherwise a string — **`null` included**. There is no null keyword; a bare `null` is the four-character string.

The fall-through is total: a resolver never refuses an untyped token. To have `2025-03-13` read as a date, say so with an annotation (`!date 2025-03-13` is checked; `!int32 007` is refused) or a schema. Only `true` and `false` are keyword-like, and only here.

Numbers are arbitrary precision. Distinct spellings of one value are equal (`255` = `0xFF`, `.5` = `0.5`), and re-emitters should preserve the original spelling.

**Field names are names and map keys are text** — neither is resolved. Map key identity is textual (`07` and `7` are different keys; `Alice` and `"Alice"` are the same key).

## `_` — the void sentinel

`_` is the **void sentinel**: the slot is present and its value is *void*. It is the only spelling of void; there is no `null`. A key that does not appear at all is **missing**, a different thing. `_` can stand at any value position — field value, map entry value, array element (`[1 _ 3]` has three elements), or the whole document (`!!id:"…"` followed by `_` is a metadata-only document) — but never as a map key.

Under a schema each kind of nothing has its own name. A field that may be missing is **optional** (`a?: T`); a slot that may hold `_` is **voidable**, its type carrying `?` (`a: T?`, `a?: T?`, `[T?]`, `{K => V?}`). `_` at a slot that is not voidable is a validation error; at a defaulted field (`a?: T ~ v`) omitting the key is what injects the default. Schemaless, neither spelling carries a value.

## Augmentation

All three forms attach to the value that *follows* them, in this order: directive, annotations, type annotation, core value.

```
shipping: !!schema:"https://example.com/address.tn" @doc:"billing copy" !address { street: "12 Byron Rd"  city: London }
```

**Annotations `@name` or `@name:value`.** The `@` is glued to the name; with a value the `:` is glued too, and the value is exactly one data value. A valueless annotation needs whitespace after its name. Annotations attach to values, never to field names: `{ name: @deprecated Alice }`, not `{ @deprecated name: Alice }`. On a map entry, annotations before the key annotate the key and those after `=>` the value. The same annotation may repeat; order is preserved. Without a schema they are preserved and never validated; under a schema each `@name` must be a type in the schema's namespace (`@doc` needs core imported) and its value must conform.

**Type annotations `!name`.** Glued `!` plus an identifier, then whitespace (or directly a `{`/`[`). `!int32 "5"` needs the space; `!person{name:Alice}` is fine. It tags the value that follows, not its contents. Only a plain name may follow `!` — `![text]`, `!list<text>`, `!text?` are parse errors.

Without a schema, the built-in vocabulary applies (next section) and any other `!name` is preserved as an uninterpreted marker — never an error. Under a `!!schema`, **every** `!name`, built-in names included, must resolve in that schema's namespace; a schema that wants `!uuid` imports the core library.

**Directives `!!name:"…"`.** Only four exist: `!!id` (first line), `!!schema` (data-document header, at most once; or immediately before a field value, map entry value or array element, to scope that one value), `!!meta` and `!!import` (schema documents only). Any other name, or a directive before a field name, map key or annotation value, is a parse error. The argument is an IRI-reference (non-ASCII written as itself and compared as written), and parsing never fetches it. An `!!id` must already be canonical — lowercase host, no port, userinfo or fragment, and with no host an absolute path (`/local/orders.tn`). **A schemaless document opens no schema scope** — a nested `!!schema` in a document with no `!!schema` of its own is a validation error.

## Built-in type annotations (schemaless)

When no schema is in scope, these names parse the following token by the named atom's contract instead of base resolution. They apply to scalars only — annotate elements individually (`[!int32 1 !int32 2]`), never the array. Names are case-sensitive (`!UUID` is not built in).

| Annotation | Accepts | Must quote? |
|---|---|---|
| `!integer` | decimal or based integer, arbitrary precision (`!integer "42"` is the integer; `!integer 1.5` is refused) | no |
| `!int8 !int16 !int32 !int64 !int128 !int256`, `!uint8 … !uint256` | as `!integer`, range-checked (`!uint8 300` and `!uint32 -1` fail validation) | no |
| `!number` | exact decimal, preserved as written; no `.inf`/`.nan` | no |
| `!float32 !float64` | integer, float, hex-float (`0x1.8p3`), `.inf`, `.nan`; rounded to IEEE grid | no |
| `!rational` | `a/b`, b nonzero, not normalised | **yes** (`/`) |
| `!complex` | `3+4i`, `2.5-1j`, or plain number | no |
| `!text` | any token; asserts "this is a string" (`!text "42"`) | as content requires |
| `!boolean` | `true` or `false`, case-sensitive; `!boolean "true"` is the same value | no |
| `!date` | RFC 3339 `YYYY-MM-DD` | no |
| `!time` | RFC 3339 `HH:MM:SS[.frac](Z\|±HH:MM)` — offset mandatory; the value is the time of day **in UTC**; second 60 is refused | **yes** |
| `!datetime` | RFC 3339 `YYYY-MM-DDTHH:MM:SS…` with offset; the value is the **instant**; second 60 is refused | **yes** |
| `!duration` | elapsed time: `P`/`PT` with `W`, `D`, `H`, `M`, `S` components only — no `Y`, no month `M`; signed; fraction on seconds only; no colon form | no |
| `!period` | calendar span: `P` with a `Y` component, an `M` component, or both, and nothing else; signed | no |
| `!uuid` | RFC 9562 | no |
| `!uri` | RFC 3986 URI: a scheme is **required**; US-ASCII only | **yes** (`:`) |
| `!uri_reference` | RFC 3986 URI or relative reference; US-ASCII only | as content requires |
| `!iri`, `!iri_reference` | RFC 3987: as the two above, with characters beyond US-ASCII written as themselves | as above |
| `!email` | `local@domain` (dot-atom only; no quoted local parts or `[ip]` literals) | **yes** (`@`) |
| `!ipv4` | dotted quad | no |
| `!ipv6` | RFC 4291 text form; no zone ids (`%eth0`) | **yes** (`:`) |
| `!cidr4 !cidr6` | `addr/prefix`; host bits must be zero | **yes** (`/`) |
| `!mac` | EUI-48, `aa-bb-cc-dd-ee-ff` or `aa:bb:…` | colon form yes, hyphen form no |
| `!bytes` | base64 (RFC 4648 §4), **padding required**; the value is the octets | recommended |

`!bytes` is the only binary tag (no `!base64`, `!base32`, `!hex`, `!binary`). There is no generic `!string`, `!int`, `!float`, `!bool` or `!timestamp`, and no sign-bound name such as `!positive_integer` — under a schema a bound is a refinement the schema declares. A token the atom cannot parse is a resolver error (a leap second, non-ASCII under `!uri`); a parsed value outside the atom's value space is a validation error (`!uint8 300`, a relative reference under `!uri`). Value is not spelling: `+01:00` and `Z` spellings of one instant are one `!datetime`. Details: `references/builtin-types.md`.

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

1. **`null` → `_`.** JSON `null` is void. Left as the bare token it becomes the *string* `null` — a valid document that says something else. (Under a schema whose field is not voidable — `a?: T` — omit the key instead.)
2. **Object keys that are not identifiers → a map.** `{"first name": …}`, `{"_id": …}`, `{"Content-Type": …}` are parse errors as records; write those objects with `=>`. A dictionary-shaped object is a map anyway.
3. **`\/` → `/`**, and surrogate pairs → one `\u{…}` escape.

Then make it idiomatic: drop quotes the quoting rule does not require, and drop commas or keep them. JSON numbers are exact `number`s; do not annotate them `!float64` unless the consumer wants rounding.

YAML: `key: value` carries over when the key is an identifier, but every list becomes `[ … ]` (no `- item`), `#` comments become `@doc:"…"` or are dropped, `yes`/`no`/`on`/`off` become `true`/`false` and `~`/`null` become `_`, block scalars become `"""` strings, anchors and merge keys (`&`, `*`, `<<`) must be expanded inline, and anything with a colon gets quoted.

## Pitfalls — check before delivering

| You wrote | Problem | Write instead |
|---|---|---|
| `_id: 1` or `"_id": 1` | not an identifier, so not a field name; quoting does not help | `{ "_id" => 1 }` — use a map |
| `"first name": 1`, `"Content-Type": "…"`, `42x: 2` | field names must be identifiers | move them into a map with `=>` |
| `missing: null` meaning "no value" | `null` is the *string* `null` | `missing: _` |
| `!base64 "…"`, `!hex "…"` | no such tag | `!bytes "…"` (base64, padded) |
| `!duration P1Y2M` | a year/month span is not a duration | `!period P1Y2M` |
| `[, 1]`, `[1, , 2]` | a comma with no value before it | drop it — `[1, 2, 3,]` and `{ a: 1, }` are legal |
| `!uri "docs/a.tn"`, `!uri "https://x.org/café"` | `!uri` needs a scheme and is US-ASCII | `!uri_reference "docs/a.tn"`, `!iri "https://x.org/café"` |
| `!positive_integer 5` | not built in: an unchecked marker | `!integer 5`; under a schema, declare the bound |
| `a: +`, `[- +]` | bare signs are schema-grammar tokens | `"+"`, `"-"` |

The full table — comments, escapes, glued prefixes, directive placement, container mixing, YAML syntax, near-miss numbers — is in `references/pitfalls.md`. Read it before handing over a document.

## Reference files

- `references/builtin-types.md` — every built-in annotation's exact contract, host value, parse-vs-validation behaviour, and the number grammar.
- `references/grammar-notes.md` — lexer and grammar details: token and identifier profiles, whitespace, escapes, multi-line stripping, adjacency, identity, error categories and outcomes, JSON, content addressing, resource limits.
- `references/pitfalls.md` — every mistake this skill has seen, with the fix. Read before delivering.
- `scripts/pin.py` — compute or verify a `?sha256=` content pin for a `.tn` file (hash of every byte after the `!!id` line).

## Implementations

Two implementations track this revision series:

- **Java** — https://github.com/litterat/ltr8-io-tson-java
- **TypeScript** — https://github.com/litterat/ltr8-io-tson-typescript

Either will check work this skill produces, reporting the diagnostics the specification defines.
Language-specific guidance belongs with those projects; look there for a `tson-java` or `tson-ts` skill.
