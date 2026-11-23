# Grammar notes for data documents

Condensed from TSON Part 1 §2, §3, §4, §6, §7, §8, §9 (2026 Revision 40), with the data-side rules of Part 2 §3.3, §4.2, §5.12 and §7; the grammar productions in §1 and §2 are quoted verbatim from Part 1 §7.4 and §7.7. Read the section you need; the SKILL.md rules cover the common path.

## Contents

1. Document shape, directives and the namespace
2. Qualified names, and values that name something
3. The unquoted-token profile and the identifier profile
4. Whitespace, line terminators, bidi marks
5. Quoted strings and escapes
6. Multi-line strings — stripping, worked examples
7. Lexer lookahead: `=>`, `!!`, `!`, `..`, signs, dots
8. Special characters and unrecognised characters
9. Adjacency rules
10. Annotation value scope
11. Identity rules: field names, map keys, NFC
12. Error categories, refused and undetermined
13. JSON — what is shared, and where the two part
14. Content addressing and `!!id`
15. Encoding, BOM, media type, file extension
16. Resource limits (Part 1 §9.1)

---

## 1. Document shape, directives and the namespace

Part 1 §7.4, verbatim:

```
document        = [ id-directive ] ws *( import-directive ws )
                  data-value ws
                ; a data document, or a schema document where the
                ; root's tag is "!schema" — the root is then
                ; the schema-map defined in [TSON-SCHEMA], and a
                ; Class 1 processor rejects it (§1.5, §8.1).
                ; Classification reads the header, the root's
                ; annotations and its tag, never its core value.

id-directive     = "!!" "id"     ":" single-line-token
import-directive = "!!" "import" ":" single-line-token
                ; ":" MUST be adjacent to the directive name (§7.5).
                ; "!!" whose name is not followed by an adjacent ":"
                ; is a parse error (§1.3). String literals match
                ; exact characters (§7.3): directive names are
                ; case-sensitive. Any other directive name — "meta"
                ; and "schema" among them — and a directive past the
                ; header are parse errors (§3.3).

data-value      = *annotation [tag] core-value

tag             = "!" qualified-name-token
                ; a type annotation: no argument list (§3.2)

core-value      = record / map / array
                / empty-brace / void / token

record          = "{" ws field *( separator field )
                  [ ws "," ] ws "}"
field           = field-name ws ":" ws data-value

map             = "{" ws map-entry
                 *( separator map-entry ) [ ws "," ] ws "}"
map-entry       = data-value ws "=>" ws data-value

array           = "[" ws [ data-value
                 *( separator data-value ) [ ws "," ] ] ws "]"
                ; a comma may follow a value (§2.4); a comma
                ; following nothing, or a comma, is a parse error
```

```
annotation      = "@" qualified-name-token [ ":" data-value ]
token           = unquoted-token / single-line-token
                / multi-line-token
field-name      = unquoted-token / single-line-token
                ; any single-line token (§2.5); the multi-line
                ; form is not admitted. The resolver matches the
                ; decoded, NFC-normalised text against §7.7 in a
                ; document that names no schema; under a schema
                ; the record's name type judges it
empty-brace     = "{" ws "}"
void            = "_"
qualified-name-token = unquoted-token
                ; text matches qualified-name (§7.7): segments joined
                ; by ".", each matched in full against the identifier
                ; grammar: `order`, `geo.address`. One token, since "."
                ; is a token character; a leading, trailing or doubled
                ; "." is a parse error. At a tag and an annotation the
                ; spelling is an unquoted token. A reference in a value
                ; is no production of this grammar: it is a token of
                ; either form, read by its position ([TSON-SCHEMA] §5.12).
```

**Kind dispatch.** Consume `!!id` if present and every `!!import` after it; read the root's leading annotations and its tag. If the tag is `!schema`, the document is a schema document (whatever it imports — the tag always names the pre-loaded kernel's `schema`); otherwise a data document. Classification never reads the root's value. A data-format-only processor rejects a schema document with a categorised diagnostic. A data document cannot use `!schema` as its root's tag.

A data document contains exactly one value. A pure-metadata document is `!!id:"…"` followed by `_`.

Directive arguments are **single-line** quoted tokens — a `"""` argument is a parse error — so every directive sits on one physical line. The `:` must be adjacent to the name. The argument is an **IRI-reference** (RFC 3987 §2.2): a URI, a relative or file reference, or either with characters beyond US-ASCII written as themselves rather than percent-encoded. Parsing never dereferences it. Whether a reference *identifies* a document, and the canonical form an identity must take, is §14's question.

The closed directive set (Part 1 §3.3):

| Name | Document | Where |
|---|---|---|
| `id` | both | header, first line, optional (publishing or pinning a schema requires it) |
| `import` | both | header, after the optional `id`, repeatable |

Nothing else: a `!!` at any value position (record field value, map key or entry value, array element), or after the root value begins, is a parse error; so is any other name. A value cannot open a schema of its own: every schema a document uses is imported in its header.

**The namespace a data document's imports bind** (Part 2 §3.3, §3.3.4, §7.1):

- Imports are **transitive**: each contributes the imported schema's entire namespace, its own entries and its imports'. Several imports are read as **one** flat namespace; order carries nothing, one schema reached twice (the diamond through `meta.tn`) contributes once, and two *different* schemas declaring one name is a resolver error naming both.
- Every tag and annotation resolves **from the root** of that namespace: `!order` a root entry, `!geo.address` the member `address` of the nested schema map `geo`, `@atom.ordering` a member of the kernel's `atom` map. There is no relative lookup.
- The built-in names are ordinary entries there: the kernel `meta.tn` declares `text`, `integer`, `int64`, `boolean`, `regex`, `bytes`, `iri`, `iri_reference`, `doc` (and `void` and `schema`); `numeric.tn`, `temporal.tn` and `net.tn` their families; `core.tn` imports the three libraries and adds the author annotations `deprecated`, `title`, `comment`, `examples`, `read_only`, `write_only`. A name no import's closure declares is an unresolved type.
- The kernel's `enum` and `set` are **incomplete entries**, no type: a schema completes them (`status => !enum [OPEN DONE]`, `tags => set<text>`), and a tag naming one (`!enum`, `!set`) is refused, as is a tag naming a value entry (`!orders`) or a parametric record (`!box`). Tag the declared name: `!status`, `!tags`.
- **Under `!!import` the root must carry a tag**, in every mode — an untagged root is a validation error — and every value is typed by its position or its tag: base type resolution does not apply.
- **An extern position is the foreign schema's scope.** Where the schema types a position by an extern (`order_v1 => !meta.extern { schema: "…"  type: order }`), every name inside the value there — tags, annotations, names at reference slots — resolves in that foreign schema's namespace, as in a document importing it; the tag in front of the value (`!order_v1 { … }`) is the enclosing scope's. The data says nothing about it: the schema that types the position does.
- A data document may write kernel vocabulary where its closure holds the kernel: `!meta.record { fields: {} }` is valid data under any library import, and resolver output is exactly such a document. Such a value is held to the kernel's types and declares nothing.

## 2. Qualified names, and values that name something

Part 1 §7.7, verbatim:

```
identifier          = identifier-start *identifier-continue
identifier-start    = XID_Start
identifier-continue = XID_Continue / "-"
                    ; the identifier profile of §7.1; every
                    ; identifier is also a well-formed
                    ; unquoted token

qualified-name      = identifier *( "." identifier )
                    ; a path of identifiers (§3.1, §3.2, §7.4;
                    ; [TSON-SCHEMA] §5.12): the lexer emits it as
                    ; one unquoted token, and the position that
                    ; reads it splits at each "." and matches each
                    ; segment against identifier
```

**Where qualified names stand.** A tag (`!geo.address`) and an annotation name (`@atom.ordering`), each an unquoted token whose segments are matched against the identifier grammar; `@x.`, `!.a` and `!a..b` are parse errors (`..` also lexes as the range token). Schemaless, a dotted annotation name is kept as written, and a dotted tag is outside the built-in vocabulary — a resolver error. Anywhere else a qualified name is an ordinary token: schemaless, `orders.place_order` or `v1.2` is a string under base resolution, and names nothing.

**A value that names something is a token** (Part 1 §2.3, §2.4; Part 2 §4.2, §5.12). Under a schema, a position typed by a reference reads the token's text as a qualified name, split at `.`; everywhere else the token is what it is. Form carries nothing: `orders.place_order` and `"orders.place_order"` are one reference, and a name is quoted exactly when one of its segments holds a character outside the token profile (`"main.public api.ping"`, where a namespace's key type admits the space). So the kernel's own type slots read either form: `!meta.array { element_type: text }` and `!meta.array { element_type: "text" }` are one value.

What the name must reach is the slot's reference type's to say:

- **over a constructor** — `meta.type_ref` (any type a value can have), `meta.ref<meta.record>` (record types), `meta.identifier_ref` — a **type's name**, judged a member of the reading document's closure. A parametric record is never a member (`t: box` over `box => <T> { … }` is refused): name the declaration of its application (`text_box => box<text>`, then `t: text_box`). An incomplete entry (`enum`, `set`) and a value entry are not types' names either.
- **over any other type** — `meta.ref<method>` — a **value's qualified name**, walked from the root: the first segment names an entry, each further one a member of a nested schema map, a key of a namespace value, or a field of a record value. A map that is no namespace is not entered, and no segment selects through an extern. A name reaching nothing, a type, or a value of another type is a validation error; the host receives the referent with the name.
- **always bare.** A framed name (`@doc:"x" orders`, `!meta.record orders`) is refused, and so is a record written at a reference slot.

**No argument list.** `<` and `>` are reserved for the schema grammar: `t: set<text>`, `!box<text> { … }` and `{ set<text> => 1 }` are parse errors, as `<` in any data value is — a schema document's payload and a resolved form read as data included. The schema declares the application (`names => set<text>`) and the data names it (`t: names`, `!names [a b]`). Quoted, `"set<text>"` is text: at a reference slot it is outside a name's grammar and refused there (a resolver error, as any token outside an atom's grammar is); at a `text` slot it is just text.

**No sibling form.** `kind!` is schema grammar — a dependent field's type, `value?: kind!` — and in a data value a `!` glued to the token before it is a parse error (`kind!`, `Hello!` and `a!b` alike). In data `!` is the type prefix alone.

**Types as data.** A value of the kernel's vocabulary — a resolved form, a type stored as data — spells out what the schema grammar abbreviates. A type slot (`meta.type_expr`: a field's `type`, `element_type`, `value_type`, a tuple element, each choice variant) holds a name or a **type written in place**, `{ of: !C { … } }`; a slot typed `meta.type_ref` (`key_type`, a parameter's `bound`, an alias's `target`, a reference's `of`) holds a name only:

```
!!import:"https://tson.io/2026/40/m/core.tn"
!meta.record { fields: {
  kind  => { type: meta.type_ref }
  tags  => { type: { of: !meta.array { element_type: text } } }
  value => { type: { of: !meta.dependent { on: kind } }  optional: true }
} }
```

A dependent type, `{ of: !meta.dependent { on: kind } }`, stands at a record field's `type` alone. Such a value is held to the kernel's types and declares nothing; a document whose type values are to be types is loaded as a schema.

**Dependent fields.** A schema may type a field by a sibling: `setting => { kind: meta.type_ref  value?: kind! }`. In data the dependent field is read against the type the sibling's value names, so a *free* sibling (neither pinned nor a discriminator) is written first: `!setting { kind: int32  value: 42 }`. Written the other way round, it is a validation error naming both fields. A pinned sibling or a discriminator orders nothing. This is the one place field order matters.

## 3. The unquoted-token profile and the identifier profile

```
Token       Start    = XID_Start ∪ Nd ∪ { - + . }
            Continue = XID_Continue ∪ { - + . }

Identifier  Start    = XID_Start
            Continue = XID_Continue ∪ { - }
```

The **token profile** decides what the lexer accepts as one unquoted token — values and names alike. The **identifier profile** constrains the *decoded text* of the names the grammar itself reads — annotation names, type-annotation names, each segment of a qualified name, and the type and parameter names of a schema document — and, **by default**, field names and enum members. The kernel states this profile as data, `meta.identifier => !unicode.identifier_type { continue_add: "-" }`; a schema describing another system's names declares another instance (`!unicode.identifier_type { start_add: "@$" }` for a JSON-LD or JSON Schema vocabulary, `!unicode.identifier_type { medial: " " }` for words), and such a profile types *values* — a record's field names and an enum's members among them, through the record's or enum's **name type**. Identifiers never begin with a digit, a sign or a dot; `+` and `.` are not allowed inside them. Every identifier is a valid unquoted token, so `!name` and `@name` positions admit no quoted form and lose nothing.

**`.` is the qualified-name separator**, living outside the identifier grammar in the positions that read names (§2); the lexer and the identifier profile are unchanged by it.

Underscore is `XID_Continue` but not `XID_Start`: `my_type` is fine, `_id` is neither a token nor an identifier. `{ _id: 1 }` is a parse error (the lexer reads `_` as the void sentinel and `id` as a second token), and `{ "_id": 1 }` is a resolver error in a schemaless document — quoting a name is a spelling, never a different set of names. Write `{ "_id" => 1 }`, unless a schema's name type admits the name.

Format characters (`Cf`) and controls are never in a token: the bidi controls U+061C, U+202A–U+202E, U+2066–U+2069, soft hyphen, word joiner are lexer errors outside quotes. ZWNJ/ZWJ (U+200C/D) are admitted by the token profile but an identifier accepts them only where UTS #39 says they have a shaping effect (Persian `کتاب‌ها` yes; `ad<ZWNJ>min` no).

Non-ASCII letters and digits are ordinary token characters: `名前: 値` needs no quotes.

**A field name is a value of its record's name type** (Part 1 §2.5, Part 2 §5.2). The grammar asks only that it be a single-line token — unquoted or quoted, two spellings of one set of names; the multi-line form is not admitted — and the layer that owns the record decides which names it admits:

- **In a document that names no schema**, the decoded text is NFC-normalised and matched in full against the identifier grammar; a name that fails is a **resolver error**, not a parse error. So `{ "first name": 1 }`, `{ "_id": 1 }` and `{ 42x: 2 }` are resolver errors. The remedy: *a key that is not a name belongs in a map* — `{ "Content-Type" => "text/plain" }`. A member name no identifier profile can state — the empty string, a leading or doubled space — is a key at every layer.
- **Under a schema**, a field name matches a declared one or the record is invalid (an undeclared field is a validation error), the match made in the record's name type's form. The default name type is the identifier profile; a record declared over a relaxed type holds `"@id"` validly:

  ```
  json_name   => !unicode.identifier_type { start_add: "@$" }
  json_record => !meta.record { name_type: json_name  extension: ABSTRACT  fields: {} }
  node        => json_record & { "@id": text  label: text }
  ```

  In data such a name is written quoted (`{ "@id": "n1"  label: x }`): `@` and `$` are outside the token profile. Under a case-folding name type `NAME` and `name` are one field, and two spellings of it in one record are a duplicate.
- **A document that names a schema is judged by that schema alone.** A Class 1 processor reading it holds its field names to no name rule; one that cannot obtain the schema leaves the document undetermined (§12) rather than judging it by the schemaless rule. A record nested in a relaxed one judges its own names: the relaxation does not leak.

**Identifier families make values into names.** Under a schema, a value whose declared type is an identifier family — the kernel's `meta.identifier`, or a `!unicode.identifier_type` instance the schema declares — is a name by its type's statement, wherever it stands: a map key, a field value, an array element. It is matched against *that family's* profile and meets name hygiene (§12) under the identifier policy, and the keys of one identifier-keyed map, and the elements of one unique array of identifiers, are look-alike scopes. A `text`-typed key stays data.

## 4. Whitespace, line terminators, bidi marks

Whitespace is `Pattern_White_Space` (11 characters): line terminators LF, VT, FF, CR, NEL, LS, PS; horizontal space TAB and SPACE; and the two ignorable format controls LRM (U+200E) and RLM (U+200F). LRM/RLM contribute nothing and are admitted only where a token boundary already exists — `[1<LRM>2]` and `ad<LRM>min` are lexer errors, not `[1, 2]` and `admin`. Inside quoted tokens they are ordinary content.

Any amount of whitespace equals any other. Indentation is never significant.

## 5. Quoted strings and escapes

Single-line quoted token: `"` … `"`. May contain any character from U+0020 upward except `"`, `\`, NEL, LS, PS. A literal TAB is not allowed — write `\t`.

| Escape | Result |
|---|---|
| `\"` `\\` | `"` `\` |
| `\b` `\f` `\n` `\r` `\t` | control characters |
| `\s` | U+0020 space (TSON extension, not JSON) |
| `\uXXXX` / `\u{X…}` | one to six hex digits in the brace form; the value denoted MUST be a Unicode scalar value |

**A solidus needs no escape and has none**: `\/` is an invalid escape.

**There are no surrogate pairs.** An escape names a character or it names nothing, so a surrogate code point (U+D800–U+DFFF) in either spelling is a lexer error and `\uD83D\uDE00` is *two* errors rather than one emoji — a TSON string is a well-formed sequence of scalar values by construction. `\u0041` and `\u{41}` are two spellings of one character; `\u{1F600}` names a supplementary character directly, as does `\u{E0100}` for a variation selector an ASCII-safe generator could otherwise only embed. The `{` after `u` decides the spelling at the first character, so the two forms never conflict; a brace form with no digits, more than six, or an unclosed brace is a lexer error. Unknown escapes (`\x41`, `\0`, `\e`) are lexer errors.

## 6. Multi-line strings

Opening: `"""` then optional spaces/tabs then a line terminator. Nothing else may follow the opening `"""` on its line. Closing: `"""` on its own line preceded only by whitespace; trailing spaces/tabs after it are ignored.

Rules, in order:
1. Content starts on the line after the opener.
2. The common leading whitespace prefix is computed over every **non-blank** content line **and the closing-delimiter line**, compared character by character (a tab never equals a space). That prefix is removed from every line; a line that does not fully match loses only the matching part. Never an error.
3. Trailing spaces and tabs on every line are stripped. Keep intentional trailing whitespace with `\s`, or `\t` at the end of the line.
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

## 7. Lexer lookahead

- `=` followed by `>` → the map arrow `=>`; otherwise `=` alone is a special token (schema grammar only — a parse error in data).
- `!` followed by `!` → the directive token `!!`; otherwise `!` is a special token, the type prefix, glued to the type name after it (`!date`). A `!` glued to the token *before* it (`kind!`, `Hello!`, `a!b`) is a parse error in data — zero separation between two values.
- `<` and `>` are each one special token, reserved for the schema grammar: `map<text list<int32>>` lexes as `map` `<` `text` `list` `<` `int32` `>` `>` for that grammar to read, and in a data value the first `<` is a parse error.
- `.` followed by `.` → the range token `..` (schema grammar only). `.` followed by a token character → an unquoted token begins (`.5`, `.inf`). Bare `.` → lexer error. An unquoted token **ends** before two consecutive dots: `1..100` lexes as `1`, `..`, `100`, so content containing `..` must be quoted.
- `-` or `+` followed by a token character → an unquoted token begins (`-42`, `+0.5`). Otherwise the sign is emitted alone as a special token — `-` the schema grammar's subtraction operator, `+` its at-least-one field-group mark — and in a data value each is a **parse error**. A mid-token hyphen is part of the token: `a-b`, `2026-07-01`, `[1-2]` (one token!).

## 8. Special characters and unrecognised characters

Fifteen characters are special tokens: `! @ & < > ? ~ = | ; ( ) ^ - +`. In data values two have a role — `!` (type prefix) and `@` (annotation); each of the other thirteen is a **parse error** in a data document (they belong to the schema grammar; `-` and `+` reach special-token mode only when no token character follows). Parentheses are not delimiters.

Everything else outside a quoted token is an **unrecognised character** and a lexer error: `/ # % * ' \` `` ` ``, `$ € ¥`, control characters, unassigned code points. Content needing them is quoted: `"$19.99"`, `"10%"`, `"2/3"`, `"/usr/bin"`, `"#tag"`. Text holding `<`, `>` or `!` (`List<String>`, `Hello!`) is quoted too: bare, each is a parse error.

## 9. Adjacency rules

| Operator | Rule |
|---|---|
| `!` prefix | must be adjacent to the following type name |
| `!!` | must be adjacent to the following directive name |
| `@` | must be adjacent to the following annotation name |
| `:` in a record field | whitespace optional on both sides |
| `:` after an annotation or directive name | must be adjacent to the name; whitespace optional after |
| valueless annotation | at least one whitespace character must follow the name |
| type annotation | at least one whitespace character before a following token; none needed before `{` `[` |
| `=>` | whitespace optional |

## 10. Annotation value scope

`@a:value` — the value is exactly one data-value, ending at the end of its core value. That data-value may itself carry annotations, so `@a:@b:val target extra` parses as `@a` whose value is (`target` annotated by `@b:val`), then `extra` belongs to the surrounding context. `@a:@b val target` (no colon on `@b`) makes `@b` a valueless annotation on `val`, so `@a`'s value is `@b val` and `target` is outside. An annotation is never itself a value: `{ x: @a:@b:val }` is a parse error because `x` still needs a core value.

Annotation values are data values — never type definitions. Under a schema, an annotation resolves in the document's namespace, from the root (`@doc` the kernel's, `@deprecated` core's, `@atom.ordering` the kernel's `atom` map); a bare annotation is valid only against a `void`-targeted declaration, and a valued one only against a non-void target.

## 11. Identity rules

- **Field names** in one record must be unique (resolver error otherwise). Identity is the NFC-normalised decoded text: `name` and `"name"` collide; `"café"` decomposed and precomposed collide. Case-sensitive at this layer; a schema's name type may make more names equal (a case-folding one makes `NAME` and `name` a duplicate), never fewer.
- **Map keys** must be unique. Textual identity is the minimum — the NFC-normalised string after escape processing (`Alice` = `"Alice"`, and `"cafe\u0301"` = `"caf\u00E9"`); a processor that decodes values also relates `0xFF` and `255`, `1_000` and `1000`. Annotations and type annotations on a key do not participate in identity (`!text a` = `a`). Under a schema the declared key type can make more keys equal, never fewer: `1` and `1.0` under a `number`-keyed map, and `Content-Type` and `content-type` under a text key type whose `normalization` folds case — a duplicate only the declared type relates is a validation error.
- **NFC.** Unquoted tokens must already be NFC in the source (lexer error otherwise); the lexer never alters token text. Quoted tokens keep their exact content: at naming positions they are NFC-normalised before they are matched and compared, and string *values* stay distinct as written — but wherever two values are compared, they compare in NFC: as map keys, and under a schema in every comparison a text type makes. Under a schema a text type also states the form its values are *put into* — its `normalization`, one of `NONE` (the default), `NFC`, `NFKC`, `NFKC_CASEFOLD`, `ASCII_CASEFOLD` — and facets, comparison and a round trip all see that value; an identifier family's default is `NFC`. No comparison goes below NFC.
- **Equality is over value spaces, not lexical spaces.** A type denotes a value space; an encoding defines a lexical space and one canonical form per value. Two spellings of one value are one value for map keys, sets, refinement, disjointness and content addressing — so `!bytes` compares octets whatever the alphabet, and `!datetime`/`!time` compare the instant whatever the offset (`+00:00`, `-00:00` and `Z` are one).
- **Form picks a choice's variant.** Under a schema, an untagged value at a disjoint choice goes to the variant of its token's class: at `( int8 | text )` a bare `42` is the number and `"42"` the text. An emitter writes text that would resolve to another class quoted, and a boolean or number variant's value bare. At a choice whose variants share a class, every value carries its tag.

## 12. Error categories, refused and undetermined

Four categories, one severity (there are no warnings):

- **Lexer error** — bad bytes/encoding, unterminated strings, bad escapes, a character escape denoting no scalar value, unrecognised characters, non-NFC unquoted tokens.
- **Parse error** — structure: unclosed brackets, adjacency violations, missing separators, a comma that follows nothing or follows a comma, `!!` without adjacent `:`, a directive name other than `id`/`import` (`meta` and `schema` included) or a directive outside the header, a token at an annotation-name or type-annotation-name position whose decoded text is not a qualified name, a field name that is not an unquoted or single-line token, and a special token the data grammar gives no role — `<` and `>` among them, so an argument list in a value (`set<text>`, `!box<text>`); a `!` glued to the token before it (`kind!`) is a missing separator.
- **Resolver error** — `_` as a map key, a field name of a schemaless document that is not an identifier, a type annotation outside the built-in vocabulary in a schemaless document (a dotted one included), duplicate field names or map keys, a built-in annotation on a container, a token an atom's contract rejects (among them a leap second, a character beyond US-ASCII under `!uri`/`!uri_reference`, a trailing dot under `!hostname`); under a schema, an unresolved type name, an import collision or cycle, a pin that does not match.
- **Validation error** — numeric range violations, CIDR prefix/host-bit violations, a relative reference where `!uri` or `!iri` requires a scheme, `!boolean` given another token, and under a schema every declared constraint — an untagged root under `!!import`, an undeclared field, `_` at a slot that is not voidable, a dependent field before its free sibling, a reference naming nothing of the right kind, a tag naming a parametric record, a tag at a position whose type is written in place.

Implementations may label categories in their own words (the Java CLI reports base-syntax parse errors under a `VALIDATION_ERROR` code); the specification's category governs.

**Refused and undetermined are two outcomes beside the four categories, and neither is a finding about validity.** Validity is a property of the bytes and the schema, the same at every processor (at or after the Unicode version the text needs). The two outcomes answer a different question — whether *this* processor accepts the document — and answer it oppositely:

- **Refused** — this processor declined the document under its own configuration: its name-hygiene policy and Unicode data version (confusable names, restricted scripts), a resource limit, or a schema it does not hold and will not fetch, or one past its size limit. A certain rejection *here*; the sender holds the fix, or asks for a relaxed policy. The same document may be accepted in full by a processor configured otherwise. A refusal names the rule or limit, and is never reported as a validity error.
- **Undetermined** — this processor could not obtain what it would judge against: nothing at an `!!import` reference, or a host that did not answer. Nothing was judged. (A schema that *was* obtained and fails its pin is a resolver error.)

Both are reported in the same report as the four categories. A processor makes available, with any report carrying a refusal, its identifier policy, token policy, limits policy and the UCD version it judged under, and SHOULD make them reachable with no document in hand. The vocabulary a deployment writes its policy in, and a processor states its own in, is the `policy.processor` type of `https://tson.io/2026/40/m/policy.tn` (its `identifier_policy` and `token_policy`, and `policy.limits`); no document may name, import or otherwise select the policy it is judged under.

Every diagnostic carries line, column, and byte offset.

## 13. JSON — what is shared, and where the two part

**TSON is not a JSON superset.** A JSON document is not a TSON document. JSON is read through a **JSON
reader** — a second encoding of the same model, whose rules are *TSON Part 3: JSON Encoding* — which maps
JSON `null` to *void* (admitted where the position is voidable, exactly as `_` is) and JSON numbers to
`number`.

Four differences, each of which makes some JSON documents illegal as TSON:

1. **No `null` keyword.** A bare `null` is the four-character *string* (Part 1 §4.4). Converting JSON, map
   every `null` to `_`; leaving it produces a valid document that says something else.
2. **Field names are held to their record's name type** — identifiers, unless a schema says otherwise.
   In TSON text `{"first name": …}`, `{"_id": …}`, `{"Content-Type": …}` are resolver errors as schemaless
   records; those objects are maps (which is what a JSON reader makes of them). A JSON-LD `@id` or an OpenAPI
   `$ref` stays a record field only under a schema whose record declares it (and is then written quoted in
   TSON text).
3. **`\/` is not an escape.**
4. **No surrogate pairs.** `\uD83D\uDE00` is two lexer errors; write `\u{1F600}`.

And, as before, NEL (U+0085), LS (U+2028) and PS (U+2029) must be escaped inside a single-line token rather
than written raw — they are line terminators here, which is the only reason they are excluded.

**The binding.** A JSON document names its schemas in band with a root annotation object that leads with
`"$import": [ … ]` (a non-empty array of references — the header's `!!import`s) and then `"$type"` (the root's
tag, a qualified name such as `"geo.address"`), or out of band through the `TSON-Schema` HTTP field. Below the
root, `$type` and `$value` carry a tag; `$import` anywhere but the root's annotation object is a resolver error.
Converting to TSON text: `$import` → the `!!import` lines, `$type` → `!name`, `$value` → the tagged value.
One value has one type name, as in text: a `$value` carries no `$type` of its own (`{ "$type": "circle", … }`,
not a `shape` wrapper around a `circle`). A JSON string at a reference holds a qualified name and nothing else:
`"set<text>"` and `"kind!"` are strings outside the reference's grammar and refused there, as the quoted text
token `"set<text>"` is.

What the two share — `"`-delimited strings, `[ ]` arrays, `{ name: value }` records, the
`\n \r \t \\ \"` escapes, base type resolution as a mechanism, and the rule that an unadorned numeric token
names the exact type `number` — is shared because each was a good idea on its own, and none of it rests on a
compatibility claim. A leading BOM is accepted. There are no comments and no anchors or merge keys, by design.

## 14. Content addressing and `!!id`

`!!id:"https://host/path.tn"` names a published document; its argument is an IRI-reference (§1). The **canonical identity** is the host's canonical text plus the path — the scheme is dropped (`http` and `https` name the same document) and the query is dropped.

**The host is a `host` value** (the `!host` atom's definition, Part 1 §5.5): a registered name must be a `!hostname`, an IPv4 literal an `!ipv4`, an IP-literal an `!ipv6` — so an IPvFuture literal, a zone identifier, an underscore or a percent-encoded host is an error. Its **canonical text** is lowercase U-labels for a name (`bücher.example`), the dotted quad, or RFC 5952 text for IPv6, bracketed as the IRI grammar requires. **The path is NFC.**

**`!!id` is written in canonical form, and only so** — one spelling per published name:

- the host in its canonical text: `!!id:"https://Example.COM/x.tn"` and `!!id:"https://xn--bcher-kva.example/x.tn"` are errors, and so is uppercase beyond ASCII (`BÜCHER.example`), which no host name admits;
- the path NFC, with characters beyond US-ASCII written as themselves, never percent-encoded (`/schémas/x.tn`, not `/sch%C3%A9mas/x.tn`); no percent-encoding of unreserved characters; a percent-encoded reserved character in uppercase hex (`%2F`, not `%2f`);
- no userinfo, no port (default or otherwise), no dot-segments, no fragment, and a query of hash parameters only.

**A reference may use any spelling of the same identity**, and is read to canonical form before comparison: a host in any spelling `!host` admits — A-labels, ASCII case, an uncompressed or bracketed IPv6 address — and a path in its URI spelling, each percent-encoded UTF-8 sequence read back to its character, hex case ignored throughout. So `!!import:"https://xn--bcher-kva.example/sch%c3%a9mas/x.tn"` names the document whose `!!id` is `https://bücher.example/schémas/x.tn`. What has no IRI form stays an error: a percent-encoding that is not the UTF-8 of an IRI character (`%FF`, an encoded bidirectional control), an encoded character that is not NFC, and a percent-encoded unreserved ASCII character. The rule covers `!!import`, an extern's `schema`, a schema library's keys, the `$import` member and the `TSON-Schema` HTTP field. Diagnostics name an identity in its canonical form, whichever spelling was written.

A reference with no host — `/local/orders.tn`, `file:/local/orders.tn`, `file:///local/orders.tn`, all one identity — names a library entry the application supplies and is never fetched. Its path **must be absolute**: a relative `tson.io/2026/40/m/core.tn` would collide with the identity `https://tson.io/2026/40/m/core.tn` reduces to.

A hash pin rides on the reference as `?sha256=<64 lowercase hex>`. The hash input is every byte after the id line's terminator (the id line itself is excluded so a document can carry its own hash). Content-addressed documents must be UTF-8. A truncated or uppercase hash is an error. A consumer holding a pinned reference must verify before use; a mismatch is an error, never a fallback. Two references to one identity with different digests conflict; a pinned and an unpinned reference do not. Pins compose: a document pins its schema, the schema pins the libraries it imports, each library pins the kernel — so one digest authenticates the whole chain.

Never write a digest from memory — compute it (`scripts/pin.py`) or leave the reference unpinned. `pin.py FILE --verify-refs DIR` checks every pinned `!!import` in a file's header against the documents in `DIR`; `pin.py DIR --verify-refs` does so for every `.tn` file in `DIR`; `pin.py --self-test DIR` also checks a copy of the six bundled artifacts in `DIR` against the pins below.

The revision 40 artifacts and their pins (Part 2 §13.2). `meta.tn` imports nothing; `numeric.tn`, `temporal.tn`, `net.tn` and `policy.tn` each import `meta.tn`; `core.tn` imports the three libraries.

| Artifact | Pinned reference |
|---|---|
| meta (the kernel) | `https://tson.io/2026/40/m/meta.tn?sha256=291ddaf37566f9f084515d09626f1855d05f2cfb9413e3ce0073323f4933ddcd` |
| numeric | `https://tson.io/2026/40/m/numeric.tn?sha256=0337c18854a0e689ce53d9cae47e1cfd32bd54026acd6a3bac9abae358cb86f7` |
| temporal | `https://tson.io/2026/40/m/temporal.tn?sha256=3d516776324209f0406523dac4cc7bac85af0d530599de85a55cdc0b3ef77b20` |
| net | `https://tson.io/2026/40/m/net.tn?sha256=80b8d1c1af70469b6513891498781454595202cdb3a49501b70b216b5108ea7d` |
| core | `https://tson.io/2026/40/m/core.tn?sha256=00eaf2174c7ba05510ce8410a4b7577bf6fd4bf6db8f099a7c8ec02edd053241` |
| policy | `https://tson.io/2026/40/m/policy.tn?sha256=ffcecb04bf6be35c8e2c93375bf2c1bb1d09603f874823495ed7d8cf107fb408` |

## 15. Encoding, BOM, media type, file extension

UTF-8 recommended (required for content-addressed documents); UTF-16/32 permitted. Invalid byte sequences are lexer errors; no U+FFFD substitution. A leading U+FEFF is discarded; anywhere else outside quotes it is a lexer error.

Media type `application/tson` (optionally `; version=1`). Over HTTP the governing schemas may also travel out of band in the **`TSON-Schema`** header field (an RFC 9651 List of Strings, defined in Part 3 §3.5); where it and the `!!import`s are both present they MUST agree as sets of canonical identities (order and repetition carry nothing), and disagreement is an error, not a precedence question. Extension `.tn` for the 2026 revision series; `.tn1` is reserved for the frozen version 1 and must not be used before it. Document kind is decided by the header and the root's tag, not the extension.

## 16. Resource limits (Part 1 §9.1)

Resource limits are one **policy**, not scattered advice. Every limit has a default; a processor MUST
enforce each at its default or a configured value; the limit MUST be configurable or its enforced value
documented; and exceeding one MUST be reported as a clear refusal naming the limit and the threshold, never as
an out-of-memory or stack overflow. A limit is a positive `int64` (`policy.limit`). A limit refusal is the
refused outcome (§12 above), never a finding about validity; it is reported beside the identifier and token
policies, and the limits SHOULD be reachable with no document in hand so a generator can emit a document that
fits.

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

The nesting-depth limit is checked as containers open in the token stream, before any reader descends —
counted where the resource is counted, not where it is spent. The aggregate limit (total values) is a separate
mechanism from the per-container ones. A deployment raises these; the defaults are what "a conforming
document" means with nothing else said. A foreign value at an extern position is part of the document that holds
it, so every limit runs across the boundary. The schemas a document's header names are bounded by the
schema-side limits of Part 2 §11.5 — import closure 64 (schemas reached through imports and through externs),
entries in one schema map 65,536, and alias chain, supertype chain and wait depth 64 each.
