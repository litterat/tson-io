---
title: "TSON 2026 Revision 35 — Change Log"
against: "TSON 2026 Revision 34 (Working Draft)"
status: "Adjudicated 2026-09-04; second pass 2026-09-05 (§8). Part 1, Part 2, the developer guide and the six companion artifacts are updated; the hash chain is re-stamped and Part 2 §13.2 carries the final pins."
inputs:
  - "SPEC-FEEDBACK.md (36 entries, against Revision 34)"
  - "Revised companion artifacts at /2026/35/ identities: meta-kernel.tn, meta.tn, core.tn and resolved fixtures (implementing #4, #7, #23, #24, #25, #26, #28, #29, #31, #32, #36)"
  - "SPEC-FEEDBACK.md, renumbered against Revision 35 (8 entries: #1–#4 carried, #5–#8 new), with the artifacts revised a second time (§8)"
---

# TSON 2026 Revision 35 — Change Log

This document records the changes accepted into Revision 35 of the TSON specification
series, adjudicated from the implementation's spec-feedback register (36 entries, renumbered
from #1 against Revision 34: the eight Revision 34 left open, and twenty-eight raised since).
SPEC-FEEDBACK.md remains a record against Revision 34 and is not modified by this revision;
each of its entries receives a disposition here.

Provenance markers used in the disposition table:

- **[settled]** — the resolution was settled by the spec author inside the feedback
  register itself, is already implemented in the revised companion artifacts shipped with
  this revision, or was decided by the revision editor at adjudication.
- **[open]** — a genuine design decision deliberately left open. Collected in §5.

This is the first revision to change the lexer since the Class 1 freeze was declared
(Part 1 §1.3). It does so under principle 7 — a 2026-series revision may change anything —
and does it in one revision, with #7 and #8, so that nothing is published against the
frozen claim in between.

---

## 1. Baseline: the revised artifacts

Eleven of the register's proposals arrived already implemented in the companion artifacts,
and Revision 35 adopts them as its baseline. Summarising the normative effect:

- **#36 — no `~` marker, no `constructor` field.** Applicability is IS-A `top` (§4.1): a
  head is applicable exactly when it describes a type rather than a part of one, which
  admits the base kinds and `reference` and refuses `record_field` and its siblings. The
  `~` marker leaves the schema grammar; `type_definition.constructor` leaves resolver
  output; §4.2's level discipline dissolves into §2.2.2's placement rule. (Part 2 §2.2.2,
  §3.3.1, §4.2, §5.5, §8.1, §12.1; all six artifacts.)
- **#32 — a reference is a hop.** Use-site flattening and the `alias` annotation are gone.
  Resolved output states a reference chain as written; a processor collapses it when it
  compiles readers, after linking, never in output. (Part 2 §8.2, §8.3; meta-kernel, core,
  all three fixtures.)
- **#7 / #23 — no base type resolution under a schema.** The kernel's `value` is the token,
  uninterpreted, read by the type the position hands it to; base type resolution applies
  only in schemaless documents; a `value` position is not a scope. `null` is no longer a
  value the kernel names. (Part 1 §4, §5.1; Part 2 §4.2, §7.1, §7.3; meta-kernel.)
- **#23 — `scoped`.** meta.tn replaces `extern` and `unknown_type` with one sum constructor,
  `scoped => sum & { scope: set<scope_kind>  schemas: {uri => [type_name; 1..]?; 1..}? }`,
  and `scope_kind => !enum [LOCAL EXTERN]`. core.tn declares `declared`, `extern` and
  `dynamic` over the three admitting subsets and two templates, `extern_of<S>` and
  `extern_type<S, T>`; `unknown` is gone, and `dynamic` is its successor under a narrower
  meaning. (Part 2 §4.1, §5.4, §7.8, §8.1, §9; meta, core, fixtures.)
- **#24 — `members`.** The kernel declares `integer_member_set => !set_type { element_type:
  integer }` and `integer_type` gains `members: integer_member_set?`; meta's `decimal_type`
  gains `members: set<value>?`, its elements read under the constrained atom before the set
  is formed. `float_type` takes none. (Part 2 §5.7, §7.4, §9; meta-kernel, meta.)
- **#25 — `@discriminator` and `@rest`.** meta.tn declares `discriminator => @annotation
  field_name` and `rest => @annotation void` as *checked* representation directives in the
  choice-based shape, with their load-time checks stated; and its header states the
  annotation criterion — an annotation never changes a value, its type, or its validity;
  it may add a load-time check and may direct how a class of encodings represents a value.
  (Part 2 §6, §9; meta.)
- **#26 — `duration` / `period`.** One ISO 8601 duration becomes two atoms: `duration` is
  elapsed time, a signed exact decimal number of seconds, TOTAL; `period` is a calendar span,
  a signed integer number of months, TOTAL. All temporal families state their bounds as
  §5.11 groups with exclusive forms. meta.tn gains `title`, `examples`, `read_only` and
  `write_only`. (Part 1 §5.4; Part 2 §5.5, §5.7, §9; meta, core, fixtures.)
- **#28 / #31 — value spaces stated per family.** Every atom `@doc` in meta and core now
  names its value space and what a spelling is: `bytes` is octets; `time` and `datetime`
  are instants on the UTC timeline (TOTAL, the offset a spelling, `-00:00` the same instant
  as `Z`); `number`'s scale is not part of the value; `rational` is the fraction; `duration`
  is seconds with both ends fixed at a signed 64-bit count of nanoseconds. This settles the
  temporal question #28 reported as answered opposite ways by one processor. (Part 2 §5.5,
  §9; meta, core.)
- **#29 — `bytes_type`.** meta.tn replaces `binary` with `bytes_type => atom & { encoding:
  bytes_encoding ~ BASE64  length  min_length  max_length }`; core replaces `base64`,
  `base64url`, `base32` and `hex` with one `bytes => !bytes_type { encoding: BASE64 }`.
  `encoding` is a selector that never narrows and is never refinable; another alphabet is
  another instance. (Part 1 §5.3; Part 2 §5.5, §5.7, §9; meta, core, fixtures.)
- **#4 — open entries in resolved output.** The fixtures answer the question the register
  asked: an open entry *is* carried as a `type_definition`, its `body` the held application
  — as the second pass settled it (§8, #5), a `!template { parameters  template }` holding
  the application as text, compared as the parsed form and never as bound values. Revision
  34's "no `type_definition` could carry it" is therefore the sentence that moves. (Part 2
  §1.3, §5.10, §8.1; fixtures.)

The artifacts also carry housekeeping the register did not raise, adopted here on the same
footing:

- **`set` → `set_type`, and the `set<T>` template.** The kernel's set constructor is
  `set_type`, a refinement of `array` whose `min_items` now carries a *default* of 1 (a set
  is non-empty unless the author asks otherwise); `enum_set` and `integer_member_set` lean
  on it. meta.tn and core.tn each declare `set => <T> !set_type { element_type: T }`, so a
  field reads `tags: set<text>`; the two are siblings on `void`'s pattern.
- **`non_negative_integer` in the kernel.** Every facet that counts — lengths, item counts,
  digit counts, bit widths, prefix lengths, precision — is typed by it; `integer_size.bits`
  and `multiple_of` included, with `bits > 0` and `multiple_of > 0` as coherence checks.
  Core keeps its sibling under the same name.
- **One rule for `multiple_of`** across `integer_type`, `decimal_type`, `rational_type`,
  `duration_type` and `period_type` — strictly positive, sign of the value ignored, a
  refinement tightens only to an integer multiple — and **one rule for `members`** — every
  member satisfies the body's other facets, a refinement only shrinks the set.
- **`complex_component` is a partial order**, `INTEGER ⊂ NUMBER ⊂ RATIONAL` and `FLOAT32 ⊂
  FLOAT64` with the two families incomparable, and a refinement may move `component` only
  down it. `!complex ^ { component: FLOAT64 }` is refused; a float complex is its own
  instance. This closes the third case #29 raised and declined to solve.
- **The text class of encodings.** The artifacts' docs describe value spaces without
  reference to any encoding and name TSON text where they mean it; JSON is treated as a
  second member of the text class. This is the stance #8's removal of the superset claim
  leaves, stated where the types are.

---

## 2. Disposition summary

| # | Entry (abridged) | Disposition |
|---|---|---|
| 1 | `!duration` row shows designators the type lacks; no `!period` row | **Accept** — the §5.4 table gains the two rows as proposed and the three sentences: the week form stands alone (`P1W2D`, `P1WT1H` are errors); a week is 7 days and a day 86400 s, so `P2W`, `P14D` and `PT336H` are one value and the week form belongs to `duration`; a text encoding emits `PTnHnMnS`, the week and day designators being accepted and not produced. Closes the question carried since Revision 33. [settled — artifacts] |
| 2 | Hash pin in the URI query | **Accept (a): keep the query form, and say why** — §2.2.1 gains the two sentences (the pin rides in the query so it reaches the origin and the cache, where a content-addressed store can act on it; canonical identity strips it because a pin identifies bytes where the rest of the URI identifies a resource) and **reserves the fragment**: no part of a schema identity, held for a later intra-document reference. (b) fragment and (c) structured directive value are recorded as considered and declined on the register's argument. Closes the question carried since Revision 33. [settled] |
| 3 | Every schema mints its own lift targets | **Declined (kernel declaration)** on the register's own four reasons; **accept the sentence** — §8.2 states outright that synthetic entries are an implementation's own: names resolver-chosen, shape unconstrained beyond producing the required resolved output, free to mint, share or normalise. [settled] |
| 4 | §8.1 both forbids and specifies a parameter reference in a `type_definition` | **Accept — the other way round.** The fixtures carry open entries as `type_definition` values with a non-empty `parameters` list and a held body in wire form, and the kernel's `schema => {type_name => type_definition}` types that without a second value shape. So "no `type_definition` could carry it" is deleted; "Reading parameter references" stands as the rule for exactly that entry; §5.10's closed-entry rule stays a well-formedness rule on output, now with something to be contrasted against; ingest of an open entry re-resolves the held body as source, stated as such. §1.3's consumer tier is restated: a consumer of closed entries reads `parameters` empty and never meets a held body. **Typed template parameters** are recorded as the direction, not taken (§5). [settled — fixtures] |
| 5 | §11.4 omits a template's parameters as a scope | **Declined (the scope)** — the population is empty and the list stays reviewable; recorded as considered. **Accept the clarifying sentence** in Part 1 §8.2: mechanisms 2 and 3 are per-name and need no scope; only mechanism 1 operates over a named scope. [settled] |
| 6 | "UTS #39 data version" is not a version anything publishes | **Accept** — both places say "the Unicode Character Database (UCD) version of the data files". [settled] |
| 7 | `null` is a second spelling of absence only Class 1 can see | **Accept — `null` is removed from the notation.** Part 1 §4.1 deleted; §4.5's order is boolean → number → string; the "distinct from null" clauses in §2.9 and §4.4 and the "use quotes" sentence go; §7.7 rule 3 holds without qualification. Part 2: `value` admits boolean, integer, float and string; `void` admits `_` alone, the §7.3 concession paragraph goes; §5.4's rationale and §9's restatement lose the absent-versus-null clause. **A language change:** a bare `null` in schemaless data is the string `null`. [settled — artifacts] |
| 8 | Removing `null` falsifies §6 and principle 5 | **Accept** — §6 and principle 5 deleted, and the rules that existed only for them: `\/` leaves the escape table; the character escape becomes `"\u" ( 4HEXDIG / "{" 1*6HEXDIG "}" )` with one constraint, the value denoted is a Unicode scalar value, and the three surrogate MUST clauses and §6's second exception go with it; §6's first exception folds into §7.2 as the rule it is; BOM acceptance restated under §7.1 on its own authority; `\b` and `\f` stay. The JSON note under Part 2 §9 becomes a statement of scope: a JSON document is read through a JSON reader, which maps JSON `null` to absence and JSON numbers to `number`, and is not a TSON document. §1.3's lexer freeze is restated as holding from this revision. [settled] |
| 9 | A Class 1 field name is lexical for JSON's sake | **Accept — a field name is an identifier at every layer.** `field-name = unquoted-token / single-line-token` keeps both spellings; the decoded text is matched against §7.7 after NFC normalisation, as an annotation name's is. Two sub-questions settled: **normalisation runs before the match** — §2.5's NFC-comparison identity rule governs, and a decomposed spelling is a duplicate-field error, never a malformed name; and §8.2's mixed-script illustration is **replaced by a single-script pair** (`pass` / Cyrillic `раѕѕ`), with a sentence that a within-word mixed script is caught by the restriction level before mechanism 1 sees a pair. Deletions: §2.5's "lexical" paragraph, §7.7's "field names are lexical at this layer" and rule 3's `"_"`/`"_id"` carve-out, §8.2's field-name distinction, §1.5's per-class check list. **A language change:** `{ "first name": 1 }`, `{ _id: 1 }` and `{ 42x: 2 }` are parse errors; a key that is not a name belongs in a map. [settled] |
| 10 | Optional commas and the trailing-separator ban | **Accept (b)** — §2.4 reads: values are separated by whitespace, a comma, or both, and *a comma may follow a value*. `[1, 2, ]` is admitted; `[, 1]` and `[1, , 2]` fail as a missing value. The argument stated in §2.4 is the one that matters: TSON has no elision, so a trailing comma cannot mean an absent element, which is why RFC 8259's ban had no problem here to prevent. Applies throughout the series, so `[text, int32, ]` and `pair<uuid, B, >` are legal in §12.1's lists, and §2.4 says "trailing comma", not "trailing separator". [settled] |
| 11 | Do `true`/`false` keep keyword status? | **Accept (keep)** — §4.2 states why in the register's order: BOOLEAN is a discrimination class only because §4.5 matches the two tokens ahead of the number grammar, so a Part 1 edit here would change a derived `disjoint` fact in Part 2 §5.4; secondarily, a boolean is a value a Class 1 read produces and a consumer stores. §7.7 rule 3 then has two words to explain, both members of a kernel enum. [settled] |
| 12 | Near-miss numeric tokens fall through to string | **Accept (keep, and say so)** — §4.4 states the fall-through is deliberate and names the two mechanisms that do know what a token means (a `!`-annotation in Class 1, a declared type in Class 2); §4.3's leading-zero prohibition is restated on its own authority — a zero-padded token is data whose zeros are significant, so `007` is a string because it is one — rather than as an inherited number-grammar rule. The digit-initial boundary table is recorded as the reason no sharper rule exists. [settled] |
| 13 | Records and maps share `{ }` because JSON objects do | **Accept (keep)** — §2.8 gains one sentence saying the shared brace stands on its own merits, so a later reader does not find the last JSON-shaped rule in the grammar and assume it was missed. [settled] |
| 14 | Per-refusal data version; refusal on a channel of its own | **Accept** — §8.2's MUST becomes a property of the *report*: a processor MUST make available, with any report containing a refusal, the UCD version and the policy it was judged under, and SHOULD make both available independently of any report. §8.1's MUST NOT becomes MUST-be-distinguishable: a refusal is reported in the same report as the four categories, told apart by the rule that refused, and is not a claim that the document is invalid; a conforming processor may legitimately not refuse at all. [settled] |
| 15 | "Name policy" and "token policy" undefined | **Accept** — §8.2 defines **identifier policy** (mechanisms 1 and 2, and the level and unit of mechanism 3, applied at identifier positions) and **token policy** (a restriction level applied to every token off the stream), and states the subsumption. Every other use of "name" stands. [settled] |
| 16 | §8.2's policy has no artifact | **Accept (minimal), remainder open** — §8.2 states that the policy is not a property of a schema and is not carried by one (self-certification and immutability, the two reasons the register gives), and that skeleton distinctness not composing across `!!import` makes it a property of the importing site. The deployment-descriptor artifact kind, its two constraints and the `.well-known` discovery are carried open (§5). [settled / open] |
| 17 | No out-of-band way to name a governing schema | **Open (carried)** — the `TSON-Schema` field and its four points are recorded in §5 and not defined by this revision. |
| 18 | No shorthand for a template application at a `type_ref` slot in data | **Accept (options 1 and 2)** — §8.1 states that the positional sugar is schema syntax only, so a data-position reference with arguments uses the explicit record; §8.2 recommends the alias (`order_page => page<order>`) as the spelling that gives an application an identity. Option 3 declined. [settled] |
| 19 | A namespace should be a value | **Open (carried)** — deliberately, per the register: a question about what the kernel's 2×2 is for, not an addition. Recorded in §5 with the operator argument. |
| 20 | An ungrounded parameter is refused, but its kind is forced | **Accept** — the mutual-recursion sentence is deleted from §5.10 and its consequence stated: a parameter with no kind-determining use is a type parameter, since a value parameter is one that stands in a scalar slot. `loop => <T> loop<T>` is refused for applying itself forever, not for its parameter. [settled] |
| 21 | Should base type resolution recognise `date`? | **Accept (no, and record why)** — §4.5 states beside the order that §4 classifies *host base types* — what a schemaless read hands back with no library type behind it — where §5 classifies *semantic types*, reached deliberately by annotation; §5's text-form families gain a cross-reference to §5.11's labelled form as the shape for a choice that would otherwise carry a mandatory tag. [settled] |
| 22 | §5.4 asserts one property and derives another; no fallback after discrimination | **Accept both** — `@disjoint` is stated in the derivation's terms (the variants are distinguishable by the encoding's form resolution; overlap in inhabitance is ordinary, `text` beside any scalar being the common case); and one sentence names the consequence: a constructor narrower than its base-type class leaves values of that class unreachable in any untagged choice it appears in, with the cross-reference from §5's vocabulary. [settled] |
| 23 | `unknown` has no reader; `extern` names one schema | **Accept** — the baseline above. Part 1 §4's applicability clause becomes "base type resolution applies only in schemaless documents"; Part 2 §7.1's "legal but vocabulary-only" root and its validator MUST are deleted (under `!!schema` the root names its type or the document is invalid); §7.8 is rewritten around `scoped`: the five-row table, the data rule (a value's own shape picks the cell; a value naming no type at a scoped position is a validation error), and the permissive list becomes a derived fact — a position admits a nested `!!schema` exactly when its type resolves to a `scoped` instance whose `scope` holds `EXTERN`. `value` leaves the permissive list. [settled — implemented] |
| 24 | No spelling for a sparse numeric value set | **Accept** — the baseline above. §7.4's sentence now covers the space: a contiguous range is `min`/`max`, a progression is `multiple_of`, a sparse set is `members`, a choice is for alternatives that are not one family. Two sentences added where the coherence check is stated: every member satisfies the body's other facets, a derived width included; and a `value`-typed member is read under the atom it constrains before the set is formed. [settled — implemented] |
| 25 | No way to name a discriminator or a rest field | **Accept (choice-based shape, as shipped)** — §6 gains (a) the checked-annotation category, (b) that a checked declaration annotation is honoured at either of §6's two positions, the criterion (an annotation is the right home exactly when it changes no value's validity) and the licence (force confined to the encoding class that claims it; text keeps `!variant` at every non-disjoint choice). The two checks are stated as meta.tn states them. **(c)** §5.8/§8.1 gain the rule owed either way: a restated field's annotations are the restatement's own, in source order, followed by the inherited field's, in source order; a restatement adds and never removes. The field-based shape is recorded as considered; the annotation-cardinality option is named, not taken. [settled — implemented] |
| 26 | Temporal families have no exclusive bounds; `contains`; `unique_items`; doc annotations | **Accept 1 and 4, withdraw 2, no change 3** — problem 1 by the split (baseline), with the bound groups on all five temporal families; §5.7 gains the sentence that an ordered-bound facet requires a totally ordered value space, which every family now satisfies. Problem 4 by the four annotations, `read_only`/`write_only` as void presence markers, both on one field a schema-load error. Problem 2 withdrawn on the register's own argument (a validation-language applicator, against the reader model); the restricted form is recorded as worth writing up. [settled — implemented] |
| 27 | §7.5's implementation-defined set order and comparison MUST | **Declined** — §7.5 is unchanged: set order stays implementation-defined and the comparison MUST stays. The register's divergence is recorded as such. |
| 28 | No equality contract for atoms whose value space differs from their lexical space | **Accept** — §5.5 gains the clause: *a type denotes a value space; an encoding defines a lexical space and one canonical form per value; equality, ordering, refinement, disjointness and content addressing are defined over value spaces only*, with cross-references from §7.5's duplicate rule and Part 1 §2.6. The per-family lines are in the artifacts (baseline), and the temporal families are settled as instants. [settled — artifacts] |
| 29 | `binary`'s alphabets are four nominal types over one value space | **Accept** — the baseline above. §5.7's selector clause is rewritten: a selector's admissible moves under refinement are its stated narrowing relation among members — a width chain for `size`, a partial order for `complex.component`, and *none* for `bytes.encoding`, which a refinement may neither set nor change (another alphabet is another instance). The set-from-default permission is deleted; `binary`'s `encoding` leaves the examples. Part 1 §5.3: `!bytes` is the only binary tag and is base64. **A language change:** `!base64`, `!base64url`, `!base32` and `!hex` are no longer built-in tags. [settled — implemented] |
| 30 | A schemaless document may push a schema scope | **Accept** — §7.8's final sentence is replaced by its converse: a schemaless document opens no schema scope; a nested `!!schema` in a document with no `!!schema` of its own is a validation error. §1.2's classes stay decidable from the header. [settled] |
| 31 | `duration`'s value space and its two ends | **Accept** — the baseline above. §5.5: the value-space paragraph as proposed; `time-secfrac` is `"." 1*9DIGIT` once, for `duration`, `time` and `datetime`, with the sentence saying why; `precision` at most 9 falls out of it; the ceiling is 2⁶³ − 1 nanoseconds as a magnitude, normative in both directions. `period_type` and §9.1 unchanged. [settled — implemented] |
| 32 | Use-site flattening and `@alias` | **Accept** — the baseline above. §8.3: a reference is a hop; a processor MAY collapse a chain after linking when it compiles for reading, not in resolved output. §8.2: two sentences — a declared entry's identity is its name, two declarations are two types however alike their bodies; a minted entry's identity is its canonical content, an application's arguments compared after following reference chains — replacing "identity is structural" and the single-level-comparison claim. §5.7: the three spellings (reference, refinement, fresh instance) and what each buys, and that the empty refinement `!uuid ^ {}` is legal and is the nominal-subtype spelling. [settled — implemented] |
| 33 | §9.1 specifies one limit well and the rest not at all | **Accept** — §9.1 becomes one *limits policy*: every limit with a default, MUST be configurable or documented, MUST report the threshold on refusal, a refusal distinguishable from a verdict on §8.2's terms and reported beside §8.2's policy; the aggregate limit and the shape limits added; defaults set at the tightest common use (table in §3.1). Part 2 gains §11.5 for the schema-side limits. [settled] |
| 34 | `within`/`excluding` may admit nothing | **Accept** — §5.5 states the emptiness rule for the four network families in the voice used for the family range; that a network family's prefix bounds participate in it, with the worked case; and that the rule is exact. Narrowing direction left alone. [settled] |
| 35 | §4.2's value-route-only rule has a false justification | **Accept** — the rule is deleted. What §4.2 keeps about parameter kinds is §5.10's true statement: an argument is read by the position it lands in. [settled] |
| 36 | The `~` marker decides nothing the type system does not | **Accept** — the baseline above. §3.3.1: the found entry MUST be IS-A `top`, with the one sentence of why. §5.5: the refinement source is an atom-kinded entry that is not itself applicable. §2.2.2: only a schema whose `!!meta` names the meta-kernel may declare an entry that IS-A `top`. §4.2: the marker and its three rules go. [settled — implemented] |

Counts: **31 accepted** (1, 2, 4, 6–16, 18, 20–26, 28–36 — of which 16 is minimal, with its
remainder open), **3 declined** (3, 5, 27 — 3 and 5 each with a clarifying sentence taken),
and **2 open questions carried** (17, 19), plus the open remainders of 4, 16 and 25 (§5).
Open questions are recorded here and are NOT reflected as open text in the specification.

---

## 3. Accepted changes by target document

### 3.1 Part 1 — Text Data Format

1. **§1.2** — principle 4 reworded (whitespace separates; a comma may follow a value);
   principle 5 (JSON compatibility) deleted, and 6 and 7 renumbered to 5 and 6; the
   permanence principle (now 6) named as the authority for this revision's lexer changes
   (#8). The three series-wide references to principle numbers are updated with it.
2. **§1.3** — the Class 1 lexer freeze restated as holding from Revision 35 (#8); the
   series description loses "superset".
3. **§1.5** — Class 1 obligations simplified: one name-hygiene walk over every named scope,
   with no per-class list of which checks apply to field names (#9).
4. **§2.2.1** — the two justifying sentences for the query-form pin; the fragment reserved
   and excluded from identity (#2).
5. **§2.4** — separators: "a comma may follow a value", the no-elision argument, "trailing
   comma" not "trailing separator", the series-wide note (#10).
6. **§2.5** — "lexical" paragraph deleted; a field name is an identifier, matched after
   NFC normalisation, with the identity rule governing duplicates (#9).
7. **§2.6** — cross-reference to Part 2 §5.5's value-space clause for key identity (#28).
8. **§2.8** — one sentence: the shared brace stands on its own merits (#13).
9. **§2.9** — "distinct from null" clause deleted (#7).
10. **§4 / §4.5** — applicability: "base type resolution applies only in schemaless
    documents" (#7, #23); the host-versus-semantic sentence beside the order (#21).
11. **§4.1** — "Null" becomes "Applicability": the section's applicability clause, the
    three kinds of Class 1 value, and the vocabulary as the schemaless way to type a token
    move here (#7, #12, #23), so §4.2–§4.5 keep their numbers across the series.
12. **§4.2** — `true` and `false` kept, with the §5.4 dependency stated first (#11).
13. **§4.3** — the leading-zero prohibition restated on its own authority (#12).
14. **§4.4** — the fall-through stated as deliberate, naming the annotation and the declared
    type as the two mechanisms; "distinct from null" and "use quotes" deleted (#7, #12).
15. **§5.1** — the built-in vocabulary's applicability aligned with §4's (#23).
16. **§5.3** — Binary Types: `!bytes`, base64, the only binary tag (#29).
17. **§5.4** — the `!duration` row corrected, the `!period` row added, the three
    sentences (#1, #26). Text-form families gain a cross-reference to Part 2 §5.11's
    labelled form (#21).
18. **§6** — the superset claim, the two exceptions and the SHOULD are deleted; the section
    is kept under its title as a statement of scope — what is JSON-shaped and stays, and
    the JSON reader as a second encoding that maps JSON `null` to absence — so §7's
    numbering holds (#7, #8). The first exception moves into §7.2 as the rule.
19. **§7.1** — BOM acceptance restated as an encoding courtesy on §7.1's own authority (#8);
    the always-quote list unchanged.
20. **§7.2** — the escape table: `\/` removed; `"\u" ( 4HEXDIG / "{" 1*6HEXDIG "}" )` with
    the scalar-value constraint; the three surrogate MUST clauses deleted; raw NEL/LS/PS
    inside a single-line token stated once as the rule (#8).
21. **§7.3** — the lexical grammar's escape production updated to match (#8).
22. **§7.4** — `field-name` production unchanged in shape; annotated as an identifier
    position (#9).
23. **§7.6** — unchanged; cross-referenced from §4.3 (#12).
24. **§7.7** — "record field names are lexical at this layer" deleted; rule 3's
    `"_"`/`"_id"` carve-out deleted; rule 3's "no reserved words" now holds without
    qualification (#7, #9). The identifier grammar itself is unchanged.
25. **§8.1** — duplicates and the four categories unchanged; a refusal (name hygiene or a
    resource limit) is reported in the same report, distinguished by the rule that refused,
    and is not a verdict; the MUST NOT becomes MUST-be-distinguishable (#14, #33).
26. **§8.2** — Name hygiene: "UCD version" in both places (#6); the report-property MUST and
    the standalone SHOULD, and the policy stated with the version (#14); **identifier
    policy** and **token policy** defined (#15); the policy is not a property of a schema
    and not carried by one (#16); mechanisms 2 and 3 stated as per-name (#5); the
    field-name distinction deleted (#9); the mixed-script example replaced by a
    single-script pair (#9).
27. **§8.3** — the two-layer summary updated for the field-name change (#9).
28. **§9.1** — Denial of service, rewritten as a limits policy (#33). Every limit: a
    default, MUST be configurable or documented, MUST report the threshold on refusal; the
    refusal is not one of §8.1's four categories and MUST be distinguishable from a verdict;
    the policy is reported beside §8.2's and SHOULD be reachable with no document in hand.
    The aggregate limit is stated as a separate mechanism from the per-container ones.
    Defaults, chosen at the tightest limit in common use so that a document fitting the
    default fits every processor above it:

    | Limit | Default |
    |---|---|
    | nesting depth | 64 |
    | token length, decoded (code points) | 1,048,576 |
    | decoded text length per value (code points) | 1,048,576 |
    | numeric literal length (digits) | 4,096 |
    | decoded binary size per value (octets) | 16,777,216 |
    | document size (bytes) | 16,777,216 |
    | elements in one array or set | 1,048,576 |
    | entries in one map | 1,048,576 |
    | fields in one record | 65,536 |
    | annotations on one value | 64 |
    | total values in a document | 16,777,216 |
    | foreign schemas loaded by one document (Part 2 §7.8) | 16 |

    A deployment raises these; the defaults are what "a conforming document" means with
    nothing else said. Schema-side limits are in Part 2 §11.5.
29. **§9.4 / §9.5** — unchanged pointers.
30. **§10** — RFC 8259 and ISO 8601-1 move from normative to informative (#8, #1); the
    Unicode Character Database and RFC 9485 (now cited from §9.1) added as normative
    references (#6, #33); series links to `/2026/35/`.

### 3.2 Part 2 — Type System and Schema

1. **§1 / §1.3** — resolved-output consumer tier restated: an open entry is a
   `type_definition` with a non-empty `parameters` list and a held body; a consumer of
   closed entries reads `parameters` empty and never meets one (#4). The lexer note follows
   Part 1 §1.3 (#8).
2. **§2.2.2** — eligibility: only a schema whose own `!!meta` names the meta-kernel may
   declare an entry that IS-A `top` (#36).
3. **§3.3.1** — "the found entry MUST be a constructor" becomes "MUST be IS-A `top`
   (§4.1)", with the one sentence of why (#36).
4. **§4.1** — the sum kind lists `choice` and `scoped` (#23); otherwise unchanged, which is
   the argument for #36.
5. **§4.2** — the `~` marker and its three rules deleted: placement moves to §2.2.2, level
   discipline dissolves, value-route-only goes (#35, #36); `value`'s inhabitants are
   boolean, integer, float and string, read by the declared type, never by base type
   resolution (#7, #23).
6. **§5.2** — unchanged in rule; `scoped` in place of the two names it lists (#23).
7. **§5.4** — `@disjoint` stated in the derivation's terms; the unreachable-values
   consequence named (#22); the absent-versus-null clause dropped from the `void` rationale
   (#7); classless variants list `scoped` (#23); `dynamic` where `unknown` was.
8. **§5.5** — the value-space clause (#28); the refinement source is an atom-kinded entry
   that is not itself applicable (#36); atom-refinement payload unchanged. Temporal
   families: `duration` and `period` value spaces, the `1*9DIGIT` fraction once for three
   families, `precision ≤ 9`, the 2⁶³ − 1 ns ceiling in both directions (#26, #31); the
   exclusive bounds on all five (#26). `bytes_type` and its selector (#29). Network
   families: the emptiness rule, the prefix bounds' participation, exactness (#34).
9. **§5.6** — the positional form paragraph gains the schema-syntax-only note (#18);
   canonical form no longer mentions `~` (#36).
10. **§5.7** — the selector clause rewritten around a stated narrowing relation; `encoding`
    never set or changed by a refinement; set-from-default deleted (#29). The ordered-bound
    kind requires a totally ordered value space (#26). The three spellings — reference,
    refinement, fresh instance — and the legality of the empty refinement (#32). The
    member-set kind now serves `members` as well as `enum.members` (#24). `multiple_of` and
    `members` uniform rules stated once (baseline).
11. **§5.8** — the restated-field annotation rule (#25(c)); the one-rule note that an alias
    to an instantiation has no vocabulary body to compose with.
12. **§5.10** — the mutual-recursion sentence deleted, the type-parameter default stated
    (#20); the closed-entry rule kept as an output rule, now against a stated open form
    (#4); argument reading by position is what §4.2 refers to (#35).
13. **§6** — the checked-annotation category, both positions honoured, the criterion and
    the licence (#25); `@alias` removed from the resolver-derived kind, leaving
    `@synthetic` (#32).
14. **§7.1** — the "legal but vocabulary-only" root and its validator MUST deleted; the
    permissive-type list replaced by the derived rule (#23).
15. **§7.3** — the `null`-at-`void` concession deleted; `void` admits `_` alone (#7).
16. **§7.4** — the enum-replacement sentence extended over `members` (#24); the two
    coherence and identity sentences (#24).
17. **§7.5** — unchanged (#27); cross-reference to §5.5's clause from the duplicate rule
    (#28).
18. **§7.8** — rewritten around `scoped`: the five-row table, the data rule, the scope push
    kept as written, the attachments example over `[extern]` or a narrowed `scoped` (#23);
    the final sentence replaced by its converse (#30).
19. **§8.1** — `constructor` removed from `type_definition` (#36); open entries carried as
    `type_definition` values with `parameters` and a held wire-form body, the forbidding
    sentence deleted, "Reading parameter references" kept, ingest re-resolution stated (#4);
    the positional-sugar note (#18); `reference.target` and preserved-annotation channel
    unchanged; the restated-field rule cross-referenced (#25).
20. **§8.2** — the two identity sentences replacing "identity is structural" and the
    single-level claim (#32); synthetic entries are an implementation's own (#3); the alias
    recommended for a named application (#18).
21. **§8.3** — use-site flattening and `@alias` deleted; a reference is a hop; MAY collapse
    after linking, not in output (#32).
22. **§9** — the meta-layer table updated: `set_type`, `non_negative_integer`,
    `integer_member_set`, `members` (both tiers), `bytes_type`/`bytes_encoding`,
    `scoped`/`scope_kind`, `period_type`, the five temporal bound groups, `precision` on
    `duration_type`, the eight annotation types, no `alias`, no `binary`, no `extern`, no
    `unknown_type`, no `constructor`; core: `bytes`, `period`, `declared`, `extern`,
    `dynamic`, `extern_of`, `extern_type`, `set`, no `unknown`, no spelled binaries. The
    JSON note becomes the scope statement (#8). The `_`/`null` restatement deleted (#7).
23. **§10.2 / §10.3** — cross-reference to the value-space clause: content addressing is
    over values (#28).
24. **§11.4** — unchanged (#5).
25. **§11.5 (new)** — Resource limits for schemas: a schema is untrusted input wherever it is
    accepted over the wire or reached through `!!import`; the limits below join Part 1
    §9.1's policy on the same terms (default, configurable-or-documented, threshold
    reported, refusal not a verdict). Defaults:

    | Limit | Default |
    |---|---|
    | import closure (schemas reachable from one header) | 64 |
    | entries in one schema map | 65,536 |
    | reference chain length | 64 |
    | supertype chain length | 64 |
    | template materialisation depth | 64 |

    The document-side counters of §9.1 apply to a schema document as a document.
26. **§12.1 / §12.2 / §12.3** — `~` removed from `type-def` (#36); the disambiguation
    summary loses the marker; separator note updated for the trailing comma in element and
    argument lists (#10).
27. **§13** — RFC 3339 Appendix A cited for the duration/period grammar; RFC 4648 as the
    spelling reference for `bytes`; the UCD entry; identities to `/2026/35/`.

### 3.3 Companion artifacts

The revised artifacts shipped with this revision already carry the baseline of §1 and every
kernel- and meta-level change in this log, at `/2026/35/` identities with the hash chain
recomputed bottom-up. Two edits remain and are listed in §6.

---

## 4. Notable normative changes (reader's digest)

Changes a Revision 34 implementer must act on:

1. **`null` is gone.** A bare `null` in schemaless data is the string `null`; `void` admits
   `_` alone. Base type resolution is boolean → number → string and applies only in
   schemaless documents.
2. **TSON is not a JSON superset.** The superset claim and principle 5 are deleted; `\/` is not an escape;
   `\uXXXX` must denote a scalar value and `\u{…}` is added; surrogate pairs are two errors.
   A JSON document is read through a JSON reader.
3. **A field name is an identifier at every layer**, matched after NFC normalisation.
   `{ "first name": 1 }` and `{ _id: 1 }` are parse errors; a key that is not a name is a
   map key.
4. **A comma may follow a value.** `[1, 2, ]` is admitted, in data and in every §12.1 list.
5. **Under a schema the root names its type or the document is invalid.** The
   "vocabulary-only" root is gone, and a schemaless document opens no schema scope.
6. **`extern`, `unknown_type` and `unknown` are replaced** by `scoped` and core's
   `declared`, `extern`, `dynamic`, `extern_of<S>`, `extern_type<S, T>`. A value at a scoped
   position must name its type. The permissive-type list is a derived fact.
7. **One `bytes` type over octets**, base64 in the text class by default; `!bytes` is the
   only binary tag in Part 1. `!base64`, `!hex` and their kin are gone; another alphabet is
   another instance and never a refinement.
8. **`duration` is seconds and `period` is months**, both TOTAL; `PnW` stands alone; the
   fractional second is at most nine digits for `duration`, `time` and `datetime`; a
   `duration`'s magnitude is at most 2⁶³ − 1 ns, refused past that whatever the host holds.
9. **`time` and `datetime` are instants**: `Z`, `+00:00` and `-00:00` are one spelling
   of one value, and ordering is TOTAL.
10. **Equality is over value spaces.** Two spellings of one value are one value for sets,
    map keys, FIXED fields, refinement, disjointness and content addressing.
11. **`~` and `type_definition.constructor` are gone.** Applicability is IS-A `top`; a
    constructor is an entry that IS-A `top`, declarable only under the meta-kernel.
12. **Use-site flattening and `@alias` are gone.** Output states a reference chain as
    written. A declaration's identity is its name; a minted entry's is its canonical content,
    arguments compared after following references — `box<user_id>` over `user_id => uuid`
    mints `box<uuid>`'s entry.
13. **Open entries appear in resolved output** as `type_definition` values whose body is a
    `!template { parameters: […]  template: "…" }` — the held application as text, compared
    as the parsed form. `type_definition` has no `kind`, `parameters` or `disjoint` field: a
    kind is derived, and `disjoint` lives in the `!choice` body (§8).
14. **`members`** on `integer_type` and `decimal_type`; an enum is still identifiers only.
15. **`@discriminator` and `@rest`** are checked annotations; a restated field's annotations
    are the restatement's followed by the inherited ones, never fewer.
16. **`set` is `set_type`**, non-empty by default; `set<T>` is a template in meta and core.
17. **A refusal — name hygiene or a resource limit — is not a verdict**, is reported beside
    the four categories, and names the rule; the processor reports its identifier policy,
    token policy, limits policy and UCD version with any report that carries one. §9.1's
    limits have defaults.
18. **An ungrounded template parameter is a type parameter**, not an error; the
    value-route-only rule is gone.
19. **`within`/`excluding` must admit a value**, prefix bounds included, exactly.

---

## 5. Open questions carried by this change log

Adjudicated 2026-09-04. The following remain deliberately open. They live in this change log
only — the specification text carries no open questions. The register has since renumbered
against Revision 35; the arrow gives each entry's number there (§8).

| Ref | Question | Status |
|---|---|---|
| #4 (→ —) | Should template parameters be typed with the kind of slot they stand in, so that the model rather than a sentence separates a parameter reference from a type name? | Open — named as the direction; not taken. |
| #16 (→ #1) | A third artifact kind — the deployment descriptor: data, not a schema; named at the call site, never discovered; never resolvable by identity; a `.well-known` projection for discovery. | Open — §8.2 says only what the policy is *not* (a property of a schema). |
| #17 (→ #2) | Should the series define a `TSON-Schema` HTTP field (RFC 9651 sf-string; conflict with `!!schema` by canonical identity is an error; sender's claim, not receiver's instruction; registered per RFC 9110 §16.3, not `X-`)? | Open — carried; the four points recorded for whichever revision takes it. |
| #19 (→ #3) | A namespace as a value — the kernel's 2×2 (keys names/data × values data/declarations) has an empty cell; `schema` would be one instance; `&`, `^`, `-` acquire obvious meanings; `data` may then have nothing left to do. | Open — carried deliberately; a design question, not an addition. |
| #25 (→ —) | The field-based discriminator shape (`@discriminator` on a base record's field, subtypes fixing the value, untagged dispatch on `subtypes`) against the choice-based shape shipped; and annotation cardinality as the means of per-name replacement. | Open — the choice-based shape is normative; the alternative recorded as considered. |

Decisions taken 2026-09-04: #2 keep the query form and reserve the fragment; #3 and #5
declined (the kernel declaration; the parameter scope), each with its clarifying sentence
taken; #4 open entries as `type_definition` values; #9 normalise before matching, and a
single-script example; #10 (b); #16 minimal; #25 choice-based; #27 declined; #33 defaults as
tabled.

---

## 6. Artifact work

1. **Received at Revision 35** — all six artifacts carry "2026 Revision 35" and `/2026/35/`
   identities with the hash chain recomputed bottom-up over the shipped bytes (kernel body →
   kernel `!!id` digest → meta pins → meta digest → core pin → core digest). Hash *values*
   remain non-normative; only the pin's shape is.
2. **Done: the `set<T>` template docs.** meta.tn and core.tn had described the template as
   one that "carries no `~`, so §4.2's value-route-only rule does not reach its parameter" —
   stale against #35 and #36 in the same files. Both now say only that the template composes
   with nothing, is not IS-A `top`, and that `set_type` stays parameterless.
3. **Done: the typo** in meta-kernel.tn's `data` doc ("other than a atom").
4. **Done: the second artifact revision (§8)** — the `template` constructor, `type_kind`
   removed, `type_definition` reduced to `source`/`supertypes`/`subtypes`/`body`, `disjoint`
   on `choice`; both fixtures write open entries as `!template` values — and the re-pin,
   bottom-up: kernel `28e4497b…`, meta `bf967ed0…`, core `3953b2a6…`. Part 2 §13.2 carries
   them.

---

## 7. Developer Guide

tson-guide.md ships with Revision 35, realigned on the same two principles as before (it
describes the design as it stands; history lives in the change logs). §1.4 and §1.5 drop
the superset framing and describe JSON as a second member of the text class read through
its own reader; §2.1 and §2.2 stand; a new §2.8 carries the rationale for removing `null`
and the JSON cluster (#7–#13), including why `true`/`false` stay, why the near-miss
fall-through stays, and why the shared brace stays; §2.7 loses `~` and gains the
open-entry output shape; §3.2's quoting-by-kind section notes `\u{…}` and loses `\/`;
§3.3 gains the value-space clause and the per-family lines (`bytes`, instants, scale,
`rational`); §3.5 loses the field-name asymmetry and describes the two policies by their
defined names and the report they travel in; §5 replaces the alias walk with the three
spellings and the two identity rules; §6.1 reads `set_type` and `non_negative_integer`;
§6.2 covers `members` and the read-under-the-atom rule; a new §6.4 covers `scoped` and the
five cells, and a new §6.5 the `bytes` design and the two fixes it replaced; §7's worked
example gains `duration` and `bytes` fields and a trailing comma, and shows the open entry
as a `type_definition` in resolved output; §8.1 becomes "two identities, and names that
carry nothing" and records the declined kernel-declared lift targets; §8.3 adds the
refusal-in-the-same-report convention and the limits policy; §9.2 gains the note that the
policies are the deployment's and not a schema's; identities are bumped to `/2026/35/`. The Revision 33 guide candidates (#4, #7, #13 of that register) remain
outstanding.


---

## 8. Second pass — the register renumbered against Revision 35 (2026-09-05)

Before publication the implementation renumbered SPEC-FEEDBACK.md against the Revision 35
working text: #1–#4 are the four entries this log carried or declined, and #5–#8 were opened
against Revision 35 itself — three of them one defect seen from three sides, in the entry an
open declaration resolves to, and the fourth the same shape one field over. All four arrived
built: the companion artifacts were revised a second time and re-stamped. This section
adjudicates them and records the Part 2 and guide edits made for them. **Part 1 is untouched
by this pass**: none of the eight entries reaches it.

| # | Was | Entry (abridged) | Disposition |
|---|---|---|---|
| 1 | #16 | §8.2's policy has no artifact; the deployment descriptor | **Open (carried)** — as §5; reduced to its artifact half, with the second constraint (no `!!import` of a descriptor, no document able to name one) recorded for whichever revision takes it. |
| 2 | #17 | No out-of-band way to name a governing schema; `TSON-Schema` | **Open (carried)** — as §5; the register notes the premise sharpened (an encoding of the model with no channel is now structural, not a compatibility question). |
| 3 | #19 | A namespace as a value | **Open (carried)** — as §5, and held over a second cycle by the register's own account. |
| 4 | #27 | §7.5's set order and comparison MUST | **Declined** — as §2; §7.5 unchanged. The register records its divergence (set-typed fields compared as ordered lists) and that the field count rose to four. |
| 5 | new | An open entry's `body` is not a `top`, and §8.1 says it is | **Accept** — the kernel declares `template => top & { parameters: [param_name]  template: text }`, and an open entry's body is `!template { parameters: […]  template: "…" }`: the held application as **text**, which is what "held" means, so `type_definition.body` is a `top` with no exception, `type_definition.parameters` is deleted, and openness is one structural question. The comparison is of the **parsed form**, never the text (identity of an open synthetic; ingest; conformance), so "one spelling" stays a rule about structure and whitespace is free. A source declaration applying `template` directly is a resolver error. [settled — implemented] |
| 6 | new | `type_definition.kind` is not resolver output | **Accept** — `kind` and the kernel's `type_kind` are removed. A kind is derived by the four-branch rule §8.1 now states — `!template` body → TEMPLATE; `reference` head → REFERENCE; IS-A `top` → the base kind in its own supertypes, else PRODUCT; else the head's kind — measured at 264 entries, 0 mismatches. §5.5's atom-refinement predicate becomes the one test it always was: the source's body *is* an atom application, not the record describing one. [settled — implemented] |
| 7 | new | `source` has three incompatible definitions for an open entry | **Accept (b), and point 3 the first way** — a parameter reference appears only inside a held body; every other `type_ref` in an open entry, `source` included, names a type; an open entry's `source` is the constructor its held body applies (`record`, `array`, `map`, `set_type`, `scoped`, `reference`), uniformly, and a partial application states its arguments in its own `reference.target` inside the held text. (a)'s "recorded in the entry's `source`" and (c)'s `source` in the parameter-resolving list are struck. [settled — implemented] |
| 8 | new | `disjoint` is a fact about a variant list, recorded where nothing has one | **Accept** — `choice => sum & { variants: [type_ref]  disjoint: boolean? }`; the resolver writes the fact in the `!choice` body. "Absent on every other definition" and the `scoped` carve-out stop being rules: §7.2's closed record refuses the field anywhere else. Still discarded and recomputed on ingest. [settled — implemented] |

**Part 2 edits for #5–#8.** §1.3 — the consumer tier reads the `!template` body. §3.3.1 and
§5.5 — the atom-refinement predicate is on the body. §4.1 — "A kind is derived, never
recorded"; `template` beside `reference` and `data` as a direct composition with `top`;
REFERENCE conferred by the alias form. §5.2, §5.4, §5.5, §5.10, §8.2, §10.1 — every `kind: X`
literal in prose and examples becomes "X-kinded by derivation" or is deleted. §5.4 —
`disjoint` in the choice body, structural. §5.10 — substitution rewrites the held body only;
"One spelling" compares the parsed form; "Open bodies in output" rewritten around `!template`,
with the parameter-reference invariant and `source` as the constructor head; the partial
application's arguments inside the held text; "Closed entries are parameter-free" made
structural. §8.1 — the field list is `source`/`supertypes`/`subtypes`/`body` with the four
non-fields named; new "Open entries" and "Kind is derived" paragraphs; "Reading parameter
references" confined to the parsed held body with `source` struck; the provenance paragraph
gives an open entry's `source`; the `disjoint` paragraph rewritten for the choice body; ingest
re-resolves the held text as source, never compares it as text, and derives kind; the body
patterns table's template and choice rows; §8.2's entry shape and the `vector_pixel_af3`
example; open-synthetic identity over the renamed parsed form. §9 — the kernel row. §13.2 —
the three pins re-stamped.

**Guide edits.** §2.7 states the text-held body, the parsed-form comparison, and the two
removed fields; §7's resolved output drops every `kind:` line and writes `flagged` as a
`!template` value; the `flagged` bullet describes `source: record` and the invariant.

**What is not verified**, carried from the register as a note rather than a question: no
implementation has an ingest path, so "a held body re-resolves as source" and "an ingesting
consumer can recompute kind" are asserted against entries the same resolver produced.

Counts after this pass: 35 accepted of the 40 entries adjudicated across both passes, 3
declined, 3 carried open (#1–#3 of the renumbered register), plus the open remainders of the
original #4 and #25.

