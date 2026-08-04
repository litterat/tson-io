# Schema Language Mappings → TSON: Synthesis Report

> **Status:** Non-normative report · Prepared against TSON 2026 Revision 32 (Working Draft) · Input to the Revision 33 development cycle.
> References to "planned additions" describe design directions under consideration for future revisions, not committed specification. Produced with AI assistance (Anthropic Claude) in collaboration with the TSON author; citations of external standards should be verified against primary sources before normative use. Schema source files are cited with the `.tn` extension per the current draft-period convention (`.tn1` is reserved for the finalized version 1 release).


Consolidates five first-pass mapping reports — **JSON Schema/OpenAPI**, **Protocol Buffers**, **ASN.1 (X.680–X.683)**, **Apache Avro**, and **GraphQL SDL** — into cross-cutting findings, a prioritized worklist for TSON Part 2, and a shared converter architecture. Companion documents: `json-schema-to-tson-mapping-rev2.md`, `protobuf-to-tson-mapping.md`, `asn1-to-tson-mapping.md`, `avro-to-tson-mapping.md`, `graphql-to-tson-mapping.md`.

## 1. The headline result

Five schema languages spanning four decades and every major design philosophy — constraint logic (JSON Schema), wire pragmatism (protobuf), telecom formalism (ASN.1), evolution-first streaming (Avro), capability graphs (GraphQL) — were mapped onto TSON Part 2, and **the kernel survived untouched.** Every construct in every language landed on existing machinery, an already-planned addition, or a principled decline. The additions the whole series requires of the kernel remain exactly the two identified in the first report's design discussions: the **discriminator token** (#9) and the deferred **`sealed`** (#10). Everything else is core-library vocabulary, annotations, encoding rules, or converter logic.

This is the strongest available validation of the meta-kernel's design discipline (ATOM/PRODUCT/SUM/REFERENCE, refinement, composition, groups) — and of the decision rule that produced it: *the kernel grows only where a fact cannot be derived or a behavior cannot be desugared.*

## 2. The sum-type taxonomy is complete

The single largest design effort — discriminated sums — closed with a four-cell taxonomy that absorbed all five languages with zero new constructs:

| Tag placement | Source constructs | TSON target |
|---|---|---|
| **Sibling property value** | OpenAPI `discriminator`; GraphQL `__typename` | `choice` + discriminator token, variants pin `REQUIRED_FIXED` field |
| **Field presence** (at-most-one) | protobuf `oneof`; GraphQL `oneof` input objects | OPTIONAL field group |
| **Component label** (exactly-one) | ASN.1 `CHOICE` | REQUIRED field group |
| **Wrapper key** | Avro union JSON encoding | single-group record (labelled sum) on the wire; `choice` in the model |

Supporting findings: the *mapping table* exists nowhere — it is derived from pinned constants everywhere (drift impossible by construction); GraphQL's implicit `__typename` is the degenerate tag-value-equals-type-name case identified in report one; ASN.1's `UNIQUE` and Apollo/Relay's forced-`__typename` injection independently rediscovered the token's two core rules (pairwise-distinct values; open sets require mandatory in-band tags). The **envelope pattern** (tag beside payload) recurs as ASN.1's table-constrained open type and Kubernetes-style `{kind, spec}` objects, and needs no construct beyond the same machinery.

## 3. Cross-source scoreboard: what Part 2 must decide, weighted by evidence

| Item | Corroborating sources | Status |
|---|---|---|
| **Null atom** (#4) | **All five**: JSON `type:"null"`; proto wrappers; ASN.1 `NULL`; Avro `null` primitive + `["null",T]` idiom; GraphQL nullable-by-default (the *default case* of the language) | Ship first. The present / absent / null triad must be fully expressible; §7.3's null-at-void rule tightens in the same revision |
| **Recursion semantics** (#3) | **All five converters blocked**: `$ref` cycles; recursive messages; ASN.1 recursive types; Avro linked structures; GraphQL type graphs (most aggressive) | The single blocking spec item. Adopt GraphQL's admissibility hint: cycles legal where a participating position admits absence/null, guaranteeing finite documents. Must also settle: choice-cycle disjointness termination; templates × cycles |
| **Discriminator token** (#9) | OpenAPI, GraphQL, ASN.1 table constraints; enables the JSON-encoding dispatch rule | Kernel addition, fully designed (pinned-FIXED, materialization, tag-as-assertion, no DEFAULT discriminators) |
| **Rest field** (#7) | JSON Schema mixed form **only** — no other language has openness of this shape | Confirms the design: openness is a JSON-Schema-ism, contained as an encoding transform, never a type |
| **`sealed`** (#10) | Evidence sources now concrete: ASN.1 closed vs extensible object sets; GraphQL unions (sealed) vs interfaces (open) — one language with both cases as explicit constructs | Still deferred; Stage-5 census now has its corpus |
| **Evolution/compatibility part** | Avro resolution algebra (the spec); proto open enums, ASN.1 extensibility markers, Registry compat modes (the consumers) | New spec part: compatibility relation between revisions + rename bridge (alias-shaped) + explicit-never-silent transformation. Unifies all forward-compat report flags |
| **Float specials policy** | protojson (`"NaN"`/`"Infinity"` strings); ASN.1 REAL; Avro; GraphQL **mandates finiteness** | One core decision, four consumers; a `finite` facet has its first mandating source |
| **Zone-less / calendar time** | ASN.1 GeneralizedTime local forms; Avro `local-timestamp-*`, months/days/millis duration | One core decision, decide once |
| **Decimal precision/scale facets** | Avro `decimal`; ASN.1-adjacent; SQL inevitable | Tier 2 facet addition |
| **`oid` core type** | ASN.1 (load-bearing: X.509/LDAP/SNMP discriminator values) | Earns its place as `uuid` did |
| **Injection semantics of `REQUIRED_DEFAULT`** | Matches proto2 defaults, proto3 implicit presence, ASN.1 DEFAULT (DER omission), Avro resolution defaults, GraphQL input defaults; **only** JSON Schema `default` is non-injecting | Vindicated as designed; the converter rule flips per source, both directions principled |
| **Declined constructs** | `not`/EXCEPT (JSON Schema, ASN.1); `if/then/else`/CEL/CONSTRAINED BY/field-level dependency (JSON Schema, protovalidate, ASN.1) | Verdict held across all appearances: negation and data-dependent validation stay out; drop-with-report. Avro and GraphQL had *empty* declined lists |

**Regex dialect ledger** (policy: translate when semantics-preserving; classify mechanically; fail loudly or annotate-unenforced; I-Regexp stays normative): ECMA-262 (JSON Schema — riskiest, backrefs/lookaround untranslatable) · RE2 (protovalidate — friendly, same exclusions as I-Regexp) · XSD-flavored (ASN.1 PATTERN — friendliest, I-Regexp is an XSD subset; verify the X.680 clause) · none (protobuf core, Avro, GraphQL). The ECMA-262 decision — keep the RFC, for cross-platform truth, ReDoS safety, and decidable pattern disjointness — held under every subsequent test and got easier each time.

## 4. Recurring structural patterns

**Optionality regimes** — three distinct systems, all landing on TSON's five field states: membership-based (JSON Schema `required[]` → invert to `?`), presence-discipline (proto editions LEGACY_REQUIRED/EXPLICIT/IMPLICIT → REQUIRED/`?`/`~ zero`), value-nullability (GraphQL `T!`/`T` → `T` / `(T|null)` — REQUIRED either way; input universe adds presence back). The field-state vocabulary needed no extension; only the discriminator materialization rule (#9c) modified it.

**Closure** — JSON Schema is the outlier: open-by-default objects required the triage rule, the rest field, and the strengthening argument. Protobuf messages, ASN.1 SEQUENCE (modulo `...`), Avro records, and GraphQL types are all closed. Openness-as-forward-compatibility (proto open enums, ASN.1 extensibility markers, GraphQL interfaces) resolved uniformly: **convert closed, flag per site, defer the real answer to the evolution part.**

**The strictness pitch inverts by source.** Constraint-rich sources (JSON Schema, ASN.1) convert with *strengthening* (`format`→types, closure, alphabets→patterns). Constraint-poor sources (protobuf, Avro, GraphQL) convert *faithfully-but-empty*, and the pitch becomes "TSON refinements are the constraint layer your ecosystem never standardized" — with protovalidate as the one source-side constraint layer, mapping term-for-term. The invariant in both cases: rejected-by-source ⇒ rejected-by-conversion; the audit direction (silent weakening, not lossiness, is the failure mode) applies per keyword.

**Lexical-layer decisions cluster.** int64 spelling (protojson: string canonical; Avro JSON: number — document the contrast), bytes spelling (base64 / base64url / Avro's ISO-8859-1 escape — flag the last loudly), map-key stringification (protojson-specified, reused for TSON's non-text-key lowering), duplicate keys, big-number parsing (require lossless), name casing (protojson camelCase; GraphQL as-declared). Each converter resolves these as a **canonical-strict profile with lenient flags, every leniency emitting a report line** — the pattern generalized cleanly across all five.

## 5. Shared converter architecture

All five converters instantiate one pipeline:

1. **Dialect normalization front-end** — OpenAPI 3.0→2020-12; proto2/proto3→editions features; ASN.1 1988/macros→current X.680; Avro pre-1.12 union-default rules; GraphQL spec-edition + `extend` merging + federation directives. All ambiguity is resolved here, before mapping.
2. **Structural mapping** — types → records/choices/groups/collections per the per-language tables; namespacing policy (one dotted-name decision serving proto packages, ASN.1 modules, Avro namespaces, GraphQL — still open, decide once).
3. **Constraint mapping** — refinements from source constraints (ASN.1 subtypes, protovalidate, JSON Schema assertions) + upward mappings (format/logical-type/specifiedBy → core types) via shared tables.
4. **Provenance annotations** — `@field_number`, `@tag`, `@wire`, `@reserved`, `@branch_order`, `@alias`-bridge, `@version_bracket`, `@proto_name`, `@graphql_id`: wire/evolution metadata, uniformly non-semantic, uniformly preserved.
5. **The report** — a product surface, not a log: machine-readable drop/strengthen/flag entries (schema for it is a Stage-1 deliverable); aggregation required (ASN.1 extensibility flags would otherwise drown signal); doubles as migration worksheet and strictness audit.

Per-encoding **canonical-strict profiles** hang off this pipeline (protojson, Avro JSON, JER when encodings return to scope, GraphQL's strict-per-query/lenient-document × input/output grid), as does the one genuinely novel product identified: the **GraphQL per-query compiler** — (SDL, query) → response-contract TSON schema — which reuses the entire design and serves an unmet need.

## 6. Prioritized worklist

**Part 2 (spec), in order:**
1. Value-space/lexical-space clause + binary collapse to `bytes` + `token` re-grounding (§8) — first because it's the one *breaking* change, cheapest before anything else lands, and the time/float decisions below depend on its vocabulary.
2. Recursion clause (blocks everything; steal the nullable-link admissibility rule).
3. Null atom + §7.3 tightening (blocks Avro and GraphQL fidelity; five sources waiting).
4. Tier 1–2 batch: annotations, numeric facets incl. finite + precision/scale, `unique_items`, literal enums (after null), `contains`, time-type decisions (as value spaces, per §8), `oid`.
5. Discriminator token (#9) — designed; write the normative text.
6. Rest field (#7) + `requiredKeys` (#8).
7. Evolution/compatibility part — spec its vocabulary early (report-flag wording across converters depends on it) even if it ships late.
8. `sealed` (#10) — after the object-set/union census.

**Converters (product), in order:** JSON Schema/OpenAPI (largest on-ramp; hardest, already designed) → protobuf + protovalidate (fast follow; Registry-adjacent) → Avro + Registry compat checker (the Kafka wedge; needs items 1–2) → GraphQL input-universe, then per-query compiler → ASN.1 with an X.509 pilot (highest-prestige strictness demo; smallest audience). Thrift as a protobuf appendix; XSD only on vertical demand.

## 7. What was declined, and why it held

Across five languages, every appearance of negation (`not`, EXCEPT), general conditionals (`if/then/else`, CEL, CONSTRAINED BY, value-keyed dependencies), dynamic scoping (`$dynamicRef`), and constraint-intersection composition was declined with the same reasoning: each would trade TSON's decidable disjointness and structural kind algebra for coverage of a constraint-logic fringe — and the fringe shrank with every report (two languages had *empty* declined lists). The drop-with-report policy converts these from silent losses into migration worksheets. The one construct that looked like it might force openness into the type system — `additionalProperties` — was instead dissolved into an encoding transform over a closed record, following the convergent design of every major OO serialization library. **The boundary held everywhere it was tested, and the tests were adversarial: five languages, five philosophies, forty years of accumulated features.**

## 8. Encoding-leakage audit: what the wire has smuggled into the type system

A separate audit, prompted by the binary types, with a crisp test: **does a type distinguish different *values*, or different *spellings* of the same value?** Two "types" related by a value-preserving bijection, differing only in how the value appears in some encoding, are one type plus a leak. Results, in descending order of concern:

**Binary types — clear failure, with a live bug.** `base64`, `base32`, `hex`, `base64url` as distinct core types are four spellings of one value space (octet strings). The leak has already bitten the mapping work: the JSON Schema report's `contentEncoding: base64` → `base64`-type mapping silently conflated *"bytes, spelled as base64 in JSON"* with *"text that happens to contain base64"* (which is what the JSON Schema annotation actually asserts) — and the two have different equality semantics: under the first, a base64 spelling and a hex spelling of the same octets are the *same value*; under the second, different strings. **Fix:** collapse to one `bytes` atom; each encoding defines its lexical form and canonical spelling (part-3 JSON: base64 canonical; Avro-JSON profile: its ISO-8859-1 escape — demoted from mapping wart to lexical rule of one profile); non-default spellings become a non-semantic `@spelling` annotation consumed by codecs, invisible to the resolver — the same architectural slot as `@json_discriminator`. Payoff beyond hygiene: **content addressing becomes encoding-independent** — hashes over canonical value spaces mean the same data hashes identically across TSON text, JSON, and any future binary encoding, which is what hash-pinning should mean and currently doesn't if `base64` ≠ `hex`.

**`token` vs `text` — second leak, subtler.** If `token` means "text matching the identifier grammar of TSON's text encoding" (unquoted-spelling privilege), a lexical convenience of one encoding has become a type. **Fix:** re-ground `token` as pattern-refined `text` (a value-space restriction — passes the test); unquoted-ness becomes a lexical rule of the text encoding that happens to apply to matching values. Same surface syntax; JSON encoding needs no token story; enum semantics stop depending on part 1's tokenizer.

**Time types and `uuid` — leaky iff defined lexically.** If core `datetime` is "an RFC 3339 string," then GeneralizedTime, protojson Timestamp, and JER spellings are different *types* rather than alternative lexical forms of one value — and every time-type ◑ in the five reports worsens. **Fix:** define instants, calendar values, and durations as abstract value spaces with RFC 3339 as the text/JSON lexical form; the queued zone-less and calendar-duration decisions belong here and are *legitimate* type distinctions (genuinely different value spaces). `uuid`: a 128-bit value space with a canonical text spelling — which makes a future binary encoding's 16-byte form the same value, hashing identically.

**Sized integers — pass, conditionally.** `int8`…`uint256` are value-space restrictions *if defined as range-refinement aliases* (`int8 => integer ^ {min: -128, max: 127}`), not storage widths; one sentence in core should say so, because "8-bit" in a definition is the leak. `float32`/`float64` are ruled acceptable: IEEE value sets are genuinely distinct value spaces (representable sets, signed zero, NaN), not spellings of `number` — though the queued float-specials decision is exactly this boundary dispute (is NaN a value or an encoding artifact?); settle them together.

**Already handled correctly by the architecture** — evidence the pattern works: the `!variant` tag (out-of-band annotation with per-encoding presence rules — the entire discriminator design was this leak managed properly), the `_` absent sentinel (per-encoding carriers, flagged since report one), and the `@ordered`-family markers (correctly non-semantic).

**Deliverable:** a short normative clause in Part 1 or 2 — *"Types denote value spaces. Encodings define lexical spaces and one canonical form per type. Equality, ordering, refinement, disjointness, and content addressing are defined over value spaces only."* — turning the audit test into a standing conformance rule. Draft-stage cost: one breaking rename (the binary collapse) plus definition rewording; post-freeze cost: much worse. Cheap now, expensive later.

## Caveats

- All five reports target the 2026 Revision 32 working draft plus planned-but-unfrozen additions; every "designed" item above is a design intention until Part 2 lands it.
- Per-report caveats (version-precise citations, the X.680 PATTERN lineage check, dialect edition pins) carry forward; this synthesis does not repeat them but does not supersede them.
- Several design threads that inform this synthesis were settled in design review but are not yet published as reports: the per-format encoding/profile-document architecture (encoding decisions as separate, hashable TSON documents wrapping a pinned schema), the interface-layer scoping study (abstract operations vs. transport bindings), and OpenAPI-specific vocabulary amendments to the JSON Schema report (see that report's addendum). Where this document cites those conclusions, the reports are the pending artifacts.
- Market-share and sequencing judgments (§6 converter order) are informed estimates, not measured data.
- The empty-kernel-ask result is evidence of design fit, not proof of completeness: the sixth language (SQL DDL and CDDL are the plausible candidates) gets to try to break it.
