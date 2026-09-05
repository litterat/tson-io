# Grammar notes for data documents

Condensed from TSON Part 1 §2, §3, §6, §7, §8, §9 (2026 Revision 35). Read the section you need; the SKILL.md rules cover the common path.

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
12. JSON — what is shared, and where the two part
13. Content addressing and `!!id`
14. Encoding, BOM, media type, file extension
15. Resource limits (Part 1 §9.1)

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

The **token profile** decides what the lexer accepts as one unquoted token — values and names alike. The **identifier profile** constrains the *decoded text* of a name at every naming position: **field names**, annotation names, type-annotation names, and every name in a schema document. Identifiers never begin with a digit, a sign or a dot; `+` and `.` are not allowed inside them (`.` is reserved as a future separator). Every identifier is a valid unquoted token, so `!name` and `@name` positions admit no quoted form and lose nothing.

Underscore is `XID_Continue` but not `XID_Start`: `my_type` is fine, `_id` is neither a token nor an identifier. So `{ _id: 1 }`, `{ "_id": 1 }` and `{ _: 1 }` are all parse errors — quoting a name relieves the lexical accidents of the unquoted form, never the identifier grammar. Write `{ "_id" => 1 }`.

Format characters (`Cf`) and controls are never in a token: the bidi controls U+061C, U+202A–U+202E, U+2066–U+2069, soft hyphen, word joiner are lexer errors outside quotes. ZWNJ/ZWJ (U+200C/D) are admitted by the token profile but an identifier accepts them only where UTS #39 says they have a shaping effect (Persian `کتاب‌ها` yes; `ad<ZWNJ>min` no).

Non-ASCII letters and digits are ordinary token characters: `名前: 値` needs no quotes.

**A field name is an identifier at every layer** (Revision 35), schemaless or governed. The production admits two spellings — unquoted, or single-line quoted; the multi-line form is not admitted in name position — and they are two spellings of one set of names. The decoded text is NFC-normalised and then matched in full against the identifier grammar, exactly as an annotation name's is; a token in name position whose decoded text is not an identifier is a **parse error**. So `{ "first name": 1 }`, `{ _id: 1 }` and `{ 42x: 2 }` fail, and the remedy is the one the format already has: a record's fields are the named members of a shape, which is what makes them declarable, and *a key that is not a name belongs in a map* — `{ "Content-Type" => "text/plain" }`. Under a schema a field name matches a declared one, and declared names are identifiers by the schema grammar, so nothing further is asked of a governed document.

## 3. Whitespace, line terminators, bidi marks

Whitespace is `Pattern_White_Space` (11 characters): line terminators LF, VT, FF, CR, NEL, LS, PS; horizontal space TAB and SPACE; and the two ignorable format controls LRM (U+200E) and RLM (U+200F). LRM/RLM contribute nothing and are admitted only where a token boundary already exists — `[1<LRM>2]` and `ad<LRM>min` are lexer errors, not `[1, 2]` and `admin`. Inside quoted tokens they are ordinary content.

Any amount of whitespace equals any other. Indentation is never significant.

## 4. Quoted strings and escapes

Single-line quoted token: `"` … `"`. May contain any character from U+0020 upward except `"`, `\`, NEL, LS, PS. A literal TAB is not allowed — write `\t`.

| Escape | Result |
|---|---|
| `\"` `\\` | `"` `\` |
| `\b` `\f` `\n` `\r` `\t` | control characters |
| `\s` | U+0020 space (TSON extension, not JSON) |
| `\uXXXX` / `\u{X…}` | one to six hex digits in the brace form; the value denoted MUST be a Unicode scalar value |

**A solidus needs no escape and has none**: `\/` is an invalid escape (Revision 35).

**There are no surrogate pairs.** An escape names a character or it names nothing, so a surrogate code point (U+D800–U+DFFF) in either spelling is a lexer error and `\uD83D\uDE00` is *two* errors rather than one emoji — a TSON string is a well-formed sequence of scalar values by construction. `\u0041` and `\u{41}` are two spellings of one character; `\u{1F600}` names a supplementary character directly, as does `\u{E0100}` for a variation selector an ASCII-safe generator could otherwise only embed. The `{` after `u` decides the spelling at the first character, so the two forms never conflict; a brace form with no digits, more than six, or an unclosed brace is a lexer error. Unknown escapes (`\x41`, `\0`, `\e`) are lexer errors.

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
- Unquoted tokens must already be NFC in the source (lexer error otherwise). Quoted tokens keep their exact content; at naming positions the resolver NFC-normalises them before comparing.
- **Equality is over value spaces, not lexical spaces** (Revision 35). A type denotes a value space; an encoding defines a lexical space and one canonical form per value. Two spellings of one value are one value for map keys, sets, refinement, disjointness and content addressing — so `!bytes` compares octets whatever the alphabet, and `!datetime`/`!time` compare the instant whatever the offset (`+00:00`, `-00:00` and `Z` are one).

## 11. Error categories and canonical phrasing

Four categories, one severity (there are no warnings):

- **Lexer error** — bad bytes/encoding, unterminated strings, bad escapes, a character escape denoting no scalar value, unrecognised characters, non-NFC unquoted tokens.
- **Parse error** — structure: unclosed brackets, adjacency violations, missing separators, a comma that follows nothing or follows a comma, `!!` without adjacent `:`, unknown or misplaced directive, a token at a field-name, annotation-name or type-annotation-name position whose decoded text is not an identifier, reserved special tokens in data.
- **Resolver error** — `_` as a map key, duplicate field names or map keys, a built-in annotation on a container, a token an atom's contract rejects.
- **Validation error** — numeric range violations, CIDR prefix/host-bit violations, and (under a schema) every declared constraint.

**Refusals are a fifth outcome, not a verdict.** A name-hygiene refusal (confusable names, restricted scripts) or a resource-limit refusal is reported in the same report as the four categories, told apart by the rule that refused, and is not a claim that the document is invalid — a conforming processor may legitimately not refuse at all. A processor makes available, with any report carrying a refusal, its identifier policy, token policy, limits policy and the UCD version it judged under, and SHOULD make them reachable with no document in hand.

Every diagnostic carries line, column, and byte offset.

## 12. JSON — what is shared, and where the two part

**TSON is not a JSON superset.** Revision 35 deleted the claim and the rules that existed only for it. A JSON
document is not a TSON document, and a JSON document is read through a **JSON reader** — a second encoding of
the same model, which maps JSON `null` to *absence* and JSON numbers to `number`.

Four differences, each of which makes some JSON documents illegal as TSON:

1. **No `null` keyword.** A bare `null` is the four-character *string* (§4.4 of Part 1). Converting JSON, map
   every `null` to `_`; leaving it produces a valid document that says something else.
2. **Field names are identifiers.** `{"first name": …}`, `{"_id": …}`, `{"Content-Type": …}` are parse errors
   as records. Those objects are maps.
3. **`\/` is not an escape.**
4. **No surrogate pairs.** `\uD83D\uDE00` is two lexer errors; write `\u{1F600}`.

And, as before, NEL (U+0085), LS (U+2028) and PS (U+2029) must be escaped inside a single-line token rather
than written raw — they are line terminators here, which is the only reason they are excluded.

What the two share — `"`-delimited strings, `[ ]` arrays, `{ name: value }` records, the
`\n \r \t \\ \" escapes, base type resolution as a mechanism, and the rule that an unadorned numeric token
names the exact type `number` — is shared because each was a good idea on its own, and none of it rests on a
compatibility claim. A leading BOM is accepted. There are no comments and no anchors/references/merge keys,
by design.

## 13. Content addressing and `!!id`

`!!id:"https://host/path.tn"` names a published document. The **canonical identity** is lowercase host plus path — the scheme is dropped (`http` and `https` name the same document) and the query is dropped. The identifying URI must already be canonical: lowercase host, no userinfo, no port, no `.`/`..` segments, no fragment, no percent-encoding of unreserved characters, and a query consisting only of hash parameters.

A hash pin rides on the reference as `?sha256=<64 lowercase hex>`. The hash input is every byte after the id line's terminator (the id line itself is excluded so a document can carry its own hash). Content-addressed documents must be UTF-8. A truncated or uppercase hash is an error. A consumer holding a pinned reference must verify before use; a mismatch is an error, never a fallback. Two references to one identity with different digests conflict; a pinned and an unpinned reference do not.

Never write a digest from memory — compute it (`scripts/pin.py`) or leave the reference unpinned.

## 14. Encoding, BOM, media type, file extension

UTF-8 recommended (required for content-addressed documents); UTF-16/32 permitted. Invalid byte sequences are lexer errors; no U+FFFD substitution. A leading U+FEFF is discarded; anywhere else outside quotes it is a lexer error.

Media type `application/tson` (optionally `; version=1`). Extension `.tn` for the 2026 revision series; `.tn1` is reserved for the frozen version 1 and must not be used before it. Document kind is decided by the header, not the extension.

## Resource limits (Part 1 §9.1)

Revision 35 turned the DoS advice into one **limits policy**. Every limit has a default; a processor MUST
enforce each at its default or a configured value; the limit MUST be configurable or its enforced value
documented; and exceeding one MUST be reported as a clear refusal naming the limit and the threshold, never as
an out-of-memory or stack overflow. A refusal is not a verdict (§11 above) and is reported beside the
identifier and token policies, and SHOULD be reachable with no document in hand so a generator can emit a
document that fits.

Defaults are set at the tightest limit in common use, so that a document fitting the default fits every
processor above it:

| Limit | Default |
|---|---|
| nesting depth | 64 |
| token length, decoded (code points) | 1,048,576 |
| decoded text length per value (code points) | 1,048,576 |
| numeric literal length (digits) | 4,096 |
| decoded binary size per value (octets) | 16,777,216 |
| document size (bytes) | 16,777,216 |
| elements in one array or set | 1,048,576 |
| entries in one map | 1,048,576 |
| fields in one record | 65,536 |
| annotations on one value | 64 |
| total values in a document | 16,777,216 |
| foreign schemas loaded by one document | 16 |

The nesting-depth limit is checked as containers open in the token stream, before any reader descends —
counted where the resource is counted, not where it is spent. The aggregate limit (total values) is a separate
mechanism from the per-container ones. A deployment raises these; the defaults are what "a conforming
document" means with nothing else said. Schema-side limits — import closure, entries in one schema map,
reference and supertype chain length, template materialisation depth, all defaulting to 64 except the schema
map's 65,536 — are in Part 2 §11.5.
