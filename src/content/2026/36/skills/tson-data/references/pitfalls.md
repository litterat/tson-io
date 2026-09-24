# TSON data pitfalls

Every mistake this skill has seen writing TSON data documents, with the fix. The rows SKILL.md repeats
are the ones a JSON or YAML habit produces; the rest live only here.

| You wrote | Problem | Write instead |
|---|---|---|
| `# comment` or `// comment` | `#`, `/` are lexer errors | `@doc:"comment"` on the value |
| `'text'` | `'` is a lexer error | `"text"` |
| `[, 1]`, `[1, , 2]` | a comma with no value before it | drop it — `[1, 2, 3,]` and `{ a: 1, }` are legal |
| `time: 14:30:00Z`, `url: https://…`, `email: a@b.c`, `net: 10.0.0.0/8`, `ratio: 2/3` | `:` `@` `/` outside the profile | quote them |
| `address: 0x71C7…` (meant as a string) | resolves to a number | `"0x71C7…"` |
| `_id: 1` or `"_id": 1` | not an identifier, so not a field name; quoting does not help | `{ "_id" => 1 }` — use a map |
| `"first name": 1`, `"Content-Type": "…"`, `42x: 2` | field names must be identifiers | move them into a map with `=>` |
| `enabled: yes`, `flag: True` | strings, not booleans | `true` |
| `missing: null` meaning "no value" | `null` is the *string* `null` | `missing: _` |
| `"a\/b"`, `"\uD83D\uDE00"` | `\/` is not an escape; no surrogate pairs | `"a/b"`, `"\u{1F600}"` |
| `!base64 "…"`, `!hex "…"` | no such tag | `!bytes "…"` (base64, padded) |
| `!duration P1Y2M` | a year/month span is not a duration | `!period P1Y2M` |
| `!duration P1W2D` | the week form stands alone | `P9D`, or `PT216H` |
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
