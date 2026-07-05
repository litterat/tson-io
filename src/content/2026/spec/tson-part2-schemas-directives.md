---
title: "TSON Part 2: Schemas and Directives"
draft: "2026 Revision 31"
status: "Working Draft"
part: 2
description: >
  The schema layer: the !!type definition grammar, composition and narrowing, the schema chain
  and its resolution model, the resolver output contract, and the five registered directives.
---

# TSON Part 2: Schemas and Directives

## 2026 Revision 31

**Status:** Working revision. The 2026 revision series is subject to change without compatibility guarantees. When finalised, this specification will be published as **TSON version 1** and frozen; until then, revisions are released under the 2026 series.

**Series:** TSON Specification, Part 2 of 2

**Copyright:** © 2026 Litterat Pty Ltd. This document is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0): https://creativecommons.org/licenses/by-sa/4.0/


## 1. Introduction

This document defines the TSON **schema layer**: the `!!type` type-definition grammar, the type system and its operations, the schema chain and its resolution model, the resolver output contract, and the five registered directives (`!!schema`, `!!id`, `!!import`, `!!include`, `!!type`).

[TSON-DATA] defines the lexer, the data grammar, base type resolution, and the built-in type vocabulary. This document adds the ability to define types, publish them as schemas, reference them from data documents, and validate data against them. It introduces no lexical changes: the type-definition grammar is a parser context activated by the `!!type` directive over the token stream that [TSON-DATA] already defines, and every operator it uses is a token the Part 1 lexer already emits.


### 1.1 The TSON Specification Series

- **Part 1: Data Format** [TSON-DATA] — the lexer, the data grammar, base type resolution, and the built-in type vocabulary.
- **Part 2: Schemas and Directives** (this document) — the type-definition grammar, the type system, the schema chain, and the registered directives.


### 1.2 Design Principles

In addition to the principles of [TSON-DATA] §1.2, the schema layer is governed by:

1. **Schema-value separation** — A document never references its own definitions via type annotations. Every type reference (`!name`) resolves against an external schema identified by the document's `!!schema` directive. A schema defines types; a data document uses them. See §11.

2. **Unified representation** — The same syntax expresses fully abstract definitions, parameterized templates, and concrete data. There is no separate notation for schemas and data.

3. **Permanent stability** — The type-definition grammar, the meta-schema, the core type library, and the resolver output contract are frozen once published, on the same terms as [TSON-DATA] §1.2 principle 7. New types are added through new type libraries, not through changes to this document.


### 1.3 Conformance

A **conforming TSON schema processor** conforms to [TSON-DATA] and [TSON-TYPES] and additionally implements the type-definition grammar (§3–§8, §17), the five registered directive operations (§9), schema resolution (§11, §14), the resolver output contract (§13), atom token parsing (§15), and validation. Such a processor:

- MUST pre-load the meta-kernel and meta-schema (§11.5, §14.1) and SHOULD pre-load the core type library;
- MUST resolve type annotations through the active schema when one is in scope, and MUST NOT apply the [TSON-TYPES] built-in vocabulary in schema scope (§2.1);
- MUST produce resolver output conforming to the `type_definition` contract (§13), including computed `supertypes` and `subtypes`;
- MUST report errors in the categories and phrasings of [TSON-DATA] §9.6.


### 1.4 Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

Throughout this document, "the `!!type` grammar" and "the type-definition grammar" name the same thing: the specialized grammar (§17.1) that the `!!type` directive activates for the value that follows it.


### 1.5 Companion Artifacts

This document is published with four companion artifacts:

| Artifact | Status | Content |
|----------|--------|---------|
| `meta-kernel.tn1` | Normative | The self-referencing bootstrap layer (§12) |
| `meta.tn1` | Normative | The canonical meta-schema (§12) |
| `core.tn1` | Normative | The core type library (§12, [TSON-TYPES] §5) |
| Resolver Output Reference | Non-normative | Complete resolver output for the three schemas above, as test fixtures (§13) |

The normative artifacts are pinned by content hash at publication. Per §11.5, implementations pre-load the kernel and meta-schema as in-memory structures; the artifact documents are descriptions of those structures, and the in-memory model is authoritative.


## 2. Data Values Under a Schema

[TSON-DATA] defines the syntax of data values and their schemaless interpretation. This section defines how an active schema changes that interpretation: type-annotation resolution (§2.1), atom parsing in place of base type resolution (§2.2), set semantics over array syntax (§2.3), extensions to the absent sentinel rules (§2.4), and resolver behaviours at typed positions (§2.5). A schema becomes active through the `!!schema` directive (§9.1).


### 2.1 Type Annotation Resolution

In data values, a type annotation (`!name`, [TSON-DATA] §5.1) marks **instantiation** — the value is concrete data conforming to the named type.

The type name resolves against the external schema identified by the current `!!schema` directive — never against definitions within the same document. See §11 for the complete schema resolution rules. Inside the type-definition grammar, `!` has an additional role: it marks constructor instantiation (§3.3).

**The built-in vocabulary does not apply in schema scope.** When a schema is in scope, the [TSON-TYPES] built-in type annotations do not apply — all type annotations MUST resolve through the schema's type-name namespace (local entries plus imports, §11.3.2). A built-in annotation name that is not defined by the active schema is an unresolved type error. Schemas wanting `uuid`, `base64`, `datetime`, and the other built-in names import the core type library (or define them locally); built-ins are not implicitly available alongside a schema. This is the normative statement of the scoping rule restated in [TSON-TYPES] §2.

A document with no `!!schema` directive has no type vocabulary: base type resolution ([TSON-DATA] §6) and the built-in annotations ([TSON-TYPES]) apply, and any other type annotation is preserved unresolved per [TSON-DATA] §5.1.

**Records are closed under their type.** When a schema is in scope and a record's type is known, the record MUST contain only fields defined by its type. Fields appearing in the data that are not present in the type definition are validation errors. This applies to both directly-typed records (`!person { ... }` validated against the `person` type) and structurally-positioned records (a record value at a record-typed field position). Schemaless records — records without a known type — have no closure rule because they have no defined field set; they are whatever the data says they are. Closure is what makes schema evolution a discrete operation rather than a backward-compatibility negotiation: every published schema version is a precise, immutable contract about what fields exist. See §11.4 for the schema-evolution implications.

**Type expression syntax is not available in data values** ([TSON-DATA] §5.1). To annotate an array or map value with a named type in data, define a named type in the schema:

```
!schema {
  int_list => !!type [integer]
  scores => !!type [integer; +]
  translations => !!type map<string, string>
}
```

Then in data: `!int_list [1 2 4 8 32]`, `!translations { en => Hello fr => Bonjour }`.

**Schema maps.** The type annotation `!schema` marks a map as a schema map. This is a regular type annotation — `schema` is a type defined in the meta-schema as `!!type map<type_name, type_definition>`. The annotation signals to the resolver that the map's entries form a mutually visible type namespace. See §11 for schema resolution rules and §11.7 for the schema document shape.


### 2.2 Atom Parsing Replaces Base Type Resolution

When a schema is in scope, base type resolution ([TSON-DATA] §6) does not apply at typed positions. Each position's declared atom type owns its own parsing contract (§15); unquoted tokens are interpreted by that atom's parser, not by the schemaless dispatch. The tokens `true`, `false`, and `null` have no special status in schemaful mode — their meaning is determined entirely by the type annotation or field type in the schema.

**`null` at `void`-typed positions.** The sole exception is a position whose declared type is `void` (§8): there the token `null` is accepted as an equivalent spelling of the absent sentinel `_` and normalised to absence. The concession is local to `void` — because `void` has a single inhabitant, there is no absence-vs-value distinction to lose — and does not change `null`'s meaning at any other position. Authors SHOULD write `_`; `null` is tolerated but discouraged, and a `void` position round-trips to `_`. This rule also covers JSON-shaped data processed under a schema: a JSON `null` landing at a `void`-typed position is accepted as absence, while everywhere else it must satisfy the position's declared type.


### 2.3 Sets

A **set** is an unordered collection of unique values. Sets are not a distinct grammar construct — they share array syntax `[ ... ]` at the data level ([TSON-DATA] §4.3.4). Set-ness is a schema property declared via the `set` constructor (§8, defined in meta-kernel). Without a schema, every `[ ... ]` is an array; with a schema, the field's declared type determines whether the value is treated as an array or a set.

A **set** is an unordered collection of unique values. Sets are not a distinct grammar construct — they share array syntax `[ ... ]` at the data level. Set-ness is a schema property declared via the `set` constructor (§8, defined in meta-kernel). Without a schema, every `[ ... ]` is an array; with a schema, the field's declared type determines whether the value is treated as an array or a set.

**Duplicate handling.** When source data contains a value more than once at a set-typed position, duplicates are silently deduped by the resolver — the first occurrence wins, subsequent duplicates are dropped. The resolver SHOULD warn when dedup occurs, since duplicates in source are usually authoring mistakes worth surfacing. Two values are duplicates if the field's element type's equality contract considers them equal (token identity for `set<token>`, value equality for `set<integer>`, etc.).

**Element order in resolver output.** Sets are unordered — the `set` constructor pins `unordered: = true` (§8). The resolver's materialised representation uses array syntax (the `set<T>` field type), but the order of elements in that materialised list is implementation-defined. Implementations comparing resolver outputs MUST compare set-typed fields as sets, not as ordered lists. Fixture comparison tools SHOULD canonicalise set-typed fields (e.g. by lexical sort of the materialised tokens) before byte-comparison.

**Applicability.** These rules apply uniformly to every set-typed position, including:

- The kernel's `enum.members: set<token>` — duplicate enum members are silently deduped (with a warning recommended); element order is implementation-defined.
- User-defined set-typed fields — `tags: set<string>` follows the same rules.
- Set values produced by the positional fill rule (§3.4) when a constructor's single REQUIRED field is set-typed.

**No absent semantics.** An absent element at a set-typed position is rejected because sets carry `state: REQUIRED` per the `set` constructor's pinned values (§8).


### 2.4 The Absent Sentinel Under a Schema

[TSON-DATA] §4.4 defines the absent sentinel and its data-value positions. `_` is not itself a type, but the type whose sole conforming value is `_` is `void` (§8), the unit type of absence; at a `void`-typed position the token `null` is also accepted as an equivalent spelling of `_` (§2.2). Everywhere else `_` (absence) and the base value `null` remain distinct.

This document extends the position table of [TSON-DATA] §4.4 as follows:

| Position                                  | `_` permitted? | Meaning                                                                                          |
|-------------------------------------------|----------------|--------------------------------------------------------------------------------------------------|
| Array element (schema in scope)           | conditional    | Permitted only when the array type's element state is OPTIONAL, written `[T?]` (§3.2)            |
| Tuple element                             | yes            | Element position explicitly absent (occupies a slot); the position's state must be OPTIONAL (§3.2) |
| `!!include` directive value               | required       | The included content replaces `_` (`!!include:"..." _`, §9.1)                                    |
| Field-type position (type-definition grammar) | no         | Parse error — use type parameters for "type to be filled later" (§5)                             |
| Type-ref position (type-definition grammar) | no           | Parse error                                                                                      |
| Type-def body (`!!type` directive value)  | no             | Parse error — use `{}` for an empty record                                                       |
| Field modifier value (`~`/`=`)            | `=` only       | `= _` valid on OPTIONAL fields (OPTIONAL_FIXED to absent); `~ _` and `= _` on REQUIRED fields are resolver errors (§3.1) |

When a schema is in scope, absence at an element position requires the governing container type to permit it: for tuples, the position's `state` must be `OPTIONAL`; for arrays, the type's element state must be `OPTIONAL` (written `[T?]` — see §3.2). Absent elements occupy positional slots, and size constraints count all slots including absent ones. For tuples specifically, OPTIONAL positions require explicit `_` to occupy the slot — the tuple's length is fixed by its type, and short tuples are validation errors regardless of trailing-optional positions (§3.2).


### 2.5 Resolver Behaviours at Typed Positions

**Typed key equality.** [TSON-DATA] §4.3.2 defines parser-layer (textual) duplicate-key detection for maps. When a schema is present and the key type is known, the resolver MAY additionally apply type-specific equality. The resolver SHOULD warn when type-aware equality detects duplicates that the parser did not catch. The MAY is deliberate: once keys are realised as host-language values, equality semantics are determined by the host language's collection types, and TSON cannot uniformly mandate equality rules across hosts it does not control.

**Empty braces.** [TSON-DATA] §4.3.5 defers empty-brace disambiguation to declared type information. Under a schema, the expected type at the position supplies that information: the resolver transforms an `EmptyBraceValue` into an empty record or empty map per the expected type, defaulting to an empty record when the position is untyped.


## 3. The Type Definition Grammar

The `!!type` directive (§9.2) activates a specialized grammar — the type-definition grammar — for the value that follows it. This section defines the grammar's field states, type expressions, constructor forms, and canonical desugaring. The complete ABNF is given in §17.1.

Inside the type-definition grammar, type positions are determined by grammar context — the `!` prefix is not used for type references (it is used for constructor instantiation; see §3.3). Type names used as type-refs resolve against the type-name namespace (§11.3.2).

### 3.1 Field States

Within the `!!type` directive grammar, each field in a record definition has a state on the spectrum of completeness. The state is determined by two independent axes: **presence** (required vs optional) and **mutability** (free, default, or fixed).

Inside the `!!type` grammar, type positions are determined by grammar context — the `!` prefix is not used for type references (it is used for instances; see §3.3). After the `:` in a field definition, the parser expects a type reference (resolved by looking up field names first, then type names in the local schema).

The **presence axis** is determined by the type suffix:

- `type` — The field is **required**. It must be filled before instantiation.
- `type?` — The field is **optional**. It may be absent. The `?` suffix marks optionality.

The **mutability axis** is determined by the value modifier that optionally follows the type expression:

- No modifier — The field is **free**. It has no value yet and must be filled (if required) or may be filled (if optional) by narrowing or instantiation.
- `~ token` — The value is a **default**. It is used when no value is supplied, but may be overridden by narrowing or instantiation. The `~` signals that the value is approximate — a starting point, not a commitment.
- `= token` — The value is **fixed**. It is immutable and cannot be changed by narrowing or instantiation.
- `= _` (only when the field is OPTIONAL) — The value is **fixed to absent**. Equivalent to OPTIONAL_FIXED with no fixed value — the field is forbidden from carrying a value in conforming data. Useful in narrowings to express "this field is no longer permitted."

Whitespace around `~` and `=` is optional. Both `~ value` and `~value` are valid, as are `= value` and `=value`.

Value modifiers are restricted to scalar tokens — quoted or unquoted — covering strings, numbers, booleans, and null. The `=` modifier additionally accepts the absent sentinel `_`, which is valid only when the field is OPTIONAL (declared with `?` or inherited as OPTIONAL from a supertype or narrowing source). `field: type? = _` produces OPTIONAL_FIXED with an absent fixed value — the field MUST either be omitted or be the absent sentinel in conforming data; any other value is a validation error. The following combinations are resolver errors:

- `~ _` (any field) — REQUIRED_DEFAULT with an absent default value is contradictory: a required field cannot fall back to not-being-filled.
- `= _` on a REQUIRED field — REQUIRED_FIXED to absent is contradictory: a field cannot be required and fixed to not-being-present.

Complex default or fixed values (arrays, records) are not supported inline; define a named value and reference it instead.

**Eager resolution.** Default and fixed value tokens are resolved and validated at schema-load time, not deferred to per-validation. The token is parsed by the field's type — for typed fields by the atom's parser; for `value`-typed fields by [TSON-DATA] §6 base type resolution — and stored as the resolved host value. A default or fixed value that fails parsing or fails the type's constraints is a schema-load error, not a deferred validation error. This matches §15's eager-conversion rule for constraint-field values and applies uniformly to defaults and fixed values on all field types.

Examples within a record definition:

```
config => !!type {
  host:   string
  port:   integer ~ 8080
  debug:  boolean = false
  label:  string?
  format: string? = json
}
```

The five field states on the spectrum of completeness:

| Syntax                    | State              | Meaning                                    |
|---------------------------|--------------------|--------------------------------------------|
| `field: type`             | REQUIRED           | Must be filled by narrowing or instantiation |
| `field: type ~ value`     | REQUIRED_DEFAULT   | Value used when not supplied, overridable  |
| `field: type = value`     | REQUIRED_FIXED     | Value is immutable from this point down    |
| `field: type?`            | OPTIONAL           | May be absent; no value required           |
| `field: type? = value`    | OPTIONAL_FIXED     | If present, must be this value             |
| `field: type? = _`        | OPTIONAL_FIXED (no value) | Field is forbidden from carrying a value; in resolver output, the `value` field is absent on the `record_field` (§13.1 mapping table) |

The `~` modifier is only valid for defaults. An optional field with `~ value` (`type? ~ value`) MUST NOT be used — a default value implies the field is always present (it falls back to the default), which contradicts optional semantics — `type? ~ value` is a resolver error. If a field should have a fallback value, it is required with a default (`type ~ value`). If a field may be absent, it is optional (`type?`). If a field may be absent but when present must have a specific value, it is optional-fixed (`type? = value`).

In data, a REQUIRED_FIXED field may be provided with a value that matches the fixed value, or may be omitted (in which case the fixed value is used). Providing a value that contradicts the fixed value is a validation error.

The `?` suffix marks optionality. In a type expression, `?` after the base type name marks the element as optional; `?` at the end of the expression marks the field as optional.

```
config => !!type {
  tags:     [string; +]
  aliases:  [string]?
  notes:    [string?]
  labels:   [string?; ..10]?
  metadata: map<string, integer?>?
  retries:  integer ~ 3
}
```

**Type name resolution.** In the `!!type` grammar, type names used as type-refs (in field positions, type arguments, choice variants, composition targets, and narrowing sources) resolve against the type-name namespace — parameters of the enclosing definition, local entries of the schema map, and entries brought in by `!!import` directives. See §11.3 for the full resolution order. Bare names always refer to types — there is no field-name shadowing of type names.

**Inline structural definitions — atom narrowings and bare records prohibited.** Schema authors MUST introduce atom narrowings and record types via named `!!type` definitions; they MAY NOT appear inline in field-type, tuple-element, array element, choice variant, type-argument, or composition positions. The two prohibited forms:

- `!decimal { min: -273.15 max: 10000 }` as a field type — atom narrowing.
- `{ name: string }` as a field type — bare record.

The atom-narrowing case is the more subtle of the two. The `!T { ... }` syntax has two distinct meanings depending on grammar context:

- In **data mode**, `!T value` is a type annotation: `!T` tags the value with type `T`, and the value is whatever `T`'s atom contract parses. `!decimal 250.12` annotates the decimal value 250.12. `!decimal { ... }` would annotate a record (which is a type error since `decimal` is an atom, not a product).
- In **`!!type` mode**, `!T { ... }` is constructor application (§3.3). The brace-record is interpreted against `T`'s constructor record, not as data shaped by `T`. `!decimal { min: -273.15 max: 10000 }` interprets the inner record as `decimal_type`'s constraint vocabulary — `min` and `max` are fields of the *constructor* (the constraint record meta-core declares for `decimal_type`), not values of type `decimal`.

The two readings are categorically different operations using identical surface syntax. Permitting atom narrowings inline in field-type positions creates contexts where `!decimal { ... }` would have to be interpreted differently based on which grammar the parser thinks it is in. Requiring named definitions removes the ambiguity at the source: `!decimal { min: 0 max: 100 }` only ever appears as the body of a `!!type` directive, where the constructor-application reading is unambiguous.

Bare records such as `{ name: string }` are prohibited inline for the same family of reasons. The surface syntax is also valid in data mode (a record literal whose `name` field has the unquoted token value `string`); the type-mode reading requires the parser to know it is in `!!type` grammar to disambiguate. Named records make the intent explicit at the point of definition. The required form is:

```
person => !!type { name: string }
```

then `person` is referenced by name where needed.

Inline forms with type-mode-exclusive syntax — array brackets `[T]` and `[T; +]`, type arguments `name<T>` and `map<K, V>`, choice parentheses `(A | B)` — remain permitted in field-type positions because their surface shape never appears in data values. Square brackets in data form arrays, but a `[T]` *in a type position* inside a `!!type` body is unambiguously a type expression because the surrounding grammar is `!!type`, and the same shape carries no other meaning the reader could mistake it for. Angle brackets and choice parentheses are reserved exclusively for the `!!type` grammar ([TSON-DATA] §3.6.2) — they have no data-mode reading at all. Constraint-bearing array forms like `[T; +]` synthesize a named container type per §14.

Beyond avoiding ambiguity, named definitions are self-documenting, reusable, and produce cleaner resolver output than synthetic types derived from parent context.

Implementations MAY warn on inline definitions that exceed a configurable nesting depth.


### 3.2 Type Expressions

Inside the `!!type` grammar, type expressions support arrays, tuples, optionality, and type arguments:

```
config => !!type {
  tags:     [string]                array of strings
  scores:   [integer; +]           non-empty array (one or more)
  matrix:   [float; 9]             exactly 9 floats
  batch:    [order; 1..100]        between 1 and 100
  aliases:  [string]?              optional field, array of strings
  meta:     map<string, integer>   typed map
  point:    [float, float]         tuple (two floats)
  sparse:   [string, string?]      tuple with optional second position
  contact:  (email | phone)        choice type
}
```

**Array types** use `[type]` with an optional size specifier after `;`:

```
[string]             any size
[string?]            any size, absent elements permitted
[string; +]          one or more
[string; 5]          exactly 5
[string?; 5]         exactly 5, absent elements permitted
[string; 1..100]     1 to 100
[string; 1..]        at least 1
[string; ..10]       at most 10
```

The size specifier is a single unquoted token in the parser grammar (`size-spec = unquoted-token`). The resolver interprets the token as one of six forms: `+` (one or more, equivalent to `1..`), `N` (exactly N), `N..M` (bounded range), `N..` (at least N), `..M` (at most M), or absent (unconstrained). N and M are non-negative decimal integers without leading zeros. When both N and M are present, N MUST be less than M. For exactly N elements, use the `N` form directly. The resolver MUST reject any token in a size-spec position that does not match the pattern `^(\+|(0|[1-9]\d*)(\.\.(0|[1-9]\d*)?)?|\.\.(0|[1-9]\d*))$`. A size specifier of `0..` is equivalent to an unconstrained array.

The element position accepts an optional `?` suffix, producing `element_state: OPTIONAL` on the resolved `array`. Under `[T?]`, elements at any position MAY be the absent sentinel `_` (§2.4). Absent elements occupy a positional slot: the data `[a _ c]` has three elements, and satisfies a `[T?; 3]` size constraint. Without the `?` suffix, `state` defaults to `REQUIRED` and absent elements are a validation error when a schema is in scope.

The `set` constructor narrows `array` and pins `state: = REQUIRED` — absence has no meaning in an unordered collection of unique members.

**Tuple types** use `[type, type, ...]` with comma or whitespace separation between individually typed positions:

```
[float, float]               two floats
[string integer boolean?]    three positions, third optional
```

A tuple requires at least two element type expressions. When the parser encounters two or more type-refs separated by whitespace or comma inside brackets, the result is always a tuple. A semicolon after a single type-ref introduces a size specifier for an array. A single type-ref with no semicolon is an unconstrained array. The separator character (whitespace/comma vs semicolon) is the disambiguating signal. A single type in brackets (`[string]`) MUST be interpreted as an unconstrained array, not a one-element tuple. `[string,]` is a parse error — trailing separators are not permitted anywhere (see [TSON-DATA] §3.7).

Tuple positions support only REQUIRED and OPTIONAL states; defaults and fixed values are not available for tuple elements. Tuples and arrays share the `element_state` enumeration in the meta-schema — it has just two members, reflecting the narrower vocabulary available to positional containers compared to record fields (which support five states via `field_state`).

Tuples are fixed-length: every position MUST be present in the data. An OPTIONAL position may carry the absent sentinel `_` to indicate explicit absence at that slot, but the slot itself MUST appear. A tuple value with fewer elements than the tuple type's position count is a validation error, regardless of whether the missing positions are OPTIONAL. For example, given the type `[string, string?]`:

- `[a, b]` — valid (both positions filled with values).
- `[a, _]` — valid (second position explicitly absent).
- `[a]` — validation error (tuple type has two positions; data has one).

Authors who want trailing-optional semantics should use a 1-or-more-element array `[string; +]` rather than a tuple.

**Choice types** use `(type | type | ...)`:

```
(email | phone | address)    one of three types
```

**Type arguments** use `name<type, type>`:

```
map<string, integer>         typed map (binds K, V parameters)
set<string>                  typed set (binds T parameter)
array<string>                explicit array form
```

The angle-bracket syntax binds positional type arguments to a constructor's declared type parameters (see §5 for parameter declarations). The argument count MUST match the constructor's parameter count. Type arguments are themselves type references and may be parameterized recursively (`map<string, array<integer>>`). Bare references to a parameterized type without binding its parameters (e.g. `map` with no `<>`) are resolver errors — parameter binding is mandatory at every use site.


### 3.3 Constructor Instantiation and Instance Narrowing

Within the `!!type` grammar, the `!` prefix marks construction of a type from a constructor. Two forms exist, with different semantics:

**Instantiation — `!T { values }`.** Produces a constructor instance filled with specific values. The data-value after `!T` is interpreted against the constructor's record shape — the field list `T` declared as its narrowable vocabulary. This interpretation differs from the data-mode reading of `!T value`, where `!T` annotates a value parsed by `T`'s atom contract (e.g. `!decimal 250.12` annotates the decimal value 250.12). In `!!type` body position, `!T { ... }` interprets the brace-record as `T`'s constructor record (`min`, `max`, etc.), not as data shaped by `T`. See §3.1 for why this distinction motivates the rule that atom narrowings cannot appear inline.

This form does NOT establish IS-A with `T`: construction transfers only the `kind` (ATOM, PRODUCT, or SUM) of the constructor, not its supertypes. The resulting type records `source: T` to indicate which constructor produced it, but `supertypes` is empty.

A constructor's kind is determined at definition time by the base kind (`atom`, `product`, or `sum`) reachable through its transitive supertypes chain. A constructor whose chain contains zero base kinds resolves to `kind: PRODUCT` by structural default. A constructor whose chain contains exactly one base kind takes that kind. A constructor whose chain contains two or more base kinds is a resolver error — the kinds are categorically distinct and cannot be combined. The kind is settled when the constructor is defined, so `!C {}` simply inherits `C`'s settled kind.

```
integer  => !!type !integer_type {}
string   => !!type !string_type {}
boolean  => !!type !enum [true false]
base64   => !!type !binary BASE64
```

`integer` has `source: integer_type` and `kind: ATOM`, but is not IS-A `integer_type`. It has no supertypes.

**Instance narrowing — `!T { values }` where `T` is a constructor instance.** When the `!` target is an existing constructor instance (not the constructor itself), the form narrows the instance by tightening values on the constructor's fields. This form DOES establish IS-A: the new type records `source: T's constructor`, `supertypes: [T]`, and a body matching `!T's_constructor { narrowed values }`.

```
uint8             => !!type !integer { min: 0  max: 255 }
non_empty_string  => !!type !string { min_length: 1 }
positive_integer  => !!type !integer { min: 1 }
```

`uint8` has `source: integer_type`, `supertypes: [integer]`, and can be narrowed further.

The distinction is in the target of `!`:
- `!integer_type {}` — target is the constructor; empty instantiation; no IS-A.
- `!integer { min: 0 max: 255 }` — target is the constructor's instance; narrowing; IS-A `integer`.

**Single-required-field positional form.** When a constructor has exactly one REQUIRED field, the data-value after `!C` fills that field directly. See §3.4 for the full desugaring rule.

**Enum member naming convention.** Enum members are conventionally written in uppercase (`ACTIVE`, `INACTIVE`, `BASE64`, `HEX`) to distinguish them visually from type names (lowercase) and field names (lowercase). This is a style convention applied throughout the meta-schema and core type library; the parser does not enforce it. The single exception in the core library is `boolean`, whose members `true` and `false` retain their conventional lowercase form because they are language-level constants in the data grammar ([TSON-DATA] §6.2), not user-defined enum members. New enum types in user schemas SHOULD follow the uppercase convention for consistency with `core.tn1`.


### 3.4 Canonical Form and Desugaring

All `!!type` bodies ultimately take a single canonical form:

```
!C { bindings }
```

where `C` names a constructor and `bindings` is a record literal filling the constructor's fields. Every other form in the `!!type` grammar — inline type expressions, positional constructor forms, instance narrowings — is syntactic sugar that desugars to this form. The resolver performs desugaring during type-definition resolution; resolver output always records the fully expanded canonical form in the `body` field.

**Inline type-expression desugaring.** The inline forms in §3.2 desugar through a fixed chain:

| Source form                | Desugaring                                                                                     |
|----------------------------|------------------------------------------------------------------------------------------------|
| `[T]`                      | `array<T>` → `!array T` → `!array { element_type: T }`                                         |
| `[T; n]`, `[T; +]`, `[T?]` | as `[T]` with the corresponding constraint fields filled                                       |
| `[T, U, ...]`              | `tuple<...>` → `!tuple { elements: [...] }`                                                    |
| `(A \| B \| ...)`          | `!choice { variants: [A, B, ...] }`                                                            |
| `set<T>`                   | `!set T` → `!set { element_type: T }`                                                          |
| `map<K, V>`                | `!map { key_type: K, value_type: V }` (two REQUIRED fields — no positional form)               |
| `C<args>`                  | `!C <arg>` if C has one REQUIRED field; otherwise `!C { <bindings> }`                          |

**Positional form.** When a constructor has exactly one field in state `REQUIRED` (no default, no fixed value), the data-value after `!C` may be the value of that field directly — the resolver folds it into the single-field record form:

```
!enum [true false]              →  !enum { members: [true false] }
!binary BASE64                  →  !binary { encoding: BASE64 }
!array string                   →  !array { element_type: string }
```

REQUIRED_DEFAULT, REQUIRED_FIXED, and OPTIONAL fields do not count toward the single-REQUIRED rule. The positional form is invalid when the constructor has zero, two, or more REQUIRED fields — the resolver MUST reject such uses with a clear error message.

**Record-bindings form.** `!C { ... }` is the explicit form: an empty or non-empty record literal supplying values for the constructor's fields. The record-bindings form is valid for any constructor as long as the bindings cover all REQUIRED fields that are not pinned by FIXED or covered by DEFAULT. Empty bindings `!C {}` are valid whenever the constructor has no unfilled REQUIRED fields — including `!unit {}` (which has no fields), and any constructor whose REQUIRED fields are all pinned by FIXED or covered by DEFAULT. The "zero, two, or more REQUIRED fields invalid" rule applies to the positional form only, not to the record-bindings form.

**Instance narrowing.** When `!C` targets a constructor *instance* rather than a constructor itself, the form desugars by retargeting to the instance's source constructor:

```
!integer { min: 0  max: 255 }   →  !integer_type { min: 0  max: 255 }
!string { min_length: 1 }       →  !string_type { min_length: 1 }
!decimal { min: 0  max: 100 }   →  !decimal_type { min: 0  max: 100 }
```

The resolver recognises this case by checking `C.constructor`: if `false`, `C` is an instance and the retarget follows `C.source`. The resulting type records `source: C.source` and `supertypes: [C]` — instance narrowing establishes IS-A with the narrowed instance (§3.3), unlike construction which transfers only kind.

**End state.** After desugaring, every `!!type` body in resolver output is `!C { bindings }` where `C` is a constructor and `bindings` is a record literal supplying values for the constructor's REQUIRED fields that are not pinned by REQUIRED_FIXED or covered by REQUIRED_DEFAULT. Pinned and default values come from the constructor itself and do not appear in the binding record; OPTIONAL fields appear only when the source provides a value. Positional forms are always expanded to their record-literal equivalent — `!array string` becomes `!array { element_type: string }` — and inline type expressions and instance narrowings are fully desugared. The surface abbreviations exist only in source text.

**Named definitions required.** The instance form (`!T { values }`) and the empty constructor instantiation (`!T {}`) are valid only as the top-level body of a `!!type` directive — they cannot appear inline in field-type, tuple position, array element, choice variant, type-argument, or composition positions. See §3.1 for the rationale. A constrained atom such as `!decimal { min: -273.15 max: 10000 }` must be introduced with its own `!!type` definition and referenced by name:

```
temperature => !!type !decimal { min: -273.15  max: 10000 }
retries     => !!type !integer { min: 0  max: 10 }
status      => !!type !enum [ACTIVE INACTIVE SUSPENDED]

config => !!type {
  temperature: temperature
  retries:     retries
  status:      status
}
```


## 4. Narrowing, Composition, and Subtraction

### 4.1 Narrowing

Narrowing copies an existing definition and refines it by binding parameters or tightening types. In the context of the spectrum of completeness, narrowing produces a more specific definition that maintains an is-a relationship with the source.

Narrowing is expressed by providing a source type name followed by a record body, without `&`:

```
person => !!type { name: string  age: integer }

elder => !!type person { age: age }

age => !!type !integer { min: 0  max: 150 }
```

The parser distinguishes narrowing from supertype composition by the absence of `&`. With a source type and no `&`, only existing fields may be modified — new fields in a narrowing body are resolver errors. With `&`, supertype composition allows both new fields and field tightening (see §4.2).

The resolver looks up the source type name in the type-name namespace (§11.3). The same syntax works for narrowing locally defined types and imported types.

Narrowing copies the named definition's structure and applies the body's fields as refinements. Fields in the body MUST exist in the source definition. Adding fields that do not exist in the source is a resolver error. The guiding rule is that narrowing can only restrict, never expand — FIXED states are terminal, and loosening a required field to optional is a resolver error.

The narrowing state transition table:

```
From \ To          | REQUIRED | OPTIONAL | REQ_DEFAULT | REQ_FIXED | OPT_FIXED |
-------------------|----------|----------|-------------|-----------|-----------|
REQUIRED           | allowed  | error    | allowed     | allowed   | error     |
OPTIONAL           | allowed  | allowed  | allowed     | allowed   | allowed   |
REQUIRED_DEFAULT   | error    | error    | allowed     | allowed   | error     |
REQUIRED_FIXED     | error    | error    | error       | allowed   | error     |
OPTIONAL_FIXED     | error    | error    | error       | error     | allowed   |
```

**Identity diagonal.** Each state may be restated as itself (diagonal cells all `allowed`). For states that carry a value, identity restatement is governed by the value's own mutability:

| State                | Identity restatement may change value? |
|----------------------|----------------------------------------|
| REQUIRED             | n/a (no value)                         |
| OPTIONAL             | n/a (no value)                         |
| REQUIRED_DEFAULT     | yes (defaults are overridable per §3.1) |
| REQUIRED_FIXED       | no (fixed values are immutable)        |
| OPTIONAL_FIXED       | no (fixed values are immutable)        |

The identity cells for fixed states exist so that a narrowing body may restate a fixed field without error — not so that fixed values can be replaced.

In record narrowing, the body uses the field-def grammar:

```
elder => !!type person {
  age: age
  role: = engineer
  level: integer ~ 1
}
```

In a narrowing body, the type-ref in a field definition MAY be elided. When only a field modifier is present (`field: = value` or `field: ~ value`), the field's type is inherited from the source definition: the omitted type is filled in from the inherited declaration, and only the value state is changed. A field-modifier-only field definition is valid exclusively in narrowing bodies. In a fresh record definition or a supertype-composition body, every field MUST have an explicit type-ref — the resolver MUST reject modifier-only entries in these contexts. Composition is an additive operation: it brings in supertype fields via `&` and declares new fields; tightening an inherited field in a composition body requires restating the type-ref (e.g. `employee => !!type person & { age: age ~ 30 }`, not `{ age: ~ 30 }`). Modifier-only tightening is reserved for narrowing because narrowing is specifically about refining existing fields without adding new ones.

A narrowed definition remains a definition on the spectrum. It can be narrowed further or instantiated.

A narrowing that takes an OPTIONAL field to OPTIONAL_FIXED with `= _` (fixed to absent) effectively forbids the field in the narrowed type — the field is permitted to appear only as `_` in conforming data, which is indistinguishable from omission. This is the closest TSON gets to field elimination through narrowing alone.

Maps may be narrowed by tightening their key type, value type, or bounds (min_items, max_items). Individual map entries cannot be narrowed because map keys are data, not definition fields.

**Body materialisation.** The narrowed body re-emits the complete inherited field set in source order. Each field carries either its inherited state and value, or the tightened state and value if the narrowing touched it. The materialised body is self-describing — consumers of resolver output do not need to walk the supertype chain to know what fields exist or what their states are. Inherited REQUIRED_FIXED and REQUIRED_DEFAULT fields appear in the body with their pinned values, even when the narrowing did not refer to them.


### 4.2 Supertype Composition vs Narrowing

Supertype composition (`&`) and narrowing (source type without `&`) serve different purposes:

- **Supertype composition** is a construction tool. It combines one or more parent types with new fields into a new definition. The `&` operator declares the supertype relationships. New fields are permitted. Existing fields may be tightened. The result is-a each listed supertype.

- **Narrowing** is a refinement tool. It copies a definition and refines its existing fields only. No new fields are permitted. The result maintains an is-a relationship with the source.

Example:

```
!schema {
  address => !!type { street: string  city: string  postcode: string }
  contact => !!type { name: string  email: string }
  customer => !!type address & contact & { loyalty_tier: string }

  config => !!type { host: string  port: integer  debug: boolean }
  production => !!type config { host: = "prod.example.com"  debug: = false }
}
```

**Supertype field conflicts.** When multiple supertypes are combined via `&`, each supertype contributes its fields to the composed type. The supertypes MUST contribute disjoint field sets — a field name appearing in more than one supertype path is a resolver error, including diamond cases where the field traces back to the same originating type through both paths. Even when the source is structurally identical, the composed record has only one slot per field name and cannot meaningfully take a value from "both paths."

If two types genuinely need to share a field, the schema author must factor the shared field into a direct supertype of the composed type, not into a common ancestor reached through two intermediate supertypes. For example, given `identifiable => !!type { id: uuid }` and intermediates `named => !!type identifiable & { name: string }` and `versioned => !!type identifiable & { version: integer }`, a composition `artifact => !!type named & versioned & { ... }` is a resolver error: `id` reaches `artifact` through both `named` and `versioned`. The fix is to remove `identifiable` from the intermediates and compose it directly: `named => !!type { name: string }`, `versioned => !!type { version: integer }`, `artifact => !!type identifiable & named & versioned & { ... }`. Now `id` enters only through the direct `identifiable` composition; `named` and `versioned` are pure mixins for their own fields.

The trailing `& { ... }` body may tighten inherited fields (following the narrowing state transition table in §4.1) or add new fields. Fields in the body that do not exist in any supertype are new fields. Fields in the body that match an inherited field name are tightening refinements and must follow the narrowing rules.

**Field ordering.** Supertypes contribute fields in left-to-right order as listed in the `&` composition. Each supertype's own fields appear in their declared order. Body fields that tighten inherited fields replace them in place — the inherited slot is preserved, only its state and value are updated. Body fields that do not match any inherited field are new fields, appended after all inherited fields.

**Constructor marker is independent of supertypes.** The `~` marker at the start of a type-def body is the sole signal for `constructor: true` in resolver output. A composition like `uri_type => !!type ~string_type & atom_specification & { ... }` is a constructor because of the leading `~`, not because `string_type` is itself a constructor. Without the `~`, the same composition would produce a non-constructor type even though one of its supertypes is a constructor. Constructorness is a property of the definition, not inherited through IS-A.

Example combining a constructor supertype, a non-constructor mixin, and a tightening body:

```
atom_specification => !!type { spec: uri }
uri_type => !!type ~string_type & atom_specification & {
  spec:    = "https://www.rfc-editor.org/rfc/rfc3986"
  scheme:  string?
}
```

`uri_type` is a constructor (`~`), IS-A `string_type` and `atom_specification` directly. Its fields, in order: `string_type`'s four constraint fields (`min_length`, `max_length`, `length`, `pattern`), `atom_specification`'s one field (`spec`) — tightened in place by the body to `REQUIRED_FIXED` with the RFC 3986 URL — and `uri_type`'s new `scheme` field.

**Composition and narrowing accept parameterized type references.** Both `&` composition and bare-source narrowing operate on type-refs, which may carry type arguments. A narrowing of a parameterized type must re-declare its open parameters in its own `<>` slot (see §5 for partial application). Composing with a parameterized supertype works the same way: `vip => !!type <T> customer & box<T> & { ... }` declares `vip` as parameterized over `T`, with `T` flowing through to the `box` supertype's parameter slot.


### 4.3 Subtraction

Subtraction is the third type-level operation, complementing construction and narrowing. Where composition (`&`) adds fields and narrowing tightens existing ones, subtraction *removes* fields from an existing definition. Unlike composition and narrowing, subtraction deliberately breaks the IS-A relationship — the resulting type is no longer source-compatible.

Subtraction is expressed by writing `field: _` (bare `_`, no type-ref, no modifier) in a composition or narrowing body. The presence of any `field: _` in the body switches the operation from composition or narrowing into subtraction. One `field: _` is enough — once IS-A is broken, the resulting type is no longer source-compatible regardless of how many fields were removed.

```
account_public => !!type account & { password: _ }                       ; remove one field
account_minimal => !!type account & { password: _  internal_id: _ }       ; remove multiple
account_view => !!type account & { password: _  email: string ~ "n/a" }   ; mix with tightening
account_combined => !!type account & contact & { password: _ }            ; multi-source
account_via_narrowing => !!type account { password: _ }                   ; narrowing form
```

Both composition-form (`source & { ... }`) and narrowing-form (`source { ... }`) accept subtraction. The bare `_` after the field name is what signals removal.

**Rules.**

1. **Removing a nonexistent field is a resolver error.** `account & { nonexistent: _ }` fails at schema-load time. Symmetric with narrowing's "you can only tighten existing fields."

2. **Source path does not restrict subtraction.** If `account` was itself composed from `address & contact & { ... }`, then `account & { city: _ }` removes `city` regardless of which supertype originally introduced it. Subtraction operates on the merged field set, not on field provenance. Since IS-A is already broken, there is no contract to violate.

3. **Multi-source subtraction respects the diamond rule.** When subtracting in a composition with multiple sources, the diamond rule (§4.2) fires first: a field name appearing in more than one supertype path is a resolver error before subtraction is considered. Subtraction cannot be used to resolve diamond conflicts.

4. **Mixed subtraction and tightening is valid.** A single body may contain both `field: _` removals and ordinary tightening entries. All apply: removals drop the named fields; tightening entries refine the remaining inherited fields per the narrowing state-transition table.

5. **`field: _` and `field: type? = _` are distinct.** The bare `_` form is subtraction. The `= _` modifier form is fix-to-absent (OPTIONAL_FIXED with no value). The grammar disambiguates by whether a type-ref and `=` modifier are present.

6. **Empty subtraction does not exist.** `source & {}` is composition-with-no-additions and preserves IS-A. To produce a type that copies a source without IS-A, use a type-ref (`!!type source` produces a REFERENCE-kind entry per §13.2) or a trivial narrowing.

**IS-A and authorial intent.** Subtraction breaks the IS-A contract but preserves authorial lineage. The two `supertypes` fields in resolver output (§13.1) capture this distinction:

- `type_definition.supertypes` — the IS-A lattice (the validation contract). Subtraction produces an empty list: the subtracted type is no longer source-compatible.
- `record.supertypes` (in the body) — the authorial intent (where the fields came from). Preserved as the source list: the type is source-derived even though it is not source-compatible.

Consumers of resolver output that need to reconstruct subtraction lineage read `record.supertypes` from the body. Validators that check IS-A read `type_definition.supertypes` and see no obligations.

**Subtraction with parameterization.** Subtraction does not interact with parameterisation. A parameterised subtraction `!!type <T> customer<T> & { password: _ }` declares a parameterised type whose field set is `customer<T>`'s field set minus `password`. Materialisation per §5 proceeds as usual; the field set is just smaller.

**Annotations on removed fields.** A removed field's annotations (`@doc`, `@deprecated`, etc.) are lost in the subtracted type — the field does not exist, so neither does its metadata. Applications that need source-vs-subtracted diffs can compute them from both entries.

**Spectrum of completeness.** Subtraction completes the type-level operation vocabulary. See §10 for the full spectrum.


## 5. Templates and Parameters

A type definition may declare type parameters using `<>` immediately after `!!type`. Parameters are local names that can be referenced in the body of the definition; they are bound to concrete types when the definition is referenced with type arguments. A definition with parameters is a **template** — it has a known structure but cannot be instantiated directly because some types are not yet bound. References to a template MUST supply type arguments for all its parameters.

```
!schema {
  container => !!type <T> { items: array<T> }
  pair      => !!type <T, U> { first: T  second: U }
  box       => !!type <T> { contents: T  count: integer }
}
```

`container<string>`, `pair<string, integer>`, and `box<float>` are concrete types. Bare `container` or `pair` references (without `<>`) are resolver errors.

**Parameter scoping.** Parameters are local to the type definition that declares them. Within the body, parameter names take precedence over the schema namespace. Parameter names do not escape, do not compose across `&`, and two definitions can independently use the same parameter name without collision. When the resolver encounters a name in a type position, it walks scope outward: parameters of the enclosing definition first, then the schema namespace. The first match wins.

**Linked types via shared parameter names.** Two fields that must resolve to the same type share a parameter:

```
homogeneous_pair => !!type <T> { first: T  second: T }
transformation   => !!type <T> { input: T  output: T  function: string }
```

When `homogeneous_pair<string>` is referenced, both `first` and `second` resolve to `string`. There is no need for a separate "linking" mechanism — sharing a name is the link.

**Templates are not directly instantiable.** A `type_definition` with a non-empty parameter list cannot validate data. Attempting to use a template as a type annotation in data is a resolver error. Templates exist only to be referenced, with arguments, from other type definitions or from concrete data type annotations.

**Substitution.** Eager. When the resolver sees a parameterized reference like `container<string>`, it produces a fully-substituted `type_definition` in resolver output. Resolver output contains the template alongside its substituted instances; consumers can distinguish templates by inspecting their `parameters` field.

**Fully-bound references.** When all of a template's parameters are bound to concrete types at a use site, the result is a fully-applied reference — a named type that resolves to the substituted form. These are type references (kind: REFERENCE), not narrowings:

```
api_response => !!type <T> {
  status: integer
  data:   T
  errors: [error]
}

user_response       => !!type api_response<user>
user_list_response  => !!type api_response<[user]>
```

`user_response` and `user_list_response` bind `T` fully, producing reference-kind entries that point at their substituted forms. They do not declare parameters of their own because none remain.

**Partial application — parameter re-declaration.** When a narrowing of a parameterized type leaves some parameters open, it MUST re-declare those open parameters in its own `<>` slot. Implicit inheritance — where a narrowing tacitly inherits its parent's parameters — is not permitted. Every parameter has a visible declaration site.

```
stringly_keyed_map => !!type <V> map<string, V>
```

`stringly_keyed_map` is itself a template, parameterized by V, that binds K to `string` in its body. The chain composes: `stringly_keyed_map<integer>` resolves to `map<string, integer>` after both substitution layers.

The `_` token is not valid in field-type positions — see the absent sentinel position table in §2.4. Authors expressing "type to be filled later" use parameters; empty records use `{}`.


### 5.1 Self-Referential Types

Types may reference themselves. Recursive structures are valid:

```
!schema {
  node => !!type { value: string  children: [node] }
  tree => !!type { root: node  depth: integer? }
  linked_list => !!type <T> { value: T  next: linked_list<T>? }
}
```

The resolver MUST detect and handle cycles in type references. A self-referential type is complete as long as the recursive reference is through an optional field or a variable-length container (array, set, map). A required direct self-reference (`item => !!type { inner: item }`) creates an infinitely nested structure that MUST NOT be instantiated — the resolver SHOULD warn about such definitions. Parameterized recursive types compose normally: `linked_list<integer>` is a valid concrete type whose `next` field carries another `linked_list<integer>`.

**Recursive template materialisation.** When a parameterized type is referenced with concrete arguments (e.g. `linked_list<integer>`), the resolver materialises it as a single named entry in the schema namespace, named per §13.1's synthetic naming convention (`linked_list<integer>` → `linked_list#integer`). Recursive references within the body resolve to that name — `linked_list<integer>`'s `next: linked_list<integer>?` field references `linked_list#integer`, not an inlined recursive substitution. This produces one entry per unique `(template, argument-tuple)` pair, deduplicated by structural equivalence of the arguments. The same model applies to non-recursive templates: `box<integer>` and `box<string>` are two distinct entries, `box#integer` and `box#string`.


## 6. Annotations as Types

[TSON-DATA] §5.2 defines annotation syntax and preservation. This section defines annotation semantics: an annotation is a typed metadata attachment, resolved and validated against a type reachable through the schema chain.

Annotation values are always data values — concrete values, not type definitions. This applies both in data values and within the `!!type` grammar. An annotation on a type definition carries concrete metadata, not further type structure.

Annotation placement in data values follows [TSON-DATA] §5.2; the resolver preserves annotations in their authored positions. The type-definition grammar adds one further position: in `field-def` (§17.1), annotations precede the field name and annotate the field itself, mapping to the `record_field` in the resolver output.

In schema map entries, an annotation immediately preceding the key binds to the key. The convention `@doc:"..." name => !!type {...}` annotates `name` (the `type_name` token at the entry's key position), not the `type_definition` value. The resolver does not hoist annotations from the key to the value; if metadata about the type definition is intended, the annotation must precede the `!!type` directive on the value side: `name => @doc:"..." !!type {...}`.

**Annotations are types.** An annotation `@T` (or `@T:value`) names a type `T` and attaches it as metadata to the surrounding value. Annotation resolution is type-name resolution against the `!!schema` directive's chain only: `T` is looked up in the namespace populated by the schema chain (the active schema, its `!!schema` parent, and so on transitively up to a pre-loaded root). `!!import` entries and local entries of the schema currently being authored are NOT part of the annotation namespace. To use a type as an annotation in a document or schema, that type must be reachable through the `!!schema` chain — typically meaning the type lives in `meta.tn1` (which the meta-kernel chains through) or another schema chained as an ancestor of the active schema. The result is then validated against `T`'s contract:

- For `void`-targeted `T` (a type whose resolved body, after reference flattening, is `void` — such as `annotation` or `numeric`), the annotation form is `@T` with no colon and no value. Bare `@T` is shorthand for `@T:_`; the resolver fills the implicit `_` before validating against `T`'s parsing contract. The `void` atom (defined in meta-kernel and re-exported by core, see §12) admits the absent sentinel `_` (see §8) — presence is the information.
- For any non-`void` `T`, the annotation form is `@T:value`, where `value` is a single data-value that conforms to `T`. `@doc:"User's full name"` validates the string against `doc`. `@confidence:0.95` validates the float against `confidence`. `@person:{first_name: john last_name: smith}` validates the record against `person`.

Any type defined in the schema chain can be used as an annotation. There is no separate annotation namespace — annotations and types share names because an annotation *is* a typed metadata attachment. The chain-only restriction is what allows the kernel's `annotation => @annotation !!type void` self-reference to work: meta-kernel is pre-loaded into the library, so when the resolver encounters `@annotation` it finds the pre-loaded `annotation` definition, not the entry currently being defined.

**The `@annotation` marker is advisory.** The `annotation` type, defined in meta-kernel as `@annotation !!type void`, is a tooling hint: attaching `@annotation` to a type definition signals "this type is intended to be used as annotation metadata." Tools that surface "available annotations" filter by this marker to avoid enumerating every schema type. The marker carries no runtime force — a schema type without `@annotation` is no less usable as an annotation. A document writing `@person:{...}` against a `person` type without the `@annotation` marker is silently accepted; no warning, no error.

**Resolver-attached annotations.** Some annotations are not written by the schema author but are attached by the resolver during type resolution. The most common example is `@alias` (defined in `core.tn1`): when a reference is flattened in resolver output, the resolver attaches `@alias:name` to the resolved type, naming the source-level alias used at the reference site. A field declared as `f: email` where `email => !!type string` resolves to a type-ref pointing at `string` with `@alias:email` attached. This preserves the source-level intent (the author wrote `email`, not `string`) while keeping the validation graph minimal. See §13.2 for the reference flattening rule. Resolver-attached annotations follow the same resolution rules as user-written ones — the resolver attaches `@alias` because `string` is the right type for that metadata, not because of any privileged status.


```
@annotation
@deprecated:"use new_field instead"
@bounded:true
@bounded:false
@since:2025-01
@confidence:0.95
@doc:"User's full name"
@ordered:TOTAL
@numeric
```


## 7. Choice Types

A choice type declares that a value may conform to any one of a set of alternative types. Choice types are defined using parentheses and pipe separators within the `!!type` grammar:

```
!schema {
  contact_method => !!type (email | phone | address)
  shape => !!type (circle | rectangle | triangle)
  result => !!type (success | error)
}
```

A choice MUST contain at least two variants. Each variant is a type reference in the `type-ref` grammar.

At the data level, a value matching a choice type MUST carry a type annotation (`!variant`) that selects which variant applies. The validator does not infer the variant from structure — the type annotation is REQUIRED.

The choice type name is then used like any other type name in field definitions:

```
!schema {
  contact_method => !!type (email | phone | address)

  person => !!type {
    name: string
    contact: contact_method
    backup: contact_method?
    history: [contact_method; +]
  }
}
```

Choice types MAY also appear inline in type-ref positions: `contact: (email | phone)`.

A choice type in the schema model becomes a `choice` entry with a `variants` list of type references. The resolver validates that each variant names a distinct type in the schema's type map.


## 8. Type Construction (Meta-schema Level)

Type constructors are factories that produce type definitions. Constructors define the structural vocabulary for a family of related types. Within the `!!type` grammar, the `~` marker prefix indicates that a type definition is a constructor rather than a regular type:

```
!schema {
  record => !!type ~product & {
    access_pattern:  product_access_type = NAMED
    size_type:       product_size_type = FIXED
    fields:          [record_field]
    supertypes:      [type_name]?
  }

  array => !!type <T> ~product & {
    access_pattern:  product_access_type = INDEX
    size_type:       product_size_type = VARIABLE
    element_type:    T
    state:           element_state ~ REQUIRED
    unordered:       boolean ~ false
    unique_items:    boolean ~ false
    min_items:       integer?
    max_items:       integer?
  }

  set => !!type <T> ~array<T> {
    state:        = REQUIRED
    unordered:    = true
    unique_items: = true
  }
}
```

The `~` prefix is the constructor marker. It sets `constructor: true` in the resolver output's `type_definition` record. Constructors MUST NOT be instantiated directly in data — only their narrowings and instances can.

Constructors may declare type parameters using `<T>` (or `<K, V>` etc.) immediately after `!!type`. Parameter names are scoped to the constructor's body and may appear in field positions wherever a type-ref is expected. References to a parameterized constructor MUST supply matching type arguments via `<>`. See §5 for full parameter semantics.

Note: The `~` character has two distinct uses in the `!!type` grammar, disambiguated entirely by position:

1. **Default value modifier** in a field definition, after a type-ref: `port: integer ~ 8080`. Here `~` introduces the default value for a `REQUIRED_DEFAULT` field.
2. **Constructor marker** at the start of a type-def body: `!!type ~product & { ... }`, or after a parameter list: `!!type <T> ~array<T> { ... }`. Here `~` marks the definition as a constructor rather than a regular type.

The second use covers both composing a new constructor with a base kind (`~product & {...}`) and narrowing an existing parameterized constructor (`~array<T> {...}`, as in the definition of `set`). Both are constructor-producing operations; the `~` signals that in both cases.

The two uses are grammatically distinct and cannot conflict: `~` at a field-def's value position is always a default modifier; `~` at the start of a type-def body (with or without a preceding parameter list) is always the constructor marker.

Constructors serve two roles depending on where they appear:

**Meta-schema constructors** define what the `!!type` grammar produces. The meta-schema's `record`, `enum`, `array`, and other constructors define the shapes that different `!!type` forms create.

**Type library constructors** define type families in user schemas and type libraries. Their members are created through construction, narrowing, or instantiation (§10). Meta defines `binary` as a constructor with a required `encoding` field, with `base64`, `base64url`, `base32`, and `hex` each produced by `!!type !binary BASE64` etc. Meta also defines `extern` for external sum types and `unknown_type` whose instance `unknown` accepts any well-formed value of any type.

The `~` marker is orthogonal to composition and narrowing:

- `~product & { ... }` — constructor composing with a base kind
- `~array<T> { ... }` — parameterized constructor narrowing another parameterized constructor

Constructor narrowing differs from regular narrowing: fixed values CAN be replaced because constructors are meta-level definitions. When `set` narrows `array` and changes `unordered` from `~ false` to `= true`, it is defining a new constructor with different output characteristics.

**Constraint-vocabulary atom constructors.** Atom families whose instances can be narrowed with constraint values (min/max, length, pattern, etc.) are defined as pairs: a constructor carrying the constraint vocabulary and a canonical empty instance. The constructor composes with `atom` via `~atom & {...}` and lists the family's narrowable fields as an ordinary record body. The instance is produced with `!<constructor> {}`, an empty construction that records `source: <constructor>` but establishes no IS-A relationship with it (construction transfers kind, not supertypes).

Meta defines this pattern for the types it needs internally: `integer_type` / `integer`, `string_type` / `string`, `uri_type` / `uri`, `regex_type` / `regex`. Meta-core adds the numeric, temporal, identifier, and text constructors: `real_type` / `real`, `decimal_type` / `decimal`, `rational_type` / `rational`, `date_type` / `date`, `time_type` / `time`, `datetime_type` / `datetime`, `duration_type` / `duration`, `uuid_type` / `uuid`, `email_type` / `email`. Spec-bound constructors additionally compose with the `atom_specification` mixin and pin their `spec` field to the governing specification URL.

Narrowings of these atoms use the instance form: `uint8 => !!type !integer { min: 0  max: 255 }`. This narrows the `integer` instance, producing a new type with `source: integer_type`, `supertypes: [integer]`, and a body `!integer_type { min: 0 max: 255 }`. Instance narrowing establishes IS-A with the narrowed parent; the new type can be narrowed further.

**The `unit` atom constructor.** Atoms with no constraint vocabulary are constructed from `unit` — an atom constructor with zero fields, the atom equivalent of the empty record `{}` for products. Meta-kernel defines `unit` directly. Its instances are opaque atoms — atoms whose values the schema language cannot further describe, distinguished from each other by name and by prose-level parsing contract (§15). Meta-kernel defines three such instances:

- `value` — admits [TSON-DATA] §6 products (null, boolean, UNF number, string). The escape hatch for fields whose type the schema language cannot express (see §12 and the `record_field.value` declaration).
- `token` — admits NFC-normalised lexemes. Used for identifier types (`type_name`, `field_name`, `param_name`) and enum members.
- `void` — the unit type of absence: admits the absent sentinel `_` as its single canonical value (and the token `null` as an equivalent spelling, normalised to `_`; see below). Used as the target type for bare annotations like `@annotation` and `@numeric` (see §6), and usable in data as a field type or choice variant meaning "no value" — the opposite pole to `unknown` (any value ↔ no value).

Core adds `complex` — host-defined complex-number representation. The kernel's `void` is re-exported in core under the same name so that core-only schemas can target it (see §12). Kind determination per §3.3 ensures all four are `kind: ATOM`.

**`void` and `null`.** `void` is the type of absence; its canonical value is `_`. As a JSON-ergonomics concession, a `void`-typed position also accepts the token `null` as an equivalent spelling of `_`, normalised to absence — safe because `void` has a single inhabitant, so `null` and `_` cannot denote different things there. The concession is local to `void`: everywhere else `_` (absence) and `null` (the base null value, [TSON-DATA] §6.1) remain distinct, a distinction that `value`- and `unknown`-typed positions rely on. Authors SHOULD write `_`; `null` is tolerated but discouraged, and a `void` position round-trips to `_`.

User schemas SHOULD NOT introduce additional unit instances without a documented parsing contract — the schema-level distinction between two unit instances is purely nominal, so adding one solely as a marker is reasonable, but inventing parsing semantics that conflict with the kernel's three is a recipe for confusion.

See §3.3 for the rule that determines a constructor's kind from its transitive supertypes chain. Constructors composing with multiple base kinds are resolver errors.

This establishes a pattern: **types whose validation requires no constraint vocabulary are built as instances of `unit`, not as bespoke empty constructors.** Marker types (`annotation`, `numeric`), opaque types whose structure the schema language cannot describe (`value`, `complex`), and semantic tags where all the meaning lives in the type name or its annotations are all good fits. A new type should reach for a dedicated constructor only when it carries a non-empty constraint vocabulary of its own.

Two kinds of atoms, one representation: every atom in the type system — constraint-bearing or not — appears in resolver output with a constructor instance in its `body`, produced via the `!<ctor> {}` or `!<ctor> { values }` form.


## 9. Directives

[TSON-DATA] §5.3 defines the directive mechanism: the two syntactic forms (configuration and value-producing), the directive registry, name localisation, and unknown-directive handling. This document registers the five operations of the TSON directive registry:

| Operation | Canonical name | Form | Defined in |
|-----------|----------------|------|------------|
| Schema identification | `schema` | configuration | §9.1 |
| Schema identity declaration | `id` | configuration | §9.1 |
| Type-library import | `import` | configuration | §9.1 |
| External inclusion | `include` | configuration | §9.1 |
| Type definition | `type` | value-producing | §9.2 |

Implementations MUST NOT introduce operations beyond these five. For a processor implementing this document, `!!type` is a known value-producing directive that activates the type-definition grammar (§17.1); all five canonical English names MUST be recognised. Per-directive multiplicity and coexistence constraints are given in §17.4.

### 9.1 Document Directives

**`!!schema`** — Identifies the schema whose types are available for `!name` references in the value that follows. The directive value is a URL string identifying a published schema.

```
!!schema:"http://example.com/people.tn1?sha256=c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5"
!person { name: Alice age: 30 }
```

When a `!!schema` directive appears on a value, the referenced schema becomes the active scope for all `!name` type annotations within that value and its descendants. When the value ends, the scope reverts to the enclosing scope. Nested `!!schema` directives override the enclosing scope for their value.

A document-level `!!schema` directive establishes the scope for the entire document. When used on a schema document (one containing type definitions), it identifies the meta-schema that governs the definitions. When used on a data document, it identifies the schema for type resolution.

A document with no `!!schema` directive has no type vocabulary. Base type resolution ([TSON-DATA] §6) applies — unquoted tokens are resolved as null, boolean, integer, float, or string. Type annotations in such a document are limited to the built-in annotations defined in [TSON-TYPES] (e.g. `!uuid`, `!base64`, `!datetime`); any other type annotation is unresolved — the parser preserves it as a syntactic marker, but the resolver cannot validate it. Applications processing documents without `!!schema` SHOULD treat unresolved type annotations as informational.

**`!!id`** — Declares the authoritative identity (URL) of a schema document. The `!!id` value is the URL that other documents use in their `!!schema` directives to reference this schema. It connects the file's content to its logical name in the schema library (§14).

`!!id` is RECOMMENDED on all published schemas. When schemas are committed to version control alongside application code — a common and supported deployment pattern — the `!!id` directive is what connects the file on disk to the URL that data documents reference. Without `!!id`, the mapping from filename to schema URL is implicit and fragile; with it, any tool or implementation can register the schema under the correct URL by reading the file's own declaration.

```
!!id:"http://example.com/people.tn1"
!!schema:"http://tson.io/1/m/meta.tn1"
!!import:"http://tson.io/1/m/core.tn1"
!schema {
  person => !!type { name: string  age: integer }
}
```

An application loading schemas from local files registers each one in the schema library under the URL declared by its `!!id`. The schema's URL does not need to be fetchable — it is a globally unique identifier, not a network address.

**`!!import`** — Imports type entries from an external schema into the schema map that follows. The directive value is a URL string identifying a published TSON schema map.

`!!import` MUST appear only immediately before a schema map value. The directive loads the referenced schema map and makes its locally-defined entries available as if they were defined in the local schema. Imported entries are available to all local entries (including for recursive references), and local entries may narrow or compose with imported types.

**Imports are shallow.** Only the entries defined in the imported schema's own map are imported — entries that the imported schema itself brought in via its own `!!import` directives are not transitively included. Each schema MUST explicitly import all the dependencies it needs.

```
!!schema:"http://tson.io/1/m/meta.tn1"
!!import:"http://tson.io/1/m/core.tn1"
!!import:"http://example.com/medical-types.tn1"
!schema {
  patient => !!type { name: string  dob: date  blood_type: blood_type }
}
```

Here `string` and `date` come from the core library, `blood_type` from the domain library, and `patient` is a local definition. If `medical-types.tn1` itself imports `core-a1.tn1`, those transitive entries are not included — only `blood_type` and any other entries defined directly in `medical-types.tn1` are available.

Multiple `!!import` directives are permitted and are loaded in declaration order. Each import adds its locally-defined entries to the accumulated type-name namespace (§11.3). If two imports define the same key, or if an import defines a key that also appears as a local entry in the following schema, the collision is a resolver error and the entire schema fails to load. Imports populate only the type-name namespace, so an import name that happens to match a name reachable through the `!!schema` chain is not a collision — the two live in separate namespaces.

Import cycles are permitted. Because imports are shallow, a cycle between two schemas does not blow up — each schema's own entries are a finite set, and only those entries cross the import. Two schemas that import each other and use any third-party type must each import that type independently.

The imported schema MUST itself be a valid TSON schema — a document whose core value is a schema map. The imported schema's own `!!schema` and `!!import` directives are resolved independently to produce the schema's type definitions, but only the entries defined in its own map are available for import.

**`!!include`** — Replaces the value position with the contents of an external TSON file. The directive value is a URL string identifying a TSON document.

`!!include` MUST be the only directive on the value, and the value that follows MUST be the absent sentinel `_`. The resolver loads the referenced TSON document and replaces the `_` with the document's core value. No translation or type resolution occurs — the included value is inserted as-is, preserving its original structure and any augmentation it carries.

```
{
  defaults: !!include:"http://example.com/defaults.tn1" _
  users: !!include:"http://example.com/users.tn1" _
}
```

The `_` is required to make the inclusion point syntactically explicit. A `!!include` directive without a following `_`, or combined with other directives on the same value, is a parse error. The included document is a complete TSON document — its value may be any TSON value (record, array, scalar, etc.).

**Schema scope does not propagate across inclusion boundaries.** The included value retains whatever schema context its source document declares. If the source document carries its own `!!schema` directive, type annotations within the included value resolve against that schema. If the source document has no `!!schema` directive, base type resolution ([TSON-DATA] §6) applies to the included value — type annotations are syntactically preserved but cannot be resolved, since base type resolution recognises only null, boolean, UNF number, and string. The including document's schema is never consulted for content within the inclusion.

**Inclusion is value substitution.** `!!include` parses and resolves the referenced document as a complete, independent unit. The document's resolved value replaces the `_` at the include site. Nothing other than the resolved value crosses the boundary:

- **Schema scope** (per the rule above): the included document's schema scope governs interpretation of its own content; the including document's `!!schema` is not consulted for included content. Symmetrically, the included document's `!!schema` does not affect the including document.
- **The included document's `!!id`.** Ignored at the inclusion point. `!!id` declares schema identity; the including document treats the inclusion as a value, not as a schema reference.
- **Other directives in the included document.** Resolved during the included document's own resolution. They do not appear in the including document's output — the only thing that crosses is the resolved value.

**Placement.** `!!include` produces a data value. It is valid wherever a data value is valid: as the value of a record field or map entry, as an array element, as the document's top-level value. It MUST NOT appear in the `!!type` directive grammar (type-def is not a data-value position) — an `!!include` inside a `!!type` body is a parse error. Top-level use is structurally permitted but rarely useful: a document consisting solely of `!!include:"..." _` is just a redirect to the included file.

**Typed-position restriction.** An `!!include` directive at a position whose type is constrained by the outer schema is a resolver error unless the outer type is one of the permissive types: `extern`, `value`, `unknown`, or a container thereof (e.g. `[extern]`, `map<string, value>`). The outer schema must opt in to receiving external content at each position where inclusion is permitted. This prevents the silent substitution of foreign-shaped values into specifically-typed slots. Applications wanting external content at a specific-typed field must restructure the outer schema to use a permissive type at that position. Schemaless outer documents have no type expectations and always permit `!!include`. Once the inclusion is permitted and the external document resolves, the substituted value is a host-language value at the outer position; host-language assignment rules handle any further compatibility concerns, but the TSON-level permissive-type check is the gatekeeper.

**Directive conflict rules.** Per-directive multiplicity and coexistence constraints are enforced by the parser. See §17.4 for the complete table.


### 9.2 The !!type Directive

The `!!type` directive is the single type definition directive. It activates a specialized grammar for the value that follows, producing a type definition in the resolver's output.

`!!type` is valid only on map entry values within a schema map (a map tagged with `!schema`). On map entries outside a schema map, the type directive is a resolver error — this is a resolver concern, not a parser concern ([TSON-DATA] §4.2).

The `!!type` grammar supports the following forms:

**Fresh record definition** — defines a record type with named fields:

```
person => !!type { name: string  age: integer }
```

**Supertype composition** — combines parent types with new fields via `&`:

```
employee => !!type person & contact & { department: string }
```

**Record narrowing** — refines existing fields without adding new ones:

```
elder => !!type person { age: age  role: = retired }
production => !!type config { host: = "prod.example.com"  port: = 9090 }
```

**Constructor instantiation** — produces a constructor instance (see §3.3):

```
integer => !!type !integer_type {}
boolean => !!type !enum [true false]
base64 => !!type !binary BASE64
```

**Instance narrowing** — narrows a constructor instance by tightening its constructor's fields (see §3.3):

```
age => !!type !integer { min: 0  max: 150 }
uint8 => !!type !integer { min: 0  max: 255 }
status => !!type !enum [ACTIVE INACTIVE SUSPENDED]
```

**Constructor definition** — the `~` marker creates a type factory:

```
record => !!type ~product & { fields: [record_field]  supertypes: [type_name]? }
set    => !!type <T> ~array<T> { unordered: = true  unique_items: = true }
```

**Type reference** — names an existing type:

```
timestamp => !!type datetime
int => !!type integer
```

**Array type:**

```
scores => !!type [integer; +]
matrix => !!type [[float; 3]; 3]
```

**Tuple type:**

```
point => !!type [float, float]
coordinate => !!type [float float float?]
```

**Choice type:**

```
contact_method => !!type (email | phone | address)
```

**Type with generic arguments:**

```
translations => !!type map<string, string>
lookup => !!type map<string, [integer; +]>
```

Schema map entry values MAY carry either a `!!type` directive (the sugared form) or a literal `!type_definition` record (the desugared form, used by resolver output for round-trip). Both produce a `type_definition` in the namespace. Other map-entry values are resolver errors — schema entries are typed `type_definition` per the kernel, and only these two shapes produce that type. See §11.7 for the round-trip rationale.

Unknown directive handling follows [TSON-DATA] §5.3: unknown configuration directives are preserved; unknown value-producing directives are parse errors.


## 10. The Spectrum of Completeness

TSON has three type-level operations and one data-level action. **Construction** creates new type definitions. **Narrowing** refines existing definitions by tightening fields while preserving the IS-A relationship. **Subtraction** removes fields from an existing definition, deliberately breaking IS-A while preserving authorial lineage. **Instantiation** produces concrete values from a definition. Each operation is described below.

| Operation     | Section | IS-A | Adds fields | Removes fields | Tightens fields |
|---------------|---------|------|-------------|----------------|-----------------|
| Construction  | §3.3, §8 | new                     | yes | n/a | n/a |
| Composition   | §4.2  | preserved (each parent) | yes | no  | yes |
| Narrowing     | §4.1    | preserved (source)      | no  | no  | yes |
| Subtraction   | §4.3  | broken                  | no  | yes | yes (mixed) |
| Instantiation | §3.3, §10.4 | n/a (data)         | n/a | n/a | n/a |


### 10.1 Construction

Construction creates new type definitions. The `!!type` directive is the construction mechanism:

```
person => !!type { name: string  age: integer }
status => !!type !enum [ACTIVE INACTIVE SUSPENDED]
point => !!type [float, float]
contact_method => !!type (email | phone | address)
age => !!type !integer { min: 0  max: 150 }
```

Supertype composition with `&` is a construction tool that combines parts from existing definitions:

```
employee => !!type person & contact & { department: string }
```


### 10.2 Narrowing

Narrowing copies an existing definition and refines it by binding parameters or tightening values. The result is a new definition with its own identity that IS-A the source. A source type name without `&` marks narrowing:

```
config => !!type { host: string  port: integer ~ 8080  debug: boolean = false }
production => !!type config { host: = "prod.example.com"  port: = 9090 }
```

The result maintains an is-a relationship with the source. Every consumer expecting a `config` can accept a `production`.


### 10.3 Subtraction

Subtraction removes fields from an existing definition. Like narrowing, it transforms an existing type; unlike narrowing, it deliberately breaks IS-A. The `field: _` form in a composition or narrowing body marks subtraction:

```
account => !!type { name: string  email: string  password: string }
account_public => !!type account & { password: _ }
```

`account_public` is not an `account` — IS-A is broken — but its body's `record.supertypes` preserves the authorial lineage. See §4.3 for the full rules.


### 10.4 Instantiation

Instantiation produces concrete data from a type definition. The type annotation `!` marks instantiation:

```
{
  server1: !production { label: "server1" }
}
```

An instance is terminal. It MUST NOT be narrowed. It MUST NOT be further instantiated. The data is concrete.

All parameters in the definition MUST be bound before instantiation. A type_definition with unbound parameters is a template and cannot be instantiated; templates must be referenced with type arguments to produce instantiable types. See §5 for parameter declaration and binding.

**Default injection.** When a field has `state: REQUIRED_DEFAULT` and the data does not provide a value, the decoder injects the default value into the output. Decoded values are fully populated; consumers do not need to consult the schema to retrieve defaults. This affects round-trip serialisation: a value decoded with defaults injected and then re-encoded will include the default values explicitly. The same rule applies to `REQUIRED_FIXED` fields when the data omits them — the fixed value is injected.


## 11. The Schema Chain

A TSON document never resolves type annotations against its own definitions. This is the fundamental rule of schema-value separation: every type annotation (`!name`) in a document resolves against an external schema — the schema identified by the document's `!!schema` directive. The document may define new types (as entries in a schema map), but those definitions cannot be used via `!` references within the same document. They exist only for consumers of the published schema.

Inside a schema map (marked with `!schema`), type names used in type-ref positions within the `!!type` grammar resolve against the type-name namespace: local entries and entries brought in by `!!import`, with key collisions rejected as errors (§9.1). Any entry can reference any other entry, including itself — enabling recursive type definitions. Structural forms produced by the `!!type` grammar (`!record`, `!record_field`, `!enum`, etc. in resolver output) resolve against the structure namespace provided by the meta-schema identified by `!!schema`. The two namespaces are distinct and are described in full in §11.3. In data mode, `!name` type annotations resolve only against the type-name namespace of the schema identified by `!!schema`.

This rule has no exceptions. It applies to data documents, user schema documents, extended meta-schema documents, and the meta-schema itself.


### 11.1 The Resolution Chain

Every TSON document that uses type annotations participates in a resolution chain. Each link in the chain is a document with a `!!schema` directive, and that schema is itself a document with its own `!!schema`:

```
data document
  └─ !!schema → user schema
                  └─ !!schema → meta-schema
                                  └─ !!schema → itself (pre-loaded)
```

At each level, the `!!schema` directive identifies the schema whose types are available for `!name` references within that document:

- A **data document** carries `!!schema` pointing to a user schema. Type annotations like `!person`, `!uuid`, and `!email` resolve against the types defined in that user schema.

- A **user schema** carries `!!schema` pointing to the meta-schema, and `!!import` directives to bring in type library types. Type names used as type-refs within the `!!type` grammar (e.g. `string`, `integer` in record field definitions) resolve against the user schema's type-name namespace — its local entries and imports, not the meta-schema chain (§11.3). The meta-schema provides the structural vocabulary (`record`, `array`, `enum`, etc.) that the `!!type` directive produces. The user schema defines new types (`person`, `employee`, `api_response`) as map entries — those names are available only to documents that reference this schema via their own `!!schema` directive.

- The **meta-schema** carries `!!schema` pointing to its own URL. It defines its own core types (`integer`, `string`, `boolean`) directly for use in its own constraint-field definitions. The meta-schema's URL resolves to a pre-loaded Schema object in the schema library.


### 11.2 Schema-Value Separation

The separation between a document and its schema serves two purposes:

**Immutability.** A schema is a published, immutable artifact. Once a schema is published at a URL with a content hash, its type definitions do not change. Data documents reference schemas by URL. The data can change; the schema it was validated against cannot.

**Unambiguous resolution.** Because type references always resolve against an external schema, there is no ambiguity about what `!string` means in a given document. It means whatever the referenced schema defines it to mean. Two documents referencing the same schema have identical type vocabularies. Two documents referencing different schemas may give different meanings to the same name.

A document with no `!!schema` directive has no type vocabulary. Base type resolution ([TSON-DATA] §6) applies, providing default interpretation of unquoted tokens as null, boolean, integer, float, or string. Type annotations in such a document are limited to the built-in annotations defined in [TSON-TYPES] (e.g. `!uuid`, `!base64`); any other type annotation is unresolved — the parser preserves it as a syntactic marker, but the resolver cannot validate it. Applications processing documents without `!!schema` SHOULD treat unresolved type annotations as informational.


### 11.3 Schema Layering

The directive architecture separates three layers:

**Meta-schema** — Defines the structural vocabulary that the `!!type` grammar produces: `type_definition`, `record`, `record_field`, `array`, `enum`, and so on. A schema's `!!schema` directive points to its meta-schema; when the resolver sees `!!type { ... }` in that schema, the directive body is interpreted against the meta-schema's vocabulary.

**Type libraries** — Define specific types (`integer`, `string`, `boolean`, `float`, `decimal`, etc.) using the meta-schema's vocabulary. Type libraries are ordinary schemas. A schema author imports the library that matches their target platform via `!!import`.

**Application schemas** — Import type libraries and define domain types on top of them.

Each schema has two independent namespaces active during resolution. They are used at different positions in the grammar and have different lookup rules.

#### 11.3.1 The Structure Namespace

The **structure namespace** provides the vocabulary produced by the `!!type` directive. When `!!type { fields: ... }` resolves, the resulting `type_definition` carries annotations like `!record`, `!record_field`, `!enum`, `!reference`. These are not written by the schema author — they are produced by the resolver to express the structure of the definition in the resolver output. They come from the meta-schema identified by `!!schema`, resolved through its chain.

Lookup for the structure namespace walks:
1. Entries in the schema named by `!!schema`.
2. Recursively, that schema's own `!!schema` chain.

The structure namespace is NOT consulted for user-written type references. It provides the kinds, constructors, and supporting types that the resolver uses to materialise `!!type` output.

#### 11.3.2 The Type-Name Namespace

The **type-name namespace** provides the names a schema author can use as type-refs in their own definitions. When a field is written as `street: string`, the name `string` resolves against this namespace. When a `!!type` body references another type by name (`vip => !!type customer & { ... }`), `customer` resolves against this namespace.

Lookup for the type-name namespace walks, in order:
1. Parameters of the enclosing definition (§5).
2. Local entries of the current schema map.
3. Entries brought in by `!!import` directives, in declaration order.

The type-name namespace is NOT extended by the `!!schema` chain. Names available through `!!schema` are available for the structure positions only, not as type-refs.

Names from `!!import` directives must be disjoint — two imports defining the same name, or an import name matching a local entry, is a hard error. This is because imports are flat-merged into a single pool.

#### 11.3.3 Why Two Namespaces

The separation answers a problem that arises in any language with a meta-schema: if every schema inherited its meta-schema's type names as ordinary references, user schemas chaining to meta would automatically see the kernel's `integer` without importing core. That would make the type library unnecessary for meta-derived schemas and violate the design principle that schemas declare their dependencies explicitly via `!!import`.

The two-namespace model makes the dependency direction clean. A schema's `!!schema` brings in the structural vocabulary it needs to *build* type definitions. Its `!!import` brings in the type library it needs to *write* type definitions. The kernel's `integer` exists for the kernel's own constraint-field declarations (`integer_type.min: integer?`); it never leaks into application schemas that happen to chain through meta.

The meta layer is the canonical example. Meta's `!!schema` is meta-kernel, so meta's `!!type` forms can use the kernel's constructors like `~atom &`. Meta also `!!import`s meta-kernel, which brings the kernel's type names (`type_name`, `uri`, `regex`, `integer`, `string`) into meta's type-name namespace so they can appear as field types in meta's own constructor definitions.

#### 11.3.4 Annotation Resolution

Annotations are types but follow a different lookup rule than ordinary type-refs. An annotation `@name` or `@name:value` resolves through the **`!!schema` chain only** — neither `!!import` entries nor local entries of the schema being authored are part of the annotation namespace. The schema chain is the only path available for annotation resolution.

This is why `meta-kernel.tn1`'s `annotation => @annotation !!type void` works: the kernel self-references via `!!schema:"...meta-kernel.tn1"`, and the kernel is pre-loaded into the library before any document — including the kernel file itself — is parsed. When the resolver encounters `@annotation`, it finds the pre-loaded `annotation` definition, not the entry currently being defined.

A consequence: types intended to be used as annotations must live in a schema reachable through the schema chain. Application-level annotation types (`@deprecated`, `@since`, `@lang`, etc.) are defined in `meta.tn1` so they are reachable from any schema chaining through meta. Defining a custom annotation in a user schema and trying to use it as `@my_annotation` within that same schema is a resolver error — `my_annotation` is a local entry, not in the chain.

#### 11.3.5 Data Documents and Schema Layering

A data document's `!!schema` points to a single user schema. Type annotations in the data (`!person`, `!uuid`) resolve against that user schema's type-name namespace — its local entries plus the entries it imports via `!!import`. The data document cannot reach types defined only in meta or meta-kernel through the user schema's `!!schema` chain.

This is intentional. A data document depends on the types its producer and consumer agreed on, and that agreement is the user schema. The layers above the user schema — the meta-schema that governs how the user schema was written — are implementation machinery, not part of the data contract. If a data document needs a core type like `uuid` or `datetime`, that type must be imported into the user schema so it appears in the user schema's type-name namespace.

#### 11.3.6 Duplicate Names Across Layers

A type name defined in both the meta-schema and a type library is not a conflict. Because the two namespaces are distinct, the kernel's `string` is not visible as a type-ref in core.tn1 — only core's locally-defined `string` is. User schemas importing core see core's `string`. The kernel's `string` is reachable only from schemas whose `!!schema` chain leads to the kernel's own namespace for structure resolution.

An extended meta-schema MAY `!!import` a type library. Name overlaps between the chain and imports do not collide because they populate different namespaces.


### 11.4 Schema Evolution

Each published schema version is immutable. There is no backward-compatibility mechanism at the schema level. Version N and version N+1 of a schema are independent, immutable artifacts with different content hashes and different URLs. A schema's identity is its exact byte content.

A server or application MAY accept data validated against multiple schema versions — this is a deployment concern, not a schema concern. The TSON specification does not define version negotiation, migration rules, or compatibility checks between schema versions.

See §2.1 for the records-are-closed rule. Schema evolution is handled by publishing a new schema version; there is no in-schema mechanism for backward compatibility.


### 11.5 The Meta-Schema Bootstrap

The resolution chain terminates at the meta-kernel. The kernel's `!!schema` directive references a URL that resolves to itself. This is not circular — it is a bootstrap.

The kernel's types (`schema`, `record`, `record_field`, `integer`, `string`, `boolean`, and all other types defined in `meta-kernel.tn1`) are pre-loaded into the schema library by the implementation. They exist as in-memory structures before any document is parsed. When the kernel document is parsed, its type annotations resolve against these pre-loaded structures through the normal schema library lookup — the library receives the URL, finds the pre-loaded Schema object, and returns it.

The meta schema (`meta.tn1`) is also pre-loaded. Its `!!schema` points at meta-kernel; its additional constructors (`binary`, `extern`, `unknown_type`, and the numeric/temporal/identifier/text constraint constructors) are likewise resolved against the pre-loaded kernel before being registered as pre-loaded entries themselves.

See §12 for the kernel's inline description and a narrative account of meta.

The kernel defines its own core types (`integer`, `string`, `boolean`, etc.) directly so that its own constraint-field declarations (`integer_type.min: integer?`, `record_field.name: field_name`) can reference them locally. The kernel's local entries are what the `!!schema` chain delivers to chaining schemas as their structure namespace. These types are NOT automatically available as type-refs in chaining schemas — per §11.3, the chain populates the structure namespace, not the type-name namespace. Schemas that want `integer` or `string` available as type-refs import a type library that defines them (typically `core.tn1`).

The kernel and meta documents are descriptions of the pre-loaded types, not the source of them. Parsing them validates that the document's description matches the implementation's in-memory model. If they disagree, the document is invalid — the in-memory model is authoritative.


#### 11.5.1 Two-Pass Resolution

Schema resolution proceeds in two passes per schema, with imports fully resolved before either pass runs on the importing schema.

**Pass 1 — Name population.** The resolver collects all entry names in the schema map. The schema's type-name namespace is populated with skeleton `type_definition` records keyed by name. Bodies are not yet validated.

**Pass 2 — Body resolution and validation.** The resolver resolves each entry's body against the populated namespace. Forward references between local entries work in this pass — every name is in the namespace by the time bodies are resolved. The resolver validates that references resolve, that composition and narrowing rules hold, that type arguments match parameter arities. It computes the transitive IS-A graph (`type_definition.supertypes`) and derives the inverse (`type_definition.subtypes`).

**Imports run first.** When a schema has `!!import` directives, the imported schemas are fully resolved (recursive two-pass) before either pass on the importing schema begins. By the time Pass 1 collects local names, every imported name is already present in the type-name namespace. Collisions between imports and local entries surface at this point. The order is:

1. For each `!!import` in declaration order: fully resolve the imported schema (recursive two-pass). Merge its local entries into the importing schema's accumulating type-name namespace. Collisions between imports are resolver errors (§9.1).
2. Pass 1 for the importing schema: collect local entry names. Collision between a local name and an already-merged import is a resolver error.
3. Pass 2 for the importing schema: resolve bodies against the populated namespace.

**Forward references are permitted within a schema map.** A type definition may reference any other entry in the same schema, declared earlier or later. Schema entries form a mutually-visible declaration namespace. The two-pass resolution model is what makes forward references work without backtracking.

**Annotations resolve through the schema chain only** (§11.3.4) — not through the local Pass 1 namespace and not through imports. The bootstrap's pre-loaded kernel provides the annotation vocabulary for the kernel itself; user schemas reach annotation types through the `!!schema` chain.


### 11.6 Cross-Schema Type References

The schema chain is not the only mechanism for cross-schema references. A type definition may reference types from a different schema through the `extern` constructor (defined in `meta.tn1`). An `extern` type carries a `schema` field (a URL identifying the external schema) and an optional `types` field (a list of permitted type references from that schema). The schema library resolves the URL to a Schema object and looks up named types within it. When `types` is absent, any type from the external schema is accepted; when present, only the listed types are accepted.

`extern` is a sum constructor — its membership is the set of types defined in the named schema (optionally narrowed by `types`). It joins `choice` and `unknown_type` in the family of sum-shaped constructors. Where `choice` enumerates variants explicitly, `extern` defers to an external schema for the variant set.

The companion type `unknown` (defined in `core.tn1`) is a sum instance with universe membership — it accepts any well-formed value of any type, with no constraint on the type's source. `unknown` is produced as `!!type !unknown_type {}` — an empty instance of the `unknown_type` constructor defined in `meta.tn1`. `unknown` is the right tool when the parent schema has no contract at all on what the data will be; `extern` is the right tool when the parent schema knows the data belongs to a specific external schema but does not import it.

At the data level, values matched by an `extern` field MUST carry their own `!!schema` directive identifying the external schema and a `!type` annotation identifying the type within it. Schema scope changes are always visible in the data, never implicit. When the parser encounters a `!!schema` directive on a value within a document, it pushes the new schema scope for that value. When the value ends, the scope reverts to the enclosing scope. This provides lexically scoped schema switching:

```
!!schema:"https://tson.io/1/medical/patient.tn1?sha256=a4f2e8d1c3b5a7f9e2d4c6b8a0f1e3d5c7b9a2f4e6d8c0b3a5f7e9d1c4b6a8f0"
!patient_record {
  patient: "1234"
  attachments: [
    !!schema:"https://tson.io/1/insurance/claim.tn1?sha256=f8b2a1d3c5e7f9a1b3d5e7f9a2b4d6e8f0a3b5d7e9f1a4b6d8e0f2a5b7d9e1f3"
    !insurance_claim {
      claim_id: CLM-5678
      amount: 450.00
      provider: "City Medical"
    }
    !!schema:"https://tson.io/1/radiology/report.tn1?sha256=d4e9c7f1a3b5d7e9f2a4b6d8e0f3a5b7d9e1f4a6b8d0e2f5a7b9d1e3f6a8b0d2"
    !radiology_report {
      study_id: RAD-9012
      modality: MRI
      findings: Normal
    }
  ]
}
```

Each `!!schema` directive opens a schema scope for the value that follows. The scope is bounded by the value — when the `!insurance_claim` record closes, the patient schema becomes active again. The scope depth is bounded by the document's containment depth.

For multi-schema heterogeneous arrays, declare the field as `[extern]` — an array of `extern`. Each element carries its own `!!schema` and `!type` annotations independently:

```
attachments: [extern]
```

No new constructor is needed; `extern` composes naturally with the existing array type.

**Typed-position restriction.** A nested `!!schema` directive at a position whose type is constrained by the outer schema is a resolver error unless the outer type is one of the permissive types: `extern`, `value`, `unknown`, or a container thereof (e.g. `[extern]`, `map<string, value>`). This is the same rule that governs `!!include` placement (§9.1). The outer schema must opt in to receiving foreign values at each position where schema switching is permitted. Without this rule, a `!!schema` directive could silently substitute a value of any shape into a specifically-typed slot, with the mismatch surfacing only at the host-language assignment boundary. The permissive-type requirement makes cross-schema acceptance authored intent, not accident. Schemaless outer documents have no type expectations and always permit nested `!!schema` directives.


### 11.7 Schema Structure

A schema is a map containing `name => definition` entries, tagged with the `!schema` type annotation. Each entry binds a type name (the map key) to a type definition (the map value, carrying a `!!type` directive):

```
!!id:"http://example.com/people.tn1"
!!schema:"http://tson.io/1/m/meta.tn1"
!!import:"http://tson.io/1/m/core.tn1"
!schema {
  person => !!type { name: string  age: integer }
  employee => !!type person & { department: string }
  status => !!type !enum [ACTIVE INACTIVE SUSPENDED]
}
```

In this document, the `!!schema` directive identifies the meta-schema. The `!!import` brings in the type library, merging its entries (`string`, `integer`, etc.) into the schema's type-name namespace. Inside the schema map, each definition uses `!!type` with the appropriate form. Type names used as type-refs (e.g. `string`, `integer`) resolve against the type-name namespace of local entries and imports (§11.3).

The `!schema` type annotation and the `!!schema` directive share a name but serve distinct roles. The directive (`!!schema`) identifies the external schema for type resolution. The type annotation (`!schema`) asserts that a map conforms to the `schema` type — marking it as a type namespace with mutual visibility. The `!!` prefix is always a directive; the `!` prefix is always a type annotation.

**Schema document shape.** A schema document has a fixed shape:

1. **`!!id` requires a top-level schema map.** When a document carries `!!id`, its top-level value MUST be a `!schema`-annotated map. A document with `!!id` whose top-level value is anything else is a resolver error. `!!id` declares the document's identity *as a schema*; a non-schema document has nothing to identify.
2. **At most one `!schema` map per document.** Multiple `!schema`-annotated maps in a single document are a resolver error. A schema document defines one type namespace; multiple namespaces in one file would have ambiguous import semantics.
3. **No nested `!schema` maps.** A `!schema` annotation on a map nested inside another value (e.g. a data document with a `definitions` field whose value is a `!schema` map) is a resolver error in v1. The `!schema` annotation marks the document's primary content; nesting would create scope-resolution questions that have no clean answer in the current model.
4. **`!!type` validity follows from the above.** Combined with the rule in §9.2 that `!!type` is valid only on map entry values within a schema map, this means `!!type` is valid only on map entry values within a document's top-level `!schema`-annotated map.

**Schema map entry value shapes.** Schema map entry values MAY use either of two source shapes: the sugared `!!type` directive (recommended for human-authored schemas) or a literal `!type_definition { ... }` record. Both produce the same `type_definition` value in the namespace. The literal form exists to support round-tripping resolver output back through the parser — resolver output carries literal `type_definition` records, not `!!type` directives, and must remain a valid TSON document. Hand-written literal-form entries are validated as `type_definition` values (structural conformance to the kernel-defined record shape); the resolver does not second-guess the author's declared kind, supertypes, or body structure. Source schemas authored by humans SHOULD use `!!type`; mixed-form schemas (some entries sugared, some literal) are valid but unusual and harder to read.

**Annotation binding convention in this specification's schemas.** By convention in this specification's own schemas (meta-kernel, meta, core), `@doc` and other entry-level annotations are written before the entry's key. They bind to the key (the `type_name` token) per the rule in §6. Authors needing to annotate the type definition itself rather than its name place the annotation after `=>` and before `!!type`.


## 12. Core Meta-Schema

Two pre-loaded schemas form the meta-schema layer of TSON:

- **`1/m/meta-kernel.tn1`** — the self-referencing bootstrap layer. Its `!!id` and `!!schema` both reference its own URL — it bootstraps by defining its own core types directly without importing a type library. The kernel defines `top`, `atom`, `product`, `sum`, the `record` / `array` / `map` / `tuple` / `enum` / `choice` constructors, the `record_field` / `tuple_element` / `parameter` / `type_definition` / `schema` supporting records, and the minimal scalar vocabulary (`integer`, `string`, `uri`, `regex`, `boolean`, `unit`, `value`, `token`, `void`) needed for its own constraint-field declarations.

- **`1/m/meta.tn1`** — the canonical meta-schema, chained to by `!!schema` in user schemas. Built on top of the kernel; it adds the type constructors that the core type library (`core.tn1`) instantiates: `binary` with `binary_encoding`, `extern`, `unknown_type`, plus the constraint vocabularies for numeric (`real_type`, `decimal_type`, `rational_type`), temporal (`date_type`, `time_type`, `datetime_type`, `duration_type`), identifier (`uuid_type`), and text (`email_type`) atom families. Meta also hosts the application-level annotation types (`ordered`, `bounded`, `numeric`, `deprecated`, `since`, `todo`, `lang`) — annotation types must live in the schema chain to be usable as annotations (§6), and meta is the canonical location.

Implementations MUST pre-load both. See §11.5 for the full bootstrap rule.

Users normally chain to `meta.tn1`. Schemas that chain to `meta-kernel.tn1` directly are either alternative type libraries replacing meta, or extensions of the meta layer itself — both meta-programming cases, not application-schema authoring.

The kernel defines four base kinds — `top`, `atom`, `product`, `sum` — with `top` as the structural root and the other three composing with it via `top & {}`. Every type in the schema transitively IS-A `top`.

Each atom family that carries a constraint vocabulary is defined as a pair: a constructor (`integer_type`, `string_type`, `uri_type`, `regex_type` in the kernel; `real_type`, `decimal_type`, and the temporal/identifier/text constructors in meta) that composes with `atom` via `~atom & {...}` and lists the family's constraint fields, and a canonical empty instance (`integer`, `string`, `uri`, `regex`; `real`, `decimal`, `date`, etc. in core) produced as `!<ctor> {}`. Field-type references from within a constructor use the instance name (e.g. `integer_type.min: integer?`); the mutual reference between the constructor and its instance closes via standard local-name lookup within the schema.

The kernel also defines `unit` — an atom constructor with no constraint vocabulary — and three opaque instances:

- `value` — admits [TSON-DATA] §6 products (null, boolean, UNF number, string). The escape hatch for fields whose type the schema language cannot express (see `record_field.value` and the constraint fields in meta where the constrained atom is not in scope).
- `token` — admits NFC-normalised lexemes. Used for identifier types (`type_name`, `field_name`, `param_name`) and enum members.
- `void` — the unit type of absence: admits the absent sentinel `_` (and the token `null` as an equivalent spelling, normalised to `_`; see §8). Used as the target type for bare annotations like `@annotation` and `@numeric` (see §6).

The kernel additionally defines `annotation` (`@annotation !!type void`) as the canonical void-targeted annotation. Core re-exports `void` under the same name so that schemas chaining only to core can target it; core also defines `complex` (`!!type !unit {}`, a complex-number representation) as an additional unit-family entry. The `numeric` annotation (also `@annotation !!type void`) lives in `meta.tn1` so it is reachable through the schema chain — annotation types must live in the chain to be usable as annotations (§6). Per §11.3, type-name references from a chaining schema resolve through that schema's type-name namespace (local + imports), so the kernel's `void` reaches a chaining schema only through an explicit import.

The kernel's types are reachable from any schema that chains to it via `!!schema` for resolving the structural forms produced by the `!!type` grammar. They are NOT automatically available as type-refs in chaining schemas — the `!!schema` chain populates the structure namespace, not the type-name namespace (§11.3). A chaining schema that wants these types as type-refs imports a type library that defines them (typically `core.tn1`).

The normative source for both schemas is carried in the companion artifacts (§1.5): `meta-kernel.tn1` and `meta.tn1`, pinned by content hash at publication. Earlier drafts inlined the kernel source here; the artifact is now the single source, consistent with §11.5's rule that the pre-loaded in-memory model is authoritative and the documents are descriptions of it.

The meta-schema defines four type kinds:

- **Atom** — scalar types. An atom constructor composes with `atom` via `~atom & {...}`; its record of constraint fields describes the narrowing vocabulary available to instances. `integer_type`, `string_type`, `uri_type`, `regex_type`, and `enum` are atom constructors in the kernel; `real_type` through `email_type`, `binary`, and `unknown_type`'s sibling `binary_encoding` are atom constructors in meta. The `unit` constructor is the atom with no constraint vocabulary — the atom equivalent of the empty record `{}` for products. Atom instances are produced as `!<ctor> {}` (empty) or `!<ctor> { values }` (narrowed); construction via `!` does not establish IS-A with the constructor, only the `kind`.
- **Product** — structural types. `record`, `array`, `set`, `map`, and `tuple` are constructors that compose with `product` via `~product & {...}`, fixing `access_pattern` and `size_type`. The parameterized constructors (`array<T>`, `set<T>`, `map<K, V>`) declare their type slots in the `<>` parameter list and reference them in field positions. `set` is a constructor narrowing of `array` with `unordered` and `unique_items` pinned to `true`. Bare `{...}` definitions without explicit composition (like `atom_specification`, `parameter`, `record_field`, `tuple_element`, and `type_definition` itself) resolve to `kind: PRODUCT` by structural default.
- **Sum** — discriminated-union types. `choice` in the kernel, and `extern` and `unknown_type` in meta, compose with `sum` via `~sum & {...}`. `unknown` in core is produced as `!unknown_type {}` — the empty instance accepts any well-formed value of any type.
- **Reference** — a type definition whose body is a pointer to another type. References appear in the schema namespace as `kind: REFERENCE` entries whose body is a `!reference { target: T }` record. The resolver flattens every use of a reference by rewriting it to the target type. Reference chains are fully resolved: if `A` points at `B` and `B` points at `C`, uses of `A` resolve to `C` directly. The validation graph contains only ATOM, PRODUCT, and SUM entries; REFERENCE entries exist as documentation only. When a reference is flattened, the resolver attaches an `@alias` annotation (defined in `core.tn1`) to the resolved type, naming the source-level alias used at the reference site.

The `type_definition` record captures the resolver's output for any type. The `parameters` field, when non-empty, marks the definition as a template that cannot be instantiated directly. The `constructor` field is `true` when the definition was declared with `~`. The `supertypes` field records the transitive IS-A chain established by `&` composition and instance/constructor narrowing; `subtypes` is its inverse, maintained by the resolver for fast navigation. The `body` field is required and declared as `top` — the universal supertype. The resolver produces body values annotated with the structurally-appropriate type for each definition: `!record` for product constructors and composed records, `!<constructor>` for atom constructor instances (e.g. `!enum { members: [...] }` for `boolean`, `!integer_type { min: 0 max: 255 }` for `uint8`), `!reference { target: T }` for reference-kind entries, and so on. Because every concrete type in the system IS-A `top` via its transitive supertype chain, the parser validates body annotations without needing dependent typing.

**Reading parameter references.** Parameters and type names share the lexical class `token`, so a `type_name` appearing in resolver output (e.g. in `record_field.type`) is resolved against two namespaces in order: first the enclosing `type_definition.parameters` list, then the schema's type-name namespace. This matches the resolution rule used during source-level parsing (§5, "parameters take precedence"). Consumers reading resolver output MUST apply the same precedence. Implementations SHOULD warn when a definition declares a parameter whose name shadows a top-level schema type, since the shadow is silent at both the source and output layers.

`supertypes` and `subtypes` are resolver-managed: they are derivable from the `body`'s composition annotations and are computed from those, not authored. The normal authoring path (`!!type` directives) never sets them — the resolver fills them as part of producing `type_definition` output. If a schema bypasses the `!!type` grammar by writing `!type_definition { ... }` records directly (a use case supported because meta-kernel is self-referencing and round-trippable), any `supertypes` or `subtypes` values in those records MUST be discarded and recomputed by the resolver from `body`. Authored values are not authoritative.

**Two `supertypes` fields with different semantics.** A `type_definition` carries a `supertypes` field that records the **transitive** IS-A chain — direct parents plus each parent's own chain, deduplicated. A `record` body also carries a `supertypes` field that records only the **direct** non-anonymous `&` compositions from the source. Consumers reading resolver output use `type_definition.supertypes` for IS-A queries and `record.supertypes` to recover the source-level composition. The body field is what was written; the definition field is what it transitively means.

The `schema` type is a map from type names (the bare leaf names of types in the schema) to type definitions. Schema lookup is by name, not by parameterized reference.


## 13. Resolver Output

The resolver's output for a schema is a map of `type_definition` records (§12). This section defines how each `!!type` form maps to its `type_definition` (§13.1) and how reference-kind entries are flattened at use sites (§13.2).

### 13.1 Directive-to-Type-Definition Mapping

The `!!type` directive produces a `type_definition` record with fields: `source` (for narrowing), `kind` (ATOM, PRODUCT, SUM, or REFERENCE), `parameters` (declared type parameters; non-empty marks the definition as a template), `constructor` (boolean, marked by `~`), `supertypes`, `subtypes` (both maintained by the resolver), and `body` (the resolved content, declared as `top` — any type-annotated value, since every type IS-A `top`).

**Record form** (`!!type { fields }`) produces a product type with `kind: PRODUCT` and `body: !record { fields: [...] }`. Each field definition maps to a `record_field`:

| Grammar syntax          | record_field                                     |
|-------------------------|--------------------------------------------------|
| `name: type`            | `{ name: name  type: type  state: REQUIRED }`    |
| `name: type?`           | `{ name: name  type: type  state: OPTIONAL }`    |
| `name: type ~ value`    | `{ name: name  type: type  state: REQUIRED_DEFAULT  value: value }` |
| `name: type = value`    | `{ name: name  type: type  state: REQUIRED_FIXED    value: value }` |
| `name: type? = value`   | `{ name: name  type: type  state: OPTIONAL_FIXED    value: value }` |
| `name: type? = _`       | `{ name: name  type: type  state: OPTIONAL_FIXED }` (no `value` field — `record_field.value` is `value?`, so absence-of-value naturally encodes "fixed to absent") |

For supertype composition (`person &`), the `supertypes` field records the parent types and inherited fields are copied into the `fields` list. For narrowing (source type without `&`), the `source` field records the narrowing origin and refined fields reflect the tightened types or states.

**Parameterized form** (`!!type <T, U> ...`) produces a definition with a non-empty `parameters` field. Parameter names are scoped to the definition's body and take precedence over schema namespace lookup. The body may reference parameters as if they were ordinary type names; the resolver substitutes them when the definition is referenced with type arguments. A definition with parameters is a template and cannot be instantiated directly — references must supply matching type arguments.

**Instance form** (`!!type !T data-value`) produces a type depending on the target. When `T` is a constructor (e.g. `!integer_type {}`), the result is an empty constructor instance with `source: T`, `kind` inherited from `T`'s family, body `!T {}`, and no supertypes — construction does not establish IS-A with the constructor. When `T` is a constructor instance (e.g. `!integer { min: 0 max: 255 }`), the result is an instance narrowing with `source: T's constructor`, `supertypes: [T]`, and body `!T's_constructor { narrowed values }`. For single-required-field constructors, the data-value may fill that field directly (`!binary BASE64` ≡ `!binary { encoding: BASE64 }`). The instance form is only valid as the top-level body of a `!!type` directive; it may not appear inline in field-type, tuple position, array element, choice variant, or type-argument positions. See §3.3 for full semantics.

**Choice form** (`!!type (type | type)`) produces a sum type with `kind: SUM` and `body: !choice { variants: [...] }`. The `variants` field lists type references. Each variant must name a distinct type in the schema.

**Array/tuple form** (`!!type [type; size]` or `!!type [type, type]`) produces a product type with `body: !array { ... }` or `body: !tuple { ... }`. Array forms generate `element_type`, `state` (from the optional `?` suffix on the element — `[T]` → `REQUIRED`, `[T?]` → `OPTIONAL`), and optional `min_items`/`max_items` constraints. Tuple forms generate `elements` with `tuple_element` entries, each carrying its own `state` drawn from the position's optional `?` suffix.

**Constructor form** (`!!type ~ ...`) produces a definition with `constructor: true`. Constructor narrowing differs from regular narrowing: fixed values CAN be replaced because constructors are meta-level definitions. Constructors may declare type parameters (`!!type <T> ~product & { ... }`) to be filled at use sites via `<>`.

**Reference form** (`!!type typename`) produces a REFERENCE-kind type definition. See §13.2 for the full reference-flattening rule.

**Empty record form** (`!!type {}`) is a special case of the record form — a record with zero fields. The result is a PRODUCT-kind type with an empty field list (`body: !record { fields: [] }`). The canonical empty-PRODUCT type in the kernel is `top` itself; structural mixins with zero fields would also produce this shape if any were defined.

**Unit atom instances** (`!!type !unit {}`) are TSON's idiom for opaque atoms — atoms whose values the schema language cannot further describe, distinguished from each other by name and by prose-level parsing contract (§15). The result is an ATOM-kind type with `source: unit` and `body: !unit {}`. Meta-kernel defines three: `value` (admits [TSON-DATA] §6 products), `token` (admits NFC-normalised lexemes), and `void` (the unit type of absence — admits `_`, also accepting `null` as an equivalent spelling; used as the target type for bare annotations like `@annotation` and `@numeric`). Core adds `complex` (host-defined complex-number representation). User schemas SHOULD NOT introduce additional unit instances without a documented parsing contract — the schema-level distinction is purely nominal, so adding one solely as a marker is reasonable, but inventing parsing semantics that conflict with the kernel's three is a recipe for confusion.

**Synthetic types.** When a definition uses an inline type-expression form — container (`[T]`, `[T; n]`, `[T, U]`, `set<T>`, `map<K, V>`) or choice (`(A | B)`) — for a field whose runtime type is not otherwise named, the resolver synthesizes an entry in the schema's namespace.

*Trigger positions.* Synthesis fires at positions that accept a type-ref and contain an inline structural form:

| Position                      | Example                                       |
|-------------------------------|-----------------------------------------------|
| Record field type             | `tags: [string; +]`                           |
| Tuple element type            | `[integer, [string]]` — inner `[string]`      |
| Array element type            | `[[integer; 3]]` — inner `[integer; 3]`       |
| Choice variant                | `(email \| [phone])` — inner `[phone]`        |
| Type argument (inside `<>`)   | `map<string, [integer]>` — inner `[integer]`  |
| Parameterized template reference | `linked_list<integer>` — synthesises `linked_list#integer` |

Composition targets (`&`) and narrowing sources are restricted to named type references (bare or with type arguments); inline structural forms at these positions are resolver errors. Top-level `!!type` bodies (e.g. `scores => !!type [integer; +]`) are not synthesis sites — the directive names the result via the enclosing map-entry key, and the inline form becomes the body directly.

*Body shape.* A synthesised type's body is the canonical form of the source inline expression, produced by the desugaring rules in §3.4. Examples:

```
array#string => !type_definition {
  kind: PRODUCT
  source: array
  body: !array { element_type: string }
}

choice#email#phone => !type_definition {
  kind: SUM
  source: choice
  body: !choice { variants: [email phone] }
}
```

The `source` field names the constructor implied by the inline form; `kind` is inherited from that constructor's base kind; `supertypes` is empty because construction transfers kind, not IS-A (§3.3).

*Dedup and synthesis.* The resolver MUST dedupe by structural equivalence within a schema: two inline forms with identical structure (same element type AND identical constraint values for containers; same variants in the same declaration order for choices) resolve to the same synthetic entry. The first occurrence synthesizes the entry; later occurrences reuse it. Choice variants are compared by order, not as sets — `(email | phone)` and `(phone | email)` synthesize to distinct entries.

*Naming.* Implementations SHOULD name synthetic entries using the following scheme for cross-implementation consistency:

- Simple containers (no constraints beyond the element type): `container#element` — e.g. `array#type_name`, `array#record_field`, `set#token`, `map#string#integer`.
- Constrained containers: `container#element#<hash>` — e.g. `array#record_field#a7f3b2e8`, where `<hash>` is a short content-based digest of the constraint values (size-spec, element state). The hash algorithm is implementation-defined; a truncated SHA-256 of a canonical serialisation of the constraint fields is a reasonable choice.
- Choices: `choice#v1#v2#...` — variants listed in source order. `(email | phone)` → `choice#email#phone`.

*Non-exposure.* Synthetic type names are internal to the resolver's output. They:

- MUST NOT be referenceable as type-refs from any schema. Authors who need to refer to such a type must introduce it explicitly with a named `!!type` definition (e.g. `non_empty_fields => !!type [record_field; +]`, `contact_method => !!type (email | phone)`); when a named definition exists for an equivalent form, no synthetic entry is created.
- MUST NOT be assumed portable across implementations or resolver versions at the byte level. The SHOULD on the naming scheme applies to the shape of the name; the hash payload and any future scheme refinements are not stability guarantees.
- MUST NOT participate in `!!import` resolution.

*Error messages.* Implementations SHOULD surface synthetic names in error messages alongside a reconstruction of the source form (e.g. "`[record_field; +]` at line 42, synthesized as `array#record_field#a7f3b2e8`") rather than the synthetic name alone. The synthetic name is a debugging handle; the source form is what the author wrote.

*Cross-schema identity.* Synthetic types follow the same namespace rules as named types: they are synthesized in whichever schema first needs them, and chaining schemas reach them through their `!!schema` chain (for structure references) or via `!!import` (for type-name references). Because different schemas synthesize independently, the same source form appearing in two schemas may receive different synthetic names (and different hashes) — cross-schema identity of synthetic types is through named `!!type` definitions or not at all.

*Synthetic name collisions.* Users SHOULD NOT define schema entries whose names contain `#`. The `#`-bearing namespace is reserved by convention for resolver-synthesised entries (containers from inline forms, template instantiations per §5.1, choice synthesis). When the resolver attempts to synthesise an entry whose name matches a user-defined entry in the same schema (including imported entries), it MUST raise a resolver error at schema-load time. This applies regardless of whether the user's entry is structurally equivalent to what the resolver would synthesise — the early error gives clear feedback rather than silently relying on resolver-internal naming. Resolver output documents may carry `#`-bearing names (synthesised entries appear in the namespace); these are not user-defined and pose no collision risk on round-trip, since synthesis fires only for inline forms in source and a round-tripped document carries no inline forms.

**Supertypes and subtypes — direct vs transitive.** Two `supertypes` fields appear in resolver output and follow different rules:

- `type_definition.supertypes` carries the **transitive** IS-A chain established by `&` composition and instance/constructor narrowing. The resolver computes it by walking each direct supertype's own chain and deduplicating. Construction via `!T {}` does not contribute to this chain (§3.3).
- `record.supertypes` (inside a `!record` body) records only the **direct** non-anonymous `&` compositions written in the source. The body field preserves authorial intent; the wrapping `type_definition.supertypes` is the materialised lattice.

Example: `string_type => !!type ~atom & { ... }` produces `type_definition.supertypes: [atom, top]` (transitive — `atom` itself IS-A `top`) and `body: !record { supertypes: [atom], ... }` (direct — only `atom` was written).

`type_definition.subtypes` is the transitive inverse of `supertypes` across the schema's namespace. The resolver MUST compute and populate it. It is not authored — every entry is derived from another entry's `supertypes`. Both fields are part of the resolver-output contract; if `supertypes` is required output, `subtypes` is its mandatory inverse.


### 13.2 Reference Flattening

A `!!type` body that is purely a type expression — with no body record, no `&` composition, no constructor application — produces a REFERENCE-kind entry. The `target` is determined by the form of the type expression:

- **Simple type-ref leaf** (e.g. `bigint => !!type integer`): the entry is preserved with `source: typename` and `body: !reference { target: typename }`. The `target` is the immediate referent name, not the fully-resolved ultimate type — reference chains (`doc → documentation → string`) appear in the schema as three distinct entries, each pointing one hop forward.

- **Compound type expression** (parameterised types, arrays, tuples, choices, sets, maps — e.g. `coordinate => !!type [float, float]`, `result => !!type (success | error)`, `lookup => !!type map<string, integer>`): the resolver materialises the expression as a synthetic per §13.1 (`tuple#float#float`, `choice#success#error`, `map#string#integer`, etc.) and the entry's `body: !reference { target: <synthetic-name> }`. The compound form is not stored inline in the REFERENCE entry; it is hoisted into a named synthetic, and the REFERENCE entry points at the synthetic.

**Resolution at use sites.** When a reference is used at a use site — as a field type, tuple element, type argument, or data-mode type annotation — the resolver flattens the reference. Flattening walks the reference chain to the first non-REFERENCE type and rewrites the use-site `type_name` to that type, attaching an `@alias` annotation to the type token recording the source-level name.

Example. Given `bigint => !!type integer` and a record declaring `count: bigint`, the resolved `record_field` is:

```
!record_field { name: count  type: @alias:bigint integer }
```

The alias is attached to the type, not to the record_field — the alias describes the type reference, not the field itself.

**Chain aliasing follows the source.** Only the source-site alias is preserved on the use-site type. Intermediate hops in the chain (`documentation` in a `doc → documentation → string` walk) are not aliased on the use-site type — they remain visible as schema entries for anyone walking the namespace. `@alias` records "what the author wrote here," not "which types were traversed to get to the target."

The same flattening applies in data mode. `!bigint 42` resolves to an integer-typed value with `@alias:bigint` on the type annotation.

**References are not supertypes.** REFERENCE-kind entries do not contribute to the `supertypes` or `subtypes` graph of their targets. They are aliasing relationships, not IS-A relationships. `integer.subtypes` does not list `bigint`; `bigint.supertypes` is empty.

**Synthetic names are not references.** Synthetic types (§13.1) carry names containing `#` (e.g. `array#string`, `choice#email#phone`) and are distinct from REFERENCE-kind entries. Synthetic types have their original kind (PRODUCT for containers, SUM for choices) and their body is a constructor instance, not a `!reference { target }` record. The `#` in the name is a synthesis-naming convention, not a reference indicator.


## 14. Schema Resolution Model

Schema URLs in TSON are **logical identifiers**, not fetch instructions. A URL like `http://tson.io/1/m/core.tn1` names a schema — it does not require the implementation to make an HTTP request to that address. Implementations resolve schema URLs through a **schema library**: a local store mapping URLs to schema content.

### 14.1 The Schema Library

Every TSON implementation maintains a schema library. The library is a map from URL strings to resolved Schema objects. When the resolver encounters a `!!schema` or `!!import` directive, it looks up the URL in the library. If the URL is found, the corresponding Schema object is returned. If the URL is not found, the resolver reports an error — it does not attempt to fetch the URL.

The library is populated through three mechanisms, in order of precedence:

**Pre-loaded schemas.** The implementation ships with the meta-kernel (`tson.io/1/m/meta-kernel.tn1`) and the meta-schema (`tson.io/1/m/meta.tn1`) as pre-loaded entries, and SHOULD ship with the core type library (`tson.io/1/m/core.tn1`) as a pre-loaded entry as well. These schemas exist as in-memory structures before any document is parsed. Pre-loaded schemas are authoritative — their in-memory representation takes precedence over any external source (see §11.5).

**Registered schemas.** Applications register schemas in the library before parsing documents that reference them. Registration associates a URL with schema content and MAY occur from local files, embedded resources, or any application-specific source.

**Fetched schemas (optional).** Implementations MAY support fetching schemas by URL as a convenience for development and exploration. Fetching MUST be explicitly enabled by the application — it is never the default behaviour. Fetched schemas are subject to the security constraints in §16.2. Production systems SHOULD NOT rely on runtime fetching; they SHOULD register all required schemas at startup.

### 14.2 Content Hash Verification

Schema URLs MAY include a content hash as a query parameter to provide integrity assurance — confirming that the schema has not been modified since the URL was authored. The query parameter name identifies the hash algorithm: `?sha256=...` for SHA-256. This specification defines `sha256` as the default algorithm. Implementations MAY support additional algorithms using their own parameter names (e.g. `?blake3=...`, `?sha512=...`).

Hash values are encoded as lowercase hexadecimal. Schemas referenced with a content hash query parameter (`?sha256=...` or any future hash algorithm) MUST be stored and transmitted as UTF-8. A schema in UTF-16 or UTF-32 referenced with a content hash is a resolver error — the hash cannot be verified against a non-UTF-8 byte sequence without re-encoding, and re-encoding defeats the integrity guarantee.

Schemas without a content hash MAY use any of the encodings permitted by [TSON-DATA] §2. The encoding choice in that case affects only storage and transmission; without a hash, no cross-encoding verification is performed.

The hash is computed on the schema document's raw UTF-8 bytes as stored or transmitted, with one exclusion: if the document's first line is a `!!id` directive, that line (including its terminating newline) MUST be excluded from the hash input. This allows a schema to carry a content hash within its own `!!id` without a circular dependency. No other normalization, whitespace stripping, or transformation is performed — schemas are immutable, so the byte content is stable. The full hash MUST be provided; truncation MUST NOT be used — a truncated hash is a resolver error.

When a content hash is present, the implementation SHOULD verify that the schema content in the library matches the declared hash. A content hash mismatch — where the library contains a schema at the base URL but the hash does not match — is a resolver error. The implementation MUST NOT silently use a schema whose content does not match the declared hash.

When no content hash is present, the URL is resolved against the library without integrity verification. This is appropriate for development but NOT RECOMMENDED for production data interchange.

Examples:

Referencing a schema with integrity verification:

```
!!schema:"http://example.com/people.tn1?sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
```

A schema declaring its own hash in `!!id` (first line excluded from hash input):

```
!!id:"http://example.com/people.tn1?sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
!!schema:"http://tson.io/1/m/meta-a1.tn1"
!schema {
  ...
}
```

### 14.3 URL Identity

Two schema references are considered identical if and only if their URL strings are byte-for-byte identical after removing any query parameters used for content hashing. This means `http://tson.io/1/m/core.tn1` and `http://tson.io/1/m/core.tn1?sha256=9f86d0...` reference the same schema (with the latter additionally requiring hash verification). URL normalization (case folding, path resolution, percent-encoding) MUST NOT be performed — URLs MUST be compared as literal strings.


## 15. Atom Token Parsing

Each atom type owns its parsing contract. When a schema is in scope and a token appears at a position whose type is an atom, the atom's parser takes the token and produces either a typed host value or a parse error. The atom's constraint record (min, max, length, pattern, members, etc.) is applied as validation after parsing succeeds.

Parsing and validation are distinct operations:

- **Parsing** — Token (lexeme) to host value. The atom defines what tokens are accepted and what the resolved host value looks like. For example, `integer` accepts tokens that match the integer grammar and produces a host integer; `date` accepts tokens that match RFC 3339 full-date and produces a host date; `string` accepts any quoted or unquoted token and produces a host string.
- **Validation** — Host value against the constraint record. For example, `uint8` (narrowing `integer` with `{min: 0 max: 255}`) parses the token as an integer first, then validates the parsed value against the range.

A parse failure is distinct from a validation failure. The token `twelve` against a field of type `integer` is a parse error — the integer atom's parser cannot interpret `twelve` as an integer. The token `300` against a field of type `uint8` parses successfully as an integer, then fails validation against `max: 255`. Implementations SHOULD distinguish these in error reporting ([TSON-DATA] §9.6).

**Enum member semantics.** The `enum` atom's `members` field is a `set<token>` — it enumerates the lexical tokens permitted at an enum-typed position. Parsing an enum-typed position is a token-identity check: the source token (canonicalised per `token`'s parsing contract, below) must match one of the member tokens. The resolved host value is determined by natural parsing of that token:

- For `boolean` (defined as `!enum [true false]` in core), the tokens `true` and `false` resolve to native host booleans. The enum member check is satisfied by token-identity match; the resolved representation is the host's native boolean type.
- For user-defined enums such as `status => !!type !enum [ACTIVE INACTIVE]`, the resolved host value is the member token (`ACTIVE` or `INACTIVE`) represented as a host string, or a host-language enum value if the implementation provides such a mapping.

The `members: set<token>` declaration describes the *permitted token lexemes*, not the resolved representation. Two distinct concerns — what tokens are accepted, what the runtime value looks like — share a single declaration because token identity is the canonical identifier for the member.

**The `token` primitive.** The kernel defines `token` as an instance of `unit` (alongside `value`). A `token` value is the canonical NFC-normalised form of a source lexeme — for unquoted lexemes the lexer normalises ([TSON-DATA] §3.3), and for quoted lexemes appearing in identifier positions the resolver normalises ([TSON-DATA] §3.1.1). Two tokens are equal iff their canonical forms are byte-identical. Tokens are whitespace-free by construction — the lexer terminates tokens on whitespace — and this is a structural invariant, not a constraint. The `token` type carries no constraint vocabulary; its admissibility rules are fixed by the grammar.

`token` shares its host representation with `string` — both are sequences of Unicode code points — but differs in its parsing contract: a `token` value rejects whitespace and applies NFC, while a `string` value can contain any character permitted by the string literal grammar. Use `token` as a value type when the value must be a valid TSON identifier (map keys in `map<token, ...>` authored as bare unquoted lexemes, enum members, identifier-like fields). Use `string` for free-form textual content. The conflation between `token` as a lexical category (an identifier in the source) and `token` as a value type (a string with the identifier contract) is intentional: a `token` value can always be rendered back as an unquoted lexeme, and an unquoted lexeme can always be promoted to a `token` value without escaping.

`token` is not used in data values and is not redefined in core or user schemas. It appears in the kernel's own declarations: `enum.members: set<token>`, and the identifier types `type_name`, `field_name`, and `param_name` (all defined as `!!type token`). These are the positions where the schema language describes lexical identifiers from the source, as distinct from arbitrary Unicode text (which uses `string`).

**UNF reuse.** Atoms that parse numeric values (`integer`, `real`, `decimal`, `rational`, their narrowings in core, and user-defined numeric narrowings) SHOULD use UNF (Unicode Number Format) grammar and parsers for the relevant numeric form. This is functional reuse, not a normative dependency: each numeric atom defines its own parsing contract, and UNF is the canonical source for the grammar and parsing logic. An implementation may share a single UNF parser across all numeric atoms and dispatch based on the atom's declared form — this is the expected pattern.

**Constraint fields typed as `value`.** Some atom constructors declare constraint fields with type `value` because the constrained atom cannot be referenced at the point of declaration — for example, `real_type.min: value?` cannot use `real` as its type because `real` is an instance of `real_type` (bootstrap ordering, §11.5). The `value` escape hatch defers the type decision to the atom implementation.

Tokens at these positions are parsed by [TSON-DATA] §6 base type resolution. Whatever [TSON-DATA] §6 produces — an integer, a float, a string — is what the resolver stores in the constraint-record field.

Each constrained atom's implementation is responsible for converting `value`-typed constraint values to whatever internal representation it uses for validation. Conversion MUST occur at schema-load time (eager), not per-validation (lazy). Atoms that cannot convert a given constraint value — because the value is of a non-convertible type, out of the atom's internal range, or otherwise incompatible — MUST report an error at schema-load time. This ensures a schema either loads cleanly or fails with a clear diagnostic; a half-valid schema that silently mis-validates data is never produced.

Two concrete consequences: (1) a decimal atom using an arbitrary-precision internal representation may accept integer, float, and string constraint values and normalise them, while a 32-bit-float atom may accept only values representable in IEEE 754 single precision and reject out-of-range constraints at load time. (2) Two implementations of the same atom may differ in which constraint-value types they accept, as long as they both validate successfully-loaded schemas identically. The permissiveness of conversion is an implementation choice; the validation semantics after conversion are the atom's contract.

**Base type resolution as a schemaless default.** Section 8 defines a dispatch order (null, boolean, UNF number, string) that applies when no schema is in scope. This dispatch is itself an implicit atom parser — one that chooses across the atom family by first-character and pattern. When a schema is in scope, the field's declared atom's parser takes over; the dispatch does not apply.


## 16. Security Considerations

The security considerations of [TSON-DATA] §9 apply. This section adds the schema-layer considerations.

### 16.1 Schema Validation

TSON documents without a `!!schema` directive carry no type guarantees — only base type resolution ([TSON-DATA] §6) applies. Applications processing untrusted TSON input SHOULD validate against a schema before use.


### 16.2 External References

Schema URLs in `!!schema`, `!!import`, and `!!include` directives are logical identifiers resolved through the schema library (§14), not fetch instructions. The default resolution behaviour is local lookup — no network access occurs unless the application explicitly enables it.

Implementations that support optional schema fetching (§14.1) MUST treat it as an opt-in capability, disabled by default. When fetching is enabled, implementations SHOULD enforce the following controls:

- **URL allowlists.** Restrict fetchable URLs to a set of approved domains or URL prefixes. The `!!schema` directive is particularly sensitive because it determines the type vocabulary for the document — a malicious URL could direct a parser to load an untrusted schema that redefines expected types.
- **Content hash verification.** Require content hashes on fetched schema URLs (`?sha256=...`) and reject schemas whose content does not match. This prevents both tampering and silent schema drift.
- **Size limits.** Enforce maximum size limits on fetched content to prevent denial-of-service via oversized schemas.
- **No recursive fetching.** A fetched schema's own `!!import` directives MUST NOT trigger further fetches. All transitive dependencies must be pre-registered or pre-fetched.
- **Caching.** Fetched schemas SHOULD be cached locally after verification. A verified schema at a given URL with a matching content hash is immutable — re-fetching is unnecessary.

Production systems SHOULD pre-register all required schemas at application startup and disable runtime fetching entirely. The schema library model (§14) is designed to make this the natural and easy path.


### 16.3 Directive Security

Directives (`!!`) are a control channel that affects interpretation. Unknown configuration directives (`!!name:value`) are preserved by the parser; unknown value-producing directives are parse errors (see §9.2). Applications processing untrusted TSON input SHOULD restrict which directives are accepted. The `!!type` directive and `!!import` are particularly sensitive because they affect the type vocabulary — production systems MAY restrict which directives are accepted and which import URLs are permitted.


## 17. ABNF: The Type Definition Grammar

This section extends the [TSON-DATA] §10 grammar with the type-definition grammar activated by the `!!type` directive. The lexer is unchanged ([TSON-DATA] §10.1); the productions below consume the same token stream.

### 17.1 The Type Definition Grammar

When a value-producing directive's name maps to the type grammar in the directive registry, the type-def grammar activates. The canonical name is `type`. It appears on map entry values within schema maps.

```
; ── Type Definition (top-level after !!type) ──────────────

type-def = instance
         / [type-params] ["~"] structural-def
         / [type-params] type-ref

type-params = "<" ws param-name *(ws "," ws param-name) ws ">"
param-name  = type-name   ; same lexical class as type-name

structural-def = composed-def
               / narrowed-def
               / record-def

composed-def = type-ref 1*(ws "&" ws type-ref) [ws record-def]
             / type-ref ws "&" ws record-def

narrowed-def = type-name [ws "<" type-args ">"] ws record-def

record-def   = "{" ws [field-def *(separator field-def)] ws "}"

instance     = "!" type-name ws data-value

; ── Field Definitions ─────────────────────────────────────

field-def      = *annotation field-name ws ":" ws
                 ( field-type field-modifier
                 / field-type
                 / field-modifier
                 / subtraction-marker )

field-type     = type-ref ["?"]

field-modifier = ws ("~" / "=") ws ( token / absent )

subtraction-marker = "_"   ; bare _ marks the field for removal (§4.3)

; ── Type References (any type position) ───────────────────

type-ref = paren-type
         / array-def
         / type-name "<" type-args ">"
         / type-name

; ── Compound Type Expressions ─────────────────────────────

paren-type = "(" type-ref "|" type-ref *("|" type-ref) ")"   ; choice, 2+ variants

array-def  = tuple-form / array-form
tuple-form = "[" field-type separator field-type *(separator field-type) "]"
array-form = "[" field-type [";" size-spec] "]"

; field-type is defined in the field-def section above;
; it is reused here for tuple and array element positions.

; ── Terminals ─────────────────────────────────────────────

type-args  = type-ref *(separator type-ref)    ; separator = ws "," ws / ws1
size-spec  = unquoted-token
```

The `type-params` slot, when present, declares type parameters for the definition (see §5). Parameters are scoped to the definition body and take precedence over schema namespace lookup. References to a parameterized type MUST supply matching type arguments via `<>`; bare references to a parameterized type are resolver errors.

The `paren-type` production produces choice types. Choices require at least two variants — `(T)` is a parse error. Bare names inside `()` joined by `|` are type references forming a choice.

**Optionality.** The `?` suffix marks field-level, tuple-position-level, or array-element-level optionality and is only valid in those positions. It records `state: OPTIONAL` in the `record_field`, `tuple_element`, or `array` respectively. It is not a property of the type itself — there is no generic "optional type" in TSON. A field type is always a concrete type plus an optionality marker on the containing field or position. Tuples and arrays share the `element_state` enumeration (REQUIRED, OPTIONAL); records use the richer `field_state` enumeration (five states).

**Composed definitions.** The trailing record-def in `composed-def` is optional. `customer => !!type address & contact` is a valid definition combining two supertypes with no additional fields and no tightening; `& {}` at the end is not required. When a `{` follows a `&`-chain, it always belongs to the composed-def's record-def — no other production in the `!!type` grammar starts with `{` after a chain of `&`-separated type-refs.

**Narrowing target.** The narrowed-def target is restricted to a bare type-name, optionally with type-args (e.g. `map<string, integer> { ... }`). Narrowing an inline instance, a choice, or an array is a parse error — these have no field list to tighten.

**Type argument separators.** Type arguments inside `<>` may be separated by comma or whitespace, matching the `array-def` separator rule. `map<string, integer>` and `map<string integer>` are both valid.

`_` is not valid in type-ref or type-def body positions — see the absent sentinel position table in §2.4. Empty records use `!!type {}`.


### 17.2 Disambiguation Summary

```
; type-def position (after !!type):
;   !              → instance
;   ~              → constructor marker, then structural-def
;   name &         → composed-def
;   name {         → narrowed-def
;   {              → fresh record-def
;   (              → choice-def
;   [              → array-def or tuple
;   name ? / name  → type-ref
;   _              → absent
;
; type-ref position (field types, array elements, etc.):
;   (              → choice-def
;   [              → array-def or tuple
;   name <         → generic
;   name ? / name  → simple ref
;
; array-def internal disambiguation:
;   [type sep type  → tuple (whitespace or comma)
;   [type ; spec    → array with size constraint
;   [type ]         → unconstrained array
```

Each case in the type-def block is decided by one-token lookahead at the start of the production; in array-def, the choice between tuple, sized array, and unconstrained array is made by one-token lookahead **after the complete preceding `field-type`**. A `field-type` can itself be nested (`(email | phone)<context>?`), but its own grammar is unambiguous and parses without backtracking via the type-def disambiguation above. No backtracking is required at any level.


### 17.3 Adjacency Rules

The following rows extend the adjacency table of [TSON-DATA] §10.3 for the operators of the type-definition grammar. As there, the rules are enforced by the parser via source-position comparison, not by the ABNF productions.

| Operator | Type | Context | Rule |
|---|---|---|---|
| `!` | prefix | `!!type` body (constructor instantiation) | MUST be adjacent to the following unquoted-token (constructor or instance name) |
| `?` | suffix | field type, tuple position, array element | MUST be adjacent to the preceding token (type name or closing bracket) |
| `&` | binary | composition | whitespace on either side optional |
| `~` | prefix/modifier | constructor marker, default value | whitespace optional |
| `=` | modifier | fixed value | whitespace optional |
| `\|` | separator | choice variant | whitespace optional |
| `;` | separator | array size spec | whitespace optional |
| `=>` | separator | schema map entry | whitespace optional (compound token from lexer) |


### 17.4 Directive Constraints

The grammar in [TSON-DATA] §10.2 permits `*directive` on any value. The following per-directive constraints are enforced by the parser. Constraints apply per value — directives on nested values are independent, so a nested record may carry its own `!!schema` regardless of what the enclosing value declares.

Every spec-defined directive has a typed input (the data-value or grammar that follows the directive name) and, for value-producing directives, a typed output (the value the directive produces in place of its position). The resolver validates inputs against the declared type and rejects mismatches as parse errors; outputs are typed so that surrounding grammar positions (e.g. a schema map entry requiring `type_definition` values) can accept the directive's result directly.

| Directive    | Form            | Repeats | Exclusive | Input                                | Output            |
|--------------|------------------|---------|-----------|--------------------------------------|-------------------|
| `!!schema`   | configuration    | no      | no        | URL string                           | — (configuration) |
| `!!id`       | configuration    | no      | no        | URL string                           | — (configuration) |
| `!!import`   | configuration    | yes     | no        | URL string; declaration order significant | — (configuration) |
| `!!include`  | configuration    | no      | yes       | URL string; followed value MUST be `_` | replaces value with included content |
| `!!type`     | value-producing  | no      | yes       | type-def grammar (§9.2)           | `type_definition` |

**Repeats** — whether the directive may appear more than once on the same value. Violations are parse errors.

**Exclusive** — whether the directive MUST be the only directive on its value. `!!type` is exclusive both at the directive level (no other directives on the same value) and at the grammar level (configuration directives MUST NOT precede a value-producing directive — see §9 and the grammar split in [TSON-DATA] §4.2; this is enforced by the grammar, not by a separate post-parse check). `!!include` is exclusive because it replaces the value with external content, making sibling directives meaningless; it MUST appear in a `data-value` position, never inside a `!!type` body (the type-def grammar is not a data-value position). Non-exclusive directives (`!!schema`, `!!id`, `!!import`) may freely coexist with each other. Violations are parse errors.

**Input** — the value or grammar the directive accepts. URL-string inputs MUST be quoted tokens resolving to valid URIs; non-string inputs to these directives are parse errors. The `!!type` input is the type-def grammar (§9.2), not a data-value.

**Output** — for value-producing directives, the type of the value produced. The directive's result occupies the value position it appears in and is subject to that position's type expectations. For configuration directives, the output column is marked "—" because they affect interpretation rather than producing a value.

Unknown directive handling depends on form: unknown configuration directives (`!!name:value`) are preserved by the parser and not subject to these constraints; unknown value-producing directives (`!!name <ws> ...`) are parse errors because the parser has no grammar to consume their content. See §9.2.


## 18. References

### 18.1 Normative References

| Reference | Title | URL |
|-----------|-------|-----|
| RFC 2119 | Key words for use in RFCs to Indicate Requirement Levels | https://www.rfc-editor.org/rfc/rfc2119 |
| RFC 5234 | Augmented BNF for Syntax Specifications (ABNF) | https://www.rfc-editor.org/rfc/rfc5234 |
| RFC 3339 | Date and Time on the Internet: Timestamps | https://www.rfc-editor.org/rfc/rfc3339 |
| RFC 3986 | Uniform Resource Identifier (URI): Generic Syntax | https://www.rfc-editor.org/rfc/rfc3986 |
| RFC 4648 | The Base16, Base32, and Base64 Data Encodings | https://www.rfc-editor.org/rfc/rfc4648 |
| RFC 5322 | Internet Message Format (email address syntax) | https://www.rfc-editor.org/rfc/rfc5322 |
| RFC 9485 | I-Regexp: An Interoperable Regular Expression Format | https://www.rfc-editor.org/rfc/rfc9485 |
| RFC 9562 | Universally Unique IDentifiers (UUIDs) | https://www.rfc-editor.org/rfc/rfc9562 |
| ISO 8601-1:2019 | Date and time — Representations for information interchange | https://www.iso.org/standard/70907.html |
| IEEE 754-2019 | Standard for Floating-Point Arithmetic | https://ieeexplore.ieee.org/document/8766229 |
| UNF | Unicode Number Format | https://tson.io/1/unf.md?sha256=&lt;pinned at publication&gt; |
| TSON-DATA | TSON Part 1: Data Format | &lt;pinned at publication&gt; |
| TSON-TYPES | TSON Part 2: Type Vocabulary | &lt;pinned at publication&gt; |
| meta-kernel.tn1 | TSON Meta-Kernel (companion artifact) | http://tson.io/1/m/meta-kernel.tn1?sha256=&lt;pinned at publication&gt; |
| meta.tn1 | TSON Meta-Schema (companion artifact) | http://tson.io/1/m/meta.tn1?sha256=&lt;pinned at publication&gt; |
| core.tn1 | TSON Core Type Library (companion artifact) | http://tson.io/1/m/core.tn1?sha256=&lt;pinned at publication&gt; |

### 18.2 Informative References

| Reference | Title | URL |
|-----------|-------|-----|
| ISO/IEC 11404:2007 | General Purpose Datatypes | https://www.iso.org/standard/39479.html |
| JSON Schema 2020-12 | JSON Schema: A Media Type for Describing JSON Documents | https://json-schema.org/specification |
| RFC 5646 | Tags for Identifying Languages (BCP 47) | https://www.rfc-editor.org/rfc/rfc5646 |
| W3C XSD Part 2 | XML Schema Part 2: Datatypes Second Edition | https://www.w3.org/TR/xmlschema-2/ |
| Resolver Output Reference | TSON Resolver Output Reference (non-normative fixtures) | &lt;published alongside this document&gt; |


## Authors

- David Ryan
