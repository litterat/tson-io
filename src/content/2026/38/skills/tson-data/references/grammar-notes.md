# Grammar notes for data documents

Condensed from TSON Part 1 §2, §3, §6, §7, §8, §9 (2026 Revision 38); the grammar productions in §1 are quoted verbatim from Part 1 §7.4, a selection. Read the section you need; the SKILL.md rules cover the common path.

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
11. Error categories, refused and undetermined
12. JSON — what is shared, and where the two part
13. Content addressing and `!!id`
14. Encoding, BOM, media type, file extension
15. Resource limits (Part 1 §9.1)

---

## 1. Document shape and directives

```
document        = [ id-directive ] ws ( data-doc / schema-doc )

data-doc        = [ schema-directive ws ] data-value ws
schema-doc      = meta-directive ws *( import-directive ws )
                  schema-map ws

id-directive     = "!!" "id"     ":" single-line-token
schema-directive = "!!" "schema" ":" single-line-token
meta-directive   = "!!" "meta"   ":" single-line-token
import-directive = "!!" "import" ":" single-line-token
                ; ":" MUST be adjacent to the directive name (§7.5).
                ; "!!" whose name is not followed by an adjacent ":"
                ; is a parse error (§1.3). String literals match
                ; exact characters (§7.3): directive names are
                ; case-sensitive. Any other directive name is a
                ; parse error (§3.3).
```

Kind dispatch: consume `!!id` if present; if the next token is `!!meta` the document is a schema document, otherwise a data document. A data-format-only processor rejects schema documents with a specific diagnostic.

A data document contains exactly one value. A pure-metadata document is `!!id:"…"` followed by `_`.

Directive arguments are **single-line** quoted tokens — a `"""` argument is a parse error — so every directive sits on one physical line. The `:` must be adjacent to the name. The argument is an **IRI-reference** (RFC 3987 §2.2): a URI, a relative or file reference, or either with characters beyond US-ASCII written as themselves rather than percent-encoded. Parsing never dereferences it. Whether a reference *identifies* a document, and the canonical form an identity must take, is §13's question.

Directive placement (each name legal in exactly one kind of position):

| Name | Document | Where |
|---|---|---|
| `id` | both | header, first line, optional |
| `schema` | data | header at most once; before a record field value, map entry value, or array element |
| `meta` | schema | header, exactly once, after `id` |
| `import` | schema | header, after `meta`, repeatable |

Not permitted: before a map key, before a field name, inside an annotation value, or anywhere with another name.

Value rules (`scoped-value` at field values, map entry values and array elements; `data-value` everywhere a value occurs, map keys included):

```
data-value      = *annotation [type-ref] core-value

type-ref        = "!" identifier
                ; identifier — an unquoted token whose text
                ; matches the identifier grammar (§7.7)

core-value      = record / map / array
                / empty-brace / void / token

record          = "{" ws field *( separator field )
                  [ ws "," ] ws "}"
field           = field-name ws ":" ws scoped-value

scoped-value    = [ schema-directive ws ] data-value

field-name      = unquoted-token / single-line-token
                ; any single-line token (§2.5); the multi-line
                ; form is not admitted. The resolver matches the
                ; decoded, NFC-normalised text against §7.7 in a
                ; document that names no schema; under a schema
                ; the record's name type judges it
void            = "_"
identifier      = ; §7.7 — matched against a token's complete
                  ; decoded text, as `number` is (§7.6); at
                  ; type-ref and annotation the spelling is an
                  ; unquoted token
```

## 2. The unquoted-token profile and the identifier profile

```
Token       Start    = XID_Start ∪ Nd ∪ { - + . }
            Continue = XID_Continue ∪ { - + . }

Identifier  Start    = XID_Start
            Continue = XID_Continue ∪ { - }
```

The **token profile** decides what the lexer accepts as one unquoted token — values and names alike. The **identifier profile** constrains the *decoded text* of the names the grammar itself reads — annotation names, type-annotation names, and the type and parameter names of a schema document — and, **by default**, field names and enum members. The kernel states this profile as data, `identifier => !identifier_type { continue_add: "-" }`; a schema describing another system's names declares another instance (`!identifier_type { start_add: "@$" }` for a JSON-LD or JSON Schema vocabulary, `!identifier_type { medial: " " }` for words), and such a profile types *values* — a record's field names and an enum's members among them, through the record's or enum's **name type**. Identifiers never begin with a digit, a sign or a dot; `+` and `.` are not allowed inside them. Every identifier is a valid unquoted token, so `!name` and `@name` positions admit no quoted form and lose nothing.

**`.` is the qualified-name separator.** `orders.place_order` is one unquoted token by the token profile, and no identifier; a slot whose type is a reference (`ref<T>`, kernel vocabulary, met only in schema-level documents) parses it into two identifiers. Everywhere else — every position of an ordinary data document — such a token is read as it always was, a string under base resolution. The lexer and the identifier profile are unchanged by it. (Its sibling, a field typed by a *kind* — `kind<C>`, which core declares — holds the bare name of a type in the schema's closure built with `C`.)

Underscore is `XID_Continue` but not `XID_Start`: `my_type` is fine, `_id` is neither a token nor an identifier. `{ _id: 1 }` is a parse error (the lexer reads `_` as the void sentinel and `id` as a second token), and `{ "_id": 1 }` is a resolver error in a schemaless document — quoting a name is a spelling, never a different set of names. Write `{ "_id" => 1 }`, unless a schema's name type admits the name.

Format characters (`Cf`) and controls are never in a token: the bidi controls U+061C, U+202A–U+202E, U+2066–U+2069, soft hyphen, word joiner are lexer errors outside quotes. ZWNJ/ZWJ (U+200C/D) are admitted by the token profile but an identifier accepts them only where UTS #39 says they have a shaping effect (Persian `کتاب‌ها` yes; `ad<ZWNJ>min` no).

Non-ASCII letters and digits are ordinary token characters: `名前: 値` needs no quotes.

**A field name is a value of its record's name type** (Part 1 §2.5, Part 2 §5.2). The grammar asks only that it be a single-line token — unquoted or quoted, two spellings of one set of names; the multi-line form is not admitted — and the layer that owns the record decides which names it admits:

- **In a document that names no schema**, the decoded text is NFC-normalised and matched in full against the identifier grammar; a name that fails is a **resolver error**, not a parse error, since the parser no longer asks. So `{ "first name": 1 }`, `{ "_id": 1 }` and `{ 42x: 2 }` are resolver errors. The remedy is the one the format already has: *a key that is not a name belongs in a map* — `{ "Content-Type" => "text/plain" }`. A member name no identifier profile can state — the empty string, a leading or doubled space — is a key at every layer.
- **Under a schema**, a field name matches a declared one or the record is invalid (an undeclared field is a validation error), the match made in the record's name type's form. The default name type is the identifier profile; a record declared over a relaxed type — `json_record => !record { name_type: json_name  extension: ABSTRACT  fields: {} }` with `json_name => !identifier_type { start_add: "@$" }`, composed into its records — holds `"@id"` validly. Such a name is written quoted: `@` and `$` are outside the token profile. Under a case-folding name type `NAME` and `name` are one field, and two spellings of it in one record are a duplicate.
- **A document that names a schema is judged by that schema alone.** A Class 1 processor reading it holds its field names to no name rule; one that cannot obtain the schema leaves the document undetermined (§11) rather than judging it by the schemaless rule. A record nested in a relaxed one judges its own names: the relaxation does not leak.

**Identifier families make values into names.** Under a schema, a value whose declared type is an identifier family — the kernel's `identifier`, or an `!identifier_type` instance the schema declares — is a name by its type's statement, wherever it stands: a map key, a field value, an array element. It is matched against *that family's* profile and meets name hygiene (§11) under the identifier policy, and the keys of one identifier-keyed map, and the elements of one unique array of identifiers, are look-alike scopes. A `text`-typed key stays data. The line between a name and data runs through the type, not the position.

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

**A solidus needs no escape and has none**: `\/` is an invalid escape.

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
- `-` or `+` followed by a token character → an unquoted token begins (`-42`, `+0.5`). Otherwise the sign is emitted alone as a special token — `-` the schema grammar's subtraction operator, `+` its at-least-one field-group mark — and in a data value each is a **parse error**. A mid-token hyphen is part of the token: `a-b`, `2026-07-01`, `[1-2]` (one token!).

## 7. Reserved special characters and unrecognised characters

Fifteen characters are special tokens: `! @ & < > ? ~ = | ; ( ) ^ - +`. In data values only `!` and `@` have a role; each of the other thirteen is a **parse error** in a data document (they belong to the schema grammar; `-` and `+` reach special-token mode only when no token character follows). Parentheses are not delimiters.

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

- **Field names** in one record must be unique (resolver error otherwise). Identity is the NFC-normalised decoded text: `name` and `"name"` collide; `"café"` decomposed and precomposed collide. Case-sensitive at this layer; a schema's name type may make more names equal (a case-folding one makes `NAME` and `name` a duplicate), never fewer.
- **Map keys** must be unique. Textual identity is the minimum — the NFC-normalised string after escape processing (`Alice` = `"Alice"`, and `"cafe\u0301"` = `"caf\u00E9"`); a processor that decodes values also relates `0xFF` and `255`, `1_000` and `1000`. Annotations and type annotations on a key do not participate in identity (`!text a` = `a`). Under a schema the declared key type can make more keys equal, never fewer: `1` and `1.0` under a `number`-keyed map, and `Content-Type` and `content-type` under a text key type whose `normalization` folds case — a duplicate only the declared type relates is a validation error.
- **NFC.** Unquoted tokens must already be NFC in the source (lexer error otherwise); the lexer never alters token text. Quoted tokens keep their exact content: at naming positions they are NFC-normalised before they are matched and compared, and string *values* stay distinct as written — but wherever two values are compared, they compare in NFC: as map keys, and under a schema in every comparison a text type makes. Under a schema a text type also states the form its values are *put into* — its `normalization`, one of `NONE` (the default), `NFC`, `NFKC`, `NFKC_CASEFOLD`, `ASCII_CASEFOLD` — and facets, comparison and a round trip all see that value; an identifier family's default is `NFC`. No comparison goes below NFC.
- **Equality is over value spaces, not lexical spaces.** A type denotes a value space; an encoding defines a lexical space and one canonical form per value. Two spellings of one value are one value for map keys, sets, refinement, disjointness and content addressing — so `!bytes` compares octets whatever the alphabet, and `!datetime`/`!time` compare the instant whatever the offset (`+00:00`, `-00:00` and `Z` are one).

## 11. Error categories, refused and undetermined

Four categories, one severity (there are no warnings):

- **Lexer error** — bad bytes/encoding, unterminated strings, bad escapes, a character escape denoting no scalar value, unrecognised characters, non-NFC unquoted tokens.
- **Parse error** — structure: unclosed brackets, adjacency violations, missing separators, a comma that follows nothing or follows a comma, `!!` without adjacent `:`, unknown or misplaced directive, a token at an annotation-name or type-annotation-name position whose decoded text is not an identifier, a field name that is not an unquoted or single-line token, reserved special tokens in data.
- **Resolver error** — `_` as a map key, a field name of a schemaless document that is not an identifier, a type annotation outside the built-in vocabulary in a schemaless document, duplicate field names or map keys, a built-in annotation on a container, a token an atom's contract rejects (among them a leap second, a character beyond US-ASCII under `!uri`/`!uri_reference`, a trailing dot under `!hostname`).
- **Validation error** — numeric range violations, CIDR prefix/host-bit violations, a relative reference where `!uri` or `!iri` requires a scheme, and (under a schema) every declared constraint.

**Refused and undetermined are two outcomes beside the four categories, and neither is a finding about validity.** Validity is a property of the bytes and the schema, the same at every processor (at or after the Unicode version the text needs). The two outcomes answer a different question — whether *this* processor accepts the document — and answer it oppositely:

- **Refused** — this processor declined the document under its own configuration: its name-hygiene policy and Unicode data version (confusable names, restricted scripts), a resource limit, or a schema it does not hold and will not fetch, or one past its size limit. A certain rejection *here*; the sender holds the fix, or asks for a relaxed policy. The same document may be accepted in full by a processor configured otherwise. A refusal names the rule or limit, and is never reported as a validity error.
- **Undetermined** — this processor could not obtain what it would judge against: nothing at a `!!schema` reference, or a host that did not answer. Nothing was judged. (A schema that *was* obtained and fails its pin is a resolver error.)

Both are reported in the same report as the four categories. A processor makes available, with any report carrying a refusal, its identifier policy, token policy, limits policy and the UCD version it judged under, and SHOULD make them reachable with no document in hand. The vocabulary a deployment writes its policy in, and a processor states its own in, is `https://tson.io/2026/38/m/policy.tn`; no document may name, import or otherwise select the policy it is judged under.

Every diagnostic carries line, column, and byte offset.

## 12. JSON — what is shared, and where the two part

**TSON is not a JSON superset.** A JSON document is not a TSON document. JSON is read through a **JSON
reader** — a second encoding of the same model, whose rules are *TSON Part 3: JSON Encoding* — which maps
JSON `null` to *void* (admitted where the position is voidable, exactly as `_` is) and JSON numbers to
`number`.

Four differences, each of which makes some JSON documents illegal as TSON:

1. **No `null` keyword.** A bare `null` is the four-character *string* (Part 1 §4.4). Converting JSON, map
   every `null` to `_`; leaving it produces a valid document that says something else.
2. **Field names are held to their record's name type** — identifiers, unless a schema says otherwise.
   In TSON text `{"first name": …}`, `{"_id": …}`, `{"Content-Type": …}` are resolver errors as schemaless
   records; those objects are maps (which is what a JSON reader makes of them). A JSON-LD `@id` or an OpenAPI `$ref` stays a record field only under a schema whose record
   declares it (and is then written quoted in TSON text).
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

`!!id:"https://host/path.tn"` names a published document; its argument is an IRI-reference (§1). The **canonical identity** is the host's canonical text plus the path — the scheme is dropped (`http` and `https` name the same document) and the query is dropped.

**The host is a `host` value** (the `!host` atom's definition, Part 1 §5.5): a registered name must be a `!hostname`, an IPv4 literal an `!ipv4`, an IP-literal an `!ipv6` — so an IPvFuture literal, a zone identifier, an underscore or a percent-encoded host is an error. Its **canonical text** is lowercase U-labels for a name (`bücher.example`), the dotted quad, or RFC 5952 text for IPv6, bracketed as the IRI grammar requires. **The path is NFC.**

**`!!id` is written in canonical form, and only so** — one spelling per published name:

- the host in its canonical text: `!!id:"https://Example.COM/x.tn"` and `!!id:"https://xn--bcher-kva.example/x.tn"` are errors, and so is uppercase beyond ASCII (`BÜCHER.example`), which no host name admits;
- the path NFC, with characters beyond US-ASCII written as themselves, never percent-encoded (`/schémas/x.tn`, not `/sch%C3%A9mas/x.tn`); no percent-encoding of unreserved characters; a percent-encoded reserved character in uppercase hex (`%2F`, not `%2f`);
- no userinfo, no port (default or otherwise), no dot-segments, no fragment, and a query of hash parameters only.

**A reference may use any spelling of the same identity**, and is read to canonical form before comparison: a host in any spelling `!host` admits — A-labels, ASCII case, an uncompressed or bracketed IPv6 address — and a path in its URI spelling, each percent-encoded UTF-8 sequence read back to its character, hex case ignored throughout. So `!!schema:"https://xn--bcher-kva.example/sch%c3%a9mas/x.tn"` names the document whose `!!id` is `https://bücher.example/schémas/x.tn`. What has no IRI form stays an error: a percent-encoding that is not the UTF-8 of an IRI character (`%FF`, an encoded bidirectional control), an encoded character that is not NFC, and a percent-encoded unreserved ASCII character. The rule covers `!!schema`, `!!import`, a schema library's keys, and the `TSON-Schema` HTTP field. Diagnostics name an identity in its canonical form, whichever spelling was written.

A reference with no host — `/local/orders.tn`, `file:/local/orders.tn`, `file:///local/orders.tn`, all one identity — names a library entry the application supplies and is never fetched. Its path **must be absolute**: a relative `tson.io/2026/38/m/core.tn` would collide with the identity `https://tson.io/2026/38/m/core.tn` reduces to.

A hash pin rides on the reference as `?sha256=<64 lowercase hex>`. The hash input is every byte after the id line's terminator (the id line itself is excluded so a document can carry its own hash). Content-addressed documents must be UTF-8. A truncated or uppercase hash is an error. A consumer holding a pinned reference must verify before use; a mismatch is an error, never a fallback. Two references to one identity with different digests conflict; a pinned and an unpinned reference do not.

Never write a digest from memory — compute it (`scripts/pin.py`) or leave the reference unpinned. `pin.py FILE --verify-refs DIR` checks every pinned `!!schema`, `!!meta` and `!!import` reference a file makes against the documents in `DIR`.

The revision 38 artifacts and their pins (Part 2 §13.2):

| Artifact | Pinned reference |
|---|---|
| meta-kernel | `https://tson.io/2026/38/m/meta-kernel.tn?sha256=9cc191d3390ba7c7495d016bfda63cfca861135b671804957bb216daafc1e95b` |
| meta | `https://tson.io/2026/38/m/meta.tn?sha256=62dde2f344853848cd0ce4f722a0305d979e5883c0dcd14308959ad6a01bff47` |
| core | `https://tson.io/2026/38/m/core.tn?sha256=95f66505cf74dd2d64d0b6cffd07538fa45b8c7096c556c87423b56b03423497` |
| net | `https://tson.io/2026/38/m/net.tn?sha256=06a939fac91c6f27d02f105ea248d33504b4d437484884a20acd3b6ddcb8c32a` |
| policy | `https://tson.io/2026/38/m/policy.tn?sha256=fc9208c720cfc28bacb33b6824b955df0627b4aa217f41f40b582ecd857295f6` |

## 14. Encoding, BOM, media type, file extension

UTF-8 recommended (required for content-addressed documents); UTF-16/32 permitted. Invalid byte sequences are lexer errors; no U+FFFD substitution. A leading U+FEFF is discarded; anywhere else outside quotes it is a lexer error.

Media type `application/tson` (optionally `; version=1`). Over HTTP the governing schema may also travel out of band in the **`TSON-Schema`** header field (an RFC 9651 String Item, defined in Part 3 §3.5); where it and `!!schema` are both present they MUST agree by canonical identity, and disagreement is an error, not a precedence question. Extension `.tn` for the 2026 revision series; `.tn1` is reserved for the frozen version 1 and must not be used before it. Document kind is decided by the header, not the extension.

## 15. Resource limits (Part 1 §9.1)

Resource limits are one **policy**, not scattered advice. Every limit has a default; a processor MUST
enforce each at its default or a configured value; the limit MUST be configurable or its enforced value
documented; and exceeding one MUST be reported as a clear refusal naming the limit and the threshold, never as
an out-of-memory or stack overflow. A limit refusal is the refused outcome (§11 above), never a finding about
validity; it is reported beside the identifier and token policies, and the limits SHOULD be reachable with no
document in hand so a generator can emit a document that fits.

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
