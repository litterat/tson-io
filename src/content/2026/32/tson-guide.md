---
title: "TSON Developer Guide"
draft: "2026"
status: "Working Draft"
description: >
  Design history, rationale, extended examples, and implementation guidance for the TSON
  specification series. Nothing in this guide is normative; where it appears to disagree
  with [TSON-DATA] or [TSON-SCHEMA], the specifications govern.
---

# TSON Developer Guide

**Status:** Non-normative companion to the TSON specification series, 2026 revision series. This guide collects the design history, rationale, and extended worked examples that the specifications reference but do not carry. Nothing here is normative; where this guide appears to disagree with [TSON-DATA] or [TSON-SCHEMA], the specifications govern.


## 1. Reading the Series

The TSON series is two documents and six artifacts:

- **[TSON-DATA]** defines everything a schemaless processor needs: the lexer (frozen, shared by the whole series), the data grammar, base type resolution, and the built-in type vocabulary. If you are writing a parser, start here and stay here until it passes the data-format test suite.
- **[TSON-SCHEMA]** defines the schema layer: a second body grammar over the same lexer, the type system, the schema chain, and resolver output. If you are writing a validator or resolver, this is your contract.
- The **companion artifacts** — `meta-kernel.tn1`, `meta.tn1`, `core.tn1` and their resolved fixtures — are the normative vocabulary and the reference answers. Implementations pre-load the kernel and meta as in-memory structures; the documents are *descriptions* of those structures, and round-tripping them is the first serious integration test.

A useful reading order for implementers: Part 1 §7 (the lexer and grammars), Part 1 §2–§4 (documents and base resolution), Part 2 §3 (the schema chain), Part 2 §5 (the type-definition grammar), Part 2 §8 (resolver output), then the fixtures.


## 2. Design History

### 2.1 No comments

TSON has no comment syntax. This is not an oversight inherited from JSON but a decision re-made deliberately: comments are metadata, and TSON already has a metadata channel with defined semantics — annotations. A comment is invisible to the data model, gets lost on round-trip unless implementations invent preservation rules, and inevitably becomes a side-channel for machine-readable content (as happened with JSON parsers that accept `//` and the ecosystem of magic comments in YAML). `@doc:"..."` does everything a comment does, survives round-trips by rule, is attached to a specific value rather than a lexical position, and is typed and validatable when a schema is in scope. The cost — you cannot annotate *nothing*, or comment out a region — is accepted: TSON documents are interchange artifacts, not source code.

### 2.2 No anchors, references, or merge operators

The locality principle ([TSON-DATA] §1.2 principle 6) says a value is fully local: what appears at a position is the complete value. YAML's anchors and merge keys are the counter-model, and their costs are well documented — reference cycles (the "billion laughs" family), non-local reasoning (you cannot review a value without scrolling to its anchor), and merge semantics that differ across implementations. TSON's position is that reuse belongs to the producing application, not the wire format. Where genuine cross-document reference is needed, it is explicit and typed: a `!uri` value plus an application-level dereference policy, or the schema layer's `extern`.

### 2.3 The `!!include` deletion

Earlier drafts defined a fifth directive operation, external inclusion (`!!include`), which spliced the contents of another document into the current one at parse time. It was deleted, for three reinforcing reasons. First, it violated locality in the worst way: the meaning of a document depended on I/O performed mid-parse, so no document could be classified, hashed, or reviewed from its own bytes. Second, it created a security surface that the rest of the format had carefully avoided — parse-time fetching is exactly what §9.3/§11.2 of the specifications forbid by default. Third, it was redundant: inclusion decomposes into a reference (`!uri`) plus an application-level dereference policy, and applications that want transclusion can implement it above the format with full knowledge of their trust model. The deletion left the directive set closed at four names, which in turn allowed the grammar to enforce directive placement and cardinality structurally — no directive registry, no unknown-directive category, and document-kind classification from at most two directives of lookahead.

### 2.4 The braces restoration

A schema document's body is a braced map. An earlier revision deleted the enclosing braces on the grounds that they did no work — the declarations could simply run to end-of-file. Restoring them was deliberate, and the reason is annotation binding: TSON's one binding convention is that annotations precede the value they bind to, and without a body value there is no boundary between the document's annotations and the first declaration's. `@doc:"..." { ... }` binds to the schema by exactly the same rule that binds a data document's root annotations to its root value. The braces also make the semantics visible in the syntax: a schema *is* a map (`map<type_name, type_definition>`), and the symmetry between source and output is exact — source `@doc:"..." { name => type-def }` compiles to output `@doc:"..." !schema { name => !type_definition { ... } }`: the same shape, one rung down the ladder.

### 2.5 Subtraction breaks IS-A on purpose

Subtraction (`account - { password }` — a removal clause on a construction head) is the operation type systems usually refuse to provide, because removing a field from a subtype violates substitutability. TSON provides it *and* makes it break IS-A, which dissolves the objection: `account_public` is not claiming to be usable where `account` is expected — the resolver records an empty `type_definition.supertypes` precisely so no consumer can treat it as one. What survives is authorial lineage: the body's `record.supertypes` still says "this was derived from `account`", which is documentation, not contract. The two-supertypes split (contract vs lineage) is the general resolution of a real tension: readers of a schema want to know both *what a type promises* and *where it came from*, and conflating the two is how most schema languages end up with either no subtraction or unsound subtyping. The practical use cases — view types, redaction shapes, public projections of internal records — are common enough that forcing authors to re-declare near-duplicate records was judged the worse outcome.

### 2.6 Why elided modifiers are safer than they look

In a refinement body, `field: = value` (no type-ref) inherits the field's type and changes only its state. Allowing this looks like a convenience with a trap — what if the author typos the field name? — but the grammar closes the trap: a modifier-only entry names no type, so it *cannot* declare a new field, and an unmatched name is a resolver error rather than a silent addition. Compare the alternative, requiring the type to be restated: now a refinement that tightens `spec: uri` to a fixed value must repeat `uri`, and if the source declaration later changes the field's type, every downstream refinement silently pins the *old* type or errors at a distance. Elision makes the common tightening robust against upstream type changes; restating the type is reserved for the case where the tightening genuinely narrows the type, which is exactly when the author should be explicit.

### 2.7 Field groups: the XOR that prose was policing

Before field groups ([TSON-SCHEMA] §5.11), four constraint vocabularies — `integer_type`, `float_type`, `decimal_type`, `rational_type` — declared their bounds as four independently optional fields and stated in a doc string that "an inclusive and an exclusive bound on the same side is a schema error." The record shape happily admitted `{ min: 0 exclusive_min: 0 }`; the rule lived out-of-band, in the same bucket as `min ≤ max`. But the two rules are different in kind. A lower bound is a labelled disjunction — inclusive *or* exclusive, one location, one occupant, discriminated by field name — which is a shape, and a schema language that can't state its own recurring shapes in shape is under-serving its meta layer. The group construct makes the illegal state unrepresentable and, in doing so, sorted every prose coherence rule in the numeric vocabularies into a three-way taxonomy: **exclusion among fields** becomes a group; **co-presence dependency** becomes a factored sub-record (`bits`/`signed` became `integer_size`, both fields REQUIRED inside one OPTIONAL field — the pairing is now structural); **value-level relations** (`min ≤ max`, bounds within the width-derived range) remain schema-load checks, because no shape can capture a relation between values. Only the third bucket legitimately stays prose, and after the change, only the third bucket does.

The resolver-output encoding was the contested decision. Groups *flatten*: members become ordinary OPTIONAL fields, contiguous in source order, and the grouping is recorded beside them in `record.groups`. Three alternatives were rejected. A per-field boolean flag cannot distinguish two groups in one record and cannot carry group state. Repeating the full group record inside each member field reintroduces — inside the construct built to eliminate prose coherence rules — a new incoherent-but-well-formed state (sibling members disagreeing about their shared group) that only prose could police. A group-name field on `record_field` touches the most widely instantiated record in the ecosystem to serve a rare construct, and still needs somewhere to put group state, since flattened members are uniformly OPTIONAL regardless of it. The `groups` list touches only the definitions that use it; every pre-existing resolved fixture remains byte-identical. The lookup-cost objection — validators must join fields to groups — dissolves at schema load: membership compiles into a per-record table in one local pass, per the same eager-resolution convention that governs constraint-value conversion. The general rule this crystallised: canonical output stores derived data only when derivation is *non-local* (`type_definition.subtypes`, the inverse of `supertypes` across a whole schema, earns its storage); anything locally derivable stays normalized and is compiled at load. The output form is canonical, not operational.

### 2.8 The labelled choice that dissolved

The variant-mechanism survey behind the design (the Part 7 research article) concluded that labelled and unlabelled sums encode genuinely different ideas — a label carries a domain role independent of the type, so `created`, `modified`, and `accessed` can all be timestamps and still be distinguishable — and that both belonged in the model. TSON ships one sum primitive, `choice`, which is the *unlabelled* form: variants must be distinct type names, and data carries a mandatory `!variant` tag. The labelled form was a candidate third construct, and it was rejected because field groups made it derivable: a record whose entire body is one REQUIRED group admits exactly one field, and `timestamps => { ( created: timestamp | modified: timestamp | accessed: timestamp ) }` *is* the labelled sum — named, referenceable, discriminated by label, encoding as the single-field record `{ modified: … }`. The wrapped and unwrapped encodings that ASN.1's JSON encoding rules distinguish with an `UNWRAPPED` modifier fall out as placement: a group among sibling fields is the unwrapped form, a group as a record's sole content is the wrapped form — same construct, two positions, no encoding modifier. Of the four corners of the label/tag grid, `choice` covers tagged-unlabelled (and, over one-line reference types like `created => timestamp`, tagged-labelled, since TSON's tag *is* a name); groups cover the labelled-embedded corner; the untagged-unlabelled corner — JSON Schema's `anyOf`, discrimination by trying every variant against the structure — is deliberately unoccupied, refused by the `!variant` requirement. One residue is kind classification: the labelled-sum pattern resolves to kind PRODUCT, and a product of one sum is isomorphic to the sum, so this is a lowering concern — a code generator that recognises the shape (one REQUIRED group, no other fields) can emit a native sealed variant rather than a struct of nullables. A second residue is a gain: `choice` cannot be refined, but records can, so a labelled sum in record clothing acquires a subtyping story — a refinement can pin or forbid variants — that a primitive sum would not have had.


### 2.9 Why `!` takes constructors only

An earlier draft wrote atom narrowing as `!integer { min: 0 }` — the same `!T { ... }` surface that data mode rejects as a category error ("the constraint vocabulary belongs to the constructor"). One string, two grammars, opposite meanings; and because `!` could target either a constructor or an instance, a reader needed the resolver's lookup order to know whether a declaration created IS-A — the `_type` suffix convention was carrying the semantics. The fix is one restriction and one operator: `!` takes constructors only, and `^` is refinement — `T ^ { ... }` for record and map types, `~C<P> ^ { ... }` at the meta rung, `!I ^ { values }` for atom instances. The prefix names the rung; `^` names the operation; IS-A creation is visible at the head of the declaration. The invariant "`!T x` describes a value shaped by `T`" now holds in schema source, data documents, and resolver output alike, and the instance-vs-constructor lookup branching dissolved into declared intent. The bare juxtaposition `T { ... }` went with it: `name {` is a parse error whose diagnostic suggests `^` or `&`, replacing the grammar's subtlest visual distinction (`T & { ... }` vs `T { ... }` — one ampersand between preserved and absent IS-A) with two explicit operators.

### 2.10 Why subtraction is a head-level clause

The same earlier draft expressed subtraction as `field: _` inside a composition or narrowing body, which had two problems. An `&` head could promise IS-A per parent while a `_` three lines down silently revoked it — the reader had to scan the body to learn whether the head told the truth. And the marker sat one character from its semantic opposite: `password: _` (remove the field, break the contract) versus `password: text? = _` (keep the field, forbid its value, preserve the contract). Taxonomically, subtraction is composition's sibling — a construction that computes a field set and disclaims the contract — not a refinement, so it moved to where constructions declare themselves: a trailing removal clause, `account - { password }`, `account & { ... } - { password  ssn }`. The break is now visible on the declaration line; empty subtraction became ungrammatical rather than merely prohibited; and `^` heads reject the clause outright — an operator that promises IS-A cannot host the operation that revokes it. The `-` character was available because the bare tokens `-`, `+`, and `.` were withdrawn at the same time (§2.11): as tokens they were the accidental single-character strings `"-"`, `"+"`, `"."`, and they let a schema declare `42` or `-` as a type name. `+` was considered for composition — an arithmetic `+`/`-` pair — and rejected: in type-theoretic usage `&` is intersection, which is exactly what composition means, while `+` is the sum type, the one reading TSON's own SUM kind makes maximally misleading; and the pair suggests inverse and commutative laws the semantics contradict.

### 2.11 Size-specs into the grammar

The array size-spec was originally a single unquoted token validated against a regex in prose — `1..100` lexed as one token because digits and `.` are profile characters, so no parser production could ever split it. The fix is one lexer rule: the unquoted scanner terminates before consecutive dots, and `..` is a compound token (the range token), making the size-spec ordinary grammar — bounds around `..`, each matched against `decimal-natural`, with the regex deleted. The `+` spelling went with it: `1..` says the same thing, and textual synthetic identity (§8.1) had been paying for the duplicate with two entries for one type. What stayed behind is instructive: only the `N < M` relation remains a schema-load check — the taxonomy of §2.7 applied to sizes, shapes into grammar, value relations into checks. The data-format cost was accepted with eyes open: range-shaped content (`2026-01..2026-06`) now splits at the range token and must be quoted, which is the exclusion principle of §3.1 finally reaching ranges — their quoting rule is "always", never a scan.


## 3. Lexical Design

### 3.1 The unquoted profile, derived

The unquoted-token profile is UAX #31's identifier profile plus exactly three characters — `-`, `+`, `.` — and the digit category `Nd`. Every addition is traceable to a production of the number grammar: `Nd` because scalar tokens, unlike identifiers, include numbers; `-` and `+` because they are the sign and exponent-sign characters; `.` because it is the decimal point and the leading character of `.inf`, `.infinity`, and `.nan`. Nothing is speculative, and all three extension characters are `Pattern_Syntax`, hence immutable across Unicode versions — the profile itself is frozen while its property-based components grow monotonically with new scripts. Their bare single-character forms, though, are not tokens: `-` alone is the subtraction operator, `..` is the range token, and bare `+` and `.` are lexer errors (§2.11).

The exclusions follow a single rule: a content kind the profile cannot cover *totally* is excluded *entirely*, so that its quoting rule is "always", never a per-character scan. Paths need `~`, `\`, and spaces; URIs need `:`; monetary amounts need currency symbols, grouping separators, and spaces; rationals and CIDR networks need `/`; percentages need `%`; ranges need `..`, which the lexer claims as the range token. Admitting any of these characters would let *some* paths or *some* URIs go unquoted — and a rule of the form "quote paths, except those without spaces, unless…" is precisely the cognitive load the profile exists to eliminate.

### 3.2 Quoting by kind

The payoff of the total-coverage rule is that quoting becomes a property of what a value *is*:

**Never quoted:** numbers, `null`/`true`/`false`, identifier- and enum-like names, `full-date` temporals (`2026-08-01`), UUIDs, hyphen-form MAC addresses, version strings.

**Always quoted:** anything containing whitespace or prose, timestamps and URIs (colons), email addresses (`@`), paths, rationals and CIDR networks (`/`), IPv6 addresses (colons), monetary amounts and percentages, ranges (`..`), the single-character strings `-`/`+`/`.`, and leading-underscore names.

A generator needs only two clauses: quote if any character falls outside the profile, and quote if the bare token would resolve to something other than the intended string (`"true"`, `"42"`, `"0x71C7…"`). A human writing TSON internalises the kind-level rule after a few documents and never thinks about individual characters again.

ZWNJ and ZWJ deserve their footnote: UAX #31 permits them in restricted contexts and some orthographies genuinely require them, but they are invisible, which makes them confusable and spoofing surface. Names that need them must be quoted — the profile trades a small orthographic inconvenience for the guarantee that two visually identical unquoted tokens are the same token.

### 3.3 Canonical identity: restrict, don't normalize

Reference identity ([TSON-DATA] §2.2.1) stays at RFC 3986's cheapest comparison rung — simple string comparison — by *restricting the input* rather than normalizing it. An identifying URI must already be lowercase-host, port-free, userinfo-free, dot-segment-free, fragment-free, with no percent-encoding of unreserved characters; anything else is an error, not a candidate for cleanup.

RFC 3986 §6.1 supplies the risk asymmetry that motivates the conservatism: for a schema system, a **false positive** — two distinct documents judged identical — validates data against the wrong contract, silently; a **false negative** merely costs a redundant registration or fetch. Every rung of normalization ladder an implementation climbs (case folding, path resolution, percent-decoding, scheme-specific rules) buys convenience by increasing false-positive risk and by widening the room for two implementations to disagree about identity. TSON climbs one deliberate rung — the scheme is dropped, so `http`/`https` variance names the same document — because transport choice demonstrably should not fork a document's identity, and stops there. The host, by contrast, is load-bearing on purpose: a fetch-endpoint change cannot silently redirect a name.

### 3.4 Content addressing and the verification chain

The hash-parameter convention (`?sha256=…`, verification metadata rather than identity) composes into a Merkle-style dependency graph in the manner of content-addressed stores: a data document pins its schema, the schema pins its meta-schema and imports, and the chain grounds in the pre-loaded bootstrap. A consumer holding a single hashed reference can therefore verify a document *together with its entire contract chain* — every byte that determines how the document will be interpreted — without trusting any intermediary. The rule that the hash input is every byte after the `!!id` line exists to make this work: a document can carry its own name without the name's spelling perturbing its hash, so registrars and mirrors can relocate content while the identity-plus-hash pair stays verifiable.

The specifications stop at verification deliberately. Ordering, consensus, and mutability policy — everything a content-addressed *store* adds on top — are application concerns; TSON supplies the identity discipline they need and nothing more.


## 4. The Schema Ladder, Narratively

### 4.1 What schema-value separation buys

The fundamental rule — a document never resolves type annotations against its own definitions — looks austere until you list what it purchases:

- **Stable meaning.** `!text` in a document means what the referenced schema says, full stop. Two documents referencing the same schema have identical vocabularies; no document can locally shadow a type and change the meaning of data that quotes it.
- **Reviewability.** A schema is a self-contained published artifact. Reviewing a data document requires its schema and nothing else; reviewing a schema requires its meta and imports and nothing else. There is no "definitions section" whose scope leaks into the data.
- **Immutability with teeth.** Because schemas are external, hash-pinnable artifacts, "the contract cannot change under you" is a verifiable property rather than a convention.
- **Uniformity all the way up.** The same rule governs data documents, user schemas, and the meta layer itself, so the resolver has one resolution model rather than a special case per layer.

### 4.2 Why one hop

All resolution against a governing target is one hop: the target's namespace — locals plus imports — is consulted directly, and no further rung of the ladder is walked. The alternative (walking the chain until a name resolves) is how most inheritance systems work, and its failure mode is well known: the effective vocabulary of a document becomes the union of everything above it, so adding a name anywhere up the chain can change the meaning of documents that never mention that rung. One-hop resolution makes every document's vocabulary *finite, explicit, and owned by exactly one schema*. The cost is the "import what you expose" obligation — a meta-schema must import every schema whose entries it intends to offer — and the specification chooses to pay it, because the obligation falls on the few authors of meta-schemas rather than the many authors of documents.

### 4.3 Import what you expose, worked

`meta.tn1` is the worked example. Meta's own declarations use kernel types (`token`, `type_name`, `value`), so it needs the kernel import for itself. But the import does double duty: because every meta-governed schema resolves constructor roles against *meta's namespace, one hop*, the kernel import is also the delivery mechanism that places `enum`, `record`, `array`, the sugar-form desugar targets, and `type_definition` in front of every user schema and every resolver-output document. Delete the import and meta's own body still nearly works — but every schema chaining to meta loses the structural vocabulary, and resolver output can no longer name its own body types. The one-hop rule turns a meta-schema's import list into its published API surface, which is exactly the property you want reviewable.

### 4.4 Where annotations live, and why it feels asymmetric

Annotations resolve one hop against the governing target — the `!!meta` target for a schema document, the `!!schema` target for a data document. The asymmetry that surprises authors: an annotation type declared in a user schema is usable in that schema's *data documents* but not in the schema document itself, whose governing target is meta. This is the one-hop rule being consistent rather than an exception to it: the schema document is governed by meta, so its metadata vocabulary is meta's business; its data documents are governed by the schema, so their metadata vocabulary is the schema's business. Custom annotations for schema documents therefore require an extended meta-schema — a heavier act, deliberately, because schema-document metadata is tooling-facing and benefits from ecosystem-wide agreement.


## 5. A Tour of the Type Operations

The type system's operations form a spectrum of completeness — each operation takes a definition some distance further toward concrete data.

**Construction** (`!C { bindings }` in the schema grammar) creates a new type from a constructor. It is the origin point of every atom family and every structural type, and it transfers *kind*, never IS-A: `dogs => !integer_type {}` founds a fresh atom family with the same constraint vocabulary as `integer` and no relation to it. Construction creating siblings rather than subtypes is the load-bearing choice — it is what lets one constructor found unrelated nominal families (`integer` and `dogs` do not accidentally unify), and it is why the atom family's IS-A facts live in `supertypes` rather than being derivable from bodies.

**Refinement** (`T ^ { ... }` or `!I ^ { values }`) copies a definition and tightens it — binding values, fixing defaults, restricting ranges — while preserving IS-A with the source. Refinement never adds fields; the transition table in [TSON-SCHEMA] §5.7 is monotone toward FIXED, and FIXED is terminal. A chain of refinements is a chain of promises, each stronger than the last, and any consumer expecting the source type can accept the refined one.

**Composition** (`A & B & { ... }`) is construction with declared ancestry: new fields are permitted, each listed supertype contributes IS-A, and the disjointness rule (no field name from two supertype paths) keeps the merge order-independent and diamond-free.

**Subtraction** (`head - { fields }`) removes fields and breaks IS-A — see §2.5 above for why this is a feature, and §2.10 for why the clause sits at the head.

**Instantiation** is the data-level end of the spectrum: `!T value` in a data document produces a concrete value, terminal by definition. There is no construction in data; the same surface shape (`!C { bindings }`) in a data document is a record that *describes* constraints — which is precisely what resolver output stores.

The one-way flow — construct, refine, instantiate, stop — is what makes the resolver's job tractable: every definition has a finite derivation ending at a constructor, every body desugars to one canonical form, and the data level never feeds back into the type level.


## 6. Atoms in Depth

### 6.1 The three unit atoms

**`value`** is the escape hatch: it admits whatever base type resolution produces (null, boolean, integer, float, string), which makes it the type of "a scalar the schema language cannot or will not constrain". Its principal legitimate uses are the kernel's own bootstrap (constraint fields whose natural type does not exist yet at kernel-load time — see §6.2) and genuinely dynamic data. Reaching for `value` in an application schema is usually a design smell; reaching for it in a meta-schema is sometimes forced.

**`token`** is the identifier primitive: NFC-canonical, whitespace-free, equal iff byte-identical in canonical form. It shares its host representation with `text` but not its contract — a `token` can always be rendered back as an unquoted lexeme, which is why the kernel uses it for `type_name`, `field_name`, `param_name`, and enum members. The NFC requirement does no work at parse time for unquoted lexemes (the lexer already rejects non-NFC source) and normalises quoted lexemes at identifier positions, so "same identifier" can never depend on Unicode composition happenstance.

**`void`** is the unit type of absence: one inhabitant, the absent sentinel `_`. Its two jobs are being the target type of bare annotations (`@deprecated` is sugar for `@deprecated:_` — presence is the information) and expressing "no value" as a field type or choice variant. The `null`-at-`void` concession (the token `null` accepted as an equivalent spelling and normalised to `_`) exists for JSON-shaped data under a schema; it is safe precisely because `void` has a single inhabitant, so no absence-vs-value distinction can be lost there — and it is confined to `void` so the distinction stays sharp everywhere else.

### 6.2 Constraint fields typed as `value`

`decimal_type.min` cannot be typed `number`, because `number` is a *core* instance of `decimal_type` — the constraint field exists before the type that would naturally fill it. This bootstrap ordering is why several atom constructors type their bounds as `value?`. The kernel's `integer_type` is the exception that proves the rule: its bounds are typed `integer` because `integer` lives in the kernel's own namespace.

The consequence for implementers is the eager-conversion rule: each constrained atom converts `value`-typed constraint values to its internal representation at schema-load time, never per-validation. The rule sounds like an optimisation but is really a correctness property — a schema either loads cleanly or fails with a clear diagnostic, and there is no such thing as a half-valid schema that parses but mis-validates on the millionth record. Which host types an implementation accepts for conversion (may an integer token bound a decimal field?) is an implementation choice; the validation semantics *after* conversion are the atom's contract, so two implementations that both load a schema agree on what it validates.

### 6.3 Exact and approximate numeric tiers

The numeric vocabulary is split into an exact tier (`number`, `rational`, the fixed-width integers) and an approximate tier (`float32`, `float64`), and the split is annotated in the type library with `@exact`. The design intent: a bare JSON-ish number carries no width or precision commitment, so it maps to `number` — preserved as written — and lossiness enters only when a consumer *chooses* an approximate type, at which point rounding onto the IEEE 754 grid is that type's documented contract rather than a surprise. The special values (`.inf`, `.nan`, signed zeros) belong to the approximate tier only, and NaN payloads are deliberately not information: every NaN denotes the canonical quiet NaN, so value preservation holds by definition and payload-dependent round-trip bugs are excluded by fiat.


## 7. A Complete Worked Example

The task-tracking schema from [TSON-SCHEMA] §1.6, taken all the way through resolution. The schema document:

```
!!id:"https://example.com/task.tn1"
!!meta:"https://tson.io/2026/32/m/meta.tn1"
!!import:"https://tson.io/2026/32/m/core.tn1"
@doc:"Task-tracking example schema."
{
  priority => !integer ^ { min: 1  max: 5 }
  status   => !enum [OPEN ACTIVE DONE]
  task => {
    id:       uuid
    title:    non_empty_text
    priority: priority ~ 3
    status:   status ~ OPEN
    due:      date?
    tags:     [text]?
  }
}
```

`priority` refines core's `integer` instance; `status` applies the `enum` constructor, reached through the structure namespace supplied by the `!!meta` target; `task` is a fresh record whose field types resolve through the type-name namespace — `uuid`, `non_empty_text`, and `date` from the core import, `priority` and `status` from the local declarations. The `~` modifiers place `priority` and `status` in the REQUIRED_DEFAULT state, and `[text]?` is an OPTIONAL field whose inline array type the resolver synthesises as a named entry.

A data document binds the schema and instantiates:

```
!!schema:"https://example.com/task.tn1"
!task {
  id:       550e8400-e29b-41d4-a716-446655440000
  title:    "Ship revision 32"
  priority: 3
  status:   OPEN
  due:      2026-08-01
  tags:     [spec editorial]
}
```

Note that `priority` and `status` restate their default values: a document that states its defaults reads without its schema, and omitting a defaulted field is an encoder optimisation — lossless only because the decoder injects the value back on read.

Resolution derives a schema value, serialized as resolver output — a data document governed by the meta-schema, in which every declaration has desugared to the canonical `!C { bindings }` form and fields at their default values are omitted (`constructor: false`, `state: REQUIRED`):

```
!!schema:"https://tson.io/2026/32/m/meta.tn1"
!schema {
  priority => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 1  max: 5 }
  }
  status => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [OPEN ACTIVE DONE] }
  }
  task => !type_definition {
    kind: PRODUCT
    body: !record { fields: [
      !record_field { name: id        type: uuid }
      !record_field { name: title     type: non_empty_text }
      !record_field { name: priority  type: priority  state: REQUIRED_DEFAULT  value: 3 }
      !record_field { name: status    type: status    state: REQUIRED_DEFAULT  value: OPEN }
      !record_field { name: due       type: date      state: OPTIONAL }
      !record_field { name: tags      type: "[text]"  state: OPTIONAL }
    ] }
  }
  "[text]" => !type_definition {
    kind: PRODUCT
    source: array
    body: !array { element_type: text }
  }
}
```

Reading the output:

- `priority` shows **refinement**: the surface form `!integer ^ { ... }` retargeted to the instance's source constructor (`source: integer_type`), with IS-A recorded against the refined instance (`supertypes: [integer]`). This is the case where `supertypes` carries information the body cannot: compare a hypothetical sibling `port => !integer_type { min: 0  max: 65535 }`, which would serialize with the *same* `source` and an identical body shape but empty `supertypes`.
- `status` shows **construction**: the `enum` constructor's ATOM kind is inherited, `source: enum` is recorded, and `supertypes` stays empty — construction transfers kind, not IS-A. The positional sugar `!enum [OPEN ACTIVE DONE]` has desugared to the explicit binding `{ members: [...] }`.
- `task` shows the **field-state machinery**: each `record_field` carries its state (the default REQUIRED omitted) and the eagerly-resolved default values, so consumers read defaults from the output without re-parsing modifier tokens.
- `"[text]"` shows **synthesis**: the inline array form hoisted to a named entry, its name the canonical rendering of the source expression — quoted, because the rendering contains `[`, which no authorable type name can. The synthetic has `source: array` and no supertypes, like any other construction.


## 8. Resolver Output for Consumers

### 8.1 Why synthetic identity is textual

Two inline forms denote the same synthetic entry iff their canonical renderings are identical strings — so `(email | phone)` and `(phone | email)` are distinct entries despite being semantically equal. This looks like a missed unification, but the alternatives are worse. Semantic identity requires the resolver to define (and every implementation to agree on) a normal form for every present and future construct — variant ordering, size-spec canonicalisation, nested-form flattening — and any disagreement forks entry names across implementations, which is a conformance bug factory. Textual identity is decidable by string comparison, stable across implementations by construction, and its cost is bounded and benign: synthetic entries are per-schema internals, non-referenceable by grammar, so a duplicate pair wastes a map entry and nothing else. The rendering also does triple duty — entry name, dedup key, and diagnostic display form — so error messages show authors the exact source form they wrote.

### 8.2 The two supertypes fields, once more

Consumers should internalise the split: `type_definition.supertypes` is the **contract** (transitive IS-A — use it for "can a value of X go where Y is expected"); the body's `record.supertypes` is the **lineage** (direct `&` compositions as written — use it to reconstruct or display source-level structure). Subtraction is the case that forces the distinction (lineage without contract), and the atom family is the case that makes `type_definition.supertypes` primary data rather than a cache (refinement vs sibling construction serialize identically except for this field). `subtypes`, by contrast, is always a recomputable cache and never trusted on ingest.

### 8.3 Error messages

The specification's error categories are minimal by design; implementations compete on diagnostics. Some conventions that have worked well: report *parse* failures ("`twelve` is not an integer") separately from *validation* failures ("300 exceeds age's max of 150") since users fix them differently; surface synthetic names verbatim (the user wrote `[text; 1..]` — show them `[text; 1..]`, plus the source position that first synthesised the entry); and on unresolved-type errors under a schema, say *which namespace was searched* — "no `uuid` in schema X (did you mean to import core?)" turns the most common beginner error into a one-line fix.


## 9. Deployment and Encoding Guidance

### 9.1 Schema libraries in practice

The library model (lookup, never fetch-by-default) maps onto deployments straightforwardly: production systems register every schema at startup — from files, embedded resources, or an internal registry — and disable runtime fetching entirely; development setups may enable fetching with an allowlist and treat it as a cache-population convenience. Registering under an application-supplied identity (for `!!id`-less development schemas) is handy in tests but should never survive into interchange: publish with `!!id`, pin with hashes at trust boundaries.

### 9.2 Defaults on the wire

Encoders should write values for defaulted fields. A document that states its defaults reads without its schema — `priority: 3` means 3 to every reader, schema in hand or not — whereas omission makes the document's meaning schema-relative. Omitting fields at their default values is a legitimate wire-size optimisation precisely because the decoder injects the value back on read, but it should be an explicit encoder option, not the default posture. Resolver output is the sanctioned exception: it omits fields at defaults because its consumers are, by definition, schema-aware, and the compression materially improves fixture readability.

### 9.3 Directive-per-line

Scoped `!!schema` directives on array elements read best one element per line, directive first — the layout in [TSON-SCHEMA] §7.8's example. The grammar does not require it, but the convention keeps the scope-opening directive visually attached to the single element it governs, which matters in review: scope changes are the highest-consequence lines in a document.


## References

| Reference | Title |
|-----------|-------|
| TSON-DATA | TSON Part 1: Data Format |
| TSON-SCHEMA | TSON Part 2: Schemas and the Type System |
| RFC 3986 | Uniform Resource Identifier (URI): Generic Syntax |
| UAX #31 | Unicode Identifiers and Syntax |
| RFC 8259 | The JavaScript Object Notation (JSON) Data Interchange Format |
