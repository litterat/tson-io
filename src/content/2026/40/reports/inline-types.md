---
title: "Inline types: a type slot holds a name or a construction"
description: "Removes synthetic entries. A container, tuple, choice or reference written at a use site stays where it is written, held at the field in a meta.type_inline wrapper, instead of being lifted to an entry named by its content. What is declared is nominal and named; what is written in place is structural. It was planned in two phases, and both are recorded as built."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Landed in Revision 40, both phases"
id: "CR-inline-types"
---

# Inline types: a type slot holds a name or a construction

**Status: every open point for phase 1 answered (2026-11-11, §10); awaiting sign-off to start. Written against the
Revision 40 draft as it then stood. No census taken.**
- **The target:** no synthetic entries. Container sugar and a constructor applied at a use site are not lifted,
  nothing is named by its content, and `@meta.synthetic` is gone. Phase 1 (§11) is this and nothing more.
- **How:** a type written where it is used stays where it is written. The resolved form of `tags: [text]` holds the
  construction at the field, in a wrapper: `type: { of: !meta.array { element_type: text } }`.
- **The line it draws:** what is declared is nominal and has a name; a container, a tuple, a choice and a reference
  are structural and are values at the slot that uses them.
- **Why:** entries nobody declared are the costliest rule the complexity ledger measured
  (`complexity-ledger.md` §4.1), and they exist to keep one invariant: every type slot in
  resolved output holds a bare entry name.
- **Two phases, both owed** (§11). Phase 1: nothing is minted and no application of an open record closes in place.
  `page_order => page<order>` is declared and stands under that name; `f: page<order>` at a slot, a record whose
  body applies another open record, and a recursive open record are not yet closable. Phase 2: an application
  closes in place and recursion ties to its declaration. The feature is complete, and what phase 1 leaves
  unusable is restored, only when both are in.
- **Follow-on, each a separate decision** (§11): the sibling reference out of `reference_type`; `C<args>` and the
  sibling form out of the data grammar; more forms over a parameter; inline enums, refined atoms and records.
- **Whether it reduces code is not yet counted** (§4a), but the naming code now has no caller left.
- **Written by hand:** the phase 1 kernel and resolved forms (§3.10), with
  `type_inline => { of: meta.type }`. Three rules of the current text refuse it, one of which keeps a map's key a
  name.
- **Tested:** one sealed `TypeExpr` reads and writes a name or an inline type, with no change to the bind engine
  and changes to the compiled readers only, most of them patched in a spike written against the marker (§7.3).
- **Not checked:** the knock-on for forms over a parameter (§5.2).

**How to read the evidence.** Sizes and counts are from `complexity-ledger.md`, measured on the
first implementation as it stood while Revision 40 was open. A figure marked *estimate* is a reading of parts of larger
classes and not a count.

## 1. The rule

A slot that names the type of a value holds a **name** or a **construction**. A name is looked up; a construction is
the type. Container sugar and a constructor applied at a use site (`[text; 1..]`, `{text => money}`, `[a, b]`,
`( a | b )`, `set<text>`, `meta.ref<order>`) desugar in place to the `!C { … }` value they denote. Nothing is lifted,
and nothing is given a name the author did not write.

**The symmetry.** [TSON-SCHEMA] §5.2 already requires a bare record and an inline refinement to be declared. With this
rule the two halves are stated the same way:

- Every record, every enum and every atom that reads a value is nominal: declared, with a name in the schema.
- Every container (`[T]`, `set<T>`, `{K => V}`), tuple (`[A, B]`), choice (`( A | B )`) and reference
  (`meta.ref<T>`) is structural: a value at the slot where it is written, or the body of a declaration where the
  author names it.

A reference is the one atom on the structural side: `meta.reference_type` is an atom constructor, and `meta.ref<T>`
is already written where it is used. The structural kinds are exactly those with a sugar or an application spelling
today.

### 1.1 What the resolved form looks like

```
order => { id: uuid  customer: customer  tags: [text]  prices: {text => [money]} }
```

`uuid` is a kernel atom and `customer` a record declared elsewhere in the schema.

Today every field's `type` is a name, two of them minted:

```
order => !meta.record { fields: [
  { name: id        type: uuid }
  { name: customer  type: customer }
  { name: tags      type: array_text_xxhash }
  { name: prices    type: map_text_array_money_xxhash } ] }
@meta.synthetic array_text_xxhash           => !meta.array { element_type: text }
@meta.synthetic array_money_xxhash          => !meta.array { element_type: money }
@meta.synthetic map_text_array_money_xxhash => !meta.map { key_type: text  value_type: array_money_xxhash }
```

Proposed, a field's `type` is the name the author wrote or the construction the author wrote, the construction held
in a `meta.type_inline` (§3.3):

```
order => !meta.record { fields: [
  { name: id        type: uuid }
  { name: customer  type: customer }
  { name: tags      type: { of: !meta.array { element_type: text } } }
  { name: prices    type: { of: !meta.map {
                              key_type: text
                              value_type: { of: !meta.array { element_type: money } } } } } ] }
```

`id` and `customer` are the same in both. Inside a construction a slot holds a name too: `element_type: text`,
`key_type: text` and `element_type: money` are references exactly as `type: uuid` is.

The bundled schemas use the sugar themselves. `meta-resolved.tn` holds six lifted entries
(`array_type_ref_xxhash`, `array_text_1_xxhash`, …) and `net-resolved.tn` three; each would move into the slot that
wrote it, and the `xxhash` placeholder convention would go with them.

### 1.2 How it behaves

- **Identity is structural.** Two constructions are the same type when they have the same constructor and the same
  fields, compared recursively, with names as the leaves. The content-keyed name simulates this today. Annotations
  and `@doc` take no part: an annotation never changes which values conform. Each site keeps its own, nothing being
  merged.
- **A name and a construction are never the same type.** A name equals a name, past alias hops; a construction
  equals an equal construction. `text_list => [text]` is not an inline `[text]`, which keeps identity transitive.
- **A cycle passes through a name.** `node => { children: [node] }` holds
  `type: { of: !meta.array { element_type: node } }`.
  An inline construction cannot name itself, so the structure is a finite tree, and the self-reaching exception
  ([TSON-SCHEMA] §5.10.1) does not arise for sugar.
- **Subtyping is untouched.** A lifted container, tuple or choice has an empty `chain` today. A construction at a slot
  is never a record, so it takes no part in `chain.supertypes` or `chain.subtypes` either.
- **A value is read against an inline reference, and no other inline type.** A `~` or `=` value is admitted only on
  a field whose type is an atom or an enum ([TSON-SCHEMA] §5.2). A reference is an atom, so `handler?:
  meta.ref<method> ~ orders.place_order` holds, and `value?: type!` reads against a sibling that is a reference
  written in place. A container, a tuple and a choice take no value, written in place or declared.
- **Nothing to unify across documents.** Each document carries its own construction; equality is structural.
- **A data document can no longer name one.** Today a derived name written as a tag is not refused
  ([TSON-SCHEMA] §8.2: "a valid identifier in the namespace … such a document was written by reading one processor's
  output and fails at the next"). With no entry there is no name to guess.
- **Diagnostics locate a type by where it is written,** a field path, never by a minted name.
- **Sharing a reader is private.** An implementation may intern equal constructions; that is a cache, not an entry.

### 1.3 Which slots

The slots where a value's type is written: a record field's `type`, `meta.array.element_type`,
`meta.map.value_type`, `meta.tuple_element.element_type` and `meta.choice.variants`. An operand of `&` or `^`, a
parameter's `bound`, an alias's `target` and a reference's `of` stay names. An argument of an application is
undecided (§3.1).

**A map's `key_type` stays a name in phase 1** (§3.10): `meta.namespace` narrows it to `meta.identifier_ref`, and
§5.7 refuses narrowing a choice to one of its variants.

- **It is close to today's rule.** §5.3 already says the sugar's key "accepts a type reference … not a paren or
  bracket form: composite map key types deserve a named declaration", and `!meta.map { key_type: … }` takes a name
  too. So a tuple, an array or a choice as a key is declared today.
- **What is newly refused is an application as a key:** `{meta.ref<method> => V}` and `{set<text> => V}`, which
  lift to a synthetic today. The form is declared, `method_ref => meta.ref<method>`, and named. No schema in the
  corpus writes one.
- **Inside an open record nothing is lost:** `{T => V}` closes with the argument, and an argument is a name.
- **It is a rule, not a gap.** Phase 2 does not change it; only widening §5.7 would.

**Resolved output keeps what the author wrote:** a name where they declared, a construction where they wrote sugar.

## 2. Why

### 2.1 What one invariant costs the specification

Synthetic entries exist to uphold one sentence of [TSON-SCHEMA] §4.2: every slot that names the type of a value, in a
closed entry, holds a bare name. That sentence is paid for in five places:

- **Resolved output is not canonical.** Internal names are an implementation's choice, so two conforming resolvers
  produce different documents for one schema, and §8.2 defines comparison as "equality up to renaming of internal
  entries" where plain value equality would do.
- **`@meta.synthetic` and its ingest rule.** A kernel annotation that a source document may not write, that is
  attached to keys in output, and that is discarded and recomputed when a resolved form is read back.
- **A leaky namespace.** A synthetic is an entry of the schema's root, so a data document may tag with its derived
  name; §8.2 says so, and says the document then fails at the next processor.
- **Diagnostic back-mapping.** A message must not name what the author did not write, so a processor carries a way
  to recover the written form from a minted entry (the first implementation has one).
- **Deduplication across imports.** Two imported schemas that each wrote `[text]` each minted an entry, and the
  linker has to unify them by structure.

### 2.2 What it costs the implementation

The ledger groups four rules as "entries nobody declared": a use-site application is its expansion, container sugar
lifts a content-keyed synthetic, a minted record is a member of nothing, and an applied parent's IS-A edges. Together:

| Signal | Measured |
|---|---|
| Code that exists to name, key and merge minted entries | about 800 lines (*estimate*); about 310 in classes that exist only for it |
| Commits touching its distinctive symbols | 121 |
| Open gaps in the implementation's backlog that are its gaps | 6 |
| Conformance vectors | 38: 25 valid, 13 invalid |
| [TSON-SCHEMA] §8.2 | 17 KB, the sixth-largest section of Part 2 |
| Rules the Revision 40 editor found awkward to state | 4 of 11 |

The vectors are few and mostly valid, so the cost is machinery and not a boundary.

**Essential against accidental.** Essential: a nested form at a field must reach a reader, and `[text]` written twice
must not be two incompatible types. Accidental: giving it a name, keying the name on content, and reconciling the
copies.

## 3. How the slot is typed: the options

No choice is made here. §3.8 gives an assessment.

### 3.1 What has to be typed

In `{ name: tags  type: !meta.array { element_type: text } }` the question is what type `record_field.type` has. Today
it is `meta.field_type_ref`, an atom whose value is one token, and an atom cannot hold a record. The same question
arises at `meta.array.element_type`, `meta.map.key_type` and `value_type`, `meta.tuple_element.element_type`, each
element of `meta.choice.variants`, and at every slot an extension vocabulary types `meta.type_ref` (§3.6).

**An argument is a harder case.** An application is one token, `page<order>`, and its arguments are inside the token.
`order_page => page<[order]>` works today because the sugar lifts and the argument is the lifted entry's name. A
construction is a record and cannot sit inside a token, so under every option below either an argument is a name (the
author declares `orders => [order]` first), or an application stops being a token (§4.1).

### 3.2 Option A: `C<args>` stays in the slot (a construction reference)

`meta.reference_type` already reads `C<args>` as a value (`set<text>`, `meta.array<text>`, `meta.map<text int32>`,
`meta.ref<method>`). The smallest change is to stop lifting a closed one and leave it in the slot in resolved output.
The slot's type does not change.

- **What works at once:** an unsized array, a set, an unsized map, a reference, and an applied open record
  (`pair<text int32>`).
- **Where it stops:**
  1. **A sized or voidable container.** `[integer; 1..10]`, `[text?]` and `{text => order?; 1..}` set `min_items`,
     `max_items` and `voidable`. An argument is a type and fills a required reference field, so no argument list
     carries them.
  2. **A choice and a tuple.** `meta.choice.variants` is a list of references and `meta.tuple.elements` a list of
     records; neither is a field an argument fills.

Option A covers the forms with no facets and leaves the rest lifting, so the machinery stays.

### 3.3 Option B: a kernel choice

The slot holds a reference or the constructed value, and its type says so:

```
type_expr       => @meta.disjoint ( meta.type_ref | meta.type )
field_type_expr => @meta.disjoint ( meta.field_type_ref | meta.type )

record_field => { type: meta.field_type_expr  …  value?: type! }
array        => meta.product & { element_type: meta.type_expr  … }
choice       => meta.sum & { variants: [meta.type_expr]  … }
```

- `id: uuid` holds the reference `uuid`.
- `scores: [integer; 1..]` holds `!meta.array { element_type: integer  min_items: 1 }`.
- `tags: set<text>` holds `!meta.set_type { element_type: text }`, and `owner: meta.ref<method>` holds
  `!meta.ref { of: method }`.

**The choice is disjoint by form.** Under [TSON-SCHEMA] §5.4 a reference is string-class — `uuid`, `pair<text int32>`
and `kind!` are each one token — and every constructor is a record, so `meta.type` is brace-class. A reader knows at
the first token which it has. The construction still carries its tag, `!meta.array`, because `meta.type` is abstract
and its member is chosen by tag.

It covers every form, facets included, because it is the canonical `!C { bindings }` form §5.6 already defines for a
declaration's body, written where the type is used. A list of slots needs nothing extra: `variants` is a list of the
choice.

**How wide the second variant is.** Two ways to write it:

- **`meta.type`,** as above. Every constructor IS-A it: array, map, tuple, choice and reference, and also record,
  enum and every atom. The kernel's type then admits more than §1 allows, and §1's line is a resolver rule on top. §8
  becomes a relaxation of that rule with no change to the kernel.
- **Only the structural constructors.** Either a list, `( meta.type_ref | meta.array | meta.map | meta.tuple |
  meta.choice | meta.reference_type )`, which is no longer disjoint by class and relies on the tag, or a named
  abstract base those constructors compose:

  ```
  type_inline => abstract {}
  array       => meta.product & meta.type_inline & { … }
  type_expr   => @meta.disjoint ( meta.type_ref | meta.type_inline )
  ```

  The kernel then states §1's line itself, a refined constructor (`meta.set_type`, a schema's `nonempty_type`)
  inherits it, and §8 becomes one more constructor composing `type_inline`, with no slot retyped.

  **Where `type_inline` shows.** In the declaration of `type_expr`, and in the `supertypes` of each constructor that
  composes it. Never in a schema's resolved form: it is abstract, so a value in a slot is tagged with its
  constructor, `!meta.array { … }`, exactly as under `meta.type`.

  **A constraint on how it is declared.** `type_inline` cannot itself compose `meta.type`: `array` would then reach
  `meta.type`'s `chain` field by two paths, which §5.8 refuses even where both paths lead to one origin. It is a
  marker with no fields. A field-less second parent composes cleanly beside `meta.product`: it adds no field name
  for §5.8 to refuse and confers no kind (§5.5), a refinement inherits it, and the implementation accepts it
  (§3.10).

- **A wrapper record,** which leaves the constructors alone. **This is the one taken** (§3.10):

  ```
  type_inline => { of: meta.type }
  type_expr   => @meta.disjoint ( meta.type_ref | meta.type_inline )
  ```

  A slot holds `{ of: !meta.array { element_type: text } }`. Inline is then a fact about the expression, where the
  marker makes it a fact about the type.

  | | Marker (`abstract {}`, composed) | Wrapper (`{ of: meta.type }`) | Bare `meta.type` |
  |---|---|---|---|
  | Constructors change | Five gain a parent | No | No |
  | §5.4's tag rule (§3.10) | Must change | Unchanged: the variant is concrete | Must change |
  | Runs on today's implementation | No | Yes, tagged; a user-schema analog validates | No |
  | Resolved form | `!meta.array { … }` | `{ of: !meta.array { … } }`, a level per nesting | `!meta.array { … }` |
  | §1's line | In the kernel | A resolver rule on `of` | A resolver rule |
  | §8 | One more constructor composes the marker | The rule on `of` relaxes | The rule relaxes |
  | Java | Five bodies implement `TypeInline`; `Type` gains a permit | `record TypeInline(Type of)`; `Type` untouched | `Type extends TypeExpr` |

  It is the pattern §5.4 already recommends for member dispatch: a position typed by the base, not a choice over
  its members. A wrapper is not itself a type, so `{ of: { of: … } }` is refused by `of`'s own typing. Written
  untagged, both variants need the reader's untagged recovery (§7.3); written `!meta.type_inline { of: … }`, nothing
  does.

`meta.type` also bounds what can ever be inline: nothing that is not a type. An alias composes `meta.top` and is not
one; neither is a value such as `!api { … }` (§3.5).

### 3.3a The sibling reference at a field's slot

Separable from phase 1 (§11.3).

`field_type_expr` shows what `meta.field_type_ref` is: a reference that also admits `kind!`. The kernel builds the
sibling form into `meta.reference_type` as a permission, `allow_sibling`, true by default; `meta.field_type_ref` keeps
it, `meta.type_ref` and `meta.identifier_ref` are refinements that set it false, and `meta.ref` exists to withdraw it.
All of that makes one slot different: `meta.record_field.type` is the only place a sibling reference is admitted.
[TSON-DATA] §7.4 already has two productions, `reference = sibling-ref / application`, and the first
implementation's model already has two types, `SiblingRef` beside `TypeRef`. Two ways to say so in the kernel:

**As a third variant.**

```
field_type_expr => @meta.disjoint ( meta.type_ref | meta.dependent_ref | meta.type )
```

`meta.dependent_ref` is an atom of its own whose value is a field's name with the `!` suffix. `allow_sibling`,
`meta.field_type_ref` and the refinement that is `meta.ref` go; `meta.type_ref` is built directly on
`meta.reference_type`. Where a sibling may be written stops being a rule and becomes typing: a slot typed
`meta.type_ref` does not hold `kind!` because `kind!` is not one of its values.

- **The catch is disjointness.** §5.4 puts every reference in the string class, so two of the three variants share a
  class. The table needs a row for the sibling form, which §7.4's separate production justifies, or the value carries
  a tag.
- **It needs an atom constructor** whose parser reads `kind!`, where today a facet does.
- **It drops an IS-A edge:** `meta.type_ref` is declared today as a refinement of `meta.field_type_ref`. Whether
  anything rests on that edge needs checking.

**As a field group.** A dependent field does not state its type another way; it states that its type comes from a
sibling. That is a fact about the field, and a group says it:

```
record_field => { ( type: meta.type_expr | type_from: meta.field_name )  …  value?: type! }
```

- No third variant, no new class in §5.4 and no new atom constructor: `type_from` holds a plain field name.
- `value?: type!` in a schema's source is unchanged and desugars to `type_from: type`. Resolved output then holds no
  sibling-reference value, so the `sibling-ref` production is needed by the schema grammar alone, the same question
  §4.1 asks of `C<args>`.
- §3.4's objections to a group do not apply here: the sibling form is admitted in one record, never in a list, and an
  extension's records are described by `record_field` like any other.
- The cost is that `type` may be absent, so every reader of a field's type handles a field that has none.

**Either way** this is separable from inline types and could go first. It does what
[`rev40-proposal.md`](/2026/40/reports/rev40-proposal) §1.1 hoped retiring dependent fields would do, without retiring them. In the
ledger, 21 of the 53 refusal vectors for dependent fields are about where a sibling reference may be written, and the
desugarer's position rule is about 70 lines.

### 3.4 Option C: a field group in each record

No choice type; each record that holds a slot offers two fields, one of which is present ([TSON-SCHEMA] §5.11):

```
record_field => { ( type: meta.field_type_ref | construction: meta.type )  …  value?: type! }
array        => meta.product & { ( element_type: meta.type_ref | element_construction: meta.type )  … }
```

- **For it:** every field keeps one type, and the kernel's slots use no choice. `value?: type!` reads `type` as it
  does now, and a field holding a `construction` has no `type` for a value to be read by, which is §1.2's rule about
  dependent fields stated by the shape.
- **Against it:**
  1. **It is per record.** `record_field`, `array` (and so `set_type`), `tuple_element`, and `map` twice, each
     restate the group, and each consumer reads two fields where Option B reads one.
  2. **A list cannot hold a group.** `choice.variants` is a list of references, so each variant would become a record
     with the group in it, which changes the shape of every choice in resolved output.
  3. **The field's name depends on what was written.** For a kernel slot the desugarer can put `[text]` under
     `construction`. At an extension's slot nothing knows the pairing, so the author would write the second field
     name by hand (§3.6).

### 3.5 The pattern under Option B: a name or the thing

`type_expr` is one instance of a shape any schema can write: a reference to an `X`, or an `X`.

```
handler: ( meta.ref<method> | method )      # a method by name, or one written in place
```

A reference is a token and a record is braces, so the choice is disjoint by class whatever `X` is. An extension
vocabulary should be able to write this today for its own values with no kernel support; it has not been tested.
`type_expr` is the kernel using it at `X = meta.type`.

It cannot be written once and applied: `<X> ( meta.ref<X> | X )` is a choice over a parameter, which a template body
may not be ([TSON-SCHEMA] §5.10). Each use is written out.

### 3.6 Extension vocabularies

A meta layer declares its own records and namespace types, whose instances are value entries: the corpus fixture
`meta-api.tn` has `method => { request?: meta.ref<meta.record>  response?: meta.type_ref  … }`,
`api => !meta.namespace { key_type: meta.identifier  value_type: method }` and
`route => { …  handler: meta.ref<method> }`, used as `myapi => !api { get_orders => { … } }`.

- **A slot typed `meta.type_ref`** (`method.response`) stays a name. The vocabulary's author opts in by typing it
  `meta.type_expr`, and `response: [order]` then holds the construction. This is a gain: in a value entry's body
  nothing lifts or mints today, so sugar or an application there is refused and the author is sent to declare a name.
  With nothing to mint, the reason for that refusal is gone.
- **A kind slot** (`request: meta.ref<meta.record>`) stays a name: a record is nominal. A kind over a structural
  constructor would pair with it the same way, `( meta.ref<meta.array> | meta.array )`.
- **A slot naming a value** (`handler: meta.ref<method>`) is untouched, and §3.5's pattern is there for an author who
  wants a method written in place.
- **A constructor a schema refines** is covered: `nonempty_type => meta.array ^ { min_items?: = 1 }` IS-A
  `meta.array`, so `!nonempty_type { element_type: order }` is admitted wherever `meta.type` is.
- **Sugar always means the kernel's constructions.** `[order]` is `!meta.array { … }` at whatever slot admits it. A
  vocabulary gets no sugar of its own; its values are written in braces.
- **Under Option C** an extension cannot follow: `response: [order]` would have to land in a second field the
  vocabulary declared and the author named.

### 3.7 The options side by side

| | A: `C<args>` in the slot | B: a kernel choice | C: a field group per record |
|---|---|---|---|
| Type of `record_field.type` | `meta.field_type_ref`, unchanged | `meta.field_type_expr` | `meta.field_type_ref`, beside `construction: meta.type` |
| Sized and voidable containers | No | Yes | Yes |
| Tuples and choices | No | Yes | Yes |
| A list of slots (`variants`) | Unchanged | A list of the choice | Each element becomes a record |
| `value?: type!` | Unchanged | Reads `type`, a name wherever a value is admitted | Reads `type`; absent beside a construction |
| Extension slots | Unchanged | Opt in with `meta.type_expr` | The author names a second field |
| Synthetic entries left | Most | None for sugar | None for sugar |
| New in the kernel | Nothing | Two choices | A group in five records, and a variant record |

### 3.8 Assessment

Option A does not remove the machinery. Option C keeps the kernel free of a choice at the price of a group in every
slot-bearing record, a new record for a choice's variants, and no route for an extension. Option B is one rule at
every slot, lists and extensions included, and is the pattern of §3.5 that a vocabulary can use for itself. What
Option B leaves open is the width of its second variant (§3.3) and what an argument holds (§3.1).

### 3.9 Lifting and in-place construction side by side

| | Synthetic lifting (today) | In-place construction (Options B and C) |
|---|---|---|
| Model | Every type has a key in the schema, so a structural type is given a made-up name | A nominal type has a name; a structural type is a value at its slot |
| Resolved output | Differs between implementations; compared up to renaming | Equal as values, with nothing to rename |
| Kernel | `@meta.synthetic`; every slot `meta.type_ref` | `@meta.synthetic` goes; the slot's typing is added (§3.7) |
| Phases | The desugarer lifts, the resolver resolves the lifted entry, a merge deduplicates, the import merge deduplicates again | Desugaring is a local rewrite; no lift, no minted name, no merge |
| Subtyping | A synthetic has no supertypes | A construction at a slot is never a record and has no `chain` |
| Recursion | `[node]` lifts to an entry that names `node` | The slot holds `!meta.array { element_type: node }`; the cycle passes through `node` |
| Dependent fields | `type!` looks up a synthetic's name | Never read against a construction, a value being admitted only on an atom or an enum |

"Equal as values" is the claim, and not byte-identical: two resolvers still have to agree on how a document is
written out before their bytes agree, and nothing here supplies that.

### 3.10 What writing the kernel by hand showed

`meta.tn`, `meta-resolved.tn` and `net-resolved.tn` were
rewritten by hand for phase 1 under Option B with the wrapper. Their difference from the Revision 40 draft's is the proposed
kernel. It was written first with the marker (`type_inline => abstract {}`) and then rewritten.
The files parse; nothing reads them yet (§7.3).

**What it looks like.**

```
type_inline     => { of: meta.type }
type_expr       => @meta.disjoint ( meta.type_ref | meta.type_inline )
field_type_expr => @meta.disjoint ( meta.field_type_ref | meta.type_inline )

record_field  => { type: meta.field_type_expr  …  value?: type! }
array         => meta.product & { element_type: meta.type_expr  … }
map           => meta.product & { key_type: meta.type_ref  value_type: meta.type_expr  … }
tuple_element => { element_type: meta.type_expr  … }
choice        => meta.sum & { variants: [meta.type_expr]  … }
```

No constructor's parents change. In the resolved form:

```
members  => !meta.record_field {
  type: { of: !meta.array { element_type: { of: !meta.array { element_type: text  min_items: 1 } }  min_items: 1 } }
}
variants => !meta.record_field { type: { of: !meta.array { element_type: meta.type_expr } } }
type_inline => !meta.record { fields: {
  of => !meta.record_field { type: meta.type }
} }
```

| File | Lines | Entries |
|---|---|---|
| `meta.tn` | 1116 → 1150 | |
| `meta-resolved.tn` | 494 → 498 | 81 → 77: six synthetics and `meta.synthetic` out, three entries in |
| `net-resolved.tn` | 143 → 137 | 26 → 23: three synthetics out |

The kernel grows: three entries and their `@doc` against one annotation. The resolved forms barely move, because
the bundled schemas write little sugar in a slot. Whatever phase 1 saves is in the prose and the code, not here.

**Three rules of the current text refuse it.** Each needs a spec change that phase 1 has to carry:

1. **Narrowing a field to one variant of its choice is refused** (§5.7): a restated type must be the inherited type
   or IS-A it, and a variant is not IS-A its choice. So `namespace => meta.map ^ { key_type: meta.identifier_ref }`
   fails once `key_type` is a choice. Taken here: `key_type` stays `meta.type_ref`. The alternative is a §5.7 rule
   that a restated type may be IS-A one variant, which changes user schemas too.
2. **A dependent field's sibling is typed by a reference** (§5.2). `record_field.value?: type!` now has a sibling
   typed by a choice. The rule widens to admit `meta.type_expr` and `meta.field_type_expr`; a value is still never
   read against a construction.
3. **An argument slot is a field typed by a reference naming types** (§5.3). `element_type` and `value_type` are now
   `meta.type_expr`, so the definition has to include it or `meta.array<text>` stops constructing.

**A fourth, which the wrapper avoids.** Under the marker, and under a bare `meta.type` variant, a slot value tagged
`!meta.array` names a subtype of an abstract variant, and §5.4 reads a tag as naming a variant exactly. The wrapper
is a concrete variant, and the construction sits at `of`, a position typed by the abstract `meta.type`, where a
subtype's tag is admitted (§7.2). The defect stands on its own as `SPEC-FEEDBACK.md` #4: a choice with an abstract
variant has no values through it.

**The line of §1 is a resolver rule.** `of: meta.type` admits a record or an enum construction; that it holds a
container, a tuple, a choice or a reference is stated in `type_inline`'s `@doc` and kept by the resolver. §8 relaxes
that rule and changes no entry.

**An implementation gap beside them.** The reader gives an untagged value at a disjoint choice to a scalar-class
variant only. A reference token at `( meta.type_ref | meta.type_inline )` is refused for want of a tag, and so is an
untagged `{ of: … }`. The schema is accepted as disjoint; data at it does not read (§7.3 has the patch).

**Decided while writing, each open to change:**

- An inline body has no `chain`. In phase 1 every inline body is a container, a tuple, a choice or a reference,
  whose chain is empty, and an empty chain is omitted ([TSON-SCHEMA] §8.1). Whether an in-place record carries one
  is phase 2's question (§4.2); under the current text it does not, an undeclared expansion that would join a
  family being refused (§5.2).
- The wrapper is written untagged, `{ of: … }`, the choice being disjoint by class.
- `set<T>` and `meta.ref<T>` in a slot are the refined constructor's form, `{ of: !meta.set_type { element_type: T } }`
  and `{ of: !meta.ref { of: T } }`, tagged past the alias.
- `meta.array<T>` at a field's slot inside an open record is `{ of: !meta.array { element_type: T } }` in place; as
  an argument, `box<meta.array<T>>`, it stays an application.
- Neither `meta.tn` nor `net.tn` writes sugar as an argument.

## 4. Applications of an open record: declared, or refused

Part of phase 1 (§11.2).

A record is unlike a container: it has fields and it can stand in an IS-A chain (`ok => <T> result<T> & { … }`), so
it is nominal and needs a name (§1). Phase 1 gives it the one its author writes, and mints none.

| Written | Phase 1 |
|---|---|
| `page_order => page<order>`, a declaration's body | The substituted `!meta.record { … }` under `page_order`, with `@meta.application` on its key, as now |
| `dog => pet_of<dog_type> & { … }`, a composition operand | Absorbed by value, as now ([TSON-SCHEMA] §5.8); no entry |
| `f: page<order>` at a slot of a closed record | Phase 1: not closable; `f: page_order` is written. Phase 2: closes in place (§4.2). Never looked up. Today: the declaration that names it, or a minted record |
| `f: meta.array<order>` at a slot: a closed application of a constructor | The wrapper, `{ of: !meta.array { element_type: order } }` |
| `items: [T]`, `items: meta.array<T>` in an open record | Held as the application `meta.array<T>`, as now; closing it gives the wrapper |
| `cursor: box<T>` in an open record | Held as the application, as now. Phase 1: the record cannot be closed. Phase 2: closes in place (§4.2) |
| `node => <T> { value: T  next?: node<T> }` | Phase 1: cannot be closed. Phase 2: `node_text => node<text>` holds `next: node_text` (§4.2) |
| `page<[order]>`, `page<meta.array<order>>`: a construction as an argument | Refused; `orders => [order]` is declared and `page<orders>` written |

**There is then no synthetic entry anywhere in TSON:** no `@meta.synthetic`, no `@meta.application` on a minted
key, no internal names and no rule for their freshness, no deduplication within a document or across imports, and no
renaming in the comparison of resolved forms. Every application the consumer schemas measured is declared already
([`template-simplification.md`](/2026/40/reports/template-simplification) §2.1).

**An application is not a second name for a declaration.** Today a closed application "resolves to the declaration
that names it where one exists" ([TSON-SCHEMA] §5.10). At a slot that goes: `page<order>` is never looked up, so
there is one way to name `page_order`.

**Kept: the applied parent's edge.** One lookup of a declaration by its application is not at a slot. Over

```
result => <T> { payload: T }
ok     => <T> result<T> & { note: text }
result_of_text => result<text>
ok_of_text     => ok<text>
```

`ok_of_text` is IS-A `result_of_text`, because the parent `result<text>` denotes "the entry that application denotes
where one exists" (§5.8, §5.10), and a position typed `result_of_text` admits an `ok_of_text`. The corpus pins it
(`a-subtype-template-closes-to-an-is-a-edge`). It is how a generic family closes into a family, and it stays: the
parent names no position's type, the edge is derived, and `@meta.application` on a declared key is what it consults.
The comparison of canonical applications (§8.3) stays for it, and phase 2's recursion rule uses the same comparison
(§4.2). Not taken: dropping the edge, which would have a family over a generic base written against the closed base
by hand.

**One rule for an application over a parameter.** Inside an open record an application whose arguments hold a
parameter is kept as written, whichever its head: `meta.array<T>` and `box<T>` alike. When the record is applied the
application closes. A constructor's closes to the wrapper. The desugarer's path for a form inside an open record is unchanged, and a size
or a `?` over a parameter stays inexpressible (§11.3).

### 4.1 Does the data grammar still need `C<args>`?

If a construction is expanded in place and an application of an open record is declared, a closed entry never holds
`C<args>`. It survives in resolved output in one place, an open record's `parents` and field types, where an
application over a parameter is held until the record is applied (and in `@meta.application` on a declared
instantiation, if that annotation stays).

So the question is whether [TSON-DATA] §7.4's application production exists for anything but reading a resolved open
record as data. If it did not have to:

- Part 1 would lose the production, §3.2's account of an application as a value, and the `type-arg` rule.
- "In a data document an application is a validation error" would have nothing to refuse. The ledger counts that
  refusal at 53 lines in 27 files across both grammars, tree and bind reading and the JSON stack.
- An open record would need another way to hold `box<T>`: a value such as `!meta.application { head: box
  arguments: [T] }` is the obvious candidate, and it is new kernel vocabulary.

This is a larger change than the rest of the note and is recorded as a question (§10).

### 4.2 Closing in place, and recursion: phase 2

`page => <T> { items: [T]  cursor: box<T> }` is writable, and closing it, `order_page => page<order>`, leaves
`cursor: box<order>`. Nothing may be minted, and an application is not looked up (§4).

**Phase 1 closes none of these.** A record whose body applies another open record, a recursive open record, and
`f: page<order>` at a closed slot are each reported as not yet supported. They are gaps, not rules: the verdict
changes when phase 2 lands, so the specification states the complete rule and no vector pins the refusal.

**Phase 2: an application of an open record closes in place,** as a constructor's does: `cursor: { of: !meta.record
{ … } }`, and the same for `f: page<order>` written at a closed slot. The wrapper already admits it.

- **It is today's meaning with the name taken away.** An expansion is keyed on its content now, so it is
  structural, a member of nothing and cannot be tagged, and one whose chain would name a declared type is refused
  already ([TSON-SCHEMA] §5.2).
- **It is not an author's inline record.** `f: { a: text }` stays refused (§8.2); only an application produces a
  record in place.
- **`f: page<order>` and `f: page_order` are two types** of one shape: the first structural, the second nominal.
- **Recursion ties to a declaration.** `node => <T> { value: T  next?: node<T> }` closed by `node_text =>
  node<text>` cannot expand `next` without end. A nested application equal to the one a declaration is closing
  names that declaration: `next: node_text`. Mutual recursion ends the same way, and regularity (§5.10.1) refuses
  the rest.
- **A recursive application has to be declared.** `f: node<text>` written at a slot has no declaration to tie to,
  and is refused: this is the self-reaching instantiation entry's case, and the one application an author must
  name.

**What phase 2 adds:** a record reader, a writer and a bind target built from a body with no name, in both
encodings. Phase 1 needs that for containers, tuples, choices and references only.

## 4a. Whether it pays: not yet counted

- **The machinery is shared, and applications are its main user.** Of the sixteen calls that derive a name, twelve
  are in the materialiser, two in the desugarer and two in the resolver; the merge and the minted-name ledger serve
  both. With sugar in place and every application declared (§4), none of the sixteen has a caller left, and the
  merge and the ledger go with them.
- **What is added is unmeasured.** Compiled readers are registered by entry name, the container bodies are handled in
  between 8 and 17 files each across both encodings, and each needs a path that starts from a construction.
- **The firm gain is in rules, not lines:** six backlog gaps and four awkward rules exist only because entries are
  minted, and the recovery of a written form for diagnostics is threaded through 22 files.
- **Before sign-off:** a count of what each stage deletes and what it adds, site by site, in the style of
  `complexity-ledger.md` §4.

## 5. What it removes

### 5.1 In the spec and the kernel

- §5.3's lift rule, and §8.2's text on synthetic entries: their names, their identity, their unification across
  documents, and comparison up to renaming.
- The `@meta.synthetic` annotation, and the rule that it is recomputed on ingest.
- §8.2's allowance for a derived name written in data.
- The placeholder convention for content hashes in resolved fixtures and in the corpus runner.

With §4's first option also taken, `@meta.application` on minted keys, content-keyed expansions, "a minted record is a
member of nothing" and the self-reaching exception go too, and §8.2 is left describing instantiation of a declared
application alone.

### 5.2 Likely, and not checked

Inside an open record, `[T]` is today written as the application `meta.array<T>` and held until the record is applied;
a size or `?` over a parameter, and a tuple over one, are refused
([`template-simplification.md`](/2026/40/reports/template-simplification) §1.4). With a construction in the slot, `[T; 1..]` is
`!meta.array { element_type: T  min_items: 1 }` with the parameter where it stands, and substitution replaces it as it
replaces any other. That would reduce "two forms admitted, four refused" to one refusal: a choice over a parameter,
whose disjointness cannot be judged until it is applied. This needs reading against the desugarer and the
materialiser before it is claimed.

## 6. What it costs

- **Two cases at every type slot.** Every consumer of a resolved form, a code generator included, handles a name or a
  construction. Today it handles a name and a lookup.
- **The kernel's own declarations use the slot,** so the bootstrap reads the choice before anything else does.
- **§4.2's rule that a closed slot holds a bare name goes.** Under Option B the kernel gains a choice, and choice is
  itself a candidate for reduction ([`rev40-proposal.md`](/2026/40/reports/rev40-proposal) §1.3); this use is its cheapest form,
  disjoint by class.
- **Depth.** Nesting is unbounded; it needs the resource limit §5.2 already allows for inline forms.
- **No name for a host type.** A generator that needs a name for an inline tuple or choice derives one from where it
  stands. Minted names are non-normative today, so no stable name is lost.
- **A document that tagged with a derived name stops being accepted.** It was already unportable.

## 7. In the implementation

### 7.1 The model mirrors the kernel

The kernel says the slot is a choice, so the model says it too: a sealed `TypeExpr` over the two things the choice
holds. A reference stays a reference, with a name; a type written in place is not dressed as one.

```java
/** What a type slot holds: the kernel's type_expr. */
public sealed interface TypeExpr permits TypeRef, TypeInline { }

public sealed interface TypeRef extends Reference, TypeExpr
        permits NameRef, ApplicationRef, ParamRef { … }          // unchanged, and still has name()

/** A type written where it is used: the kernel's type_inline (§3.3). */
public record TypeInline(Type of) implements TypeExpr { }
```

- **The slots change type:** `ArrayBody.elementType`, `MapBody.valueType`, `TupleElement.elementType`, each element
  of `ChoiceBody.variants`, and `RecordField.type`, from `TypeRef` (or `Reference`) to `TypeExpr`. `MapBody.keyType`
  stays a `TypeRef` (§3.10).
- **`TypeInline` is the kernel's wrapper,** a record with one component, as the resolved form holds
  `{ of: !meta.array { … } }`. No body implements it and `Type`'s permits do not change. A consumer unwraps with a
  record pattern, `case TypeInline(ArrayBody a)`.
- **§1's line is kept in one place.** `of` is a `Type`, so the compiler does not state it; `TypeInline`'s
  constructor, or the resolver before it, refuses a `RecordBody` or an `EnumBody`.
- **A record field's slot** follows §3.3a: with a third variant, a `FieldTypeExpr` that also permits `SiblingRef`;
  with a group, `type` and `typeFrom` as two components.

**Not taken: the bodies implement a marker.** `sealed interface TypeInline extends Type, TypeExpr permits ArrayBody,
…` mirrors `type_inline => abstract {}` (§3.3). The spike of §7.3 was written against it and has not been moved to
the record.

**Not taken: a reference that carries the construction.** A fourth `TypeRef`, `ConstructionRef`, with a referent and
no name, would leave every slot's declared type alone. It makes a reference of something the kernel does not call
one, needs the binding layer to read a tagged record into a reference type, and leaves `name()` on an interface one
of whose members has none.

### 7.2 How it is passed around

- **Every consumer of a slot switches on `TypeExpr`.** The compiler finds each site, about 46 of which read a
  `TypeRef`'s name today, and each decides what a type with no name means there.
- **Resolving a slot:** a `TypeRef` asks its closure for the entry it names; a `TypeInline` is the type.
- **Equality:** a `TypeInline` by its fields, which a record gives; a `TypeRef` by name and arguments, as now.
- **Substitution** recurses into a `TypeInline` to replace a parameter, as it recurses into an application's arguments.
- **Readers and writers:** a named reference is looked up by name; an inline type's reader is built from it, and may
  be memoised in a map keyed by the body itself.
- **`chain` on an inline body is absent.** The bodies carry a `TypeChain`; one written in place has none (§1.2).
  The model writes an empty chain today (§7.3).

### 7.3 The binding test

Run as a spike: a test-local mirror of the shape, and the real model with `ArrayBody.elementType` retyped to `TypeExpr`.

**The answer.** One sealed interface holds a name or an inline type, reads both and writes both back. The bind
engine needs no change. The gaps are in the compiled readers, in how a choice picks and binds its
variant, and they are the same at either width of the second variant.

| Question | Result |
|---|---|
| A sealed interface over two sealed interfaces, one from a token and one by tag | Reads, once the choice reader is patched (below) |
| A record in two sealed hierarchies (`Product` and `TypeInline`) | Unambiguous both ways: read by schema tag, written by the class's own name |
| Writing back | A name as a bare token, an inline type as `!meta.array { … }`, nested too; round trips |
| `meta.type` against `type_inline` as the second variant | Bind treats them alike; only the wide one was run in the real model |
| A list of slots | Reads names and inline types mixed, and round trips |

**What the readers need.**

| Change | Where | Size | State |
|---|---|---|---|
| A `TypeExpr` component reads as a `TypeRef` one does | The bind targets | 1 line | Patched; without it the kernel does not load |
| An untagged value at a disjoint choice with a brace- or bracket-class variant | The two choice readers | ~15 lines | Patched; one existing test pins the old rule |
| A tag naming a subtype of exactly one variant reads at that variant | the same two | ~25 lines | Patched; not needed under the wrapper (§3.10) |
| Each variant of a choice bound to its member's class, so a name keeps its annotations | The bind targets, a choice reader and the record bind reader | 40–60 lines, *estimate* | Not done |
| The same for the JSON stack | The JSON readers | Not checked | Not done |

**What it corrects in §7.1 and §7.2.**

- `TypeInline extends Type` adds a permit to `Type`, which Java requires. Exhaustive switches are unaffected.
- The bind targets compare a component's class with `TypeRef` exactly, so retyping any slot breaks the kernel's own
  load until that comparison knows `TypeExpr`.
- An inline body writes `chain: { parents: []  supertypes: []  subtypes: [] }`, because the model treats an absent
  chain and an empty one as one value. "No chain" needs a decision in the model or the writer.
- With the narrow `TypeInline`, a `!meta.record` in a slot typed by the wide `meta.type` is caught only as a
  `ClassCastException` at read. That argues for the kernel stating the line itself, with `type_inline`.
- Retyping one slot touched 14 sites in main code and 10 in tests, in line with §7.2's figure.

**Not run:** a schema document read through a retyped slot, tree mode, the kernel's `type_inline`, and the map,
tuple and choice slots in the real model. Each needs `meta.tn` edited and re-stamped. The conformance corpus was not
run against the spike.

**Joined with the proposed kernel:** the kernel of §3.10, the spike above and
a re-stamp. It compiles, and the kernel does not load:

```
'meta.type_expr' waits on 'array_type_expr_43eda0ac' waits on 'meta.type_expr':
entries waiting on each other are never ready ([TSON-SCHEMA] §3.4.1)
```

`type_expr` is a choice, a choice's `variants` is `[meta.type_expr]`, and reading `type_expr`'s own declaration
needs that list's reader. The kernel already has such a cycle and builds it by hand
(the bootstrap's pre-loaded set, which holds `meta.type_ref` and `[meta.type_ref]`). `type_expr`,
`field_type_expr` and `type_inline` join that set, and so does the choice body that declares them. That is the cost
§6 names as "the bootstrap reads the choice before anything else does", now measured as the first thing to build.
The lifted name in the message is today's desugarer still lifting `[meta.type_expr]`; phase 1 removes the lift, not
the cycle.

## 8. Follow-on, beyond the line: inline enums, refined atoms and records

Not part of phase 1 (§11.2).

§1 keeps §5.2's prohibition: a record and an atom are declared. Feedback so far is that inline types are a common use
and are how JSON Schema is written, and once a slot holds a construction the prohibition is a choice and not a
necessity. Crossing the line gives up the symmetry of §1, and each kind below is a separate decision.

### 8.1 Enums and refined atoms

`status: !enum [OPEN ACTIVE DONE]` and `port: integer ^ { min: 1  max: 65535 }` at a field. Both are closed value
sets: no members, no tags, nothing composes them, so structural identity is the whole of it. They are the commonest
JSON Schema idioms, probably more so than an inline object.

**What it disturbs.** These are the types a `~` or `=` value is admitted on, so `value?: type!` would be read against
a construction, and §1.2's "dependent fields are untouched" stops holding.

### 8.2 Records

A record uses its name for things a container never needs, so an inline record is defined by what it cannot do:

- **No tag.** A data document cannot write `!name { … }` for it, so it is never a member of a family, and never a
  choice variant selected by tag.
- **No parent role.** Nothing composes it with `&` or refines it with `^`, and it has no `chain`.
- **No recursion and no reuse.** Both need a name.

That is one line: declare a type when something else must name it, write it inline otherwise. §4's second option, an
application expanded in place, is this kind of record.

**The cost is the per-entry passes.** A record is checked entry by entry today: field states, groups, discriminators,
extension, inhabitance, name-hygiene scopes, sibling references. Each has to run for every construction wherever it
sits. One enumerator — every construction, declared or inline — carries most of it.

**The tension with Revision 40's aim.** An inline record is a second way to write a record used once. It is
acceptable only if the split is by capability, as above, and not a matter of taste.

## 9. What is lost

| Lost | Instead |
|---|---|
| Every type has a name, so a resolved form is one flat table to walk | A walk over the declared entries that descends into each slot's construction |
| A minted entry's name in a diagnostic or a schema location | The field path of the slot that wrote it |
| One entry shared by two documents that wrote the same form | Two equal constructions; sharing is an implementation's cache |
| A derived name as a tag in data | Nothing; the author declares a name where a tag is wanted |

## 10. Decisions and open questions

**Decided for phase 1.**

| Point | Decision |
|---|---|
| How the slot is typed (§3) | A kernel choice, `type_expr`, whose second variant is the wrapper `type_inline => { of: meta.type }` |
| A record field's slot (§3.3a) | `field_type_expr` beside `type_expr`; the sibling reference does not move |
| A map's key (§1.3) | `key_type` stays `meta.type_ref`: a key is a name, never an inline type. `value_type` is a `type_expr` |
| Which constructions may be inline | Array, map, tuple, choice and reference, and a constructor refining one (`set_type`, `ref`, `namespace`); kept by the resolver on `of` |
| What an argument holds (§3.1) | A name or a parameter. A construction, or an application of another open record (`pair<box<text> int32>`), as an argument of an open record's application is refused and declared first |
| Where only a name may stand | A map's `key_type`, a reference's `of`, a bound, an alias's target: a construction or an application there is refused and declared. Only a slot typed `meta.type_expr` closes one in place |
| An application over a parameter (§4) | Kept as written in the open record, whichever its head; a constructor's closes to the wrapper |
| An application of an open record (§4) | Declared in phase 1 and never looked up at a slot; closing in place is phase 2 (§4.2) |
| The applied parent's edge (§4) | Kept, the one lookup of a declaration by its application |
| Annotations and identity (§1.2) | Two constructions differing only in an annotation or `@doc` are the same type |
| A name against a construction | Never the same type: a name equals a name, a construction an equal construction. Over `text_list => [text]`, an inherited `tags: text_list` is not restated as `tags: [text]` |
| A value on an inline type (§5.2) | Admitted on a reference written in place, `handler?: meta.ref<method> ~ orders.place_order`, a reference being an atom; refused on a container, a tuple or a choice |
| A non-disjoint choice | Every variant is a name: `( [text] \| [int32] )` is refused at the declaration, since no tag could select a variant written in place |
| An application at a refinement source | Absorbed as one at a composition operand is: `x => box<text> ^ { … }` |
| `chain` on an inline body (§3.10) | None in phase 1, an empty chain being omitted; an in-place record's is phase 2's question |

**Open, and not phase 1's.**

1. **A tag at a choice with an abstract variant** (`SPEC-FEEDBACK.md` #4). The wrapper is a concrete variant, so
   phase 1 does not depend on it.
2. **`C<args>` in the data grammar** (§4.1): whether an open record can hold an application another way, so that
   Part 1 needs no application production.
3. **§8 at all.** Whether the line stays where §1 draws it, or enums, refined atoms and author-written records
   cross it.

**To settle in phase 1's vectors.** What a `!C { … }` an author writes at a field does today for each constructor,
and that it becomes the wrapper for a structural one and stays refused for an atom, an enum and a record
([TSON-SCHEMA] §5.2).

## 11. Phases

### 11.1 Before phase 1

1. **Census,** as [`template-simplification.md`](/2026/40/reports/template-simplification) §2.1 did: in the consumer schemas and the
   corpus, how many sugar forms and use-site constructions are written, how many distinct entries they lift to, and
   how many are written as an argument of an application (§3.1).
2. **The resolved form, by hand:** done for Option B with the wrapper (§3.10). It found three rules of the current
   text to change.
3. **The binding test:** done against the marker (§7.3). The bind engine is unchanged; the compiled readers need
   three changes under the wrapper.
4. **The count:** what phase 1 deletes and what it adds, site by site (§4a).

### 11.2 Phase 1: no synthetic entries

**In scope.**

- The kernel: `type_expr` (and `type_inline` if the line is stated there, §3.3); the slots of §1.3 retyped;
  `@meta.synthetic` removed.
- The desugarer rewrites `[T; n..]`, `{K => V}`, `[A, B]`, `( A | B )`, `set<T>` and `meta.ref<T>` in place. No lift,
  no content-keyed name for a construction, no merge of equal constructions within a document or across imports.
- The model: `TypeExpr` over `TypeRef` and `TypeInline` (§7).
- Inside an open record a form over a parameter is the construction with the parameter in its slot, and applying the
  record substitutes into it. The forms admitted over a parameter stay as they are; widening them is a follow-on.
- The specification: §5.3's lift rule, the synthetic half of §8.2, `@meta.synthetic` in §6, and the placeholder
  convention in the resolved fixtures and the corpus. Added: the changes of §3.10, to §5.2's sibling rule
  and §5.3's definition of an argument slot, with a map's key left a name.
- The reader: an untagged value at a disjoint choice whose variant is a reference or a record (§3.10).

- **Applications of an open record** (§4): a declared one is its record under its name, and an application is never
  looked up. The self-reaching instantiation entry, internal names and their freshness rule, the merge of expansions
  across imports, comparison up to renaming and the derived-name tag all go.
- **An application over a parameter is kept as written** inside an open record, and closes when the record is
  applied: a constructor's to the wrapper.
- **Not closable until phase 2,** each reported as not yet supported (§4.2): `f: page<order>` at a closed slot, a
  record whose body applies another open record, and a recursive open record.
- **An argument is a name or a parameter.** Sugar and an applied constructor as an argument are refused; the form is
  declared first.

**Rule of thumb for the whole phase:** whatever would need a made-up name is not built. Nothing is minted to keep a
case working until phase 2.

**Nothing is left to decide for phase 1;** §10 holds the decisions.

### 11.2a Phase 2: an application closes in place

Owed with phase 1: the feature is not complete, and phase 1's three gaps stay open, until it lands.

- An application of an open record at a slot, written there or left by substitution, closes to `{ of: !meta.record
  { … } }` (§4.2).
- A nested application equal to the one a declaration is closing names that declaration; a recursive application
  with no declaration is refused.
- Readers, writers and bind targets for a record with no name, in both encodings.
- The specification's own examples that nest or recurse (`nested`, §5.10.1 and §8.2) are restated without a minted
  entry.

### 11.3 Follow-on steps

Each is its own decision, in an order that keeps each one a removal:

1. **The sibling reference out of `reference_type`** (§3.3a). Independent of everything here, and not moved in
   phase 1, to keep the change narrow.
2. **`C<args>` and the sibling form out of the data grammar** (§4.1), once resolved output holds neither.
3. **More forms over a parameter** (§5.2): a size, a `?` and a tuple over a parameter, which in-place construction
   makes expressible.
4. **An extension's slot admitting an inline type** (§3.6): a vocabulary types a slot `meta.type_expr`, and a value
   entry's body may then write sugar there.
5. **A construction as an argument,** `page<[order]>`, which needs an application that is not one token (§3.1).
6. **Inline enums and refined atoms** (§8.1), then **inline records** an author writes (§8.2).

## 12. As built: both phases

Built in the first implementation and the conformance corpus, both phases together.

**Build:** the first implementation's build passes with no failure: 6727 tests, class 2 conformance 729 of
729, class 1 318 of 318. 15 tests are disabled, none for this feature's phases: 14 in the binding test of §7.3 (the
marker shape and the open choice-binding gap) and one unit-resolver test.

**Phase 2 as built.**

- **A record in place** is `TypeInline("meta.record", RecordBody, application)`. The application as written is
  carried for messages only and takes no part in equality. Resolved output writes `{ of: !meta.record { … } }`.
- **Reading:** a reader built from the body in both encodings; no tag written and none admitted, in TSON and in
  JSON (`$type`).
- **Bind mode:** a record in place binds by the Java component that holds it, as a tuple in place does: the
  consumer's class is a record with matching components. A sealed-union component is not supported there.
- **Recursion at a slot:** a stack of in-place closings by canonical application; an application reached again inside
  its own closing is refused. Mutual recursion through a declaration ties to it.
- **Two defects found and fixed:** the family-membership refusal depended on declaration order, and an application
  inside an inline type (`[box<text>; 2..]`) was left unclosed when its open record was applied.

**Size against the first implementation before the change, main Java code:** 2675 lines added, 2517 removed, over 92 files. Phase 1 alone
was 220 lines smaller than before; phase 2 added 380. The feature ends about 160 lines larger, with the naming
machinery gone and readers for types written in place in its stead.

**For the author to rule on.**

- **A generic holding a recursive generic cannot be closed.** `wrap => <T> { n: node<T> }` is refused at
  `wrap_text => wrap<text>` even with `node_text => node<text>` declared: the nested `node<text>` is recursive, is
  not the application being closed, and an application is never looked up. The author passes the declared type as
  an argument instead, `wrap => <N> { n: N }` and `wrap<node_text>`.
- **A resolved form cannot say where a record in place came from,** so reading one back admits any closed record
  at `of`, an author's included. Only a schema document's source refuses the author-written one.
- **An inline `!meta.namespace`** is still undecided.

**Left for a tidy-up:** leftovers of synthetic and minted entries in the implementation's documentation and code,
and the diagnostic that suggests `text_node` where the spec's example says `node_text`. Open in the implementation:
JSON bind not recording an inline type's constructor, a tree read of a dependent value against an inline sibling, and
an application headed by an alias of an open record not absorbed at an operand (older than this feature).
