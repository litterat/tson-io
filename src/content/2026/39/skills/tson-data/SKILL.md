---
name: tson-data
description: Write, read, convert, and fix TSON data documents (.tn files) — the Typed Schema Object Notation text format, JSON-like but not a JSON superset, with optional quotes and commas, records vs maps, the void sentinel `_` (there is no `null`), annotations (`@`), type annotations (`!uuid`, `!date`, `!bytes`, `!geo.address`…) and the header directives `!!id` and `!!import`. Use this skill whenever the user mentions TSON, a `.tn` file, tson.io, or asks to convert JSON/YAML/TOML into TSON, to write example data for a TSON schema, or to explain why a TSON document fails to parse. Also use it when a user writes something that looks like TSON (unquoted keys, arrow-separated maps, `!type` prefixes, `_` values) even if they don't name the format. For writing schema documents (a root tagged `!schema { … }` holding name-to-type declarations) use the tson-schema skill instead.
---

# TSON data documents

TSON (Typed Schema Object Notation) is a Unicode text format in the JSON family: quotes and commas are optional where the structure is unambiguous, there are three containers instead of two (records, maps, arrays), a void sentinel `_`, and three kinds of augmentation — annotations `@name`, type annotations `!name`, and header directives `!!name:"…"`.

**TSON is JSON-*like*, not a JSON superset.** A JSON document is not a TSON document, and JSON is a second encoding of the same model (*TSON Part 3: JSON Encoding*), read through a JSON reader that maps its `null` to void. Do not paste JSON and call it TSON — convert it (see below).

This skill covers **data documents** — the Class 1 format of *TSON Part 1: Text Data Format*, 2026 Revision 39; `references/` holds the unusual cases.

> The 2026 series is a working draft: URLs such as `https://tson.io/2026/39/m/core.tn` carry the revision number, and pins against them change with it.

## Workflow

1. **Decide the document kind.** A document is an optional `!!id`, any number of `!!import`s, then exactly one value. If that value is tagged `!schema` (`!schema { name => type … }`), it is a *schema* document — switch to the tson-schema skill. Anything else is data.
2. **Write the header.** `!!id:"…"` first (only if the document is published or hash-pinned), then one `!!import:"…"` per schema the data uses — each a single-line quoted IRI-reference, the `:` glued to the name, one directive per line.
3. **Write the value**, following the quoting rule and the container rules below. Under `!!import` the root **must** carry its type (`!order { … }`).
4. **Self-check** against the pitfalls table at the end and the full table in `references/pitfalls.md`. If a hash pin is needed, compute it with `scripts/pin.py`; never invent one.

## Structure

| Container | Syntax | Separator between name/key and value | Notes |
|---|---|---|---|
| Record | `{ name: value  other: value }` | `:` | fixed, named fields; names unique (see *Field names*); at least one field |
| Map | `{ key => value  key2 => value }` | `=>` | keys are any data value (not only strings); keys unique; at least one entry |
| Array | `[ a b c ]` or `[a, b, c]` | whitespace or comma | ordered; `[]` is the empty array |

Values are separated by whitespace, a comma, or both, and **a comma may follow a value**: `[1 2 3]`, `[1,2,3]` and `[1, 2, 3,]` are identical, as are `{ x: 1 }` and `{ x: 1, }`. There is no elision — void is `_` and occupies a slot — so `[1, 2,]` is two elements. A comma with nothing before it (`[, 1]`, `[1, , 2]`) and zero separation (`[1"a"]`) are parse errors. Indentation is never significant; `{name:Alice}` needs no spaces.

The brace form is decided by the first thing inside it: `{}` is an *empty brace* (resolves to an empty record unless a schema says map); `{ name: …` is a record; `{ key => …` is a map. A record cannot contain `=>` entries and a map cannot contain `:` fields.

Field order carries no meaning but for one schema rule: a field typed by a sibling (`value?: kind!`) follows that sibling, unless the schema pins it or dispatches on it — `{ kind: int32  value: 42 }`; the reverse is a validation error.

**There is no comment syntax.** `#`, `//`, `/* */` are all lexer errors. Put explanatory text in a `@doc:"…"` annotation on the value it describes.

## Tokens and the quoting rule

A scalar is a *token*: unquoted (`Alice`, `42`, `2025-03-13`, `A-100`, `名前`), single-line quoted (`"has spaces"`), or multi-line quoted (`"""…"""`). Quoting changes a value's identity in one place only: base type resolution, where `42` is a number and `"42"` the string (under a schema, the same reading picks an untagged choice's variant). Elsewhere form is not meaning — `name` and `"name"` are one field name, `!date 2025-03-13` equals `!date "2025-03-13"`.

An unquoted token may contain only letters and digits of any script (`XID_Continue`) plus `-`, `+`, `.`, and must start with one of those. Two-clause decision procedure for any string value:

1. **Quote if any character is outside that set** — a space, or any of ``: @ / % $ # * ' ` \ & < > ? | ; ( ) ^ = ! ~ { } [ ] , "``. So *always* quote times (`"14:30:00Z"`), URLs with a scheme, emails, paths, IPv6, CIDRs, rationals (`"2/3"`), money (`"$19.99"`), anything with `..`, and text with `!`, `<` or `>` — bare, `Hello!` and `List<String>` are references, not text (below).
2. **Quote if the bare token would resolve to something other than the intended string.** `"true"`, `"false"`, `"42"`, `"1e5"`, `"-0.0"`, `".inf"`, and hex-shaped identifiers such as `"0x71C7…"` — an unquoted `0x…` token is a number. `null` is *not* on this list: it is an ordinary string, so bare `null` and `"null"` are the same value.

Also quote a value that would start with `_` (`"_id"`; bare `_` is the void sentinel) and the single characters `"-"`, `"+"`, `"."` (bare, `-` and `+` are schema-grammar tokens and `.` a lexer error).

Calendar dates (`2026-07-01`), UUIDs, hyphen-separated MACs, version strings (`v1.2.3`), and identifiers with hyphens (`A-100`) are all fine unquoted. **Single quotes are not a string delimiter** — `'x'` is a lexer error.

Unquoted tokens must be in Unicode NFC (a lexer error otherwise), so emit NFC. A quoted value keeps its exact code points, but wherever two values are compared they compare in NFC: `"cafe\u0301"` and `"caf\u00E9"` are two strings as written and one map key.

### Field names

Annotation and type-annotation names are unquoted **qualified names** — identifiers (`XID_Start`, then `XID_Continue` or `-`) joined by `.`: `doc`, `atom.ordering`, `geo.address` — or a parse error. A **field name** is any single-line token, quoted or not (quoting is spelling, not a different name), judged by whoever owns the record:

- **Schemaless**, its text (NFC) must be an identifier, or it is a **resolver error**: `{ "first name": 1 }`, `{ "_id": 1 }`, `{ "@id": 1 }`, `{ 42x: 2 }`. Unquoted `{ _id: 1 }` is a parse error (`_` lexes as the void sentinel).
- **Under a schema**, the record's *name type* judges it — the identifier rule by default; a record declared over a relaxed name type (a JSON-LD or OpenAPI translation) admits `"@id"` or `"$ref"`, written quoted as declared. An undeclared name is a validation error.

**A key that is not a name belongs in a map**: `{ "Content-Type" => "text/plain" }`, `{ "_id" => 1 }`. Map keys are values, not names — unless the schema types one (or any value) by an **identifier family**, which makes it a name under that family's profile.

Names also meet **name hygiene**: look-alikes (Cyrillic `а` in `аdmin`) are *refused* by a processor's policy, not invalid; keep names in one script per word. `true`, `false` and `null` are identifiers like any other, so `{ true: 1 }` is legal.

### Quoted strings

Single-line strings use the escapes `\" \\ \b \f \n \r \t` plus TSON's `\s` (a space). **`\/` is not an escape** — a solidus needs none. A literal tab must be escaped as `\t`.

Character escapes are `\uXXXX` or `\u{1-6 hex}`, denoting a Unicode scalar value. **There are no surrogate pairs**: JSON's `\uD83D\uDE00` is two lexer errors — write `\u{1F600}`, or paste the character.

Multi-line strings open with `"""` plus a line break and close with `"""` on its own line; common leading indentation (the closing line's included) and trailing spaces are stripped (`\s` keeps one), and the final newline is not part of the value.

## What an unquoted token means (base type resolution)

Base type resolution assigns one of **three** host base types — boolean, number, string — **only where nothing types the position**: a document with no `!!import`, read into no declared type. Under a schema, a built-in annotation, or a read into a host type naming a Part 1 family, the type's own contract reads the token.

Where it applies, every unquoted token is resolved in this order — first match wins, and the whole token must match:

1. `true` / `false` — exactly, lowercase. `yes`, `no`, `on`, `off`, `True`, `FALSE` are strings.
2. A number per the number grammar: integers (`42`, `-7`, `+3`, `1_000_000`), based integers (`0xFF`, `0o755`, `0b1010`, lowercase prefix), floats (`1.5`, `.5`, `6.02e23`, `-2e-3`, `+0.0`, `-0.0`), and the specials `.inf`, `-.inf`, `.infinity`, `.nan`. No leading zeros: `007`, `5.`, `1.2.3`, `3+4i` and `2/3` are strings.
3. Otherwise a string — **`null` included**. There is no null keyword; a bare `null` is the four-character string.

The fall-through is total: base resolution never rejects a token. To read `2025-03-13` as a date, annotate it (`!date 2025-03-13`; `!int32 007` is a resolver error) or use a schema. Numbers are arbitrary precision; distinct spellings of one value are equal (`255` = `0xFF`, `.5` = `0.5`), and re-emitters should preserve the original spelling.

**Field names are names and map keys are text** — neither is resolved. Map key identity is textual (`07` and `7` are different keys; `Alice` and `"Alice"` are the same key).

## `_` — the void sentinel

`_` is the **void sentinel**: the slot is present and its value is *void* — the only spelling of void; there is no `null`. A key that does not appear at all is **missing**, a different thing. `_` can stand at any value position (`[1 _ 3]` has three elements; a document may be `!!id:"…"` then `_`) but never as a map key. Under a schema a field that may be missing is **optional** (`a?: T`) and a slot that may hold `_` is **voidable** (`a: T?`, `[T?]`, `{K => V?}`); `_` elsewhere is a validation error, and at a defaulted field (`a?: T ~ v`) omitting the key injects the default.

## Augmentation

Annotations, then a type annotation, attach to the core value that *follows* them; directives belong to the header:

```
shipping: @doc:"billing copy" !geo.address { street: "12 Byron Rd"  city: London }
```

**Annotations `@name` or `@name:value`.** The `@` and any `:` are glued to the name; the value is one data value; a valueless annotation needs whitespace after its name. Annotations attach to values, never to field names: `{ name: @deprecated Alice }`, not `{ @deprecated name: Alice }`. On a map entry, annotations before the key annotate the key and those after `=>` the value. Names may repeat; order is preserved. Schemaless they are kept, never validated; under `!!import` each `@name` must resolve in the document's namespace (`@doc` is the kernel's, `@deprecated` core's) and its value conform.

**Type annotations `!name`.** Glued `!` plus a qualified name, then whitespace (or directly a `{`/`[`). `!int32 "5"` needs the space; `!person{name:Alice}` is fine. `!geo.address` names the member `address` of the schema map `geo`. It tags the value, not its contents. Only a name may follow `!` — `![text]`, `!box<text>`, `!text?` are parse errors; a generic type reaches a tag through a name the schema gives it (`text_box => box<text>`, then `!text_box`).

Without `!!import`, only the built-in vocabulary (next section) exists: any other `!name` — `!uiid`, `!Date`, `!person`, any dotted name — is a **resolver error**. Under `!!import`, **every** `!name`, built-ins included, must resolve in the one namespace the imports' closures bind. `!uuid` needs `net.tn` in that closure, `!date` `temporal.tn`, `!int32` `numeric.tn`, `!text` the kernel `meta.tn`; `core.tn` brings all four.

**Directives `!!name:"…"`.** Only two exist, both header-only: `!!id` (first line, optional) and `!!import` (after it, repeatable; several imports are one namespace). A `!!` at any value position, and any other name — `!!schema` and `!!meta` included, retired in revision 39 — is a parse error. The argument is an IRI-reference, never fetched by parsing. An `!!id` is written canonical — lowercase host in U-labels (`bücher.example`, not `xn--…`), NFC path with non-ASCII as itself, no port, userinfo or fragment, a host-less id an absolute path (`/local/orders.tn`); an `!!import` may use any spelling of that identity.

## References: `set<text>` and `kind!`

Two unquoted scalar forms stand beside the token, each one value: an **application** — a qualified name, an adjacent `<`, arguments (names, applications or tokens, never `[…]`, `{…}` or `?`), `>`: `set<text>`, `geo.pair<text int32>` — and a **sibling reference**, one identifier, an adjacent `!`, then whitespace: `kind! `. `box <text>`, `box<>`, `kind!}` and `a!b` are parse errors. Schemaless, each is kept as a structured value — legal, and *not text*. Under a schema they are read at reference-typed slots only (schema-describing data, a `meta.type_ref` field): a type's name bare (`t: geo.address`), an application only if the schema closes that same one. Ordinary data rarely has either.

## Built-in type annotations (schemaless)

With no `!!import`, these names parse the next token by the atom's contract instead of base resolution — scalars only (`[!int32 1 !int32 2]`, never the array), case-sensitive (`!UUID` is not built in). **Lib** is the document declaring each under a schema: *kernel* `meta.tn`, *num* `numeric.tn`, *temp* `temporal.tn`, *net* `net.tn`.

| Annotation | Lib | Accepts |
|---|---|---|
| `!integer`, `!int64` | kernel | decimal or based integer (`!integer "42"` is 42; `!integer 1.5` is rejected); `!int64` range-checked |
| `!int8` … `!int256`, `!uint8` … `!uint256` | num | as `!integer`, range-checked (`!uint8 300`, `!uint32 -1` fail validation) |
| `!number` | num | exact decimal; no `.inf`/`.nan` |
| `!float32 !float64` | num | integer, float, hex-float (`0x1.8p3`), `.inf`, `.nan`; rounded to the IEEE grid |
| `!rational`, `!complex` | num | `"a/b"`, b nonzero, not normalised; `3+4i`, `2.5-1j` or a plain number |
| `!text`, `!boolean` | kernel | any token, asserting a string (`!text "42"`); `true`/`false` (`!boolean "true"` is the same value) |
| `!regex` | kernel | RFC 9485 I-Regexp |
| `!bytes` | kernel | base64 (RFC 4648 §4), **padding required**; the value is the octets |
| `!iri`, `!iri_reference` | kernel | RFC 3987, non-ASCII as itself; `!iri` **requires** a scheme |
| `!date` | temp | RFC 3339 `YYYY-MM-DD` |
| `!time`, `!datetime` | temp | RFC 3339 time / date-time, offset mandatory; a UTC time of day / an instant; second 60 rejected |
| `!duration` | temp | elapsed time: `W`, `D`, `H`, `M`, `S` components — no `Y`, no month `M`; signed; no colon form |
| `!period` | temp | calendar span: a `Y` component, an `M` component, or both, nothing else; signed |
| `!uuid` | net | RFC 9562 |
| `!uri`, `!uri_reference` | net | RFC 3986, US-ASCII only; `!uri` **requires** a scheme |
| `!email` | net | `local@domain`, dot-atom only (no quoted local parts, no `[ip]` literals) |
| `!ipv4`, `!ipv6` | net | dotted quad; RFC 4291 text, no zone id (`%eth0`), no brackets |
| `!cidr4 !cidr6` | net | `addr/prefix`; host bits must be zero |
| `!mac` | net | EUI-48, `aa-bb-cc-dd-ee-ff` or `aa:bb:…` |
| `!hostname` | net | domain name, LDH/A-/U-labels (`Example.COM` = `example.com`); no trailing dot, no uppercase beyond ASCII, no digit-initial last label |
| `!host` | net | a hostname, IPv4 or IPv6 address (`"[::1]"` = `"::1"`); no zone id |
| `!media_type` | net | `type/subtype`, caseless; no parameters (`;charset=…`), no `*` ranges |

**Quote** `!time`, `!datetime`, `!rational`, `!email`, `!cidr4`/`!cidr6`, `!media_type`, IPv6, colon-form MACs and anything with a scheme; quote `!bytes`, and usually `!regex`. Dates, durations, periods, UUIDs, dotted quads and ASCII host names go bare.

There is no `!base64`, `!hex`, `!string`, `!int`, `!bool`, `!timestamp`, `!ip`, `!url` or `!positive_integer` (resolver errors). A token the atom cannot parse is a resolver error (a leap second, non-ASCII under `!uri`); a parsed value outside its value space a validation error (`!uint8 300`, a relative `!uri`). Details: `references/builtin-types.md`.

## Worked example

```
!!id:"https://example.com/orders/1042.tn"
!!import:"https://example.com/order.tn"
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
  shipping:  !geo.address { street: "12 Byron Rd"  city: London }
  notes: """
    Leave the parcel with the concierge.
    """
}
```

`order.tn` imports `core.tn` (so `@doc`, `@deprecated`, `!uuid`, `!date` resolve) and declares `order`, `expires` and the nested map `geo`.

## Converting from JSON and YAML

**JSON is not a paste-in.** Three things must change, and the first two are silent corruptions if you skip them:

1. **`null` → `_`.** JSON `null` is void. Left as the bare token it becomes the *string* `null` — a valid document that says something else. (Under a schema whose field is not voidable — `a?: T` — omit the key instead.)
2. **Object keys that are not identifiers → a map.** `{"first name": …}`, `{"_id": …}`, `{"Content-Type": …}` are errors as schemaless records; write those objects with `=>`. A dictionary-shaped object is a map anyway. (Under a schema whose record declares `"@id"` or `"$ref"`, keep the record and quote the name.)
3. **`\/` → `/`**, and surrogate pairs → one `\u{…}` escape.

Then drop quotes the quoting rule does not require. JSON numbers are exact `number`s; annotate `!float64` only if rounding is wanted. A root's `$import` member becomes the `!!import` header, its `$type` the root's tag. YAML fixes are in `references/pitfalls.md`.

## Pitfalls — check before delivering

| You wrote | Problem | Write instead |
|---|---|---|
| `!!schema:"…"`, `!!meta:"…"`, `x: !!import:"…" …` | retired names; a directive stands in the header only | `!!import:"…"` in the header |
| `!!import:"…"` then an untagged root | under a schema the root names its type | `!order { … }` |
| `_id: 1`, `"_id": 1`, `"first name": 1`, `42x: 2` | not an identifier, so not a field name (schemaless, or under the default name type) | a map: `{ "_id" => 1 }` |
| `missing: null` meaning "no value" | `null` is the *string* `null` | `missing: _` |
| `msg: Hello!`, `type: List<String>` | a sibling reference and an application, not text | `"Hello!"`, `"List<String>"` |
| `!uri "docs/a.tn"`, `!uri "https://x.org/café"` | `!uri` needs a scheme and is US-ASCII | `!uri_reference "docs/a.tn"`, `!iri "https://x.org/café"` |
| `!positive_integer 5`, `!uiid …`, `!geo.address` schemaless | not built in: a resolver error | `!integer 5`, `!uuid …`; import the schema that declares your types |
| `!uuid …` under imports whose closure lacks `net.tn` | each built-in name lives in one library | import `net.tn`, or `core.tn` for all |

The full table — comments, escapes, signs, commas, glued prefixes, directives, YAML, near-miss numbers — is in `references/pitfalls.md`. Read it before handing over a document.

## Reference files

- `references/builtin-types.md` — each built-in's exact contract, library and error kind; the number grammar.
- `references/grammar-notes.md` — the Part 1 productions verbatim; header, qualified names, references, profiles, escapes, multi-line, adjacency, identity, outcomes, JSON, pins, limits.
- `references/pitfalls.md` — every mistake seen, with the fix, and YAML conversion.
- `scripts/pin.py` — compute or verify a `?sha256=` pin (every byte after the `!!id` line) and the pins in a file's `!!import`s.

## Implementations

**Java** (https://github.com/litterat/ltr8-io-tson-java) and **TypeScript** (https://github.com/litterat/ltr8-io-tson-typescript) track this series; look for a `tson-java` or `tson-ts` skill.
