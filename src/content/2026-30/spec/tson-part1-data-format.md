---
title: "TSON Part 1: Data Format"
draft: "2026-30"
status: "Working Draft"
part: 1
description: >
  The lexer, structural grammar, absent sentinel, augmentation syntax (annotations, type
  annotations, directives), and base type resolution — everything needed to losslessly read
  and write schemaless TSON data.
---

# TSON Part 1: Data Format

## Draft 2026-30

**Status:** Working Draft
**Series:** TSON Specification, Part 1 of 3


## 1. Introduction

TSON (Tagged Structure Object Notation) is a Unicode text-based data interchange format that extends the concepts of JSON (JavaScript Object Notation) with richer structural types, optional annotations, optional type annotations, optional directives, and a layered type system that separates structural parsing from semantic interpretation.

This document defines the TSON **data format**: the lexer, the structural grammar, the absent sentinel, augmentation syntax (annotations, type annotations, and directives), and base type resolution. A processor implementing only this document can losslessly read and write any schemaless TSON data document. Section 7 defines TSON's relationship to JSON, including a summary of the differences.


### 1.1 The TSON Specification Series

The TSON specification is published in three parts:

- **Part 1: Data Format** (this document) — the lexer, the data grammar, and base type resolution.
- **Part 2: Type Vocabulary** [TSON-TYPES] — the built-in atom types, their parsing contracts, and the built-in type annotations available without a schema.
- **Part 3: Schemas and Directives** [TSON-SCHEMA] — the `!!type` definition grammar, the type system, the schema chain, and the registered directives (`!!schema`, `!!id`, `!!import`, `!!include`, `!!type`).

Each part adds capability without modifying the parts below it. In particular, the lexer defined in this document is complete: higher parts introduce no new tokens, no new lexer modes, and no changes to character classification. They assign meaning to tokens that this document already emits.


### 1.2 Design Principles

1. **Structural simplicity** — The data grammar handles structure only. Value interpretation is deferred to base type resolution (§6) and, in higher parts, to the type system.

2. **Layered extensibility** — TSON operates in layers: lexer, structural parser, resolver, base type resolver, and optionally the type vocabulary and schema layers of Parts 2 and 3. Each layer adds capability without requiring the layers above.

3. **Unicode foundation** — The lexer's character classification, identifier rules, and normalization are defined in terms of Unicode character properties (UAX #31, UAX #15). Field names and values work in all scripts without quoting. All structural operators use ASCII characters.

4. **Minimal required syntax** — Commas and double quotes are optional where the structure is unambiguous.

5. **JSON compatibility** — Valid JSON is a subset of valid TSON at the structural level. TSON parsers SHOULD accept JSON documents.

6. **Locality** — A TSON data value is fully local. The format provides no data-level reuse mechanisms (no anchors, references, or merge operators): what appears at a position is the complete value.

7. **Permanent stability** — TSON version 1 is a permanent specification. The grammar and base type resolution rules are frozen once published. There is no TSON 1.1 or TSON 2. New types are added through the type system (Parts 2 and 3), not through changes to this document. Errata may clarify ambiguities but MUST NOT change the grammar or the behaviour of conforming implementations.


### 1.3 Conformance

A **conforming TSON data-format processor** implements the lexer (§3), the structural grammar (§4), the augmentation syntax (§5), and base type resolution (§6) as defined in this document. Such a processor:

- MUST parse every well-formed data document and reject every ill-formed one, reporting errors per §9.6;
- MUST preserve annotations, unresolved type annotations, and unknown configuration directives (§5);
- MUST treat any value-producing directive as a parse error, since this document registers no value-producing operations (§5.3);
- is NOT REQUIRED to implement the type vocabulary of [TSON-TYPES] or the schema layer of [TSON-SCHEMA].

Processors implementing Parts 2 or 3 MUST also conform to this document.


### 1.4 Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

Error categorisation — which processing layer rejects a violation and what canonical phrasing this series uses to mark it — is defined in §9.6.


## 2. Encoding

TSON is a Unicode data format. The grammar is defined in terms of Unicode character properties, not byte sequences. The lexer, parser, and normalization rules depend on the following Unicode Standard properties and specifications:

| Property / Spec       | Source  | Used for                          |
|-----------------------|---------|-----------------------------------|
| XID_Start             | UAX #31 | Unquoted token start characters   |
| XID_Continue          | UAX #31 | Unquoted token continuation       |
| Nd                    | UCD     | Decimal digits in all scripts     |
| Pattern_White_Space   | UAX #31 | Whitespace / token separation     |
| Pattern_Syntax        | UAX #31 | Special tokens / syntax operators |
| NFC                   | UAX #15 | Unquoted token normalization      |

All five character properties (`XID_Start`, `XID_Continue`, `Nd`, `Pattern_White_Space`, `Pattern_Syntax`) are stable — the Unicode Standard guarantees that characters are never removed from these sets. The `XID_Start` and `XID_Continue` properties are stable under NFC normalization, ensuring that normalizing a valid token always produces a valid token.

Implementations MUST support the properties listed above for their declared Unicode version. Implementations SHOULD document which Unicode version they support.

TSON documents are encoded in Unicode. UTF-8 encoding is RECOMMENDED. UTF-16 and UTF-32 encodings are permitted. [TSON-SCHEMA] imposes UTF-8 on schema documents referenced with a content hash.


## 3. Lexical Structure

### 3.1 Lexer

The TSON lexer produces a stream of tokens from the input. The lexer classifies each input character by its start character to determine the token type:

1. **Whitespace** — Characters with the Unicode `Pattern_White_Space` property are consumed and not emitted as tokens. Whitespace separates tokens but is not itself a token, except within quoted tokens where it is preserved. The `Pattern_White_Space` set is: U+0009 (TAB), U+000A (LF), U+000B (VT), U+000C (FF), U+000D (CR), U+0020 (SPACE), U+0085 (NEL), U+200E (LRM), U+200F (RLM), U+2028 (LINE SEPARATOR), U+2029 (PARAGRAPH SEPARATOR). This set is immutable — the Unicode Standard guarantees it will never change.

2. **Quoted token** — A double quotation mark (U+0022) begins a quoted token. If the next two characters are also quotation marks, the lexer enters multi-line mode (§3.2.2). Otherwise, it enters single-line mode (§3.2.1). This is the first of the lexer's lookahead rules.

3. **Unquoted token** — A character with the Unicode `XID_Start` property, a character with the Unicode `Nd` (Decimal Number) property, or one of `-` `+` `.` `#` `$` `%` `/` `∞` begins an unquoted token. The lexer consumes characters while subsequent characters match the unquoted continuation set (characters with the `XID_Continue` property, plus the extended character set defined in §3.3).

4. **Structural delimiter** — One of the six characters `{` `}` `[` `]` `:` `,` is emitted as a single-character structural delimiter token. Parentheses `(` `)` are emitted as special tokens. See §3.4.

5. **Absent sentinel** — The underscore character `_` is emitted as a single-character absent token. See §3.5.

6. **Compound special token** — Two characters trigger lookahead rules **before** unquoted token mode or special token mode is attempted. Equals checks for `=>` (map arrow); exclamation mark checks for `!!` (directive). See §3.6.

7. **Special token** — Any other character is emitted as a single-character special token. See §3.6.

The character classification is exhaustive and unambiguous. Every character in the input falls into exactly one start category. The lookahead rules (quotation mark, equals sign, exclamation mark) are the only cases where the lexer examines more than one character to determine a token.

**Token positions.** Every token carries its source position. The parser uses position adjacency to enforce no-whitespace rules: the prefix operators `!`, `@`, and `!!` MUST be adjacent to their operand with no intervening whitespace. See §10.3 for the complete adjacency table.


#### 3.1.1 Normalization

Implementations MUST normalize unquoted tokens to Unicode Normalization Form C (NFC) as recommended by UAX #31. This ensures that visually identical tokens are treated as identical by the parser. For example, `café` written as U+0063 U+0061 U+0066 U+00E9 (precomposed) and `café` written as U+0063 U+0061 U+0066 U+0065 U+0301 (decomposed) MUST produce the same token.

Quoted tokens are not normalized at the lexer layer — they preserve their exact Unicode content.

**Identifier positions normalise at the resolver layer.** Quoted tokens that occupy identifier positions — record field names, and any position that a higher part designates as an identifier — are NFC-normalised by the resolver before identity comparison. String-typed positions (record values, map values) are not normalised: quoted values preserve exactly what the author wrote. A consequence: a record key written as `"café"` (decomposed) and another key written as `"café"` (precomposed) in the same record collide as duplicate field names after resolver-layer normalisation; two string *values* with the same difference remain distinct strings.


### 3.2 Quoted Tokens

A quoted token is a sequence of Unicode characters enclosed in double quotation marks, with support for escape sequences.

```
quoted-token = single-line-token / multi-line-token
```


#### 3.2.1 Single-line Tokens

```
single-line-token = DQUOTE *char DQUOTE

char       = unescaped
           / BSLASH ( DQUOTE / BSLASH / "/"
                    / "b" / "f" / "n" / "r" / "t" / "s"
                    / unicode-escape )

unicode-escape = "u" 4HEXDIG

unescaped  = ; U+0020 through U+10FFFF, excluding:
             ;   U+0022 (DQUOTE)
             ;   U+005C (BSLASH)
             ;   U+0085 (NEL)
             ;   U+2028 (LINE SEPARATOR)
             ;   U+2029 (PARAGRAPH SEPARATOR)
```

The `unescaped` rule excludes all five Unicode line terminators recognised by TSON. LF (U+000A) and CR (U+000D) are already excluded by the lower bound of U+0020 (inherited from JSON's definition). NEL (U+0085), LINE SEPARATOR (U+2028), and PARAGRAPH SEPARATOR (U+2029) are explicitly excluded to ensure that single-line tokens are genuinely single-line. These three characters MAY be included in single-line tokens via their escape sequences (`\u0085`, `\u2028`, `\u2029`). In multi-line tokens, all five line terminators are handled by the `line-terminator` production and participate in whitespace stripping.

The single-character escape sequences map to Unicode code points as follows:

| Escape | Code point | Description           |
|--------|------------|-----------------------|
| `\"`   | U+0022     | Quotation mark        |
| `\\`   | U+005C     | Reverse solidus       |
| `\/`   | U+002F     | Solidus (JSON compat) |
| `\b`   | U+0008     | Backspace             |
| `\f`   | U+000C     | Form feed             |
| `\n`   | U+000A     | Line feed             |
| `\r`   | U+000D     | Carriage return       |
| `\t`   | U+0009     | Character tabulation  |
| `\s`   | U+0020     | Space (TSON extension; not in JSON) |

The `\/` escape is permitted for JSON round-trip compatibility; the unescaped form `/` is equally valid. The `\s` escape (U+0020 SPACE) is a TSON extension whose primary use is preserving intentional trailing whitespace in multi-line tokens (§3.2.2).

The `\uXXXX` form (`unicode-escape`) encodes any Unicode code point using a four-digit hexadecimal sequence; supplementary characters above U+FFFF use a surrogate pair (§3.2.3).


#### 3.2.2 Multi-line Tokens

Multi-line tokens use triple double quotation marks as delimiters. The opening delimiter is three consecutive quotation marks followed by a line terminator. The closing delimiter is three consecutive quotation marks on their own line, preceded only by optional whitespace.

```
multi-line-token = TDQUOTE line-terminator ml-content
                   ws-indent TDQUOTE

TDQUOTE         = DQUOTE DQUOTE DQUOTE
line-terminator = LF / CR LF / CR / NEL / LS / PS
ml-content      = *( ml-char / line-terminator )
ml-char         = ml-unescaped
                / BSLASH ( DQUOTE / BSLASH / "/"
                         / "b" / "f" / "n" / "r" / "t" / "s"
                         / unicode-escape )

ml-unescaped    = ; U+0020 through U+10FFFF, excluding:
                  ;   U+005C (BSLASH)
                  ;   U+0085 (NEL)
                  ;   U+2028 (LINE SEPARATOR)
                  ;   U+2029 (PARAGRAPH SEPARATOR)
                  ; DQUOTE is permitted — only """ closes the block

ws-indent       = *( SP / HTAB )
```

A single `"` or `""` inside a multi-line token is literal content. Only `"""` on its own line (preceded only by whitespace) closes the block. To include a literal `"""` sequence in the content, escape at least one quotation mark: `\"""`.

The same escape sequences apply as in single-line tokens (§3.2.1).

Multi-line tokens follow these whitespace rules:

1. The content begins on the line following the opening delimiter. Any characters on the same line as the opening delimiter (other than whitespace) MUST NOT appear.
2. Common leading whitespace is removed. The parser determines the common whitespace prefix by examining the indentation of all **non-blank** content lines and the closing delimiter line. A blank line is one that contains no characters other than the line terminator (or contains only whitespace characters). Blank lines do not participate in the common indentation calculation. After the common prefix is determined, it is removed from the start of every line (including blank lines, which remain blank).
3. Trailing whitespace on each line is stripped. To preserve intentional trailing whitespace, use the `\s` escape (U+0020) or `\u0020` at the end of the line.
4. The line terminator before the closing delimiter is not included in the token value.
5. Escape sequences are processed after whitespace stripping.


#### 3.2.3 Unicode Escape Sequences and Surrogates

The `\uXXXX` escape sequence produces a single Unicode code point. For code points in the Basic Multilingual Plane (U+0000 through U+FFFF), a single `\uXXXX` escape is used.

For code points above U+FFFF (supplementary characters), JSON permits encoding as a surrogate pair: a high surrogate (U+D800 through U+DBFF) immediately followed by a low surrogate (U+DC00 through U+DFFF). TSON also permits this for JSON compatibility.

TSON adds the following requirements that the JSON specification (RFC 8259) leaves ambiguous:

- A high surrogate escape MUST be immediately followed by a low surrogate escape. A high surrogate not followed by a low surrogate is a lexer error.
- A low surrogate escape MUST be immediately preceded by a high surrogate escape. A lone low surrogate is a lexer error.
- The resulting code point MUST be a valid Unicode scalar value. The surrogate code points (U+D800 through U+DFFF) are not valid Unicode scalar values and MUST NOT appear in the decoded token.

These rules ensure that all TSON quoted tokens contain well-formed Unicode after escape processing. Implementations MUST reject documents containing unpaired surrogate escapes rather than silently producing ill-formed strings.


### 3.3 Unquoted Tokens

An unquoted token begins with a character that has the Unicode `XID_Start` property, a character with the Unicode `Nd` (Decimal Number) property, or one of the characters `-` `+` `.` `#` `$` `%` `/` `∞`. The lexer continues consuming characters while the next character is in the unquoted continuation set, which includes the same character classes plus `×` `⁺` `⁻` and the Unicode superscript digits. The token ends when the next character is not in this set.

```
unquoted-token = unquoted-start *unquoted-char
unquoted-start = XID_Start / Nd / "-" / "+" / "." / "#" / "$" / "%" / "/"
               / "∞"                                      ; U+221E
unquoted-char  = XID_Continue / "-" / "+" / "." / "#" / "$" / "%" / "/"
               / "∞"                                      ; U+221E INFINITY
               / "×"                                      ; U+00D7 MULTIPLICATION SIGN
               / "⁺" / "⁻"                               ; U+207A, U+207B SUPERSCRIPT SIGNS
```

The Unicode superscript digits are in `XID_Continue`, so UNF Unicode scientific notation (e.g. `6.02×10²³`) is a single unquoted token. Underscore is in `XID_Continue` but not `XID_Start`, so it may appear within a token (`my_type`) but MUST NOT start one (preserving the absent sentinel `_`).

Valid single unquoted tokens include identifiers in any script (`name`, `名前`, `имя`), numbers in any UNF form (`42`, `-1.5e10`, `6.02×10²³`, `0xFF`), dates without times (`2025-03-13`), and decorated values (`$10.23`, `#tag`, `/api/v1/users`).

Any value containing characters outside the unquoted continuation set MUST be quoted. In particular:

- **Timestamps** containing colons MUST be quoted: `"2025-03-13T15:30:00Z"`. Dates without times (`2025-03-13`) do not require quoting.
- **URLs** containing colons MUST be quoted: `"https://example.com/api/v1"`.
- **Email addresses** MUST be quoted: `"alice@example.com"`.
- **Binary data** (base64, base64url, base32, hex) SHOULD always be quoted.
- **Values with spaces** or any other character not in the unquoted continuation set MUST be quoted.


### 3.4 Structural Delimiters

The six structural delimiter characters are each emitted as a single-character token:

```
structural-delimiter = "{" / "}" / "[" / "]"
                     / ":" / ","
```

The colon is the field separator in records and annotation values. The comma is the optional value separator. Parentheses `(` and `)` are not structural delimiters — they are emitted as single-character special tokens (§3.7) and are reserved for the type-definition grammar of [TSON-SCHEMA].


### 3.5 The Absent Sentinel

The underscore character `_` is emitted as a single-character absent token.

```
absent-token = "_"
```


### 3.6 Special Tokens

Any character that does not fall into the preceding categories (whitespace, quotation mark, unquoted start, structural delimiter, or underscore) is a special character. Special characters are emitted as **single-character tokens**.


#### 3.6.1 Compound Token Lookahead Rules

Two characters trigger lookahead rules that have priority over all other non-whitespace, non-quote modes:

**Map arrow.** When the lexer encounters `=` (equals sign) at a token boundary, it checks whether the next character is `>` (greater-than sign). If so, both are consumed and emitted as the single map arrow token `=>`. If the lookahead does not match, the `=` is emitted as a single-character special token.

**Directive.** When the lexer encounters `!` (exclamation mark) at a token boundary, it checks whether the next character is also `!`. If so, both are consumed and emitted as the single directive token `!!`. If not, the `!` is emitted as a single-character special token (the type prefix).

```
map-arrow-token     = "=" ">"
directive-token     = "!" "!"
```

Together with the quoted token lookahead (U+0022 checking for triple U+0022), these are the lookahead rules in the lexer.


#### 3.6.2 Single-Character Special Tokens

All remaining `Pattern_Syntax` characters not handled by the preceding modes are emitted as single-character special tokens. This includes characters that are in `Pattern_Syntax` but are not structural delimiters, not the quotation mark, not lookahead characters (equals sign, exclamation mark), and not one of the seven `Pattern_Syntax` characters permitted in unquoted tokens (`-` `+` `.` `#` `$` `%` `/`).

Characters outside `Pattern_Syntax` that are also not `Pattern_White_Space`, `XID_Start`, `Nd`, or underscore (e.g. unassigned code points, control characters) also fall into this category.

Two special characters have grammar roles in data values:

```
!     — type prefix (type annotation); also first character of !! directive lookahead
@     — annotation prefix
```

The following special characters are emitted by the lexer but have **no role in data values**; they are reserved by the type-definition grammar of [TSON-SCHEMA]. In a data value, each is a parse error:

```
&     — supertype composition ([TSON-SCHEMA])
<     — open angle bracket, type arguments ([TSON-SCHEMA])
>     — close angle bracket, type arguments ([TSON-SCHEMA])
?     — optional type suffix ([TSON-SCHEMA])
~     — default modifier / constructor marker ([TSON-SCHEMA])
=     — fixed modifier ([TSON-SCHEMA]); first character of => map arrow lookahead
|     — variant separator ([TSON-SCHEMA])
;     — array size specifier separator ([TSON-SCHEMA])
(     — choice grouping open ([TSON-SCHEMA])
)     — choice grouping close ([TSON-SCHEMA])
```

All of these are in `Pattern_Syntax`. Since `Pattern_Syntax` is immutable, the set of characters that can serve as TSON syntax operators is stable across all Unicode versions. The division of labour is fixed: the lexer accepts every `Pattern_Syntax` character that has a grammar role anywhere in the TSON series and emits it as a special token; the parser then accepts or rejects special tokens based on the current grammatical context.

The following `Pattern_Syntax` characters are deliberately unused in TSON v1 and have no meaning anywhere in the series:

```
*     — unused
^     — unused
'     — unused (single quote)
`     — unused (backtick)
\     — unused outside quoted tokens (within quoted tokens, \ is the escape character)
```

The lexer rejects these characters outside quoted tokens as unrecognised characters — the same error class as any character that does not fit the grammar. They have no separate "reserved" status: TSON v1 is permanent (§1.2), so there is no future v1.x revision that might assign them meaning. A future major version (`.tn2`) is a separate specification with its own grammar and is free to use any character it likes.


### 3.7 Whitespace and Separators

Whitespace serves two syntactic roles: it separates tokens, and it is preserved within quoted tokens.

Within structural types, adjacent items MUST be separated by at least one whitespace character, a comma, or both. The separator is what distinguishes adjacent values from parts of a single value. For example, in `[1 2 3]`, the whitespace between `1` and `2` is what makes these three values rather than one.

A comma alone is a valid separator (`[1,2,3]`). Whitespace alone is a valid separator (`[1 2 3]`). A comma with surrounding whitespace is a valid separator (`[1, 2, 3]`). Zero-width separation (no whitespace and no comma between items) MUST NOT be used — adjacent items with no separator are a parse error.

**Trailing separators are not permitted.** A separator separates two adjacent items; a trailing separator separates an item from nothing, which is not a meaningful operation. `[1, 2, 3,]`, `{ x: 1, }`, and similar forms are parse errors. If a comma is written, it must separate two items. The grammar's `separator` production excludes trailing separators by construction. The same rule applies throughout the series, including the type-definition grammar of [TSON-SCHEMA].

Note that structural delimiters inherently create token boundaries, so no separator is required between a structural delimiter and an adjacent value. `{name:Alice}` is valid because `{`, `:`, and `}` are structural delimiters that the lexer emits as separate tokens. The separator rule applies between items within a structure, not between delimiters and their content.

Whitespace is not significant for indentation or formatting. Any amount of whitespace (including line breaks) between tokens is equivalent to any other non-zero amount of whitespace, except within quoted tokens where all whitespace is preserved.

```
ws        = *Pattern_White_Space
ws1       = 1*Pattern_White_Space
separator = ws "," ws / ws1
```


### 3.8 Comments

TSON does not define a comment syntax. Metadata is expressed through annotations (`@`), which are preserved by the parser and available to consuming applications.

## 4. Documents and Structure

### 4.1 Document

A TSON document is the outermost structure. A document contains exactly one value. Directives (`!!`), annotations, and type annotations are part of the value rule (§4.2), so document-level configuration and metadata are expressed as augmentation on the document's value.

The document serves as the attachment point for document-level metadata and directives. Configuration directives precede annotations in the grammar; annotations sit closest to the value they describe; value-producing directives occupy the value slot and therefore sit after annotations (see §5.3 for the full ordering rule). Directives affect how the value is interpreted. Type annotations that precede the document's core value are properties of the document, not of the inner value.

```
document  = ws data-value ws
```

A document with no directives or augmentation is simply a value:

```
{ name: Alice age: 30 }
```


### 4.2 Data Values

TSON uses a single parser with one value rule. A data value consists of optional configuration directives, optional annotations, then either a value-producing directive or an optional type annotation and a core value.

```
data-value      = value-directive-form / standard-form

value-directive-form = *annotation value-directive
standard-form        = *directive *annotation [type-ref-data] core-value

type-ref-data   = "!" unquoted-token

directive       = "!!" unquoted-token ":" data-value
value-directive = "!!" unquoted-token ws directive-body
                ; directive-body is determined by the operation the
                ; directive name resolves to in the directive registry
                ; (§5.3). This document registers no value-producing
                ; operations.

core-value      = record / map / array
                / empty-brace
                / absent / token
```

Configuration directives (colon form) may appear zero or more times in `standard-form` and affect how the value is interpreted. Annotations may appear zero or more times and describe the value. The parser distinguishes the two directive forms by the character immediately after the name: a `:` means a configuration directive with a data-value; any other character means a value-producing directive whose grammar is determined by the operation the directive name resolves to in the directive registry (§5.3). This document registers no value-producing operations; [TSON-SCHEMA] registers one (`type`). For a processor conforming only to this document, every value-producing directive is therefore an unknown value-producing directive and is a parse error (§5.3).

Configuration directives MUST NOT precede a value-producing directive — configuration directives describe data-value interpretation, but value-producing directives produce non-data values for which configuration directives have no defined effect.

A type reference (`!typename`) may appear at most once — it tags the value with a type name. Type-annotation resolution is defined by higher parts (§5.1); in data values, only the simple `type-ref` form is permitted — array brackets, type arguments, and the `?` suffix are constructs of the [TSON-SCHEMA] type-definition grammar, and their appearance in data values is a parse error.


### 4.3 Structural Types

TSON defines three structural types for contained data. The document is the implicit outermost structure.

| Type   | ASCII Syntax | Separator | Purpose                          |
|--------|-------------|-----------|----------------------------------|
| Record | `{ : }`     | `:`       | Fixed named fields               |
| Map    | `{ => }`    | `=>`      | Variable key-value associations  |
| Array  | `[ ]`       | whitespace| Variable-length sequence         |

The structural classification:

|              | Positional | Named      |
|--------------|------------|------------|
| **Variable** | Array `[]` | Map `{=>}` |
| **Fixed**    |            | Record `{:}` |

Set and tuple types are defined in the type system of [TSON-SCHEMA] and use array syntax `[]` at the data level; a data-format processor treats every `[ ... ]` as an array. Parentheses `()` are reserved for the [TSON-SCHEMA] type-definition grammar.

The grammar rules below use `V` to represent `data-value`. All structural types use the same value rule.


#### 4.3.1 Record

A record is an ordered collection of named fields enclosed in curly braces. Field names are separated from values by a colon. Fields are separated by whitespace or an optional comma.

```
record     = "{" ws field *( separator field ) ws "}"
field      = field-name ws ":" ws V
field-name = token                          ; unquoted or quoted
```

A record MUST contain at least one field. An empty `{}` is parsed as an `empty-brace` (§4.3.5) and resolved by the resolver.

Field names within a record SHOULD be unique. If duplicate field names are present, the last value wins. Two field names are identical if they produce the same NFC-normalized string after escape processing — `name` and `"name"` are the same field name.


#### 4.3.2 Map

A map is a collection of key-value associations enclosed in curly braces. Keys are separated from values by the arrow operator `=>`. Entries are separated by whitespace or an optional comma.

```
map       = "{" ws map-entry *( separator map-entry ) ws "}"
map-entry = V ws "=>" ws V
```

Keys are not restricted to strings. Duplicate keys SHOULD NOT be present. If duplicate keys are present, the last value wins.

**Key equality.** The parser detects **textually identical** keys — scalar keys are identical if they produce the same NFC-normalized string after escape processing. `Alice` and `"Alice"` are duplicates; `1` and `1.0` are not. For compound keys, textual identity requires the same structure with textually identical elements at every position. The parser SHOULD warn when textually identical keys are detected. Type-aware key equality — detecting that `1` and `1.0` denote the same number under a declared key type — requires declared type information and is defined by [TSON-SCHEMA].

Maps are distinguished from records by the presence of `=>` separators (§4.3.3). A map MUST contain at least one entry for parser-level disambiguation. An empty `{}` is parsed as an empty-brace (§4.3.5).


#### 4.3.3 Disambiguation of Record, Map, and Empty Braces

A parser determines whether a curly-brace structure is a record, a map, or a deferred-disambiguation node by examining tokens incrementally after the opening brace. Disambiguation proceeds as follows:

1. If the opening brace is immediately followed by `}` (with only whitespace between), the structure is an **empty-brace** (§4.3.5).
2. Otherwise, the parser consumes the first value and peeks at the next token:
   - `:` → the structure is a **record**.
   - `=>` → the structure is a **map**.
   - anything else → parse error. A value inside curly braces MUST be followed by `:` (record) or `=>` (map).

The parser does not need type or schema context to disambiguate in case 2. Non-empty braces are always resolved by content. Empty braces produce a deferred node that the resolver transforms (§4.3.5).


#### 4.3.4 Array

An array is an ordered collection of values enclosed in square brackets. Values are separated by whitespace or an optional comma.

```
array      = "[" ws [ V *( separator V ) ] ws "]"
```

An array represents a variable-length sequence of values.


#### 4.3.5 Empty Braces

One case produces a deferred-disambiguation node — the parser cannot determine the structural type from syntax alone and delegates to the resolver.

**Empty braces.** An empty pair of curly braces has no content to examine for `:` or `=>` separators.

```
empty-brace = "{" ws "}"
```

The parser emits an `EmptyBraceValue` node. In the absence of declared type information, the resolver transforms it into an empty record. When a higher part supplies declared type information ([TSON-SCHEMA]), the resolver transforms it into the empty container of the expected type:

- If the expected type is a record, the result is an empty RecordValue.
- If the expected type is a map, the result is an empty MapValue.
- If no expected type is available, the result defaults to an empty RecordValue.


### 4.4 Absent Sentinel

The underscore token `_` represents an explicitly absent value. It indicates that a position or field has no value, distinct from any typed value including the base type null (§6.1).

```
absent = "_"
```

The absent sentinel is a structural concept, not a type. It signals to the parser and any consuming layer that no value occupies this position. The interpretation of absence (e.g. null, unset, default, or removal) is determined by the consuming application or by higher parts of this series.

**Permitted positions.** The following table is the canonical reference for where `_` may appear in data values and what it means. [TSON-SCHEMA] extends this table for positions within the type-definition grammar.

| Position                   | `_` permitted? | Meaning                                            |
|----------------------------|----------------|-----------------------------------------------------|
| Record field value         | yes            | Field present with absent value                     |
| Map value                  | yes            | Entry present with absent value                     |
| Array element              | yes            | Element explicitly absent (occupies a slot)         |
| Map key                    | no             | Resolver error — map keys must be concrete values   |
| Document top-level value   | yes            | Document explicitly contains no value               |


#### 4.4.1 Absent in Records

In a record, a field set to `_` is **present with an absent value**. The field exists in the record's structure; its value is explicitly absent. This is distinct from the field not appearing at all.

```
{ name: Alice age: _ active: true }
```

This record has three fields. The `age` field is present but its value is absent.


#### 4.4.2 Absent in Sequences

In arrays, `_` marks a position as explicitly absent:

```
[1 _ 3 _ 5]
```

Absent elements occupy positional slots — the data `[1 _ 3]` has three elements, not two. Higher parts that impose size or element constraints on arrays count all slots including absent ones, and MAY restrict whether absence is permitted at element positions ([TSON-SCHEMA]). At the data-format layer, absence is permitted at any element position.


#### 4.4.3 Absent in Maps

The absent sentinel MUST NOT appear as a map key. Map keys must be concrete values. The absent sentinel MAY appear as a map value, with the same semantics as in a record field: the entry is present but its value is absent.

This is a resolver-layer constraint, not a grammar constraint. The `map-entry` production in §10.2 accepts any value in key position — the resolver rejects maps whose keys are the absent sentinel.


#### 4.4.4 Absent as Document Value

The absent sentinel MAY appear as the document's top-level value. This represents a document that explicitly contains no value. The document carries its directives and augmentation (annotations, type annotations) but its contained value is absent.


#### 4.4.5 Absence Encoding

Whether absent values at optional positions are encoded on the wire using the absent sentinel or omitted entirely is a serialisation context concern, not a document property. Implementations SHOULD provide a mechanism for controlling this at the encoder level.


## 5. Augmentation

Augmentation adds metadata, type information, and directives to values without modifying the structural grammar. All augmentation is optional and is expressed directly within the value rules (§4.2) rather than as a separate wrapper.

At the document level (§4.1), annotations and directives attach to the document itself. Within structural types, augmentation attaches to the value that follows it.

Data values support three augmentation features: annotations (`@`), directives (`!!`), and type annotations (`!name`). The type-definition grammar of [TSON-SCHEMA] defines additional syntax that is not available in data values.

In all contexts, a value MAY have any number of annotations (`@`). Configuration directives precede annotations in the grammar; value-producing directives sit after annotations (§5.3).

Annotations are ordered in the token stream. This order is preserved by the parser. Implementations MUST preserve order to support applications that assign meaning to it.

TSON provides no data-level reuse mechanisms — no anchors, references, or spread/merge operators. A data value is fully local (§1.2, principle 6).


### 5.1 Type Annotations

A type annotation associates a named type with the following value.

A type annotation is the prefix operator `!` immediately followed (without whitespace) by an unquoted token forming the type name:

```
type-ref = "!" unquoted-token
```

The `!` prefix means "this names a type" — it tags a value with a type. At the document level, a type annotation identifies the expected type of the document's contained value. Within structural types, a type annotation identifies the type of the value that follows.

**Resolution is defined by higher parts.** This document defines type-annotation syntax only. [TSON-TYPES] defines a built-in vocabulary of type annotations available without a schema; [TSON-SCHEMA] defines resolution against a declared schema. A processor conforming only to this document MUST preserve type annotations as uninterpreted syntactic markers attached to their values; it MUST NOT reject a document because a type annotation is unresolved. Applications processing such documents SHOULD treat unresolved type annotations as informational.

**Type annotations apply to the value, not its contents.** A type annotation identifies the type of the value that immediately follows. It does not describe the element type of a compound value: `!person { name: Alice }` tags the record, not its fields, and an array's element type is not expressed by a type annotation on the array itself.

**Type expression syntax is not available in data values.** Array brackets, type arguments, and the optional `?` suffix exist only within the [TSON-SCHEMA] type-definition grammar. Their appearance after `!` in a data value is a parse error.


### 5.2 Annotations

An annotation attaches metadata to a value without modifying the value itself. An annotation consists of a name and an optional value.

An annotation is the special token `@` immediately followed (without whitespace) by an unquoted token forming the annotation name, optionally followed by `:` and a data value.

```
annotation = "@" unquoted-token [ ":" data-value ]
```

**Adjacency and termination.** The `:` (when present) MUST be adjacent to the annotation name — no whitespace permitted between the name and the colon. When the `:` is absent (annotation without a value), at least one whitespace character MUST follow the annotation name to separate it from whatever comes next. These rules make annotation boundaries lexically determined: the lexer can decide "annotation with value" vs "annotation without value" by inspecting the single character immediately after the name.

**Annotation value scope.** When `:` is present, the annotation's value is exactly one `data-value` — that is, optional augmentation (directives, annotations, type annotation) followed by exactly one core-value. The annotation value terminates at the end of that core-value; subsequent tokens belong to the surrounding context, not to the annotation. For example, in `@a:@b:val target`, `@a`'s value is the data-value `@b:val` (an annotated core-value where the core-value is the token `val`); `target` is the next item in the surrounding context, not part of `@a`'s value.

Annotation values are always data values — concrete values, not type definitions.

In data values, annotations precede the value and annotate it — including either side of a map entry, where annotations on the key annotate the key and annotations on the value annotate the value. The parser preserves annotations in their authored positions; it does not merge them across entry sides or hoist them between key and value.

**Multiplicity.** An annotation name MAY appear any number of times on a single value. `@doc:"first" @doc:"second"` is two annotations, both preserved in source order. The expectation is that consumers use a pattern-matching interface to find the annotations they care about; this series does not define such an interface.

**Semantics are defined by higher parts.** At the data-format layer, annotations are preserved, ordered metadata with no further interpretation. [TSON-SCHEMA] defines annotations as typed metadata attachments — an annotation `@T` names a type `T` in a schema chain and its value is validated against `T`'s contract. A processor conforming only to this document MUST preserve annotations without validating them.


### 5.3 Directives

Directives provide configuration and value-producing capabilities using the `!!` compound token. There are two forms, distinguished by the token after the directive name:

```
directive       = "!!" unquoted-token ":" data-value
value-directive = "!!" unquoted-token ws directive-body
```

**Configuration directives** (colon form) provide pre-interpretation configuration — the `!!` compound token followed by a name, `:`, and a data value. The `:` MUST be adjacent to the directive name (no whitespace permitted between name and colon). They appear before the core value in a data-value and do not produce content.

**Value-producing directives** activate a specialized grammar and produce the value for their position. The parser distinguishes the two forms by the character immediately after the name: a `:` means configuration; any other character (including whitespace) means value-producing, with the grammar determined by the operation the directive name resolves to.

Directives are structurally distinct from annotations. An annotation (`@`) is optional metadata that can be stripped without affecting interpretation. A directive (`!!`) affects how the value is interpreted — stripping a directive may make the value uninterpretable.

**The directive registry.** The parser resolves directive names through a directive registry that maps names to canonical semantic operations. This document defines the registry mechanism and registers no operations. [TSON-SCHEMA] registers one value-producing operation (`type`) and four configuration operations (`schema`, `id`, `import`, `include`). Implementations MUST NOT introduce new operations beyond those registered by this series.

Directive names are localizable: a locale-aware implementation registers locale-specific aliases that map to the canonical English operations. The mechanism for distributing locale mappings is implementation-defined and out of scope for this series. Implementations MUST recognise the canonical English directive names; locale support is OPTIONAL. Locale-aware implementations MUST register a locale's alias mappings before parsing documents that use them.

**Unknown directive handling** depends on form:

- Unknown **configuration** directives (`!!name:value`) are permitted by the grammar. Implementations MUST preserve them and SHOULD surface them to the consuming application. Implementations MUST NOT reject documents solely because an unknown configuration directive is present. Production systems MAY restrict which directives are accepted through configuration.
- Unknown **value-producing** directives (`!!name <whitespace> ...`) are parse errors. There is no grammar to consume the content; the parser cannot determine where the directive ends.

For a processor conforming only to this document, the registry contains no value-producing operations, so every value-producing directive is unknown and therefore a parse error. Such a processor preserves the configuration directives registered by [TSON-SCHEMA] (`!!schema`, `!!id`, `!!import`, `!!include`) as unknown configuration directives without acting on them; documents that rely on their semantics require a Part 3 processor.


## 6. Base Type Resolution

Base type resolution applies **only when no declared type information is in scope** — for a processor conforming only to this document, that is always. It provides default value interpretation for schemaless TSON, giving parsers a reasonable way to distinguish null, booleans, numbers, and strings without a type system.

When a higher part supplies declared type information ([TSON-SCHEMA]), base type resolution does NOT apply at typed positions; each declared atom type owns its own parsing contract. The tokens `true`, `false`, and `null` have special status only under base type resolution.

For schemaless TSON, the parser resolves unquoted tokens using the following base types, evaluated in order.


### 6.1 Null

The token `null` (case-sensitive, lowercase only) resolves to the null value. `null` is distinct from the absent sentinel `_`: null is a value that can be stored and transmitted; `_` indicates that no value occupies a position. `null` is a base type resolution keyword only — higher parts define its meaning at declared-type positions ([TSON-SCHEMA]).

```
null-value = "null"
```


### 6.2 Boolean

The tokens `true` and `false` (case-sensitive, lowercase only) resolve to boolean values. No other representations (yes, no, on, off, True, FALSE) are recognised as boolean.

```
boolean-value = "true" / "false"
```


### 6.3 UNF Number

Numeric values are resolved according to the Unicode Number Format (UNF) specification [UNF]. The base type resolver uses a first-character dispatch: if the token's first character is an ASCII digit (`0`–`9`), a sign (`+`, `-`), a decimal point (`.`), or the infinity symbol (`∞`), the token is dispatched to the UNF parser. All other tokens skip to §6.4.

UNF's internal resolution priority, applied in order, is: (1) special values, (2) hex/octal/binary integers, (3) rationals, (4) complex numbers, (5) floats, (6) integers. The first successful match determines the type. Tokens that pass the first-character dispatch but match no UNF pattern fall through to string. This priority list is reproduced here for implementor convenience; the normative UNF source is the version pinned in the References section by URL and content hash. This pinning preserves the permanent-stability guarantee in §1.2 — UNF may revise after TSON publication, but TSON v1 references a fixed UNF revision identified by its content hash.

The UNF specification defines the grammars and resolution priority for the following numeric types:

- **Special values** — `.nan` (with optional `#` hex payload), `.inf`/`.infinity`/`∞` (with optional sign), signed zeros (`+0.0`, `-0.0`). Special value names are lowercase only.
- **Hex/octal/binary integers** — `0xFF`, `0o755`, `0b1010`. The `0x`, `0o`, `0b` prefixes are unambiguous.
- **Rational numbers** — Exact fractional representation `a/b` where both components are decimal integers and the denominator is positive and nonzero. Rationals are always in reduced form.
- **Complex numbers** — Values of the form `a+bi` or `a+bj`. Pure imaginary values require an explicit coefficient (`1i`, not bare `i`).
- **Float** — Decimal or hexadecimal with scientific notation. Includes ASCII (`6.02e23`) and Unicode (`6.02×10²³`) forms. Hex floats use binary exponent via `p` (`0x1.999ap-4`).
- **Integer** — Arbitrary-precision signed decimal integers. Leading zeros MUST NOT be used except for the single digit zero.

Rationals must be in reduced form with a positive denominator per the UNF specification. The parser must verify this (e.g. via GCD check), not just pattern match. A token like `4/6` is not a valid rational and falls through to the next resolution candidate.

Underscore digit separators (`1_000_000`) are permitted within digit sequences for readability, following UNF rules: no leading, trailing, or consecutive underscores, and no underscores adjacent to signs, decimal points, or base prefixes.

Non-ASCII digit sequences (Thai, Devanagari, Arabic-Indic, etc.) are not matched by UNF and fall through to string.

Implementations MUST support at minimum: integer, float, and the special values `.nan`, `.inf`/`.infinity`/`∞` with optional sign. Support for hex/octal/binary integers, rational numbers, complex numbers, hex floats, Unicode scientific notation, and underscore separators is RECOMMENDED.


### 6.4 String

Any quoted token resolves to a string value. Any unquoted token that does not match null, boolean, or a UNF number resolves to a string value.

This includes single-character tokens that begin with a sign or punctuation character permitted as `unquoted-start` (§3.3) — `-`, `+`, `.`, `#`, `$`, `%`, `/` — when they appear without continuation. Such tokens fail UNF resolution and fall through to string. Authors who want a literal single-character string SHOULD quote it for clarity. The infinity character `∞` (U+221E) is the exception: it is a complete UNF special value on its own and resolves to positive infinity, not a string.


### 6.5 Resolution Order

When no declared type information is in scope, the parser MUST attempt resolution in this order:

1. null — exact keyword match
2. boolean — exact keyword match (`true`, `false`)
3. UNF number — first-character dispatch (`0`–`9`, `+`, `-`, `.`, `∞`), then UNF internal priority
4. string — fallback for everything else

To represent the string `"null"` in schemaless TSON, use quotes: `"null"`.


## 7. Relationship to JSON

TSON is a structural superset of JSON: every valid JSON document is a valid TSON document (§7.1), and TSON extends JSON's surface syntax and data model in the ways summarised in §7.2. The extensions are additive — no JSON construct changes meaning under TSON.


### 7.1 JSON Compatibility

A TSON parser SHOULD accept any valid JSON document as a valid TSON document. JSON documents carry no TSON type information, so base type resolution (§6) applies:

- JSON objects are records.
- JSON arrays are arrays.
- JSON strings are quoted tokens resolved as strings.
- JSON numbers are unquoted tokens resolved as integers or floats by UNF number resolution (§6.3).
- JSON `true`, `false`, and `null` are unquoted tokens resolved as boolean and null by base type resolution.

The comma separators and quoted keys required by JSON are accepted by the TSON grammar. The JSON `null` value maps to the TSON null base type, not to the absent sentinel.


### 7.2 Summary of Differences

The following table summarises how TSON differs from JSON (RFC 8259) at the data-format layer. Each row cites the defining section.

| Area | JSON | TSON |
|------|------|------|
| Quoting | Strings and keys always quoted | Unquoted tokens for identifiers and scalar values, in any script; quotes required only when content leaves the unquoted set (§3.3) |
| Separators | Comma required between items | Whitespace or comma; trailing separators invalid in both (§3.7) |
| Field names | Quoted strings | Unquoted or quoted tokens; identity by NFC-normalised form (§3.1.1, §4.3.1) |
| Strings | Single-line; `\uXXXX` escapes | Adds multi-line `"""` blocks with indentation stripping and the `\s` escape (§3.2.2); unpaired surrogate escapes are rejected rather than tolerated (§3.2.3) |
| Numbers | Base-10 decimal only; no infinity or NaN | UNF: arbitrary precision, hex/octal/binary bases, digit separators, rationals, complex numbers, signed infinities, NaN, and Unicode scientific notation (§6.3) |
| Keyed structures | Objects with string keys only | Records (fixed named fields, `:`) and maps (variable associations, `=>`, keys of any value type) are distinct structures (§4.3) |
| Absence | `null` only | The absent sentinel `_` is distinct from the value `null` (§4.4, §6.1) |
| Metadata | None | Annotations (`@name`, `@name:value`), ordered and preserved (§5.2) |
| Type tagging | None | Type annotations (`!name`) as syntax (§5.1); a schemaless vocabulary in [TSON-TYPES]; schema resolution in [TSON-SCHEMA] |
| Configuration | None | Directives (`!!name:value`) with a registry populated by [TSON-SCHEMA] (§5.3) |
| Comments | None | None — annotations carry metadata and survive parsing (§3.8) |
| Encoding discipline | Bytes and code points | Grammar defined over stable Unicode properties; unquoted tokens NFC-normalised (§2, §3.1.1) |

A minimal illustration — the same document in JSON and in idiomatic TSON:

```
{
  "server": "db-01",
  "port": 5432,
  "tags": ["primary", "ssd"],
  "comment": null
}
```

```
{
  server: db-01
  port: 5432
  tags: [primary ssd]
  comment: null
}
```

TSON also deliberately declines two extensions common in JSON supersets: there is no comment syntax (§3.8) and there are no anchors, references, or merge operators — data values are fully local (§1.2, principle 6).


## 8. Media Type and File Extension

TSON documents use the media type `application/tson`. Version information is not encoded in the media type — version mismatches are detected at the schema level ([TSON-SCHEMA]), not at the content type level. If version disambiguation is needed in HTTP contexts, implementations MAY use a parameter: `application/tson; version=1`. The `application/tson` media type is intended for IANA registration.

TSON version 1 uses the file extension **`.tn1`** for all documents — data files, schema documents, type libraries, and test fixtures alike. The `1` in the extension matches the version number in schema URLs. Future major versions of TSON will use correspondingly numbered extensions (`.tn2` for version 2, etc.); the version is part of the extension itself rather than carried in metadata. Whether a `.tn1` file is a data document or a schema document is determined by its content ([TSON-SCHEMA]).


## 9. Security Considerations

### 9.1 Denial of Service

Deeply nested structures and extremely long tokens are potential denial-of-service vectors. Implementations SHOULD enforce configurable limits on nesting depth, token length, and document size.

**Numeric literal length.** Base type resolution admits arbitrary-precision numeric literals by grammar. Without an upper bound this becomes a denial-of-service vector — a parser can be forced to allocate proportional storage for an unbounded digit string. Implementations SHOULD enforce a maximum digit count for unquoted numeric literals. A reasonable default is 4096 digits. The limit MUST be configurable or, where configuration is impractical, the implementation MUST document its enforced limit. Parsers exceeding the limit MUST report a clear error indicating the configured threshold rather than failing with an out-of-memory condition.


### 9.2 Absence of Type Guarantees

TSON documents processed at the data-format layer carry no type guarantees — only base type resolution (§6) applies. Applications processing untrusted TSON input SHOULD validate against a schema ([TSON-SCHEMA]) before use.


### 9.3 Directive Security

Directives (`!!`) are a control channel that affects interpretation. Unknown configuration directives are preserved by the parser; unknown value-producing directives are parse errors (§5.3). Applications processing untrusted TSON input SHOULD restrict which directives are accepted. [TSON-SCHEMA] defines additional controls for the directives it registers.


### 9.4 Confusable Characters

Unicode identifiers introduce the possibility of visually confusable field names — for example, Latin `a` (U+0061) and Cyrillic `а` (U+0430) are visually identical in many fonts but are different characters and different tokens. NFC normalization does not address this because these are distinct characters, not different representations of the same character. Implementations processing untrusted TSON input SHOULD consider Unicode confusable detection (Unicode Technical Standard #39, "Unicode Security Mechanisms") when field name identity is security-relevant.


### 9.5 Bidirectional Formatting Characters

`Pattern_White_Space` includes two characters that are bidirectional formatting marks rather than visual whitespace — U+200E (LRM) and U+200F (RLM). These are treated as token separators per UAX #31. A stray LRM or RLM embedded in what an author perceives as a single identifier silently terminates the token, which can alter document structure invisibly. Implementations processing untrusted input SHOULD consider surfacing the presence of bidirectional formatting characters outside quoted tokens.


### 9.6 Error Reporting

Errors fall into four categories corresponding to the processing layers. The categories are defined here for the whole series; the resolver and validation categories are populated mainly by the higher parts.

- **Lexer errors** — Malformed tokens: unterminated quoted strings, unterminated multi-line tokens, invalid escape sequences, unpaired surrogate escapes, unrecognised characters.
- **Parser errors** — Structural mismatches: unclosed brackets, adjacency violations (`! integer` instead of `!integer`), unexpected tokens (`:` where `=>` was expected, or vice versa), missing separators between values, unknown value-producing directives.
- **Resolver errors** — Reference and resolution failures. At the data-format layer: an absent sentinel in map key position. [TSON-TYPES] and [TSON-SCHEMA] add unresolved type names, schema resolution failures, and related errors.
- **Validation errors** — Type and constraint violations. Defined by [TSON-TYPES] and [TSON-SCHEMA]; a data-format processor produces none.

**Canonical phrasing.** Normative rules throughout this series refer to errors using one of four canonical phrasings, each mapping unambiguously to a category:

| Category   | Canonical phrasing       |
|------------|--------------------------|
| Lexer      | "is a lexer error"       |
| Parser     | "is a parse error"       |
| Resolver   | "is a resolver error"    |
| Validation | "is a validation error"  |

Where a specification in this series uses RFC 2119 conformance language (MUST, MUST NOT) without an explicit category, the category falls out from context — the lexer/parser/resolver/validator that detects the violation determines the category per the layer responsibility above.

Implementations MUST include source position (line, column, and byte offset) in all error reports. Implementations SHOULD include expected-vs-found information where the error involves a token or structural mismatch. Implementations SHOULD attempt to continue processing after an error to report multiple issues in a single pass rather than stopping at the first failure.


## 10. ABNF Summary

The following grammar summarises the data format. It extends RFC 5234 ABNF with Unicode property references (`XID_Start`, `XID_Continue`, `Nd`, `Pattern_White_Space`, `Pattern_Syntax`). These are not standard ABNF terminals — they refer to Unicode character property sets defined in UAX #31 and the Unicode Character Database. String literals in double quotes match exact characters. Unicode code points are identified in comments using U+XXXX notation.

The lexer grammar in §10.1 is complete for the entire TSON series. The parser grammar in §10.2 covers data values only; the type-definition grammar activated by the `type` operation is defined in [TSON-SCHEMA].


### 10.1 Lexer

The lexer produces tokens from the input stream. Every token is a single character except for token types that consume multiple characters: quoted tokens, unquoted tokens, and compound tokens (map arrow, directive).

```
token-stream  = *( ws / quoted-token / unquoted-token
                 / structural-delimiter / absent-token
                 / map-arrow-token / directive-token
                 / special-token )

; ── Quoted tokens ──────────────────────────────────────────

quoted-token      = single-line-token / multi-line-token
single-line-token = DQUOTE *char DQUOTE
multi-line-token  = TDQUOTE line-term ml-content ws-indent TDQUOTE

TDQUOTE       = DQUOTE DQUOTE DQUOTE
line-term     = LF / CR LF / CR / NEL / LS / PS
ml-content    = *( ml-char / line-term )
ws-indent     = *( SP / HTAB )

; ── Single-line character rules ───────────────────────────

char          = unescaped
              / BSLASH ( DQUOTE / BSLASH / "/"
                       / "b" / "f" / "n" / "r" / "t" / "s"
                       / unicode-escape )

unicode-escape = "u" 4HEXDIG

unescaped     = ; U+0020 through U+10FFFF, excluding:
                ;   U+0022 (DQUOTE)
                ;   U+005C (BSLASH)
                ;   U+0085 (NEL)
                ;   U+2028 (LINE SEPARATOR)
                ;   U+2029 (PARAGRAPH SEPARATOR)

; ── Multi-line character rules ────────────────────────────

ml-char       = ml-unescaped
              / BSLASH ( DQUOTE / BSLASH / "/"
                       / "b" / "f" / "n" / "r" / "t" / "s"
                       / unicode-escape )

ml-unescaped  = ; U+0020 through U+10FFFF, excluding:
                ;   U+005C (BSLASH)
                ;   U+0085 (NEL)
                ;   U+2028 (LINE SEPARATOR)
                ;   U+2029 (PARAGRAPH SEPARATOR)
                ; DQUOTE is permitted — only """ closes the block

LF            = ; U+000A  LINE FEED
CR            = ; U+000D  CARRIAGE RETURN
NEL           = ; U+0085  NEXT LINE
LS            = ; U+2028  LINE SEPARATOR
PS            = ; U+2029  PARAGRAPH SEPARATOR

; ── Unquoted tokens (Unicode UAX #31) ─────────────────────

unquoted-token = unquoted-start *unquoted-char
unquoted-start = XID_Start / Nd / "-" / "+" / "."
               / "#" / "$" / "%" / "/"
               / "∞"                                ; U+221E INFINITY
unquoted-char  = XID_Continue / "-" / "+" / "."
               / "#" / "$" / "%" / "/"
               / "∞"                                ; U+221E INFINITY
               / "×"                                ; U+00D7 MULTIPLICATION SIGN
               / "⁺" / "⁻"                         ; U+207A, U+207B SUPERSCRIPT SIGNS

; ── Structural delimiters ─────────────────────────────────

structural-delimiter = "{" / "}" / "[" / "]"
                     / ":" / ","

; ── Absent sentinel ───────────────────────────────────────

absent-token = "_"

; ── Compound tokens (lookahead) ───────────────────────────

map-arrow-token    = "=" ">"
directive-token    = "!" "!"

; ── Special tokens ────────────────────────────────────────

special-token = special-char
special-char  = ; Pattern_Syntax characters not already handled:
                ;   not DQUOTE
                ;   not "-" / "+" / "." / "#" / "$" / "%" / "/"
                ;   not "∞" / "×" / "⁺" / "⁻"
                ;   not structural-delimiter
                ;   not "=" (lookahead: =>)
                ;
                ; Used in data values (this document):
                ;   !  type prefix / first char of !! directive
                ;   @  annotation prefix
                ;
                ; Reserved by the type-definition grammar [TSON-SCHEMA];
                ; parse errors in data values:
                ;   &  composition operator
                ;   <  open angle bracket (type arguments)
                ;   >  close angle bracket (type arguments)
                ;   ?  optional type suffix
                ;   ~  default modifier / constructor marker
                ;   =  fixed modifier; first char of => map arrow
                ;   |  choice variant separator
                ;   ;  array size specifier separator
                ;   (  choice open
                ;   )  choice close
                ;
                ; Unused (lexer rejects as unrecognised): * ^ ' ` \

; ── Whitespace ────────────────────────────────────────────

ws  = *Pattern_White_Space
ws1 = 1*Pattern_White_Space

separator = ws "," ws / ws1

; ── Other terminals ───────────────────────────────────────

DQUOTE        = ; U+0022  QUOTATION MARK
BSLASH        = ; U+005C  REVERSE SOLIDUS (backslash)
SP            = ; U+0020  SPACE
HTAB          = ; U+0009  HORIZONTAL TAB
HEXDIG        = ; 0-9 / A-F / a-f

; ── Unicode properties (normative references) ─────────────

; XID_Start          UAX #31 — letters and letter-like numbers
; XID_Continue       UAX #31 — XID_Start + digits + combining marks + connector punctuation
; Nd                 General Category "Decimal Number"
; Pattern_White_Space  UAX #31 — immutable whitespace (11 chars)
; Pattern_Syntax       UAX #31 — immutable syntax characters
```

**Lookahead priority:** When the lexer encounters `=`, it checks for `>` (map arrow) before emitting a single `=`. When it encounters `!`, it checks for `!!` before emitting a single `!`. When it encounters `"`, it checks for `"""` before entering single-line quoted mode.

**Normalization:** Implementations MUST normalize unquoted tokens to NFC (Unicode Normalization Form C). Quoted tokens are not normalized.


### 10.2 Data Grammar

The parser consumes the token stream and produces a document tree. The parser uses a single grammar with one value rule (`data-value`).

Several operator tokens must be adjacent to their operand (no intervening whitespace); ABNF concatenation does not express adjacency, so these rules are enforced by the parser via source-position comparison (§3.1). See §10.3 for the complete adjacency table. The map arrow `=>` is a compound token emitted as a single unit by the lexer and does not require parser-level adjacency checking.

```
document        = ws data-value ws

data-value      = value-directive-form / standard-form

value-directive-form = *annotation value-directive
standard-form        = *directive *annotation [type-ref-data] core-value

type-ref-data   = "!" unquoted-token

directive       = "!!" unquoted-token ":" data-value
value-directive = "!!" unquoted-token ws directive-body
               ; Colon after name → configuration directive
               ; Whitespace after name → value-producing directive
               ; directive-body is defined by the registered operation.
               ; This document registers no value-producing operations;
               ; [TSON-SCHEMA] registers the type operation.
               ; Configuration directives MUST NOT precede a
               ; value-producing directive — see §5.3.

core-value      = record-value / map-value / array-value
                / empty-brace / absent / token

record-value    = "{" ws field-value *( separator field-value ) ws "}"
field-value     = field-name ws ":" ws data-value

map-value       = "{" ws map-value-entry
                 *( separator map-value-entry ) ws "}"
map-value-entry = data-value ws "=>" ws data-value

array-value     = "[" ws [ data-value
                 *( separator data-value ) ] ws "]"

; ── Shared terminals ──────────────────────────────────────

annotation      = "@" unquoted-token [ ":" data-value ]
token           = unquoted-token / quoted-token
field-name      = token
empty-brace     = "{" ws "}"
absent          = "_"
```

In data values, a type reference is the simple `type-ref` form only (`!typename`). It does not accept the optional suffix (`type?`), array brackets (`[type; size]`), or type arguments (`name<...>`), which are constructs of the [TSON-SCHEMA] type-definition grammar.

Note: `{`, `}`, `[`, `]`, `:`, and `,` are structural delimiter tokens. `=>` and `!!` are compound tokens. `!` and `@` are single-character tokens matched by their literal character. All names are unquoted tokens — the lexer handles character classification, and semantic validation is a resolver concern.


### 10.3 Adjacency Rules

ABNF concatenation does not naturally express "no whitespace permitted here." The following operators have adjacency requirements enforced by the parser via source-position comparison (§3.1), not by the ABNF productions. An implementation that reads §10.1 and §10.2 in isolation will accept documents that violate these rules; the adjacency check is a separate parser pass that runs after lexing but before structural interpretation.

This table covers data-value operators. [TSON-SCHEMA] extends it for the operators of the type-definition grammar.

| Operator | Type | Context | Rule |
|---|---|---|---|
| `!` | prefix | type annotation | MUST be adjacent to the following unquoted-token (type name) |
| `!!` | prefix | any directive | MUST be adjacent to the following unquoted-token (directive name) |
| `@` | prefix | annotation | MUST be adjacent to the following unquoted-token (annotation name) |
| `:` | separator | record field | whitespace optional on both sides |
| `:` | separator | annotation value, directive value | MUST be adjacent to the preceding name (no whitespace before); whitespace optional after |
| (none) | trailing | annotation without value | at least one whitespace character MUST follow the annotation name |
| `=>` | separator | map entry | whitespace optional (compound token from lexer) |


## 11. References

### 11.1 Normative References

| Reference | Title | URL |
|-----------|-------|-----|
| RFC 2119 | Key words for use in RFCs to Indicate Requirement Levels | https://www.rfc-editor.org/rfc/rfc2119 |
| RFC 5234 | Augmented BNF for Syntax Specifications (ABNF) | https://www.rfc-editor.org/rfc/rfc5234 |
| RFC 8259 | The JavaScript Object Notation (JSON) Data Interchange Format | https://www.rfc-editor.org/rfc/rfc8259 |
| UAX #15 | Unicode Normalization Forms (NFC) | https://www.unicode.org/reports/tr15/ |
| UAX #31 | Unicode Identifier and Pattern Syntax | https://www.unicode.org/reports/tr31/ |
| UNF | Unicode Number Format | https://tson.io/1/unf.md?sha256=&lt;pinned at publication&gt; |

### 11.2 Series References

| Reference | Title | URL |
|-----------|-------|-----|
| TSON-TYPES | TSON Part 2: Type Vocabulary | &lt;pinned at publication&gt; |
| TSON-SCHEMA | TSON Part 3: Schemas and Directives | &lt;pinned at publication&gt; |

### 11.3 Informative References

| Reference | Title | URL |
|-----------|-------|-----|
| UTS #39 | Unicode Security Mechanisms | https://www.unicode.org/reports/tr39/ |


## Authors

- David Ryan
