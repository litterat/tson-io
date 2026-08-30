---
name: tson-data
description: Write, read, convert, and fix TSON data documents (.tn files) — the Typed Schema Object Notation text format, a JSON superset with optional quotes and commas, records vs maps, the absent sentinel `_`, annotations (`@`), type annotations (`!uuid`, `!date`, `!int32`…) and directives (`!!id`, `!!schema`). Use this skill whenever the user mentions TSON, a `.tn` file, tson.io, or asks to convert JSON/YAML/TOML into TSON, to write example data for a TSON schema, or to explain why a TSON document fails to parse. Also use it when a user writes something that looks like TSON (unquoted keys, arrow-separated maps, `!type` prefixes, `_` values) even if they don't name the format. For writing schema documents (files with `!!meta`, name-to-type declarations) use the tson-schema skill instead.
---

# TSON data documents

TSON (Typed Schema Object Notation) is a Unicode text format that extends JSON: quotes and commas are optional where the structure is unambiguous, there are three containers instead of two (records, maps, arrays), a distinct absent sentinel `_`, and three kinds of augmentation — annotations `@name`, type annotations `!name`, and directives `!!name:"…"`. Every valid JSON document (bar two obscure string-escape cases) is already valid TSON.

This skill covers **data documents** — the Class 1 format defined by *TSON Part 1: Text Data Format*, 2026 Revision 34. The rules below are the ones an author actually needs; `references/` holds the details to consult when a case is unusual.

> Revision note: the 2026 series is a working draft. Identifiers such as `https://tson.io/2026/34/m/core.tn` carry the revision number; when the revision changes, so do those URLs and every hash pin against them.

## Workflow

1. **Decide the document kind.** A data document has an optional `!!id`, an optional `!!schema`, then exactly one value. If the file needs `!!meta` or `name => type` declarations, it is a *schema* document — switch to the tson-schema skill.
2. **Write the header.** `!!id:"…"` first (only if the document is published or hash-pinned), then `!!schema:"…"` if a schema governs it. Directive arguments are single-line quoted strings, the `:` is glued to the name, and each directive is on its own physical line.
3. **Write the value**, following the quoting rule and the container rules below. Under a schema, annotate the root with its type (`!order { … }`).
4. **Self-check** against the pitfalls table at the end — those are the errors that YAML/JSON habits produce. If a hash pin is needed, compute it with `scripts/pin.py`; never invent one.

## Structure

| Container | Syntax | Separator between name/key and value | Notes |
|---|---|---|---|
| Record | `{ name: value  other: value }` | `:` | fixed, named fields; names unique; at least one field |
| Map | `{ key => value  key2 => value }` | `=>` | keys are any data value (not only strings); keys unique; at least one entry |
| Array | `[ a b c ]` or `[a, b, c]` | whitespace or comma | ordered; `[]` is the empty array |

Values are separated by whitespace, a comma, or both — `[1 2 3]`, `[1,2,3]`, `[1, 2, 3]` are identical. **Trailing commas are parse errors** (`[1, 2,]`, `{ x: 1, }`). Zero separation (`[1"a"]`) is a parse error. Indentation and line breaks are never significant. No separator is needed next to a delimiter: `{name:Alice}` is fine.

The brace form is decided by the first thing inside it: `{}` is an *empty brace* (resolves to an empty record unless a schema says map); `{ name: …` is a record; `{ key => …` is a map. A record cannot contain `=>` entries and a map cannot contain `:` fields.

**There is no comment syntax.** `#`, `//`, `/* */` are all lexer errors. Put explanatory text in a `@doc:"…"` annotation on the value it describes.

## Tokens and the quoting rule

A scalar is a *token*: unquoted (`Alice`, `42`, `2025-03-13`, `A-100`, `snake_case`, `名前`), single-line quoted (`"has spaces"`), or multi-line quoted (`"""…"""`). Quoting never changes a value's identity except in one place: base type resolution, where `42` is a number and `"42"` is the string. Everywhere else `name` and `"name"` are the same field name, and `!date 2025-03-13` equals `!date "2025-03-13"`.

An unquoted token may contain only letters and digits of any script (Unicode `XID_Continue`), plus `-`, `+`, `.`; it must start with a letter, digit, `-`, `+`, or `.`. Two-clause decision procedure for any string value:

1. **Quote if any character is outside that set.** Space, `:`, `@`, `/`, `%`, `$`, `#`, `*`, `'`, `` ` ``, `\`, `&`, `<`, `>`, `?`, `|`, `;`, `(`, `)`, `^`, `=`, `!`, `~`, `{`, `}`, `[`, `]`, `,`, `"` — all of them. That makes the quoting rule *always* for whole kinds of content: times and datetimes (`"14:30:00Z"`), URLs with a scheme, email addresses, file paths, IPv6 addresses, CIDR networks, rationals (`"2/3"`), percentages, money (`"$19.99"`), anything containing `..`.
2. **Quote if the bare token would resolve to something other than the intended string.** `"true"`, `"null"`, `"42"`, `"1e5"`, `"-0.0"`, `".inf"`, and hex-shaped identifiers such as `"0x71C7656EC7ab88b098defB751B7401B5f6d8976F"` — an unquoted `0x…` token is a number.

Also always quote: a token that would start with `_` (`"_id"` — bare `_` is the absent sentinel, and `_` cannot start a token), and the single characters `"-"`, `"+"`, `"."`.

Calendar dates (`2026-07-01`), UUIDs, hyphen-separated MACs, version strings (`v1.2.3`), and identifiers with hyphens (`A-100`) are all fine unquoted. **Single quotes are not a string delimiter** — `'x'` is a lexer error.

Unquoted tokens must be in Unicode NFC; if you generate non-ASCII names, emit NFC.

### Quoted strings

Single-line strings use JSON escapes (`\" \\ \/ \b \f \n \r \t \uXXXX`) plus TSON's `\s` (a space). A literal tab must be escaped as `\t`. Surrogate escapes must be properly paired.

Multi-line strings open with `"""` followed by a line break and close with `"""` on its own line. Common leading indentation (measured against the closing `"""` line too, character by character — tabs and spaces do not match each other) is stripped; trailing spaces on each line are stripped (use `\s` to keep one); the final newline before the closing `"""` is not part of the value. Literal `"` and `""` inside are content; literal tabs are allowed.

```
notes: """
  Leave the parcel with the concierge.
  Gift wrap — no prices on the slip.
  """
```

## What an unquoted token means (base type resolution)

With no schema and no `!type`, every unquoted token is resolved in this order — first match wins, and the whole token must match:

1. `null` — exactly, lowercase.
2. `true` / `false` — exactly, lowercase. `yes`, `no`, `on`, `off`, `True`, `FALSE` are strings.
3. A number per the number grammar: integers (`42`, `-7`, `+3`, `1_000_000`), based integers (`0xFF`, `0o755`, `0b1010`, lowercase prefix), floats (`1.5`, `.5`, `6.02e23`, `-2e-3`, `+0.0`, `-0.0`), and the specials `.inf`, `-.inf`, `.infinity`, `.nan`. Leading zeros are not allowed (`007` is a string); `5.` is a string; `1.2.3` is a string; `3+4i` and `2/3` are not numbers under base resolution.
4. Otherwise a string.

Numbers are arbitrary precision. Distinct spellings of one value are equal (`255` = `0xFF`, `.5` = `0.5`), and re-emitters should preserve the original spelling.

**Field names and map keys are never resolved** — they are text. `{ 007: 007 }` has the key `007` and the string value `007`. Map key identity is textual (`07` and `7` are different keys; `Alice` and `"Alice"` are the same key).

## `_` — the absent sentinel

`_` means "present, with no value". It is not `null`: `null` is a value that can be stored; `_` says the slot is empty. Use `_` for a field or entry that is deliberately blank, and `null` only when the consumer expects a JSON-style null. `_` can stand at any value position — field value, map entry value, array element (`[1 _ 3]` has three elements), or the whole document (`!!id:"…"` followed by `_` is a metadata-only document) — but never as a map key.

Under a schema, whether `_` is admitted at a position depends on the declared type (optional fields and `[T?]` elements admit it; required fields do not — omit the field instead and let the default inject).

## Augmentation

All three forms attach to the value that *follows* them, in this order: directive, annotations, type annotation, core value.

```
shipping: !!schema:"https://example.com/address.tn" @doc:"billing copy" !address { street: "12 Byron Rd"  city: London }
```

**Annotations `@name` or `@name:value`.** The prefix `@` is glued to the name; if there is a value, the `:` is glued to the name too, and the value is exactly one data value (which may itself carry annotations). A valueless annotation needs whitespace after its name. Annotations attach to values, never to field names: `{ name: @deprecated Alice }`, not `{ @deprecated name: Alice }`. On a map entry, annotations before the key annotate the key and annotations after `=>` annotate the value. The same annotation may repeat; order is preserved. Without a schema, annotations are preserved and never validated; under a schema each `@name` must be a type in the schema's namespace (`@doc` needs the schema to import core) and its value must conform.

**Type annotations `!name`.** Glued `!` plus an identifier, then whitespace (or directly a `{`/`[`). `!int32 "5"` needs the space; `!person{name:Alice}` is fine. A type annotation tags the value that follows, not its contents. Only a plain name may follow `!` — `![text]`, `!list<text>`, `!text?` are parse errors; a container needs a *named* type declared in a schema.

Without a schema, the built-in vocabulary applies (next section) and any other `!name` is preserved as an uninterpreted marker — never an error. Under a `!!schema`, **every** `!name`, built-in names included, must resolve in that schema's namespace; a schema that wants `!uuid` imports the core library.

**Directives `!!name:"…"`.** Only four exist and each has one legal position: `!!id` (first line of any document), `!!schema` (data-document header, at most once; or immediately before a field value, map entry value, or array element to scope that one value to another schema), `!!meta` and `!!import` (schema documents only). Any other directive name is a parse error; there is no extension mechanism. A directive may not precede a field name, a map key, or an annotation value. Parsing never fetches a directive's URL.

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
| `!time` | RFC 3339 `HH:MM:SS[.frac](Z\|±HH:MM)` — offset mandatory | **yes** |
| `!datetime` | RFC 3339 `YYYY-MM-DDTHH:MM:SS…` with offset | **yes** |
| `!duration` | ISO 8601 `PnYnMnDTnHnMnS` | no (yes if written with colons) |
| `!uuid` | RFC 9562 | no |
| `!uri` | RFC 3986 | yes if it has a scheme (`:`) |
| `!email` | `local@domain` (dot-atom only; no quoted local parts or `[ip]` literals) | **yes** (`@`) |
| `!ipv4` | dotted quad | no |
| `!ipv6` | RFC 4291 text form; no zone ids (`%eth0`) | **yes** (`:`) |
| `!cidr4 !cidr6` | `addr/prefix`; host bits must be zero | **yes** (`/`) |
| `!mac` | EUI-48, `aa-bb-cc-dd-ee-ff` or `aa:bb:…` | colon form yes, hyphen form no |
| `!base64 !base64url !base32 !hex` | RFC 4648 text; padding `=` required where the scheme pads | recommended |

There is no generic `!binary`, `!string`, `!int`, `!float`, `!bool`, or `!timestamp`. A token the atom cannot parse is a resolver error; a parsed value out of range is a validation error. Full contracts: `references/builtin-types.md`.

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
  placed:  !date 2026-07-01
  total:   !number 199.90
  flags:   0b0110
  items: [
    { sku: A-100 qty: 2 price: 49.95 discount: .5 }
    { sku: B-205 qty: 1 price: 100.00 discount: _ }
  ]
  discounts: { @expires:"2026-12-31" WELCOME10 => "10%" loyalty => _ }
  notes: """
    Leave the parcel with the concierge.
    """
}
```

## Converting from JSON and YAML

JSON: paste it — it is valid TSON as written. To make it idiomatic, drop the quotes on keys and on string values inside the unquoted profile, drop commas, and keep quotes wherever clause 1 or 2 of the quoting rule applies. JSON `null` stays `null` (it is not `_`). JSON numbers are exact `number`s; do not annotate them `!float64` unless the consumer wants rounding. A JSON object is a *record*; if it is really a dictionary (arbitrary keys — `additionalProperties` in JSON Schema terms, or a map-typed field in a TSON schema), write it as a map with `=>`.

YAML: `key: value` carries over, but every list becomes `[ … ]` (no `- item` syntax), `#` comments become `@doc:"…"` or are dropped, `yes`/`no`/`on`/`off`/`~` become `true`/`false`/`null` explicitly, block scalars become `"""` strings, anchors and merge keys (`&`, `*`, `<<`) have no equivalent and must be expanded inline, and anything with a colon in it gets quoted.

## Pitfalls — check before delivering

| You wrote | Problem | Write instead |
|---|---|---|
| `# comment` or `// comment` | `#`, `/` are lexer errors | `@doc:"comment"` on the value |
| `'text'` | `'` is a lexer error | `"text"` |
| `[1, 2, 3,]`, `{ a: 1, }` | trailing separator | drop the last comma |
| `time: 14:30:00Z`, `url: https://…`, `email: a@b.c`, `net: 10.0.0.0/8`, `ratio: 2/3` | `:` `@` `/` outside the profile | quote them |
| `address: 0x71C7…` (meant as a string) | resolves to a number | `"0x71C7…"` |
| `_id: 1` | `_` cannot start a token | `"_id": 1` |
| `enabled: yes`, `flag: True` | strings, not booleans | `true` |
| `missing: null` meaning "no value" | `null` is a value | `missing: _` |
| `{ a => 1  b: 2 }` | mixing map and record | one or the other |
| `{ k: v }` at a position the schema types as a map | that is a record; a map is written with `=>` | `{ k => v }` |
| `{ @note name: x }` | annotation before a field name | `{ name: @note x }` |
| `! uuid …`, `@ doc:…`, `@doc : "…"`, `!! id:"…"` | prefixes and `:` must be glued | `!uuid …`, `@doc:"…"`, `!!id:"…"` |
| `!int32"5"` | type name must be followed by whitespace | `!int32 "5"` |
| `!uuid [a b]`, `![text] [a b]` | built-ins are scalar-only; no type syntax in data | `[!uuid a !uuid b]`, or a named schema type |
| `!!schema:"…"` before a map key or field name | directives only at header and value positions | move it before the value |
| `!!version:"1"`, `!!include:"…"` | unknown directive | no such thing — use annotations or the schema |
| `!!id:"…?sha256=deadbeef"` | invented or truncated hash | run `scripts/pin.py` or omit the pin |
| `- item` lists, `<<: *base`, `&anchor` | YAML syntax | `[ … ]`; expand inline |
| `007`, `5.`, `1.2.3` intended as numbers | fall through to strings | `7`, `5.0`, or quote if a string was meant |

## Reference files

- `references/builtin-types.md` — every built-in annotation's exact contract, host value, parse-vs-validation behaviour, and the number grammar.
- `references/grammar-notes.md` — lexer details: the unquoted-token and identifier profiles, whitespace and bidi marks, escape rules, multi-line stripping worked examples, adjacency table, error categories, and the JSON compatibility exceptions.
- `scripts/pin.py` — compute or verify a `?sha256=` content pin for a `.tn` file (hash of every byte after the `!!id` line).

## Implementations

Two implementations track this revision series:

- **Java** — https://github.com/litterat/ltr8-io-tson-java
- **TypeScript** — https://github.com/litterat/ltr8-io-tson-typescript

Either will check work this skill produces: both parse, resolve and validate documents and report
the diagnostics the specification defines, so a document that looks right is cheap to confirm.
Language-specific guidance — APIs, bindings, build setup — belongs with those projects rather than
in this skill; look there for a `tson-java` or `tson-ts` skill.
