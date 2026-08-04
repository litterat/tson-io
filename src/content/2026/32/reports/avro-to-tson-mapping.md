# Mapping Apache Avro schemas → TSON Schema

> **Status:** Non-normative report · Prepared against TSON 2026 Revision 32 (Working Draft) · Input to the Revision 33 development cycle.
> References to "planned additions" describe design directions under consideration for future revisions, not committed specification. Produced with AI assistance (Anthropic Claude) in collaboration with the TSON author; citations of external standards should be verified against primary sources before normative use. Schema source files are cited with the `.tn` extension per the current draft-period convention (`.tn1` is reserved for the finalized version 1 release).


## Scope and framing

Same framing as the prior reports: **one-directional, strictness-first, no round-trip requirement.** Avro schemas are themselves JSON documents (a pleasant recursion: this mapping's *source* language is written in the notation `tson-part3-json` will define for TSON's own schemas). Primary validation target: **Avro JSON encoding** documents and — more importantly for the actual market — schema-level conversion for the Kafka/Schema Registry ecosystem, where Avro is the de facto schema language of streaming data. Binary encoding is out of scope per the established pattern, with the same annotation-preservation posture.

Avro's distinguishing characteristic among the four languages examined: it is the only one designed around **schema evolution as the primary use case**. Writer schema and reader schema are distinct artifacts; the specification defines *schema resolution* — the rules by which data written under one schema is read under another (field defaults fill added fields, unmatched writer fields are skipped, unions resolve by best match, numeric types promote). Every prior report deferred evolution to open gap #6; Avro forces the question, and §E is where this report earns its place in the queue.

## TL;DR

- The **primitive and structural inventory maps cleanly**: records are closed (no additionalProperties anywhere in Avro — the first source language sharing TSON's closure without argument), `null` is a first-class primitive (fourth corroboration of the null atom), maps are string-keyed homogeneous (`map<text, V>` exactly), `fixed` is a sized binary type, and logical types (`decimal`, `uuid`, `date`, `timestamp-*`, `duration`) map to core types the way JSON Schema `format` did — except Avro logical types are closer to *validated* already, making this the lowest-friction "maps upward" case yet.
- **Avro unions are the missing cell in the sum taxonomy**: untagged in the abstract schema, *positional* (order matters, first-match on resolution), discriminated in the JSON encoding by a **type-name wrapper** — `{"string": "hello"}` — i.e., a single-key object whose key is the branch name. That is structurally TSON's **single-group record / labelled sum** (§5.11) materialized on the wire: the JSON encoding of an Avro union is a REQUIRED field group with one member per branch. The fourth tag-placement variant (OpenAPI: sibling property value; protobuf oneof: field presence; ASN.1 CHOICE: component label; Avro: wrapper key) — and TSON already had a native construct waiting for it.
- **`["null", T]` is the idiom**, not the exception: optionality in Avro is spelled as a null-union with a `null` default. It converts to `T?` with decode-injection semantics in field position — but the present-null vs absent distinction (which Avro's JSON encoding *does* make: `{"field": null}` wrapper-free vs field absent) needs the null atom to convert faithfully.
- **Aliases and schema resolution** are Avro's evolution machinery, and they map to nothing existing in TSON. §E argues this is the report's real payload: Avro's resolution rules are a *specified, decades-tested* compatibility algebra (backward/forward/full, as enforced by Schema Registry compatibility modes), and TSON should adopt the *concepts* (a defined subsumption-across-revisions relation) without the *mechanism* (implicit best-match union resolution, which is where Avro's own sharp edges live).

## A. Type-by-type mapping

**Legend:** ✅ clean · ⬆ strengthens · ◑ transform/decision · ✗ drop-with-report · Ⓐ annotation-only.

### Primitives

| Avro | TSON | |
|---|---|---|
| `null` | planned `null` atom | ✅ fourth corroboration; in Avro it is a real primitive with one value, used constantly |
| `boolean` | `boolean` | ✅ |
| `int` (32-bit) | `int32` | ✅ |
| `long` (64-bit) | `int64` | ✅ JSON-number caveat below |
| `float` / `double` | `float32` / `float64` | ✅ NaN/Infinity policy — the queued core decision, third consumer |
| `bytes` | binary type | ✅ JSON encoding spells it as an ISO-8859-1-escaped string, *not* base64 — a canonical-strict profile item and a known interoperability hazard; flag it loudly |
| `string` | `text` | ✅ |

Note the absence of unsigned types: Avro has none. `uint64`-shaped data in Avro corpora travels as `long` or `fixed` — no converter decision needed, but the reverse lowering (TSON→Avro, for Registry publication) must map `uint32` → `long` and report `uint64`.

### Named and constructed types

| Avro | TSON | |
|---|---|---|
| `record` | closed `record` | ✅ **exact** — Avro records are closed, named, namespaced; no openness construct exists in the language. The first source where closure needs no discussion |
| `field` (no default) | REQUIRED | ✅ |
| `field` with `default` | `~ v` (`REQUIRED_DEFAULT`) | ✅ **injection matches**: Avro defaults exist to be injected — at schema-resolution time, when a reader's field is missing from the writer's data. Same construct as proto2 defaults, same verdict |
| `["null", T]` + `"default": null` | `T?` / `(T \| null)` | ◑ the optionality idiom — §B |
| `enum` (`symbols`) | `!enum [...]` | ✅ symbols are name-only (no numbers to annotate — simpler than protobuf/ASN.1); `default` on enum → resolution fallback, §E |
| `array` (`items`) | `[T]` | ✅ |
| `map` (`values`) | `map<text, V>` | ✅ string keys only, homogeneous — precisely TSON's map, no triage rule needed |
| `fixed` (`size`) | binary type + exact-length facet, named | ✅ a named sized-binary type; TSON expresses it as a declared refinement — cleaner than the source |
| `union` `[A, B, ...]` | field group / `choice` — §C | ◑ the interesting one |
| named type references (by fullname) | type references | ✅ |
| `namespace` / fullnames | naming convention | ◑ same open question as protobuf packages and ASN.1 modules — dotted-name policy needed once, serves all four |
| `aliases` (on named types and fields) | `@alias` Ⓐ + evolution semantics | ◑ §E — TSON has `@alias` for flattening; Avro aliases are *resolution-time rename bridges*, a different animal |
| `doc` | `@doc` | ✅ |
| arbitrary extra schema attributes | annotations | Ⓐ Avro explicitly permits unknown attributes in schemas (metadata convention, e.g. Registry rules ride here) — preserve as annotations |

### Logical types

Logical types annotate an underlying primitive with refined semantics — structurally identical to JSON Schema `format`, but with better ecosystem enforcement, making this the lowest-friction upward mapping yet:

| Avro logical type | TSON | |
|---|---|---|
| `decimal` (bytes/fixed + precision/scale) | `number` ^ precision/scale facets | ◑ **the standout**: Avro decimal is exact decimal — TSON `number` is its natural home, *better* than Avro's own encoding (scaled two's-complement bytes, a known usability sore point). Precision/scale facets: check whether core has them; if not, a Tier-2 facet addition with two consumers already (SQL corpora will be the third) |
| `uuid` (string) | `uuid` | ⬆ |
| `date` (int, epoch days) | `date` | ⬆ |
| `time-millis`/`time-micros` | `time` (+ precision Ⓐ) | ⬆ |
| `timestamp-millis`/`timestamp-micros` | `datetime` (+ precision Ⓐ) | ⬆ |
| `local-timestamp-*` | `datetime` variant or refined text | ◑ zone-less timestamps — does core `datetime` admit them? Same family as the GeneralizedTime local-form question from ASN.1; decide once |
| `duration` (fixed(12): months/days/millis) | `duration` | ◑ Avro's months/days/millis triple is calendar-relative and doesn't total-order — closer to ISO 8601's nominal duration than a seconds count; check core `duration`'s model before claiming ✅ |
| unknown logical type | underlying primitive + Ⓐ | ✅ Avro's own specified fallback — adopt it |

## B. Optionality: the `["null", T]` idiom

Avro has no `optional` keyword; the ecosystem convention is a two-branch null union with a null default:

```json
{"name": "email", "type": ["null", "string"], "default": null}
```

Three distinct states are in play, and Avro's JSON encoding distinguishes two of them: field absent (legal only via schema resolution — reader injects the default), field present-null (`"email": null` — the null branch, unwrapped since null needs no wrapper), and field present-value (`"email": {"string": "x"}` — wrapped, §C). The faithful conversion is therefore **not** a collapse to `T?`:

- Strict-document validation (no resolution in play): `email: (null | text)` — REQUIRED field, null-union type. Present-null and present-value validate; absent fails. This matches what an Avro JSON decoder actually accepts for a same-schema read.
- Resolution-aware validation (reader-schema semantics, §E): `email: (null | text) ~ null` — absent is legal, injected as null. This is `REQUIRED_DEFAULT` over a null-union, and it is the honest spelling of the idiom.

Both spellings need the null atom; neither is expressible with `?` alone without conflating states Avro's encoding separates. The converter should emit the second form by default (it is what the idiom *means*) with a strict-document flag for the first — and this pair of forms is a nice concrete test case for the null atom's design.

## C. Unions: the fourth tag placement

Avro unions are untagged in the schema (`["string", "int", "PetRecord"]`), constrained (no immediate nesting of unions; branches must be distinct by type — and only one of each unnamed kind, so discrimination among same-kind branches leans on *names*), and **positional**: order matters for schema resolution (first branch that matches wins) and, historically, for default-value interpretation (the default must conform to the first branch — pre-1.12 rules; 1.12 relaxed this, a dialect item for the normalization front-end).

The JSON encoding is the design gift: a union value is encoded as `null` bare, or as a **single-key wrapper object** `{"branchName": value}` where the key is the type name (`"string"`, `"int"`) or fullname for named types (`{"com.example.Cat": {...}}`). A single-key object discriminated by which label is present *is* TSON's single-group record — the labelled sum of §5.11 — materialized on the wire. So the mapping:

- **Union in field position, JSON-encoding validation**: the field's type is a REQUIRED field group over the branches, with `null` as an unwrapped special case: `( string: text | int: int32 | com.example.Cat: Cat )` plus the null branch handled by the `(null | group)` composition from §B. The wrapper key set is the branch-name set; validation is exact.
- **Union as an abstract type** (model-level, encoding-independent): a `choice` over the branches. Distinct-by-type branches are frequently *structurally* disjoint (Avro's own constraint pushes toward it), so `@disjoint` is often provable; where two record branches overlap structurally, their *names* discriminate — which is precisely the `!variant`-tag case, and the JSON wrapper key is that tag's wire spelling.

The taxonomy, completed: OpenAPI discriminates by **sibling property value** (choice + discriminator token), protobuf oneof by **field presence** (OPTIONAL group), ASN.1 CHOICE by **component label** (REQUIRED group), Avro by **wrapper key** (single-group record on the wire, choice in the model). Four IDL traditions, four tag placements, zero new TSON constructs — the strongest evidence yet that the sum vocabulary (choice + groups + the discriminator token) is complete for the IDL space. The one Avro-specific rule to write down: branch-name canonicalization (short name vs fullname in wrapper keys) follows the writer's spelling rules — a canonical-strict profile item.

Positionality is the lossy residue: TSON choices are unordered sets; Avro union order matters only for resolution (§E) and legacy default rules. Preserve order as `@branch_order` Ⓐ for the evolution tooling; validation ignores it.

## D. What Avro doesn't have

Worth cataloguing because it shapes the strictness pitch, which for Avro resembles protobuf's, only more so — Avro has *even less* constraint vocabulary:

- **No value constraints at all**: no ranges, no lengths, no patterns, no enums-over-values (only symbol enums). A converted schema is structurally faithful and constraint-empty. Unlike protobuf there is no protovalidate-equivalent standard layer; constraint conventions ride in arbitrary schema attributes ad hoc. The pitch: TSON refinements give Avro shops the constraint layer their ecosystem never standardized — "your Registry schema says `string`; your TSON schema says `email`."
- **No cross-field anything**: no oneof-style groups outside unions, no conditionals, no references between fields. Nothing to decline — the declined-constructs section of this report is empty, a first.
- **No openness**: no rest fields, no additionalProperties, no extensibility markers. Closure friction: zero.
- **Recursion is idiomatic** (linked structures via named-type self-reference) — the recursion gap (#3) gates this converter exactly as it did protobuf's. Still the single blocking spec item, now with three converters queued behind it.

## E. Schema resolution: the report's real payload

Avro's resolution rules (reader vs writer schema) are a specified compatibility algebra: writer fields absent from the reader are skipped; reader fields absent from the writer take the reader's default (error if none); enum symbols unknown to the reader take the reader's enum default (error if none); unions resolve branch-by-branch by first match; numerics promote along int→long→float→double; aliases bridge renames. Schema Registry compatibility modes (backward/forward/full, transitive variants) are policies over this algebra, and they are *the* operational contract of streaming platforms.

TSON has nothing here — open gap #6 — and Avro clarifies exactly what to take and what to refuse:

**Take the concepts.** Define, as spec-level notions: (1) a **compatibility relation** between two resolved schemas — "every document valid under writer W is valid under reader R after a defined transformation" — which is subsumption *across revisions* rather than within one universe, and is checkable by the resolver using machinery it already has (field-state comparison: adding an OPTIONAL or REQUIRED_DEFAULT field is backward-compatible, adding a REQUIRED field is not; enum-set widening vs narrowing; refinement loosening vs tightening — note that *tightening* a refinement is backward-incompatible for reading old data, the mirror image of the strictness-first conversion direction). (2) A **rename bridge**: TSON identity is names (a decision reaffirmed in the binary-encoding discussion), so renames need an explicit artifact — Avro's `aliases` is the right shape, as declared metadata on the *new* schema pointing at old names, consumed by diff/compat tooling. (3) **Deterministic transformation**: default injection on missing-in-writer fields — which TSON's `REQUIRED_DEFAULT` decode-injection already is; resolution-aware validation is just decoding with the reader schema, no new machinery.

**Refuse the mechanism's sharp edges.** Avro's first-match union resolution and numeric promotion are *implicit coercions* — data changes type silently based on branch order and promotion rules, the source of Avro's best-known production surprises. TSON's version should be explicit: compatibility checking may *report* "writer branch int matches reader branch long by promotion," but validation never silently promotes; a document either validates against the stated schema or fails with the compat report explaining what a resolution-aware read would have done. That preserves the strictness invariant while giving Registry-style tooling everything it needs — and positions the TSON compat checker as a drop-in for Registry compatibility gates, which is the concrete adoption wedge into the Kafka world.

This is a **new spec work item**, likely a `tson-part` of its own (evolution & compatibility), and it retroactively serves all four converters: the re-conversion diffing from gap #6, the extensibility-marker flags from ASN.1, and the open-enum forward-compat flags from protobuf are all instances of "compare two schema revisions under a compatibility relation."

## F. Closing the gap — what Avro asks of TSON

1. **Null atom (#4)** — now with the strongest functional case: §B's two-spelling optionality idiom is inexpressible without it. Fourth corroboration; ship it first.
2. **Decimal precision/scale facets** on `number` (Tier 2, if not already in core): second consumer after ASN.1-adjacent needs, with SQL inevitable as the third.
3. **Zone-less timestamp and calendar-duration decisions** in core's time types (Tier 2): shared with ASN.1's GeneralizedTime local forms; decide once.
4. **`@branch_order`, `@alias`-as-rename-bridge, `@precision` annotations** (Tier 1).
5. **The evolution/compatibility part** (§E) — the genuinely new item, and the largest single unresolved area across all four reports. Not a kernel change: a new specification layer over resolved schemas.
6. **Recursion (#3)** — unchanged verdict, third converter now blocked on it.
7. Nothing else: no new sum machinery (§C closed the taxonomy), no openness constructs, no declined-list entries.

## Recommendations

- **Lead the converter with the Registry integration**, not the file converter: `.avsc` → TSON + a compatibility checker that mirrors Registry modes is the product Kafka shops can adopt without changing producers — validation and compat-gating on the consumer side, strictness added via refinements on top of converted schemas.
- **Resolve recursion, then the null atom, before shipping** — both are hard blockers for real Avro corpora (recursive records, null-unions everywhere).
- **Spec the evolution part early even if it ships late**: its concepts (compat relation, rename bridge) affect how the other converters' report flags are worded, and retrofitting vocabulary is cheaper now than after three converters ship divergent phrasings.
- **Canonical-strict profile items to pin**: bytes-as-ISO-8859-1-string (flag loudly; consider refusing it outside lenient mode), wrapper-key name spelling, long-as-JSON-number (Avro JSON writes longs as numbers — the *opposite* of protojson's string spelling; document the contrast so users of both converters aren't surprised).
- **Dialect front-end**: pre-1.12 vs 1.12+ union-default rules and any Registry-dialect quirks normalize before mapping, per the established pattern (OpenAPI 3.0, proto2/proto3/editions, ASN.1 1988).

## Caveats

- Avro's JSON encoding is a secondary citizen in its own ecosystem (binary + Registry wire format dominate); the schema-level conversion and compat tooling are the real product, with JSON-document validation a supporting feature — a different emphasis than the JSON Schema and protojson reports.
- The single-object encoding and Registry framing (magic byte + schema ID) are encoding-layer items deferred with the rest; they slot into the same annotation-preservation posture when encodings return to scope.
- §E deliberately proposes *diverging* from Avro semantics (no silent promotion/first-match coercion); teams expecting bug-for-bug Registry parity need the compat report, not identical runtime behavior — set that expectation in the tool's docs.
- TSON references are to the 2026 Revision 32 working draft plus the planned additions from the prior reports; Avro references target the current 1.12-era specification with the pre-1.12 differences handled by normalization.
