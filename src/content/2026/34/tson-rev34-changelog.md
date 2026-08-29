---
title: "TSON 2026 Revision 34 — Change Log"
against: "TSON 2026 Revision 33 (Working Draft)"
status: "Adjudicated and executed 2026-08-29 — Part 1, Part 2, and all six companion artifacts updated; hash pins recomputed over the shipped bytes"
inputs:
  - "SPEC-FEEDBACK.md (17 entries, against Revision 33)"
  - "Revised companion artifacts: meta-kernel.tn, meta.tn, core.tn and resolved fixtures (implementing #3 step 1, #5, #7, #12)"
---

# TSON 2026 Revision 34 — Change Log

This document records the changes accepted into Revision 34 of the TSON specification
series, adjudicated from the implementation's spec-feedback register (17 entries, renumbered
from #1 against Revision 33). SPEC-FEEDBACK.md remains a record against Revision 33 and is
not modified by this revision; each of its entries receives a disposition here.

Provenance markers used in the disposition table:

- **[settled]** — the resolution was settled by the spec author inside the feedback
  register itself, is already implemented in the revised companion artifacts shipped with
  this revision, or was decided by the revision editor at adjudication.
- **[open]** — a genuine design decision deliberately left open. Collected in §5.

---

## 1. Baseline: the revised artifacts

Four of the register's proposals arrived already implemented in the companion artifacts, and
Revision 34 adopts them as its baseline. Summarising the normative effect:

- **#3 step 1 — the `identifier` primitive.** The kernel's `token` primitive is replaced by
  `identifier`, an instance of `unit` carrying a stated contract: `XID_Start`-initial,
  `XID_Continue ∪ { - }` thereafter, NFC, applied to a name's *decoded text* however it was
  spelled. `type_name`, `field_name` and `param_name` alias it; `token_set` becomes
  `enum_set => !set { element_type: identifier  min_items: 1 }`, so enum members are
  identifiers and an empty enum is a schema-load error. `token` and `token_set` are gone.
  (Part 1 §7.1, new §7.7; Part 2 §4.2, §7.4, §9, §12.1; meta-kernel.)
- **#5 — held open bodies.** An open entry's body is the constructor application as
  written, held unread until materialisation substitutes its parameters away. Substitution
  is one token walk at any depth; a parameter in a collection-valued slot needs no
  representation of its own, so `result => <T> ( T | error )` resolves. `instance_template`,
  `template_argument` and `record_field.value_param` are deleted; the `instance-template` /
  `template-def` / `template-bind` productions go with them, and `instance` takes the optional
  parameter list. (Part 2 §1.3, §4.2, §5.2, §5.3, §5.7, §5.10, §8.1, §8.2, §9, §12.1;
  meta-kernel.)
- **#7 — `reference.target: type_ref`.** An alias to an application states the arguments it
  binds, so a partial application is an ordinary open entry — `<B> !reference { target:
  { name: pair  arguments: [ { name: text }  { name: B } ] } }`, the application in
  `type_ref`'s record form — and `source` no longer does double duty. Use-site flattening walks
  through a REFERENCE entry but stops at an argument-bearing target. (Part 2 §5.10, §8.1,
  §8.3, §9; meta-kernel.)
- **#12 — `map.state`.** The `map` constructor gains `state: element_state ~ REQUIRED`; the
  sugar spells it as `{K => V?}`; `_` at a map entry value is permitted only where the map's
  value state is OPTIONAL, exactly as for array elements. (Part 2 §5.3, §7.6, §9, §12.1;
  meta-kernel.)

---

## 2. Disposition summary

| # | Entry (abridged) | Disposition |
|---|---|---|
| 1 | `!duration` and ISO 8601 `PnW` | **Open (carried)** — deliberately left open a second time; the §5.4 table is unchanged. |
| 2 | Hash pin in the URI query | **Open (carried)** — the query form is kept; whether the pin moves to a fragment or a structured directive value stays recorded here. |
| 3 | §9.4 has nowhere to attach; `token` carries no contract | **Accept (two layers)** — *Layer 1*, the identifier profile, is normative validity: a new Part 1 identifier grammar (§7.7) matched against a name's decoded text as §7.6 matches a number; `type-ref = "!" identifier`, `annotation = "@" identifier`; `field-name = unquoted-token / single-line-token` (multi-line dropped; Class 1 field names stay lexical, so JSON compatibility is untouched and data conforms under a schema by construction); Part 2 `type-name = identifier`, subsuming the "numbers are not declarable names" rule; enum members are identifiers. *Layer 2* — skeleton distinctness within each named scope, `Identifier_Status=Allowed`, and UTS #39 restriction levels with a per-segment unit — is **MUST implement, enforced by default, never validity**: a new Part 1 §8.2 defines the mechanisms, scopes, defaults, the distinguishable-refusal rule, the code-only relaxation rule, and the data-version-in-diagnostic rule; Part 2 §11.4 adds the schema scopes (declared names, the `!!import` merge) and the enum scope. Settled sub-questions: profile extension characters (`-`) do not participate in Layer 2; the namespace scope spans `!!import`; choice variants are not a scope; no Unicode version is pinned. §9.4 shrinks to a pointer. [settled] |
| 4 | Type-argument literal identity | **Accept (option 3)** — the argument is recorded as written; identity applies [TSON-DATA] §4.3's equivalence before comparing (radix, digit separators, redundant sign, float scale, `.inf`/`.infinity`), with base type as the boundary (`1` and `1.0` remain two arguments). Stated in §8.2, with §8.1 agreeing. The D6 merge pass is stated as required, not incidental. [settled] |
| 5 | Collection-slot boundary; held open bodies | **Accept** — the baseline above. Additionally stated: the one-spelling rule for held bodies; the declaration-time / materialisation-time split of checks (no stand-in checking of unapplied templates); the argument-kind rule is dropped in favour of a normative value-conformance rule in §5.2 (a fixed or default value MUST conform to the field's declared type, wherever the value came from); a materialisation diagnostic is located at the declaration whose text wrote the offending name, one diagnostic per defect; an argument is substituted as a token and read by the position it lands in, so a parametric enum member (`e<c>`) needs no special spelling. Supersedes Revision 33's #53 decision. [settled — implemented] |
| 6 | Kernel-declared open container templates | **Declined** — the lift targets are grammar-supplied and must not depend on the import set; the fixed-arity subset covers too little of the family to justify a new category of always-available name. No edit. |
| 7 | `reference.target` cannot state arguments | **Accept** — the baseline above; §5.10 names `reference` as a dispatched head (not a `~` constructor; kind REFERENCE from the alias form, not a base kind). [settled — implemented] |
| 8 | Which declared types may carry a fixed/default value | **Accept (restrictive)** — a `~`/`=` value is admitted only on a field whose declared type resolves (after flattening) to an atom-family instance or an enum; on any other declared type it is a resolver error at the declaration. `void`, `unknown` and `extern` fall out of the rule. (P2 §5.2.) [settled] |
| 9 | `precision` / `require_timezone` undefined | **Accept** — `precision: N` means at most N fractional-second digits, judged on the written token, a validation constraint (so it orders and refines like every other bound; `precision: 0` admits no fractional part); `require_timezone` is **deleted** — RFC 3339 `full-time`/`date-time` already mandate the offset, so the facet was vacuous or widening. (P2 §5.5 new prose; meta.tn; meta-resolved.tn.) [settled — artifacts edited] |
| 10 | "and their kin" | **Accept** — replaced by the general rule: every family coherence rule of §5.3 and §5.5 applies again at materialisation over the operands that were parameters. (P2 §8.2.) [settled] |
| 11 | Empty brace at array/tuple positions | **Accept (narrow)** — `{}` resolves to the empty record or the empty map according to the expected type; at any other typed position it is a validation error. Part 1 §2.8's sentence is narrowed to match. (P1 §2.8; P2 §7.7.) [settled] |
| 12 | `{K => V?}` and `map.state` | **Accept** — the baseline above; §5.3's table gains the row, its "neither side admits `?`" sentence keeps only the key half, §7.6's map row becomes conditional. **A language change:** data writing `_` at a map value validates only where the schema wrote `?`. [settled — implemented] |
| 13 | `atom-refinement` takes `record-def` | **Accept** — `atom-refinement = "!" type-name ws "^" ws ( record / empty-brace )`: the braced subset of the `core-value` payload `instance` takes, read by the same data grammar, so the braced-only restriction is grammar rather than prose; §12.1's import list and count corrected. An error, not a design question. [settled] |
| 14 | ZWNJ/ZWJ: prose vs algebra | **Accept (keep the algebra)** — `Continue = XID_Continue ∪ { - + . }` stands; the blanket exclusion and its "MUST be quoted" remedy are deleted; UTS #39 §3.1.1.1's contextual rule (A1/A2/B, single-script, NFC) governs joiners in *identifiers* (Layer 1, Part 1 §7.7); a new sentence states that no `Cf` or control character is in `XID_Continue` and names the bidi controls. (P1 §7.1, §7.7.) [settled] |
| 15 | §5.11's datetime example does not parse | **Accept** — the instance is quoted; `time`, `datetime`, and durations carrying a time part join §7.1's always-quote list. (P2 §5.11; P1 §7.1.) [settled] |
| 16 | LRM/RLM as horizontal space | **Accept** — §7.2 rule 1 is split as UAX31-R3a-1 splits the property: line terminators, the two ignorable format controls (admitted only where a token boundary already exists, contributing nothing; interior occurrence is a lexer error), horizontal space. §9.5's SHOULD is retired; the section becomes a note pointing at the rule, citing UTS #55 §3.2. (P1 §7.2, §7.3, §9.5.) [settled] |
| 17 | Duplicates have no §8.1 category | **Accept (layered)** — "is a resolver error" in §2.5 and §2.6 for the textual and decoded-value layers of identity, whichever of the two detects a pair; the declared-type layer remains the Class 2 validation error P2 §7.7 already states (its `0xFF`/`255` example, a decoded-value duplicate, is dropped). §8.1's resolver bullet gains duplicates. (P1 §2.5, §2.6, §8.1; P2 §7.7.) [settled] |

Counts: **13 accepted** (3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 — fourteen rows, of
which 5 and 7 are one design), **1 declined** (6), and **2 open questions carried in this
change log only** (1, 2). Open questions are recorded here and are NOT reflected as open text
in the specification.

---

## 3. Accepted changes by target document

### 3.1 Part 1 — Text Data Format

1. **§1.5** — Class 1 obligations gain the identifier grammar at `!`/`@` positions and the
   record-scope name-hygiene check (#3).
2. **§2.4** — quoting-by-kind cross-reference to the temporal kinds (#15).
3. **§2.5 / §2.6** — duplicates "are a resolver error" (#17).
4. **§2.8** — empty brace resolves to the empty record or map only (#11).
5. **§3.1 / §3.2** — annotation and type-annotation names are identifiers (#3).
6. **§7.1** — the identifier profile stated beside the token profile; §7.1's "declared
   profile of Unicode identifiers" sentence reworded (the profile constrains identifiers,
   of which an unquoted token is one spelling); ZWNJ/ZWJ paragraph replaced by the
   contextual rule's pointer (#14); the no-`Cf` sentence beside the BOM paragraph (#14);
   times and datetimes in the always-quote list (#15).
7. **§7.2** — rule 1 split per R3a-1; the format-control clause (#16).
8. **§7.3** — `ws` split into `line-term` / `horizontal-space` / `ignorable-format`; the
   two ignorable characters removed from the horizontal set (#16).
9. **§7.4** — `type-ref = "!" identifier`, `annotation = "@" identifier`,
   `field-name = unquoted-token / single-line-token` (#3).
10. **§7.7 (new)** — the identifier grammar: the profile as ABNF, the decoded-text matching
    rule, case sensitivity, NFC, the joining-control contexts (#3, #14).
11. **§8.1** — resolver category gains duplicates; the Layer 2 refusal is distinguished from
    the four categories (#3, #17).
12. **§8.2 (new)** — Name hygiene: the three mechanisms, the scopes, the defaults, the
    reporting and relaxation rules, the data-version rule (#3).
13. **§9.4 / §9.5** — §9.4 reduced to a pointer at §8.2; §9.5 reduced to a note at §7.2 (#3,
    #16).
14. **§10** — UTS #39 and UTS #55 become normative references; series links to `/2026/34/`.

### 3.2 Part 2 — Type System and Schema

1. **§1 / §1.3** — grammar-import sentence corrected (`core-value` at two points, #13);
   resolved-output consumer tier restated over held bodies (#5).
2. **§4.2** — `identifier` replaces `token` among the unit instances (#3); labelled-only
   parameter rule for `~` declarations restated over held bodies (#5).
3. **§5.1 / §5.7** — stale `~array<T> ^ { … }` examples corrected to the parameterless
   form (housekeeping).
4. **§5.2** — value-conformance rule and eligible-type rule for `~`/`=` values (#5, #8);
   open-modifier prose retargeted from `value_param` to the held `value` slot (#5).
5. **§5.3** — `{K => V?}` row; map paragraph rewritten (#12); lift rule unchanged but
   restated over held open synthetics (#5).
6. **§5.5** — atom-refinement body is the constructor payload (#13); temporal facets
   defined (`precision`), `require_timezone` removed (#9).
7. **§5.6** — end state restated: closed bodies are binding records, open bodies are held
   applications (#5).
8. **§5.7** — open modifiers, fixation at materialisation, with no `value_param` (#5).
9. **§5.10** — rewritten around holding: the one-spelling rule, checks split by phase,
   diagnostics located by name, argument-kind rule dropped, enum-member arguments,
   `reference` as a dispatched head, the required D6 merge (#5, #7).
10. **§5.11** — example quoted (#15).
11. **§7.4** — enum member semantics over `enum_set`; the `identifier` primitive replaces the
    `token` paragraph (#3).
12. **§7.6** — map entry value row conditional (#12).
13. **§7.7** — empty-brace rule narrowed and the exclusion stated (#11).
14. **§8.1** — `type_definition` prose without `instance_template`; held-body serialization
    contract; `reference.target` as `type_ref`; ingest checks restated (#5, #7).
15. **§8.2** — identity: value normalisation before comparison (#4); coherence rule general
    (#10); the required merge pass (#5).
16. **§8.3** — the walk stops at an argument-bearing target (#7).
17. **§9** — meta-layer table updated (`identifier`, `enum_set`, no `instance_template` /
    `template_argument`, `map.state`, no `require_timezone`); "every sum" / "every choice"
    wording for `disjoint` reconciled (housekeeping).
18. **§11.4 (new)** — schema-layer name hygiene: scopes and the `!!import` merge (#3).
19. **§12.1 / §12.2 / §12.3** — `instance = [type-params] "!" type-name ws core-value`;
    `atom-refinement` payload; `type-name = identifier`; `instance-template` and its
    productions deleted; dispatch summary updated (#3, #5, #13).
20. **§13** — references: `identifier`-related UTS entries; "hash pin to be published"
    replaced by the shipped pins; identities to `/2026/34/`.

### 3.3 Companion artifacts

The revised artifacts shipped with this revision already carry #3 step 1, #5, #7 and #12.
This revision additionally: bumps every artifact to Revision 34 with `/2026/34/`
identities; deletes `require_timezone` from `meta.tn` and `meta-resolved.tn` and documents
`precision` (#9); removes the stray empty `groups: [ ]` from the kernel fixture's
`record_field` (default omission); aligns the kernel's `record_field` and `type_ref` doc
strings with §5.10's held-body wording; and recomputes the hash chain bottom-up.

---

## 4. Notable normative changes (reader's digest)

Changes a Revision 33 implementer must act on:

1. **Names are identifiers.** Type names, parameter names, annotation names, `!` targets
   and declared field names must match the identifier grammar; `!42x` and `@x.y` are parse
   errors; a declared field named `42` is impossible. Class 1 field names stay lexical.
2. **Enum members are identifiers, and an enum has at least one.** `!enum [1 2 3]` and
   `!enum []` are schema-load errors.
3. **Open bodies are held, not quoted.** `instance_template`, `template_argument` and
   `value_param` no longer exist; a parameter may stand in any slot, collections included.
4. **`{K => V?}`** exists, and `_` at a map value is valid only under it (**language
   change**: Revision 33 data writing `_` at a map value may now fail validation).
5. **`reference.target` is a `type_ref`.**
6. **Argument identity normalises numeric spellings** before comparing; `<255>` and
   `<0xFF>` are one application.
7. **Fixed and default values are checked against the field's type**, and only atom- or
   enum-typed fields may carry one.
8. **`require_timezone` is gone; `precision` is at-most-N fractional digits.**
9. **`{}` at an array or tuple position is a validation error.**
10. **LRM/RLM are ignorable format controls**, legal only at token boundaries.
11. **ZWNJ/ZWJ are admitted by context**, not excluded; the "quote it" remedy is gone.
12. **Name hygiene is on by default**: skeleton distinctness, `Identifier_Status`, and a
    restriction level, all relaxable only through code configuration and never validity.
13. **Duplicates are resolver errors**; `atom-refinement` takes the constructor payload.

---

## 5. Open questions carried by this change log

Adjudicated 2026-08-29. The following remain deliberately open. They live in this change log
only — the specification text carries no open questions.

| Ref | Question | Status |
|---|---|---|
| #1 | Does `!duration` accept ISO 8601's `PnW` week form? | Open — carried a second time; the §5.4 table is unchanged. |
| #2 | Should the content-hash pin move out of the URI query (fragment, or a structured directive value)? | Open — the query form is kept; §2.2.1 is unchanged. |

Decisions taken 2026-08-29: #3 two-layer split (Layer 1 validity, Layer 2 default-on policy);
#4 option 3; #8 restrictive; #9 at-most-N and delete `require_timezone`; #11 narrow; #6
declined.

---

## 6. Artifact work executed

1. **Revision markers and identities** — all six artifacts carry "2026 Revision 34" and
   `/2026/34/` identities.
2. **`meta.tn`** — `require_timezone` removed from `time_type` and `datetime_type`; both
   constructors' `@doc` strings define `precision` (#9).
3. **`meta-kernel.tn`** — doc strings on `record_field` and `type_ref` align with §5.10's
   held-body and #4's identity wording; the header note no longer claims the published
   drafts spell pins `xxhash`.
4. **Fixtures** — `meta-kernel-resolved.tn` drops `record_field`'s empty `groups`;
   `meta-resolved.tn` drops the two `require_timezone` fields; conventions notes restated.
5. **Hash chain** — recomputed bottom-up over the shipped bytes (kernel body → kernel `!!id`
   digest → meta pins → meta digest → core pin → core digest). Hash *values* remain
   non-normative; only the pin's shape is.

---

## 7. Developer Guide

tson-guide.md ships with Revision 34, realigned on the same two principles as before (it
describes the design as it stands; history lives in the change logs). §2.7 now states the
held-body model and the one-spelling requirement in place of the typed-quotation account;
§3.2's always-quote list gains times and datetimes and its ZWNJ/ZWJ footnote is rewritten
around the contextual rule; a new §3.5 carries the standing rationale for the identifier
layer and for name hygiene being default-on policy rather than validity (stability of the
underlying Unicode data, and the non-composition of skeleton distinctness across `!!import`);
§4.3 and §6.1 read `identifier` for `token`; §7's worked example serializes the open
`flagged` template as its declaration with the parameter in the plain `value` slot; §8.1
adds value-normalised argument identity and the required merge pass; §8.3 adds the
locate-by-name and refusal-vs-error conventions; identities are bumped to `/2026/34/`. The
Revision 33 guide candidates (#4, #7, #13 of that register) remain outstanding.
