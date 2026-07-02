---
title: "TSON Part 2: Type Vocabulary"
draft: "2026-30"
status: "Working Draft"
part: 2
description: >
  The built-in type vocabulary: binary, temporal, identifier, and precision-constrained numeric
  types, giving schemaless documents access to common typed values with no declared schema.
---

# TSON Part 2: Type Vocabulary

## Draft 2026-30

**Status:** Working Draft
**Series:** TSON Specification, Part 2 of 3


## 1. Introduction

This document defines the TSON **built-in type vocabulary**: a fixed set of type annotations recognised by TSON processors in documents that carry no declared schema. The vocabulary extends base type resolution ([TSON-DATA] §6) with binary, temporal, identifier, and precision-constrained numeric types, giving schemaless documents access to common typed values without a type system.

[TSON-DATA] defines type-annotation *syntax* (`!name`) and requires processors that do not resolve a type annotation to preserve it as an uninterpreted marker. This document assigns meaning to a fixed set of annotation names. [TSON-SCHEMA] defines resolution against declared schemas and a core type library whose entries mirror this vocabulary.


### 1.1 The TSON Specification Series

- **Part 1: Data Format** [TSON-DATA] — the lexer, the data grammar, and base type resolution.
- **Part 2: Type Vocabulary** (this document) — the built-in atom types, their parsing contracts, and the built-in type annotations available without a schema.
- **Part 3: Schemas and Directives** [TSON-SCHEMA] — the `!!type` definition grammar, the type system, the schema chain, and the registered directives.

This document introduces no lexical or grammatical changes. Every construct it interprets is a token stream that [TSON-DATA] already parses; this document assigns value semantics to type annotations whose names appear in §4.


### 1.2 Conformance

A **conforming TSON type-vocabulary processor** conforms to [TSON-DATA] and additionally implements the atom parsing model (§3) and the complete vocabulary of §4. Such a processor:

- MUST recognise every annotation name listed in §4 and resolve annotated tokens per the named atom's parsing contract;
- MUST report parse and validation errors per §3.2 and [TSON-DATA] §9.6;
- MUST continue to preserve type annotations whose names are not listed in §4 as uninterpreted markers, per [TSON-DATA] §5.1.

Partial implementations of the vocabulary are not conforming: the vocabulary is recognised as a unit so that two conforming processors never disagree on whether a given built-in name is meaningful.

Processors implementing [TSON-SCHEMA] MUST also conform to this document.


### 1.3 Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

Error categories and their canonical phrasings ("is a parse error", "is a validation error", etc.) are defined in [TSON-DATA] §9.6. This document is the first in the series to populate the **validation** category.


## 2. Applicability

The built-in type vocabulary applies **only in schemaless processing** — when no declared schema scope is active for the value being resolved.

For a processor conforming to Parts 1 and 2 only, no schema scope ever exists, and the vocabulary is unconditionally active: every type annotation whose name is listed in §4 is resolved per this document, and every other type annotation is preserved as an uninterpreted marker.

For processors that also implement [TSON-SCHEMA]: when a schema is in scope, this vocabulary does not apply. All type annotations then resolve through the schema's type-name namespace, and a built-in name not defined by the active schema is an unresolved type error. Schemas wanting `uuid`, `base64`, `datetime`, and the other names in this vocabulary import the core type library or define the names locally; built-ins are not implicitly available alongside a schema. The normative statement of this scoping rule belongs to [TSON-SCHEMA]; it is restated here so that the boundary of this document's applicability is visible from within it.

In schemaless processing, a built-in annotation overrides base type resolution for the annotated token: the token is not dispatched through the [TSON-DATA] §6 resolution order but is instead parsed by the named atom's contract (§3).

**Annotation names are case-sensitive.** Only the exact names listed in §4 are recognised. `!UUID` and `!Base64` are not built-in annotations; they are preserved as uninterpreted markers.

**Scalar values only.** Built-in type annotations apply to scalar values only. In schemaless TSON, array and map element types are determined by resolving each element individually; there is no element-type annotation on a container. For precision control, annotate elements individually: `[!int32 1 !int32 2 !int32 3]`. A built-in annotation on a record, map, or array value is a resolver error.


## 3. The Atom Parsing Model

### 3.1 Parsing Contracts

Each atom type in this vocabulary owns a **parsing contract**: a definition of which tokens the atom accepts and what host value results. When a built-in annotation is active for a token, the named atom's parser takes the token and produces either a typed host value or a parse error.

The token supplied to an atom parser may be quoted or unquoted; the contract applies to the token's content after escape processing. Whether quoting is *required* is a lexical property of the content, not of the atom: content containing characters outside the unquoted continuation set — colons in timestamps and URIs, `@` in content generally — MUST be quoted per [TSON-DATA] §3.3. Content expressible as an unquoted token may be written either way: `!date 2025-03-13` and `!date "2025-03-13"` are equivalent.

The "host value" column entries in §4 name the intended language-native representation informatively. The precise host representation is implementation-defined; implementations MUST preserve the parsed value's information content (a `uuid` host value round-trips to the same 128 bits; a `decimal` host value preserves the decimal digits).


### 3.2 Parsing and Validation

Parsing and validation are distinct operations:

- **Parsing** — Token (lexeme) to host value. The atom defines what tokens are accepted and what the resolved host value looks like. For example, `date` accepts tokens that match RFC 3339 full-date and produces a host date.
- **Validation** — Host value against the atom's constraints. For example, `int32` parses the token as a decimal integer first, then validates the parsed value against the 32-bit signed range.

A parse failure is distinct from a validation failure. The token `twelve` under `!int32` is a parse error — the integer grammar cannot interpret it. The token `9999999999` under `!int32` parses successfully as an integer, then fails validation against the 32-bit range. Implementations SHOULD distinguish these in error reporting per [TSON-DATA] §9.6: a token the atom's grammar rejects "is a parse error"; a parsed value that violates the atom's range or format constraints "is a validation error".

Within this vocabulary, only the numeric precision atoms (§4.4) carry range constraints and can therefore produce validation errors; the binary, temporal, and identifier atoms are pure format checks and produce parse errors only. [TSON-SCHEMA] generalises validation to author-declared constraint records.


## 4. Built-in Type Annotations

### 4.1 Binary Types

| Annotation   | Format                          | Host value |
|--------------|---------------------------------|------------|
| `!base64`    | Base64 (RFC 4648 §4)            | byte array |
| `!base64url` | URL-safe base64 (RFC 4648 §5)   | byte array |
| `!base32`    | Base32 (RFC 4648 §6)            | byte array |
| `!hex`       | Base16 / hex (RFC 4648 §8)      | byte array |

Each binary encoding is a distinct type. There is no generic `!binary` annotation — the encoding must be specified. The host value is the decoded byte sequence; a token that is not a valid encoding under the named scheme is a parse error.

Binary values SHOULD always be quoted (`!base64 "iVBORw0KGgoAAAANSUhEUg"`), providing a consistent authoring rule regardless of whether the encoded content contains padding characters.


### 4.2 Temporal Types

| Annotation  | Format               | Host value |
|-------------|----------------------|------------|
| `!date`     | RFC 3339 `full-date` | date       |
| `!datetime` | RFC 3339 `date-time` | datetime   |
| `!time`     | RFC 3339 `full-time` | time       |
| `!duration` | ISO 8601 duration (`PnYnMnDTnHnMnS`) | duration |

A token that does not match the named format is a parse error. Note that `date-time` and `full-time` values contain colons and therefore MUST be quoted per [TSON-DATA] §3.3; `full-date` values are valid unquoted tokens.


### 4.3 Identifier Types

| Annotation | Format   | Host value |
|------------|----------|------------|
| `!uuid`    | RFC 9562 | UUID       |
| `!uri`     | RFC 3986 | URI        |

A token that does not match the named format is a parse error. URIs containing colons (any URI with a scheme) MUST be quoted per [TSON-DATA] §3.3.


### 4.4 Numeric Precision Types

The numeric atoms are defined by the type-specific entry points of the Unicode Number Format specification [UNF]. Each annotation names a UNF entry point; the token MUST match that entry point's grammar (parse) and, where the entry point carries a range, the parsed value MUST fit the range (validation).

| Annotation | UNF entry point | Constraint            | Host value        |
|------------|-----------------|-----------------------|-------------------|
| `!int32`   | `int32`         | 32-bit signed range   | 32-bit integer    |
| `!int64`   | `int64`         | 64-bit signed range   | 64-bit integer    |
| `!uint32`  | `uint32`        | 32-bit unsigned range; no sign | 32-bit unsigned |
| `!uint64`  | `uint64`        | 64-bit unsigned range; no sign | 64-bit unsigned |
| `!float32` | `float32`       | IEEE 754 single precision | 32-bit float  |
| `!float64` | `float64`       | IEEE 754 double precision | 64-bit float  |
| `!decimal` | `decimal`       | arbitrary precision   | decimal type      |
| `!bigint`  | `bigint`        | arbitrary precision   | big integer       |

Per [UNF], the integer entry points (`int32`, `int64`, `uint32`, `uint64`, `bigint`) accept decimal integer representations only — base-prefixed forms (`0xFF`, `0o755`, `0b1010`) are not part of these entry points and are parse errors under these annotations. The `float32` and `float64` entry points additionally accept the UNF special values (`.inf`, `.infinity`, `∞`, `.nan`, signed zeros) with IEEE 754-2019 semantics. The `decimal` entry point accepts decimal float and decimal integer forms.

Unannotated numeric tokens continue to resolve through base type resolution ([TSON-DATA] §6.3): `22/7` resolves to a rational and `3+4i` to a complex number via UNF without any annotation. This vocabulary provides no rational or complex annotations; precision-naming for those forms is a schema-layer concern ([TSON-SCHEMA]).


## 5. Relationship to the Core Type Library

[TSON-SCHEMA] defines a core type library (`core.tn1`) whose entries include schema types with the same names and token formats as this vocabulary (`base64`, `date`, `uuid`, `int32`, and so on), alongside types that have no built-in counterpart (`email`, `rational`, `string` narrowings, and others).

The alignment is by construction: the library's entries for these names denote the same parsing contracts defined here, expressed as narrowable schema types. This document is the normative definition of the built-in (schemaless) vocabulary; the library is the normative definition of the schema-layer types. A name appearing in both places denotes the same token format in both.

The two are nonetheless distinct mechanisms with distinct availability rules: built-ins apply only without a schema (§2), and library types apply only through a schema that imports or defines them. There is no document state in which both are active.


## 6. Security Considerations

The security considerations of [TSON-DATA] §9 apply. In addition:

**Decoded binary size.** The binary annotations (§4.1) cause token content to be decoded into byte arrays. Token-length limits ([TSON-DATA] §9.1) bound the encoded input; implementations SHOULD apply corresponding limits to decoded output rather than assuming the token limit alone bounds allocation.

**Numeric literal length.** The `!decimal` and `!bigint` annotations admit arbitrary-precision literals. The digit-count limit of [TSON-DATA] §9.1 applies to annotated tokens exactly as to unannotated ones.

**Validation is not schema validation.** This vocabulary checks token formats and numeric ranges only. It provides no structural guarantees — field presence, container shapes, or cross-field constraints require a schema ([TSON-SCHEMA]). Applications processing untrusted input SHOULD NOT treat built-in annotations as a substitute for schema validation.


## 7. References

### 7.1 Normative References

| Reference | Title | URL |
|-----------|-------|-----|
| RFC 2119 | Key words for use in RFCs to Indicate Requirement Levels | https://www.rfc-editor.org/rfc/rfc2119 |
| RFC 3339 | Date and Time on the Internet: Timestamps | https://www.rfc-editor.org/rfc/rfc3339 |
| RFC 3986 | Uniform Resource Identifier (URI): Generic Syntax | https://www.rfc-editor.org/rfc/rfc3986 |
| RFC 4648 | The Base16, Base32, and Base64 Data Encodings | https://www.rfc-editor.org/rfc/rfc4648 |
| RFC 9562 | Universally Unique IDentifiers (UUIDs) | https://www.rfc-editor.org/rfc/rfc9562 |
| ISO 8601-1:2019 | Date and time — Representations for information interchange | https://www.iso.org/standard/70907.html |
| IEEE 754-2019 | Standard for Floating-Point Arithmetic | https://ieeexplore.ieee.org/document/8766229 |
| UNF | Unicode Number Format | https://tson.io/1/unf.md?sha256=&lt;pinned at publication&gt; |
| TSON-DATA | TSON Part 1: Data Format | &lt;pinned at publication&gt; |

### 7.2 Series References

| Reference | Title | URL |
|-----------|-------|-----|
| TSON-SCHEMA | TSON Part 3: Schemas and Directives | &lt;pinned at publication&gt; |


## Authors

- David Ryan
