---
title: "TSON Part 1: Data Format"
draft: "2026"
status: "Working Draft"
part: 1
description: >
  The lexer, structural grammar, absent sentinel, augmentation syntax (annotations, type
  annotations, directives), and base type resolution — everything needed to losslessly read
  and write schemaless TSON data.
---

# TSON Part 1: Data Format

## 2026 Revision 32

**Status:** Working revision. The 2026 revision series is subject to change without compatibility guarantees. When finalised, this specification will be published as **TSON version 1** and frozen (§1.2, principle 7); until then, revisions are released under the 2026 series.

**Series:** TSON Specification, Part 1 of 2

**Copyright:** © 2026 Litterat Pty Ltd. This document is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0): https://creativecommons.org/licenses/by-sa/4.0/


## 1. Introduction and Design Principles


### 1.1 Purpose and Scope


TSON (Tagged Structure Object Notation) is a Unicode text-based data interchange format that extends the concepts of JSON with richer structural types, optional annotations, optional type annotations, optional directives, and a layered type system that separates structural parsing from semantic interpretation.

This document defines the TSON **data format**: the lexer, the structural grammar, the absent sentinel, augmentation syntax, base type resolution, and the built-in type vocabulary. A processor implementing this document can losslessly read and write any schemaless TSON data document, typed or untyped. Schemas ([TSON-SCHEMA]) add declared structure and validation on top of this document; they are an upgrade in correctness, not a prerequisite.


### 1.2 Design Principles


1. **Structural simplicity** — The data grammar handles structure only. Value interpretation is deferred to base type resolution (§4) and, in higher parts, to the type system.

2. **Layered extensibility** — TSON operates in layers: lexer, structural parser, resolver, base type resolver, type vocabulary, and optionally the schema layer. Each layer adds capability without requiring the layers above.

3. **Unicode foundation** — Character classification, identifier rules, and normalization are defined in terms of Unicode character properties (UAX #31, UAX #15). Field names and values work in all scripts without quoting. All structural operators use ASCII characters.

4. **Minimal required syntax** — Commas and double quotes are optional where the structure is unambiguous.

5. **JSON compatibility** — Valid JSON is a subset of valid TSON at the structural level. TSON parsers SHOULD accept JSON documents.

6. **Locality** — A TSON data value is fully local. The format provides no data-level reuse mechanisms (no anchors, references, or merge operators): what appears at a position is the complete value.

7. **Permanent stability** — TSON version 1 is a permanent specification. The grammar and resolution rules are frozen at the version 1 release. There is no TSON 1.1 or TSON 2. New types are added through the type system, not through changes to this document. Errata may clarify ambiguities but MUST NOT change the grammar or the behaviour of conforming implementations. The permanence guarantee attaches to the version 1 release: 2026-series revisions of this document, including this one, may change anything.


### 1.3 The TSON Specification Series


The TSON specification is published in two parts:

- **Part 1: Data Format** (this document) — the lexer, the data grammar, base type resolution, and the built-in type vocabulary.
- **Part 2: Schema Modules and the Type System** [TSON-SCHEMA] — the module grammar, the type system, the schema chain, and the operations of the `schema`, `meta`, and `import` directives.

Each part adds capability without modifying the parts below it. The lexer defined in this document is complete: higher parts introduce no new tokens, no new lexer modes, and no changes to character classification.

[TSON-SCHEMA] defines a second document kind, the **schema module**, recognised by the header dispatch of §2.2. A module is a sibling grammar that shares this document's lexer and core value rules: its declaration grammar gives the reserved special tokens (§7.2.5) their meaning, and [TSON-SCHEMA] defines the operations of the directives (§3.3). None of that syntax appears in data documents: in the data grammar, a reserved special token is a parse error, and a `!!` token whose name is not followed by an adjacent `:` is a parse error.


### 1.4 Notation and Keywords


The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

The normative grammar for this document is §7.3–§7.6. Grammar excerpts appearing elsewhere in the body are illustrative.

Error categorisation — which processing layer rejects a violation and the canonical phrasing this series uses to mark it — is defined in §8.1.


### 1.5 Conformance


This series defines two conformance classes.

A **Class 1 processor** (data-format processor) implements the lexer (§7.2), the header and structural grammar (§2), the augmentation syntax (§3), base type resolution (§4), and the built-in type vocabulary (§5) as defined in this document. Such a processor:

- MUST parse every well-formed data document and reject every ill-formed one, reporting errors per §8.1;
- MUST recognise every annotation name in the built-in vocabulary and resolve annotated tokens per the named atom's contract (§5) — the vocabulary is implemented as a unit, so two conforming processors never disagree on whether a built-in name is meaningful;
- MUST preserve annotations, type annotations outside the vocabulary, and `schema` directives it does not act on (§3);
- MUST treat a directive token (`!!`) whose name is not followed by an adjacent `:` as a parse error (§1.3), and a directive name outside the closed positional set — or inside it but outside its position — as a parse error (§3.3);
- MUST reject a schema module — a document whose header contains `!!meta` (§2.2) — reporting it as a schema module per §8.1, not as a malformed data document;
- is NOT REQUIRED to implement the schema layer of [TSON-SCHEMA].

A **Class 2 processor** (schema-aware processor) implements [TSON-SCHEMA] in addition and MUST also conform to this document.


## 2. Documents and Structure


### 2.1 A Complete Example

A data document exercising the header, the three structural types, augmentation, the type vocabulary, and the absent sentinel:

```
!!id:"https://example.com/orders/1042.tn1"
!!schema:"https://example.com/order.tn1"
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
  total:   !decimal 199.90
  flags:   0b0110
  items: [
    { sku: A-100 qty: 2 price: 49.95 discount: .5 }
    { sku: B-205 qty: 1 price: 100.00 discount: _ }
  ]
  discounts: { @expires:"2026-12-31" WELCOME10 => "10%" loyalty => _ }
  shipping: !!schema:"https://example.com/address.tn1" !address {
    street: "12 Byron Rd"
    city:   London
  }
  notes: """
    Leave the parcel with the concierge.
    Gift wrap — no prices on the slip.
    """
}
```

The two header directives name the document and bind its schema, and the root value's `!order` names — in the data itself — which of that schema's types the document instantiates: a schema directive supplies a type vocabulary; a type annotation names the type a value conforms to. The field-level `!!schema` on `shipping` scopes a different schema to that one value, paired with `!address` naming the type within it, so schema scope changes are always visible in the data (§2.2, §3.3). Annotations attach metadata at three levels: `@doc` on the document, the valueless `@deprecated` on a field's value, and `@expires` on a map key (§3.1). Type references invoke the built-in vocabulary — `!uuid`, `!date`, and `!decimal` parse their tokens by atom contract (§3.2, §5) — while unannotated tokens resolve by the base rules of §4: `1042` and `0b0110` are integers, `.5` is a float, and `GOLD` and `A-100` are strings (as `2026-07-01` would be without its `!date`). The value is a record (§2.5) containing a nested record, an array of records (§2.7), and a map (§2.6). Tokens are quoted only where content demands it — `"ada@example.com"` contains a special character, `"12 Byron Rd"` a space, `"10%"` a character outside the unquoted profile (§7.1) — and `notes` is a multi-line token whose common indentation is stripped (§7.2.3, §2.4). The absent sentinel `_` marks a field and a map entry that are present with explicitly no value (§2.9).


### 2.2 Document and Header


A TSON document is the outermost structure: a **header** followed by a body. The header is a fixed sequence of directives — names, order, and cardinality are enforced by the grammar (§3.3, §7.4) — and it determines the document kind:

```
document   = ws [ id-directive ws ] ( data-doc / module-doc )

data-doc   = [ schema-directive ws ] data-value ws
module-doc = meta-directive ws *( import-directive ws ) schema-map ws
           ; schema-map — the module's annotated, braced declaration
           ; map — is defined normatively in [TSON-SCHEMA]

id-directive     = "!!" "id"     ":" quoted-token
schema-directive = "!!" "schema" ":" quoted-token
meta-directive   = "!!" "meta"   ":" quoted-token
import-directive = "!!" "import" ":" quoted-token
```

**Kind dispatch.** A parser consumes the `!!id` directive if present; if the next token is the directive `!!meta`, the document is a **schema module** — its header continues with any `!!import` directives, per the grammar above, and its body is a `schema-map`, defined normatively in [TSON-SCHEMA] — otherwise it is a **data document**, defined by this document. Classification therefore requires at most two directives of lookahead, no value parsing, and no backtracking. `!!id` is optional in the grammar for both kinds; publication and hash-pinning of a module require it ([TSON-SCHEMA]). A Class 1 processor rejects module documents with a categorized diagnostic (§1.5, §8.1).

Header directives are properties of the document, not of the body's root value. The root value of a data document is an ordinary data value: it carries annotations and a type annotation like any other value — a type annotation preceding the root core value identifies the expected type of the document's contained value — but never directives. A document with an empty header and no augmentation is simply a value.

Because a document contains exactly one value and directives do not produce content, a pure-metadata document uses the absent sentinel (§2.9) as its value:

```
!!id:"https://example.com/reserved.tn1"
_
```


#### 2.2.1 Identity and Content Addressing


The `!!id` directive names the document: its argument is a URI identifying the document as a published artifact. `!!id` is optional in the grammar for both document kinds (§2.2). Publishing a module — registering it for reference by other documents under its own name, or pinning it by content hash — requires it ([TSON-SCHEMA]); an id-less module is a development artifact. Identity gives diagnostics, imports, and registries a stable way to refer to the document independent of its storage location.

When the identifying URI carries a content hash (the convention is defined below), the document is **content-addressed** and immutable: any change to its bytes changes its identity. A content-addressed document MUST place the `id-directive` at the very start of the document, followed by a line terminator, and MUST be encoded in UTF-8. The hash input is every byte after that line terminator — the id line is excluded so that a document can state its own identity without the circularity of hashing its own hash. A document with no id line may still be hashed by a consumer; the hash input is then the entire document.

**The hash-parameter URI convention.** A content hash rides on the identifying URI as a query parameter named for its algorithm: `?sha256=<hash>`, with the value in lowercase hexadecimal at full length — a truncated hash is an error. `sha256` is the algorithm of this revision; future algorithms use their own parameter names. The hash parameter is **verification metadata, not identity**: a document's identity is its URI with recognized hash parameters removed, and two references are identical if and only if those stripped URIs are byte-for-byte identical. No URL normalization of any kind — case folding, path resolution, percent-encoding — is performed; identifiers are compared as literal strings. A consumer holding a hashed reference MUST verify the content against the declared hash before use and MUST NOT silently use mismatched content: a mismatch is an error, never a fallback.

Content addressing composes. A data document may reference its schema by hashed URI, that schema its meta-schema, and so on to the pre-loaded bootstrap ([TSON-SCHEMA]), so a consumer holding a single identifier can verify the integrity of a document together with its entire contract chain — a Merkle-style dependency graph in the manner of content-addressed stores. Ordering, consensus, and mutability policy are application concerns outside this series.


### 2.3 Values


TSON uses a single parser with two closely related value rules. A **scoped value** is an optional `schema` directive followed by a data value; it occurs in exactly two positions — record field values and map entry values. A **data value** is zero or more annotations, an optional type reference, and a core value; it occurs everywhere a value does.

```
scoped-value     = [ schema-directive ws ] data-value

schema-directive = "!!" "schema" ":" quoted-token

data-value       = *annotation [type-ref] core-value

type-ref         = "!" unquoted-token

core-value       = record / map / array
                 / empty-brace
                 / absent / token
```

A `schema` directive affects how the value that follows it is interpreted and scopes to the value it prefixes (§3.3). The data grammar is closed: no directive produces content, and the directive name set is fixed (§3.3).

There are three structural types for contained data; the document is the implicit outermost structure.

| Type   | ASCII Syntax | Separator | Purpose                          |
|--------|-------------|-----------|----------------------------------|
| Record | `{ : }`     | `:`       | Fixed named fields               |
| Map    | `{ => }`    | `=>`      | Variable key-value associations  |
| Array  | `[ ]`       | whitespace| Variable-length sequence         |

Field values and map entry values are scoped values; map keys and array elements are data values.


### 2.4 Tokens


A token is the atom of TSON data: **text plus form**. The text is the token's content after escape processing (and, for multi-line tokens, whitespace stripping); the form is one of three:

- **Unquoted** — `name`, `42`, `0xFF`, `2025-03-13`, `名前`, `v1.2.3`, `snake_case`, `A-100`. Available when every character is in the unquoted-token profile (§7.1).
- **Quoted** — `"has spaces"`, `"alice@example.com"`, `"42"`. Any single-line content, with escape sequences (§7.2.2).
- **Multi-line** — `"""` blocks for multi-line content with indentation stripping (§7.2.3).

**Form is not meaning.** Throughout this series, a token's form is consulted exactly once: by base type resolution (§4), where quoting is the author's way to say "the string `42`, not the number". Everywhere else only the text matters. Type contracts operate on text — `!decimal 10.2`, `!decimal "10.2"`, and `!decimal """10.2"""` are the same value (§5.2) — and identity is form-blind: `name` and `"name"` are the same field name (§2.5), and `Alice` and `"Alice"` are duplicate map keys (§2.6). Quoting is a lexical necessity, not a semantic signal: content containing characters outside the profile — spaces, colons (timestamps, URLs), `@` (email addresses), `/` (paths, networks, rationals), `%` and currency symbols — MUST be quoted; content inside it may be written in any form.

**Separators.** Within structural types, adjacent values MUST be separated by at least one whitespace character, a comma, or both: `[1 2 3]`, `[1,2,3]`, and `[1, 2, 3]` are equivalent. Zero-width separation is a parse error. Trailing separators are not permitted — `[1, 2, 3,]` and `{ x: 1, }` are parse errors — and the rule applies throughout the series. Structural delimiters inherently create token boundaries, so no separator is required between a delimiter and adjacent content: `{name:Alice}` is valid. Any non-zero amount of whitespace (including line breaks) between tokens is equivalent to any other; indentation is not significant. Within quoted tokens, whitespace is content, subject to each form's character rules (§7.2.2, §7.2.3).

TSON does not define a comment syntax. Metadata is expressed through annotations (`@`), which are preserved by the parser and available to consuming applications.


### 2.5 Record


A record is an ordered collection of named fields enclosed in curly braces. Field names are separated from values by a colon. Fields are separated by whitespace or an optional comma.

```
record     = "{" ws field *( separator field ) ws "}"
field      = field-name ws ":" ws scoped-value
field-name = token                          ; unquoted or quoted
```

A field's value is a scoped value, so a `schema` directive may prefix it, paired with a type annotation naming a type from the scoped schema:

```
{ database: !!schema:"https://example.com/db-config.tn1" !db_config { host: db1 port: 5432 } }
```

Field names are bare tokens: directives, annotations, and type annotations MUST NOT precede a field name. Metadata concerning a field is expressed as annotations on the field's value — `{ name: @deprecated Alice }` — which attach to the value per §3.1.

A record MUST contain at least one field. An empty `{}` is parsed as an `empty-brace` (§2.8).

Field names within a record SHOULD be unique. If duplicate field names are present, the last value wins. Two field names are identical if they produce the same NFC-normalized string after escape processing — `name` and `"name"` are the same field name.


### 2.6 Map


A map is a collection of key-value associations enclosed in curly braces. Keys are separated from values by the arrow operator `=>`. Entries are separated by whitespace or an optional comma.

```
map       = "{" ws map-entry *( separator map-entry ) ws "}"
map-entry = data-value ws "=>" ws scoped-value
```

Map keys are data values — they may carry annotations and a type reference but not directives. Keys are not restricted to strings.

Duplicate keys SHOULD NOT be present. If duplicate keys are present, the last value wins. The parser detects **textually identical** keys: scalar keys are identical if they produce the same NFC-normalized string after escape processing (`Alice` and `"Alice"` are duplicates; `1` and `1.0` are not); compound keys are identical if they have the same structure with textually identical elements at every position. The parser SHOULD warn when textually identical keys are detected. Type-aware key equality requires declared type information ([TSON-SCHEMA]).

A map MUST contain at least one entry. An empty `{}` is parsed as an `empty-brace` (§2.8).


### 2.7 Array


An array is an ordered, variable-length collection of values enclosed in square brackets. Values are separated by whitespace or an optional comma.

```
array = "[" ws [ data-value *( separator data-value ) ] ws "]"
```


### 2.8 Brace Disambiguation and Empty Braces


The parser determines what a curly-brace structure is by its content:

1. If the opening brace is followed by `}` (with only whitespace between), the structure is an **empty-brace**.
2. Otherwise, the parser consumes one data-value and inspects the next token:
   - `:` → the structure is a **record**. The consumed data-value MUST be a bare token — carrying no annotations and no type reference, with a core value that is a token — and becomes the first field's name. Anything else is a parse error: field names are bare tokens (§2.5).
   - `=>` → the structure is a **map**. The consumed data-value becomes the first entry's key.
   - anything else → parse error. A value inside curly braces MUST be followed by `:` (record) or `=>` (map).

The bare-token check applies only to the first field name; once the structure is known to be a record, subsequent fields are parsed by the `field` production, which admits only a token in name position.

**Empty braces** are deferred to the resolver. In the absence of declared type information, an empty-brace resolves to an empty record. When a higher part supplies an expected type ([TSON-SCHEMA]), it resolves to the empty container of that type.

```
empty-brace = "{" ws "}"
```


### 2.9 The Absent Sentinel


The underscore token `_` represents an explicitly absent value, distinct from any typed value including the base type null (§4.1).

```
absent = "_"
```

The absent sentinel is a structural concept, not a type. The interpretation of absence (null, unset, default, removal) is determined by the consuming application or by higher parts of this series.

Because `absent` is a core-value alternative, `_` may occupy any data-value position: record field values, map entry values, array elements, and the document's top-level value. The single restriction is that the absent sentinel MUST NOT appear as a map key — a resolver-layer constraint, not a grammar constraint: the `map-entry` production accepts any value in key position, and the resolver rejects absent keys.

A field or entry set to `_` is **present with an absent value** — distinct from not appearing at all. In arrays, absent elements occupy positional slots: `[1 _ 3]` has three elements. Higher parts that impose size or element constraints count all slots, and MAY restrict whether absence is permitted at element positions ([TSON-SCHEMA]).

Whether absent values at optional positions are encoded on the wire using `_` or omitted entirely is a serialisation context concern, not a document property. Implementations SHOULD provide a mechanism for controlling this at the encoder level.


## 3. Augmentation


Augmentation adds metadata, type information, and directives to values without modifying the structural grammar. All augmentation is optional and is expressed within the value rules (§2.3).

TSON supports three augmentation features: configuration directives (`!!`), annotations (`@`), and type annotations (`!name`). Directives are permitted only in the document header (§2.2) and scoped-value positions (§2.3); annotations and type annotations are available on every data value. Directives precede annotations in the grammar; augmentation attaches to the value that follows it.

Annotations are ordered in the token stream, and implementations MUST preserve their order.


### 3.1 Annotations


An annotation attaches metadata to a value without modifying the value itself: the special token `@` immediately followed (without whitespace) by an unquoted token forming the annotation name, optionally followed by `:` and a data value.

```
annotation = "@" unquoted-token [ ":" data-value ]
```

**Adjacency and termination.** The `:` (when present) MUST be adjacent to the annotation name. When the `:` is absent, at least one whitespace character MUST follow the annotation name. These rules make annotation boundaries lexically determined by the single character after the name.

**Value scope.** When `:` is present, the annotation's value is exactly one `data-value`, which terminates at the end of its core value — and which may itself carry annotations. In `@a:@b:val target`, `@a`'s value is the data-value `@b:val target`: the core value `target`, annotated by `@b`, whose own value is `val`. Contrast `@a:@b val target` (no colon on `@b`): there `@b` is a valueless annotation on the core value `val`, so `@a`'s value is `@b val` and `target` belongs to the surrounding context. An annotation is never itself a value: `{ x: @a:@b:val }` is a parse error, because `@a`'s data-value still requires a core value after the annotation `@b:val`. Annotation values are always data values — concrete values, not type definitions.

Annotations precede the value they annotate — including either side of a map entry, where annotations on the key annotate the key and annotations on the value annotate the value. The parser preserves annotations in their authored positions.

**Multiplicity.** An annotation name MAY appear any number of times on a single value; all occurrences are preserved in source order.

At the data-format layer, annotations are preserved, ordered metadata with no further interpretation; [TSON-SCHEMA] defines their validation. A processor conforming only to this document MUST preserve annotations without validating them.


### 3.2 Type Annotations


A type annotation associates a named type with the following value: the prefix operator `!` immediately followed (without whitespace) by an unquoted token forming the type name.

```
type-ref = "!" unquoted-token
```

At least one whitespace character MUST separate the type name from a following token; no separator is required before a structural delimiter. `!person { name: Alice }` and `!person{name:Alice}` are both valid; `!int32"5"` is a parse error — write `!int32 "5"`.

At the document level, a type annotation identifies the expected type of the document's contained value; within structural types, it identifies the type of the value that follows. A type annotation applies to the value, not its contents: `!person { name: Alice }` tags the record, not its fields.

In schemaless processing, the built-in type vocabulary (§5) resolves a fixed set of annotation names; [TSON-SCHEMA] defines resolution against declared schemas. A processor MUST preserve type annotations it does not resolve as uninterpreted markers attached to their values and MUST NOT reject a document because a type annotation is unresolved.

Type expression syntax is not available in data values: array brackets, type arguments, and the optional `?` suffix exist only within the [TSON-SCHEMA] type-definition grammar, and their appearance after `!` in a data value is a parse error.


### 3.3 Directives


A configuration directive provides pre-interpretation configuration: the `!!` compound token followed by a name, an adjacent `:`, and a quoted-token argument. Every directive in the series shares this lexical shape:

```
"!!" name ":" quoted-token
```

The `:` MUST be adjacent to the directive name. The argument is a single quoted token; in every directive of this series it is a URI or file reference (RFC 3986).

Directives appear only in the document header (§2.2) and in scoped-value positions (§2.3): record field values and map entry values. A directive scopes to the document or value it prefixes. Directives are not permitted before array elements, map keys, field names, or annotation values.

Unlike an annotation, a directive is not strippable metadata: it affects how the value is interpreted. A Class 1 processor does not act on `schema` bindings — it preserves them for the consuming application — but it enforces directive grammar in full.

**Closed positional name set.** Directive names are fixed by the grammar. Each name is legal in exactly one kind of position, and order and cardinality are enforced by the productions (§2.2, §7.4) rather than by prose. Four names exist in the series:

| Name | Kind | Placement | Argument | Operation |
|---|---|---|---|---|
| `id` | both | Header; first line; optional in the grammar — publishing a module requires it ([TSON-SCHEMA]) | URI | Names the document (§2.2.1). The id line is excluded from content hashing. |
| `schema` | data | Header, at most once; field values; map entry values | URI | Binds the schema governing the document or value in scope. |
| `meta` | module | Module header; exactly once, first directive after the optional `id` | URI | Binds the meta-schema governing the module's declarations. |
| `import` | module | Module header; after `meta`; repeatable | URI | Imports the named module's declarations. |

Placements for all four names are enforced by this document's grammar (§2.2, §7.4); the `id` operation is defined in §2.2.1; the `schema`, `meta`, and `import` operations — and the module body's `schema-map` production — are normative in [TSON-SCHEMA]. This document uses `meta` only for kind dispatch (§2.2).

Any other directive name, and any of these names outside its placement, is a parse error. There is no unknown-directive category and no directive extension mechanism: new capability arrives through the type system, not through the grammar (§1.2). Directive names on the wire are always the canonical names above; localized presentation is a tooling concern outside this series.

**No parse-time I/O.** Directive arguments are references; a processor conforming to this document never dereferences them. Parsing a TSON data document performs no I/O — the document's structural meaning is fully determined by its bytes (§9.3).


## 4. Base Type Resolution


Base type resolution applies **only when no declared type information is in scope** and the token carries no built-in type annotation — a built-in annotation overrides base resolution for its token (§5). When a higher part supplies declared type information ([TSON-SCHEMA]), base type resolution does NOT apply at typed positions; each declared atom type owns its own parsing contract. The tokens `true`, `false`, and `null` have special status only under base type resolution. Resolution applies to **data values only**: field names and map keys are text, never resolved — in `{ 007: 007 }` the key is the name `007` by definition, while the value is a string by fallthrough (leading zeros fail the `integer` production, §4.3), and `07` and `7` are distinct keys because key identity is textual (§2.4).


### 4.1 Null


The token `null` (case-sensitive, lowercase only) resolves to the null value. `null` is distinct from the absent sentinel `_`: null is a value that can be stored and transmitted; `_` indicates that no value occupies a position.


### 4.2 Boolean


The tokens `true` and `false` (case-sensitive, lowercase only) resolve to boolean values. No other representations (yes, no, on, off, True, FALSE) are recognised as boolean.


### 4.3 Numbers


An unquoted token resolves to a numeric value if and only if its complete text matches the `number` production (§7.6). Base type resolution recognises four numeric forms — special values, based integers, floats, and integers — which are pairwise disjoint; a token matching none falls through to string (§4.4).

- **Special values** — `.nan` and `.inf`/`.infinity` (infinity with optional sign). Lowercase only.
- **Floats** — signed decimal with fraction and/or exponent (`1.5`, `.5`, `6.02e23`, `-2e-3`). Digits MUST follow a decimal point; the integer part MAY be omitted. `5.` is not a number. The signed zeros `+0.0` and `-0.0` are floats whose sign MUST be preserved.
- **Integers** — signed decimal integers. Leading zeros MUST NOT be used except for the single digit zero.
- **Based integers** — hexadecimal, octal, and binary integers via the lowercase prefixes `0x`, `0o`, `0b` (`0xFF`, `0o755`, `0b1010`), with optional sign; hex digits may be either case.

These are JSON's numeric forms extended by an optional leading `+`, leading-dot fractions (`.5`), underscore digit separators (`1_000_000` — permitted only between digits, enforced by the digit-sequence productions), arbitrary precision, based integers, and the special values. Richer numeric forms — rationals (`2/3`), complex numbers (`3+4i`), and hexadecimal floats — are **not** recognised by base type resolution; the built-in type vocabulary provides typed access to them under explicit annotation (§5.6). Complex and hex-float tokens are expressible unquoted and resolve as strings; rational content contains `/`, which is outside the unquoted profile (§7.1), so rational values are always quoted. A consequence of based-integer recognition: hex-shaped identifier data (a blockchain address such as `0x71C7656EC7ab88b098defB751B7401B5f6d8976F`) resolves as a number; authors who intend such a token as a string MUST quote it.

Numeric values are arbitrary precision; how values map to host-language numeric types is an implementation concern (see §9.1 for literal-length limits). Non-ASCII digit sequences do not match the number grammar and fall through to string.

**Equivalence and preservation.** Distinct representations of the same value — `255`/`0xFF`, `6.02e23`/`602e21`, `.5`/`0.5`, `1_000`/`1000`, `+42`/`42` — MUST resolve to equal values. Implementations that re-emit documents SHOULD preserve the representation as written.


### 4.4 String


Any quoted token resolves to a string value. Any unquoted token that does not match null, boolean, or the `number` production resolves to a string value — including the single-character tokens `-`, `+`, and `.`, near-miss numeric forms such as `007` and `1.2.3` (leading zeros and second dots fail the number grammar), and the complex form `3+4i` (§4.3). There are no exceptions: every string-resolving token is one whose complete text failed the null, boolean, and number rules.


### 4.5 Resolution Order


When no declared type information is in scope, the parser MUST attempt resolution in this order:

1. null — exact keyword match
2. boolean — exact keyword match (`true`, `false`)
3. number — full-token match against the number grammar (§7.6)
4. string — fallback for everything else

To represent the string `"null"` in schemaless TSON, use quotes.


## 5. Built-in Type Vocabulary


The built-in type vocabulary is a fixed set of type annotations that extend base type resolution with binary, temporal, identifier, network, and precision-constrained numeric types, giving schemaless documents access to common typed values without a schema. This section assigns meaning to the annotation names listed below; it introduces no lexical or grammatical changes — every construct it interprets is a token the grammar already parses.


### 5.1 Applicability


The vocabulary applies **only in schemaless processing** — when no declared schema scope is active for the value being resolved. A built-in annotation overrides base type resolution for the annotated token: the token is parsed by the named atom's contract (§5.2) instead of the §4 resolution order. Type annotations whose names are not in the vocabulary are preserved as uninterpreted markers (§3.2).

When a schema is in scope ([TSON-SCHEMA]), the vocabulary does not apply: all type annotations resolve through the schema's type-name namespace, and schemas wanting these names import the core type library, whose entries denote the same parsing contracts defined here.

**Annotation names are case-sensitive.** Only the exact names listed below are recognised; `!UUID` is not a built-in annotation.

**Scalar values only.** Built-in annotations apply to scalar values. A built-in annotation on a record, map, or array value is a resolver error. Element types are not expressed on a container; annotate elements individually: `[!int32 1 !int32 2]`.


### 5.2 The Atom Parsing Model


Each atom owns a **parsing contract**: which tokens it accepts, and what host value results. The contract applies to the token's content after escape processing; whether quoting is *required* is a lexical property of the content, not of the atom (§2.4). Content expressible unquoted may be written either way: `!date 2025-03-13` and `!date "2025-03-13"` are equivalent.

Host-value entries in the tables are informative; the precise representation is implementation-defined, but implementations MUST preserve the parsed value's information content (a `uuid` round-trips to the same 128 bits; a `decimal` preserves its digits).

**Parsing and validation are distinct.** Parsing takes a token to a host value; validation checks the parsed value against the atom's constraints. `twelve` under `!int32` is a parse error — the integer grammar cannot interpret it; `9999999999` under `!int32` parses as an integer and then fails validation against the 32-bit range. A token the atom's grammar rejects "is a parse error"; a parsed value violating the atom's range "is a validation error" (§8.1). Within this vocabulary, only the numeric atoms carry range constraints; the other atoms are pure format checks.


### 5.3 Binary Types


| Annotation   | Format                          | Host value |
|--------------|---------------------------------|------------|
| `!base64`    | Base64 (RFC 4648 §4)            | byte array |
| `!base64url` | URL-safe base64 (RFC 4648 §5)   | byte array |
| `!base32`    | Base32 (RFC 4648 §6)            | byte array |
| `!hex`       | Base16 / hex (RFC 4648 §8)      | byte array |

Each encoding is a distinct type; there is no generic `!binary` annotation. The host value is the decoded byte sequence; a token that is not a valid encoding under the named scheme is a parse error. Binary values SHOULD always be quoted.


### 5.4 Temporal Types


| Annotation  | Format               | Host value |
|-------------|----------------------|------------|
| `!date`     | RFC 3339 `full-date` | date       |
| `!datetime` | RFC 3339 `date-time` | datetime   |
| `!time`     | RFC 3339 `full-time` | time       |
| `!duration` | ISO 8601 duration (`PnYnMnDTnHnMnS`) | duration |

A token that does not match the named format is a parse error. `date-time` and `full-time` values contain colons and MUST be quoted (§2.4); `full-date` values are valid unquoted.


### 5.5 Identifier and Network Types


| Annotation | Format | Host value |
|------------|--------|------------|
| `!uuid`    | RFC 9562 | UUID |
| `!uri`     | RFC 3986 | URI |
| `!ipv4`    | IPv4 dotted-quad (RFC 3986 `IPv4address`) | IPv4 address |
| `!ipv6`    | IPv6 text representation (RFC 4291 §2.2) | IPv6 address |
| `!cidr4`   | IPv4 address `/` prefix length 0–32 (RFC 4632) | network |
| `!cidr6`   | IPv6 address `/` prefix length 0–128 | network |
| `!mac`     | EUI-48, colon- or hyphen-separated hex octets | MAC address |

A token that does not match the named format is a parse error; a CIDR prefix length outside the address family's range is a validation error, as is an address whose host bits are nonzero under the stated prefix length — the host value is a network, and accept-and-mask would be lossy (§5.2). IPv6 zone identifiers (`fe80::1%eth0`, RFC 4007) are host-local and are not part of the `ipv6` or `cidr6` contracts. URIs with a scheme and IPv6 addresses contain colons, and CIDR values contain `/`; all of these MUST be quoted (§2.4). MAC addresses in the colon-separated form MUST be quoted; the hyphen-separated form is expressible unquoted.


### 5.6 Numeric Types


The numeric atoms are defined against the productions of the number grammar (§7.6). Each atom accepts the listed forms (parse), and where a range is listed, the parsed value MUST fit it (validation).

| Annotation | Accepted forms (§7.6) | Constraint | Host value |
|------------|----------------------|------------|------------|
| `!int32`   | `integer` / `based-integer` | 32-bit signed range | 32-bit integer |
| `!int64`   | `integer` / `based-integer` | 64-bit signed range | 64-bit integer |
| `!uint32`  | `integer` / `based-integer`, no sign | 32-bit unsigned range | 32-bit unsigned |
| `!uint64`  | `integer` / `based-integer`, no sign | 64-bit unsigned range | 64-bit unsigned |
| `!decimal` | `integer` / `float` | none (exact decimal) | decimal type |
| `!float32` | `float` / `hex-float` / `special-value` | IEEE 754 single precision | 32-bit float |
| `!float64` | `float` / `hex-float` / `special-value` | IEEE 754 double precision | 64-bit float |
| `!rational` | `rational` | denominator nonzero (by grammar) | rational |
| `!complex` | `complex` / `float` / `integer` | none | complex number |

The integer atoms accept based forms — `!uint32 0xFF00_0000` is the idiomatic range-checked bitmask — and the annotation is the only schemaless route to the rational, complex, and hex-float forms: complex and hex-float tokens resolve as strings under base resolution (§4.3), and rational content contains `/`, so rational values are always quoted (`!rational "2/3"`). The float atoms give the special values IEEE 754-2019 semantics. NaN payloads are not part of a value's information content: every NaN, however produced, denotes the canonical quiet NaN, so preservation (§5.2) holds by definition; applications that need payload bits should carry them as integers or binary values. Unannotated numeric tokens resolve through base type resolution alone.


## 6. TSON and JSON


TSON is a superset of JSON with two deliberate character-level exceptions, both confined to string content. Every valid JSON document outside those exceptions is a valid TSON document, and the extensions are additive — no JSON construct changes meaning under TSON.

**The two exceptions.** Both are corollaries of one principle: TSON strings are well-formed Unicode scalar sequences, and single-line quoted tokens are genuinely single-line.

1. RFC 8259 permits the line terminators NEL (U+0085), LINE SEPARATOR (U+2028), and PARAGRAPH SEPARATOR (U+2029) unescaped inside string literals — and emitters, including `JSON.stringify`, output them raw when they occur in string data. TSON excludes all three from single-line tokens; they MUST be written as escapes (`\u0085`, `\u2028`, `\u2029`) (§7.2.2). These are the same characters that made raw JSON famously unsafe to embed in JavaScript and HTML. A single escaping pass converts any affected JSON document into TSON with identical meaning.
2. RFC 8259 leaves surrogate pairing unenforced, so `"\uD800"` alone is grammatically valid JSON — with host-dependent results ranging from exceptions to ill-formed strings. TSON rejects unpaired surrogate escapes as lexer errors (§7.2.2), as ECMAScript's well-formed `JSON.stringify` (ES2019) rejects producing the raw equivalent. This is not a representational gap: a lone surrogate encodes data that no Unicode string can hold, and TSON refuses it loudly rather than variably.

A TSON parser SHOULD accept any valid JSON document. JSON documents carry no TSON type information, so base type resolution (§4) applies:

- JSON objects are records; JSON arrays are arrays.
- JSON strings are quoted tokens resolved as strings.
- JSON numbers are unquoted tokens resolved as integers or floats (§4.3).
- JSON `true`, `false`, and `null` resolve as boolean and null. JSON `null` maps to the TSON null base type, not to the absent sentinel.

The comma separators and quoted keys required by JSON are accepted by the TSON grammar, as is a leading byte order mark (§7.1). TSON deliberately declines two extensions common in JSON supersets: there is no comment syntax (§2.4) and there are no anchors, references, or merge operators (§1.2, principle 6).


## 7. Grammar Reference


This section is the sole normative grammar for the data format. It extends RFC 5234 ABNF with Unicode property references (`XID_Start`, `XID_Continue`, `Nd`, `Pattern_White_Space`, `Pattern_Syntax`) — character property sets defined in UAX #31 and the Unicode Character Database. String literals in double quotes match exact characters; code points are identified in comments using U+XXXX notation.

The lexer grammar in §7.3 is complete for the entire TSON series. The parser grammar in §7.4 covers data values only (§1.3).


### 7.1 Encoding, Normalization, and Media Type


TSON is a Unicode data format. The grammar is defined in terms of Unicode character properties, not byte sequences:

| Property / Spec       | Source  | Used for                          |
|-----------------------|---------|-----------------------------------|
| XID_Start             | UAX #31 | Unquoted token start characters   |
| XID_Continue          | UAX #31 | Unquoted token continuation       |
| Nd                    | UCD     | Decimal digits in all scripts     |
| Pattern_White_Space   | UAX #31 | Whitespace / token separation     |
| Pattern_Syntax        | UAX #31 | Special tokens / syntax operators |
| NFC                   | UAX #15 | Unquoted token normalization      |

`XID_Start`, `XID_Continue`, `Nd`, `Pattern_White_Space`, and `Pattern_Syntax` are stable — the Unicode Standard guarantees that characters are never removed from these sets — and `XID_Start`/`XID_Continue` are stable under NFC normalization, so normalizing a valid token always produces a valid token. Implementations MUST support these properties for their declared Unicode version and SHOULD document which Unicode version they support.

**UAX #31 profile.** TSON's unquoted tokens are a declared profile of Unicode identifiers per UAX #31 requirement R1:

```
Start    = XID_Start ∪ Nd ∪ { - + . }
Continue = XID_Continue ∪ { - + . }
```

The three extension characters are all `Pattern_Syntax` and therefore immutable, so the profile itself is frozen. The property-based components grow with the Unicode version: new scripts enter `XID_Start`/`XID_Continue` and new digits enter `Nd` as they are encoded. Growth is monotone — characters that were lexer errors become token characters, and valid documents remain valid under later versions. Underscore (U+005F) is in `XID_Continue` but not `XID_Start`: it may appear within or at the end of a token (`my_type`) but cannot start one. Token-initial underscore is reserved to the format and occupied by the absent sentinel `_` (§2.9); names with a leading underscore (`_id`) MUST be quoted.

**Rationale.** The profile is the UAX #31 identifier profile plus exactly what base type resolution consumes: `Nd` joins Start because scalar tokens, unlike identifiers, include numbers; `-` and `+` are the sign and exponent-sign characters; `.` is the decimal point and the leading character of `.inf`, `.infinity`, and `.nan`. Every extension character is required by a production of the number grammar (§7.6); none is speculative. Characters are excluded whenever the kinds of content that need them can be covered only partially — paths (`~`, `\`, spaces), URIs (`:`), monetary amounts (currency symbols, grouping separators, spaces), rationals and networks (`/`), percentages (`%`). A kind the profile cannot cover totally is excluded entirely, so that its quoting rule is *always*, never a per-character scan.

**Quoting by kind.** The profile makes the quoting decision a property of what a value *is*, not of the characters it happens to contain. Never quoted: numbers, `null`/`true`/`false`, identifier- and enum-like names, `full-date` temporals, UUIDs, hyphen-form MAC addresses, version strings. Always quoted: anything containing whitespace or prose, timestamps and URIs (colons), email addresses (`@`), paths, rationals, and CIDR networks (`/`), IPv6 addresses (colons), monetary amounts and percentages, and leading-underscore names. A generator's decision procedure is two clauses: quote if any character falls outside the profile, and quote if the bare token would resolve to something other than the intended string (`"true"`, `"42"`, `"0x71C7…"`, §4).

The format-control characters ZWNJ (U+200C) and ZWJ (U+200D) are deliberately excluded from the profile, although UAX #31 permits them in restricted contexts and some languages admit them. They are invisible, which makes them confusable and spoofing surface (§9.4); names whose orthography requires them MUST be quoted.

TSON documents are encoded in Unicode. UTF-8 is RECOMMENDED; UTF-16 and UTF-32 are permitted. Content-addressed documents MUST be UTF-8 (§2.2.1).

**Byte order mark.** A single U+FEFF at the very start of a document is an encoding artifact: decoders MUST accept it and discard it before lexing — it is not whitespace and is not part of any token. U+FEFF anywhere else outside a quoted token is an unrecognised character and a lexer error (§7.2.4); within a quoted token it is ordinary content. Encoders using UTF-8 SHOULD NOT emit a byte order mark; for UTF-16 and UTF-32 the byte order mark belongs to the encoding scheme and is consumed by decoding.

TSON documents use the media type `application/tson` (intended for IANA registration). Version information is not encoded in the media type; if disambiguation is needed in HTTP contexts, implementations MAY use `application/tson; version=1`. TSON version 1 uses the file extension **`.tn1`** for all documents; future major versions use correspondingly numbered extensions (`.tn2`, …). Whether a `.tn1` file is a data document or a schema module is determined by its header (§2.2): classification requires at most two directives of lookahead and no value parsing, so streams, previews, and content sniffers can classify a document from its opening bytes.


### 7.2 The Lexer


The lexer produces a stream of tokens from the input, classifying each token by its start character:

1. **Whitespace** — Characters with the `Pattern_White_Space` property are consumed and not emitted as tokens. The set is immutable: U+0009 (TAB), U+000A (LF), U+000B (VT), U+000C (FF), U+000D (CR), U+0020 (SPACE), U+0085 (NEL), U+200E (LRM), U+200F (RLM), U+2028 (LINE SEPARATOR), U+2029 (PARAGRAPH SEPARATOR).

2. **Quoted token** — `"` begins a quoted token. If the next two characters are also `"`, the lexer enters multi-line mode; otherwise single-line mode. This is the first of the lexer's three lookahead rules.

3. **Unquoted token** — A character in the unquoted start set of the profile (§7.1) begins an unquoted token; the lexer consumes characters while they match the continuation set.

4. **Structural delimiter** — One of `{` `}` `[` `]` `:` `,` is emitted as a single-character structural delimiter token. The colon is the field separator in records and in annotation and directive arguments; the comma is the optional value separator. Parentheses `(` `)` are **not** structural delimiters — they are special tokens (§7.2.5).

5. **Absent sentinel** — The underscore `_` is emitted as a single-character absent token.

6. **Compound special token** — `=` and `!` trigger lookahead **before** unquoted token mode or special token mode is attempted (§7.2.4).

7. **Special token** — One of the twelve characters `!` `@` `&` `<` `>` `?` `~` `=` `|` `;` `(` `)` is emitted as a single-character special token. This set is closed (§7.2.5).

8. **Unrecognised character** — Any other character is a lexer error (§7.2.6).

Every input character falls into exactly one category. The lookahead rules (quotation mark, equals sign, exclamation mark) are the only cases where the lexer examines more than one character to determine a token.

**Token positions.** Every token carries its source position. The parser uses position adjacency to enforce no-whitespace rules: the prefix operators `!`, `@`, and `!!` MUST be adjacent to their operand. See §7.5.


#### 7.2.1 Normalization


Unquoted tokens MUST be in Unicode Normalization Form C (NFC) in the source text: an unquoted token that is not NFC-normalized is a lexer error, and encoders MUST emit unquoted tokens in NFC. The lexer never alters token text — a document's bytes are authoritative, so byte identity and semantic identity coincide for unquoted tokens, which content-hash references depend on. Quoted tokens are not subject to this requirement — they preserve their exact Unicode content.

**Identifier positions normalise at the resolver layer.** Quoted tokens that occupy identifier positions — record field names, and any position a higher part designates as an identifier — are NFC-normalised by the resolver before identity comparison. String-typed positions are not normalised. Consequently, `"café"` (decomposed) and `"café"` (precomposed) collide as duplicate field names, while two string *values* with the same difference remain distinct strings.


#### 7.2.2 Quoted Tokens and Escape Processing


A single-line quoted token is delimited by `"` and may contain any character from U+0020 upward except the quotation mark, the backslash, and the line terminators NEL (U+0085), LINE SEPARATOR (U+2028), and PARAGRAPH SEPARATOR (U+2029); these three MAY be included via their escape sequences. A literal TAB is below U+0020 and MUST be written as `\t`, matching JSON. Multi-line tokens differ: they admit literal tabs (§7.2.3). The single-character escapes are:

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

The `\s` escape is a TSON extension whose primary use is preserving intentional trailing whitespace in multi-line tokens (§7.2.3). The `\uXXXX` form encodes any code point using four hexadecimal digits; supplementary characters above U+FFFF use a surrogate pair, with requirements that RFC 8259 leaves ambiguous:

- A high surrogate escape MUST be immediately followed by a low surrogate escape; a high surrogate not followed by a low surrogate is a lexer error.
- A low surrogate escape MUST be immediately preceded by a high surrogate escape; a lone low surrogate is a lexer error.
- The resulting code point MUST be a valid Unicode scalar value; surrogate code points (U+D800–U+DFFF) MUST NOT appear in the decoded token.

Implementations MUST reject documents containing unpaired surrogate escapes rather than silently producing ill-formed strings.


#### 7.2.3 Multi-line Tokens


Multi-line tokens use triple double quotation marks as delimiters. The opening delimiter is `"""` followed by optional spaces and tabs and a line terminator; the closing delimiter is `"""` on its own line, preceded only by optional whitespace.

A single `"` or `""` inside a multi-line token is literal content; only `"""` on its own line closes the block. To include a literal `"""` sequence, escape at least one quotation mark: `\"""`. The same escape sequences apply as in single-line tokens. Unlike single-line tokens, multi-line content admits literal TAB characters, so tab-indented text can be embedded without escaping.

Multi-line tokens follow these whitespace rules:

1. The content begins on the line following the opening delimiter. Any non-whitespace characters on the same line as the opening delimiter MUST NOT appear; trailing spaces and tabs after the opening delimiter are permitted and ignored.
2. Common leading whitespace is removed. The common prefix is the longest sequence of spaces and tabs that begins every **non-blank** content line and the closing delimiter line, compared **character by character** — a tab never matches a space, and no tab width is assumed. Blank lines do not participate in the calculation. The prefix is then removed from the start of every line. Lines whose indentation mixes tabs and spaces inconsistently simply shorten the common prefix; this is never an error.
3. Trailing spaces and tabs on each line are stripped. To preserve intentional trailing whitespace, use an escape at the end of the line (`\s`, `\u0020`, `\t`).
4. The line terminator before the closing delimiter is not included in the token value.
5. Escape sequences are processed after whitespace stripping.


#### 7.2.4 Compound Token Lookahead Rules


**Map arrow.** On `=` at a token boundary, the lexer checks for `>`; if present, both are consumed and emitted as the single map arrow token `=>`. Otherwise `=` is emitted as a special token.

**Directive.** On `!` at a token boundary, the lexer checks for a second `!`; if present, both are consumed and emitted as the single directive token `!!`. Otherwise `!` is emitted as a special token (the type prefix).

```
map-arrow-token = "=" ">"
directive-token = "!" "!"
```


#### 7.2.5 Special Tokens


The special-token set is **closed**: a character is emitted as a single-character special token if and only if it has a grammar role somewhere in the TSON series. Twelve characters qualify, all of them `Pattern_Syntax`; since `Pattern_Syntax` is immutable, the set of characters that can serve as TSON syntax operators is stable across all Unicode versions.

Two special characters have grammar roles in data values:

```
!     — type prefix (type annotation); also first character of !! lookahead
@     — annotation prefix
```

The remaining ten — `&` `<` `>` `?` `~` `=` `|` `;` `(` `)` — are reserved by the schema grammar of [TSON-SCHEMA] and have no role in data values; in a data value, each is a parse error.


#### 7.2.6 Unrecognised Characters


Any character that falls into no token-producing category is an **unrecognised character**, and its appearance outside a quoted token is a lexer error. This includes control characters, unassigned code points, currency symbols (`$` `€` `¥` …), and every `Pattern_Syntax` character outside the special-token set — among them `/` `#` `%` `*` `^` `'` `` ` `` `\` — which are deliberately unused anywhere in the series (within quoted tokens, `\` is the escape character). Content requiring any of these — `$19.99`, `10%`, `2/3`, `/usr/bin`, `#tag` — is written as a quoted token.


### 7.3 Lexical Grammar


Every token is a single character except quoted tokens, unquoted tokens, and the compound tokens (map arrow, directive).

```
token-stream  = *( ws / quoted-token / unquoted-token
                 / structural-delimiter / absent-token
                 / map-arrow-token / directive-token
                 / special-token )

; ── Quoted tokens ──────────────────────────────────────────

quoted-token      = single-line-token / multi-line-token
single-line-token = DQUOTE *char DQUOTE
multi-line-token  = TDQUOTE ws-indent line-term
                    ml-content ws-indent TDQUOTE

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

ml-unescaped  = ; HTAB (U+0009), and
                ; U+0020 through U+10FFFF, excluding:
                ;   U+005C (BSLASH)
                ;   U+0085 (NEL)
                ;   U+2028 (LINE SEPARATOR)
                ;   U+2029 (PARAGRAPH SEPARATOR)
                ; DQUOTE is permitted — only """ closes the block
                ; (single-line tokens do NOT admit literal HTAB)

LF            = ; U+000A  LINE FEED
CR            = ; U+000D  CARRIAGE RETURN
NEL           = ; U+0085  NEXT LINE
LS            = ; U+2028  LINE SEPARATOR
PS            = ; U+2029  PARAGRAPH SEPARATOR

; ── Unquoted tokens (Unicode UAX #31) ─────────────────────

unquoted-token = unquoted-start *unquoted-char
unquoted-start = XID_Start / Nd
               / "-" / "+" / "."
unquoted-char  = XID_Continue
               / "-" / "+" / "."

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
special-char  = "!" / "@" / "&" / "<" / ">" / "?"
              / "~" / "=" / "|" / ";" / "(" / ")"
                ; the closed special-token set (§7.2.5).
                ; In data values: ! (type prefix), @ (annotation).
                ; The other ten are reserved by [TSON-SCHEMA] and
                ; are parse errors in data values.
                ; Any character matching no token rule is an
                ; unrecognised character — a lexer error (§7.2.6).

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


### 7.4 Data Grammar


The parser consumes the token stream and produces a document tree. The `document` rule dispatches on the header (§2.2); values use two rules: `scoped-value` (record field values, map entry values) and `data-value` (everywhere a value occurs). Adjacency requirements that ABNF concatenation cannot express are enforced via source-position comparison; see §7.5.

```
document        = ws [ id-directive ws ] ( data-doc / module-doc )

data-doc        = [ schema-directive ws ] data-value ws
module-doc      = meta-directive ws *( import-directive ws )
                  schema-map ws
                ; schema-map — the module's annotated, braced
                ; declaration map — is defined in [TSON-SCHEMA];
                ; a Class 1 processor rejects module documents
                ; (§1.5, §8.1).

id-directive     = "!!" "id"     ":" quoted-token
schema-directive = "!!" "schema" ":" quoted-token
meta-directive   = "!!" "meta"   ":" quoted-token
import-directive = "!!" "import" ":" quoted-token
                ; ":" MUST be adjacent to the directive name (§7.5).
                ; "!!" whose name is not followed by an adjacent ":"
                ; is a parse error (§1.3). String literals match
                ; exact characters (§7.3): directive names are
                ; case-sensitive. Any other directive name is a
                ; parse error (§3.3).

data-value      = *annotation [type-ref] core-value

type-ref        = "!" unquoted-token

core-value      = record / map / array
                / empty-brace / absent / token

record          = "{" ws field *( separator field ) ws "}"
field           = field-name ws ":" ws scoped-value

map             = "{" ws map-entry
                 *( separator map-entry ) ws "}"
map-entry       = data-value ws "=>" ws scoped-value

array           = "[" ws [ data-value
                 *( separator data-value ) ] ws "]"

scoped-value    = [ schema-directive ws ] data-value

; ── Shared terminals ──────────────────────────────────────

annotation      = "@" unquoted-token [ ":" data-value ]
token           = unquoted-token / quoted-token
field-name      = token
empty-brace     = "{" ws "}"
absent          = "_"
```


### 7.5 Adjacency Rules


ABNF concatenation does not express "no whitespace permitted here." The following adjacency requirements are enforced by the parser via source-position comparison. [TSON-SCHEMA] extends this table for the operators of its type-definition grammar.

| Operator | Type | Context | Rule |
|---|---|---|---|
| `!` | prefix | type annotation | MUST be adjacent to the following unquoted-token (type name) |
| `!!` | prefix | directive | MUST be adjacent to the following unquoted-token (directive name) |
| `@` | prefix | annotation | MUST be adjacent to the following unquoted-token (annotation name) |
| `:` | separator | record field | whitespace optional on both sides |
| `:` | separator | annotation value, directive argument | MUST be adjacent to the preceding name; whitespace optional after |
| (none) | trailing | annotation without value | at least one whitespace character MUST follow the annotation name |
| (none) | trailing | type annotation | at least one whitespace character MUST separate the type name from a following token; none required before a structural delimiter |
| `=>` | separator | map entry | whitespace optional (compound token from lexer) |


### 7.6 Number Grammar


The number grammar applies to the complete text of a token; it is not part of the token-stream grammar. The `number` production is the base type resolution entry (§4.3): every character it uses is in the unquoted token profile (§7.1), so a candidate token is first produced by the lexer, then matched — in full — against it; its four alternatives are pairwise disjoint. The extended forms below it are recognised only through the numeric atoms of the type vocabulary (§5.6) and, like all atom contracts, match token *content* after escape processing (§5.2): `hex-float` and `complex` are expressible unquoted, while `rational` contains `/`, which is outside the profile, so rational values are always quoted.

```
; ── Base type resolution entry (§4.3) ─────────────────────

number          = special-value / based-integer
                / float / integer

sign            = "+" / "-"

digits          = DIGIT *( ["_"] DIGIT )
                ; separator "_" only between digits
decimal-natural = "0" / ( nonzero-digit *( ["_"] DIGIT ) )
                ; no leading zeros
nonzero-digit   = %x31-39                           ; 1-9

integer         = [sign] decimal-natural

based-integer   = [sign] ( "0x" hex-digits
                         / "0o" octal-digits
                         / "0b" binary-digits )
                ; prefixes are lowercase
hex-digits      = HEXDIG *( ["_"] HEXDIG )
octal-digits    = ODIGIT *( ["_"] ODIGIT )
binary-digits   = BDIGIT *( ["_"] BDIGIT )

float           = [sign] decimal-float
decimal-float   = decimal-natural "." digits [ exponent ]
                / "." digits [ exponent ]
                / decimal-natural exponent
exponent        = ( "e" / "E" ) [sign] digits

special-value   = [sign] infinity
                / ".nan"
infinity        = ".inf" / ".infinity"

; ── Extended forms (type vocabulary, §5.6) ────────────────

rational        = [sign] decimal-natural "/" denominator
denominator     = nonzero-digit *( ["_"] DIGIT )

hex-float       = [sign] "0x" hex-digits [ "." hex-digits ]
                  hex-exponent
                / [sign] "0x" "." hex-digits hex-exponent
hex-exponent    = ( "p" / "P" ) [sign] digits

complex         = [sign] magnitude sign magnitude imag-unit
                / [sign] magnitude imag-unit
magnitude       = decimal-natural [ "." digits ] [ exponent ]
                / "." digits [ exponent ]
imag-unit       = "i" / "j"

; ── Terminals ─────────────────────────────────────────────

DIGIT           = %x30-39                           ; 0-9
ODIGIT          = %x30-37                           ; 0-7
BDIGIT          = "0" / "1"
```

String literals in this grammar match exact characters (§7): the base prefixes and the special-value names are lowercase only, while `e`/`E` and `p`/`P` are given explicitly and `HEXDIG` admits both cases.


## 8. Processing Requirements


### 8.1 Errors and Reporting


Errors fall into four categories corresponding to the processing layers. The categories are defined here for the whole series; the resolver and validation categories are populated mainly by the higher parts.

- **Lexer errors** — Malformed tokens: unterminated quoted or multi-line tokens, invalid escapes, unpaired surrogate escapes, unrecognised characters, unquoted tokens that are not NFC-normalized.
- **Parser errors** — Structural mismatches: unclosed brackets, adjacency violations, unexpected tokens, missing separators, `!!` without an adjacent colon form, a directive name outside the closed positional set or outside its placement (§3.3).
- **Resolver errors** — Reference and resolution failures. At the data-format layer: an absent sentinel in map key position; a built-in type annotation on a container value (§5.1). [TSON-SCHEMA] adds unresolved type names and schema resolution failures.
- **Validation errors** — Type and constraint violations. At the data-format layer: range violations by the numeric atoms and CIDR prefix lengths (§5). [TSON-SCHEMA] generalises validation to author-declared constraints.

**Canonical phrasing.** Normative rules throughout this series refer to errors using one of four canonical phrasings, each mapping unambiguously to a category: "is a lexer error", "is a parse error", "is a resolver error", "is a validation error". Where conformance language appears without an explicit category, the layer that detects the violation determines the category.

Implementations MUST include source position (line, column, and byte offset) in all error reports, SHOULD include expected-vs-found information for token and structural mismatches, and SHOULD continue processing after an error to report multiple issues in a single pass.

**Module diagnostics.** A Class 1 processor encountering `!!meta` in the header MUST report the document as a TSON schema module that this processor does not support (§1.5) — a categorized diagnostic, not a generic unexpected-token error.


## 9. Security Considerations


### 9.1 Denial of Service


Deeply nested structures and extremely long tokens are potential denial-of-service vectors. Implementations SHOULD enforce configurable limits on nesting depth, token length, and document size.

**Numeric literal length.** Base type resolution admits arbitrary-precision numeric literals by grammar. Implementations SHOULD enforce a maximum digit count for unquoted numeric literals (a reasonable default is 4096 digits). The limit MUST be configurable or, where configuration is impractical, the implementation MUST document its enforced limit. Parsers exceeding the limit MUST report a clear error indicating the configured threshold rather than failing with an out-of-memory condition. The limit applies to annotated numeric tokens (`!decimal`, `!rational`) exactly as to unannotated ones.

**Decoded binary size.** The binary atoms (§5.3) decode token content into byte arrays. Token-length limits bound the encoded input; implementations SHOULD apply corresponding limits to decoded output rather than assuming the token limit alone bounds allocation.


### 9.2 Absence of Type Guarantees


TSON documents processed at the data-format layer carry no structural type guarantees — base type resolution (§4) and the built-in vocabulary (§5) check token formats and numeric ranges only, not field presence, container shapes, or cross-field constraints. Applications processing untrusted TSON input SHOULD validate against a schema ([TSON-SCHEMA]) before use and SHOULD NOT treat built-in annotations as a substitute for schema validation.


### 9.3 Directive Security


Directives are a control channel that affects interpretation. The directive name set is closed and positional (§3.3): there is no unknown-directive category, and therefore no channel for carrying unprocessed configuration through a conforming parser. Parsing a TSON document performs no I/O: directive arguments are references that a data-format processor never dereferences (§3.3), so a document's structural meaning is fully determined by its bytes. Dereferencing is defined by [TSON-SCHEMA] and performed under application policy. Applications processing untrusted TSON input SHOULD restrict which schema bindings are honoured when handing documents to Class 2 processors.


### 9.4 Confusable Characters


Unicode identifiers introduce visually confusable field names — Latin `a` (U+0061) and Cyrillic `а` (U+0430) are different characters and different tokens, and NFC normalization does not address this. Implementations processing untrusted TSON input SHOULD consider Unicode confusable detection (UTS #39) when field name identity is security-relevant.


### 9.5 Bidirectional Formatting Characters


`Pattern_White_Space` includes two bidirectional formatting marks that are not visual whitespace — U+200E (LRM) and U+200F (RLM). These are token separators per UAX #31, so a stray LRM or RLM inside what an author perceives as a single identifier silently terminates the token and can alter document structure invisibly. Implementations processing untrusted input SHOULD consider surfacing bidirectional formatting characters outside quoted tokens.


## 10. References


### 10.1 Normative References


| Reference | Title | URL |
|-----------|-------|-----|
| RFC 2119 | Key words for use in RFCs to Indicate Requirement Levels | https://www.rfc-editor.org/rfc/rfc2119 |
| RFC 5234 | Augmented BNF for Syntax Specifications (ABNF) | https://www.rfc-editor.org/rfc/rfc5234 |
| RFC 3339 | Date and Time on the Internet: Timestamps | https://www.rfc-editor.org/rfc/rfc3339 |
| RFC 3986 | Uniform Resource Identifier (URI): Generic Syntax | https://www.rfc-editor.org/rfc/rfc3986 |
| RFC 4291 | IP Version 6 Addressing Architecture | https://www.rfc-editor.org/rfc/rfc4291 |
| RFC 4632 | Classless Inter-domain Routing (CIDR) | https://www.rfc-editor.org/rfc/rfc4632 |
| RFC 4648 | The Base16, Base32, and Base64 Data Encodings | https://www.rfc-editor.org/rfc/rfc4648 |
| RFC 8259 | The JavaScript Object Notation (JSON) Data Interchange Format | https://www.rfc-editor.org/rfc/rfc8259 |
| RFC 9562 | Universally Unique IDentifiers (UUIDs) | https://www.rfc-editor.org/rfc/rfc9562 |
| ISO 8601-1:2019 | Date and time — Representations for information interchange | https://www.iso.org/standard/70907.html |
| IEEE 754-2019 | Standard for Floating-Point Arithmetic | https://ieeexplore.ieee.org/document/8766229 |
| UAX #15 | Unicode Normalization Forms (NFC) | https://www.unicode.org/reports/tr15/ |
| UAX #31 | Unicode Identifier and Pattern Syntax | https://www.unicode.org/reports/tr31/ |


### 10.2 Series References


| Reference | Title | URL |
|-----------|-------|-----|
| TSON-SCHEMA | TSON Part 2: Schema Modules and the Type System | &lt;pinned at publication&gt; |


### 10.3 Informative References


| Reference | Title | URL |
|-----------|-------|-----|
| UTS #39 | Unicode Security Mechanisms | https://www.unicode.org/reports/tr39/ |


## Authors


- David Ryan
