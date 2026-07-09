---
title: "TSON Part 2: Schemas and the Type System"
draft: "2026 Revision 32"
status: "Working Draft"
part: 2
description: >
  The schema layer: the schema grammar, the type system and its operations, the schema chain
  and its resolution model, schema compilation and resolver output, and the operations of the
  schema, meta, and import directives.
---

# TSON Part 2: Schemas and the Type System

## 2026 Revision 32

**Status:** Working revision. The 2026 revision series is subject to change without compatibility guarantees. When finalised, this specification will be published as **TSON version 1** and frozen; until then, revisions are released under the 2026 series.

**Series:** TSON Specification, Part 2 of 2

**Copyright:** © 2026 Litterat Pty Ltd. This document is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0): https://creativecommons.org/licenses/by-sa/4.0/


## 1. Introduction

This document defines the TSON **schema layer**: the schema grammar and its type-definition forms, the type system and its operations, the schema chain and its resolution model, the resolver output contract, and the schema-layer directive operations.

[TSON-DATA] defines the lexer, the data grammar, base type resolution, and the built-in type vocabulary. This document adds the ability to define types, publish them as schemas, reference them from data documents, and validate data against them. It introduces no lexical changes: a schema document is parsed by a second body grammar over the same frozen lexer ([TSON-DATA] §7.2–§7.3), selected by the document header ([TSON-DATA] §2.2), and every operator it uses is a token that lexer already emits — the reserved special tokens of [TSON-DATA] §7.2.5 receive their meaning in this document. The schema grammar imports [TSON-DATA]'s `data-value` production at exactly two points — constructor-instantiation values (§3.3) and field-modifier values (§3.1) — and the coupling is one-directional: nothing in the data grammar depends on this document.


### 1.1 The TSON Specification Series

- **Part 1: Data Format** [TSON-DATA] — the lexer, the data grammar, base type resolution, and the built-in type vocabulary.
- **Part 2: Schemas and the Type System** (this document) — the schema grammar, the type system, the schema chain, and the operations of the `schema`, `meta`, and `import` directives.


### 1.2 Design Principles

In addition to the principles of [TSON-DATA] §1.2, the schema layer is governed by:

1. **Schema-value separation** — A document never references its own definitions via type annotations. Every type reference (`!name`) resolves against an external schema identified by the document's `!!schema` directive. A schema defines types; a data document uses them. See §11.

2. **Purpose-built representation** — Schemas are declarations, not data. A schema document shares the data format's *lexicon* — the frozen lexer, its tokens, annotations, and directives — but has its own body grammar, selected by the document header ([TSON-DATA] §2.2; §17.1). Each document kind gets the grammar its job needs; the two meet only where a schema document genuinely embeds data (constructor-instantiation values and field-modifier values), and the coupling is one-directional. The *semantics* remain shared: a schema document resolves to an ordinary TSON value (a schema value, §11.7), and resolver output is an ordinary data document (§13).

3. **Permanent stability** — The schema grammar, the meta-schema, the core type library, and the resolver output contract are frozen once published, on the same terms as [TSON-DATA] §1.2 principle 7. New types are added through new type libraries, not through changes to this document.


### 1.3 Conformance

[TSON-DATA] §1.5 defines the series' two conformance classes. **Class 1** (data-format processor) is defined there in full and implements nothing from this document — its sole schema-layer obligation is to reject schema documents with a categorized diagnostic. This document defines **Class 2**.

A **Class 2 processor** (schema-aware processor) conforms to [TSON-DATA] and additionally implements the schema grammar (§3–§8, §17), the directive operations (§9), name resolution and the schema library (§11, §14), schema compilation and resolver output (§13), atom token parsing (§15), and validation. Such a processor:

- MUST pre-load the meta-kernel and meta-schema (§11.5, §14.1) and SHOULD pre-load the core type library;
- MUST resolve type annotations through the active schema when one is in scope, and MUST NOT apply the [TSON-DATA] §5 built-in vocabulary in schema scope (§2.1);
- MUST produce, for every valid schema document, a resolved schema value conforming to the `type_definition` contract (§13) — `subtypes` computed, `supertypes` computed from source (§12). Serializing the resolved schema value as a data document is OPTIONAL; output, when produced, MUST conform to §13's serialization contract;
- MAY implement ingest of resolver output (§13, §14.1); an implementation that does MUST apply §12's derived-field treatment and §14.1's source rules;
- MUST enforce the identity-agreement rule (§14.1) and verify hash-pinned references per [TSON-DATA] §2.2.1 (§14.2);
- MUST report errors in the categories and phrasings of [TSON-DATA] §8.1.


### 1.4 Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

This document uses a small fixed vocabulary for the schema layer's artifacts, grammars, and roles:

- A **schema document** is the document kind whose header carries `!!meta` ([TSON-DATA] §2.2) and whose body is a schema map (§11.7, §17.1) — the source artifact that is authored, published, hash-pinned, and resolved.
- A **schema** is what a schema document defines: a named, immutable collection of type declarations, identified by URL and referenced by the `!!schema`, `!!meta`, and `!!import` directives. Where the distinction between the artifact and its document is immaterial, this series says "schema".
- A **schema value** is the resolved form of a schema: a value of the kernel's `schema` type, `map<type_name, type_definition>` (§12), produced by resolution and optionally serialized as a data document (resolver output, §13). Schema values are derived artifacts, never schema sources (§14.1).
- A **meta-schema** is a schema in its governing role — the target of a `!!meta` directive. `meta.tn1` is the canonical meta-schema (§12); the meta-kernel is the root of the governing chain (§11.5).
- The **schema grammar** is the body grammar of schema documents (§17.1), the sibling of [TSON-DATA]'s data grammar; the **type-definition grammar** is its declaration right-hand side — the `type-def` production that each `name => type-def` declaration activates.


### 1.5 Companion Artifacts

This document is published with four companion artifacts:

| Artifact | Status | Content |
|----------|--------|---------|
| `meta-kernel.tn1` | Normative | The self-referencing bootstrap layer (§12) |
| `meta.tn1` | Normative | The canonical meta-schema (§12) |
| `core.tn1` | Normative | The core type library (§12, [TSON-DATA] §5) |
| Resolver Output Reference | Non-normative | Complete resolver output for the three schemas above, as test fixtures (§13) |

The normative artifacts are pinned by content hash at publication. Per §11.5, implementations pre-load the kernel and meta-schema as in-memory structures; the artifact documents are descriptions of those structures, and the in-memory model is authoritative.


### 1.6 Design Rationale

Three design decisions recur throughout this document; their rationale is collected here so it is not re-derived.

**One relation, two rungs.** `!!schema` and `!!meta` bind the same relation — *validate me against X* — at different rungs of the resolution ladder (§11.1): data → schema (optional), schema → meta (mandatory), meta → meta-kernel (bootstrap, closed by pre-loading). The name difference is not redundancy. It carries the document-kind dispatch bit — classification happens in the header, on the directive name alone, before any value is parsed ([TSON-DATA] §2.2) — and it marks the layer boundary the reader is crossing. The meta layer is the format's sanctioned extension point: new type vocabularies arrive as alternative or extended meta-schemas chaining to the meta-kernel, never as grammar changes. The ladder is a sequence of governing relations, not a resolution path: each document consults only its governing target's namespace, one hop (§11.3). A design in which one directive name served both rungs would surrender either the no-value-parsing dispatch guarantee or the visible layer boundary; this one keeps both.

**Nothing performs parse-time I/O.** Earlier drafts defined an inclusion directive (`!!include`) that spliced external content into a value position at parse time. It is deleted from the series. Parse-time inclusion is a well-worn attack vector — XML's external-entity mechanism (XXE) is the canonical precedent — and it buys nothing the format does not already have: inclusion is a reference (`!uri`) plus an application-level dereference policy, applied after parsing, under the application's control. The same stance covers schema resolution: `!!schema`, `!!meta`, and `!!import` URLs are logical identifiers resolved through a local library (§14), and fetching is an explicit, opt-in application capability ([TSON-DATA] §3.3, §9.3; §16.2).

**The schema document is the source; resolved form is derived.** A schema's published identity is its schema document — the `.tn1` source, hash-pinned via `!!id` ([TSON-DATA] §2.2.1). Resolution *derives* from it an in-memory schema value, which may optionally be serialized as a data document (resolver output, §13). The derived form contains information that is computed, not authored — `supertypes`, `subtypes`, synthesised entries, flattened references — and a document carrying such fields cannot prove them: read directly as a schema, a stale, corrupted, or maliciously altered derived document would silently change validation outcomes. The stratification therefore has teeth: schema URLs resolve to schema documents, never to resolved-form documents (§9.2, §14.1), and resolved-form documents enter the schema library only through the explicit ingest path (§13), which does not take derived fields on trust.


## 2. Data Values Under a Schema

[TSON-DATA] defines the syntax of data values and their schemaless interpretation. This section defines how an active schema changes that interpretation: type-annotation resolution (§2.1), atom parsing in place of base type resolution (§2.2), set semantics over array syntax (§2.3), extensions to the absent sentinel rules (§2.4), and resolver behaviours at typed positions (§2.5). A schema becomes active through the `!!schema` directive (§9.2).


### 2.1 Type Annotation Resolution

In data values, a type annotation (`!name`, [TSON-DATA] §3.2) marks **instantiation** — the value is concrete data conforming to the named type.

The type name resolves against the external schema identified by the current `!!schema` directive — never against definitions within the same document. See §11 for the complete schema resolution rules. Inside the type-definition grammar, `!` has an additional role: it marks constructor instantiation (§3.3).

**The built-in vocabulary does not apply in schema scope.** When a schema is in scope, the [TSON-DATA] §5 built-in type annotations do not apply — all type annotations MUST resolve through the schema's type-name namespace (local entries plus imports, §11.3.2). A built-in annotation name that is not defined by the active schema is an unresolved type error. Schemas wanting `uuid`, `base64`, `datetime`, and the other built-in names import the core type library (or define them locally); built-ins are not implicitly available alongside a schema. This is the normative statement of the scoping rule restated in [TSON-DATA] §5.1.

A document with no `!!schema` directive has no type vocabulary: base type resolution ([TSON-DATA] §4) and the built-in annotations ([TSON-DATA] §5) apply, and any other type annotation is preserved unresolved per [TSON-DATA] §3.2.

**Records are closed under their type.** When a schema is in scope and a record's type is known, the record MUST contain only fields defined by its type. Fields appearing in the data that are not present in the type definition are validation errors. This applies to both directly-typed records (`!person { ... }` validated against the `person` type) and structurally-positioned records (a record value at a record-typed field position). Schemaless records — records without a known type — have no closure rule because they have no defined field set; they are whatever the data says they are. Closure is what makes schema evolution a discrete operation rather than a backward-compatibility negotiation: every published schema version is a precise, immutable contract about what fields exist. See §11.4 for the schema-evolution implications.

**Type expression syntax is not available in data values** ([TSON-DATA] §3.2). To annotate an array or map value with a named type in data, declare a named type in the schema:

```
int_list => [integer]
scores => [integer; +]
translations => map<text, text>
```

Then in data: `!int_list [1 2 4 8 32]`, `!translations { en => Hello fr => Bonjour }`.

**Validation follows what the name is.** In a data document, `!T value` asserts that the value conforms to `T`, and what conformance means is determined by `T`'s own definition, one level down. An **atom instance** validates a single token by its parsing contract (§15): `!uint8 42`, never `!uint8 { ... }` — a record is not an atom value. A **product** validates a record against its field list; a **choice** validates any conforming variant. A **constructor** is a record-shaped type — its declaration composes a constraint-field record (§8) — so it validates a record against that field vocabulary: `!integer_type { min: 0  max: 255 }` is a record conforming to `integer_type`'s fields, receiving exactly the record validation any product gets. Field vocabulary and field types are checked like any record; family coherence between bindings (e.g. `min ≤ max`) is a compilation and ingest concern (§12, §13), not data validation.

There is **no construction in data**. Construction — `!C { bindings }` producing a new type — is a schema-grammar operation (§3.3); the same surface shape in a data document is a record that *describes* constraints, which is precisely what resolver output stores in `type_definition.body` (§13). The two category errors are symmetric: a constructor never types its family's atom values (`!integer_type 42` is a type error — `42` is not a record; the value type is the instance, `!integer 42`), and an instance never types records (`!uint8 { min: 0 }` is a type error — the constraint vocabulary belongs to the constructor, one level up).

**Schema values.** The type annotation `!schema` marks a map as a schema value. This is a regular type annotation — `schema` is a type defined in the meta-kernel as `map<type_name, type_definition>`. A schema document's body is written as a braced map of declarations without the `!schema` annotation (§11.7) — the document kind and `!!meta` already identify it — and it *resolves to* a `schema` value: the map is visible in the syntax and authoritative in the semantics. The `!schema` annotation appears on data documents that carry resolved schema structure, most notably resolver output (§13). See §11 for schema resolution rules and §11.7 for schema document structure.


### 2.2 Atom Parsing Replaces Base Type Resolution

When a schema is in scope, base type resolution ([TSON-DATA] §4) does not apply at typed positions. Each position's declared atom type owns its own parsing contract (§15); unquoted tokens are interpreted by that atom's parser, not by the schemaless dispatch. The tokens `true`, `false`, and `null` have no special status in schemaful mode — their meaning is determined entirely by the type annotation or field type in the schema.

**`null` at `void`-typed positions.** The sole exception is a position whose declared type is `void` (§8): there the token `null` is accepted as an equivalent spelling of the absent sentinel `_` and normalised to absence. The concession is local to `void` — because `void` has a single inhabitant, there is no absence-vs-value distinction to lose — and does not change `null`'s meaning at any other position. Authors SHOULD write `_`; `null` is tolerated but discouraged, and a `void` position round-trips to `_`. This rule also covers JSON-shaped data processed under a schema: a JSON `null` landing at a `void`-typed position is accepted as absence, while everywhere else it must satisfy the position's declared type.


### 2.3 Sets

A **set** is an unordered collection of unique values. Sets are not a distinct grammar construct — they share array syntax `[ ... ]` at the data level ([TSON-DATA] §2.7). Set-ness is a schema property declared via the `set` constructor (§8, defined in meta-kernel). Without a schema, every `[ ... ]` is an array; with a schema, the field's declared type determines whether the value is treated as an array or a set.

A **set** is an unordered collection of unique values. Sets are not a distinct grammar construct — they share array syntax `[ ... ]` at the data level. Set-ness is a schema property declared via the `set` constructor (§8, defined in meta-kernel). Without a schema, every `[ ... ]` is an array; with a schema, the field's declared type determines whether the value is treated as an array or a set.

**Duplicate handling.** When source data contains a value more than once at a set-typed position, duplicates are silently deduped by the resolver — the first occurrence wins, subsequent duplicates are dropped. The resolver SHOULD warn when dedup occurs, since duplicates in source are usually authoring mistakes worth surfacing. Two values are duplicates if the field's element type's equality contract considers them equal (token identity for `set<token>`, value equality for `set<integer>`, etc.).

**Element order in resolver output.** Sets are unordered — the `set` constructor pins `unordered: = true` (§8). The resolver's materialised representation uses array syntax (the `set<T>` field type), but the order of elements in that materialised list is implementation-defined. Implementations comparing resolver outputs MUST compare set-typed fields as sets, not as ordered lists. Fixture comparison tools SHOULD canonicalise set-typed fields (e.g. by lexical sort of the materialised tokens) before byte-comparison.

**Applicability.** These rules apply uniformly to every set-typed position, including:

- The kernel's `enum.members: set<token>` — duplicate enum members are silently deduped (with a warning recommended); element order is implementation-defined.
- User-defined set-typed fields — `tags: set<text>` follows the same rules.
- Set values produced by the positional fill rule (§3.4) when a constructor's single REQUIRED field is set-typed.

**No absent semantics.** An absent element at a set-typed position is rejected because sets carry `state: REQUIRED` per the `set` constructor's pinned values (§8).


### 2.4 The Absent Sentinel Under a Schema

[TSON-DATA] §2.9 defines the absent sentinel and its data-value positions. `_` is not itself a type, but the type whose sole conforming value is `_` is `void` (§8), the unit type of absence; at a `void`-typed position the token `null` is also accepted as an equivalent spelling of `_` (§2.2). Everywhere else `_` (absence) and the base value `null` remain distinct.

This document extends the position rules of [TSON-DATA] §2.9 as follows:

| Position                                  | `_` permitted? | Meaning                                                                                          |
|-------------------------------------------|----------------|--------------------------------------------------------------------------------------------------|
| Array element (schema in scope)           | conditional    | Permitted only when the array type's element state is OPTIONAL, written `[T?]` (§3.2)            |
| Tuple element                             | yes            | Element position explicitly absent (occupies a slot); the position's state must be OPTIONAL (§3.2) |
| Field-type position (type-definition grammar) | no         | Parse error — use type parameters for "type to be filled later" (§5)                             |
| Type-ref position (type-definition grammar) | no           | Parse error                                                                                      |
| Type-def body (declaration right-hand side) | no             | Parse error — use `{}` for an empty record                                                       |
| Field modifier value (`~`/`=`)            | `=` only       | `= _` valid on OPTIONAL fields (OPTIONAL_FIXED to absent); `~ _` and `= _` on REQUIRED fields are resolver errors (§3.1) |

When a schema is in scope, absence at an element position requires the governing container type to permit it: for tuples, the position's `state` must be `OPTIONAL`; for arrays, the type's element state must be `OPTIONAL` (written `[T?]` — see §3.2). Absent elements occupy positional slots, and size constraints count all slots including absent ones. For tuples specifically, OPTIONAL positions require explicit `_` to occupy the slot — the tuple's length is fixed by its type, and short tuples are validation errors regardless of trailing-optional positions (§3.2).


### 2.5 Resolver Behaviours at Typed Positions

**Typed key equality.** [TSON-DATA] §2.6 defines parser-layer (textual) duplicate-key detection for maps. When a schema is present and the key type is known, the resolver MAY additionally apply type-specific equality. The resolver SHOULD warn when type-aware equality detects duplicates that the parser did not catch. The MAY is deliberate: once keys are realised as host-language values, equality semantics are determined by the host language's collection types, and TSON cannot uniformly mandate equality rules across hosts it does not control.

**Empty braces.** [TSON-DATA] §2.8 defers empty-brace disambiguation to declared type information. Under a schema, the expected type at the position supplies that information: the resolver transforms an `EmptyBraceValue` into an empty record or empty map per the expected type, defaulting to an empty record when the position is untyped.


## 3. The Type Definition Grammar

Each declaration in a schema document binds a type name to a type definition: `name => type-def` (§11.7). The `=>` declaration operator is the same compound token the data grammar uses for map entries ([TSON-DATA] §7.2); everything to its right is parsed by the type-definition grammar. This section defines that grammar's field states, type expressions, constructor forms, and canonical desugaring. The complete ABNF is given in §17.1.

Inside the type-definition grammar, type positions are determined by grammar context — the `!` prefix is not used for type references (it is used for constructor instantiation; see §3.3). Type names used as type-refs resolve against the type-name namespace (§11.3.2).

### 3.1 Field States

Within the type-definition grammar, each field in a record definition has a state on the spectrum of completeness. The state is determined by two independent axes: **presence** (required vs optional) and **mutability** (free, default, or fixed).

Inside the type-definition grammar, type positions are determined by grammar context — the `!` prefix is not used for type references (it is used for instances; see §3.3). After the `:` in a field definition, the parser expects a type reference (resolved by looking up field names first, then type names in the local schema).

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

Complex default or fixed values (arrays, records, maps) are not supported in v1: a modifier value is a single scalar token (§17.1). A named-value entry form (`name = value`) that would let modifiers reference structured values was considered and deliberately deferred — it requires a reference sigil in modifier position and is out of scope for this revision.

**Eager resolution.** Default and fixed value tokens are resolved and validated at schema-load time, not deferred to per-validation. The token is parsed by the field's type — for typed fields by the atom's parser; for `value`-typed fields by [TSON-DATA] §4 base type resolution — and stored as the resolved host value. A default or fixed value that fails parsing or fails the type's constraints is a schema-load error, not a deferred validation error. This matches §15's eager-conversion rule for constraint-field values and applies uniformly to defaults and fixed values on all field types.

Examples within a record definition:

```
config => {
  host:   text
  port:   integer ~ 8080
  debug:  boolean = false
  label:  text?
  format: text? = json
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
config => {
  tags:     [text; +]
  aliases:  [text]?
  notes:    [text?]
  labels:   [text?; ..10]?
  metadata: map<text, integer?>?
  retries:  integer ~ 3
}
```

**Type name resolution.** In the type-definition grammar, type names used as type-refs (in field positions, type arguments, choice variants, composition targets, and narrowing sources) resolve against the type-name namespace — parameters of the enclosing definition, local declarations of the schema, and entries brought in by `!!import` directives. Instantiation and narrowing targets (the name after `!`), generic-application heads, and the implicit desugar targets of the sugar forms resolve differently — through the structure namespace supplied by the schema's `!!meta` target; see §11.3.1 for the full resolution order, including the `!T` lookup rule. Bare names always refer to types — there is no field-name shadowing of type names.

**Inline structural definitions — atom narrowings and bare records prohibited.** Schema authors MUST introduce atom narrowings and record types via named declarations; they MAY NOT appear inline in field-type, tuple-element, array element, choice variant, type-argument, or composition positions. The two prohibited forms:

- `!decimal { min: -273.15 max: 10000 }` as a field type — atom narrowing.
- `{ name: text }` as a field type — bare record.

The prohibition is not a parsing necessity. Under the document-kind split a schema body is never parsed in data mode: `!decimal { min: 0 max: 100 }` in a type-def position has exactly one available reading (constructor application or instance narrowing, §3.3 — either way the braces are read against the constructor's constraint record), and `{ name: text }` has exactly one (a record's field list). Earlier drafts grounded this rule in grammar ambiguity between the data and type readings of identical surface shapes; that ambiguity dissolved when schema documents became their own document kind. The rule survives because of what a schema is for:

**Names are the unit of meaning and reuse.** A narrowing exists to give a contract a name: `temperature`, not `!decimal { min: -273.15 max: 10000 }` repeated at each use site. An anonymous inline definition cannot be referenced, narrowed, composed with, annotated, or documented — and the same constraints written inline at three field positions are three definitions free to drift apart. A named declaration is written once and changed once.

**Resolver output is made of names.** Every type the resolver produces is a named entry in the schema map (§13). The permitted inline forms are combinations of names — `[age]`, `map<text, score>`, `(email | phone)` — whose synthetic identity is derivable from the form itself (`array#age`, §13.1). An inline atom narrowing or bare record *defines new content* — constraint bindings, field lists — whose name is derivable from nothing; the resolver would have to invent identifiers for types the author could and should have named. The inline/named boundary is the reference/definition boundary: inline forms may combine existing named types, and anything that defines new structure must itself be named.

The required form is:

```
person => { name: text }
```

then `person` is referenced by name where needed.

The same boundary explains the permitted inline forms: array brackets `[T]` and `[T; +]`, type arguments `name<T>` and `map<K, V>`, and choice parentheses `(A | B)` apply the closed set of container and choice combinators to named types. They introduce no new contract content beyond the combinator itself — a size spec rides along as part of the container form and folds into the synthetic identity (§13.1) — so the resolver can materialise their entries mechanically without doing the author's naming for them. A useful corollary, rather than the ground: these shapes never occur in data values (angle brackets and choice parentheses are reserved special tokens, [TSON-DATA] §7.2.5), so a reader never has to ask which grammar they are in.

Implementations MAY warn on permitted inline forms that exceed a configurable nesting depth.


### 3.2 Type Expressions

Inside the type-definition grammar, type expressions support arrays, tuples, optionality, and type arguments:

```
config => {
  tags:     [text]                array of text values
  scores:   [integer; +]           non-empty array (one or more)
  matrix:   [real; 9]             exactly 9 real values
  batch:    [order; 1..100]        between 1 and 100
  aliases:  [text]?              optional field, array of text values
  meta:     map<text, integer>   typed map
  point:    [real, real]          tuple (two real values)
  sparse:   [text, text?]      tuple with optional second position
  contact:  (email | phone)        choice type
}
```

**Array types** use `[type]` with an optional size specifier after `;`:

```
[text]             any size
[text?]            any size, absent elements permitted
[text; +]          one or more
[text; 5]          exactly 5
[text?; 5]         exactly 5, absent elements permitted
[text; 1..100]     1 to 100
[text; 1..]        at least 1
[text; ..10]       at most 10
```

The size specifier is a single unquoted token in the parser grammar (`size-spec = unquoted-token`). The resolver interprets the token as one of six forms: `+` (one or more, equivalent to `1..`), `N` (exactly N), `N..M` (bounded range), `N..` (at least N), `..M` (at most M), or absent (unconstrained). N and M are non-negative decimal integers without leading zeros. When both N and M are present, N MUST be less than M. For exactly N elements, use the `N` form directly. The resolver MUST reject any token in a size-spec position that does not match the pattern `^(\+|(0|[1-9]\d*)(\.\.(0|[1-9]\d*)?)?|\.\.(0|[1-9]\d*))$`. A size specifier of `0..` is equivalent to an unconstrained array.

The element position accepts an optional `?` suffix, producing `element_state: OPTIONAL` on the resolved `array`. Under `[T?]`, elements at any position MAY be the absent sentinel `_` (§2.4). Absent elements occupy a positional slot: the data `[a _ c]` has three elements, and satisfies a `[T?; 3]` size constraint. Without the `?` suffix, `state` defaults to `REQUIRED` and absent elements are a validation error when a schema is in scope.

The `set` constructor narrows `array` and pins `state: = REQUIRED` — absence has no meaning in an unordered collection of unique members.

**Tuple types** use `[type, type, ...]` with comma or whitespace separation between individually typed positions:

```
[real, real]                 two real values
[text integer boolean?]    three positions, third optional
```

A tuple requires at least two element type expressions. When the parser encounters two or more type-refs separated by whitespace or comma inside brackets, the result is always a tuple. A semicolon after a single type-ref introduces a size specifier for an array. A single type-ref with no semicolon is an unconstrained array. The separator character (whitespace/comma vs semicolon) is the disambiguating signal. A single type in brackets (`[text]`) MUST be interpreted as an unconstrained array, not a one-element tuple. `[text,]` is a parse error — trailing separators are not permitted anywhere (see [TSON-DATA] §2.4).

Tuple positions support only REQUIRED and OPTIONAL states; defaults and fixed values are not available for tuple elements. Tuples and arrays share the `element_state` enumeration in the meta-schema — it has just two members, reflecting the narrower vocabulary available to positional containers compared to record fields (which support five states via `field_state`).

Tuples are fixed-length: every position MUST be present in the data. An OPTIONAL position may carry the absent sentinel `_` to indicate explicit absence at that slot, but the slot itself MUST appear. A tuple value with fewer elements than the tuple type's position count is a validation error, regardless of whether the missing positions are OPTIONAL. For example, given the type `[text, text?]`:

- `[a, b]` — valid (both positions filled with values).
- `[a, _]` — valid (second position explicitly absent).
- `[a]` — validation error (tuple type has two positions; data has one).

Authors who want trailing-optional semantics should use a 1-or-more-element array `[text; +]` rather than a tuple.

**Choice types** use `(type | type | ...)`:

```
(email | phone | address)    one of three types
```

**Type arguments** use `name<type, type>`:

```
map<text, integer>         typed map (binds K, V parameters)
set<text>                  typed set (binds T parameter)
array<text>                explicit array form
```

The angle-bracket syntax binds positional type arguments to a constructor's declared type parameters (see §5 for parameter declarations). The argument count MUST match the constructor's parameter count. Type arguments are themselves type references and may be parameterized recursively (`map<text, array<integer>>`). Bare references to a parameterized type without binding its parameters (e.g. `map` with no `<>`) are resolver errors — parameter binding is mandatory at every use site.


### 3.3 Constructor Instantiation and Instance Narrowing

Within the type-definition grammar, the `!` prefix marks construction of a type from a constructor. The name after `!` resolves per §11.3.1's lookup order: the type-name namespace first (an atom instance there makes the form an instance narrowing), then the structure namespace supplied by `!!meta` (where the entry must be a constructor). Two forms exist, with different semantics:

**Instantiation — `!T { values }`.** Produces a constructor instance filled with specific values. The data-value after `!T` is interpreted against the constructor's record shape — the field list `T` declared as its narrowable vocabulary. This interpretation differs from the data-mode reading of `!T value`, where `!T` annotates a value parsed by `T`'s atom contract (e.g. `!decimal 250.12` annotates the decimal value 250.12). In type-def body position, `!T { ... }` interprets the brace-record as `T`'s constructor record (`min`, `max`, etc.), not as data shaped by `T`. See §3.1 for why this distinction motivates the rule that atom narrowings cannot appear inline.

This form does NOT establish IS-A with `T`: construction transfers only the `kind` (ATOM, PRODUCT, or SUM) of the constructor, not its supertypes. The resulting type records `source: T` to indicate which constructor produced it, but `supertypes` is empty.

A constructor's kind is determined at definition time by the base kind (`atom`, `product`, or `sum`) reachable through its transitive supertypes chain. A constructor whose chain contains zero base kinds resolves to `kind: PRODUCT` by structural default. A constructor whose chain contains exactly one base kind takes that kind. A constructor whose chain contains two or more base kinds is a resolver error — the kinds are categorically distinct and cannot be combined. The kind is settled when the constructor is defined, so `!C {}` simply inherits `C`'s settled kind.

```
integer  => !integer_type {}
text   => !text_type {}
boolean  => !enum [true false]
base64   => !binary BASE64
```

`integer` has `source: integer_type` and `kind: ATOM`, but is not IS-A `integer_type`. It has no supertypes.

**Instance narrowing — `!T { values }` where `T` is a constructor instance.** When the `!` target is an existing constructor instance (not the constructor itself), the form narrows the instance by tightening values on the constructor's fields. This form DOES establish IS-A: the new type records `source: T's constructor`, `supertypes: [T]`, and a body matching `!T's_constructor { narrowed values }`.

```
uint8             => !integer { min: 0  max: 255 }
non_empty_text  => !text { min_length: 1 }
positive_integer  => !integer { min: 1 }
```

`uint8` has `source: integer_type`, `supertypes: [integer]`, and can be narrowed further.

The distinction is in the target of `!`:
- `!integer_type {}` — target is the constructor; empty instantiation; no IS-A.
- `!integer { min: 0 max: 255 }` — target is the constructor's instance; narrowing; IS-A `integer`.

**Construction creates siblings, not subtypes.** Because construction establishes no IS-A, one constructor may found any number of nominally distinct families: `dogs => !integer_type {}` is a fresh atom family with the same body as `integer` and no relation to it, and `small_dog_count => !dogs { min: 0  max: 5 }` narrows `dogs`, not `integer`. Sibling families from one constructor are a supported pattern, not an accident of the grammar. The only IS-A the `!` forms ever create is the narrowing's single hop to its instance — recorded in `type_definition.supertypes` and, deliberately, nowhere in the body: the canonical form (§3.4) erases the surface distinction, so `supertypes` is the sole carrier of the atom family's direct IS-A fact (§12, §13).

**Design note — one prefix, two operations.** The `!` prefix does two different jobs in this grammar — narrowing an atom instance, constructing from a constructor — distinguished not by syntax but by what the target resolves to (§11.3.1). The overload is confined to schema documents: in a data document `!T` is only ever a type annotation, an atom instance never validly annotates a record, and the narrowing reading cannot arise — resolver-output bodies carry constructor names only (§13). A grammar-level separation of the two schema-side roles was considered and is deliberately deferred to a post-v1 review.

**Single-required-field positional form.** When a constructor has exactly one REQUIRED field, the data-value after `!C` fills that field directly. See §3.4 for the full desugaring rule.

**Enum member naming convention.** Enum members are conventionally written in uppercase (`ACTIVE`, `INACTIVE`, `BASE64`, `HEX`) to distinguish them visually from type names (lowercase) and field names (lowercase). This is a style convention applied throughout the meta-schema and core type library; the parser does not enforce it. The single exception in the core library is `boolean`, whose members `true` and `false` retain their conventional lowercase form because they are language-level constants in the data grammar ([TSON-DATA] §4.2), not user-defined enum members. New enum types in user schemas SHOULD follow the uppercase convention for consistency with `core.tn1`.


### 3.4 Canonical Form and Desugaring

All type-definition bodies ultimately take a single canonical form:

```
!C { bindings }
```

where `C` names a constructor and `bindings` is a record literal filling the constructor's fields. Every other form in the type-definition grammar — inline type expressions, positional constructor forms, instance narrowings — is syntactic sugar that desugars to this form. The resolver performs desugaring during type-definition resolution; resolver output always records the fully expanded canonical form in the `body` field.

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
!array text                   →  !array { element_type: text }
```

REQUIRED_DEFAULT, REQUIRED_FIXED, and OPTIONAL fields do not count toward the single-REQUIRED rule. The positional form is invalid when the constructor has zero, two, or more REQUIRED fields — the resolver MUST reject such uses with a clear error message.

**Record-bindings form.** `!C { ... }` is the explicit form: an empty or non-empty record literal supplying values for the constructor's fields. The record-bindings form is valid for any constructor as long as the bindings cover all REQUIRED fields that are not pinned by FIXED or covered by DEFAULT. Empty bindings `!C {}` are valid whenever the constructor has no unfilled REQUIRED fields — including `!unit {}` (which has no fields), and any constructor whose REQUIRED fields are all pinned by FIXED or covered by DEFAULT. The "zero, two, or more REQUIRED fields invalid" rule applies to the positional form only, not to the record-bindings form.

**Instance narrowing.** When `!C` targets a constructor *instance* rather than a constructor itself, the form desugars by retargeting to the instance's source constructor:

```
!integer { min: 0  max: 255 }   →  !integer_type { min: 0  max: 255 }
!text { min_length: 1 }       →  !text_type { min_length: 1 }
!decimal { min: 0  max: 100 }   →  !decimal_type { min: 0  max: 100 }
```

The resolver recognises this case by checking `C.constructor`: if `false`, `C` is an instance and the retarget follows `C.source`. The resulting type records `source: C.source` and `supertypes: [C]` — instance narrowing establishes IS-A with the narrowed instance (§3.3), unlike construction which transfers only kind.

**End state.** After desugaring, every type-def body in resolver output is `!C { bindings }` where `C` is a constructor and `bindings` is a record literal supplying values for the constructor's REQUIRED fields that are not pinned by REQUIRED_FIXED or covered by REQUIRED_DEFAULT. Pinned and default values come from the constructor itself and do not appear in the binding record; OPTIONAL fields appear only when the source provides a value. Positional forms are always expanded to their record-literal equivalent — `!array text` becomes `!array { element_type: text }` — and inline type expressions and instance narrowings are fully desugared. The surface abbreviations exist only in source text.

**Named definitions required.** The instance form (`!T { values }`) and the empty constructor instantiation (`!T {}`) are valid only as the top-level body of a declaration — they cannot appear inline in field-type, tuple position, array element, choice variant, type-argument, or composition positions. See §3.1 for the rationale. A constrained atom such as `!decimal { min: -273.15 max: 10000 }` must be introduced with its own declaration and referenced by name:

```
temperature => !decimal { min: -273.15  max: 10000 }
retries     => !integer { min: 0  max: 10 }
status      => !enum [ACTIVE INACTIVE SUSPENDED]

config => {
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
person => { name: text  age: integer }

elder => person { age: age }

age => !integer { min: 0  max: 150 }
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
elder => person {
  age: age
  role: = engineer
  level: integer ~ 1
}
```

In a narrowing body, the type-ref in a field definition MAY be elided. When only a field modifier is present (`field: = value` or `field: ~ value`), the field's type is inherited from the source definition: the omitted type is filled in from the inherited declaration, and only the value state is changed. A field-modifier-only field definition is valid exclusively in narrowing bodies. In a fresh record definition or a supertype-composition body, every field MUST have an explicit type-ref — the resolver MUST reject modifier-only entries in these contexts. Composition is an additive operation: it brings in supertype fields via `&` and declares new fields; tightening an inherited field in a composition body requires restating the type-ref (e.g. `employee => person & { age: age ~ 30 }`, not `{ age: ~ 30 }`). Modifier-only tightening is reserved for narrowing because narrowing is specifically about refining existing fields without adding new ones.

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
address => { street: text  city: text  postcode: text }
contact => { name: text  email: text }
customer => address & contact & { loyalty_tier: text }

config => { host: text  port: integer  debug: boolean }
production => config { host: = "prod.example.com"  debug: = false }
```

**Supertype field conflicts.** When multiple supertypes are combined via `&`, each supertype contributes its fields to the composed type. The supertypes MUST contribute disjoint field sets — a field name appearing in more than one supertype path is a resolver error, including diamond cases where the field traces back to the same originating type through both paths. Even when the source is structurally identical, the composed record has only one slot per field name and cannot meaningfully take a value from "both paths."

If two types genuinely need to share a field, the schema author must factor the shared field into a direct supertype of the composed type, not into a common ancestor reached through two intermediate supertypes. For example, given `identifiable => { id: uuid }` and intermediates `named => identifiable & { name: text }` and `versioned => identifiable & { version: integer }`, a composition `artifact => named & versioned & { ... }` is a resolver error: `id` reaches `artifact` through both `named` and `versioned`. The fix is to remove `identifiable` from the intermediates and compose it directly: `named => { name: text }`, `versioned => { version: integer }`, `artifact => identifiable & named & versioned & { ... }`. Now `id` enters only through the direct `identifiable` composition; `named` and `versioned` are pure mixins for their own fields.

The trailing `& { ... }` body may tighten inherited fields (following the narrowing state transition table in §4.1) or add new fields. Fields in the body that do not exist in any supertype are new fields. Fields in the body that match an inherited field name are tightening refinements and must follow the narrowing rules.

**Field ordering.** Supertypes contribute fields in left-to-right order as listed in the `&` composition. Each supertype's own fields appear in their declared order. Body fields that tighten inherited fields replace them in place — the inherited slot is preserved, only its state and value are updated. Body fields that do not match any inherited field are new fields, appended after all inherited fields.

**Constructor marker is independent of supertypes.** The `~` marker at the start of a type-def body is the sole signal for `constructor: true` in resolver output. A composition like `uri_type => ~text_type & atom_specification & { ... }` is a constructor because of the leading `~`, not because `text_type` is itself a constructor. Without the `~`, the same composition would produce a non-constructor type even though one of its supertypes is a constructor. Constructorness is a property of the definition, not inherited through IS-A.

Example combining a constructor supertype, a non-constructor mixin, and a tightening body:

```
atom_specification => { spec: uri }
uri_type => ~text_type & atom_specification & {
  spec:    = "https://www.rfc-editor.org/rfc/rfc3986"
  scheme:  text?
}
```

`uri_type` is a constructor (`~`), IS-A `text_type` and `atom_specification` directly. Its fields, in order: `text_type`'s four constraint fields (`min_length`, `max_length`, `length`, `pattern`), `atom_specification`'s one field (`spec`) — tightened in place by the body to `REQUIRED_FIXED` with the RFC 3986 URL — and `uri_type`'s new `scheme` field.

**Composition and narrowing accept parameterized type references.** Both `&` composition and bare-source narrowing operate on type-refs, which may carry type arguments. A narrowing of a parameterized type must re-declare its open parameters in its own `<>` slot (see §5 for partial application). Composing with a parameterized supertype works the same way: `vip => <T> customer & box<T> & { ... }` declares `vip` as parameterized over `T`, with `T` flowing through to the `box` supertype's parameter slot.


### 4.3 Subtraction

Subtraction is the third type-level operation, complementing construction and narrowing. Where composition (`&`) adds fields and narrowing tightens existing ones, subtraction *removes* fields from an existing definition. Unlike composition and narrowing, subtraction deliberately breaks the IS-A relationship — the resulting type is no longer source-compatible.

Subtraction is expressed by writing `field: _` (bare `_`, no type-ref, no modifier) in a composition or narrowing body. The presence of any `field: _` in the body switches the operation from composition or narrowing into subtraction. One `field: _` is enough — once IS-A is broken, the resulting type is no longer source-compatible regardless of how many fields were removed.

```
account_public => account & { password: _ }                       ; remove one field
account_minimal => account & { password: _  internal_id: _ }       ; remove multiple
account_view => account & { password: _  email: text ~ "n/a" }   ; mix with tightening
account_combined => account & contact & { password: _ }            ; multi-source
account_via_narrowing => account { password: _ }                   ; narrowing form
```

Both composition-form (`source & { ... }`) and narrowing-form (`source { ... }`) accept subtraction. The bare `_` after the field name is what signals removal.

**Rules.**

1. **Removing a nonexistent field is a resolver error.** `account & { nonexistent: _ }` fails at schema-load time. Symmetric with narrowing's "you can only tighten existing fields."

2. **Source path does not restrict subtraction.** If `account` was itself composed from `address & contact & { ... }`, then `account & { city: _ }` removes `city` regardless of which supertype originally introduced it. Subtraction operates on the merged field set, not on field provenance. Since IS-A is already broken, there is no contract to violate.

3. **Multi-source subtraction respects the diamond rule.** When subtracting in a composition with multiple sources, the diamond rule (§4.2) fires first: a field name appearing in more than one supertype path is a resolver error before subtraction is considered. Subtraction cannot be used to resolve diamond conflicts.

4. **Mixed subtraction and tightening is valid.** A single body may contain both `field: _` removals and ordinary tightening entries. All apply: removals drop the named fields; tightening entries refine the remaining inherited fields per the narrowing state-transition table.

5. **`field: _` and `field: type? = _` are distinct.** The bare `_` form is subtraction. The `= _` modifier form is fix-to-absent (OPTIONAL_FIXED with no value). The grammar disambiguates by whether a type-ref and `=` modifier are present.

6. **Empty subtraction does not exist.** `source & {}` is composition-with-no-additions and preserves IS-A. To produce a type that copies a source without IS-A, use a type-ref declaration (a bare `source` produces a REFERENCE-kind entry per §13.2) or a trivial narrowing.

**IS-A and authorial intent.** Subtraction breaks the IS-A contract but preserves authorial lineage. The two `supertypes` fields in resolver output (§13.1) capture this distinction:

- `type_definition.supertypes` — the IS-A lattice (the validation contract). Subtraction produces an empty list: the subtracted type is no longer source-compatible.
- `record.supertypes` (in the body) — the authorial intent (where the fields came from). Preserved as the source list: the type is source-derived even though it is not source-compatible.

Consumers of resolver output that need to reconstruct subtraction lineage read `record.supertypes` from the body. Validators that check IS-A read `type_definition.supertypes` and see no obligations.

**Subtraction with parameterization.** Subtraction does not interact with parameterisation. A parameterised subtraction `<T> customer<T> & { password: _ }` declares a parameterised type whose field set is `customer<T>`'s field set minus `password`. Materialisation per §5 proceeds as usual; the field set is just smaller.

**Annotations on removed fields.** A removed field's annotations (`@doc`, `@deprecated`, etc.) are lost in the subtracted type — the field does not exist, so neither does its metadata. Applications that need source-vs-subtracted diffs can compute them from both entries.

**Spectrum of completeness.** Subtraction completes the type-level operation vocabulary. See §10 for the full spectrum.


## 5. Templates and Parameters

A type definition may declare type parameters using `<>` immediately after the `=>` declaration operator. Parameters are local names that can be referenced in the body of the definition; they are bound to concrete types when the definition is referenced with type arguments. A definition with parameters is a **template** — it has a known structure but cannot be instantiated directly because some types are not yet bound. References to a template MUST supply type arguments for all its parameters.

```
container => <T> { items: array<T> }
pair      => <T, U> { first: T  second: U }
box       => <T> { contents: T  count: integer }
```

`container<text>`, `pair<text, integer>`, and `box<real>` are concrete types. Bare `container` or `pair` references (without `<>`) are resolver errors.

**Parameter scoping.** Parameters are local to the type definition that declares them. Within the body, parameter names take precedence over the schema namespace. Parameter names do not escape, do not compose across `&`, and two definitions can independently use the same parameter name without collision. When the resolver encounters a name in a type position, it walks scope outward: parameters of the enclosing definition first, then the schema namespace. The first match wins.

**Linked types via shared parameter names.** Two fields that must resolve to the same type share a parameter:

```
homogeneous_pair => <T> { first: T  second: T }
transformation   => <T> { input: T  output: T  function: text }
```

When `homogeneous_pair<text>` is referenced, both `first` and `second` resolve to `text`. There is no need for a separate "linking" mechanism — sharing a name is the link.

**Templates are not directly instantiable.** A `type_definition` with a non-empty parameter list cannot validate data. Attempting to use a template as a type annotation in data is a resolver error. Templates exist only to be referenced, with arguments, from other type definitions or from concrete data type annotations.

**Substitution.** Eager. When the resolver sees a parameterized reference like `container<text>`, it produces a fully-substituted `type_definition` in resolver output. Resolver output contains the template alongside its substituted instances; consumers can distinguish templates by inspecting their `parameters` field.

**Fully-bound references.** When all of a template's parameters are bound to concrete types at a use site, the result is a fully-applied reference — a named type that resolves to the substituted form. These are type references (kind: REFERENCE), not narrowings:

```
api_response => <T> {
  status: integer
  data:   T
  errors: [error]
}

user_response       => api_response<user>
user_list_response  => api_response<[user]>
```

`user_response` and `user_list_response` bind `T` fully, producing reference-kind entries that point at their substituted forms. They do not declare parameters of their own because none remain.

**Partial application — parameter re-declaration.** When a narrowing of a parameterized type leaves some parameters open, it MUST re-declare those open parameters in its own `<>` slot. Implicit inheritance — where a narrowing tacitly inherits its parent's parameters — is not permitted. Every parameter has a visible declaration site.

```
text_keyed_map => <V> map<text, V>
```

`text_keyed_map` is itself a template, parameterized by V, that binds K to `text` in its body. The chain composes: `text_keyed_map<integer>` resolves to `map<text, integer>` after both substitution layers.

The `_` token is not valid in field-type positions — see the absent sentinel position table in §2.4. Authors expressing "type to be filled later" use parameters; empty records use `{}`.


### 5.1 Self-Referential Types

Types may reference themselves. Recursive structures are valid:

```
node => { value: text  children: [node] }
tree => { root: node  depth: integer? }
linked_list => <T> { value: T  next: linked_list<T>? }
```

The resolver MUST detect and handle cycles in type references. A self-referential type is complete as long as the recursive reference is through an optional field or a variable-length container (array, set, map). A required direct self-reference (`item => { inner: item }`) creates an infinitely nested structure that MUST NOT be instantiated — the resolver SHOULD warn about such definitions. Parameterized recursive types compose normally: `linked_list<integer>` is a valid concrete type whose `next` field carries another `linked_list<integer>`.

**Recursive template materialisation.** When a parameterized type is referenced with concrete arguments (e.g. `linked_list<integer>`), the resolver materialises it as a single named entry in the schema namespace, named per §13.1's synthetic naming convention (`linked_list<integer>` → `linked_list#integer`). Recursive references within the body resolve to that name — `linked_list<integer>`'s `next: linked_list<integer>?` field references `linked_list#integer`, not an inlined recursive substitution. This produces one entry per unique `(template, argument-tuple)` pair, deduplicated by structural equivalence of the arguments. The same model applies to non-recursive templates: `box<integer>` and `box<text>` are two distinct entries, `box#integer` and `box#text`.


## 6. Annotations as Types

[TSON-DATA] §3.1 defines annotation syntax and preservation. This section defines annotation semantics: an annotation is a typed metadata attachment, resolved and validated against a type reachable through the schema chain.

Annotation values are always data values — concrete values, not type definitions. This applies both in data values and within the type-definition grammar. An annotation on a type definition carries concrete metadata, not further type structure.

Annotation placement in data values follows [TSON-DATA] §3.1; the resolver preserves annotations in their authored positions. The type-definition grammar adds one further position: in `field-def` (§17.1), annotations precede the field name and annotate the field itself, mapping to the `record_field` in the resolver output.

In schema declarations, an annotation immediately preceding the declared name binds to the name. The convention `@doc:"..." name => {...}` annotates `name` (the `type_name` token at the declaration's name position), not the `type_definition` value. The resolver does not hoist annotations from the key to the value; if metadata about the type definition is intended, the annotation must follow `=>` on the value side: `name => @doc:"..." {...}`.

**Annotations are types.** An annotation `@T` (or `@T:value`) names a type `T` and attaches it as metadata to the surrounding value. Annotation resolution is one-hop resolution against the governing target's namespace — the `!!meta` target for a schema document, the `!!schema` target for a data document — its local declarations plus its imports (§11.3.4). No further rung of the ladder is walked. `!!import` entries and local entries of the schema currently being authored are NOT part of the annotation namespace. To use a type as an annotation in a document or schema, that type must be present in the governing target's namespace — for a schema document, typically meaning the type lives in `meta.tn1` or arrives through its kernel import; for a data document, in the user schema or its imports (core's `doc` re-export exists for exactly this) or another schema chained as an ancestor of the active schema. The result is then validated against `T`'s contract:

- For `void`-targeted `T` (a type whose resolved body, after reference flattening, is `void` — such as `annotation` or `numeric`), the annotation form is `@T` with no colon and no value. Bare `@T` is shorthand for `@T:_`; the resolver fills the implicit `_` before validating against `T`'s parsing contract. The `void` atom (defined in meta-kernel and re-exported by core, see §12) admits the absent sentinel `_` (see §8) — presence is the information.
- For any non-`void` `T`, the annotation form is `@T:value`, where `value` is a single data-value that conforms to `T`. `@doc:"User's full name"` validates the text against `doc`. `@confidence:0.95` validates the float against `confidence`. `@person:{first_name: john last_name: smith}` validates the record against `person`.

Any type in the governing target's namespace can be used as an annotation. There is no separate annotation namespace — annotations and types share names because an annotation *is* a typed metadata attachment. The one-hop rule is what allows the kernel's `annotation => @annotation void` self-reference to work: the kernel's governing target is itself, and meta-kernel is pre-loaded into the library, so when the resolver encounters `@annotation` it finds the pre-loaded `annotation` definition, not the entry currently being defined.

**The `@annotation` marker is advisory.** The `annotation` type, defined in meta-kernel as `@annotation void`, is a tooling hint: attaching `@annotation` to a type definition signals "this type is intended to be used as annotation metadata." Tools that surface "available annotations" filter by this marker to avoid enumerating every schema type. The marker carries no runtime force — a schema type without `@annotation` is no less usable as an annotation. A document writing `@person:{...}` against a `person` type without the `@annotation` marker is silently accepted; no warning, no error.

**Resolver-attached annotations.** Some annotations are not written by the schema author but are attached by the resolver during type resolution. The most common example is `@alias` (defined in `core.tn1`): when a reference is flattened in resolver output, the resolver attaches `@alias:name` to the resolved type, naming the source-level alias used at the reference site. A field declared as `f: email` where `email => text` resolves to a type-ref pointing at `text` with `@alias:email` attached. This preserves the source-level intent (the author wrote `email`, not `text`) while keeping the validation graph minimal. See §13.2 for the reference flattening rule. Resolver-attached annotations follow the same resolution rules as user-written ones — the resolver attaches `@alias` because `text` is the right type for that metadata, not because of any privileged status.


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

A choice type declares that a value may conform to any one of a set of alternative types. Choice types are defined using parentheses and pipe separators within the type-definition grammar:

```
contact_method => (email | phone | address)
shape => (circle | rectangle | triangle)
result => (success | error)
```

A choice MUST contain at least two variants. Each variant is a type reference in the `type-ref` grammar.

At the data level, a value matching a choice type MUST carry a type annotation (`!variant`) that selects which variant applies. The validator does not infer the variant from structure — the type annotation is REQUIRED.

The choice type name is then used like any other type name in field definitions:

```
contact_method => (email | phone | address)

person => {
  name: text
  contact: contact_method
  backup: contact_method?
  history: [contact_method; +]
}
```

Choice types MAY also appear inline in type-ref positions: `contact: (email | phone)`.

A choice type in the schema model becomes a `choice` entry with a `variants` list of type references. The resolver validates that each variant names a distinct type in the schema's type map.


## 8. Type Construction (Meta-schema Level)

Type constructors are factories that produce type definitions. Constructors define the structural vocabulary for a family of related types. Within the type-definition grammar, the `~` marker prefix indicates that a type definition is a constructor rather than a regular type:

```
record => ~product & {
  access_pattern:  product_access_type = NAMED
  size_type:       product_size_type = FIXED
  fields:          [record_field]
  supertypes:      [type_name]?
}

array => <T> ~product & {
  access_pattern:  product_access_type = INDEX
  size_type:       product_size_type = VARIABLE
  element_type:    T
  state:           element_state ~ REQUIRED
  unordered:       boolean ~ false
  unique_items:    boolean ~ false
  min_items:       integer?
  max_items:       integer?
}

set => <T> ~array<T> {
  state:        = REQUIRED
  unordered:    = true
  unique_items: = true
}
```

The `~` prefix is the constructor marker. It sets `constructor: true` in the resolver output's `type_definition` record. There is no construction in data: `!C { bindings }` produces a new type only in the schema grammar. In a data document a constructor name is an ordinary record-shaped type — `!integer_type { min: 0 max: 255 }` validates the record against the constructor's constraint fields (§2.1) without creating anything — and a constructor never types its family's atom values (`!integer_type 42` is a type error; values are typed by instances and narrowings, `!integer 42`, `!uint8 42`).

Constructors may declare type parameters using `<T>` (or `<K, V>` etc.) immediately after the `=>` declaration operator. Parameter names are scoped to the constructor's body and may appear in field positions wherever a type-ref is expected. References to a parameterized constructor MUST supply matching type arguments via `<>`. See §5 for full parameter semantics.

Note: The `~` character has two distinct uses in the type-definition grammar, disambiguated entirely by position:

1. **Default value modifier** in a field definition, after a type-ref: `port: integer ~ 8080`. Here `~` introduces the default value for a `REQUIRED_DEFAULT` field.
2. **Constructor marker** at the start of a type-def body: `~product & { ... }`, or after a parameter list: `<T> ~array<T> { ... }`. Here `~` marks the definition as a constructor rather than a regular type.

The second use covers both composing a new constructor with a base kind (`~product & {...}`) and narrowing an existing parameterized constructor (`~array<T> {...}`, as in the definition of `set`). Both are constructor-producing operations; the `~` signals that in both cases.

The two uses are grammatically distinct and cannot conflict: `~` at a field-def's value position is always a default modifier; `~` at the start of a type-def body (with or without a preceding parameter list) is always the constructor marker.

Constructors serve two roles depending on where they appear:

**Meta-schema constructors** define what the type-definition grammar produces. The meta-schema's `record`, `enum`, `array`, and other constructors define the shapes that different type-definition forms create.

**Type library constructors** define type families in user schemas and type libraries. Their members are created through construction, narrowing, or instantiation (§10). Meta defines `binary` as a constructor with a required `encoding` field, with `base64`, `base64url`, `base32`, and `hex` each produced by `!binary BASE64` etc. Meta also defines `extern` for external sum types and `unknown_type` whose instance `unknown` accepts any well-formed value of any type.

The `~` marker is orthogonal to composition and narrowing:

- `~product & { ... }` — constructor composing with a base kind
- `~array<T> { ... }` — parameterized constructor narrowing another parameterized constructor

Constructor narrowing differs from regular narrowing: fixed values CAN be replaced because constructors are meta-level definitions. When `set` narrows `array` and changes `unordered` from `~ false` to `= true`, it is defining a new constructor with different output characteristics.

**Constraint-vocabulary atom constructors.** Atom families whose instances can be narrowed with constraint values (min/max, length, pattern, etc.) are defined as pairs: a constructor carrying the constraint vocabulary and a canonical empty instance. The constructor composes with `atom` via `~atom & {...}` and lists the family's narrowable fields as an ordinary record body. The instance is produced with `!<constructor> {}`, an empty construction that records `source: <constructor>` but establishes no IS-A relationship with it (construction transfers kind, not supertypes).

Meta defines this pattern for the types it needs internally: `integer_type` / `integer`, `text_type` / `text`, `uri_type` / `uri`, `regex_type` / `regex`. Meta-core adds the numeric, temporal, identifier, text, and network constructors: `real_type` / `real`, `decimal_type` / `decimal`, `rational_type` / `rational`, `date_type` / `date`, `time_type` / `time`, `datetime_type` / `datetime`, `duration_type` / `duration`, `uuid_type` / `uuid`, `email_type` / `email`, `ipv4_type` / `ipv4`, `ipv6_type` / `ipv6`, `cidr4_type` / `cidr4`, `cidr6_type` / `cidr6`, `mac_type` / `mac`. Spec-bound constructors additionally compose with the `atom_specification` mixin and pin their `spec` field to the governing specification URL.

Narrowings of these atoms use the instance form: `uint8 => !integer { min: 0  max: 255 }`. This narrows the `integer` instance, producing a new type with `source: integer_type`, `supertypes: [integer]`, and a body `!integer_type { min: 0 max: 255 }`. Instance narrowing establishes IS-A with the narrowed parent; the new type can be narrowed further.

**The `unit` atom constructor.** Atoms with no constraint vocabulary are constructed from `unit` — an atom constructor with zero fields, the atom equivalent of the empty record `{}` for products. Meta-kernel defines `unit` directly. Its instances are opaque atoms — atoms whose values the schema language cannot further describe, distinguished from each other by name and by prose-level parsing contract (§15). Meta-kernel defines three such instances:

- `value` — admits [TSON-DATA] §4 products (null, boolean, number, string). The escape hatch for fields whose type the schema language cannot express (see §12 and the `record_field.value` declaration).
- `token` — admits NFC-normalised lexemes. Used for identifier types (`type_name`, `field_name`, `param_name`) and enum members.
- `void` — the unit type of absence: admits the absent sentinel `_` as its single canonical value (and the token `null` as an equivalent spelling, normalised to `_`; see below). Used as the target type for bare annotations like `@annotation` and `@numeric` (see §6), and usable in data as a field type or choice variant meaning "no value" — the opposite pole to `unknown` (any value ↔ no value).

Core adds `complex` — host-defined complex-number representation. The kernel's `void` is re-exported in core under the same name so that core-only schemas can target it (see §12). Kind determination per §3.3 ensures all four are `kind: ATOM`.

**`void` and `null`.** `void` is the type of absence; its canonical value is `_`. As a JSON-ergonomics concession, a `void`-typed position also accepts the token `null` as an equivalent spelling of `_`, normalised to absence — safe because `void` has a single inhabitant, so `null` and `_` cannot denote different things there. The concession is local to `void`: everywhere else `_` (absence) and `null` (the base null value, [TSON-DATA] §4.1) remain distinct, a distinction that `value`- and `unknown`-typed positions rely on. Authors SHOULD write `_`; `null` is tolerated but discouraged, and a `void` position round-trips to `_`.

User schemas SHOULD NOT introduce additional unit instances without a documented parsing contract — the schema-level distinction between two unit instances is purely nominal, so adding one solely as a marker is reasonable, but inventing parsing semantics that conflict with the kernel's three is a recipe for confusion.

See §3.3 for the rule that determines a constructor's kind from its transitive supertypes chain. Constructors composing with multiple base kinds are resolver errors.

This establishes a pattern: **types whose validation requires no constraint vocabulary are built as instances of `unit`, not as bespoke empty constructors.** Marker types (`annotation`, `numeric`), opaque types whose structure the schema language cannot describe (`value`, `complex`), and semantic tags where all the meaning lives in the type name or its annotations are all good fits. A new type should reach for a dedicated constructor only when it carries a non-empty constraint vocabulary of its own.

Two kinds of atoms, one representation: every atom in the type system — constraint-bearing or not — appears in resolver output with a constructor instance in its `body`, produced via the `!<ctor> {}` or `!<ctor> { values }` form.


## 9. Directives

[TSON-DATA] §3.3 defines the directive set: four names — `id`, `schema`, `meta`, `import` — each legal only at fixed positions, with order and cardinality enforced by the grammar ([TSON-DATA] §7.4; §17.1). The set is closed: any other directive name, or a legal name outside its position, is a parse error. There is no directive registry, no name localisation, and no unknown-directive category. Earlier drafts defined a fifth operation, external inclusion (`!!include`); it is deleted from the series — inclusion is a reference (`!uri`) plus an application-level dereference policy, and nothing in TSON performs parse-time I/O ([TSON-DATA] §3.3, §9.3; rationale in §1.6).

Type definitions are not a directive: each schema declaration (`name => type-def`, §11.7) activates the type-definition grammar (§17.1) directly.

This document defines the directive *operations* — what each directive means to the resolver. Every directive value is a URL string; URLs are logical identifiers resolved through the schema library (§14), never fetch instructions.

| Operation | Directive | Placement ([TSON-DATA] §3.3) | Defined in |
|-----------|-----------|------------------------------|------------|
| Identity declaration | `!!id` | first header line, either kind; optional in the grammar — required for published schemas (§9.1) | §9.1 |
| Schema binding | `!!schema` | data-document header; record field values; map entry values | §9.2 |
| Meta binding | `!!meta` | schema-document header, immediately after `!!id`; exactly once | §9.3 |
| Type-library import | `!!import` | schema-document header, after `!!meta`; repeatable | §9.4 |

### 9.1 The `!!id` Directive

`!!id` declares the authoritative identity (URL) of a document — the URL other documents use to reference it. It connects the file's content to its logical name in the schema library (§14), and it anchors content addressing: the hash input for a document's content hash is every byte after the id line ([TSON-DATA] §2.2.1; §14.2).

`!!id` is optional in the grammar for both document kinds and, when present, must be the first line ([TSON-DATA] §2.2). For schema documents it is required by policy, not grammar: **publishing a schema — registering it under its own name for reference by other documents, or pinning it by content hash — REQUIRES `!!id`.** An id-less schema is a development artifact; it may be registered under an application-supplied URL (§14.1) but has no published identity and cannot be hash-pinned. On data documents `!!id` appears when the document participates in content addressing — a fixture, a golden file, a document referenced by hash from elsewhere.

When schemas are committed to version control alongside application code — a common and supported deployment pattern — the `!!id` directive is what connects the file on disk to the URL that data documents reference. Without `!!id`, the mapping from filename to schema URL is implicit and fragile; with it, any tool or implementation can register the schema under the correct URL by reading the file's own declaration.

```
!!id:"http://example.com/people.tn1"
!!meta:"https://tson.io/2026/m/meta.tn1"
!!import:"https://tson.io/2026/m/core.tn1"
{
  person => { name: text  age: integer }
}
```

An application loading schemas from local files registers each one in the schema library under the URL declared by its `!!id`. The schema's URL does not need to be fetchable — it is a globally unique identifier, not a network address.

### 9.2 The `!!schema` Directive

`!!schema` identifies the schema whose types are available for `!name` references in the value it governs. The directive value is a URL string identifying a published schema.

```
!!schema:"http://example.com/people.tn1?sha256=c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5"
!person { name: Alice age: 30 }
```

**The referent is a schema document.** A `!!schema` URL resolves to a schema document — never to a resolved-schema data document. Resolver output (§13) carries resolver-derived fields (`supertypes`, `subtypes`) that cannot be verified from the document alone; a stale, corrupted, or maliciously altered derived document read as a schema would silently change validation outcomes. Resolved-form documents enter the schema library only through the explicit ingest path (§13). §14.1 states the enforcement rule; §1.6 the rationale.

On a data document's header, `!!schema` binds the schema for the entire document. On a scoped value — a record field value or map entry value ([TSON-DATA] §2.3) — it binds the schema for that value alone: the referenced schema becomes the active scope for all `!name` type annotations within that value and its descendants, and when the value ends, the scope reverts to the enclosing scope. Nested scoped values override the enclosing scope for their value. Directives are not permitted before array elements ([TSON-DATA] §3.3); §11.6 discusses the consequences for heterogeneous collections.

**The directive names a namespace, not a root contract.** `!!schema` supplies the vocabulary against which `!name` annotations resolve; it does not itself assert the governed value's type, and a schema has no privileged entry point — it is a map of declarations (§11.7). The value names its own type by annotation: `!!schema:"…"` followed by `!order { … }`. Encoders SHOULD annotate the value a `!!schema` directive governs with the type it instantiates; an unannotated value under a bound schema is legal but vocabulary-only — validation engages only where annotations appear within it, and no record-level contract applies to the value itself. At extern-matched positions the annotation is not optional: the type is the sum's discriminant and MUST be present (§11.6).

A scoped `!!schema` at a position whose type is constrained by the outer schema is a resolver error unless the outer type is permissive (`extern`, `value`, `unknown`, or a container thereof) — the outer schema must opt in to receiving foreign values at each such position. See §11.6 for the full rule.

Schema documents do not carry `!!schema`: a schema's governing contract is declared by `!!meta` (§9.3). The two directives bind the same relation — *validate me against X* — one rung apart on the schema ladder (§11.1).

A document with no `!!schema` directive has no type vocabulary. Base type resolution ([TSON-DATA] §4) applies — unquoted tokens are resolved as null, boolean, integer, float, or string. Type annotations in such a document are limited to the built-in annotations defined in [TSON-DATA] §5 (e.g. `!uuid`, `!base64`, `!datetime`); any other type annotation is unresolved — the parser preserves it as a syntactic marker, but the resolver cannot validate it. Applications processing documents without `!!schema` SHOULD treat unresolved type annotations as informational.

### 9.3 The `!!meta` Directive

`!!meta` names a schema document's governing **meta-schema**: the contract the schema's declarations are validated against. It appears exactly once, as the first directive after the optional `!!id` ([TSON-DATA] §2.2, §3.3). Its position carries the document-kind dispatch bit — a header whose first directive, or first after `!!id`, is `!!meta` is a schema document — so classification requires no value parsing.

The `!!meta` target supplies two things to the schema:

- **The validation contract.** Each declaration resolves to a `type_definition` value (§13); the meta-schema's vocabulary — `type_definition`, `record`, `record_field`, the constructor families — defines what those values may be. A schema document is valid only if its resolved form conforms to its meta-schema.
- **The structure namespace.** The `!!meta` target's namespace — its local declarations plus its imports — supplies the constructors the schema builds with (instantiation targets like `!enum`, generic-application heads, and the desugar targets of the sugar forms) and the structural vocabulary the resolver uses to materialise type-definition output. Resolution is one hop; §11.3.1 defines the rule.

The ladder of governing relations terminates at the meta-kernel, whose `!!meta` references its own URL — the kernel is governed by its own namespace. The self-reference is never resolved: the kernel and the meta-schema are pre-loaded (§11.5, §14.1), and the ladder is closed by pre-loading, not resolution.

User schemas normally chain to `meta.tn1`. Chaining to `meta-kernel.tn1` directly is a meta-programming case — an alternative type vocabulary replacing meta, or an extension of the meta layer itself (§12). The meta layer is the format's sanctioned extension point: new type vocabularies arrive as alternative or extended meta-schemas chaining to the kernel, never as grammar changes.

### 9.4 The `!!import` Directive

`!!import` imports type entries from an external schema into the importing schema. The directive value is a URL string identifying a published schema.

`!!import` appears only in the schema-document header, after `!!meta` and before the schema map ([TSON-DATA] §3.3, §7.4). The directive loads the referenced schema and makes its locally-declared entries available as if they were declared in the importing schema. Imported entries are available to all local declarations (including for recursive references), and local declarations may narrow or compose with imported types.

**Imports are shallow.** Only the entries declared in the imported schema's own body are imported — entries that the imported schema itself brought in via its own `!!import` directives are not transitively included. Each schema MUST explicitly import all the dependencies it needs.

```
!!id:"http://example.com/patients.tn1"
!!meta:"https://tson.io/2026/m/meta.tn1"
!!import:"https://tson.io/2026/m/core.tn1"
!!import:"http://example.com/medical-types.tn1"
{
  patient => { name: text  dob: date  blood_type: blood_type }
}
```

Here `text` and `date` come from the core library, `blood_type` from the domain library, and `patient` is a local definition. If `medical-types.tn1` itself imports `core.tn1`, those transitive entries are not included — only `blood_type` and any other entries declared directly in `medical-types.tn1` are available.

Multiple `!!import` directives are permitted and are loaded in declaration order. Each import adds its locally-declared entries to the accumulated type-name namespace (§11.3). If two imports declare the same name, or if an import declares a name that also appears as a local declaration in the importing schema, the collision is a resolver error and the entire schema fails to load. Imports populate only the type-name namespace, so an import name that happens to match a name in the structure namespace (§11.3.1) is not a collision — the two are consulted at different grammar positions, and the `!T` lookup order resolves the one position where both could apply.

Import cycles are permitted. Because imports are shallow, a cycle between two schemas does not blow up — each schema's own entries are a finite set, and only those entries cross the import. Two schemas that import each other and use any third-party type must each import that type independently.

The imported schema MUST itself be a valid schema document. The imported schema's own header directives are resolved independently to produce its type definitions, but only the entries declared in its own body are available for import.


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

Construction creates new type definitions. A declaration is the construction mechanism:

```
person => { name: text  age: integer }
status => !enum [ACTIVE INACTIVE SUSPENDED]
point => [real, real]
contact_method => (email | phone | address)
age => !integer { min: 0  max: 150 }
```

Supertype composition with `&` is a construction tool that combines parts from existing definitions:

```
employee => person & contact & { department: text }
```


### 10.2 Narrowing

Narrowing copies an existing definition and refines it by binding parameters or tightening values. The result is a new definition with its own identity that IS-A the source. A source type name without `&` marks narrowing:

```
config => { host: text  port: integer ~ 8080  debug: boolean = false }
production => config { host: = "prod.example.com"  port: = 9090 }
```

The result maintains an is-a relationship with the source. Every consumer expecting a `config` can accept a `production`.


### 10.3 Subtraction

Subtraction removes fields from an existing definition. Like narrowing, it transforms an existing type; unlike narrowing, it deliberately breaks IS-A. The `field: _` form in a composition or narrowing body marks subtraction:

```
account => { name: text  email: text  password: text }
account_public => account & { password: _ }
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

A TSON document never resolves type annotations against its own definitions. This is the fundamental rule of schema-value separation: every type annotation (`!name`) in a document resolves against an external schema — the schema identified by the document's `!!schema` directive. The document may define new types (as declarations in a schema document), but those definitions cannot be used via `!` references within the same document. They exist only for consumers of the published schema.

Inside a schema document, type names used in type-ref positions within the type-definition grammar resolve against the type-name namespace: local declarations and entries brought in by `!!import`, with name collisions rejected as errors (§9.4). Any entry can reference any other entry, including itself — enabling recursive type definitions. Structural forms produced by the type-definition grammar (`!record`, `!record_field`, `!enum`, etc. in resolver output) resolve against the structure namespace provided by the meta-schema identified by `!!schema`. The two namespaces are distinct and are described in full in §11.3. In data mode, `!name` type annotations resolve only against the type-name namespace of the schema identified by `!!schema`.

This rule has no exceptions. It applies to data documents, user schemas, extended meta-schemas, and the meta layer itself.


### 11.1 The Schema Ladder

Every TSON document that uses type annotations sits on the **schema ladder** — the chain of governing relations. Each rung binds the same relation — *validate me against X* — with the directive of its document kind: a data document binds it with `!!schema`; a schema document binds it with `!!meta`:

```
data document
  └─ !!schema → user schema
                  └─ !!meta → meta-schema
                                └─ !!meta → meta-kernel
                                              └─ !!meta → itself (pre-loaded)
```

At each level, the directive identifies the schema whose types govern the document:

- A **data document** carries `!!schema` pointing to a user schema. Type annotations like `!person`, `!uuid`, and `!email` resolve against the types defined in that user schema.

- A **user schema** carries `!!meta` pointing to the meta-schema, and `!!import` directives to bring in type library types. Type names used as type-refs within the type-definition grammar (e.g. `text`, `integer` in record field definitions) resolve against the user schema's type-name namespace — its local declarations and imports, not the structure namespace (§11.3). The meta-schema provides the structural vocabulary (`record`, `array`, `enum`, etc.) that type-definition resolution produces. The user schema defines new types (`person`, `employee`, `api_response`) as declarations — those names are available only to documents that reference this schema via their own `!!schema` directive.

- The **meta-schema** (`meta.tn1`) carries `!!meta` pointing to the meta-kernel, together with an `!!import` of the kernel. The import is doubly load-bearing: it supplies the kernel types meta's own constraint-field declarations use, and — because resolution is one hop — it is what places the kernel's structural vocabulary (`enum`, `array`, `type_definition`, …) in meta's namespace, where every meta-governed schema and its resolver output finds it (§11.3.1, §12). The **meta-kernel** carries `!!meta` pointing to its own URL — it defines its own core types (`integer`, `text`, `boolean`) directly. Both resolve to pre-loaded Schema objects in the schema library; the self-reference at the root is closed by pre-loading, not resolution (§11.5).


### 11.2 Schema-Value Separation

The separation between a document and its schema serves two purposes:

**Immutability.** A schema is a published, immutable artifact. Once a schema is published at a URL with a content hash, its type definitions do not change. Data documents reference schemas by URL. The data can change; the schema it was validated against cannot.

**Unambiguous resolution.** Because type references always resolve against an external schema, there is no ambiguity about what `!text` means in a given document. It means whatever the referenced schema defines it to mean. Two documents referencing the same schema have identical type vocabularies. Two documents referencing different schemas may give different meanings to the same name.

A document with no `!!schema` directive has no type vocabulary. Base type resolution ([TSON-DATA] §4) applies, providing default interpretation of unquoted tokens as null, boolean, integer, float, or string. Type annotations in such a document are limited to the built-in annotations defined in [TSON-DATA] §5 (e.g. `!uuid`, `!base64`); any other type annotation is unresolved — the parser preserves it as a syntactic marker, but the resolver cannot validate it. Applications processing documents without `!!schema` SHOULD treat unresolved type annotations as informational.


### 11.3 Schema Layering

The directive architecture separates three layers:

**Meta-schema** — Defines the structural vocabulary that the type-definition grammar produces: `type_definition`, `record`, `record_field`, `array`, `enum`, and so on. A schema document's `!!meta` directive points to its meta-schema; the schema's declarations are built with, and validated against, the meta-schema's vocabulary.

**Type libraries** — Define specific types (`integer`, `text`, `boolean`, `real`, `decimal`, etc.) using the meta-schema's vocabulary. Type libraries are ordinary schemas. A schema author imports the library that matches their target platform via `!!import`.

**Application schemas** — Import type libraries and define domain types on top of them.

Name resolution is built from one primitive. The **namespace of a schema** is its local declarations plus the entries of its imports (§9.4) — nothing more. Every document has a **governing target**: a schema document's is its `!!meta` target; a data document's is its `!!schema` target. All resolution against the governing target is **one hop**: the target's namespace is consulted directly, and no further rung of the ladder (§11.1) is ever walked. Two namespaces are active when a schema document resolves, consulted at different grammar positions.

#### 11.3.1 The Structure Namespace

The **structure namespace** of a schema document is the namespace of its `!!meta` target — the target's local declarations plus its imports. One hop. It supplies what the schema *builds with*, and it is consulted at exactly the **constructor roles**:

- **Instantiation and narrowing targets** — the name after `!` (`!enum [...]`, `!integer_type {}`), subject to the lookup order below.
- **Generic-application heads** — the name before `<` when the name is not otherwise in scope (`map<text, text>`, `set<text>`).
- **The implicit desugar targets of the sugar forms** — `[T]` and `[T; n]` desugar to `array`, `[T, U]` to `tuple`, `(A | B)` to `choice` (§3.4).

An entry consumed at a constructor role MUST be a constructor (`constructor: true`); resolving a non-constructor there is a resolver error. The structure namespace is never consulted for bare type-refs — a schema governed by meta cannot write `field: enum` or reach the kernel's `integer` as a field type (§11.3.2).

**Lookup order for `!T` targets.** The name after `!` resolves first against the type-name namespace (§11.3.2). If found and the entry is an atom instance, the form is an instance narrowing (§3.3); the constructor it retargets to is reached through the instance's own `source` field — never by name, so narrowing works even where the constructor is not name-visible. If found and the entry is a constructor, the form is constructor application (the meta-kernel's self-hosted case, where locals and the structure namespace coincide). If not found in the type-name namespace, the name resolves against the structure namespace and MUST be a constructor. A name found in neither namespace is an unresolved-type error.

**Worked example.** A user schema with `!!meta:".../meta.tn1"` writes `status => !enum [DRAFT ACTIVE RETIRED]`. `enum` is not a local declaration and not imported; it resolves through the structure namespace — meta's namespace — where it is present because meta.tn1 imports the meta-kernel. The same import delivers `array`, `map`, `tuple`, and `choice` for the sugar forms. The shorthand desugars per §3.4 to `!enum { members: [DRAFT ACTIVE RETIRED] }`, validated against the constructor's record.

**Import what you expose.** Because resolution is one hop, a meta-schema's namespace is the *complete* vocabulary it offers everything it governs: the constructors its governed schemas author with, the contract their declarations are validated against, and the vocabulary their governed data documents — including resolver output (§13) — resolve annotations and type annotations against. A meta-schema MUST therefore import every schema whose entries it intends to expose. This is why `meta.tn1` imports the meta-kernel: the import serves meta's own field types (§11.3.3) *and* is the delivery mechanism for the kernel's structural vocabulary to every meta-governed schema. An extended meta-schema that chains to the kernel but omits the import does not half-work — its governed schemas lose `!enum` and the sugar forms immediately and diagnosably.

#### 11.3.2 The Type-Name Namespace

The **type-name namespace** provides the names a schema author can use as type-refs in their own definitions — what *fills* the structures. When a field is written as `street: text`, the name `text` resolves against this namespace. When a type-def body references another type by name (`vip => customer & { ... }`), `customer` resolves against this namespace.

Lookup for the type-name namespace walks, in order:
1. Parameters of the enclosing definition (§5).
2. Local declarations of the current schema.
3. Entries brought in by `!!import` directives, in declaration order.

The type-name namespace is NOT extended by the structure namespace. Names available through `!!meta` are available at constructor roles only, never as type-refs — this is the reason application schemas import core: the types that fill record fields (`text`, `integer`, `uuid`) must come from the schema's own namespace.

Names from `!!import` directives must be disjoint — two imports defining the same name, or an import name matching a local entry, is a hard error. This is because imports are flat-merged into a single pool.

#### 11.3.3 Why Two Namespaces

The separation answers a problem that arises in any language with a meta-schema: if the governing target's namespace backed every type position, user schemas governed by meta would automatically see the kernel's `integer` and `text` as field types without importing core. That would make the type library unnecessary for meta-governed schemas, violate the design principle that schemas declare their dependencies explicitly via `!!import`, and create silent shadowing between the kernel's entries and core's identically-named ones.

The two-namespace model makes the dependency direction clean. A schema's `!!meta` supplies the structures it *builds with*; its `!!import` supplies the types that *fill* them. The kernel's `integer` exists for the kernel's own constraint-field declarations (`integer_type.min: integer?`); it reaches other schemas only through an explicit `!!import` of the kernel — as meta does — never by governance.

The meta layer exercises both mechanisms and illustrates the boundary. Meta's governing target is the kernel, so meta reaches `!enum` (in `ordered => @annotation !enum [NONE PARTIAL TOTAL]`) and the `[...]` sugar through the structure namespace. Meta's *type-refs* — the base kinds `atom` and `sum` it composes with, the mixin `atom_specification`, and the field types `integer?`, `regex?`, `uri` in its constructor definitions — come through its `!!import` of the kernel. Composition operands are type-refs, not constructor roles: composing with `~atom &` or `~text_type &` requires the operand in the type-name namespace, which is exactly why defining *new* constructors demands a deliberate kernel import. Ordinary schemas use constructors; only meta-programming defines them.

#### 11.3.4 Annotation Resolution

An annotation `@name` or `@name:value` resolves against the **governing target's namespace** — the `!!meta` target for a schema document, the `!!schema` target for a data document — one hop, locals plus imports. Neither the local declarations of the document being authored nor any further rung of the ladder participates.

This is why `meta-kernel.tn1`'s `annotation => @annotation void` works: the kernel's governing target is itself, and the kernel is pre-loaded into the library before any document — including the kernel file itself — is parsed. When the resolver encounters `@annotation`, it finds the pre-loaded `annotation` definition, not the entry currently being defined.

The one-hop rule determines where annotation types must live:

- **Annotations for schema documents** live in the meta layer. `meta.tn1` declares `deprecated`, `since`, `todo`, `lang`, `ordered`, `bounded`, and `numeric` locally, and carries the kernel's `doc`, `documentation`, and `alias` through its kernel import — so every meta-governed schema can use all of them.
- **Annotations for data documents** live in the governing user schema's namespace. Core re-exports `doc`, `documentation`, `annotation`, and `alias` precisely so that data documents governed by core-importing schemas can write `@doc`. An annotation type declared locally in a user schema is usable by that schema's *data documents* (one hop from them) — but not within the declaring schema document itself, whose governing target is meta. Custom annotations for schema documents therefore require an extended meta-schema; custom annotations for data documents require only a declaration in the user schema.

#### 11.3.5 Data Documents and Schema Layering

A data document's `!!schema` points to a single user schema, and that schema's namespace — its local declarations plus its imports, one hop — is the document's entire vocabulary. Type annotations in the data (`!person`, `!uuid`) resolve against it; annotations (`@doc`) resolve against it (§11.3.4). Nothing else is reachable.

This is intentional. A data document depends on the types its producer and consumer agreed on, and that agreement is the user schema. The layers above the user schema — the meta-schema that governs how the user schema was written — are implementation machinery, not part of the data contract. If a data document needs a core type like `uuid` or `datetime`, that type must be imported into the user schema so it appears in the user schema's namespace.

A consequence with teeth: the structural vocabulary is invisible from ordinary data. `!enum`, `!record`, and `!type_definition` are not names in an application schema's namespace, so a data document governed by one cannot annotate with them — an attempt is an unresolved-type error, not a misuse to detect. Ordinary data documents therefore cannot even express resolved-schema structure; only a data document governed by a meta-schema (resolver output, §13) can, because the meta-schema's namespace carries that vocabulary through its kernel import. This pairs with §14.1's rule that resolved-form documents are never schema sources: the namespace model and the referent rule enforce the same stratification from opposite ends.

#### 11.3.6 Duplicate Names Across Layers

A type name defined in both the meta-schema and a type library is not a conflict. Because the two namespaces are distinct, the kernel's `text` is not visible as a type-ref in a meta-governed schema — only an imported `text` (core's) is, and core's `text` is a fresh definition, not a view of the kernel's. The kernel's own `text` reaches other schemas only through an explicit `!!import` of the kernel.

A name spelled the same in a schema's type-name namespace and in its structure namespace does not collide — the two are consulted at different grammar positions, and the `!T` lookup order (§11.3.1) resolves the one position where both could apply, with the type-name namespace taking precedence. An extended meta-schema MAY `!!import` a type library; overlaps between its governing namespace and its imports follow the same rules.


### 11.4 Schema Evolution

Each published schema version is immutable. There is no backward-compatibility mechanism at the schema level. Version N and version N+1 of a schema are independent, immutable artifacts with different content hashes and different URLs. A schema's identity is its exact byte content.

A server or application MAY accept data validated against multiple schema versions — this is a deployment concern, not a schema concern. The TSON specification does not define version negotiation, migration rules, or compatibility checks between schema versions.

See §2.1 for the records-are-closed rule. Schema evolution is handled by publishing a new schema version; there is no in-schema mechanism for backward compatibility.


### 11.5 The Meta-Schema Bootstrap

The ladder of governing relations terminates at the meta-kernel. The kernel's `!!meta` directive references a URL that resolves to itself — the kernel is governed by its own namespace. This is not circular — it is a bootstrap.

The kernel's types (`schema`, `record`, `record_field`, `integer`, `text`, `boolean`, and all other types defined in `meta-kernel.tn1`) are pre-loaded into the schema library by the implementation. They exist as in-memory structures before any document is parsed. When the kernel document is parsed, its type annotations resolve against these pre-loaded structures through the normal schema library lookup — the library receives the URL, finds the pre-loaded Schema object, and returns it.

The meta schema (`meta.tn1`) is also pre-loaded. Its `!!meta` points at meta-kernel; its additional constructors (`binary`, `extern`, `unknown_type`, and the numeric/temporal/identifier/text constraint constructors) are likewise resolved against the pre-loaded kernel before being registered as pre-loaded entries themselves.

See §12 for the kernel's inline description and a narrative account of meta.

The kernel defines its own core types (`integer`, `text`, `boolean`, etc.) directly so that its own constraint-field declarations (`integer_type.min: integer?`, `record_field.name: field_name`) can reference them locally. The kernel's local entries are the structure namespace of every schema the kernel directly governs — meta itself, and any alternative meta-schema; schemas governed by meta receive the same vocabulary one hop away, through meta's kernel import (§11.3.1). These types are NOT automatically available as type-refs in governed schemas — per §11.3, the structure namespace populates the structure namespace, not the type-name namespace. Schemas that want `integer` or `text` available as type-refs import a type library that defines them (typically `core.tn1`).

The kernel and meta documents are descriptions of the pre-loaded types, not the source of them. Parsing them validates that the document's description matches the implementation's in-memory model. If they disagree, the document is invalid — the in-memory model is authoritative.


#### 11.5.1 Two-Pass Resolution

Schema resolution proceeds in two passes per schema, with imports fully resolved before either pass runs on the importing schema.

**Pass 1 — Name population.** The resolver collects all declaration names in the schema document. The schema's type-name namespace is populated with skeleton `type_definition` records keyed by name. Bodies are not yet validated.

**Pass 2 — Body resolution and validation.** The resolver resolves each entry's body against the populated namespace. Forward references between local entries work in this pass — every name is in the namespace by the time bodies are resolved. The resolver validates that references resolve, that composition and narrowing rules hold, that type arguments match parameter arities. It computes the transitive IS-A graph (`type_definition.supertypes`) and derives the inverse (`type_definition.subtypes`).

**Imports run first.** When a schema has `!!import` directives, the imported schemas are fully resolved (recursive two-pass) before either pass on the importing schema begins. By the time Pass 1 collects local names, every imported name is already present in the type-name namespace. Collisions between imports and local entries surface at this point. The order is:

1. For each `!!import` in declaration order: fully resolve the imported schema (recursive two-pass). Merge its local entries into the importing schema's accumulating type-name namespace. Collisions between imports are resolver errors (§9.4).
2. Pass 1 for the importing schema: collect local entry names. Collision between a local name and an already-merged import is a resolver error.
3. Pass 2 for the importing schema: resolve bodies against the populated namespace.

**Forward references are permitted within a schema.** A type definition may reference any other declaration in the same schema, declared earlier or later. A schema's declarations form a mutually-visible namespace. The two-pass resolution model is what makes forward references work without backtracking.

**Annotations resolve against the governing target's namespace** (§11.3.4) — not through the resolving schema's local Pass 1 namespace and not through its own imports. The bootstrap's pre-loaded kernel provides the annotation vocabulary for the kernel itself (its governing target is itself); every other document finds annotation types one hop away, in its governing target's namespace.


### 11.6 Cross-Schema Type References

Governance is not the only mechanism for cross-schema references. A type definition may reference types from a different schema through the `extern` constructor (defined in `meta.tn1`). An `extern` type carries a `schema` field (a URL identifying the external schema) and an optional `types` field (a list of permitted type references from that schema). The schema library resolves the URL to a Schema object and looks up named types within it. When `types` is absent, any type from the external schema is accepted; when present, only the listed types are accepted.

`extern` is a sum constructor — its membership is the set of types defined in the named schema (optionally narrowed by `types`). It joins `choice` and `unknown_type` in the family of sum-shaped constructors. Where `choice` enumerates variants explicitly, `extern` defers to an external schema for the variant set.

The companion type `unknown` (defined in `core.tn1`) is a sum instance with universe membership — it accepts any well-formed value of any type, with no constraint on the type's source. `unknown` is produced as `!unknown_type {}` — an empty instance of the `unknown_type` constructor defined in `meta.tn1`. `unknown` is the right tool when the parent schema has no contract at all on what the data will be; `extern` is the right tool when the parent schema knows the data belongs to a specific external schema but does not import it.

At the data level, values matched by an `extern` field MUST carry their own `!!schema` directive identifying the external schema and a `!type` annotation identifying the type within it. Schema scope changes are always visible in the data, never implicit. When the parser encounters a `!!schema` directive on a scoped value within a document ([TSON-DATA] §2.3), it pushes the new schema scope for that value. When the value ends, the scope reverts to the enclosing scope. This provides lexically scoped schema switching:

```
!!schema:"https://tson.io/2026/medical/patient.tn1?sha256=a4f2e8d1c3b5a7f9e2d4c6b8a0f1e3d5c7b9a2f4e6d8c0b3a5f7e9d1c4b6a8f0"
!patient_record {
  patient: "1234"
  attachments: [
    !!schema:"https://tson.io/2026/insurance/claim.tn1?sha256=f8b2a1d3c5e7f9a1b3d5e7f9a2b4d6e8f0a3b5d7e9f1a4b6d8e0f2a5b7d9e1f3"
    !insurance_claim {
      claim_id: CLM-5678
      amount: 450.00
      provider: "City Medical"
    }
    !!schema:"https://tson.io/2026/radiology/report.tn1?sha256=d4e9c7f1a3b5d7e9f2a4b6d8e0f3a5b7d9e1f4a6b8d0e2f5a7b9d1e3f6a8b0d2"
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

**Typed-position restriction.** A nested `!!schema` directive at a position whose type is constrained by the outer schema is a resolver error unless the outer type is one of the permissive types: `extern`, `value`, `unknown`, or a container thereof (e.g. `[extern]`, `map<text, value>`). The outer schema must opt in to receiving foreign values at each position where schema switching is permitted. Without this rule, a `!!schema` directive could silently substitute a value of any shape into a specifically-typed slot, with the mismatch surfacing only at the host-language assignment boundary. The permissive-type requirement makes cross-schema acceptance authored intent, not accident. Schemaless outer documents have no type expectations and always permit nested `!!schema` directives.


### 11.7 Schema Document Structure

A schema document is a fixed-shape header followed by a braced map of declarations — the **schema map**. The header carries the schema's identity (`!!id`, first line; optional in the grammar, required for publication and hash-pinning, §9.1), its governing meta-schema (`!!meta`, mandatory, exactly once), and its dependencies (`!!import`, repeatable, declaration order significant); annotations that bind to the schema sit after the header, immediately before the opening brace. Header order and cardinality are grammar productions, not conventions ([TSON-DATA] §2.2, §3.3; §17.1):

```
!!id:"http://example.com/people.tn1"
!!meta:"https://tson.io/2026/m/meta.tn1"
!!import:"https://tson.io/2026/m/core.tn1"
@doc:"Minimal example schema."
{
  person => { name: text  age: integer }
  employee => person & { department: text }
  status => !enum [ACTIVE INACTIVE SUSPENDED]
}
```

Entries are separated like data-map entries — whitespace or a comma ([TSON-DATA] §2.4) — and the map MUST contain at least one entry (§17.1).

The `!!meta` directive identifies the meta-schema governing this document's declarations. The `!!import` directive merges the type library's entries (`text`, `integer`, etc.) into the schema's type-name namespace (§11.3). Each declaration binds a type name to a type definition with the `=>` operator — a compound token the frozen lexer already emits; the schema grammar introduces no reserved words.

**A schema document's body is a map — in syntax and in semantics.** The braced body makes the map visible: a schema *is* a map, and the document resolves to a value of the kernel's `schema` type, `map<type_name, type_definition>` (§12, §13). The braces are not decoration; they carry the document's annotation anchor. TSON's one binding convention is that annotations precede the value they bind to ([TSON-DATA] §3.1), and the schema map is the value the document-level annotations bind to — `@doc:"..." { ... }` binds to the schema by the same rule that binds a data document's root annotations to its root value. (An earlier revision deleted the enclosing braces on the grounds that they did no work; restoring them is deliberate — without a body value there is no boundary between the document's annotations and the first declaration's.) What the braces do *not* carry is a type annotation: the `!schema` type-ref never appears in schema-document source — the document kind and `!!meta` already say what the body is — and `!schema` marks *data* representations of resolved schema structure, most notably resolver output (§13). The symmetry is exact: source `@doc:"..." { name => type-def }` compiles to output `@doc:"..." !schema { name => !type_definition { ... } }` — the same shape, one rung down the ladder.

**Declaration forms.** The right-hand side of a declaration takes one of the following forms, defined in §3–§8 and mapped to resolver output in §13.

**Fresh record definition** — defines a record type with named fields:

```
person => { name: text  age: integer }
```

**Supertype composition** — combines parent types with new fields via `&`:

```
employee => person & contact & { department: text }
```

**Record narrowing** — refines existing fields without adding new ones:

```
elder => person { age: age  role: = retired }
production => config { host: = "prod.example.com"  port: = 9090 }
```

**Constructor instantiation** — produces a constructor instance (§3.3):

```
integer => !integer_type {}
boolean => !enum [true false]
base64  => !binary BASE64
status  => !enum [ACTIVE INACTIVE SUSPENDED]
```

**Instance narrowing** — narrows a constructor instance by tightening its constructor's fields (§3.3):

```
age   => !integer { min: 0  max: 150 }
uint8 => !integer { min: 0  max: 255 }
```

**Constructor definition** — the `~` marker creates a type factory (§8):

```
record => ~product & { fields: [record_field]  supertypes: [type_name]? }
set    => <T> ~array<T> { unordered: = true  unique_items: = true }
```

**Type reference** — names an existing type:

```
id => uuid
```

**Array and tuple types:**

```
scores => [integer; +]
matrix => [[real; 3]; 3]
point  => [real, real]
```

**Choice type:**

```
contact_method => (email | phone | address)
```

**Type with generic arguments:**

```
translations => map<text, text>
lookup       => map<text, [integer; +]>
```

**The `!schema` annotation and the `!!schema` directive.** The two share a name but serve distinct roles. The directive (`!!schema`) appears on data documents and identifies the external schema for type resolution (§9.2). The type annotation (`!schema`) asserts that a map value conforms to the `schema` type. The `!!` prefix is always a directive; the `!` prefix is always a type annotation.

**Annotation binding.** Annotations immediately before the opening brace bind to the schema — the header directives themselves carry no annotations ([TSON-DATA] §7.4 gives them no annotation slot). Inside the braces the data-map convention applies unchanged ([TSON-DATA] §3.1): an annotation immediately preceding a declaration's name binds to the key — the name itself (§6) — and annotations after `=>` and before the type-def bind to the type definition. Resolver output preserves the placement: key-side annotations appear key-side on the output map entry; value-side annotations appear on the `!type_definition` value (§13).


## 12. Core Meta-Schema

Two pre-loaded schemas form the meta-schema layer of TSON:

- **`2026/m/meta-kernel.tn1`** — the self-referencing bootstrap layer. Its `!!id` and `!!meta` both reference its own URL — it bootstraps by defining its own core types directly without importing a type library. The kernel defines `top`, `atom`, `product`, `sum`, the `record` / `array` / `map` / `tuple` / `enum` / `choice` constructors, the `record_field` / `tuple_element` / `parameter` / `type_definition` / `schema` supporting records, and the minimal scalar vocabulary (`integer`, `text`, `uri`, `regex`, `boolean`, `unit`, `value`, `token`, `void`) needed for its own constraint-field declarations.

- **`2026/m/meta.tn1`** — the canonical meta-schema, chained to by `!!meta` in user schemas. Built on top of the kernel; it adds the type constructors that the core type library (`core.tn1`) instantiates: `binary` with `binary_encoding`, `extern`, `unknown_type`, plus the constraint vocabularies for numeric (`real_type`, `decimal_type`, `rational_type`), temporal (`date_type`, `time_type`, `datetime_type`, `duration_type`), identifier (`uuid_type`), and text (`email_type`) atom families. Meta also hosts the application-level annotation types (`ordered`, `bounded`, `numeric`, `deprecated`, `since`, `todo`, `lang`) — annotation types must live in the schema chain to be usable as annotations (§6), and meta is the canonical location.

Implementations MUST pre-load both. See §11.5 for the full bootstrap rule.

Users normally chain to `meta.tn1`. Schemas that chain to `meta-kernel.tn1` directly are either alternative type libraries replacing meta, or extensions of the meta layer itself — both meta-programming cases, not application-schema authoring.

The kernel defines four base kinds — `top`, `atom`, `product`, `sum` — with `top` as the structural root and the other three composing with it via `top & {}`. Every type in the schema transitively IS-A `top`.

Each atom family that carries a constraint vocabulary is defined as a pair: a constructor (`integer_type`, `text_type`, `uri_type`, `regex_type` in the kernel; `real_type`, `decimal_type`, and the temporal/identifier/text constructors in meta) that composes with `atom` via `~atom & {...}` and lists the family's constraint fields, and a canonical empty instance (`integer`, `text`, `uri`, `regex`; `real`, `decimal`, `date`, etc. in core) produced as `!<ctor> {}`. Field-type references from within a constructor use the instance name (e.g. `integer_type.min: integer?`); the mutual reference between the constructor and its instance closes via standard local-name lookup within the schema.

The kernel also defines `unit` — an atom constructor with no constraint vocabulary — and three opaque instances:

- `value` — admits [TSON-DATA] §4 products (null, boolean, number, string). The escape hatch for fields whose type the schema language cannot express (see `record_field.value` and the constraint fields in meta where the constrained atom is not in scope).
- `token` — admits NFC-normalised lexemes. Used for identifier types (`type_name`, `field_name`, `param_name`) and enum members.
- `void` — the unit type of absence: admits the absent sentinel `_` (and the token `null` as an equivalent spelling, normalised to `_`; see §8). Used as the target type for bare annotations like `@annotation` and `@numeric` (see §6).

The kernel additionally defines `annotation` (`@annotation void`) as the canonical void-targeted annotation. Core re-exports `void` under the same name so that schemas importing core can target it; core also defines `complex` (`!unit {}`, a complex-number representation) as an additional unit-family entry. The `numeric` annotation (also `@annotation void`) lives in `meta.tn1` so it is reachable through the schema chain — annotation types must live in the chain to be usable as annotations (§6). Per §11.3, type-name references from a chaining schema resolve through that schema's type-name namespace (local + imports), so the kernel's `void` reaches a chaining schema only through an explicit import.

The kernel's types serve as the structure namespace for the schemas the kernel directly governs, and reach meta-governed schemas through meta's kernel import (§11.3.1). They are NOT automatically available as type-refs in governed schemas — the structure namespace is consulted at constructor roles only, never for field types (§11.3.2). A chaining schema that wants these types as type-refs imports a type library that defines them (typically `core.tn1`).

The normative source for both schemas is carried in the companion artifacts (§1.5): `meta-kernel.tn1` and `meta.tn1`, pinned by content hash at publication. Earlier drafts inlined the kernel source here; the artifact is now the single source, consistent with §11.5's rule that the pre-loaded in-memory model is authoritative and the documents are descriptions of it.

The meta-schema defines four type kinds:

- **Atom** — scalar types. An atom constructor composes with `atom` via `~atom & {...}`; its record of constraint fields describes the narrowing vocabulary available to instances. `integer_type`, `text_type`, `uri_type`, `regex_type`, and `enum` are atom constructors in the kernel; `real_type` through `email_type`, `binary`, and `unknown_type`'s sibling `binary_encoding` are atom constructors in meta. The `unit` constructor is the atom with no constraint vocabulary — the atom equivalent of the empty record `{}` for products. Atom instances are produced as `!<ctor> {}` (empty) or `!<ctor> { values }` (narrowed); construction via `!` does not establish IS-A with the constructor, only the `kind`.
- **Product** — structural types. `record`, `array`, `set`, `map`, and `tuple` are constructors that compose with `product` via `~product & {...}`, fixing `access_pattern` and `size_type`. The parameterized constructors (`array<T>`, `set<T>`, `map<K, V>`) declare their type slots in the `<>` parameter list and reference them in field positions. `set` is a constructor narrowing of `array` with `unordered` and `unique_items` pinned to `true`. Bare `{...}` definitions without explicit composition (like `atom_specification`, `parameter`, `record_field`, `tuple_element`, and `type_definition` itself) resolve to `kind: PRODUCT` by structural default.
- **Sum** — discriminated-union types. `choice` in the kernel, and `extern` and `unknown_type` in meta, compose with `sum` via `~sum & {...}`. `unknown` in core is produced as `!unknown_type {}` — the empty instance accepts any well-formed value of any type.
- **Reference** — a type definition whose body is a pointer to another type. References appear in the schema namespace as `kind: REFERENCE` entries whose body is a `!reference { target: T }` record. The resolver flattens every use of a reference by rewriting it to the target type. Reference chains are fully resolved: if `A` points at `B` and `B` points at `C`, uses of `A` resolve to `C` directly. The validation graph contains only ATOM, PRODUCT, and SUM entries; REFERENCE entries exist as documentation only. When a reference is flattened, the resolver attaches an `@alias` annotation (defined in `core.tn1`) to the resolved type, naming the source-level alias used at the reference site.

The `type_definition` record captures the resolver's output for any type. The `parameters` field, when non-empty, marks the definition as a template that cannot be instantiated directly. The `constructor` field is `true` when the definition was declared with `~`. The `supertypes` field records the transitive IS-A chain established by `&` composition and instance/constructor narrowing; `subtypes` is its inverse, maintained by the resolver for fast navigation. The `body` field is required and declared as `top` — the universal supertype. The resolver produces body values annotated with the structurally-appropriate type for each definition: `!record` for product constructors and composed records, `!<constructor>` for atom constructor instances (e.g. `!enum { members: [...] }` for `boolean`, `!integer_type { min: 0 max: 255 }` for `uint8`), `!reference { target: T }` for reference-kind entries, and so on. Because every concrete type in the system IS-A `top` via its transitive supertype chain, the parser validates body annotations without needing dependent typing.

**Reading parameter references.** Parameters and type names share the lexical class `token`, so a `type_name` appearing in resolver output (e.g. in `record_field.type`) is resolved against two namespaces in order: first the enclosing `type_definition.parameters` list, then the schema's type-name namespace. This matches the resolution rule used during source-level parsing (§5, "parameters take precedence"). Consumers reading resolver output MUST apply the same precedence. Implementations SHOULD warn when a definition declares a parameter whose name shadows a top-level schema type, since the shadow is silent at both the source and output layers.

`supertypes` and `subtypes` are resolver-managed: the normal authoring path (declarations) never sets them — the resolver fills them as part of producing `type_definition` output. The two fields have different standing. `subtypes` is a cache: fully derivable, always recomputable, never trusted. `supertypes` is derivable from `body` for product types (the body's `record.supertypes` carries the direct compositions) but NOT for the atom family: desugaring erases the surface distinction between narrowing an instance (`uint8 => !integer { min: 0 max: 255 }`, IS-A `integer`) and constructing a fresh sibling type (`port => !integer_type { min: 0 max: 65535 }`, IS-A nothing) — both serialize to `source: integer_type` with an identical body shape, and the narrowing target appears nowhere in the body (§3.3). The atom family's direct IS-A hop therefore lives only in `type_definition.supertypes`, making that field part of the type's serialized meaning rather than a recomputable cache.

When `!type_definition { ... }` records are ingested as data (resolver output; §13, §14.1): `subtypes` MUST be discarded and recomputed; `supertypes` is taken as input, with the transitive closure recomputed and integrity verified — every listed supertype must exist, atom-family supertypes must share the entry's `source` constructor, product-type lists must be consistent with the body's `record.supertypes`, and transitive lists must be closed. Within-family retargeting — a document claiming an entry narrows a different sibling of the same constructor — is internally consistent and undetectable from the document alone. This residual gap is one reason resolved-form documents are never schema sources (§14.1) and ingest is an explicit, opt-in act.

**Two `supertypes` fields with different semantics.** A `type_definition` carries a `supertypes` field that records the **transitive** IS-A chain — direct parents plus each parent's own chain, deduplicated. A `record` body also carries a `supertypes` field that records only the **direct** non-anonymous `&` compositions from the source. Consumers reading resolver output use `type_definition.supertypes` for IS-A queries and `record.supertypes` to recover the source-level composition. The body field is what was written; the definition field is what it transitively means.

The `schema` type is a map from type names (the bare leaf names of types in the schema) to type definitions. Schema lookup is by name, not by parameterized reference.


## 13. Resolver Output

The resolver's output for a schema is a map of `type_definition` records (§12). This section defines how each type-definition form maps to its `type_definition` (§13.1) and how reference-kind entries are flattened at use sites (§13.2).

### 13.1 Declaration-to-Type-Definition Mapping

Each declaration produces a `type_definition` record with fields: `source` (for narrowing), `kind` (ATOM, PRODUCT, SUM, or REFERENCE), `parameters` (declared type parameters; non-empty marks the definition as a template), `constructor` (boolean, marked by `~`), `supertypes`, `subtypes` (both maintained by the resolver), and `body` (the resolved content, declared as `top` — any type-annotated value, since every type IS-A `top`).

**Record form** (`{ fields }`) produces a product type with `kind: PRODUCT` and `body: !record { fields: [...] }`. Each field definition maps to a `record_field`:

| Grammar syntax          | record_field                                     |
|-------------------------|--------------------------------------------------|
| `name: type`            | `{ name: name  type: type  state: REQUIRED }`    |
| `name: type?`           | `{ name: name  type: type  state: OPTIONAL }`    |
| `name: type ~ value`    | `{ name: name  type: type  state: REQUIRED_DEFAULT  value: value }` |
| `name: type = value`    | `{ name: name  type: type  state: REQUIRED_FIXED    value: value }` |
| `name: type? = value`   | `{ name: name  type: type  state: OPTIONAL_FIXED    value: value }` |
| `name: type? = _`       | `{ name: name  type: type  state: OPTIONAL_FIXED }` (no `value` field — `record_field.value` is `value?`, so absence-of-value naturally encodes "fixed to absent") |

For supertype composition (`person &`), the `supertypes` field records the parent types and inherited fields are copied into the `fields` list. For narrowing (source type without `&`), the `source` field records the narrowing origin and refined fields reflect the tightened types or states.

**Parameterized form** (`<T, U> ...`) produces a definition with a non-empty `parameters` field. Parameter names are scoped to the definition's body and take precedence over schema namespace lookup. The body may reference parameters as if they were ordinary type names; the resolver substitutes them when the definition is referenced with type arguments. A definition with parameters is a template and cannot be instantiated directly — references must supply matching type arguments.

**Instance form** (`!T data-value`) produces a type depending on the target. When `T` is a constructor (e.g. `!integer_type {}`), the result is an empty constructor instance with `source: T`, `kind` inherited from `T`'s family, body `!T {}`, and no supertypes — construction does not establish IS-A with the constructor. When `T` is a constructor instance (e.g. `!integer { min: 0 max: 255 }`), the result is an instance narrowing with `source: T's constructor`, `supertypes: [T]`, and body `!T's_constructor { narrowed values }`. For single-required-field constructors, the data-value may fill that field directly (`!binary BASE64` ≡ `!binary { encoding: BASE64 }`). The instance form is only valid as the top-level body of a declaration; it may not appear inline in field-type, tuple position, array element, choice variant, or type-argument positions. See §3.3 for full semantics.

**Choice form** (`(type | type)`) produces a sum type with `kind: SUM` and `body: !choice { variants: [...] }`. The `variants` field lists type references. Each variant must name a distinct type in the schema.

**Array/tuple form** (`[type; size]` or `[type, type]`) produces a product type with `body: !array { ... }` or `body: !tuple { ... }`. Array forms generate `element_type`, `state` (from the optional `?` suffix on the element — `[T]` → `REQUIRED`, `[T?]` → `OPTIONAL`), and optional `min_items`/`max_items` constraints. Tuple forms generate `elements` with `tuple_element` entries, each carrying its own `state` drawn from the position's optional `?` suffix.

**Constructor form** (`~ ...`) produces a definition with `constructor: true`. Constructor narrowing differs from regular narrowing: fixed values CAN be replaced because constructors are meta-level definitions. Constructors may declare type parameters (`<T> ~product & { ... }`) to be filled at use sites via `<>`.

**Reference form** (a bare `typename`) produces a REFERENCE-kind type definition. See §13.2 for the full reference-flattening rule.

**Empty record form** (`{}`) is a special case of the record form — a record with zero fields. The result is a PRODUCT-kind type with an empty field list (`body: !record { fields: [] }`). The canonical empty-PRODUCT type in the kernel is `top` itself; structural mixins with zero fields would also produce this shape if any were defined.

**Unit atom instances** (`!unit {}`) are TSON's idiom for opaque atoms — atoms whose values the schema language cannot further describe, distinguished from each other by name and by prose-level parsing contract (§15). The result is an ATOM-kind type with `source: unit` and `body: !unit {}`. Meta-kernel defines three: `value` (admits [TSON-DATA] §4 products), `token` (admits NFC-normalised lexemes), and `void` (the unit type of absence — admits `_`, also accepting `null` as an equivalent spelling; used as the target type for bare annotations like `@annotation` and `@numeric`). Core adds `complex` (host-defined complex-number representation). User schemas SHOULD NOT introduce additional unit instances without a documented parsing contract — the schema-level distinction is purely nominal, so adding one solely as a marker is reasonable, but inventing parsing semantics that conflict with the kernel's three is a recipe for confusion.

**Synthetic types.** When a definition uses an inline type-expression form — container (`[T]`, `[T; n]`, `[T, U]`, `set<T>`, `map<K, V>`) or choice (`(A | B)`) — for a field whose runtime type is not otherwise named, the resolver synthesizes an entry in the schema's namespace.

*Trigger positions.* Synthesis fires at positions that accept a type-ref and contain an inline structural form:

| Position                      | Example                                       |
|-------------------------------|-----------------------------------------------|
| Record field type             | `tags: [text; +]`                           |
| Tuple element type            | `[integer, [text]]` — inner `[text]`      |
| Array element type            | `[[integer; 3]]` — inner `[integer; 3]`       |
| Choice variant                | `(email \| [phone])` — inner `[phone]`        |
| Type argument (inside `<>`)   | `map<text, [integer]>` — inner `[integer]`  |
| Parameterized template reference | `linked_list<integer>` — synthesises `linked_list#integer` |

Composition targets (`&`) and narrowing sources are restricted to named type references (bare or with type arguments); inline structural forms at these positions are resolver errors. Top-level type-definition bodies (e.g. `scores => [integer; +]`) are not synthesis sites — the declaration names the result via its name, and the inline form becomes the body directly.

*Body shape.* A synthesised type's body is the canonical form of the source inline expression, produced by the desugaring rules in §3.4. Examples:

```
array#text => !type_definition {
  kind: PRODUCT
  source: array
  body: !array { element_type: text }
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

- Simple containers (no constraints beyond the element type): `container#element` — e.g. `array#type_name`, `array#record_field`, `set#token`, `map#text#integer`.
- Constrained containers: `container#element#<hash>` — e.g. `array#record_field#a7f3b2e8`, where `<hash>` is a short content-based digest of the constraint values (size-spec, element state). The hash algorithm is implementation-defined; a truncated SHA-256 of a canonical serialisation of the constraint fields is a reasonable choice.
- Choices: `choice#v1#v2#...` — variants listed in source order. `(email | phone)` → `choice#email#phone`.

*Non-exposure.* Synthetic type names are internal to the resolver's output. They:

- MUST NOT be referenceable as type-refs from any schema. Authors who need to refer to such a type must introduce it explicitly with a named declaration (e.g. `non_empty_fields => [record_field; +]`, `contact_method => (email | phone)`); when a named definition exists for an equivalent form, no synthetic entry is created.
- MUST NOT be assumed portable across implementations or resolver versions at the byte level. The SHOULD on the naming scheme applies to the shape of the name; the hash payload and any future scheme refinements are not stability guarantees.
- MUST NOT participate in `!!import` resolution.

*Error messages.* Implementations SHOULD surface synthetic names in error messages alongside a reconstruction of the source form (e.g. "`[record_field; +]` at line 42, synthesized as `array#record_field#a7f3b2e8`") rather than the synthetic name alone. The synthetic name is a debugging handle; the source form is what the author wrote.

*Cross-schema identity.* Synthetic types follow the same namespace rules as named types: they are synthesized in whichever schema first needs them, and other schemas reach them via `!!import` like any named entry (structure-namespace visibility applies only to constructors, which synthetics never are). Because different schemas synthesize independently, the same source form appearing in two schemas may receive different synthetic names (and different hashes) — cross-schema identity of synthetic types is through named declarations or not at all.

*Synthetic name collisions.* Users SHOULD NOT define schema entries whose names contain `#`. The `#`-bearing namespace is reserved by convention for resolver-synthesised entries (containers from inline forms, template instantiations per §5.1, choice synthesis). When the resolver attempts to synthesise an entry whose name matches a user-defined entry in the same schema (including imported entries), it MUST raise a resolver error at schema-load time. This applies regardless of whether the user's entry is structurally equivalent to what the resolver would synthesise — the early error gives clear feedback rather than silently relying on resolver-internal naming. Resolver output documents may carry `#`-bearing names (synthesised entries appear in the namespace); these are not user-defined and pose no collision risk on round-trip, since synthesis fires only for inline forms in source and a round-tripped document carries no inline forms.

**Supertypes and subtypes — direct vs transitive.** Two `supertypes` fields appear in resolver output and follow different rules:

- `type_definition.supertypes` carries the **transitive** IS-A chain established by `&` composition and instance/constructor narrowing. The resolver computes it by walking each direct supertype's own chain and deduplicating. Construction via `!T {}` does not contribute to this chain (§3.3).
- `record.supertypes` (inside a `!record` body) records only the **direct** non-anonymous `&` compositions written in the source. The body field preserves authorial intent; the wrapping `type_definition.supertypes` is the materialised lattice.

Example: `text_type => ~atom & { ... }` produces `type_definition.supertypes: [atom, top]` (transitive — `atom` itself IS-A `top`) and `body: !record { supertypes: [atom], ... }` (direct — only `atom` was written).

`type_definition.subtypes` is the transitive inverse of `supertypes` across the schema's namespace. The resolver MUST compute and populate it. It is not authored — every entry is derived from another entry's `supertypes`. Both fields are part of the resolver-output contract; if `supertypes` is required output, `subtypes` is its mandatory inverse.


### 13.2 Reference Flattening

A type-def body that is purely a type expression — with no body record, no `&` composition, no constructor application — produces a REFERENCE-kind entry. The `target` is determined by the form of the type expression:

- **Simple type-ref leaf** (e.g. `id => uuid`): the entry is preserved with `source: typename` and `body: !reference { target: typename }`. The `target` is the immediate referent name, not the fully-resolved ultimate type — reference chains (`doc → documentation → text`) appear in the schema as three distinct entries, each pointing one hop forward.

- **Compound type expression** (parameterised types, arrays, tuples, choices, sets, maps — e.g. `coordinate => [real, real]`, `result => (success | error)`, `lookup => map<text, integer>`): the resolver materialises the expression as a synthetic per §13.1 (`tuple#real#real`, `choice#success#error`, `map#text#integer`, etc.) and the entry's `body: !reference { target: <synthetic-name> }`. The compound form is not stored inline in the REFERENCE entry; it is hoisted into a named synthetic, and the REFERENCE entry points at the synthetic.

**Resolution at use sites.** When a reference is used at a use site — as a field type, tuple element, type argument, or data-mode type annotation — the resolver flattens the reference. Flattening walks the reference chain to the first non-REFERENCE type and rewrites the use-site `type_name` to that type, attaching an `@alias` annotation to the type token recording the source-level name.

Example. Given `id => uuid` and a record declaring `owner: id`, the resolved `record_field` is:

```
!record_field { name: owner  type: @alias:id uuid }
```

The alias is attached to the type, not to the record_field — the alias describes the type reference, not the field itself.

**Chain aliasing follows the source.** Only the source-site alias is preserved on the use-site type. Intermediate hops in the chain (`documentation` in a `doc → documentation → text` walk) are not aliased on the use-site type — they remain visible as schema entries for anyone walking the namespace. `@alias` records "what the author wrote here," not "which types were traversed to get to the target."

The same flattening applies in data mode. `!id 550e8400-e29b-41d4-a716-446655440000` resolves to a uuid-typed value with `@alias:id` on the type annotation.

**References are not supertypes.** REFERENCE-kind entries do not contribute to the `supertypes` or `subtypes` graph of their targets. They are aliasing relationships, not IS-A relationships. `uuid.subtypes` does not list `id`; `id.supertypes` is empty.

**Synthetic names are not references.** Synthetic types (§13.1) carry names containing `#` (e.g. `array#text`, `choice#email#phone`) and are distinct from REFERENCE-kind entries. Synthetic types have their original kind (PRODUCT for containers, SUM for choices) and their body is a constructor instance, not a `!reference { target }` record. The `#` in the name is a synthesis-naming convention, not a reference indicator.


## 14. Schema Resolution Model

Schema URLs in TSON are **logical identifiers**, not fetch instructions. A URL like `https://tson.io/2026/m/core.tn1` names a schema — it does not require the implementation to make an HTTP request to that address. Implementations resolve schema URLs through a **schema library**: a local store mapping URLs to schema content.

### 14.1 The Schema Library

Every TSON implementation maintains a schema library. The library is a map from URL strings to resolved Schema objects. When the resolver encounters a `!!schema`, `!!meta`, or `!!import` directive, it looks up the URL in the library. If the URL is found, the corresponding Schema object is returned. If the URL is not found, the resolver reports an error — it does not attempt to fetch the URL.

The library is populated through three mechanisms, in order of precedence:

**Pre-loaded schemas.** The implementation ships with the meta-kernel (`tson.io/2026/m/meta-kernel.tn1`) and the meta-schema (`tson.io/2026/m/meta.tn1`) as pre-loaded entries, and SHOULD ship with the core type library (`tson.io/2026/m/core.tn1`) as a pre-loaded entry as well. These schemas exist as in-memory structures before any document is parsed. Pre-loaded schemas are authoritative — their in-memory representation takes precedence over any external source (see §11.5).

**Registered schemas.** Applications register schemas in the library before parsing documents that reference them. Registration associates a URL with schema content and MAY occur from local files, embedded resources, or any application-specific source.

**Fetched schemas (optional).** Implementations MAY support fetching schemas by URL as a convenience for development and exploration. Fetching MUST be explicitly enabled by the application — it is never the default behaviour. Fetched schemas are subject to the security constraints in §16.2. Production systems SHOULD NOT rely on runtime fetching; they SHOULD register all required schemas at startup.

**Identity agreement.** Registration under a URL that differs from the content's declared `!!id` is an error — the library MUST reject it as identity confusion. Content with no `!!id` MAY be registered under an application-supplied URL (a development-mode convenience, §9.1); content with an `!!id` is registered under that URL and no other.

**Schema sources are schema documents.** Whenever the library is populated from a document — a registered local file, an embedded resource, or fetched content — that document MUST classify as a schema document ([TSON-DATA] §2.2). This applies to the targets of `!!schema`, `!!meta`, and `!!import` alike. A resolved-schema data document (resolver output, §13) is not a valid schema source: its resolver-derived fields (`supertypes`, `subtypes`, synthesised entries) cannot be verified against the document alone and may be stale, corrupted, or malicious, and the document is non-canonical and not hash-pinnable. An implementation MUST reject a data document supplied as the content of a schema URL, with a categorized diagnostic ([TSON-DATA] §8.1). Resolved-form documents MAY enter the library only through the explicit ingest path (§13), which does not take derived fields on trust.

### 14.2 Hash-Pinned References

The hash-parameter URI convention — the algorithm-named query parameter, lowercase full-length hex, the identity-versus-verification split, and the mismatch rule — is defined in [TSON-DATA] §2.2.1 and applies to every TSON document. This section defines how the schema library applies it.

Library keys are **stripped identities**: a reference's identity is its URL with hash parameters removed ([TSON-DATA] §2.2.1), so a plain URL and its hash-pinned form name the same library entry — the pinned form additionally demands verification. When a hashed reference resolves, the implementation MUST verify the library's content against the declared hash before use; a mismatch is a resolver error ([TSON-DATA] §8.1), and the library MUST NOT silently substitute mismatched content. When registration supplies a document whose declared `!!id` itself carries a hash, the implementation SHOULD verify at registration time — failing fast at entry rather than at first reference.

When no content hash is present, the URL resolves against the library without integrity verification. This is appropriate for development but NOT RECOMMENDED for production data interchange. References that cross a trust boundary SHOULD be hash-pinned: a schema's `!!meta` and `!!import` values pin its contract and dependencies; a data document's `!!schema` pins its vocabulary. Pinning composes into the verification chain of [TSON-DATA] §2.2.1 — a consumer holding a single hashed reference can verify a document together with its schema, that schema's meta-schema, and the kernel.

Examples:

Referencing a schema with integrity verification:

```
!!schema:"http://example.com/people.tn1?sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
```

A schema declaring its own hash in `!!id` (first line excluded from hash input):

```
!!id:"http://example.com/people.tn1?sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
!!meta:"https://tson.io/2026/m/meta.tn1"
{
  person => { name: text  age: integer }
}
```

### 14.3 URL Identity

Reference identity is defined by [TSON-DATA] §2.2.1: two references are identical if and only if their URLs are byte-for-byte identical after removing hash query parameters, with no URL normalization of any kind. The library applies this as its key rule — `https://tson.io/2026/m/core.tn1` and `https://tson.io/2026/m/core.tn1?sha256=9f86d0...` resolve to the same entry (the latter additionally requiring verification, §14.2) — while spelling variants that a web stack would normalize (scheme case, trailing slashes, percent-encoding) are *different identities* here. The identity-agreement rule of §14.1 completes the picture: the URL a document declares in `!!id` is the URL it is registered under, stripped of hash parameters.


## 15. Atom Token Parsing

Each atom type owns its parsing contract. When a schema is in scope and a token appears at a position whose type is an atom, the atom's parser takes the token and produces either a typed host value or a parse error. The atom's constraint record (min, max, length, pattern, members, etc.) is applied as validation after parsing succeeds.

Parsing and validation are distinct operations:

- **Parsing** — Token (lexeme) to host value. The atom defines what tokens are accepted and what the resolved host value looks like. For example, `integer` accepts tokens that match the integer grammar and produces a host integer; `date` accepts tokens that match RFC 3339 full-date and produces a host date; `text` accepts any quoted or unquoted token and produces a host text.
- **Validation** — Host value against the constraint record. For example, `uint8` (narrowing `integer` with `{min: 0 max: 255}`) parses the token as an integer first, then validates the parsed value against the range.

A parse failure is distinct from a validation failure. The token `twelve` against a field of type `integer` is a parse error — the integer atom's parser cannot interpret `twelve` as an integer. The token `300` against a field of type `uint8` parses successfully as an integer, then fails validation against `max: 255`. Implementations SHOULD distinguish these in error reporting ([TSON-DATA] §8.1).

**Enum member semantics.** The `enum` atom's `members` field is a `set<token>` — it enumerates the lexical tokens permitted at an enum-typed position. Parsing an enum-typed position is a token-identity check: the source token (canonicalised per `token`'s parsing contract, below) must match one of the member tokens. The resolved host value is determined by natural parsing of that token:

- For `boolean` (defined as `!enum [true false]` in core), the tokens `true` and `false` resolve to native host booleans. The enum member check is satisfied by token-identity match; the resolved representation is the host's native boolean type.
- For user-defined enums such as `status => !enum [ACTIVE INACTIVE]`, the resolved host value is the member token (`ACTIVE` or `INACTIVE`) represented as a host text, or a host-language enum value if the implementation provides such a mapping.

The `members: set<token>` declaration describes the *permitted token lexemes*, not the resolved representation. Two distinct concerns — what tokens are accepted, what the runtime value looks like — share a single declaration because token identity is the canonical identifier for the member.

**The `token` primitive.** The kernel defines `token` as an instance of `unit` (alongside `value`). A `token` value is the canonical NFC-normalised form of a source lexeme — for unquoted lexemes the lexer normalises ([TSON-DATA] §7.2.1), and for quoted lexemes appearing in identifier positions the resolver normalises ([TSON-DATA] §7.2.1). Two tokens are equal iff their canonical forms are byte-identical. Tokens are whitespace-free by construction — the lexer terminates tokens on whitespace — and this is a structural invariant, not a constraint. The `token` type carries no constraint vocabulary; its admissibility rules are fixed by the grammar.

`token` shares its host representation with `text` — both are sequences of Unicode code points — but differs in its parsing contract: a `token` value rejects whitespace and applies NFC, while a `text` value can contain any character permitted by the string literal grammar. Use `token` as a value type when the value must be a valid TSON identifier (map keys in `map<token, ...>` authored as bare unquoted lexemes, enum members, identifier-like fields). Use `text` for free-form textual content. The conflation between `token` as a lexical category (an identifier in the source) and `token` as a value type (a text with the identifier contract) is intentional: a `token` value can always be rendered back as an unquoted lexeme, and an unquoted lexeme can always be promoted to a `token` value without escaping.

`token` is not used in data values and is not redefined in core or user schemas. It appears in the kernel's own declarations: `enum.members: set<token>`, and the identifier types `type_name`, `field_name`, and `param_name` (all defined as references to `token`). These are the positions where the schema language describes lexical identifiers from the source, as distinct from arbitrary Unicode text (which uses `text`).

**Number-grammar reuse.** Atoms that parse numeric values (`integer`, `real`, `decimal`, `rational`, their narrowings in core, and user-defined numeric narrowings) SHOULD use the number grammar of [TSON-DATA] §7.6 for the relevant numeric form. This is functional reuse, not a normative dependency: each numeric atom defines its own parsing contract, and [TSON-DATA] §7.6 is the canonical source for the grammar and parsing logic. An implementation may share a single number parser across all numeric atoms and dispatch based on the atom's declared form — this is the expected pattern, and it matches how [TSON-DATA] §5.6 defines the built-in numeric atoms against the same productions.

**Constraint fields typed as `value`.** Some atom constructors declare constraint fields with type `value` because the constrained atom cannot be referenced at the point of declaration — for example, `real_type.min: value?` cannot use `real` as its type because `real` is an instance of `real_type` (bootstrap ordering, §11.5). The `value` escape hatch defers the type decision to the atom implementation.

Tokens at these positions are parsed by [TSON-DATA] §4 base type resolution. Whatever [TSON-DATA] §4 produces — an integer, a float, a string — is what the resolver stores in the constraint-record field.

Each constrained atom's implementation is responsible for converting `value`-typed constraint values to whatever internal representation it uses for validation. Conversion MUST occur at schema-load time (eager), not per-validation (lazy). Atoms that cannot convert a given constraint value — because the value is of a non-convertible type, out of the atom's internal range, or otherwise incompatible — MUST report an error at schema-load time. This ensures a schema either loads cleanly or fails with a clear diagnostic; a half-valid schema that silently mis-validates data is never produced.

Two concrete consequences: (1) a decimal atom using an arbitrary-precision internal representation may accept integer, float, and string constraint values and normalise them, while a 32-bit-float atom may accept only values representable in IEEE 754 single precision and reject out-of-range constraints at load time. (2) Two implementations of the same atom may differ in which constraint-value types they accept, as long as they both validate successfully-loaded schemas identically. The permissiveness of conversion is an implementation choice; the validation semantics after conversion are the atom's contract.

**Base type resolution as a schemaless default.** [TSON-DATA] §4 defines a resolution order (null, boolean, number, string) that applies when no schema is in scope. These category names are **lexical classifications**, not type names: `number` and `string` name what a token looks like, while `integer`, `real`, and `text` name types declared in schemas (§12). The two vocabularies never mix — a schema cannot reference the lexical class `string`, and base resolution never produces the type `text`. This dispatch is itself an implicit atom parser — one that chooses across the atom family by first-character and pattern. When a schema is in scope, the field's declared atom's parser takes over; the dispatch does not apply.


## 16. Security Considerations

The security considerations of [TSON-DATA] §9 apply. This section adds the schema-layer considerations.

### 16.1 Schema Validation

TSON documents without a `!!schema` directive carry no type guarantees — only base type resolution ([TSON-DATA] §4) applies. Applications processing untrusted TSON input SHOULD validate against a schema before use.


### 16.2 External References

Schema URLs in `!!schema`, `!!meta`, and `!!import` directives are logical identifiers resolved through the schema library (§14), not fetch instructions. The default resolution behaviour is local lookup — no network access occurs unless the application explicitly enables it.

Implementations that support optional schema fetching (§14.1) MUST treat it as an opt-in capability, disabled by default. When fetching is enabled, implementations SHOULD enforce the following controls:

- **URL allowlists.** Restrict fetchable URLs to a set of approved domains or URL prefixes. The `!!schema` and `!!meta` directives are particularly sensitive because they determine the type vocabulary for the document — a malicious URL could direct a parser to load an untrusted schema that redefines expected types.
- **Content hash verification.** Require content hashes on fetched schema URLs (`?sha256=...`) and reject schemas whose content does not match. This prevents both tampering and silent schema drift.
- **Size limits.** Enforce maximum size limits on fetched content to prevent denial-of-service via oversized schemas.
- **No recursive fetching.** A fetched schema's own `!!import` directives MUST NOT trigger further fetches. All transitive dependencies must be pre-registered or pre-fetched.
- **Caching.** Fetched schemas SHOULD be cached locally after verification. A verified schema at a given URL with a matching content hash is immutable — re-fetching is unnecessary.

Production systems SHOULD pre-register all required schemas at application startup and disable runtime fetching entirely. The schema library model (§14) is designed to make this the natural and easy path.


### 16.3 Directive Security

Directives (`!!`) are a control channel that affects interpretation. Applications processing untrusted TSON input SHOULD restrict which directives are accepted. `!!meta` and `!!import` are particularly sensitive because they select and extend the type vocabulary — production systems MAY restrict which meta and import URLs are permitted. See also [TSON-DATA] §9.3.


## 17. ABNF: The Schema Grammar

This section defines the schema grammar — the schema document's body grammar, the second of the two body grammars behind the shared document header ([TSON-DATA] §2.2, §7.4). The lexer is unchanged ([TSON-DATA] §7.3); the productions below consume the same token stream, and the reserved special tokens of [TSON-DATA] §7.2.5 receive their meaning here.

### 17.1 The Schema Grammar

The schema-document header — the optional `!!id`, the `!!meta`, and any `!!import` directives — is defined entirely by [TSON-DATA]'s grammar (§2.2, §7.4). This document defines the schema body: `schema-map`, the annotated, braced declaration map that [TSON-DATA]'s `schema-doc` production delegates here. `annotation`, `separator`, and `data-value` are imported from the [TSON-DATA] §7.4 grammar; `data-value` appears at exactly two points — instance values and field-modifier values — and the coupling is one-directional: nothing in the data grammar depends on these productions.

A `schema-map` deliberately copies the shape of [TSON-DATA]'s `map` production: the schema body *is* a map to the developer, as it is to the resolver (§11.7). Unlike a data map it requires at least one entry — an empty schema has no purpose, so `{}` at schema-body position is a parse error. An entry is called a **declaration** throughout this document. Annotations before the opening brace bind to the schema (the schema-map value); annotations at the head of an entry bind to the key — the declared name — exactly as in a data map; annotations after `=>` bind to the type definition (§6, §11.7).

```
; ── Schema Map (schema body) ──────────────────────────────

schema-map       = *( annotation ws ) "{" ws schema-map-entry
                   *( separator schema-map-entry ) ws "}"

schema-map-entry = *( annotation ws ) type-name ws "=>" ws
                   *( annotation ws ) type-def

; ── Type Definition (declaration right-hand side) ─────────

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

**Composed definitions.** The trailing record-def in `composed-def` is optional. `customer => address & contact` is a valid definition combining two supertypes with no additional fields and no tightening; `& {}` at the end is not required. When a `{` follows a `&`-chain, it always belongs to the composed-def's record-def — no other production in the type-definition grammar starts with `{` after a chain of `&`-separated type-refs.

**Narrowing target.** The narrowed-def target is restricted to a bare type-name, optionally with type-args (e.g. `map<text, integer> { ... }`). Narrowing an inline instance, a choice, or an array is a parse error — these have no field list to tighten.

**Type argument separators.** Type arguments inside `<>` may be separated by comma or whitespace, matching the `array-def` separator rule. `map<text, integer>` and `map<text integer>` are both valid.

`_` is not valid in type-ref or type-def body positions — see the absent sentinel position table in §2.4. Empty records use `{}`.


### 17.2 Disambiguation Summary

```
; schema body (after the header):
;   @              → annotation; before "{" it binds to the schema,
;                    inside the braces to the entry key (name) or,
;                    after "=>", to the type definition
;   {              → schema map opens
;   name =>        → declaration (two-token lookahead)
;   }              → schema map closes; end of document
;   anything else  → parse error
;
; type-def position (after =>):
;   !              → instance
;   ~              → constructor marker, then structural-def
;   name &         → composed-def
;   name {         → narrowed-def
;   {              → fresh record-def
;   (              → choice-def
;   [              → array-def or tuple
;   name ? / name  → type-ref
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
;
; declaration boundary (resync): after a bare type-ref in
; type-def position, one/two-token lookahead decides:
;   {              → narrowing body of the current type-def
;   <              → type arguments of the current type-ref
;   &              → composition continues the current type-def
;   ","            → current declaration complete
;   name "=>"      → current declaration complete; a new one begins
;   "}"            → current declaration complete; map closes
;   name (other)   → parse error
```

Each case in the type-def block is decided by one-token lookahead at the start of the production; in array-def, the choice between tuple, sized array, and unconstrained array is made by one-token lookahead **after the complete preceding `field-type`**. A `field-type` can itself be nested (`(email | phone)<context>?`), but its own grammar is unambiguous and parses without backtracking via the type-def disambiguation above. The schema body requires at most two tokens of lookahead (a name followed by `=>`) to detect a declaration boundary; a `,` or the closing `}` decides in one. The parser never backtracks at any level, including the schema body.


### 17.3 Adjacency Rules

The following rows extend the adjacency table of [TSON-DATA] §7.5 for the operators of the type-definition grammar. As there, the rules are enforced by the parser via source-position comparison, not by the ABNF productions.

| Operator | Type | Context | Rule |
|---|---|---|---|
| `!` | prefix | type-def body (constructor instantiation) | MUST be adjacent to the following unquoted-token (constructor or instance name) |
| `?` | suffix | field type, tuple position, array element | MUST be adjacent to the preceding token (type name or closing bracket) |
| `&` | binary | composition | whitespace on either side optional |
| `~` | prefix/modifier | constructor marker, default value | whitespace optional |
| `=` | modifier | fixed value | whitespace optional |
| `\|` | separator | choice variant | whitespace optional |
| `;` | separator | array size spec | whitespace optional |
| `=>` | separator | schema declaration; data map entry | whitespace optional (compound token from lexer) |


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
| TSON-DATA | TSON Part 1: Data Format | https://tson.io/raw/2026/tson-part1-data-format.md (pinned at publication) |
| meta-kernel.tn1 | TSON Meta-Kernel (companion artifact) | https://tson.io/2026/m/meta-kernel.tn1?sha256=&lt;pinned at publication&gt; |
| meta.tn1 | TSON Meta-Schema (companion artifact) | https://tson.io/2026/m/meta.tn1?sha256=&lt;pinned at publication&gt; |
| core.tn1 | TSON Core Type Library (companion artifact) | https://tson.io/2026/m/core.tn1?sha256=&lt;pinned at publication&gt; |

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
