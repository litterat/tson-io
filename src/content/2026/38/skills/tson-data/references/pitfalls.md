# TSON data pitfalls

Every mistake this skill has seen writing TSON data documents, with the fix. The rows SKILL.md repeats
are the commonest — chiefly JSON and YAML habits; the rest live only here.

| You wrote | Problem | Write instead |
|---|---|---|
| `# comment` or `// comment` | `#`, `/` are lexer errors | `@doc:"comment"` on the value |
| `'text'` | `'` is a lexer error | `"text"` |
| `[, 1]`, `[1, , 2]` | a comma with no value before it | drop it — `[1, 2, 3,]` and `{ a: 1, }` are legal |
| `time: 14:30:00Z`, `url: https://…`, `email: a@b.c`, `net: 10.0.0.0/8`, `ratio: 2/3` | `:` `@` `/` outside the profile | quote them |
| `address: 0x71C7…` (meant as a string) | resolves to a number | `"0x71C7…"` |
| `_id: 1` | the lexer reads `_` as the void sentinel: a parse error | `{ "_id" => 1 }` — use a map |
| `"_id": 1`, `"first name": 1`, `"Content-Type": "…"`, `42x: 2`, `"007": 1` (schemaless) | a schemaless field name must be an identifier: a resolver error; quoting does not help | move them into a map with `=>` |
| `{ @id: "…" }` under a schema whose record declares `"@id"` | unquoted, `@id` lexes as an annotation | `{ "@id": "…" }` — a name outside the token profile is quoted |
| `{ "@id": "…" }` under a schema whose record does not declare it | an undeclared field: a validation error | a map, or a schema whose record's name type admits `@` and declares the field |
| `enabled: yes`, `flag: True` | strings, not booleans | `true` |
| `missing: null` meaning "no value" | `null` is the *string* `null` | `missing: _` |
| `"a\/b"`, `"\uD83D\uDE00"` | `\/` is not an escape; no surrogate pairs | `"a/b"`, `"\u{1F600}"` |
| `!base64 "…"`, `!hex "…"` | no such tag | `!bytes "…"` (base64, padded) |
| `!duration P1Y2M` | a year/month span is not a duration | `!period P1Y2M` |
| `!duration P1W2D` | the week form stands alone | `P9D`, or `PT216H` |
| `!uri "docs/a.tn"`, `!uri "#top"` | a relative reference under `!uri` (or `!iri`) is a validation error: a URI has a scheme | `!uri_reference "docs/a.tn"` |
| `!uri "https://example.com/café"` | a URI is US-ASCII; anything beyond is a resolver error | `!iri "https://example.com/café"`, or percent-encode |
| `!positive_integer 5`, `!non_negative_integer 0` | no sign-bound name is built in: a resolver error, schemaless or under a schema | `!integer 5`; under a schema, declare the bound (`count => !integer ^ { min: 0 }`) |
| `!uiid …`, `!Date …`, `!person { … }` with no `!!schema` | a type annotation outside the built-in vocabulary is a resolver error, not a marker | `!uuid`, `!date`; for your own types, name the schema that declares them |
| `!ip "10.0.0.1"`, `!url "https://…"`, `!domain example.com`, `!mime "text/html"` | no such tag: a resolver error | `!ipv4`/`!ipv6`/`!host`, `!uri`/`!iri`, `!hostname`, `!media_type` |
| `!ipv4 …`, `!mac …` under a schema that imports only core | the network types live in `net.tn`; core no longer declares them | the schema imports `https://tson.io/2026/38/m/net.tn` as well |
| `!ipv6 "[::1]"` | brackets are a host spelling, not an address | `!ipv6 "::1"`, or `!host "[::1]"` |
| `!hostname "example.com."`, `!hostname "BÜCHER.example"`, `!hostname "a_b.example"` | no trailing dot, no uppercase beyond ASCII, labels are letters, digits and hyphens | `example.com`, `bücher.example`; `_` names are not host names |
| `!media_type "text/html; charset=utf-8"`, `!media_type "text/*"` | the built-in media type takes no parameters, and a media range is not a media type | `!media_type "text/html"`; a `Content-Type` value needs a schema type that admits parameters |
| `!time "23:59:60Z"`, `!datetime "…T23:59:60Z"` | second 60 (a leap second) is rejected, a resolver error | `"23:59:59Z"`, or keep the source text as `!text` |
| `{ a: + }`, `[- +]` | a bare sign is a schema-grammar special token, a parse error in data | `"+"`, `"-"` |
| `a: _` under a schema where `a` is not voidable (`a?: T`, `a: T`, `a?: T ~ v`) | `_` needs a voidable slot — its type carries `?` | at an optional field omit the key (with `~ v` the default is injected); at a required one write a value; or have the schema say `T?` |
| `!!id:"orders/1042.tn"`, `!!id:"https://Example.com/x.tn#v2"` | an identity is canonical: a host-less path is absolute; lowercase host; no fragment, port or userinfo | `!!id:"/orders/1042.tn"`, `!!id:"https://example.com/x.tn"` |
| `!!id:"https://xn--bcher-kva.example/x.tn"`, `!!id:"https://example.com/sch%C3%A9mas/x.tn"`, `!!id:"https://example.com/a%2fb.tn"` | an `!!id` is written in canonical form only: U-labels, non-ASCII written as itself (NFC), reserved escapes in uppercase hex | `https://bücher.example/x.tn`, `https://example.com/schémas/x.tn`, `https://example.com/a%2Fb.tn` — a `!!schema` reference may use any of the other spellings |
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


## Converting from YAML

`key: value` carries over when the key is an identifier (otherwise the object is a map — `"Content-Type" => …`), but:

- every list becomes `[ … ]` — there is no `- item` form;
- `#` comments become `@doc:"…"` on the value, or are dropped;
- `yes`/`no`/`on`/`off` become `true`/`false` (bare, they are strings), and `~`/`null` become `_`;
- block scalars (`|`, `>`) become `"""` strings;
- anchors and merge keys (`&`, `*`, `<<`) are expanded inline — TSON has no references;
- anything with a colon, `@`, `/`, `#` or a space gets quoted, and so does text that would read as a number (`"1.10"` as a version string; `v1.10` needs no quotes).
