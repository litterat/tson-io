# Mapping ASN.1 (X.680–X.683 abstract syntax) → TSON Schema

> **Status:** Non-normative report · Prepared against TSON 2026 Revision 32 (Working Draft) · Input to the Revision 33 development cycle.
> References to "planned additions" describe design directions under consideration for future revisions, not committed specification. Produced with AI assistance (Anthropic Claude) in collaboration with the TSON author; citations of external standards should be verified against primary sources before normative use. Schema source files are cited with the `.tn` extension per the current draft-period convention (`.tn1` is reserved for the finalized version 1 release).


## Scope and framing

Same framing as the prior reports: **one-directional, strictness-first, no round-trip requirement.** Per the decision to defer encodings, this covers the *abstract syntax* only — X.680 (types, constraints, extensibility), X.681 (information object classes), X.682 (table constraints), X.683 (parameterization). BER/DER/PER/OER/XER/JER are out of scope, with two footnotes: tags are preserved as annotations (they're the ASN.1 analogue of protobuf field numbers), and JER (X.697, the JSON encoding rules) is the natural eventual validation target, playing the role protojson played in the protobuf report.

One observation before the tables, because it frames everything: **ASN.1 is the most TSON-like of the three IDLs examined — in architecture, not just in type inventory.** Its founding design decision (1984!) is the separation of abstract syntax from transfer syntax: one type system, many encoding rules, each specified independently against the same model. That is exactly TSON's part 1 / part 2 / part 3 structure. The consequence is that ASN.1's constructs are already encoding-independent, so almost nothing in this mapping is contaminated by wire concerns — the opposite of protobuf, where wire pragmatics leak upward (three int32 spellings), and of JSON Schema, where the instance model *is* the wire format. The mapping difficulties that do exist are in ASN.1's late-1980s/90s power features: extensibility markers, constraint algebra, and the information object system.

## TL;DR

- The **core inventory maps exceptionally well**: ASN.1 `INTEGER` is arbitrary-precision (exact match to TSON `integer` — the first source language examined where this is true), `NULL` is a first-class single-value type (the third independent corroboration of the planned null atom), `SEQUENCE` is a closed record, `CHOICE` is a *label-discriminated, exactly-one* sum — TSON's **REQUIRED field group**, member for member, completing the pattern started by protobuf's oneof (which was the at-most-one OPTIONAL group).
- **ASN.1 subtype constraints are TSON refinements**, nearly term-for-term: value ranges → `min`/`max`, `SIZE` → length/size facets, permitted alphabets and `PATTERN` → pattern refinement (with an XSD-lineage regex dialect that is *friendlier* to I-Regexp than either ECMA-262 or RE2), and `WITH COMPONENTS` inner subtyping → record refinement `^ { … }`. The constraint EXCEPT operator is negation and is declined, consistent with prior verdicts.
- **X.681/X.682 information object classes with table constraints are ASN.1's discriminator** — a value in one component (typically an OID or integer) selecting the type of an open-type component via an object set. This is precisely the envelope pattern + discriminator token designed in the JSON Schema work, and object sets give the deferred `sealed` feature its most concrete consumer yet: a closed object set *is* a permits list; an extensible one (`{...}`) is the open case.
- **X.683 parameterized types map to TSON templates** — the first source language with real generics, exercising a TSON capability JSON Schema and protobuf left idle. Monomorphization handles it by construction.
- The systematic tension is **extensibility markers (`...`)** — ASN.1's forward-compatibility machinery — versus TSON closure. Same resolution as proto3 open enums: convert closed (stricter), flag every extension marker in the report as a forward-compatibility divergence.

## A. Type-by-type mapping

**Legend:** ✅ clean · ⬆ strengthens · ◑ transform/decision · ✗ drop-with-report · Ⓐ annotation-only.

### Basic types

| ASN.1 | TSON | |
|---|---|---|
| `BOOLEAN` | `boolean` | ✅ |
| `INTEGER` | `integer` | ✅ **exact** — both unbounded, arbitrary precision. Named numbers (`status INTEGER { idle(0), busy(1) }`) → the type stays `integer`; names are Ⓐ (they are labels, not an enumeration — the type admits all integers) |
| `INTEGER (0..255)` etc. | `integer ^ { min: 0, max: 255 }` | ✅ constraints → refinements, §B |
| `ENUMERATED` | `!enum [...]` of identifiers | ◑ numbers Ⓐ; extensibility marker → §C |
| `REAL` | `float64` or `number` | ◑ ASN.1 REAL admits base-2 and base-10 values plus special values; a policy decision (mirror of the protojson float-specials item) — recommend `number` for base-10-constrained REALs, `float64` otherwise, flag per type |
| `NULL` | planned `null` atom | ✅ third corroboration — ASN.1 treats the null value as a real type with one value, exactly the planned construct |
| `BIT STRING` | binary type + `SIZE` → length facet | ◑ named bits (`flags BIT STRING { a(0), b(1) }`) are a bitset idiom — lower to the binary type with names Ⓐ, or to `set<token>` when used purely as a flag set (converter flag; the set form is more honest abstractly, the binary form matches encodings) |
| `OCTET STRING` | binary type | ✅ |
| `OBJECT IDENTIFIER` / `RELATIVE-OID` | pattern-refined `text` (dotted form), or a candidate core `oid` type | ◑ OIDs are load-bearing in every real ASN.1 corpus (X.509, LDAP, SNMP) and are the discriminator values of §D — a core `oid` type earns its place the same way `uuid` did |
| `OID-IRI` | `uri`-adjacent refined text | ◑ |

### Character strings — the restricted-string family

`UTF8String` → `text` ✅. Everything else in the family is `text` plus a refinement, which is a satisfying collapse: ASN.1 needed a dozen string types because it predates Unicode consolidation; TSON expresses each as `text ^ { pattern }`:

| ASN.1 | TSON refinement | |
|---|---|---|
| `IA5String` | ASCII-range pattern | ✅ |
| `PrintableString` | the X.680 printable alphabet as a class pattern | ✅ |
| `NumericString` | `[0-9 ]*` pattern | ✅ |
| `VisibleString` | visible-ASCII pattern | ✅ |
| `BMPString` / `UniversalString` | `text` (+ plane restriction if worth enforcing) | ◑ |
| `TeletexString` / `GeneralString` / `GraphicString` | `text` + report | ◑ legacy repertoires not worth modeling; flag |

The mapping is ⬆ in spirit: what ASN.1 encodes as nominal string *types*, TSON expresses as one type with checkable constraints — and permitted-alphabet constraints (§B) compose onto the same mechanism instead of multiplying types.

### Time types

| ASN.1 | TSON | |
|---|---|---|
| `DATE`, `TIME-OF-DAY`, `DATE-TIME`, `DURATION` (X.680 2008+) | `date`, `time`, `datetime`, `duration` | ✅ the modern time group matches core one-for-one — ISO 8601 on both sides |
| `GeneralizedTime` | `datetime` | ◑ spelling differences (local-time forms, fractional rules) — canonical-strict profile validates the DER-restricted form, which is UTC-only and maps cleanly |
| `UTCTime` | pattern-refined `text` or `datetime` with a two-digit-year caveat | ◑ two-digit years; X.509 still carries these — flag, validate the RFC 5280 interpretation |
| `TIME` (general) | ◑ report | the fully general X.680 TIME type is a small language of its own; convert the constrained subsets, report the rest |

### Constructed types

| ASN.1 | TSON | |
|---|---|---|
| `SEQUENCE { ... }` | closed `record` | ✅ ordered, named, fixed components — the match is exact modulo extensibility (§C) |
| `SET { ... }` | closed `record` + `@unordered_components` Ⓐ | ✅ at the abstract level SET differs from SEQUENCE only in component order significance, which is an encoding concern — the record is the same |
| `SEQUENCE OF T` | `[T]` | ✅ |
| `SET OF T` | `[T]` + `@unordered` Ⓐ | ◑ **subtle**: SET OF is an unordered *bag* — duplicates allowed — so TSON `set<T>` (unique) is wrong; `set<T>` is only correct when a `SET OF` carries a uniqueness constraint or the corpus semantics imply one. A multiset nuance worth one sentence in part 3 |
| `OPTIONAL` | `?` (OPTIONAL) | ✅ |
| `DEFAULT v` | `~ v` (`REQUIRED_DEFAULT`) | ✅ injection semantics match (DER even *requires* omitting default-valued components — the encoder-side mirror of decode-time injection) |
| `COMPONENTS OF T` | inline expansion of T's fields | ◑ mechanical splice; note it is not composition (no IS-A implied) |
| `CHOICE { a A, b B }` | **REQUIRED field group** `( a: A \| b: B )` | ✅ label-discriminated, exactly-one — completes the sum taxonomy: OpenAPI discriminator → `choice` + token (value-discriminated); protobuf oneof → OPTIONAL group (label, at-most-one); ASN.1 CHOICE → REQUIRED group (label, exactly-one). All three land on native constructs with no new machinery |
| Selection type (`x < SomeChoice`) | resolve to the named alternative's type | ◑ mechanical |
| `ANY` (deprecated) / open type | `value`/`unknown`, or `extern`/discriminated when governed by a table constraint | ◑ §D |
| `EMBEDDED PDV`, `EXTERNAL`, `CHARACTER STRING` | ✗ report | ✗ presentation-layer relics; vanishingly rare outside OSI-era protocols |
| Tags (`[0]`, `[APPLICATION 3]`, IMPLICIT/EXPLICIT, AUTOMATIC) | `@tag { class, number, mode }` Ⓐ | Ⓐ the protobuf-field-number analogue: encoding identity, preserved for provenance and any future encoding part, invisible to validation |
| Value assignments (`maxSize INTEGER ::= 100`) | schema-level constants; used in refinements | ✅ where TSON's declaration model permits; otherwise inline the value with Ⓐ provenance |

## B. Constraints: ASN.1's subtype system is TSON's refinement system

This is the deepest affinity of the mapping. ASN.1 is the only source language examined whose constraint model, like TSON's, is *subtyping by refinement* — a constrained type is a subtype of its parent, and constraints compose. The mapping is nearly a transliteration:

| ASN.1 constraint | TSON | |
|---|---|---|
| Single value `(5)` | `= 5` / single-member refinement | ✅ |
| Value range `(1..10)`, `(MIN..10)`, open endpoints `(1<..<10)` | `^ { min/max/exclusive_* }` | ✅ |
| `SIZE (1..8)` on strings/collections | `min_length/max_length` / `[T; 1..8]` / map size facets | ✅ |
| Permitted alphabet `(FROM ("A".."Z"))` | pattern refinement | ✅ |
| `PATTERN` constraint | `pattern` (I-Regexp) | ◑ **friendliest regex story yet**: X.680's PATTERN regexes are XSD-flavored, and I-Regexp is defined as a subset of XSD regular expressions — so the translatable class is large and the dialect distance small; the anchoring and feature-classification rules from the regex policy still apply |
| Contained subtype `(INCLUDES T)` | reference the refined type / compose refinements | ✅ |
| Constraint `UNION` (`\|`) | ◑ a union of refinements is a `choice` of refined types when disjoint; report when it degenerates to arbitrary predicate union | ◑ |
| Constraint `INTERSECTION` (`^`) | stacked refinements | ✅ |
| `EXCEPT` | ✗ negation — declined, same verdict and reasoning as JSON Schema `not` | ✗ |
| `WITH COMPONENTS { ..., field (constraint), other ABSENT }` | record refinement `T ^ { field: <refined>, … }` with presence pinning | ◑ the value-constraint parts map to refinement cleanly; `ABSENT`/`PRESENT` pins map to field-state tightening; the *alternative-correlating* uses (constraining a CHOICE alternative based on sibling values) are the dependent-field pattern — lift to a sum of refined records where mechanical, report where not |
| Extensible constraint `(1..10, ...)` | convert the root `(1..10)`, flag the marker | ◑ §C |
| User-defined constraints (`CONSTRAINED BY`) | ✗ report | ✗ the CEL analogue — arbitrary out-of-band predicates |

## C. Extensibility markers — the systematic tension

The `...` marker (in SEQUENCE, SET, CHOICE, ENUMERATED, and constraints, optionally with version brackets `[[ ]]`) is ASN.1's forward-compatibility contract: old decoders must accept and skip unknown extension additions. It is the one construct that appears *everywhere* in modern ASN.1 (mandated by many standards bodies) and conflicts directly with TSON closure.

The resolution follows the proto3 open-enum precedent exactly, now generalized: **convert closed, flag every marker.** A converted SEQUENCE with `...` becomes a closed record validating the components known at conversion time — stricter than the source contract, correct for a strictness-first tool, and a forward-compatibility regression the report must state per site: *a document produced against a newer version of this module will fail here, where an ASN.1 decoder would have skipped the additions.* Version brackets convert to their fields with `@version_bracket(n)` provenance Ⓐ, useful for diffing converted schemas across module revisions. An extensible CHOICE additionally means the field group's alternative set may grow — same flag, applied to the group.

The alternative — modeling extension roots as a rest field — is tempting and wrong here: ASN.1 extension additions are *typed once known* and positional/tagged, not an arbitrary string-keyed tail; a rest field would accept garbage the source never would. Closure-plus-flag is both stricter and more honest. (If a live-migration mode ever matters, the principled version is re-conversion against the newer module plus the schema-diff tooling from open gap #6 — not schema-level openness.)

## D. X.681/X.682/X.683: the information object system — ASN.1's discriminator, and `sealed`'s best customer

The information object system is where ASN.1 encodes what OpenAPI does with `discriminator` and what protobuf approximates with `Any` — and it does so with the most machinery and the most precision of the three. The canonical shape (X.509's AlgorithmIdentifier, every LDAP extension, every PKCS structure):

```asn1
ALGORITHM ::= CLASS {
  &id   OBJECT IDENTIFIER UNIQUE,
  &Type OPTIONAL
} WITH SYNTAX { OID &id [PARMS &Type] }

SupportedAlgorithms ALGORITHM ::= { sha256WithRSA | ecdsaWithSHA256, ... }

AlgorithmIdentifier ::= SEQUENCE {
  algorithm   ALGORITHM.&id   ({SupportedAlgorithms}),
  parameters  ALGORITHM.&Type ({SupportedAlgorithms}{@algorithm}) OPTIONAL
}
```

Decompose it and every part lands on machinery already designed:

- The **relational table constraint** `{@algorithm}` — "the type of `parameters` is determined by the value of `algorithm`" — is the **envelope pattern**: a sum of records, each pinning the discriminator component to one object's `&id` value and typing the payload component with that object's `&Type`. Convert each information object to an envelope variant (`Sha256RsaAlg => { algorithm: = <oid>, parameters: NULL }`, `EcdsaAlg => { algorithm: = <oid>, parameters: EcdsaParams }`), the SEQUENCE to a `choice` over them, and the discriminator component to the **discriminator token** (#9). `UNIQUE` on `&id` is precisely the pairwise-distinct-values rule the token enforces — ASN.1 wrote TSON's resolution check into its class definition thirty years early.
- The **object set** is the variant universe, and its extensibility answers the `sealed` question concretely: a *closed* object set (`{ a | b }`, no marker) is a permits list — the deferred `sealed` (#10) with its first native-source consumer; an *extensible* set (`{ a | b, ... }`) is the open case — convert the known objects, flag the marker per §C, and note that this corpus evidence (how often real object sets are closed vs extensible) is exactly the data the `sealed` deferral said to collect.
- An open type governed by **no** table constraint degrades to `value`/`extern` — the `Any` verdict from the protobuf report, unchanged.
- **X.683 parameterized types** (`SIGNED { ToBeSigned } ::= SEQUENCE { toBeSigned ToBeSigned, algorithm AlgorithmIdentifier, signature BIT STRING }`) map to **TSON templates** directly — the first source language exercising them. Monomorphization at resolution handles every concrete application; parameterized *value sets* and class parameters convert where they reduce to type/value substitution, report where they don't.

The satisfying summary: the JSON Schema work built the value-discriminated machinery (choice + token + envelopes), the protobuf work confirmed the label-discriminated machinery (field groups), and ASN.1 — the language that formalized the discriminated-open-type problem first — needs *both at once* and nothing more. The information object system, ASN.1's most feared feature, converts onto the existing design with `sealed` as the only missing piece, and even that only for closed object sets.

## E. Closing the gap — what ASN.1 asks of TSON

1. **Null atom (#4)** — third corroboration; nothing new, but ASN.1 NULL-typed components (ubiquitous as "parameters NULL" in AlgorithmIdentifier) make it load-bearing for real corpora, not just nullable-union sugar.
2. **`oid` core type** (Tier 1–2): pattern-refinable dotted-integer text with defined canonical form. Earns its place like `uuid` did; doubles as the natural discriminator value type for §D envelopes and for a future `extern`-addressing story.
3. **REAL policy** (Tier 2): folds into the float-specials decision already queued from protojson — one core decision serves both.
4. **Multiset note** (documentation, not construct): `SET OF` ≠ `set<T>`; `[T] @unordered` is the honest lowering. Recommend *against* adding a bag type — annotation suffices, and the uniqueness-constrained cases map to `set<T>` already.
5. **`@tag`, `@version_bracket`, named-number/named-bit annotations** (Tier 1): provenance vocabulary, same family as `@field_number`.
6. **`sealed` (#10) gains its evidence source**: closed object sets. The recommendation stands — still deferred — but the corpus study in Stage 5 of the JSON Schema plan should include ASN.1 object sets, which will likely show *more* demand for sealing than OpenAPI does.
7. **Nothing else.** No negation (EXCEPT declined), no conditionals (CONSTRAINED BY declined), no rest field (extensibility resolved by closure-plus-flag), no new sum machinery. Templates, refinements, field groups, and the discriminator design absorb the rest of X.680–X.683 as specified.

## Recommendations

- **Sequence third**, after protobuf: it reuses the report format, the regex policy (in its easiest form yet), the open-vs-closed flagging pattern, and the envelope/discriminator machinery — while adding the templates and refinement-composition paths as the genuinely new converter code.
- **Pick a pilot corpus with teeth**: RFC 5280 (X.509) exercises SEQUENCE, CHOICE, OPTIONAL/DEFAULT, extensibility, UTCTime/GeneralizedTime, and the information object pattern in one battle-tested module set, and "validate certificates more strictly than the ASN.1 tooling you're replacing" is a legible pitch to the security community — the audience most likely to value TSON's decidability story.
- **Treat JER (X.697) as the protojson analogue** when encodings return to scope: it is the specified JSON transfer syntax, and the §A/§B mapping was written to be compatible with validating JER documents once its spellings (BIT STRING, OID, time formats) are pinned in a canonical-strict profile.
- **Feed §D's object-set census into the `sealed` decision** — this is the concrete Stage 5 input the deferral asked for.

## Caveats

- ASN.1 has accumulated four decades of revisions; this report targets current X.680 (2021-ish era) syntax. Legacy modules (1988 syntax, macro notation, `ANY DEFINED BY`) need a normalization front-end, the analogue of the OpenAPI 3.0 and proto2 passes — and macros in particular may resist mechanical conversion (report-heavy).
- The general `TIME` type, EMBEDDED PDV/EXTERNAL, user-defined constraints, and EXCEPT are declined or reported; corpora from OSI-era protocols will see fatter reports than modern PKI/telecom modules.
- `WITH COMPONENTS` alternative-correlation and parameterized value sets convert case-by-case; the honest posture is a classifier (mechanical / lift-to-sum / report), mirroring the regex classifier.
- Extensibility-marker flags will be *numerous* in standards-mandated modules; the report format should aggregate them (per-module summary) or they'll drown the signal.
- TSON references are to the 2026 Revision 32 working draft plus planned additions from the prior reports; the ASN.1 PATTERN-regex lineage claim (XSD-flavored, hence I-Regexp-friendly) should be verified against the exact X.680 clause before part 3 cites it normatively.
