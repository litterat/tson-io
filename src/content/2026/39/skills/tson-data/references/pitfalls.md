# TSON data pitfalls

Every mistake this skill has seen writing TSON data documents, with the fix (2026 Revision 39). The rows
SKILL.md repeats are the commonest — chiefly JSON and YAML habits, and the spellings revision 39 retired; the
rest live only here.

## Header, directives and namespace

| You wrote | Problem | Write instead |
|---|---|---|
| `!!schema:"https://example.com/order.tn"` | retired in revision 39: a parse error | `!!import:"https://example.com/order.tn"` |
| `!!meta:"…"` | retired in revision 39: a parse error; a schema document is the one whose root is tagged `!schema` | `!!import:"…"` for what it uses, then `!schema { … }` — and the tson-schema skill |
| `shipping: !!schema:"…" !address { … }`, `x: !!import:"…" …` | no directive at a value position; a value cannot open a schema of its own | import every schema the document needs in the header; tag the value (`!geo.address { … }`) |
| `!!version:"1"`, `!!include:"…"`, `!!import :"…"`, `!! import:"…"` | unknown directive, or the `:` / name not glued: parse errors | `!!id` and `!!import` are the only two |
| `!!import:"…"` then `{ … }` (untagged root) | under `!!import` the root names its type: a validation error | `!order { … }` |
| `!!import:"…"` then `!schema { … }` meant as data | a root tagged `!schema` makes a schema document | name your own type something else, or use the tson-schema skill |
| `!uiid …`, `!Date …`, `!person { … }`, `!geo.address { … }` with no `!!import` | a type annotation outside the built-in vocabulary is a resolver error, not a marker | `!uuid`, `!date`; for your own types, import the schema that declares them |
| `!uuid …`, `!ipv4 …`, `!mac …` under imports whose closure lacks `net.tn` | each built-in name lives in one library: an unresolved type | import `https://tson.io/2026/39/m/net.tn`, or `core.tn` for every library |
| `!date …` without `temporal.tn`, `!int32 …` without `numeric.tn` in the closure | as above | import the library, or `core.tn` |
| `@deprecated`, `@title` under imports whose closure lacks `core.tn` | the author annotations are core's own; the libraries do not declare them | import `core.tn`; `@doc` is the kernel's and is reachable through any library |
| `!address` for a type the schema nests as `geo => !schema { address => … }` | names resolve from the root: there is no `address` at the root | `!geo.address` |
| `!box<text> { … }`, `!text<x> "a"` | a tag is a qualified name and carries no argument list: a parse error | `!text_box { … }`, where the schema declares `text_box => box<text>` |
| `!!id:"orders/1042.tn"`, `!!id:"https://Example.com/x.tn#v2"` | an identity is canonical: a host-less path is absolute; lowercase host; no fragment, port or userinfo | `!!id:"/orders/1042.tn"`, `!!id:"https://example.com/x.tn"` |
| `!!id:"https://xn--bcher-kva.example/x.tn"`, `!!id:"https://example.com/sch%C3%A9mas/x.tn"`, `!!id:"https://example.com/a%2fb.tn"` | an `!!id` is written in canonical form only: U-labels, non-ASCII written as itself (NFC), reserved escapes in uppercase hex | `https://bücher.example/x.tn`, `https://example.com/schémas/x.tn`, `https://example.com/a%2Fb.tn` — an `!!import` may use any of the other spellings |
| `!!id:"…?sha256=deadbeef"` | invented or truncated hash | run `scripts/pin.py` or omit the pin |
| `!!import:"…/2026/38/m/core.tn"` beside a `…/2026/39/…` import | two revisions of one library declare the same names: the closure collides | import one revision throughout |

## Tokens, references and quoting

| You wrote | Problem | Write instead |
|---|---|---|
| `# comment` or `// comment` | `#`, `/` are lexer errors | `@doc:"comment"` on the value |
| `'text'` | `'` is a lexer error | `"text"` |
| `[, 1]`, `[1, , 2]` | a comma with no value before it | drop it — `[1, 2, 3,]` and `{ a: 1, }` are legal |
| `time: 14:30:00Z`, `url: https://…`, `email: a@b.c`, `net: 10.0.0.0/8`, `ratio: 2/3` | `:` `@` `/` outside the profile | quote them |
| `msg: Hello! ` | a word with an adjacent `!` then whitespace is a sibling reference, not text | `msg: "Hello!"` |
| `msg: Hello!}`, `[a, Wow!]`, `a!b` | a `!` after a token must be followed by whitespace: parse errors | `"Hello!"`, `"Wow!"`, `"a!b"` |
| `type: List<String>`, `expr: f<x>` | an application (a reference value), not text | `"List<String>"` |
| `cmp: a < b`, `type: Map <K V>` | `<` not adjacent to a name: a parse error | quote the text |
| `t: "int32"`, `t: "set<text>"` at a reference-typed slot | a quoted token is never a reference | `t: int32`, written bare |
| `t: set<text>` at a `meta.type_ref` slot | an application must be one the schema itself closes: a validation error otherwise | name an alias the schema declares, or ask for the application in the schema |
| `t: kind!` at a `meta.type_ref` slot | a sibling reference stands only at a record field's type: a validation error | a type's name |
| `{ value: 42  kind: int32 }` where the schema says `kind: meta.type_ref  value?: kind!` | the dependent field is written before its free sibling: a validation error | `{ kind: int32  value: 42 }` |
| `address: 0x71C7…` (meant as a string) | resolves to a number | `"0x71C7…"` |
| `enabled: yes`, `flag: True` | strings, not booleans | `true` |
| `missing: null` meaning "no value" | `null` is the *string* `null` | `missing: _` |
| `"a\/b"`, `"\uD83D\uDE00"` | `\/` is not an escape; no surrogate pairs | `"a/b"`, `"\u{1F600}"` |
| `{ a: + }`, `[- +]` | a bare sign is a schema-grammar special token, a parse error in data | `"+"`, `"-"` |
| `007`, `5.`, `1.2.3` intended as numbers | fall through to strings | `7`, `5.0`, or quote if a string was meant |

## Field names, records and maps

| You wrote | Problem | Write instead |
|---|---|---|
| `_id: 1` | the lexer reads `_` as the void sentinel: a parse error | `{ "_id" => 1 }` — use a map |
| `"_id": 1`, `"first name": 1`, `"Content-Type": "…"`, `42x: 2`, `"007": 1` (schemaless) | a schemaless field name must be an identifier: a resolver error; quoting does not help | move them into a map with `=>` |
| `{ @id: "…" }` under a schema whose record declares `"@id"` | unquoted, `@id` lexes as an annotation | `{ "@id": "…" }` — a name outside the token profile is quoted |
| `{ "@id": "…" }` under a schema whose record does not declare it | an undeclared field: a validation error | a map, or a schema whose record's name type admits `@` and declares the field |
| `{ a => 1  b: 2 }` | mixing map and record | one or the other |
| `{ k: v }` at a position the schema types as a map | that is a record; a map is written with `=>` | `{ k => v }` |
| `{ @note name: x }` | annotation before a field name | `{ name: @note x }` |
| `@x. 1`, `!.date …`, `!geo..address` | an empty segment in a qualified name: a parse error | `@x`, `!geo.address` |
| `a: _` under a schema where `a` is not voidable (`a?: T`, `a: T`, `a?: T ~ v`) | `_` needs a voidable slot — its type carries `?` | at an optional field omit the key (with `~ v` the default is injected); at a required one write a value; or have the schema say `T?` |

## Type annotations

| You wrote | Problem | Write instead |
|---|---|---|
| `! uuid …`, `@ doc:…`, `@doc : "…"`, `!! id:"…"` | prefixes and `:` must be glued | `!uuid …`, `@doc:"…"`, `!!id:"…"` |
| `!int32"5"` | type name must be followed by whitespace | `!int32 "5"` |
| `!uuid [a b]`, `![text] [a b]` | built-ins are scalar-only; no type syntax in data | `[!uuid a !uuid b]`, or a named schema type |
| `!base64 "…"`, `!hex "…"` | no such tag | `!bytes "…"` (base64, padded) |
| `!duration P1Y2M` | a year/month span is not a duration | `!period P1Y2M` |
| `!duration P1W2D` | the week form stands alone | `P9D`, or `PT216H` |
| `!uri "docs/a.tn"`, `!uri "#top"` | a relative reference under `!uri` (or `!iri`) is a validation error: a URI has a scheme | `!uri_reference "docs/a.tn"` |
| `!uri "https://example.com/café"` | a URI is US-ASCII; anything beyond is a resolver error | `!iri "https://example.com/café"`, or percent-encode |
| `!uri …` under a schema importing only `meta.tn` | `!iri` and `!iri_reference` are the kernel's; `!uri` and `!uri_reference` are `net.tn`'s | import `net.tn`, or write `!iri` |
| `!positive_integer 5`, `!non_negative_integer 0` | no sign-bound name is built in: a resolver error, schemaless or under a schema | `!integer 5`; under a schema, declare the bound (`count => !integer ^ { min: 0 }`) |
| `!ip "10.0.0.1"`, `!url "https://…"`, `!domain example.com`, `!mime "text/html"`, `!pattern "^a+$"` | no such tag: a resolver error | `!ipv4`/`!ipv6`/`!host`, `!uri`/`!iri`, `!hostname`, `!media_type`, `!regex` |
| `!ipv6 "[::1]"` | brackets are a host spelling, not an address | `!ipv6 "::1"`, or `!host "[::1]"` |
| `!hostname "example.com."`, `!hostname "BÜCHER.example"`, `!hostname "a_b.example"` | no trailing dot, no uppercase beyond ASCII, labels are letters, digits and hyphens | `example.com`, `bücher.example`; `_` names are not host names |
| `!media_type "text/html; charset=utf-8"`, `!media_type "text/*"` | the built-in media type takes no parameters, and a media range is not a media type | `!media_type "text/html"`; a `Content-Type` value needs a schema type that admits parameters |
| `!time "23:59:60Z"`, `!datetime "…T23:59:60Z"` | second 60 (a leap second) is rejected, a resolver error | `"23:59:59Z"`, or keep the source text as `!text` |
| `!regex ^a+$` | `^`, `$` and `+` alone are outside the profile | `!regex "^a+$"` |

## YAML habits

| You wrote | Problem | Write instead |
|---|---|---|
| `- item` lists, `<<: *base`, `&anchor` | YAML syntax | `[ … ]`; expand inline |


## Converting from YAML

`key: value` carries over when the key is an identifier (otherwise the object is a map — `"Content-Type" => …`), but:

- every list becomes `[ … ]` — there is no `- item` form;
- `#` comments become `@doc:"…"` on the value, or are dropped;
- `yes`/`no`/`on`/`off` become `true`/`false` (bare, they are strings), and `~`/`null` become `_`;
- block scalars (`|`, `>`) become `"""` strings;
- anchors, aliases and merge keys (`&`, `*`, `<<`) are expanded inline — TSON has no anchors or aliases;
- a `!tag` on a YAML node is not a TSON type annotation — drop it, or map it to a built-in (`!!timestamp` → `!datetime`);
- anything with a colon, `@`, `/`, `#`, `!`, `<`, `>` or a space gets quoted, and so does text that would read as a number (`"1.10"` as a version string; `v1.10` needs no quotes).
