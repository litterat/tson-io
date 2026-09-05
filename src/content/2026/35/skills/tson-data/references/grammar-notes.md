# Grammar notes for data documents

Condensed from TSON Part 1 §2, §3, §6, §7, §8 (2026 Revision 35). Read the section you need; the SKILL.md rules cover the common path.

## Contents

1. Document shape and directives
2. The unquoted-token profile and the identifier profile
3. Whitespace, line terminators, bidi marks
4. Quoted strings and escapes
5. Multi-line strings — stripping, worked examples
6. Lexer lookahead: `=>`, `!!`, `..`, signs, dots
7. Reserved special characters and unrecognised characters
8. Adjacency rules
9. Annotation value scope
10. Identity rules: field names, map keys, NFC
11. Error categories and canonical phrasing
12. JSON compatibility — the two exceptions
13. Content addressing and `!!id`
14. Encoding, BOM, media type, file extension

---

## 1. Document shape and directives

```
document   = [ id-directive ] ws ( data-doc / schema-doc )
data-doc   = [ schema-directive ws ] data-value ws
schema-doc = meta-directive ws *( import-directive ws ) schema-map ws

id-directive     = "!!" "id"     ":" single-line-token
schema-directive = "!!" "schema" ":" single-line-token
meta-directive   = "!!" "meta"   ":" single-line-token
import-directive = "!!" "import" ":" single-line-token
```

Kind dispatch: consume `!!id` if present; if the next token is `!!meta` the document is a schema document, otherwise a data document. A data-format-only processor rejects schema documents with a specific diagnostic.

A data document contains exactly one value. A pure-metadata document is `!!id:"…"` followed by `_`.

Directive arguments are **single-line** quoted tokens — a `"""` argument is a parse error — so every directive sits on one physical line. The `:` must be adjacent to the name. The argument is a URI (RFC 3986). Parsing never dereferences it.

Directive placement (each name legal in exactly one kind of position):

| Name | Document | Where |
|---|---|---|
| `id` | both | header, first line, optional |
| `schema` | data | header at most once; before a record field value, map entry value, or array element |
| `meta` | schema | header, exactly once, after `id` |
| `import` | schema | header, after `meta`, repeatable |

Not permitted: before a map key, before a field name, inside an annotation value, or anywhere with another name.

Value rules:

```
scoped-value = [ schema-directive ws ] data-value     ; field values, map entry values, array elements
data-value   = *annotation [type-ref] core-value       ; everywhere a value occurs (incl. map keys)
type-ref     = "!" identifier
core-value   = record / map / array / empty-brace / absent / token
```

## 2. The unquoted-token profile and the identifier profile

```
Token       Start    = XID_Start ∪ Nd ∪ { - + . }
            Continue = XID_Continue ∪ { - + . }

Identifier  Start    = XID_Start
            Continue = XID_Continue ∪ { - }
```

The **token profile** decides what the lexer accepts as one unquoted token — values and names alike. The **identifier profile** constrains the *decoded text* of a name at naming positions: annotation names, type-annotation names, and every name in a schema document. Identifiers never begin with a digit, a sign, or a dot; `+` and `.` are not allowed inside them (`.` is reserved as a future separator). Every identifier is a valid unquoted token, so `!name` and `@name` positions admit no quoted form and lose nothing.

Underscore is `XID_Continue` but not `XID_Start`: `my_type` is fine, `_id` is not a token. `{ "_id": 1 }` is a record with a field `_id`; `{ _: 1 }` is a parse error.

Format characters (`Cf`) and controls are never in a token: the bidi controls U+061C, U+202A–U+202E, U+2066–U+2069, soft hyphen, word joiner are lexer errors outside quotes. ZWNJ/ZWJ (U+200C/D) are admitted by the token profile but an identifier accepts them only where UTS #39 says they have a shaping effect (Persian `کتاب‌ها` yes; `ad<ZWNJ>min` no).

Non-ASCII letters and digits are ordinary token characters: `名前: 値` needs no quotes.

Field names at the data layer are *lexical* — `{ "first name": 1 }` is a legal record with a name that is not an identifier. Under a schema a field name must match a declared field, and declared names are identifiers, so the constraint arrives by construction.

## 3. Whitespace, line terminators, bidi marks

Whitespace is `Pattern_White_Space` (11 characters): line terminators LF, VT, FF, CR, NEL, LS, PS; horizontal space TAB and SPACE; and the two ignorable format controls LRM (U+200E) and RLM (U+200F). LRM/RLM contribute nothing and are admitted only where a token boundary already exists — `[1<LRM>2]` and `ad<LRM>min` are lexer errors, not `[1, 2]` and `admin`. Inside quoted tokens they are ordinary content.

Any amount of whitespace equals any other. Indentation is never significant.

## 4. Quoted strings and escapes

Single-line quoted token: `"` … `"`. May contain any character from U+0020 upward except `"`, `\`, NEL, LS, PS. A literal TAB is not allowed — write `\t`.

| Escape | Result |
|---|---|
| `\"` `\\` `\/` | `"` `\` `/` |
| `\b` `\f` `\n` `\r` `\t` | control characters |
| `\s` | U+0020 space (TSON extension, not JSON) |
| `\uXXXX` | code point; supplementary characters via a surrogate pair |

A high surrogate escape must be followed immediately by a low one and vice versa; a lone surrogate is a lexer error. Unknown escapes (`\x41`, `\0`, `\e`) are lexer errors.

## 5. Multi-line strings

Opening: `"""` then optional spaces/tabs then a line terminator. Nothing else may follow the opening `"""` on its line. Closing: `"""` on its own line preceded only by whitespace; trailing spaces/tabs after it are ignored.

Rules, in order:
1. Content starts on the line after the opener.
2. The common leading whitespace prefix is computed over every **non-blank** content line **and the closing-delimiter line**, compared character by character (a tab never equals a space). That prefix is removed from every line; a line that does not fully match loses only the matching part. Never an error.
3. Trailing spaces and tabs on every line are stripped. Keep intentional trailing whitespace with `\s`, ` `, or `\t` at the end of the line.
4. The line terminator before the closing `"""` is not part of the value.
5. Escapes are processed **after** stripping.

Literal `"` and `""` are content; to include a literal `"""` write `\"""`. Literal tabs are allowed. Same escapes as single-line.

Worked example:

```
notes: """
    line one
      indented two more
    line three\s
    """
```

Prefix is four spaces (the closing line has four). Value: `line one\n  indented two more\nline three ` — with the trailing space kept by `\s`, and no trailing newline.

If the closing `"""` is *less* indented than the content, the prefix is the closing line's indentation and the content keeps the rest. If a content line is less indented than the closing line, the prefix shrinks to what all lines share.

## 6. Lexer lookahead

- `=` followed by `>` → the map arrow `=>`; otherwise `=` alone is a special token (schema grammar only — a parse error in data).
- `!` followed by `!` → the directive token `!!`; otherwise `!` is the type prefix.
- `.` followed by `.` → the range token `..` (schema grammar only). `.` followed by a token character → an unquoted token begins (`.5`, `.inf`). Bare `.` → lexer error. An unquoted token **ends** before two consecutive dots: `1..100` lexes as `1`, `..`, `100`, so content containing `..` must be quoted.
- `-` or `+` followed by a token character → an unquoted token begins (`-42`, `+0.5`). Bare `-` → special token (schema subtraction; parse error in data). Bare `+` → lexer error. A mid-token hyphen is part of the token: `a-b`, `2026-07-01`, `[1-2]` (one token!).

## 7. Reserved special characters and unrecognised characters

Fourteen characters are special tokens: `! @ & < > ? ~ = | ; ( ) ^ -`. In data values only `!` and `@` have a role; each of the other twelve is a **parse error** in a data document (they belong to the schema grammar). Parentheses are not delimiters.

Everything else outside a quoted token is an **unrecognised character** and a lexer error: `/ # % * ' \` `` ` ``, `$ € ¥`, control characters, unassigned code points. Content needing them is quoted: `"$19.99"`, `"10%"`, `"2/3"`, `"/usr/bin"`, `"#tag"`.

## 8. Adjacency rules

| Operator | Rule |
|---|---|
| `!` | must be adjacent to the following type name |
| `!!` | must be adjacent to the following directive name |
| `@` | must be adjacent to the following annotation name |
| `:` in a record field | whitespace optional on both sides |
| `:` after an annotation or directive name | must be adjacent to the name; whitespace optional after |
| valueless annotation | at least one whitespace character must follow the name |
| type annotation | at least one whitespace character before a following token; none needed before `{` `[` |
| `=>` | whitespace optional |

## 9. Annotation value scope

`@a:value` — the value is exactly one data-value, ending at the end of its core value. That data-value may itself carry annotations, so `@a:@b:val target extra` parses as `@a` whose value is (`target` annotated by `@b:val`), then `extra` belongs to the surrounding context. `@a:@b val target` (no colon on `@b`) makes `@b` a valueless annotation on `val`, so `@a`'s value is `@b val` and `target` is outside. An annotation is never itself a value: `{ x: @a:@b:val }` is a parse error because `x` still needs a core value.

Annotation values are data values — never type definitions.

## 10. Identity rules

- **Field names** in one record must be unique (resolver error otherwise). Identity is the NFC-normalised decoded text: `name` and `"name"` collide; `"café"` decomposed and precomposed collide. Case-sensitive.
- **Map keys** must be unique. Textual identity is the minimum (`Alice` = `"Alice"`); a processor that decodes values also relates `0xFF` and `255`, `1_000` and `1000`. Annotations and type annotations on a key do not participate in identity (`!text a` = `a`). Under a schema the declared key type can make more keys equal (`1` and `1.0` under an integer-keyed map).
- Unquoted tokens must already be NFC in the source (lexer error otherwise). Quoted tokens keep their exact content; at identifier positions the resolver NFC-normalises them before comparing.

## 11. Error categories and canonical phrasing

Four categories, one severity (there are no warnings):

- **Lexer error** — bad bytes/encoding, unterminated strings, bad escapes, unpaired surrogates, unrecognised characters, non-NFC unquoted tokens.
- **Parse error** — structure: unclosed brackets, adjacency violations, missing separators, trailing commas, `!!` without adjacent `:`, unknown or misplaced directive, a non-identifier after `!` or `@`, reserved special tokens in data.
- **Resolver error** — `_` as a map key, duplicate field names or map keys, a built-in annotation on a container, a token an atom's contract rejects.
- **Validation error** — numeric range violations, CIDR prefix/host-bit violations, and (under a schema) every declared constraint.

Name-hygiene refusals (confusable names, restricted scripts) are a fifth, distinguishable outcome — a processor *refuses* the document under a stated policy and Unicode data version; the document is not thereby invalid.

Every diagnostic carries line, column, and byte offset.

## 12. JSON compatibility — the two exceptions

TSON is a superset of JSON except that inside string literals:
1. NEL (U+0085), LS (U+2028), PS (U+2029) must be escaped (``, ` `, ` `) rather than written raw.
2. Unpaired surrogate escapes (`"\uD800"` alone) are lexer errors.

Otherwise: JSON objects are records, arrays are arrays, strings are quoted tokens, numbers resolve as integers or floats (and map to the exact `number` type under a schema), `true`/`false`/`null` are boolean and null. JSON `null` is `null`, **not** `_`. A leading BOM is accepted. There are no comments and no references/anchors/merge keys, by design.

## 13. Content addressing and `!!id`

`!!id:"https://host/path.tn"` names a published document. The **canonical identity** is lowercase host plus path — the scheme is dropped (`http` and `https` name the same document) and the query is dropped. The identifying URI must already be canonical: lowercase host, no userinfo, no port, no `.`/`..` segments, no fragment, no percent-encoding of unreserved characters, and a query consisting only of hash parameters.

A hash pin rides on the reference as `?sha256=<64 lowercase hex>`. The hash input is every byte after the id line's terminator (the id line itself is excluded so a document can carry its own hash). Content-addressed documents must be UTF-8. A truncated or uppercase hash is an error. A consumer holding a pinned reference must verify before use; a mismatch is an error, never a fallback. Two references to one identity with different digests conflict; a pinned and an unpinned reference do not.

Never write a digest from memory — compute it (`scripts/pin.py`) or leave the reference unpinned.

## 14. Encoding, BOM, media type, file extension

UTF-8 recommended (required for content-addressed documents); UTF-16/32 permitted. Invalid byte sequences are lexer errors; no U+FFFD substitution. A leading U+FEFF is discarded; anywhere else outside quotes it is a lexer error.

Media type `application/tson` (optionally `; version=1`). Extension `.tn` for the 2026 revision series; `.tn1` is reserved for the frozen version 1 and must not be used before it. Document kind is decided by the header, not the extension.

## Denial-of-service limits worth knowing

Implementations should cap nesting depth, token length, document size, numeric literal length (a 4096-digit default is suggested; applies to `!number`/`!rational` too), and decoded binary size. A generator emitting very large literals should expect a configured limit.
