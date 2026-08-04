# Mapping JSON Schema and OpenAPI → TSON Schema (input for `tson-part3-json`) — Revision 2

> **Status:** Non-normative report · Prepared against TSON 2026 Revision 32 (Working Draft) · Input to the Revision 33 development cycle.
> References to "planned additions" describe design directions under consideration for future revisions, not committed specification. Produced with AI assistance (Anthropic Claude) in collaboration with the TSON author; citations of external standards should be verified against primary sources before normative use. Schema source files are cited with the `.tn` extension per the current draft-period convention (`.tn1` is reserved for the finalized version 1 release).


## Scope and framing (revised)

This revision incorporates two decisions that reshape the mapping from the first pass:

1. **No schema round-trip requirement.** The goal is one-directional: convert JSON Schema/OpenAPI to a TSON schema that validates JSON documents **at least as strictly** as the source schema, ideally more strictly. Every "lossy" verdict from the first pass becomes a directional choice: *strengthen* (adopt the stricter TSON semantics) or *drop-with-report* (constraint cannot be expressed; conversion emits a machine-readable warning). The invariant the converter must preserve: **every document rejected by the source JSON Schema is rejected by the converted TSON schema.** Strictness means accepts-a-subset, never accepts-a-different-set.
2. **A small set of planned TSON additions** (§E, Closing the Gap) resolves the largest structural mismatches — discriminated sums, the `additionalProperties` mixed form, nullability, and enum/annotation coverage — without adding open types, negation, or conditionals to TSON.

## TL;DR

- A large **core subset** of JSON Schema 2020-12 maps cleanly onto TSON Part 2 constructs. `format` maps *upward* to validated core types (`email`, `uuid`, `datetime`, …), converting decorative annotations into enforced constraints — the flagship strictness win.
- JSON Schema's constraint-algebra keywords (`not`, `if/then/else`, `dependentSchemas`, `unevaluated*`, `$dynamicRef`) remain **excluded by design**. They are drop-with-report, and the conversion report doubles as a migration worksheet.
- OpenAPI's `discriminator` decomposes into two jobs: **inheritance** (→ TSON composition, where TSON is *stronger* than the source, since OpenAPI's allOf-form discriminator is explicitly non-validating) and **dispatch** (→ TSON `choice` + a planned kernel-level `discriminator` field token). The mapping table (`mapping`) is *derived* from per-variant `REQUIRED_FIXED` fields, not declared — eliminating drift by construction.
- The `additionalProperties` mixed form no longer requires an open record type. The planned **rest field** keeps records closed in the model (the catch-all is an ordinary declared `map<text, X>` field) and makes openness purely a JSON-encoding flattening transform — the Jackson `@JsonAnySetter`/.NET `[JsonExtensionData]` model lifted into the spec.

## A. TSON's schema constructs (from Part 2, meta-kernel, and core — current draft)

Kinds (meta-kernel §4.1): every type is exactly one of **ATOM**, **PRODUCT**, **SUM**, **REFERENCE**. Operations (§4.3): record construction `{…}`, constructor application `!C v`, composition `A & B & {…}` (IS-A preserved; supertype field sets must be disjoint), subtraction `- {fields}` (breaks IS-A), refinement `^ {…}`, instantiation `!T v`.

Field states (§5.2): `REQUIRED` (default), `REQUIRED_DEFAULT` (`~ v`, injected on decode), `REQUIRED_FIXED` (`= v`), `OPTIONAL` (`?`), `OPTIONAL_FIXED` (`? = v`), `OPTIONAL_FIXED`-absent (`? = _`).

Collections: `[T]`, `[T; N..M]`, tuples, `set<T>` (unordered + unique), `map<K,V>`, `vector<T,S>`.

Sum vocabulary: **`choice`** `(A | B)` — SUM over ≥2 distinct variant types; tag = out-of-band `!variant` annotation, omissible only when the resolver proves `disjoint: true` AND the encoding can recover the variant structurally; record-set disjointness is a MAY-prove, so tag-free encoding is never guaranteed without help. **`@disjoint`** — author assertion (error if refuted, warning if unprovable). **Field groups** (§5.11) — labelled sums inside a record: exactly-one / at-most-one member present, discriminated by field label. **`extern`**, **`unknown`** — deferred and universal membership.

Structural defaults that invert JSON Schema's: fields are **required by default** (vs. optional), records are **closed** (§7.2 — unknown fields are errors) vs. JSON Schema's open-by-default objects.

## B. JSON Schema 2020-12 → TSON, construct by construct

**Legend:** ✅ clean · ⬆ strengthens · ◑ transform · ✗ drop-with-report (or hard error where noted). `◑→✅` / `✗→✅` marks entries resolved by a planned addition (§E).

### Instance types

| JSON Schema | TSON | |
|---|---|---|
| `type: boolean` | `boolean` | ✅ |
| `type: integer` | `integer` | ✅ arbitrary precision |
| `type: number` | `number` | ✅ core documents this as the JSON number mapping, exact |
| `type: string` | `text` | ✅ |
| `type: array` | `[T]` / tuple / `set<T>` | ✅ |
| `type: object` | `record` (fixed keys) or `map<text,V>` (open keys) — see §D triage | ◑ |
| `type: "null"` | **planned `null` atom** (§E #4); interim: no core type | ◑→✅ |
| nullable `type: [X, "null"]` | `(X \| null)` once the atom lands; field-position alternative `X?` conflates absence with null and should not be used for in-band nulls | ◑→✅ |

### Numeric / string / array assertions

| JSON Schema | TSON | |
|---|---|---|
| `minimum`/`maximum`, `exclusiveMinimum`/`exclusiveMaximum` | atom refinement `^ { min / max / exclusive_* }` | ✅ (exclusive bounds uniform across atoms: planned #2) |
| `multipleOf` | `integer_type.multiple_of`; decimal `multiple_of` planned (#2) | ◑→✅ |
| `minLength`/`maxLength` | `text_type.min_length`/`max_length` | ✅ |
| `pattern` (ECMA-262) | `text_type.pattern` (I-Regexp, RFC 9485) | ◑ translate when semantics-preserving; otherwise **fail loudly or annotate as not-enforced** — silent drop would weaken validation (see Caveats) |
| `format: date-time/date/time/duration/email/uri/uuid/ipv4/ipv6/regex` | core `datetime`/`date`/`time`/`duration`/`email`/`uri`/`uuid`/`ipv4`/`ipv6`/`regex` | ⬆ always map to the validated type — no converter flag needed under the no-round-trip framing |
| other `format` values | `@`-annotation on `text` | ◑ |
| `items`/`prefixItems` | array `element_type` / tuple | ✅ |
| `minItems`/`maxItems` | `[T; N..M]` | ✅ |
| `uniqueItems: true` | array `unique_items` facet surfaced in syntax (planned #3); `set<T>` only when unordered semantics are acceptable | ◑→✅ |
| `contains`/`minContains`/`maxContains` | planned array quantifier facets (#6) | ✗→✅ |

### Object assertions (see §D for the dispatch rule)

| JSON Schema | TSON | |
|---|---|---|
| `properties` | record fields | ✅ |
| `required` | field state; converter emits `?` on properties *not* listed | ◑ mechanical inversion |
| `additionalProperties: false` | TSON default (closed records) | ⬆ |
| `additionalProperties` absent | **also** closed record — a deliberate strengthening; JSON Schema's silent acceptance of typo'd property names becomes a caught error | ⬆ |
| `additionalProperties: <schema>`, no `properties` | `map<text, S>` | ✅ |
| `properties` + `additionalProperties: <schema>` (mixed form) | closed record + **rest field** (planned #7) | ◑→✅ |
| `required` + `additionalProperties: <schema>`, no `properties` | `map<text, S>` with **`requiredKeys`** (planned #8) | ✗→✅ |
| `patternProperties` (alone) | `map` with pattern-refined `key_type` | ◑ |
| `patternProperties` + `properties` | drop-with-report | ✗ |
| `propertyNames` | `map` key_type refinement | ✅ |
| `minProperties`/`maxProperties` | `map` `min_items`/`max_items` | ✅ maps; ✗ records |
| `dependentRequired`/`dependentSchemas` | ✗ (field groups cover mutual *exclusion*, not co-requirement; `dependentSchemas` keys on presence, not value) | ✗ |

### Enumerations / constants

| JSON Schema | TSON | |
|---|---|---|
| `enum` of tokens | `!enum [...]` | ✅ |
| `enum` incl. numbers/null/mixed scalars | literal-valued enums (planned #5, after the `null` atom) | ◑→✅ |
| `const` in a field | `field: T = value` (`REQUIRED_FIXED`) | ✅ — load-bearing for discriminators, §C |
| `default` | **non-injecting annotation**, never `REQUIRED_DEFAULT`. JSON Schema `default` doesn't inject; injecting during validation would pass documents the source schema's consumers never saw — a semantic change, not a strictness change | ◑ resolved |

### Composition / applicators

| JSON Schema | TSON | |
|---|---|---|
| `allOf` (inheritance-shaped: `$ref` + extension object) | composition `Child => Base & {…}` | ✅ and stronger — TSON gives real IS-A subsumption |
| `allOf` (overlapping constraint intersection) | drop-with-report; TSON composition requires disjoint field sets | ✗ |
| `oneOf` + discriminator | discriminated `choice` — §C | ✅ |
| `oneOf`, no discriminator, disjoint variants | `choice` (+ `@disjoint`); tag required unless proven | ◑ |
| `oneOf`, same-base-class variants | single-group record (labelled sum, §5.11) — Part 2's own recommendation | ✅ |
| `anyOf` + discriminator | same as discriminated `oneOf` (the discriminator exists to remove the overlap ambiguity) | ✅ |
| `anyOf`, overlapping, undiscriminated | `choice` selects one variant; overlap semantics lost — report | ◑ |
| `not`, `if/then/else` | ✗ by design — see §E, "declined" | ✗ |

### References / annotations

| JSON Schema | TSON | |
|---|---|---|
| `$ref` / `$defs` | type references / named declarations | ✅ |
| `$dynamicRef` / `$dynamicAnchor` | ✗ by design | ✗ |
| `description` | `@doc` | ✅ |
| `title`, `examples`, `readOnly`, `writeOnly` | planned annotations (#1) | ◑→✅ |
| `deprecated` | `@deprecated` | ✅ |
| `contentEncoding: base64/base32/hex` | core `base64`/`base32`/`hex` types | ⬆ annotation → validated type |
| `contentMediaType`/`contentSchema` | annotation only | ◑ |

## C. The discriminator: two jobs, two mappings

OpenAPI's `discriminator` (`propertyName` + optional `mapping`, legal only adjacent to `oneOf`/`anyOf`/`allOf`, "MUST NOT change the validation outcome") is doing two separable jobs:

**Job 1 — inheritance** (`allOf` form). Maps to TSON composition, and TSON is strictly stronger: OpenAPI's allOf-form discriminator is non-validating — no JSON Schema keyword connects parent to children, so validating against `Pet` never consults `Cat`. TSON composition gives genuine IS-A: `Cat => Pet & {…}` means a `Pet`-typed position admits `!Cat` with full structural checking.

**Job 2 — dispatch** (which variant is this payload?). OpenAPI dispatches on an in-band property value looked up in `mapping`. TSON dispatches on the out-of-band `!variant` tag, or structurally when disjointness is proven. The mapping reconstructs the in-band tag with existing TSON machinery:

```
Pet => { petType: text, name: text }

CatPet => Pet & { petType: = cat, huntingSkill: text }
DogPet => Pet & { petType: = dog, packSize: integer ^ { min: 1 } }

pet_message => (CatPet | DogPet) @disjoint
```

The `mapping` table becomes the fixed values; **implicit mapping** (no `mapping` table — schema names are the tag values) becomes `petType: = CatPet`, the degenerate case where OpenAPI's in-band tag and TSON's type-name tag carry the same string. Because record-set disjointness is a MAY-prove, `@disjoint` documents intent; the planned `discriminator` token (§E #9) upgrades this from best-effort to guaranteed.

**Converter rule for allOf + discriminator:** emit *both* halves — the composition chain (subtyping) *and* the explicit choice over the enumerated children (dispatch). Emitting only the composition would mirror OpenAPI's validation semantics but lose the dispatch intent. The children enumerable at conversion time become a **closed variant set** (sealed reading), whereas OpenAPI inheritance is nominally open; for a strictness-first tool this is a feature, noted in the conversion report.

**The envelope pattern** (`{ petType: "cat", pet: {…} }` — tag beside the payload rather than inside it) is the same discriminated sum applied to wrapper records:

```
CatEnvelope => { petType: = cat, pet: CatPet }
DogEnvelope => { petType: = dog, pet: DogPet }
pet_message => (CatEnvelope | DogEnvelope)
```

In JSON Schema this is `oneOf`-over-const-pinned-branches (or an `if/then/else` chain); `dependentSchemas` cannot express it (presence-keyed, not value-keyed). No new TSON construct is needed — and the *field-level* dependent type ("`pet`'s type is a function of `petType`'s value" inside one record) is deliberately excluded: it is `if/then/else` in different clothes, and would make disjointness and subsumption value-dependent. The lift into a sum over whole records is the feature, not the limitation. Trade-offs worth documenting in part 3: envelopes avoid field-name collisions between variants and keep payload types tag-free; the flattened form is what OpenAPI discriminators produce on the wire.

**Native TSON needs none of this.** `!cat {…}` in TSON text *is* the discriminator. The apparatus exists for the boundary where the annotation slot disappears — JSON-encoded TSON data, and JSON documents authored against OpenAPI contracts. The mapping is encoding metadata, not type-system content, and part 3's encoding rule makes it derived rather than declared (§E #9).

## D. Objects: the converter's triage rule

One dispatch rule covers the whole object space:

1. No `properties` (or degenerate) + `additionalProperties: <schema>` → **`map<text, S>`**; `required` present → add `requiredKeys` (#8); `propertyNames`/`patternProperties` → key_type refinement; `minProperties`/`maxProperties` → `min_items`/`max_items`.
2. Real per-key schemas + `additionalProperties: false` or absent → **closed record** (emit optionality inversions mechanically).
3. Real per-key schemas + `additionalProperties: <schema>` (mixed form) → **closed record + rest field** (#7). The converter must invent a field name for the anonymous tail (`extras`, configurable, collision-checked against declared properties) — a small cost that doubles as a migration feature: the dumping ground gets a name, appears in generated code as an explicit typed member, and the conversion report flags every invented rest field as "imported openness — consider tightening."
4. `additionalProperties: true` on a shapeless object → `map<text, value>`.

For reference, the reverse lowering (TSON → JSON Schema, useful for documentation output even without round-trip goals): record → `properties` + `required` + explicit `additionalProperties: false` (state the closure; don't rely on readers knowing TSON semantics); map → bare `additionalProperties: <schema>` (+ `propertyNames` from key_type, `minProperties`/`maxProperties` from size facets); rest field → `additionalProperties: <X schema>`. Non-text map keys have no JSON object form — hard error unless explicitly opted into stringified keys or an array-of-pairs encoding.

## E. Closing the Gap — planned TSON additions

These are the additions identified and settled during design review, ordered easiest → hardest, with the gap each one closes. The unifying design discipline: **the kernel grows only where a fact cannot be derived or a behavior cannot be desugared**; everything else is vocabulary, sugar, or encoding rules. Every addition is activation-gated — no existing schema changes meaning, no existing data changes validity, new rules apply only where the new token appears.

### Tier 1 — vocabulary only (no resolver semantics)

1. **Annotations**: `@title`, `@examples`, `@read_only`, `@write_only`, `@content_media_type`. Closes: JSON Schema's annotation keywords carry over as metadata. Zero impact on validation or kinds.
2. **Numeric facet completion**: `multiple_of` on decimal/number; exclusive bounds uniform across all numeric atoms. Closes: full `multipleOf`/`exclusive*` coverage.
3. **`unique_items` surfaced on ordered arrays**. Closes: `uniqueItems: true` without the lossy detour through `set<T>`'s unordered semantics.

### Tier 2 — small type-system additions

4. **First-class `null` atom**, distinct from `void`/absence. Closes: `type: "null"` and nullable unions; makes the present/absent/null triad fully expressible. Sequencing note: land this **before** #5, since real-world heterogeneous enums frequently include `null`. Requires tightening §7.3's "accept `null` at `void` positions" rule in the same revision.
5. **Literal-valued enums** beyond `token` (integers, mixed scalars). Closes: JSON Schema heterogeneous `enum`. Enum membership feeds disjointness derivation, hence Tier 2 not Tier 1.
6. **`contains`/`minContains`/`maxContains`** as array quantifier facets. Validation-only, but a new facet class (existential over elements), needing its own conformance wording.

### Tier 3 — Record and map extensions

7. **Rest field** — a Record attribute (`rest: <field_name>`) naming a declared field of type `map<text, X>` that receives unmatched members in the JSON encoding. **This replaces the earlier `open_record` proposal entirely.** The record stays closed in the model; the catch-all is an ordinary field; openness is purely an encoding flatten/collect transform — the convergent design of Jackson (`@JsonAnySetter`/`@JsonAnyGetter`), .NET (`[JsonExtensionData]`), and Pydantic (`extra="allow"`), where the tail is runtime plumbing invisible to the type system. Rules: model-not-annotation (it changes decode behavior); at most one rest field per composed record chain; declared field names win — the tail is defined over remaining names; encode-side key collision with a declared field is an error; native TSON text writes the map honestly nested (`!config { host: "x", extras: { retry_ms: "500" } }`). Interaction rule for part 3: a rest-field record participates in tag-free JSON dispatch **only** via a declared discriminator, never structurally (it absorbs arbitrary members and can shadow other variants on the wire). Closes: the `additionalProperties` mixed form — without TSON ever gaining an open type. Subsumption, subtraction, and record-set reasoning are untouched.
8. **`requiredKeys` on map** — presence obligations for a homogeneous map (`required` without `properties` is valid JSON Schema; this is its exact dual). Listed keys must satisfy `key_type`; required count floors `min_items`. Deliberately does **not** take per-key types — that would reinvent the mixed form inside the map constructor. The line: *maps are homogeneous, possibly with presence obligations; heterogeneity is what records are for; heterogeneity plus a tail is the rest field.* Closes: the `required` + `additionalProperties` config-object pattern.

### Tier 4 — kernel additions (the only two, both discriminator-related)

9. **`discriminator` field token** — an optional Record/choice attribute naming a single field as the dispatch key. Passes the kernel test because it changes resolver behavior (per the settled rule: anything semantic cannot be an annotation). What it does *not* do: carry a mapping table. The mapping is **derived** — the discriminator field must be `REQUIRED_FIXED` in every variant with pairwise-distinct values (resolution error otherwise), and any consumer reconstructs value→variant by inspecting the pinned constants. One source of truth; drift is impossible by construction. Semantics:
   - (a) Resolves ambiguity when multiple fixed fields could serve as dispatch keys (derivation-only would make wire format depend on declaration order).
   - (b) Upgrades diagnostics — a missing or duplicate pin becomes "duplicate discriminator value `dog` on FishPet" instead of "choice not disjoint, tag required."
   - (c) **Materialization**: a discriminator field loses its fixed-field omission privilege and must be present in the data in every encoding. This breaks a genuine circularity — fixed-field injection happens after variant selection, but selection happens by reading the field — and matches OpenAPI's "the discriminator property MUST be a required field," so converted schemas preserve their source contracts.
   - (d) The `!variant` tag remains legal on discriminated choices but is demoted from selector to **assertion**: redundant, and if present it MUST agree with the field — mismatch is a validation error, never a precedence question. (Closing off `!type` discrimination entirely would fork the data grammar, since instance annotation is how IS-A instantiation works everywhere, not a choice-specific mechanism.)
   - (e) Discriminators must be `REQUIRED_FIXED`, not `REQUIRED_DEFAULT` — a default-valued discriminator would let absence select a variant, reintroducing the circularity through the back door. Forbid in the first revision; note as a possible future relaxation (easier to add than to remove).
   - Placement: support declaration on the choice (where checks are naturally closed-world over the enumerated variants) *and* on a composed-from parent (where OpenAPI declares it), with the parent form inherited by any choice over its descendants; the parent-form guarantee is scoped to the resolution universe.
   Closes: OpenAPI `discriminator` maps to a native construct; the JSON encoding gets a deterministic separability rule (below).
10. **`sealed` (permits list) — deliberately deferred.** A `permits: [type_ref]` on Record would make composition-from outside the list a resolution error and yield a *derived closed subtype set* — enabling exhaustive dispatch over `[Pet]` positions, tag-free encoding for implicit sums, and faithful codegen to Rust enums / Java sealed interfaces (`sealed interface Pet permits Cat, Dog` is the exact analogue; Java added sealing largely for exhaustive `switch`, the compile-time cousin of tag-free decode). It is genuinely kernel-shaped: a constraint on the composition operation that no library can layer on, the same architectural move as the derived `disjoint` fact. Deferred because the deferral is asymmetric-safe: adding sealing later is purely additive, while shipping it now and discovering the `extern`/schema-chain scoping was wrong means retracting a kernel guarantee. What the interim costs: only the *implicit* sum — `animals => [Pet]` can't earn tag-free dispatch while the subtype set is open. Every *explicit* choice gets the full discriminator machinery, and the explicit choice is what the converter emits. Open questions to settle with real corpus data before landing it: instantiability of a sealed parent (the OpenAPI conversion wants abstract — a bare `Pet` payload with `petType: "cat"` but no `CatPet` fields should fail), and enforcement scope across schema chains. Note: subtraction already breaks IS-A, so sealing needs no anti-laundering rule — a composed-then-subtracted type simply isn't a `Pet`.

### Declined, by design

The declining is itself gap-management, because it preserves the properties that make the target worth converting to — decidable disjointness and a clean kind algebra:

- **`not`** — negation makes disjointness and subsumption reasoning undecidable-in-practice.
- **`if/then/else` and field-level dependent types** — data-dependent validation paths that don't fit the kind algebra; the discriminated sum covers the fixed-value-conditional cases that matter, and the envelope lift expresses value-dependent siblings as sums over whole records.
- **`$dynamicRef`** — cost to the resolution model vastly exceeds corpus coverage.
- **General constraint-intersection `allOf`** — would replace TSON's disjoint-union composition with meet semantics and complicate IS-A.

These remain drop-with-report; the report is the migration worksheet.

### How the additions compose

With #7 and #9 in place, part 3's separability predicate for JSON-encoded choice data becomes one deterministic rule: *a choice is tag-free on the wire iff it declares a discriminator (the field is the wire tag, always materialized) — otherwise an explicit tag member is required.* No structural-disjointness heuristics in the encoding, no per-consumer derivation ambiguity, and rest-field records can't shadow their way into misdispatch. The `!C{}` head carrier and `_` sentinel questions from the first pass remain part 3's remaining encoding obligations.

### Effect on the mapping tables

The additions convert every `◑→✅` and `✗→✅` marked in §B. What remains unexpressible after all additions land: `not`, `if/then/else`, value-keyed conditionals, `dependentRequired`/`dependentSchemas`, `patternProperties` mixed with `properties`, constraint-intersection `allOf`, `unevaluated*`, `$dynamicRef` — all declined-by-design, all drop-with-report. The residual gap is exactly JSON Schema's constraint-logic fringe, which is the trade the strictness pitch is built on.

## Recommendations (revised sequencing)

- **Stage 1 — Profile + report format.** Define the convertible profile (everything ✅/⬆/◑→✅ above) and the machine-readable drop-report schema. The report is a product surface, not a log: it ranks imported openness (invented rest fields), dropped constraints, and regex translation failures as a strictness audit of the source API.
- **Stage 2 — Land Tiers 1–2** (annotations, facets, `null` before enums, `contains`). Order-independent except #4 → #5.
- **Stage 3 — Land #9 (discriminator) and #7 (rest field)**, in that order — the rest field's dispatch rule depends on the discriminator existing. These two plus Tier 2 cover the dominant real-world patterns: `format`, nullable, enums, discriminated unions, and the mixed form.
- **Stage 4 — Ship the converter** against real OpenAPI corpora; measure the residual drop-report population.
- **Stage 5 — Revisit `sealed` (#10)** with corpus evidence on instantiability and cross-chain scoping.

**Change triggers:** revisit if JSON Schema/OpenAPI gains a native tagged-union keyword, or if corpus data shows the declined keywords dominating real APIs (which would argue for scope reconsideration rather than kernel additions).

## Addendum (post-review): OpenAPI-specific vocabulary beyond `discriminator`

Settled in design review after this report's first revision; recorded here so the mapping tables read complete:

- **`format: int32` / `int64` / `float` / `double`** (OAS format-registry extensions) map upward to `int32`/`int64`/`float32`/`float64` — a strengthening in the established `format` pattern, and the resolution of "JSON integer is unbounded" for OpenAPI corpora specifically. OAS 3.0's `byte`/`binary` formats normalize to 3.1's `contentEncoding`/`contentMediaType` in the dialect front-end; `password` is annotation-only.
- **`readOnly` / `writeOnly`** carry OAS 3.0 validation semantics (response-only / request-only) beyond JSON Schema's annotations, and desugar into **two derived views** per schema that uses them — a request-view and a response-view type with field states differing per view — rather than a new construct. The converter emits both views under a naming convention (e.g. `User.Read`/`User.Write`).
- **`nullable: true`** (3.0) lowers to the null-union in the normalization front-end, as already required by the dialect pass.
- **`xml`**, `externalDocs`, `example`→`examples`, and **`x-` specification extensions** are preserved as annotations; well-known `x-` conventions may be table-mapped, everything else passes through untouched.

## Caveats

- **Strictness direction must be audited per keyword.** The subtle failure mode is not lossiness but accidental *weakening*: a silently dropped `pattern`, `not`, or `if/then/else` makes the TSON schema accept documents the source rejected. Policy: translate when semantics-preserving; otherwise fail the conversion or annotate as not-enforced — loudly. Regex specifically: ECMA-262 → I-Regexp (RFC 9485) is the risky direction (I-Regexp is the restricted dialect); the reverse lowering is safe.
- **`format` strengthening changes contracts.** A JSON instance that passed with `format` unchecked (annotation-only per 2020-12) can fail TSON validation. This is the product's pitch, but converted-schema adopters should be told explicitly.
- **Disjointness derivation stays conservative.** Until #9 lands, converted discriminated unions carry `@disjoint` as intent, and tag-free encoding is not guaranteed. After #9, guarantee-by-construction.
- **Sealed-set closure is a semantic choice.** Reading allOf+discriminator hierarchies as closed variant sets diverges from OpenAPI's nominally-open inheritance; correct for strictness, but flagged per-conversion.
- **Version precision on OpenAPI citations**: the "MUST NOT change the validation outcome" sentence appears in the 3.1.1 patch text; 3.1.0 §4.8.25 called the discriminator a "hint" without that sentence. Same feature set; cite precisely.
- The Part 2 text reviewed is the 2026 Revision 32 **working draft**; the additions in §E are design intentions, not frozen spec. Edge cases still needing worked examples before part 3 is normative: recursive discriminated types, choices whose variants are themselves choices, rest fields under composition chains, and envelope/flattened equivalence proofs.
