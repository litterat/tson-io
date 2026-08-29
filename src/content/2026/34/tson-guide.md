---
title: "TSON Developer Guide"
draft: "2026"
status: "Working Draft"
description: >
  Rationale, extended examples, and implementation guidance for the TSON specification
  series. Nothing in this guide is normative; where it appears to disagree with
  [TSON-DATA] or [TSON-SCHEMA], the specifications govern.
---

# TSON Developer Guide

**Status:** Non-normative companion to the TSON specification series, aligned with 2026 Revision 34. This guide carries the standing rationale, extended worked examples, and deployment guidance that the specifications reference but do not carry. It describes the design as it stands; it is not a change history — what changed between revisions, and why, lives in each revision's change log. Nothing here is normative; where this guide appears to disagree with [TSON-DATA] or [TSON-SCHEMA], the specifications govern.


## 1. What TSON Is

TSON is a schema system with its own notation. At its centre is a type system ([TSON-SCHEMA]): immutable, hash-pinned schemas whose definitions are themselves data, resolving down a verified chain — document → schema → meta-schema → kernel — so that one hash authenticates a document together with its entire contract. The TSON text format ([TSON-DATA]) is that system's notation and its reference encoding: a Unicode-first superset of JSON, pleasant enough to use on its own, typed even without a schema. Schemas are the point; the text format is how they are written down — and the first of the encodings that carry them.

If you arrived here thinking "another JSON dialect", that is a reasonable first impression and a wrong one. The unquoted names and optional commas are real, and they matter for daily use — but they are the notation's manners, not the system's identity. The nearest relatives are not JSON5 or JSONC but Avro and ASN.1: systems where the schema is the product and wire formats serve it. TSON takes that architecture and adds three things those systems never had together: schemas that are ordinary, hash-verifiable documents in the same notation as the data; a schemaless mode that is still typed; and an extension model where new type vocabularies arrive as data, never as grammar changes.

### 1.1 The chain, walked once

Everything in TSON hangs off one picture. Here is a data document:

```
!!schema:"https://example.com/people.tn?sha256=c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5"
!person { name: "Ada Lovelace"  born: 1815-12-10 }
```

The `!!schema` directive names the contract, pinned by content hash. `!person` names which of the schema's types this value instantiates. Note what `born` looks like: an unquoted token, no annotation. The schema declares the field as a `date`, so the date atom parses it — the data stays clean because the contract carries the types.

The schema it names is itself a TSON document:

```
!!id:"https://example.com/people.tn"
!!meta:"https://tson.io/2026/34/m/meta.tn"
!!import:"https://tson.io/2026/34/m/core.tn"
{
  person => { name: text  born: date }
}
```

Same lexer, same tokens, same tooling — a second body grammar behind the same header. And the schema stands on the same relation it offers: its `!!meta` names the meta-schema that validates *its* declarations, and its `!!import` brings in the core type library that defines `text` and `date`. The meta-schema chains to the meta-kernel; the kernel's `!!meta` names itself, and the circle is closed not by resolution but by pre-loading — implementations ship the kernel's resolved structure, and the kernel document is the TSON encoding of it. The in-memory model is authoritative; the file describes it.

Every rung is immutable and hash-pinnable, and hashes attach to canonical identities rather than URLs, so a consumer holding one hashed reference can verify a document together with its schema, that schema's meta-schema, and the kernel — the entire contract, authenticated from a single identifier, with no network access required or trusted (§3.3–§3.4 below detail the identity and verification discipline). Schema URLs are names resolved through a local library; fetching is an opt-in way to populate it, never the meaning of a reference.

That is the product. Everything else in the series — the grammar, the resolver, the encoding rules — exists to make that picture true.

### 1.2 Immutable means versioned

The schema in §1.1 will never change. Not *should not* — cannot: a schema's identity is its exact byte content ([TSON-SCHEMA] §3.5), and the hash in the data document's `!!schema` pins those bytes. Editing `people.tn` does not update the schema; it creates a different document that no existing reference names.

So when the contract needs to grow, you publish:

```
!!id:"https://example.com/people-v2.tn"
!!meta:"https://tson.io/2026/34/m/meta.tn"
!!import:"https://tson.io/2026/34/m/core.tn"
{  person => { name: text  born: date  email: text }
}
```

Look at what just happened: `email` is **required**. In every mutable-schema system, that is the forbidden edit — protobuf marks `required` *"Do not use"* because a required field added to a shared definition breaks every document already written; Avro demands a default; GraphQL says deprecate, never remove or tighten. Every one of those rules exists because a single definition must serve every document ever written against it. Here it doesn't have to: the §1.1 document names `people.tn` by hash and validates against it forever, untouched by v2's existence; new documents name `people-v2.tn`. Two contracts coexist, each at full strength. Neither is "the" schema — *the* schema is not a concept in this system; a *document's* schema is. (The `-v2` in the name is a convention for humans; the system's notion of version is identity plus hash, and nothing parses the suffix.)

Once that lands, the ripples reach nearly everything:

- **Required means required.** No leaving fields optional for future-proofing, no reserved field numbers, no tombstone fields carried forever. Records are closed under their type ([TSON-SCHEMA] §7.2): a v2 document without `email` is invalid, and a v1 document is never asked for one.
- **Unknown fields need no tolerating.** The "must ignore unknown fields" robustness rule exists to survive in-place evolution; with no in-place evolution, closure is safe — and a typo in a field name becomes an error instead of silently discarded data.
- **Acceptance is explicit.** A reader declares which versions it accepts by registering exactly those schemas in its library — and because the version key sits on the document's opening lines, readable before any value parsing, a front door can route v1 and v2 traffic to different servers without opening the body.
- **Migration is a function between two known values.** Both schemas are data (§1.3), so "what changed between v1 and v2" is a structural diff a tool can compute, and a v1→v2 transform has a precise input contract and a precise output contract.

Every design choice in §1.1 was quietly serving this moment: hashes attach to canonical identities so a pin survives mirroring; the id line is excluded from its own hash so a document can carry its name; the header classifies in two directives so routers never parse bodies. The full versioning story — including why routing by schema beats binding one server to every version, and the compatibility-rulebook history this model retires — is §9.1.

### 1.3 Schemas are data

A schema document *resolves* to a value: a map from type names to `type_definition` records, every one of them expressible in ordinary TSON. The `person` declaration above resolves to:

```
person => !type_definition {
  kind: PRODUCT
  body: !record { fields: [
    !record_field { name: name  type: text }
    !record_field { name: born  type: date }
  ] }
}
```

This reflexivity is load-bearing, not decorative. It means resolver output can be serialized, diffed, and shipped as fixtures; it means the meta layer can describe itself; and it means the system grows by publishing new schema documents — new type libraries, extended meta-schemas — rather than by amending a grammar. The kernel and the grammar are frozen at version 1; the meta layer is the sanctioned extension point, and extensions travel as data down the same verified chain as everything else.

It also dissolves the old bootstrap riddle. "What validates the meta-kernel?" has a concrete answer here: the pre-loaded meta-kernel, which exists as implementation structure before any document is parsed. The self-reference in the kernel's header is a description of that fact, not a dependency to resolve.

The research behind the design calls this discipline the **proto-schema** (§2): every schema in the system, walked down its chain, flattens to the meta-kernel — a handful of kinds, a few constructors, and one record, `type_definition`, that describes every type in existence including itself. The closest ancestor in spirit is Lisp. Where Lisp reduced computation to its purest form — programs written in the language's own data structures, an evaluator expressible in the language it evaluates — the proto-schema attempts the same reduction for description: data described by data, all the way down to a kernel that describes itself. Homoiconicity, for contracts rather than code.

### 1.4 Typed without a schema

Most schema systems make you choose: protobuf will not run without an IDL; JSON Schema leaves untouched data untyped. TSON is gradually typed. With no schema in scope, base type resolution gives you JSON's value model plus real numbers — hex, binary, digit separators, arbitrary precision — and the built-in type vocabulary gives you common typed values by annotation alone:

```
{
  id:     !uuid 550e8400-e29b-41d4-a716-446655440000
  price:  !number 19.99
  placed: !datetime "2026-07-18T09:30:00Z"
  digest: !hex 4f2a90de11c3b7a6
}
```

Each annotation invokes a parsing contract — the value becomes a UUID, an exact decimal, a datetime, bytes — with no schema anywhere. And because every valid JSON document (outside two character-level exceptions) is already valid TSON, the adoption path runs from "paste your JSON in" through "annotate the values that matter" to "bind a schema and pin it by hash", each step optional and each step reversible. The schemaless built-ins and the core type library denote the same contracts, so annotations added on day one mean the same thing under the schema bound on day ninety.

### 1.5 One model, many encodings

The type system stands above any particular wire form. Inside the specification this shows up as a discipline: a token's quoting is lexical necessity, never meaning (`!number 10.2` and `!number "10.2"` are the same value); a set is a schema property carried in array syntax, because "unordered" is an instruction to the reader, not a property of linear data; whether a `!variant` tag may be omitted rests on a disjointness fact the resolver derives independently of any encoding, with each encoding stating its own discrimination rule over it.

Part 2's §7 — the Text Encoding Rules — is the first instance of the pattern: how the type system's values are carried in TSON text. Other encodings state their own rules against the same model. A JSON encoding must decide what a tuple, a typed map key, or the absent sentinel become in a poorer notation; those decisions are parameters, and because schemas are data, the parameters themselves can travel as schema-governed documents beside the schemas they configure. The type system decides *what the value is*; an encoding decides *how it is spelled*.

### 1.6 Reading the series

The series is two documents and six artifacts:

- **[TSON-DATA] — Part 1: Text Data Format** — stands alone: the lexer (frozen, shared by the whole series), the data grammar, base type resolution, and the built-in type vocabulary. If you are writing a parser, an editor mode, or a formatter, it is the whole job — start here and stay here until it passes the data-format test suite. A Class 1 processor needs nothing from Part 2 and remains a complete, useful tool: a better JSON, with types.
- **[TSON-SCHEMA] — Part 2: Type System and Schema** — the centre of the series: a second body grammar over the same lexer, the type system, the schema chain, and resolver output. If you are writing a validator or resolver, this is your contract. Read §3 (the schema chain) first — it is the picture above, made normative — then §4–§5 for the type system and its grammar, §8 for what resolution produces, and §7 for how typed values are carried in text.
- The **companion artifacts** — `meta-kernel.tn`, `meta.tn`, `core.tn` and their resolved fixtures — are the normative vocabulary and the reference answers: the system describing itself. Implementations pre-load the kernel and meta as in-memory structures; the documents are *descriptions* of those structures, and round-tripping them is the first serious integration test. Reading the kernel after Part 2 §4 is the fastest way to make the type system concrete.

A useful reading order for implementers: Part 1 §7 (the lexer and grammars), Part 1 §2–§4 (documents and base resolution), Part 2 §3 (the schema chain), Part 2 §5 (the type-definition grammar), Part 2 §8 (resolver output), then the fixtures. This guide carries what the specifications exclude on principle — rationale, design history, worked examples, deployment guidance — and nothing in it is normative.


## 2. Design Rationale

TSON's schema model was derived rather than assembled from precedent. The proto-schema research series (tson.io/research/proto-schema/) starts from the physical constraints of serialized data — linear, immutable, finite, divisible — and derives what a schema can be: Sequence and Choice as the structural primitives; Tuple, Record, Array, Map, and Set as the configurations of Sequence worth naming; templates as definitions with blanks on a spectrum of completeness; composition with narrowing rules that preserve substitutability; required-by-default multiplicity with absence as a sentinel rather than a type. The kernel is that conclusion made executable.

This section carries the *standing* rationale for the decisions the specifications state without argument — why each rule is what it is today. It is deliberately not a decision archive: superseded designs, the paths not taken, and what changed between revisions live in each revision's change log, not here.

### 2.1 No comments

TSON has no comment syntax. This is not an oversight inherited from JSON but a decision made deliberately: comments are metadata, and TSON already has a metadata channel with defined semantics — annotations. A comment is invisible to the data model, gets lost on round-trip unless implementations invent preservation rules, and inevitably becomes a side-channel for machine-readable content (as happened with JSON parsers that accept `//` and the ecosystem of magic comments in YAML). `@doc:"..."` does everything a comment does, survives round-trips by rule, is attached to a specific value rather than a lexical position, and is typed and validatable when a schema is in scope. The cost — you cannot annotate *nothing*, or comment out a region — is accepted: TSON documents are interchange artifacts, not source code.

### 2.2 No anchors, references, or merge operators

The locality principle ([TSON-DATA] §1.2 principle 6) says a value is fully local: what appears at a position is the complete value. YAML's anchors and merge keys are the counter-model, and their costs are well documented — reference cycles (the "billion laughs" family), non-local reasoning (you cannot review a value without scrolling to its anchor), and merge semantics that differ across implementations. TSON's position is that reuse belongs to the producing application, not the wire format. Where genuine cross-document reference is needed, it is explicit and typed: a `!uri` value plus an application-level dereference policy, or the schema layer's `extern`.

### 2.3 Why `!` takes constructors only

In the type-definition grammar, `!` targets constructors exclusively, and `^` is the refinement operator — `T ^ { ... }` for record types, `~T ^ { ... }` at the meta rung, `!I ^ { values }` for atom instances. The division exists so that a reader never needs the resolver's lookup order to know what a declaration does: the prefix names the rung, `^` names the operation, and IS-A creation is visible at the head of the line. It also preserves one invariant across every grammar in the series — `!T x` describes a value shaped by `T`, in schema source, in data documents, and in resolver output alike — because the alternative (letting `!` also target instances for narrowing) gives one surface string opposite meanings in the schema and data grammars. Bare juxtaposition is excluded on the same grounds: `name {` is a parse error whose diagnostic suggests `^` or `&`, so the difference between preserved and absent IS-A is two explicit operators, never one easily-missed ampersand.

### 2.4 Subtraction breaks IS-A on purpose, at the head

Subtraction (`account - { password }` — a removal clause on a construction head) is the operation type systems usually refuse to provide, because removing a field from a subtype violates substitutability. TSON provides it *and* makes it break IS-A, which dissolves the objection: `account_public` is not claiming to be usable where `account` is expected — the resolver records an empty `type_definition.supertypes` precisely so no consumer can treat it as one. What survives is authorial lineage: the body's `record.supertypes` still says "this was derived from `account`", which is documentation, not contract. The two-supertypes split (contract vs lineage) resolves a real tension — readers want to know both *what a type promises* and *where it came from*, and conflating the two is how most schema languages end up with either no subtraction or unsound subtyping. The practical use cases — view types, redaction shapes, public projections of internal records — are common enough that forcing authors to re-declare near-duplicate records would be the worse outcome.

The clause sits at the head, not in the body, so the contract break is visible on the declaration line: an `&` head promises IS-A per parent, and nothing three lines down may silently revoke it. Taxonomically subtraction is composition's sibling — a construction that computes a field set and disclaims the contract — so it declares itself where constructions do, `^` heads reject it outright (an operator that promises IS-A cannot host the operation that revokes it), and empty subtraction is ungrammatical rather than merely prohibited. The clause also keeps removal a full grammar position away from its semantic opposite, `field: type? = _` (keep the field, forbid its value, preserve the contract).

### 2.5 Why elided modifiers are safer than they look

In a refinement body, `field: = value` (no type-ref) inherits the field's type and changes only its state. Allowing this looks like a convenience with a trap — what if the author typos the field name? — but the grammar closes the trap: a modifier-only entry names no type, so it *cannot* declare a new field, and an unmatched name is a resolver error rather than a silent addition. Compare the alternative, requiring the type to be restated: now a refinement that tightens `spec: uri` to a fixed value must repeat `uri`, and if the source declaration later changes the field's type, every downstream refinement silently pins the *old* type or errors at a distance. Elision makes the common tightening robust against upstream type changes; restating the type is reserved for the case where the tightening genuinely narrows the type, which is exactly when the author should be explicit.

### 2.6 Field groups, and the labelled sum they make derivable

A lower bound that is inclusive *or* exclusive — one location, one occupant, discriminated by field name — is a labelled disjunction, which is a *shape*, and a schema language that cannot state its own recurring shapes in shape is under-serving its meta layer. Field groups ([TSON-SCHEMA] §5.11) make the illegal state (`{ min: 0 exclusive_min: 0 }`) unrepresentable, and they sort coherence rules into a clean taxonomy: exclusion among fields is a group; co-presence dependency is a factored sub-record (`integer_size` pairs `bits` with `signed` structurally); value-level relations (`min ≤ max`) remain schema-load checks, because no shape can capture a relation between values. In resolver output, groups flatten — members become ordinary OPTIONAL fields with the grouping recorded beside them in `record.groups` — following the general storage rule: canonical output stores derived data only when derivation is non-local (`subtypes` earns its storage; group membership, locally derivable, compiles into a per-record table at load).

Groups are also why TSON ships only one sum primitive. `choice` is the *unlabelled* form — distinct variant types, discriminated by the `!variant` tag or by discrimination class where the variants are provably disjoint ([TSON-SCHEMA] §5.4). The labelled form needs no primitive because groups derive it: a record whose entire body is one REQUIRED group admits exactly one field, and `timestamps => { ( created: timestamp | modified: timestamp | accessed: timestamp ) }` *is* the labelled sum — named, referenceable, discriminated by label, encoding as the single-field record `{ modified: … }`. The untagged-untyped corner — JSON Schema's `anyOf`, discrimination by trying every variant against the structure — is deliberately unoccupied. Two residues: the labelled-sum pattern resolves to kind PRODUCT, so lowering it to a native sealed variant is a code-generator recognition (one REQUIRED group, no other fields); and because records refine where `choice` cannot, the labelled sum acquires a subtyping story — a refinement can pin or forbid variants — that a primitive sum would not have had.

### 2.7 Templates, sugar, and synthetic entries

The container sugar is grammar over parameterless constructors: `[T; 1..100]`, `{K => V ; 1..}`, `[T?]`, `{K => V?}`, and their kin desugar to `!array` and `!map` binding records by a fixed table — the two containers carry the same `state` facet, so absence is opt-in for a map value exactly as for an array element — a type slot is an ordinary REQUIRED `type_ref`-typed field filled like any other required field, and the value-level residue is the family's own coherence rule (`min_items ≤ max_items` and its kin) — checked at schema load for literal bounds and again at materialisation for parameter-bound ones, since an open bound has no value to relate ([TSON-SCHEMA] §5.3, §8.2). Abstraction lives in **user templates** exclusively: parameters route into slots at application sites inside template bodies, never in a constructor's own declaration, and resolved output that governs data carries no template machinery at all — the closed-entry rule confines it to authoring tools by construction ([TSON-SCHEMA] §1.3, §5.10).

Every application materialises an entry. A sugar form at a use site lifts to a **synthetic entry** — closed for a concrete form, open (a held application) for a parameter-bearing one — and a fully-bound template application materialises an **instantiation entry**; a use site holds a bare reference to its entry, so a consumer walks names, never a second structural interpreter, and recursion has the entry it needs to tie the knot ([TSON-SCHEMA] §5.3, §8.2). Identity is structural throughout — closed synthetics by body, open ones up to parameter renaming, instantiations by their flattened `source` — so spelling variance never forks an entry and the two channels dedupe against each other's products; names are internal and carry no information (§8.1 below).

The theoretical basis is the **spectrum of completeness** developed in the proto-schema research series (Part 5, *Templates* — tson.io/research/proto-schema/part-5-templates/): data and schemas are one continuum distinguished by how many blanks remain, and a template is a definition awaiting completion. The design makes the spectrum mechanical, and Revision 34 made it uniform: an open definition's body is the constructor application **as written, held unread** until its parameters are substituted away — `<T, N> !array { element_type: T  min_items: N  max_items: N }` is stored as exactly that text, and closing it means replacing the parameter tokens and reading the result, once, against `array`'s vocabulary ([TSON-SCHEMA] §5.10). The alternative — quoting an open body slot by slot into a typed vocabulary with a labelled channel per slot kind — has to grow a spelling for every kind of slot a parameter can reach, and a collection slot has no natural one, which is how a design can end up unable to write `result => <T> ( T | error )`, the most ordinary generic of all. Holding needs no vocabulary and has no such boundary: a parameter in a value slot, a type slot, or a variant list is a token like any other, substitution is one walk at any depth, and the only cost is shadowing's usual one (a literal spelled like a live parameter is unreachable — rename the parameter). What the typed quotation bought — that body identity not depend on a spelling choice — holding gets by requirement instead: the open form has one spelling, however many phases produce it. The completeness coordinate is then simply *which tokens still name parameters*; nothing else changes shape as a definition closes. Two questions are answered *no* for v1, deliberately: parameters carry no bounds, and every reference binds fully — there is no type-family reading of a bare template name.


## 3. Lexical Design

### 3.1 The unquoted profile, derived

The unquoted-token profile is UAX #31's identifier profile plus exactly three characters — `-`, `+`, `.` — and the digit category `Nd`. Every addition is traceable to a production of the number grammar: `Nd` because scalar tokens, unlike identifiers, include numbers; `-` and `+` because they are the sign and exponent-sign characters; `.` because it is the decimal point and the leading character of `.inf`, `.infinity`, and `.nan`. Nothing is speculative, and all three extension characters are `Pattern_Syntax`, hence immutable across Unicode versions — the profile itself is frozen while its property-based components grow monotonically with new scripts. Their bare single-character forms, though, are not tokens: `-` alone is the subtraction operator, `..` is the range token, and bare `+` and `.` are lexer errors — as tokens they would be the accidental single-character strings `"-"`, `"+"`, `"."`. That the same extensions would otherwise let a schema declare `42` or `-` as a type name is the identifier profile's business, not the lexer's (§3.5).

The exclusions follow a single rule: a content kind the profile cannot cover *totally* is excluded *entirely*, so that its quoting rule is "always", never a per-character scan. Paths need `~`, `\`, and spaces; URIs need `:`; monetary amounts need currency symbols, grouping separators, and spaces; rationals and CIDR networks need `/`; percentages need `%`; ranges need `..`, which the lexer claims as the range token. Admitting any of these characters would let *some* paths or *some* URIs go unquoted — and a rule of the form "quote paths, except those without spaces, unless…" is precisely the cognitive load the profile exists to eliminate.

### 3.2 Quoting by kind

The payoff of the total-coverage rule is that quoting becomes a property of what a value *is*:

**Never quoted:** numbers, `null`/`true`/`false`, identifier- and enum-like names, `full-date` temporals (`2026-08-01`), UUIDs, hyphen-form MAC addresses, version strings.

**Always quoted:** anything containing whitespace or prose, times and datetimes (colons — a `full-date` is bare, but the moment a clock time joins it the colon ends the token), URIs with a scheme (colons), email addresses (`@`), paths, rationals and CIDR networks (`/`), IPv6 addresses (colons), monetary amounts and percentages, ranges (`..`), the single-character strings `-`/`+`/`.`, and leading-underscore names.

A generator needs only two clauses: quote if any character falls outside the profile, and quote if the bare token would resolve to something other than the intended string (`"true"`, `"42"`, `"0x71C7…"`). A human writing TSON internalises the kind-level rule after a few documents and never thinks about individual characters again.

ZWNJ and ZWJ deserve their footnote, because the series changed its mind about them. They are `XID_Continue` — UAX #31 made them default identifier characters when it withdrew the old "restricted contexts" requirement and moved the safety rule to UTS #39 — and the token profile admits them. Earlier revisions excluded them and told authors whose orthography needs them to quote, which got the risk exactly backwards: a Persian `کتاب‌ها` was unspellable bare, while a Latin `ad<ZWNJ>min` sailed through the quoted route the same sentence recommended. The joiners are invisible only where they do no shaping work, so the right rule is contextual, and it lives on the identifier layer (§3.5): UTS #39's joining-control contexts admit a joiner where the neighbouring letters give it a job and refuse it where they do not.

### 3.3 Canonical identity: restrict, don't normalize

Reference identity ([TSON-DATA] §2.2.1) stays at RFC 3986's cheapest comparison rung — simple string comparison — by *restricting the input* rather than normalizing it. An identifying URI must already be lowercase-host, port-free, userinfo-free, dot-segment-free, fragment-free, with no percent-encoding of unreserved characters; anything else is an error, not a candidate for cleanup.
RFC 3986 §6.1 supplies the risk asymmetry that motivates the conservatism: for a schema system, a **false positive** — two distinct documents judged identical — validates data against the wrong contract, silently; a **false negative** merely costs a redundant registration or fetch. Every rung of normalization ladder an implementation climbs (case folding, path resolution, percent-decoding, scheme-specific rules) buys convenience by increasing false-positive risk and by widening the room for two implementations to disagree about identity. TSON climbs one deliberate rung — the scheme is dropped, so `http`/`https` variance names the same document — because transport choice demonstrably should not fork a document's identity, and stops there. The host, by contrast, is load-bearing on purpose: a fetch-endpoint change cannot silently redirect a name.

### 3.4 Content addressing and the verification chain

The hash-parameter convention (`?sha256=…`, verification metadata rather than identity) composes into a Merkle-style dependency graph in the manner of content-addressed stores: a data document pins its schema, the schema pins its meta-schema and imports, and the chain grounds in the pre-loaded bootstrap. A consumer holding a single hashed reference can therefore verify a document *together with its entire contract chain* — every byte that determines how the document will be interpreted — without trusting any intermediary. The rule that the hash input is every byte after the `!!id` line exists to make this work: a document can carry its own name without the name's spelling perturbing its hash, so registrars and mirrors can relocate content while the identity-plus-hash pair stays verifiable.

**Mixed references combine per identity.** In practice, references to one schema will arrive in mixed spellings — one document pins, another does not — and the resolution model is built for that. Within a closure, verification attaches to the canonical identity, not to individual references (the closure already loads one instance per identity, so there is nothing else it *could* attach to): the digests declared across all references to an identity form a set, and an empty set resolves unverified, a single digest verifies the content once — at collection, before any reference resolves — and two distinct digests are a conflict reported as an error, never chosen between. A plain reference in a closure that also pins the identity therefore rides the pin: it resolves to the verified instance, and if verification fails, it fails too — leniency in what authors may write, never a fallback to unverified content. The practical consequence is that pinning is additive rather than viral: any one document in a closure can raise an identity's guarantee for the whole resolution, and no published plain reference can lower it. 

**The one edge that cannot be pinned.** The kernel's `!!meta` references its own URL, and that reference can never carry a hash: the hash input includes the `!!meta` line, so the pin would have to hash bytes containing itself. This is not a defect to route around but the place where the verification chain hands over to the bootstrap — the self-reference is grounded by pre-loading (§1.3), and the mixed-reference rule is what lets every *other* reference to the kernel be pinned while the kernel's own stays plain. The kernel's `!!id` line, being excluded from the hash input, *can* carry the kernel's published digest — a useful registration cross-check, verified at registration per [TSON-SCHEMA] §10.2 — but an embedded hash authenticates nothing by itself: an attacker who can rewrite the body can rewrite the id line to match. Trust always flows from the referencing side or from the pre-load; the embedded digest is a convenience for registrars, not a root.

**Publication discipline: pin everything pinnable.** The mixed-reference rule makes plain references legal everywhere; the published artifacts nonetheless ship maximally pinned, because the Merkle guarantee holds only along edges that are actually pinned — a consumer holding a pinned reference to core has verified meta *through* core only if core's own `!!meta` carries meta's digest. The artifact hashes are computed bottom-up, each stage's pins in place before the next stage hashes over them: the kernel's body first (its self-referencing `!!meta` plain, its `!!id` carrying the resulting digest), then meta with its kernel references pinned, then core with its meta reference pinned. Publishers of type libraries should follow the same discipline: pin `!!meta` and every `!!import` at publication, so that one hashed reference to the library verifies its entire chain.

The specifications stop at verification deliberately. Ordering, consensus, and mutability policy — everything a content-addressed *store* adds on top — are application concerns; TSON supplies the identity discipline they need and nothing more.

### 3.5 Names are not tokens

An unquoted token is a *spelling*; a name is a *thing spelled*. TSON's lexer cannot tell them apart — in `{ name: Alice }` both words are unquoted tokens, and the profile of §3.1 has to admit digits, signs and dots so that a *number* can be one — which is why, for many revisions, the series had no place to state a rule about names at all. The kernel typed every naming position with an atom that carried no contract, the grammar governed those positions with four different productions (one of which, field names, admitted quoted spellings and thereby every character the profile excluded), and the security section could only advise.

Revision 34 gives names their own layer ([TSON-DATA] §7.7). An **identifier** is the decoded text of a token — after unquoting, escaping and NFC — matched in full against a profile that is the token profile *minus* the number grammar's extensions: `XID_Start` to begin, `XID_Continue` plus `-` to continue. The subtraction is the whole design. A name never begins with a digit, a sign or a dot, which makes "numbers are not declarable names" a consequence rather than a rule; `+` goes because it only ever served exponents; `.` goes so that it can one day be a separator (`ns.type`) rather than two identifiers that happen to contain dots. And because the identifier profile sits strictly inside the token profile, every identifier is spellable bare — the annotation and type-annotation positions, which admit no quotes, lose nothing by it. Enum members join the names: they are how a member is *written*, so `!enum [1 2 3]` is refused (write a bounded integer), while the kernel's own `boolean => !enum [true false]` is untouched, because `true` is a perfectly good identifier and its base-type class is still read off the token by Part 1 §4.

The layer is placed on *declarations*, not on the data grammar, and that placement is what keeps JSON compatibility intact. A Class 1 field name stays lexical — `{ "first name": 1 }` is an ordinary record, because nothing at that layer knows which tokens are meant as names. Under a schema the data conforms by construction: no declared field can be named `first name`, so such a field matches nothing and is reported as the unrecognised field it always was. The one visible cost is the deliberate one: `_` is `XID_Continue` only, so `_id` is not an identifier, a declared field cannot bear that name, and the schemaless `{ "_id": 1 }` that JSON tooling produces is legal precisely because Class 1 names are lexical.

**Two layers, and why the line is where it is.** Above the identifier grammar sits a second layer ([TSON-DATA] §8.2): skeleton distinctness within each closed scope (no two names in one record, enum, schema, or import closure may share a UTS #39 skeleton), `Identifier_Status=Allowed`, and a script restriction level. All three are implemented by every conforming processor and enforced by default — and none of them decides validity. The reason is a property, not a preference: the identifier grammar rests on Unicode properties the Consortium has frozen, so a content-addressed schema returns one verdict under every implementation at every Unicode version, which is the promise a hash pin makes; the hygiene data (`confusables.txt`, `IdentifierStatus.txt`) is explicitly unstable between versions, so a verdict resting on it could change under a routine UCD refresh, and those same pinned bytes would flip from valid to invalid. Skeleton distinctness has a second disqualification: it is a relation over a set that spans `!!import`, so two independently published, independently pinned schemas — `list_item` in one, `Iist_item` in the other — can each be fine alone and collide when one imports the other, with the fix in a document the importing author does not control. As validity that makes the import impossible to write; as policy the operator relaxes it, in code, visibly, and proceeds. So a document failing the second layer is *refused by this processor*, reported apart from the four error categories and carrying the UTS #39 data version, and a deployment may relax any of the three — but only through the implementation's own configuration, never through the environment, and never silently.

**Why skeleton distinctness and not the restriction level for names.** The restriction level is free — `Script` is a property every platform exposes — and it is what browsers use for domain names. But a browser judges a name in isolation because it cannot enumerate what the name might be confused with; TSON always can, because every scope is closed and known at the moment the check runs. A per-name rule must guess from the name alone, and it guesses wrong on ordinary names: Highly Restrictive over a whole name refuses `id_пользователя`, `url_адрес` and `χ_index`, which are the *common* way a developer working outside Latin script names things — the Latin abbreviations of the trade inside a name in their own script. The skeleton check fires only on a colliding pair, so it costs such an author nothing while catching every homograph, including the whole-script `aec`/`аес` that no script rule can see. The restriction level still ships, defaulting to Highly Restrictive, because it catches the within-word mixing a skeleton check cannot until a second name arrives; the relaxation to reach for first is its *unit* — apply the level per `_`/`-` delimited segment, which keeps `аdmin` refused and admits `id_пользователя` — not its level. Values are the mirror image: they have no scope to be distinct within, so the per-string mechanism is the only one available, and its default is off, because data may legitimately be anything.


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

`meta.tn` is the worked example. Meta's own declarations use kernel types (`identifier`, `type_name`, `value`), so it needs the kernel import for itself. But the import does double duty: because every meta-governed schema resolves constructor roles against *meta's namespace, one hop* — and a namespace is the schema's whole import closure, since imports are transitive ([TSON-SCHEMA] §2.2.3) — the kernel import is also the delivery mechanism that places `enum`, `record`, `array`, the sugar-form desugar targets, and `type_definition` in front of every user schema and every resolver-output document. Delete the import and meta's own body still nearly works — but every schema chaining to meta loses the structural vocabulary, and resolver output can no longer name its own body types. The one-hop rule turns a meta-schema's import list into its published API surface, which is exactly the property you want reviewable.

### 4.4 Where annotations live, and why it feels asymmetric

Annotations resolve one hop against the governing target — the `!!meta` target for a schema document, the `!!schema` target for a data document. The asymmetry that surprises authors: an annotation type declared in a user schema is usable in that schema's *data documents* but not in the schema document itself, whose governing target is meta. This is the one-hop rule being consistent rather than an exception to it: the schema document is governed by meta, so its metadata vocabulary is meta's business; its data documents are governed by the schema, so their metadata vocabulary is the schema's business. Custom annotations for schema documents therefore require an extended meta-schema — a heavier act, deliberately, because schema-document metadata is tooling-facing and benefits from ecosystem-wide agreement.


## 5. A Tour of the Type Operations

The type system's operations form a spectrum of completeness — each operation takes a definition some distance further toward concrete data.

**Construction** (`!C { bindings }` in the schema grammar) creates a new type from a constructor. It is the origin point of every atom family and every structural type, and it transfers *kind*, never IS-A: `dogs => !integer_type {}` founds a fresh atom family with the same constraint vocabulary as `integer` and no relation to it. Construction creating siblings rather than subtypes is the load-bearing choice — it is what lets one constructor found unrelated nominal families (`integer` and `dogs` do not accidentally unify), and it is why the atom family's IS-A facts live in `supertypes` rather than being derivable from bodies.

**Refinement** (`T ^ { ... }` or `!I ^ { values }`) copies a definition and tightens it — binding values, fixing defaults, restricting ranges — while preserving IS-A with the source. Refinement never adds fields; the transition table in [TSON-SCHEMA] §5.7 is monotone toward FIXED, and FIXED is terminal. A chain of refinements is a chain of promises, each stronger than the last, and any consumer expecting the source type can accept the refined one.

**Composition** (`A & B & { ... }`) is construction with declared ancestry: new fields are permitted, each listed supertype contributes IS-A, and the disjointness rule (no field name from two supertype paths) keeps the merge order-independent and diamond-free. The IS-A is cashed out at the data level by subsumption ([TSON-SCHEMA] §7.2): `!employee` is valid at a `person`-typed field, and validates in full as an employee — closure, constraints, and defaults are the subtype's — while an unannotated value at that field is exactly a `person`, so the annotation is the sole carrier of the more specific type. That is the point of composition in an application schema: a field typed by a parent admits the whole family the schema declares beneath it, each member naming itself on the wire when it appears. Subtraction stays outside the family by construction — the check reads `type_definition.supertypes`, the contract, never the body's lineage (§2.4) — and choice discrimination is the same surface gesture under a different membership relation: an annotation selecting a more specific type than the position promises, variant-of for choices, IS-A here.

**Subtraction** (`head - { fields }`) removes fields and breaks IS-A — see §2.4 above for why this is a feature and why the clause sits at the head.

**Instantiation** is the data-level end of the spectrum: `!T value` in a data document produces a concrete value, terminal by definition. There is no construction in data; the same surface shape (`!C { bindings }`) in a data document is a record that *describes* constraints — which is precisely what resolver output stores.

The one-way flow — construct, refine, instantiate, stop — is what makes the resolver's job tractable: every definition has a finite derivation ending at a constructor, every body desugars to one canonical form, and the data level never feeds back into the type level.


## 6. Atoms in Depth

### 6.1 The three unit atoms

**`value`** is the escape hatch: it admits whatever base type resolution produces (null, boolean, integer, float, string), which makes it the type of "a scalar the schema language cannot or will not constrain". Its principal legitimate uses are the kernel's own bootstrap (constraint fields whose natural type does not exist yet at kernel-load time — see §6.2) and genuinely dynamic data. Reaching for `value` in an application schema is usually a design smell; reaching for it in a meta-schema is sometimes forced.

**`identifier`** is the name primitive: the decoded text of a token matching the identifier grammar ([TSON-DATA] §7.7), NFC, equal iff byte-identical. It shares its host representation with `text` but not its contract — an identifier can always be rendered back as an unquoted lexeme, which is why the kernel uses it for `type_name`, `field_name`, `param_name`, and (through `enum_set`) enum members, and why a rule stated on it reaches every name in the series (§3.5). The NFC requirement does no work at parse time for unquoted lexemes (the lexer already rejects non-NFC source) and normalises quoted lexemes at naming positions, so "same name" can never depend on Unicode composition happenstance.

**`void`** is the unit type of absence: one inhabitant, the absent sentinel `_`. Its two jobs are being the target type of bare annotations (`@deprecated` is sugar for `@deprecated:_` — presence is the information) and expressing "no value" as a field type. It is deliberately not a valid choice variant: optionality is a property of a position, not a type, so "optional T" is spelled with `?`, never `(T | void)` ([TSON-SCHEMA] §5.4). The `null`-at-`void` concession (the token `null` accepted as an equivalent spelling and normalised to `_`) exists for JSON-shaped data under a schema; it is safe precisely because `void` has a single inhabitant, so no absence-vs-value distinction can be lost there — and it is confined to `void` so the distinction stays sharp everywhere else.

### 6.2 Constraint fields typed as `value`

`decimal_type.min` cannot be typed `number`, because `number` is a *core* instance of `decimal_type` — the constraint field exists before the type that would naturally fill it. This bootstrap ordering is why several atom constructors type their bounds as `value?`. The kernel's `integer_type` is the exception that proves the rule: its bounds are typed `integer` because `integer` lives in the kernel's own namespace.

The consequence for implementers is the eager-conversion rule: each constrained atom converts `value`-typed constraint values to its internal representation at schema-load time, never per-validation. The rule sounds like an optimisation but is really a correctness property — a schema either loads cleanly or fails with a clear diagnostic, and there is no such thing as a half-valid schema that parses but mis-validates on the millionth record. Which host types an implementation accepts for conversion (may an integer token bound a decimal field?) is an implementation choice; the validation semantics *after* conversion are the atom's contract, so two implementations that both load a schema agree on what it validates.

### 6.3 Exact and approximate numeric tiers

The numeric vocabulary is split into an exact tier (`number`, `rational`, the fixed-width integers) and an approximate tier (`float32`, `float64`), and the split is annotated in the type library with `@exact`. The design intent: a bare JSON-ish number carries no width or precision commitment, so it maps to `number` — preserved as written — and lossiness enters only when a consumer *chooses* an approximate type, at which point rounding onto the IEEE 754 grid is that type's documented contract rather than a surprise. The special values (`.inf`, `.nan`, signed zeros) belong to the approximate tier only, and NaN payloads are deliberately not information: every NaN denotes the canonical quiet NaN, so value preservation holds by definition and payload-dependent round-trip bugs are excluded by fiat.


## 7. A Complete Worked Example

The task-tracking schema from [TSON-SCHEMA] §1.6, taken all the way through resolution. The schema document:

```
!!id:"https://example.com/task.tn"
!!meta:"https://tson.io/2026/34/m/meta.tn"
!!import:"https://tson.io/2026/34/m/core.tn"
@doc:"Task-tracking example schema."
{
  priority => !integer ^ { min: 1  max: 5 }
  status   => !enum [OPEN ACTIVE DONE]
  flagged  => <T, N> { entry: T  priority: priority ~ N }
  task => {
    id:       uuid
    title:    non_empty_text
    priority: priority ~ 3
    status:   status ~ OPEN
    due:      date?
    tags:     [text]?
    history:  [flagged<status, 2>]?
  }
}
```

`priority` refines core's `integer` instance; `status` applies the `enum` constructor, reached through the structure namespace supplied by the `!!meta` target; `task` is a fresh record whose field types resolve through the type-name namespace — `uuid`, `non_empty_text`, and `date` from the core import, `priority` and `status` from the local declarations. The `~` modifiers place `priority` and `status` in the REQUIRED_DEFAULT state; `[text]?` is an OPTIONAL field whose array sugar lifts to a synthetic entry, referenced by name from the field ([TSON-SCHEMA] §5.3, §8.2). `flagged` is a template with a type parameter and a value parameter — a fresh record whose `priority` field is defaulted by parameter (`~ N`), built entirely from the schema's own names — and `[flagged<status, 2>]?` wraps its fully-bound application in the array sugar ([TSON-SCHEMA] §5.10).

A data document binds the schema and instantiates:

```
!!schema:"https://example.com/task.tn"
!task {
  id:       550e8400-e29b-41d4-a716-446655440000
  title:    "Ship revision 34"
  priority: 3
  status:   OPEN
  due:      2026-08-01
  tags:     [spec editorial]
  history:  [{ entry: OPEN }  { entry: ACTIVE  priority: 4 }]
}
```

Note that `priority` and `status` restate their default values: a document that states its defaults reads without its schema, and omitting a defaulted field is an encoder optimisation — lossless only because the decoder injects the value back on read.

Resolution derives a schema value, serialized as resolver output — a data document governed by the meta-schema, in which every declaration has desugared to the canonical `!C { bindings }` form and fields at their default values are omitted (`constructor: false`, `state: REQUIRED`):

```
!!schema:"https://tson.io/2026/34/m/meta.tn"
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
  flagged => <T, N> !record { fields: [
    !record_field { name: entry     type: T }
    !record_field { name: priority  type: priority  state: REQUIRED_DEFAULT  value: N }
  ] }
  task => !type_definition {
    kind: PRODUCT
    body: !record { fields: [
      !record_field { name: id        type: uuid }
      !record_field { name: title     type: non_empty_text }
      !record_field { name: priority  type: priority  state: REQUIRED_DEFAULT  value: 3 }
      !record_field { name: status    type: status    state: REQUIRED_DEFAULT  value: OPEN }
      !record_field { name: due       type: date      state: OPTIONAL }
      !record_field { name: tags      type: array_text_xxhash  state: OPTIONAL }
      !record_field { name: history   type: array_flagged_status_xxhash  state: OPTIONAL }
    ] }
  }
  flagged_status_4c1 => !type_definition {
    kind: PRODUCT
    source: { name: flagged  arguments: [ { name: status }  { value: 2 } ] }
    body: !record { fields: [
      !record_field { name: entry     type: status }
      !record_field { name: priority  type: priority  state: REQUIRED_DEFAULT  value: 2 }
    ] }
  }
  @synthetic array_text_xxhash => !type_definition {
    kind: PRODUCT
    source: array
    body: !array { element_type: text }
  }
  @synthetic array_flagged_status_xxhash => !type_definition {
    kind: PRODUCT
    source: array
    body: !array { element_type: flagged_status_4c1 }
  }
}
```

(The trailing `xxhash` in the synthetic names stands for a content hash of the resolved binding record — a placeholder, since name spelling is the resolver's own business and only the shape is a conformance point; `flagged_status_4c1` is likewise this resolver's choice.)

Reading the output:

- `priority` shows **refinement**: the surface form `!integer ^ { ... }` retargeted to the instance's source constructor (`source: integer_type`), with IS-A recorded against the refined instance (`supertypes: [integer]`). This is the case where `supertypes` carries information the body cannot: compare a hypothetical sibling `port => !integer_type { min: 0  max: 65535 }`, which would serialize with the *same* `source` and an identical body shape but empty `supertypes`.
- `status` shows **construction**: the `enum` constructor's ATOM kind is inherited, `source: enum` is recorded, and `supertypes` stays empty — construction transfers kind, not IS-A. The positional sugar `!enum [OPEN ACTIVE DONE]` has desugared to the explicit binding `{ members: [...] }`.
- `task` shows the **field-state machinery**: each `record_field` carries its state (the default REQUIRED omitted) and the eagerly-resolved default values, so consumers read defaults from the output without re-parsing modifier tokens.
- `tags` shows a **synthetic entry**: the sugar `[text]` lifts to `array_text_xxhash` — a closed entry sourcing the constructor it builds (`source: array`), marked `@synthetic` at its key so tooling can fold it back into nested display — and the field holds a bare reference to it. Any other `[text]` anywhere in the schema lands on the same entry: identity is structural equality of the resolved body, one entry per distinct concrete form ([TSON-SCHEMA] §8.2).
- `flagged` and `flagged_status_4c1` show the **template machinery** end to end. The open template is not a `type_definition` value at all: its resolved form is its declaration — the held application `<T, N> !record { … }`, unread until its parameters go — in which `T` and `N` are ordinary tokens standing where a type and a value will stand, the default `~ N` sitting in the plain `value` slot at REQUIRED_DEFAULT ([TSON-SCHEMA] §5.7, §5.10). The instantiation is the closed form: substitution swaps `type: T` for `type: status` and `value: N` for `value: 2`, the body is then read against `record`'s vocabulary, and the fully-bound application recorded in `source` makes the entry self-describing — its body is recomputable by substitution; identity is structural equality of `source`, so another implementation may name the same entry differently and still agree. `history`'s field then references a second synthetic — the array *around* the instantiation — showing the two families composing: the instantiation carries no `@synthetic` marker (its application-shaped `source` already distinguishes it), the synthetic does. For an instance-form template closing over a constructor with value slots, see [TSON-SCHEMA] §8.2's `vector` example.


## 8. Resolver Output for Consumers

### 8.1 Internal entries: identity is structural, names are internal

Resolver output contains internally named entries beyond the declared ones, and a consumer should hold two facts about them. First, **every application materialises**: a sugar form at a use site lifts to a *synthetic entry* — closed for a concrete form, open (a held application) for a parameter-bearing one inside a template — and a fully-bound application of a non-constructor template materialises an *instantiation entry* ([TSON-SCHEMA] §5.3, §8.2). A use site always holds a bare name, so a consumer walking a resolved schema needs exactly one interpreter — follow references, read bodies against constructor vocabularies one hop at a time — and never a second, in-place structural one. The rule also gives recursion the entry it needs: `tree<text>`'s fully expanded form is infinite (its children's element type is itself), and a tree-shaped document cannot express that cycle without a name; the entry is the knot.

Second, **the names carry no information**. Identity is structural per family: instantiation entries compare by the flattened, fully-bound application recorded in `source`; closed synthetics by the resolved binding record, one entry per distinct concrete form schema-wide; open synthetics by body structure up to parameter renaming. Spelling variance therefore never forks an entry — `[id]` and `[uuid]` land together once the alias flattens, `vector<pixel, 255>` and `vector<pixel, 0xFF>` are one application because a literal argument is compared as the value it denotes even though it is recorded as written (base type stays a boundary: `1` and `1.0` are two arguments), and the same form written directly or arising inside a materialised template lands on one entry, because the resolver re-derives every synthetic's identity from its *resolved* record after names have meaning — while two conforming resolvers may disagree on every internal name and still agree structurally, which is the sense in which resolved output is compared across implementations: equality up to renaming of internal entries. Names should nonetheless be content-derived (a readable head plus a structural hash — the `_xxhash` convention in the shipped fixtures, where the hash spelling is a placeholder precisely because it is not a conformance point): content-derived names keep re-resolution output diff-stable and make independently resolved namespaces agree wherever their structures agree, which is what lets internal entries merge cleanly under the transitive import ([TSON-SCHEMA] §2.2.3, §8.2).

Telling the families apart needs no name either: a synthetic entry's `source` is a bare constructor and its schema-map key carries the derived `@synthetic` marker (discarded and recomputed on ingest, like `@alias`), while an instantiation's `source` is the application itself. The marker exists for display — a tool can fold synthetics back into the nested spelling the author wrote — and never for decoding. The one discipline this asks of tooling: never surface an internal name as the primary form in a diagnostic; the source form is recoverable from the entry's `source`, the originating position, and `@alias`, and it is what the user wrote.

### 8.2 The two supertypes fields, once more

Consumers should internalise the split: `type_definition.supertypes` is the **contract** (transitive IS-A — use it for "can a value of X go where Y is expected"); the body's `record.supertypes` is the **lineage** (direct `&` compositions as written — use it to reconstruct or display source-level structure). Subtraction is the case that forces the distinction (lineage without contract), and the atom family is the case that makes `type_definition.supertypes` primary data rather than a cache (refinement vs sibling construction serialize identically except for this field). `subtypes`, by contrast, is always a recomputable cache and never trusted on ingest.

### 8.3 Error messages

The specification's error categories are minimal by design; implementations compete on diagnostics. Some conventions that have worked well: report *parse* failures ("`twelve` is not an integer") separately from *validation* failures ("300 exceeds age's max of 150") since users fix them differently; never surface internal entry names as the primary form (show the source form, recovered from the entry's `source`, the originating position, and `@alias` — the user wrote `[text; 1..]`; show them `[text; 1..]`); on unresolved-type errors under a schema, say *which namespace was searched* — "no `uuid` in schema X (did you mean to import core?)" turns the most common beginner error into a one-line fix; locate a template's deferred failure at the declaration that *wrote the offending name* (the template for a bad type inside its body, the applier for a bad argument), not at whichever entry happened to be materialising ([TSON-SCHEMA] §5.10); and keep a name-hygiene refusal visibly apart from a validity error, with the UTS #39 data version in it — the two are different claims, and a user who sees them as one will file the wrong bug (§3.5).


## 9. Deployment and Encoding Guidance

### 9.1 Versioning: publish, don't mutate

Most schema systems version by *mutating a shared definition* and policing the mutation with compatibility rules. TSON versions by *publishing*: a schema's identity is its exact byte content, so version N and version N+1 are independent, immutable artifacts with different hashes and different identities ([TSON-SCHEMA] §3.5). Nothing evolves in place. A data document locks to the one contract it was written against — the hash-pinned `!!schema` on its opening lines — and that binding never drifts, because neither side can change.

Acceptance then becomes explicit, and it lives where it belongs: at the boundary. A server's code binds to the *set* of schema versions it accepts, registering each in its schema library, and every request is validated against exactly the contract the request names. Because the version key sits in the header, dispatch is cheap: document kind and schema identity are readable from the opening bytes, before any value parsing ([TSON-DATA] §2.2, §7.1).

For major upgrades there is a stronger pattern than binding one server to every version: run version-specific servers and **route on the schema reference**. A front door reads `!!schema`, matches canonical identity and hash, and dispatches; each server behind it holds exactly one contract at full strength, and retiring a version is deleting a route. This is the architecture the industry converged on from the other direction — Stripe's date-versioned API with server-side translation between pinned versions is the best-documented example ([Stripe, *APIs as infinite versions*](https://stripe.com/blog/api-versioning)) — but there the version key is a bespoke HTTP header; here it is a first-class, verifiable property of the document itself.

What this retires is the compatibility rulebook — the folklore every mutable-schema system accumulated because one definition had to serve every point in time:

- **Protocol Buffers.** `required` is marked *"Do not use"* in the [proto2 language guide](https://protobuf.dev/programming-guides/proto2/), the maxim being "required is forever"; Buf documents it as the root cause of early Google outages ([Tip of the Week #8: never use required](https://buf.build/blog/totw-8-never-use-required)). The [*Updating A Message Type*](https://protobuf.dev/programming-guides/proto2/#updating) rules add the rest of the liturgy: never change a field number, never reuse one, mark removals `reserved`, add only optional or repeated fields. Proto3 went further — deleted `required` outright and made every field optional with zero-value defaults — then spent years restoring the [field presence](https://protobuf.dev/programming-guides/field_presence/) that deletion had cost.
- **Avro.** Reader and writer schemas are reconciled pairwise under the specification's [Schema Resolution](https://avro.apache.org/docs/current/specification/) rules — new fields must carry defaults, renames need aliases — and an entire product category, the schema registry, exists to police mutation with [BACKWARD / FORWARD / FULL and transitive compatibility modes](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html).
- **GraphQL.** The official best practice is a versionless API under ["continuous evolution"](https://graphql.org/learn/best-practices/#versioning): never remove, only `@deprecated`.
- **Beneath them all,** Postel's robustness principle — *"be liberal in what you accept"* (RFC 761) — which the IAB has since formally walked back as a long-term hazard to protocol health (RFC 9413, *Maintaining Robust Protocols*).

Every rule on that list is the same trade: weaken the contract so the timeline stays compatible. Fields end up optional forever, unknown fields must be tolerated, removal is forbidden — and the guarantees the schema no longer makes migrate into application code as defensive checks, validation pushed from a place where it is declared once to a place where it must be reimplemented everywhere. (Part 8 of the proto-schema research traces this history in detail.)

TSON's model dissolves the dilemma rather than picking a side. Records are closed under their type ([TSON-SCHEMA] §7.2) and required means required — *per version*. A field can be required in version 12 and gone in version 13, because 12 and 13 are different artifacts and no rule forces one definition to satisfy both. Compatibility between two versions becomes something tooling can **check** — resolver output is data, so two versions diff structurally — and a policy a team may **choose** at a given boundary, never a constraint the schema language imposes on every author to keep a mutable timeline coherent.

### 9.2 Schema libraries in practice

The library model (lookup, never fetch-by-default) maps onto deployments straightforwardly: production systems register every schema at startup — from files, embedded resources, or an internal registry — and disable runtime fetching entirely; development setups may enable fetching with an allowlist and treat it as a cache-population convenience. Registering under an application-supplied identity (for `!!id`-less development schemas) is handy in tests but should never survive into interchange: publish with `!!id`, pin with hashes at trust boundaries.

**Chain-wide strictness is a resolver policy.** The mixed-reference rule (§3.4) deliberately leaves "every identity in my closure is verified" out of the format; deployments that want it enforce it at the boundary. Two mechanisms cover the need: a *require-pinned* resolver mode, which fails resolution when any identity's digest set is empty (pre-loaded entries excepted, or checked as below); and a resolution report listing which identities resolved unpinned, for audits that prefer visibility to refusal. Together they give a deployment "my entire chain is verified" as a choice made where trust boundaries are actually known — per deployment — rather than a constraint the format imposes on every author in every closure.

**Ship digests with pre-loaded schemas.** A pinned reference to a pre-loaded identity (`!!meta:"…meta.tn?sha256=…"`) must be checkable, but the pre-loaded model is an in-memory structure, not bytes. Implementations should therefore ship, alongside each pre-loaded schema, its published canonical digest (or the canonical document bytes), and compare declared pins against it — a mismatch is the ordinary verification error, not an unverifiable assertion. Without this, pins to the meta layer degrade into decoration exactly where the chain is supposed to ground.

### 9.3 Defaults on the wire

Encoders should write values for defaulted fields. A document that states its defaults reads without its schema — `priority: 3` means 3 to every reader, schema in hand or not — whereas omission makes the document's meaning schema-relative. Omitting fields at their default values is a legitimate wire-size optimisation precisely because the decoder injects the value back on read, but it should be an explicit encoder option, not the default posture. Resolver output is the sanctioned exception: it omits fields at defaults because its consumers are, by definition, schema-aware, and the compression materially improves fixture readability.

### 9.4 Directive-per-line

Scoped `!!schema` directives on array elements read best one element per line, directive first — the layout in [TSON-SCHEMA] §7.8's example. The grammar does not require it, but the convention keeps the scope-opening directive visually attached to the single element it governs, which matters in review: scope changes are the highest-consequence lines in a document.


## References

| Reference | Title |
|-----------|-------|
| TSON-DATA | TSON Part 1: Text Data Format |
| TSON-SCHEMA | TSON Part 2: Type System and Schema |
| RFC 3986 | Uniform Resource Identifier (URI): Generic Syntax |
| UAX #31 | Unicode Identifiers and Syntax |
| UTS #39 | Unicode Security Mechanisms |
| UTS #55 | Unicode Source Code Handling |
| RFC 8259 | The JavaScript Object Notation (JSON) Data Interchange Format |
| RFC 761 | DoD Standard Transmission Control Protocol (origin of the robustness principle) |
| RFC 9413 | Maintaining Robust Protocols |
