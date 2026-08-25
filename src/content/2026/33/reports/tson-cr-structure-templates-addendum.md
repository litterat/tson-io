---
title: "TSON Change Report Addendum: Open-Form Representation — Two Endpoints"
against: "CR-structure-templates (Proposed); TSON 2026 Revision 32 (Working Draft)"
status: "Proposed"
id: "CR-structure-templates-addendum-1"
---

# Addendum: Open-Form Representation — Two Endpoints

**Against:** CR-structure-templates as drafted, specifically D7 (structural instance templates), D9 (the `instance-template` production), the Tranche B/D split of §10, and `SPEC-FEEDBACK.md` #53. Part 1 remains unaffected. This addendum follows the base report's own convention (§11): superseded reasoning is preserved, not deleted, because without the argument against it the next reader re-proposes it.

**Reading order:** §2 states the defect; §3 the diagnosis it reduces to; §4 and §5 the two coherent completions — **Outcome A: complete the typed quotation** (grow the template vocabulary until it covers what the constructors can express) and **Outcome B: held form** (remove typed open representation and bind once, at materialisation). §8 is the recommendation. §7 is severable and can land before the A/B decision. §11 records a third design (externalised value routes) considered and superseded during this addendum's drafting.

---

## 1. Summary

D7's `instance_template` cannot represent a parameter inside a collection-valued slot (`tuple.elements`, `choice.variants`) — acknowledged in the base report as a contradiction between D5's universal lift rule and D9's concession, and parked as `SPEC-FEEDBACK.md` #53. This addendum finds the gap is a symptom rather than a missing feature: `instance_template` is a *partial* typed quotation of the constructor vocabulary, and a quotation typed slot-by-slot is incomplete wherever the vocabulary it quotes recurses. The driver of the mechanism was narrower than the mechanism itself — the value-slot case (`<T> !array { min_items: T }`, a body that cannot inhabit `integer?`); type slots were never blocked, because the kernel's `type_ref` already licenses a parameter at every name position, at any depth, including inside collections.

Two coherent endpoints exist, and the drafted design is the unstable midpoint between them. **Outcome A** finishes what `instance_template` started: the quotation vocabulary grows (a recursive channel on `template_argument`, and the shadow records that channel immediately demands) until every constructor form has a typed open counterpart. **Outcome B** abandons typed open representation: an open entry holds its desugared source body as an uninterpreted tree in a `( body | template )` field group on `type_definition`, bound against constructor vocabulary once, at materialisation.

Both outcomes resolve `<T> ( T | error )`. Both preserve everything the base report got right: R4's checking split, R5's regularity rule, D6's closed-side identity and cross-channel deduplication, knot-tying, R8's conformance tiering, R9(b)'s content-derived naming. They differ in what they spend and where: A spends vocabulary to keep open entries typed and self-hosted; B spends the typed-open property to delete most of the mechanism. The recommendation (§8) is Outcome B.

## 2. The Defect, Restated at Its Root

**AD1 — The collection gap lands on the flagship.** `template_argument` is `( param | value | type_ref )` with no collection case, so a parameter inside `tuple.elements` or `choice.variants` has no open form — whether written inline or as a declaration's whole body, since D7's uniformity rule forces an `instance_template` body whose bindings cannot hold `[T error]`. R10 makes the REST surface the deciding vote on Tranches B/D — `request<T>`, `paged<T>`, the error envelope — and a sum-typed result envelope, `result => <T> ( T | error )`, is *precisely* a parameter in `choice.variants`. As drafted, the demand experiment cannot be run honestly: it would return its verdict on a mechanism unable to express the pattern most likely to decide it.

**AD2 — The obstruction was value slots only, and the mechanism re-solved a solved problem.** D7 diagnoses this correctly ("The obstruction is not the type slot… but the **value** slots") and then quotes type slots anyway. The kernel's `type_ref` doc grants the license in full: "`name` is the referenced type — **or, within a template body, a parameter of either kind**, read against the enclosing definition's `parameters` list," and that license holds at every `type_ref` position at any depth. `choice.variants` is `[type_ref]`; `tuple.elements` bottoms out in `type_ref`s. So `<T> ( T | error )` desugars to a body — `!choice { variants: [T error] }` — that is representable in the **closed** vocabulary today, with `T` riding the reference channel. The only rule forbidding it is D7's uniformity clause ("every open entry uses `instance_template`, including ones that would not need it"), whose stated purpose — telling open from closed "by looking" — is redundant with the `parameters` field D7 itself declares equivalent ("imply each other") sitting beside the body in the same `type_definition`.

**AD3 — The kernel spells "a parameter" three ways for one problem.** (1) `type_ref`'s reference channel — free, works everywhere names go. (2) `record_field.value_param` — the record vocabulary widened in place, "legal only in template bodies." (3) `template_argument.param` — quotation of the application. Mechanisms 2 and 3 solve the same obstruction (a value slot needs a parameter spelling) by different means; mechanism 3 additionally re-covers mechanism 1's ground, which is where the collection hole comes from. Record templates unquoted, instance templates quoted, collections orphaned: a midpoint, condemned by the base report's own strongest recurring argument — "do not make every consumer walk two representations," used to reject both D8 and D7's first form.

## 3. The Principle, and the Axis It Defines

**Any slot that holds names can hold a parameter for free, because a parameter is a name. Any slot that holds immediate values cannot, and needs widening, quotation, or delayed binding.** Type slots ride `type_ref` — name-indirect, late-bound by construction. Value slots (`min_items`, `format`, `unordered`, atom constraint fields, enum members) are immediate. The template problem, in every design, is only ever about the immediate slots.

The designs then differ along one axis — *how the immediate slots get their parameter spelling* — and the drafted `instance_template` sits between the two coherent endpoints: quote **everything, completely** (Outcome A), or quote **nothing, and bind late** (Outcome B). The base report chose "quote everything" and stopped early; `record_field.value_param` is a fragment of Outcome A applied to one node, and #53 is the unquoted remainder.

## 4. Outcome A — Complete the Typed Quotation

**Design intent.** `instance_template` was the right idea executed partially: a typed, self-hosted quotation of constructor applications. Outcome A finishes it, so that every form the constructor vocabulary can express has an open counterpart, and the open counterpart is ordinary kernel vocabulary validated by ordinary record validation — preserving D7's shape invariant (`instance_template` present ⟺ open) and the base report's §13 contribution in full.

**The minimal spelling, and why it does not stay minimal.** `SPEC-FEEDBACK.md` #53 names it: a recursive fourth channel on `template_argument`:

```tson
template_argument => {
  ( param: param_name | value: value | type_ref: type_ref
  | list: [template_argument] )
}
```

This covers `choice.variants` — `[type_ref]` is flat, so `variants => { list: [ {param: T} {type_ref: error} ] }` — and it covers nothing else that was missing. `tuple.elements` is `[tuple_element]`, a collection of *records* (`element_type` plus `state`), so the channel's elements must be able to carry a quoted `tuple_element`, which is a fifth channel and a shadow record:

```tson
template_tuple_element => {
  element:  template_argument
  state:    element_state ~ REQUIRED
}
```

`enum.members` is a `token_set` (a parametric member is a value inside a collection); `record.fields`, were record templates migrated onto the same representation, is `[record_field]` with its own value group. Each recursive position in the constructor vocabulary demands its quoted counterpart, and the endpoint of that demand is the **shadow family**: `template_array`, `template_map`, `template_tuple`, `template_choice`, `template_enum` — one open counterpart per constructor, each widening its value slots to `( value | param )` and its collections element-wise. The slope from "one more channel" to the full family is short and one-way, and Outcome A is honest about walking it to the end: a partially completed quotation is the drafted defect again, one layer down.

**What the completed form buys.** Every open entry is typed vocabulary: resolved fixtures containing templates validate, diff, canonicalise, and self-describe exactly like closed entries. Declaration-time checking becomes *validation* — binding keys, coverage, concrete-slot typing all fall out of reading the body against its shadow type, with no masked-walk procedure. Open-vs-closed remains decidable by body shape (D7's invariant, now watertight because the shadows exist for every constructor). D9's production and its rationale stand unchanged. `value_param` can retire *into* the system rather than out of it: record templates move onto `template_record`, unifying the three parameter spellings of AD3 into one — quotation everywhere.

**What it costs.** The kernel roughly doubles at the constructor layer, and the cost recurs: every meta-layer constructor with immediate slots needs a shadow (`<F> !float_type { format: F }` is a legitimate template, so `template_float_type` follows, and so on for each atom vocabulary meta adds — the format's sanctioned extension point now ships in pairs). Every consumer that walks open entries walks a second representation of every form — the sin the base report invokes against D8 and against D7's first form, now adopted as the price of the typed-open property. The desugar table gains a template column (each sugar form over a parameter desugars to its shadow). And the maintenance invariant — shadow stays congruent with constructor — is a discipline where B has a theorem.

**Costs contained.** R8 confines all of it to the authoring tier: closed entries reference no shadow, so data consumers and resolved-output consumers meet none of the new vocabulary. The shadow family is mechanical enough to generate rather than hand-write, and a conformance test (shadow ≅ constructor with widened slots) makes the congruence checkable.

## 5. Outcome B — Held Form

**Design.** An open entry carries no constructor body at all. It holds its desugared source body as an uninterpreted tree — quoted code as data — bound against constructor vocabulary exactly once, at materialisation, the only moment binding is decidable. Two kernel changes:

```tson
@doc:"""
  Held form primitive. Instance of the unit atom constructor. The
  canonical desugared source form of an open entry's body — held,
  not bound: its parsing contract is any well-formed annotated value,
  read into a tree and never resolved against constructor vocabulary
  until materialisation. Parameter tokens within it are read against
  the enclosing entry's `parameters` list.
  """
form => !unit {}

type_definition => {
  source:       type_ref?
  kind:         type_kind
  parameters:   [param_name]?
  constructor:  boolean ~ false
  supertypes:   [type_name]?
  subtypes:     [type_name]?
  disjoint:     boolean?
  ( body: top | template: form )
}
```

The REQUIRED field group is the load-bearing move — the same discrimination-by-shape trick `type_argument` and `template_argument` already use. It recovers what D7's uniformity rule bought, at none of its cost: open-vs-closed is decided by which member is present, structurally, on the node where `parameters` also lives, under a three-way invariant (`parameters` non-empty ⟺ `template` present ⟺ `body` absent) checkable in one place. Holding the tree *outside* `body` keeps `top` honest — every body is a constructor body, construction transfers kind, no non-value intermediate enters the subtype lattice — and §4.6 keeps its no-carve-outs ending: the reading rule for the held tree lives where the kernel already puts such contracts, in a unit atom's prose (exactly as `value` and `token` do for their own "dependencies the schema language does not express").

**Why the tree is the better tree to walk.** Substitution over the held form is *one rule* — rewrite tokens that resolve into `parameters` — uniform across type slots, value slots, collection elements, and nesting depth. Every per-channel mechanism, in the draft and in Outcome A, is compensation for binding too early: once a form is bound into typed vocabulary, each slot kind needs its own spelling of a hole. Held as a tree, a hole is a free token. Bind once.

**The deletion cascade.**

- `instance_template`, `template_argument`, and the `map_field_name_template_argument` synthetic delete.
- **D9's production deletes, and its §11-rejected first form becomes correct.** The rejection argued the two forms "resolve against different vocabulary" and an ABNF should show it; under B the parameterised payload resolves against *no* vocabulary at parse time — it is held — so `[type-params] instance` is again the right grammar. The payload restrictions vanish (the payload is arbitrary held form), and the atom-refinement hazard inverts: `<N> !integer ^ { min: N }` stops being a form the grammar must forbid and becomes a candidate feature, since a held refinement materialises like anything else.
- **Open synthetics delete as a category.** They existed because `instance_template` bindings could not nest, forcing inner parameter-bearing forms to lift out. A tree nests natively; a template holds its whole body. **D5 restates:** concrete forms lift closed at desugar; a template declaration holds one tree and lifts nothing; materialisation substitutes, then desugars-and-lifts the now-concrete forms closed, innermost-out. D6 loses its trickiest clause (open-synthetic identity up to consistent renaming); alpha-normalisation survives only inside R9(b)'s hashing, if template identity for tooling is wanted.
- **`value_param` retires.** Record templates hold trees too; `record_field`'s group returns to plain `value?`. Tranche B's special dispensation — "no new vocabulary because `record_field` already admits parameters" — generalises to every constructor for the same reason, and the **B/D tranche split dissolves into one tranche with one mechanism**.
- `SPEC-FEEDBACK.md` **#53 loses its subject**: `<T> ( T | error )`, `<T> [T, text]`, nested sized forms, parametric enum members, and parameterised atom vocabularies are all just trees.

**Fixture recount (§8 of the base report).** box: one closed synthetic, one instantiation. grid: two closed synthetics, one instantiation — from either spelling, since the whole-body form's extra reference entry existed only to keep an open synthetic's internal name out of identity, and there are no open synthetics. Reuse becomes self-evident (substitution reads a tree it never writes); the tree fixture's knot ties as before, through the closed synthetic minted at materialisation.

**Costs, honestly.** Open bodies are opaque to generic schema tooling — a `form` is a blob until the reading rule is applied — mitigated by declaration-time checking having already run, and confined by R8 to the resolver/authoring tier, the one tier that holds an AST regardless. The held form's canonical spelling must be pinned (recommended: the desugared canonical form, sugar expanded per the §4.2 table) because R9(b)'s determinism and fixture diffing now hash the tree. And the §13 novelty claim is deliberately abandoned — §12 below.

**Checking.** R4's split survives procedurally: the declaration-time walk — binding keys against the target's vocabulary, REQUIRED-without-default coverage, typing of concrete bindings, the unreferenced-parameter error, R5's regularity check — runs over the tree with parameter positions masked; materialisation checks what substitution supplies. This is the same engine A runs declaratively and the draft ran partially; **the engine is identical under every option — only the serialised artifact differs.**

## 6. Invariant Under Both Outcomes

Preserved verbatim, because none of it ever depended on which open representation exists — only on open forms being recorded and closed innermost-out: R4's split; R5's regularity rule (and its role in keeping D6's identity decidable); D6's closed-entry identity, constructor-keyed synthetics, and cross-channel deduplication; instantiation entries keyed on the flattened application in `source`; §8.3 aliasing; knot-tying; R8's tiering — under both outcomes strengthened, since closed entries carry no shadow vocabulary and no `template`, so a resolved-output consumer needs zero template machinery; and R9(b)'s content-derived naming.

Worked under either outcome, `something => <T> ( T | error )` closed via `something<text>` yields one instantiation entry — `source: { name: something  arguments: [{name: text}] }`, body `!choice { variants: [text error] }`, `disjoint` computed by the ordinary derived-index machinery, which consumes constructor bodies and under both outcomes has nothing to look through.

## 7. Severable Interim Fix

If the A/B decision is deferred, one sentence resolves the flagship case against the base report as drafted: **scope D7's uniformity rule — an open entry carries an ordinary constructor body whenever every parameter occurrence sits at a `type_ref` position; `instance_template` is required only where a value slot is parameter-bound.** Choice, tuple, `[T]`, and `{K => V}` templates fall out immediately (AD2), and the R10 experiment becomes runnable. Under A this is subsumed once the shadows exist; under B it is subsumed entirely. It is compatible with both, and with neither.

## 8. Recommendation and Decision Procedure

**Recommendation: Outcome B**, on proportionality and on the base report's own principles. The immediate slots the whole mechanism exists for are a handful of scalars; A prices them at a shadow per constructor, recurring with every future meta layer, while B prices them at one unit atom and one field group. A adopts the two-representations cost the report twice rejected; B deletes more of the report than it adds (D7, D9, open synthetics, `value_param`, the payload restrictions, the tranche split). A's congruence between shadow and constructor is a maintained discipline; B's single-source-of-truth is structural.

**The deciding question is the fixture story, and it is a fair fight.** A is the only outcome under which open entries are typed, validating, self-hosted vocabulary — fixtures containing templates check like everything else, and the §13 contribution stands complete rather than partial. If that property is a requirement of the *proof* capability, not merely of debugging, choose A and generate the shadows rather than hand-writing them. If — the working position — resolved output's normative surface is its closed entries (post-change the kernel and meta fixtures contain zero open entries, and R8 keeps every conforming consumer from meeting one), the typed-open property is load-bearing for nothing, and B's opaque `template` payload, comparing canonically as a tree, is sufficient. In the R10 spirit: write the flagship schema's resolved fixture both ways before deciding; the diff is the evidence.

## 9. Changes to the Base Report

Under either outcome: D7 and D9 are superseded to §11 with this addendum as the argument (A supersedes their *scope*, retaining their intent; B supersedes both outright); §4.5's worked forms respell (A: shadow-typed open bodies; B: held trees); §4.7's kernel diff replaces `instance_template`/`template_argument` with (A) the completed shadow family or (B) `form` and the body group; §4.8 (A) extends `template-arg` with the collection forms or (B) drops the `instance-template`/`template-def` production family and reinstates `[type-params]` on `instance`; §8's counts update per §5; §10's Tranche D grows to cover the shadows (A) or merges into one tranche with B's engine (B); #53 gains this addendum as its resolution (A) or its dissolution (B). The closed-entry rule restates: an entry with empty `parameters` contains no parameter reference at any depth and (A) no shadow-typed body, (B) carries `body`, not `template`.

## 10. Prior Art, Updated

The two outcomes are the two shipped traditions, now correctly labelled. **Outcome A is the Template Haskell position**: a complete typed quotation AST mirroring the object vocabulary — `Exp`/`Pat`/`Dec` for every syntactic category, maintained congruent with the language it quotes, with exactly A's cost profile (the quotation grammar grows whenever the object grammar does). Its presence in §13 as precedent for D7 was accurate; what the draft missed is that the precedent is a *family* of types, and stopping at one node is where the hole came from. **Outcome B is the Lisp position, arrived at by elimination**: the template body is code held as data, parameters are free symbols, materialisation is substitute-then-eval, where eval is the constructor reader run at the one moment its types can hold the result. Zig `comptime` remains B's closest shipped analogue (generics held until instantiation, memoised on argument identity), with the R4 caveat intact: Zig reports most generic errors at the instantiation site, which is why B's declaration-time masked walk is normative, not optional. CDDL marks the line B must not cross — held textual substitution with no declaration-time checking at all: hold the *tree*, check the *declaration*. The empirical finding of this design cycle, either way: **a quotation typed slot-by-slot is a second grammar, and it will be incomplete wherever the first grammar recurses** — so it must be finished (A) or not begun (B); the midpoint is the defect.

## 11. Considered and Superseded Within This Addendum

**Externalised value routes.** *Proposed* during this addendum's drafting, as a third point between the endpoints: open entries carry ordinary constructor bodies (parameters at name positions riding `type_ref`, per AD2), and a parameter-bound value slot is recorded as field-absent-from-body plus an entry-level side map — `value_routes: {field_name => param_name}?` on `type_definition` — the `( value | value_param )` idiom of `record_field` hoisted to the entry level, with `field_group`-beside-`fields` as the structural precedent. It resolves #53's name-position cases for free and the value-slot cases with one map, deletes `instance_template` and D9, and keeps open bodies typed.

*Superseded by Outcome B*, which dominates it once the serialisation constraint is recognised as policy rather than necessity. Routes' typed open bodies still require a masking rule (a routed REQUIRED slot is absent from a body that must nonetheless validate), so the typed-open property arrives compromised — prose where A has shapes and B has honesty about having neither. Routes retains open synthetics and their identity clause (its bodies are flat, so nesting still lifts), where B deletes the category. And the flat side map is strictly a special case of B's tree: a route is a free token at a value position, which the held form represents with no additional field. Routes was the right repair to the draft; B is the same repair carried to its endpoint. Recorded here because it is the design a reader repairing D7 *in place* will produce first, and the argument that it is a waypoint rather than a destination is the useful part.

## 12. Withdrawn from §13

The claimed contribution — "the open form as **ordinary self-hosted vocabulary**… with no expander-privileged representation" — is withdrawn under Outcome B and stands, completed, under Outcome A. Recorded per the base report's own practice, because the reasoning is the useful part: under B the property is real, novel, and *load-bearing for nothing* — no conformance tier consumed it (R8), no derived index read through it (disjointness and subtyping consume constructor bodies), and its carrier type is where the expressiveness gap lived. Under A the claim should be restated more carefully than the draft made it: the novelty is not that a typed quotation exists (Template Haskell's does) but that it is non-privileged — validated by the same record validation, resident in the same schema map — and that claim is only earned when the quotation is *complete*. Either way the epitaph is the design lesson of this addendum: self-hosting made it possible to give the quotation a type; proportionality decides whether one should; and a quotation half-typed is worse than either answer.
