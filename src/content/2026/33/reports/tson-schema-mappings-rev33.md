---
title: "Review Inputs Measured Against Revision 33 — Summary and Revision 34 Recommendations"
series: "TSON 2026 revision series"
status: "Editor's working document — non-normative"
date: 2026-08-25
inputs: >
  schema-mappings-synthesis.md; json-schema-to-tson-mapping.md (rev 2, with OpenAPI addendum);
  protobuf-to-tson-mapping.md; asn1-to-tson-mapping.md; avro-to-tson-mapping.md;
  graphql-to-tson-mapping.md; implementation-feedback.md
baseline: "TSON 2026 Revision 33 (Parts 1 and 2, six companion artifacts, REV33-CHANGELOG)"
---

# Review Inputs Measured Against Revision 33

Seven review documents, all prepared against **Revision 32**, arrived after Revision 33 was
executed. This document does two things: it measures each input against what Revision 33
actually contains — separating asks the revision already answers from asks that remain open —
and it assembles the open remainder into a recommended scope and sequence for **Revision 34**.
Nothing here modifies Revision 33 or the inputs themselves; the inputs remain in review, and
this document quotes their conclusions as candidates, not commitments.

The headline: **Revision 33 already answers the single item every mapping report called
blocking** — recursion semantics — along with the disjointness model the sum-type work leans
on, the regex conformance gate, and a surprising number of facets the reports listed as
"planned additions" that in fact already exist in the artifacts. What remains open clusters
into one breaking clause (value spaces), one atom (null), one kernel token (discriminator),
a vocabulary batch, two record/map extensions, and one new spec part (evolution) — plus the
product-side work the reports sequence around them.


## 1. The inputs, briefly

**schema-mappings-synthesis.md** consolidates five schema-language mapping reports (JSON
Schema/OpenAPI, Protocol Buffers, ASN.1 X.680–X.683, Apache Avro, GraphQL SDL). Its headline:
five languages, four decades, and the kernel survived untouched — every construct landed on
existing machinery, an already-planned addition, or a principled decline. It carries the
cross-source scoreboard (§3), the four-cell sum-type taxonomy (§2), a shared five-stage
converter architecture (§5), a prioritized worklist (§6), and an encoding-leakage audit (§8)
whose deliverable is the one *breaking* candidate in the whole set.

**json-schema-to-tson-mapping.md (rev 2)** is the founding report: the construct tables, the
object-triage rule, the discriminator design (two jobs: inheritance → composition; dispatch →
choice + token), the tiered additions list (#1–#10), and the declined-by-design set (`not`,
`if/then/else`, `$dynamicRef`, constraint-intersection `allOf`). The OpenAPI addendum adds
format-registry integers, `readOnly`/`writeOnly` as derived request/response views, and 3.0
`nullable` normalization.

**protobuf-to-tson-mapping.md** finds the best-aligned source yet: messages ≅ closed records,
`oneof` ≅ OPTIONAL field group, typed map keys map directly, and all three presence
disciplines land on existing field states with matching injection semantics. Protovalidate
maps onto refinements nearly term-for-term; the strictness pitch inverts (TSON supplies the
constraint layer protobuf never had).

**asn1-to-tson-mapping.md** finds the deepest architectural kin (abstract/transfer syntax
separation ≅ the Part 1/2/3 structure): subtype constraints ≅ refinements, `CHOICE` ≅
REQUIRED field group, X.683 parameterized types ≅ templates (the first source exercising
them), and the X.681/X.682 information object system decomposing exactly onto the envelope
pattern + discriminator token, with closed object sets as `sealed`'s most concrete consumer.

**avro-to-tson-mapping.md** completes the sum taxonomy (wrapper-key unions ≅ the labelled
sum on the wire), makes the strongest functional case for the null atom (the `["null", T]`
idiom separates present-null from absent), and carries the report set's genuinely new item:
Avro's schema-resolution algebra as the model for a TSON **evolution/compatibility part** —
take the concepts (compat relation, rename bridge, deterministic default injection), refuse
the sharp edges (first-match coercion, silent numeric promotion).

**graphql-to-tson-mapping.md** scopes SDL as a capability schema, converts the input universe
fully and the output graph as model, and identifies the per-query compiler — (SDL, query) →
response-contract TSON schema — as the novel product. It is the fifth and loudest null-atom
corroboration (nullable-by-default is the language's default case), the first source
*mandating* float finiteness, and the source of the recursion admissibility hint (cycles
legal where a participating position admits absence).

**implementation-feedback.md** is spec feedback from building a Java implementation
(`io.ltr8.tson`) against Part 1 Revision 32 — see §2, because its status against Revision 33
is fully settled.


## 2. implementation-feedback.md: fully subsumed by Revision 33

This file was compared mechanically against the 59-entry feedback document adjudicated for
Revision 33 (`SPEC-FEEDBACK.md`). Result: **it is an earlier edition of that document's
entries 1–24** — same 24 entry titles verbatim, same problems, same suggested resolutions in
substance. The differences are confined to the "interpretation chosen" narratives, where the
adjudicated edition reflects a later state of the same implementation (refactored class names;
evolved policies — e.g. entry 5's interpretation advanced from "withhold `!email`" to
"implement it and ask the spec to scope the RFC 5322 pin"). Nowhere does this file raise a
problem the adjudicated edition lacks; where the editions differ, the adjudicated edition is
the richer one.

Every entry therefore already has a recorded disposition in REV33-CHANGELOG, and the executed
text covers even the later edition's added nuances — for example, Part 1 §5.5's `!email` row
now scopes the RFC 5322 pin to the `dot-atom "@" dot-atom` core with an explicit rationale,
which is precisely the "naming the RFC without scoping it leaves every implementation to pick
its own subset" complaint. Entries 4 and 7's request for reader-policy guidance (fail on
unrecognized type-refs by default, passthrough as opt-in) was dispositioned as a **guide
candidate** and remains on the guide's pending list (with #13) — carried below as a Revision
34 documentation item, not a spec item.

**No action for Revision 34 arises from this file beyond the already-carried guide
candidates.** If the implementation produces a fresh feedback batch against Revision 33, that
is a new input.


## 3. What Revision 33 already answers

The five mapping reports and the synthesis were written against Revision 32 and a set of
"planned additions." Measured against Revision 33 as executed, the following asks are
**answered** — the largest single result of this assessment.

### 3.1 Recursion (synthesis scoreboard #3) — the universal blocker, resolved

All five reports called recursion semantics the single blocking spec item ("three converters
queued behind it," then four, then five). Revision 33 landed the answer in Part 2 §5.10.1:

- **Productivity is a MUST.** A type must admit at least one finite value; a definition with
  no finite member is a resolver error at schema load. A recursive reference is guarded when
  every cycle passes at least one position that can terminate: an OPTIONAL field or tuple
  position, an array/map position whose floor admits emptiness or whose elements admit
  absence, or a choice with a non-recursive variant; a REQUIRED group terminates when one
  member is non-recursive. This is exactly the GraphQL circular-input admissibility hint the
  synthesis said to steal — generalized beyond nullability to every absence-admitting
  position, which is the right generalization for a language whose optionality is positional.
- **Regular recursion.** Recursive template applications must pass each parameter through
  unchanged — the standard regularity restriction, checked statically. This settles the
  synthesis's "templates × cycles" residue.
- **Choice-cycle disjointness terminates by construction.** Revision 33 replaced value-set
  disjointness derivation with **discrimination classes** (§5.4): a total, two-valued fact
  derived per type after following its reference chain. Class derivation does not recurse
  into bodies, so cyclic types pose no termination question — the synthesis's third residue.

Consequence for the worklist: the converters are **unblocked on recursion today**. Synthesis
§6's Part 2 item 2 is done; its converter sequencing no longer waits on spec work for this
item. (Recursive *discriminated* types remain on the worked-examples list — see §5.4.)

### 3.2 The disjointness substrate for the sum-type work

The reports' sum machinery was designed atop Revision 32's "MAY-prove, tag-free never
guaranteed" disjointness. Revision 33's discrimination-class model (§5.4) is strictly better
ground: disjointness is total and two-valued (classes: boolean / number / string / brace /
bracket), resolvers MUST record it exactly, and `@disjoint` is verified-or-error. The
discriminator token (#9) is *not* in Revision 33 (see §4.3), but two of its design points are
partially pre-paid: variant discrimination is already deterministic where classes differ, and
the token's job narrows cleanly to same-class variant sets (which is exactly the OpenAPI/
GraphQL record-vs-record case). Also aligned: Revision 33 **bans `void` as a choice variant**
(§5.4), matching the GraphQL report's careful note that bare `T` is `(T | null)` REQUIRED,
never `T?` — optionality is positional, and the type system now enforces the distinction the
report relied on.

### 3.3 The regex policy's spec half

The reports' regex ledger (translate when semantics-preserving; classify; fail loudly or
annotate-unenforced; I-Regexp stays normative) assumed a spec-side guarantee that didn't yet
exist. Revision 33 added it: the I-Regexp pin is a **strict subset gate**, and an
implementation MUST document any divergence from RFC 9485. The converter-side classifier
(ECMA-262 riskiest → RE2 friendly → XSD-flavored friendliest) is product work with its spec
dependency now met.

### 3.4 "Planned additions" that already exist in the artifacts

Several Tier 1–2 items the JSON Schema report proposed, and later reports repeated as
pending, are **already present** in the meta/kernel vocabularies (some since Revision 32; the
reports appear to have worked from an earlier artifact snapshot):

| Report ask | Status in Revision 33 |
|---|---|
| #2 `multiple_of` on decimal/number | Present: `decimal_type.multiple_of` (meta.tn) |
| #2 exclusive bounds uniform across numeric atoms | Present: `( min \| exclusive_min )` / `( max \| exclusive_max )` field groups on integer, decimal, float, rational vocabularies |
| #3 `unique_items` on ordered arrays | Present: `array.unique_items: boolean ~ false` (meta-kernel); `set` pins it `= true` |
| Float-specials *facets* | Present: `float_type.allow_nan / allow_infinity / allow_subnormal / allow_negative_zero` (all `~ true`) — GraphQL's mandated finiteness is spellable today as a refinement (`!float64 ^ { allow_nan: false  allow_infinity: false }`). What remains open is the **encoding-spelling policy** (protojson's `"NaN"` strings, Avro, JER) and possibly named core conveniences — see §4.4 |

These should be struck from the Revision 34 additions list and, when the reports are next
revised, corrected in their tables.

### 3.5 Vocabulary and hardening the reports lean on

- **`!email` and `!text`** are now Part 1 §5.5 rows (with the RFC 5322 subset scoped), and
  the **full sixteen-member integer family** is in §5.6 — the `format`/protovalidate upward
  mappings (`email/uri/uuid/ipv4/ipv6` → validated types) now match the schemaless vocabulary
  they cite.
- **Injection and field states.** The reports' presence mappings (proto `IMPLICIT` →
  `~ zero`; ASN.1 `DEFAULT` → `~ v`; Avro defaults; GraphQL input defaults; JSON Schema
  `default` → non-injecting annotation) rest on `REQUIRED_DEFAULT`'s decode-injection
  semantics — vindicated as designed, per the synthesis. Revision 33 tightened the machinery
  around them: the five-states clarification (OPTIONAL_FIXED never injected), parametric `=`
  fixation at materialisation, and `_` at REQUIRED-family positions as a validation error.
- **Deterministic verdicts.** The warn-tier sweep (every warn-level rule resolved to an
  error or a deletion) plus Part 1's duplicate-field/map-key MUST-reject (three-layer key
  identity) and the encoding-error rule (invalid bytes are lexer errors, no U+FFFD) give the
  converters' canonical-strict profiles a spec floor with no implementation-defined wobble
  underneath — directly serving the protojson duplicate/unknown-member and lexical-cluster
  items in synthesis §4.
- **Templates, ready for X.683.** The ASN.1 report is the first to exercise templates, and
  Revision 33's structure-templates overhaul is what it will actually target: labelled-only
  constructor parameters, level discipline, every-application-materialises with structural
  identity, instance-form templates (`vector => <T, N> !array { … }` is now the worked
  example in §5.10), and synthetic/instantiation entries that merge under transitive import.
  Monomorphization-by-materialisation is now fully specified, including the recursion rules
  above.
- **Transitive imports** (§2.2.3) serve the reports' companion-module recommendation
  (`proto.tn` beside `core.tn`): a converter-emitted schema chain composes without manual
  re-export lists.
- **Annotations have teeth — and a consequence.** Revision 33 made annotation conformance
  normative and an **unresolved annotation a resolver error**. This is good news for the
  provenance vocabulary's reliability and a forcing function for its packaging: the reports'
  annotation families (`@field_number`, `@tag`, `@wire`, `@reserved`, `@branch_order`,
  `@version_bracket`, `@proto_name`, `@graphql_id`, `@enum_number`, `@package`, `@precision`,
  `@spelling`, …) can no longer ride as ad-hoc names — they need a declared home the emitted
  schemas chain to. See §4.4.

### 3.6 A re-baselining caution

The reports' TSON spellings are Revision 32's. Under Revision 33: the size templates
(`array_min`/`array_max`/`array_ranged`) are gone — `[T; N..M]` is constructor sugar
desugaring to an `!array` binding record; `vector` is a user-template *example*, not a core
type; every sugar form lifts to a synthetic entry; and resolved output for any converted
schema will carry `@synthetic`-marked internal entries. None of this changes the mappings'
*substance*, but their TSON-side example spellings and §A construct lists should be
re-baselined against Revision 33 before any of their text is quoted into normative drafting.
(The reports are in review and are not modified by this document.)


## 4. What remains open — the Revision 34 candidate set

Ordered per the synthesis worklist, adjusted for §3.

### 4.1 The value-space clause, the `bytes` collapse, and `token` re-grounding (synthesis §8)

The encoding-leakage audit is the one **breaking** candidate and the reports' own item 1.
The deliverable is a short normative clause — *types denote value spaces; encodings define
lexical spaces and one canonical form per type; equality, ordering, refinement, disjointness,
and content addressing are defined over value spaces only* — plus its consequences:

- **Collapse `base64`/`base32`/`hex`/`base64url` into one `bytes` atom** (they are four
  spellings of one octet-string value space); per-encoding lexical/canonical forms; non-default
  spellings become a non-semantic `@spelling` annotation. Payoff: content addressing becomes
  encoding-independent — the property hash-pinning should have and currently doesn't if
  `base64` ≠ `hex`. This also fixes the JSON Schema report's identified live bug
  (`contentEncoding: base64` conflating "bytes spelled as base64" with "text containing
  base64").
- **Re-ground `token` as pattern-refined `text`** — unquoted-spelling privilege becomes a
  lexical rule of the text encoding, not a type.
- **Define time types and `uuid` as value spaces** with RFC 3339 / canonical-hex as lexical
  forms — which is also where the zone-less and calendar-duration decisions (§4.4) belong,
  as *legitimate* value-space distinctions.
- **One sentence on sized integers**: `int8`…`uint256` are range-refinement aliases, not
  storage widths. (Their Revision 33 §5.6 definitions are already range-stated; core should
  say the principle.)

Interactions with Revision 33's carried-open items: this **is** the revisit that carrying
#11 (the `binary` name and bucketing, left unchanged in Revision 33 "expected to be revisited
later") anticipated — the collapse answers it. It also strengthens the case in carried #26
(hash-pin placement): once hashing is defined over canonical value spaces, the pin-spelling
question (`?sha256=` query vs fragment vs structured directive) should be settled against
that definition in the same revision. Facet-kind hygiene: the audit's per-type canonical-form
machinery should be classified under §5.7's facet-kind taxonomy (an encoding's canonical form
is not a facet; `@spelling` is annotation, resolver-invisible — say so explicitly).

Do this first: it is cheapest before anything else lands, and the time/float/oid items below
depend on its vocabulary. Draft-stage cost is one breaking rename plus definition rewording.

### 4.2 The null atom (#4) and §7.3 tightening

Five corroborations, unanimous, with Avro's two-spelling optionality idiom and GraphQL's
default case as the functional forcing arguments. Scope for Revision 34:

- A first-class `null` atom distinct from `void`/absence, completing the present / absent /
  null triad (`email: (null | text) ~ null` must be spellable and mean what Avro's idiom
  means).
- **Tighten Part 2 §7.3's null-at-`void` concession in the same revision** — the reports are
  explicit that the concession's safety argument (void has one inhabitant) changes once
  `null` is a real value elsewhere.
- Sequencing: land before literal-valued enums (§4.4), since real-world heterogeneous enums
  include `null`.
- Design attention: base type resolution (Part 1 §4.1) already resolves the bare token
  `null`; the atom must compose with that without forking schemaless and schema-governed
  readings. The GraphQL nullability tables (all four list-wrapper combinations) and Avro §B's
  strict-document vs resolution-aware pair are the acceptance tests.

### 4.3 The discriminator token (#9)

The one kernel addition, "fully designed" per the JSON Schema report §E9 and unchanged by
subsequent reports: a Record/choice attribute naming a single dispatch field; the mapping
table is *derived* from per-variant `REQUIRED_FIXED` pins (pairwise-distinct, resolution
error otherwise); **materialization** (the pinned field loses omission privilege — present in
every encoding); the `!variant` tag demoted to assertion (must agree; mismatch is a
validation error); `REQUIRED_FIXED` only, no defaulted discriminators; declarable on the
choice or a composed-from parent. Revision 34 work is the normative text, now written against
the discrimination-class model (§3.2): state precisely how a declared discriminator composes
with class-based dispatch (classes decide where they can; the token governs same-class
sets and open-set positions), and work the deferred examples — recursive discriminated
types, choices over choices. ASN.1's `UNIQUE` and the Apollo/Relay injection convergence are
the corroboration to cite in rationale (guide material).

### 4.4 The vocabulary batch (Tier 1–2, minus what §3.4 struck)

What genuinely remains:

- **Literal-valued enums** beyond `token` (integers, mixed scalars, `null`) — after §4.2.
  Feeds discrimination: state their class treatment explicitly.
- **`contains` / `minContains` / `maxContains`** — a genuinely **new facet class**
  (existential quantification over elements). Extend §5.7's facet-kind taxonomy with the
  class and its refinement direction (tightening = raising the floor / lowering the
  ceiling); this is the one Tier-2 item with resolver-semantics wording to write.
- **Decimal `precision`/`scale` facets** on `decimal_type` — Avro decimal now, SQL
  inevitable. Classify per §5.7 (ordered facets).
- **`oid` core type** — dotted-integer value space with canonical text form (per §4.1's
  framing); earns its place as `uuid` did; doubles as the natural discriminator value type
  for ASN.1 envelopes.
- **Time decisions, decided once, as value spaces**: zone-less/local timestamps (Avro
  `local-timestamp-*`, ASN.1 GeneralizedTime local forms) and calendar duration (Avro's
  months/days/millis triple vs core `duration`'s model — verify what core's model admits and
  say so). Both are new-or-clarified value spaces, not spellings — legitimate under §4.1.
- **Float specials, the remaining half**: the *facets* exist (§3.4); decide the named-
  convenience question (a core `finite_float64`-style refinement, or leave it to authors)
  and, when encodings return to scope, the per-encoding spelling policy (`"NaN"` strings
  etc.) — the latter is part-3 material, note it now.
- **Byte-counted string length facet** — optional; admit only on corpus evidence
  (protovalidate `min_bytes`/`max_bytes`), else keep drop-with-report.
- **The annotation vocabulary, with a home.** Two sub-decisions forced by Revision 33's
  unresolved-annotation rule (§3.5): (a) *where these names live* — recommend a conversion
  companion schema (e.g. `conv.tn`, or per-source modules `proto.tn`, `asn1.tn`) rather
  than core, keeping provenance out of the interchange core; (b) *the rename bridge's name*
  — Avro's `aliases` is the right shape but **`@alias` is taken** (Revision 33 uses it for
  reference flattening in resolver output, a different animal, as the Avro report itself
  notes). Pick a distinct name (e.g. `@renamed_from`) in the evolution part's vocabulary
  (§4.6) and reserve it now so converter report wording can stabilize. JSON-Schema
  annotation carriers (`@title`, `@examples`, `@read_only`, `@write_only`,
  `@content_media_type`) and `@spelling` (§4.1) round out the batch.

### 4.5 Rest field (#7) and `requiredKeys` (#8)

Tier 3, unchanged in design by the later reports (and pointedly *not* asked for by protobuf,
ASN.1, Avro, or GraphQL — openness remains a JSON-Schema-ism, which the synthesis reads as
confirmation the design is contained correctly). The rest field keeps records closed in the
model (an ordinary declared `map<text, X>` field; openness is purely a JSON-encoding
flatten/collect transform); its dispatch rule depends on the discriminator existing, so
sequence after §4.3. `requiredKeys` is the map-side dual (presence obligations on a
homogeneous map, deliberately without per-key types). Revision 34 items to settle in the
text: rest fields under composition chains (at most one per chain), encode-side collision
errors, and the tag-free-dispatch exclusion (rest-field records dispatch only via a declared
discriminator). Note a Revision 33 interaction to state: the catch-all field's map type
lifts to a synthetic entry like any other form — no special carriage needed.

### 4.6 The evolution/compatibility part

The largest genuinely new item (Avro §E; retroactively unifies the proto open-enum flags,
the ASN.1 extensibility flags, and gap #6's re-conversion diffing). Not a kernel change — a
new specification layer over resolved schemas:

- A **compatibility relation** between two resolved schemas ("every document valid under
  writer W is valid under reader R after a defined transformation"), checkable with existing
  machinery: field-state comparison (adding OPTIONAL or REQUIRED_DEFAULT is
  backward-compatible; adding REQUIRED is not), enum-set widening/narrowing, refinement
  loosening/tightening. Revision 33 helps here: resolved output is now fully canonical
  (synthetic entries, structural identity, R8's resolved-output conformance tier), so the
  relation is defined over stable, comparable artifacts.
- A **rename bridge** as declared metadata on the new schema (name pending — §4.4).
- **Explicit-never-silent**: compatibility checking may report "int matches long by
  promotion"; validation never silently promotes.

Recommendation unchanged from the reports and worth honoring: **spec the vocabulary early
even if the part ships late** — three converters' report-flag wording depends on it, and
retrofitting phrasing after divergent shipping is the expensive path. A Revision 34
deliverable of "terms and relation definitions" (even without full conformance text) would
suffice.

### 4.7 `sealed` (#10) — keep deferred, commission the census

Both new evidence sources are now concrete (ASN.1 closed vs extensible object sets; GraphQL
unions sealed vs interfaces open — one language with both cases as constructs). The deferral
logic still holds (additive later; retracting a kernel guarantee is worse). Revision 34
action: no spec text; **commission the Stage-5 corpus census** (object sets + union usage)
so Revision 35 can decide with data, and settle the two recorded open questions
(instantiability of a sealed parent; enforcement scope across schema chains) as census
questions.

### 4.8 The namespacing decision

One dotted-name policy serving proto packages, ASN.1 modules, Avro namespaces, and GraphQL —
"decide once" per the synthesis, still undecided. Dots are already legal in unquoted type
names, so this is convention plus (possibly) a reserved-annotation for the source namespace
(`@package` family). Small, but it blocks converter output stability; decide in Revision 34
even if the answer is "convention only, no spec text."

### 4.9 Product-side items with spec touchpoints

Not Revision 34 spec scope, but sequenced around it and worth tracking in the changelog:

- **The machine-readable conversion-report schema** — itself a TSON schema, the Stage-1
  deliverable; its flag vocabulary should wait for §4.6's terms.
- **Canonical-strict profiles** per encoding (protojson, Avro JSON, JER, GraphQL's 2×2) —
  part-3-era documents; the §4.1 clause is written to give them their vocabulary.
- **The GraphQL per-query compiler** — the identified novel product; reuses records, choices,
  the token, and the null atom; zero kernel asks.
- **Converter order** (synthesis §6): JSON Schema → protobuf+protovalidate → Avro+Registry →
  GraphQL input-universe then per-query → ASN.1/X.509 pilot. With recursion answered (§3.1),
  the stated gating shifts to the null atom and, for the JSON Schema converter's discriminated
  cases, the token.


## 5. Interactions with Revision 33's carried-open items

Revision 33 deliberately carried four questions; the inputs bear on three:

- **#11 (binary bucketing/name)** — answered in direction by §4.1's `bytes` collapse; fold
  the carried item into that work.
- **#26 (hash-pin placement)** — the synthesis's content-addressing-over-value-spaces
  argument raises the stakes and should be resolved alongside §4.1; the external-review
  options (fragment; structured directive) remain the candidates.
- **#54 (type-argument literal identity)** — touched by literal-valued enums (§4.4): when
  enum members extend beyond `token`, the "bare token vs typed value" identity question
  recurs in argument lists; resolve together.
- **#12 (PnW)** and **#34 (UTS #39 restructure)** — no new input; carry forward on their own
  merits.

Guide candidates #4, #7, #13 (reader policy for unrecognized type-refs; annotation-recovery
guidance; diagnostics conventions) remain pending for a guide pass; the reports add guide-
grade material of the same kind (the SET OF multiset note, envelope-vs-flattened trade-offs,
the discriminator convergence story) — batch them.


## 6. Recommended Revision 34 sequence

1. **Value-space clause + `bytes` collapse + `token` re-grounding** (§4.1), folding in
   carried #11 and settling carried #26 in its light. The one breaking change; do it first
   and alone in its own commit-equivalent so the diff reads clean.
2. **Null atom + §7.3 tightening** (§4.2), with Part 1 base-resolution composition stated.
3. **Discriminator token normative text** (§4.3) on the discrimination-class substrate,
   including the deferred worked examples.
4. **Vocabulary batch** (§4.4): literal enums (after 2; resolve carried #54 with it),
   `contains` facet class (+ §5.7 taxonomy extension), decimal precision/scale, `oid`, time
   value-space decisions, float-specials conveniences, annotation home + rename-bridge name
   reservation.
5. **Rest field + `requiredKeys`** (§4.5), after 3.
6. **Evolution part: vocabulary and relation definitions** (§4.6) — terms now, full part
   when ready.
7. **Decisions without text**: namespacing convention (§4.8); `sealed` census commissioned
   (§4.7).
8. **Editorial**: re-baseline the five mapping reports and the synthesis against Revision 33
   (§3.4's corrections, §3.6's spellings) before any of their text informs normative
   drafting; batch the guide candidates.

Items 1–3 are the load-bearing sequence; 4–5 are parallelizable behind them; 6–8 can proceed
independently.


## Caveats

- The seven inputs are in review and unmodified; this document reflects their current text
  and may need revision if they change.
- Section references into the inputs use their own numbering; references into TSON use
  Revision 33's. Where an input's claim about the Revision 32 artifacts proved stale
  (§3.4), this document reports the Revision 33 state and flags the correction rather than
  adjudicating how the discrepancy arose.
- "Answered by Revision 33" means the spec text exists; it does not assert the reports'
  authors would accept the answer — re-review of the recursion, disjointness, and regex
  clauses by the mapping-report track is the natural next check.
- The recommendations are the editor-input synthesis of the documents' own worklists,
  adjusted for the Revision 33 baseline; they are candidates for Revision 34 planning, not
  adjudicated dispositions.
