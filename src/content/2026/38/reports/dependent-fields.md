---
title: "Dependent fields: sibling!"
description: "A record field whose type is the type a sibling field names, spelled value?: type!, so that a field's default and pin have their real type in the kernel. Lands as a reference spelling governed by an allow_sibling facet on meta.reference_type, and takes away the last uses of meta.value."
against: "TSON 2026 Revision 38 (Working Draft)"
status: "Landed in Revision 39"
id: "CR-dependent-fields"
---

# Dependent fields: `sibling!`

**Status: landed in Revision 39.**
- **Proposed:** a record field whose type is the type a sibling field of the same record instance names, spelled
  `value?: type!`, so that `record_field.value`, and with it every default and pin, has its real type in the kernel.
- **What happened:** landed as proposed, in both encodings and every read mode, including the `allow_sibling` facet on
  `meta.reference_type`. On 2026-11-07 the sibling rule was widened: a sibling may be a field group's member beside an
  optional dependent field, which is what `record_template_field`'s `( value: type! | value_param )?` needs. With
  `record_template_field.value` retyped, `meta.value` and `meta.value_type` lost their last user and were deleted.
- **Where it landed:** [TSON-DATA] §2.5, §4, §7.2.5, §7.4, §7.5; [TSON-SCHEMA] §4.2, §5.2–§5.12, §7.4, §8.1, §8.2, §9,
  §12; [TSON-JSON] §5.6 and §6.1.6. The as-built record is [SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md), and the facets
  that also stopped using `value` are [SPEC-FEEDBACK.md #17](../SPEC-FEEDBACK.md).

The note is kept as it was argued. A dependent field is a feature [`one-level.md`](one-level.md)'s dependency model
admits, not a part of it: the model's two read edges and its invariant stand without this note, and this note adds one
edge inside a record instance and shows it keeps the invariant.

**Decided (2026-11-05).**
- `sibling!` is a **reference spelling**. It is written as is in source, in data and in resolved output:
  `value => { type: type!  optional: true }`. There is no `dependent:` arm and no desugaring to one.
- It stands **only at a record field's type**, bare. The field may be optional but never voidable: a dependent field
  that is present has a value. There is no facet position and no
  nesting inside sugar, inside an application's arguments or inside a modifier. The per-value bounds of the earlier
  draft (`max_items: … ^ { min: min_items! }`) are withdrawn.
- **The reference atom includes it, and a read returns it as written**: a reference reads to a name, an application or
  a sibling reference, and a sibling reference is kept as the field name and the mark.
- **Where it may stand is a facet of the reference constructor (2026-11-06)**, as `allow_nan` is of `float_type`: the
  constructor is renamed `meta.reference_type` and gains `allow_sibling?: boolean ~ true`, and a refinement narrows it
  to `false`. `record_field.type` and `record_template_field.type` are typed `meta.field_type_ref`, which reads
  `kind!`; `meta.type_ref` and `meta.ref<T>` set `allow_sibling: false`, and every other slot keeps one of them and
  refuses it. An implementation's object model can state the same rule in its static types: only a field's type is
  typed by the wider reference.
- **The only type family is decoding a name.** A dependent field's type is the type its sibling names, and nothing is
  computed from a sibling's value.
- `record_field.value` becomes `value?: type!`. This replaces both the `dependent: text` arm (2026-11-03) and the plan
  to type it `meta.declared`.

**What it is.** A record field whose type is the type named by a sibling field of the same record instance:
`{ type: meta.type_ref  value?: type! }`. Each instance's `value` is read against the type its own `type` names. This
gives `record_field.value`, and so every default and pin, its real type in the kernel. In Revision 38 that type is
stated in prose, behind the `meta.value` escape hatch.

## The spelling

A postfix `!` on a field name, **`sibling!`**, is a reference to the field `sibling` of the same record instance, read
as the type that field's value names. Postfix `!` is the dual of prefix `!`:
- prefix `!type` applies a type to the value that follows;
- postfix `field!` takes a type from a value that is beside it.

**Lexing is unchanged.** `!` is already a special token ([TSON-DATA] §7.2.5), so `type!` lexes as
`unquoted-token("type")` followed by an adjacent `special-token("!")`. Adjacency tells the two uses apart:
- **Prefix `!` must be adjacent to the token after it** ([TSON-DATA] §7.5, [TSON-SCHEMA] §12.3). A `!` that is adjacent
  to the token before it and followed by whitespace or a delimiter is therefore postfix. `{ type: type!  optional:
  true }` cannot be read as a tag on `optional`.
- **A postfix `!` is followed by whitespace.** That rules out `a!b`, the one ambiguous spelling (postfix on `a`, or a
  tag on `b`), and every other adjacency with it: `kind!}`, `kind!,`, `kind!]`, `kind!>` and `kind!?` are all parse
  errors. The rule is the simplest one that leaves nothing to decide; a sibling reference ends a field's type, so
  whitespace always follows it in a well-formed record. JSON's string form (`"kind!"`) ends with the string.
  - **As built:** the end of the document also counts as following whitespace, so a document that is only `kind!`
    parses. [SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md) leaves this open.
- **The sibling is one unquoted token of one segment.**
  - `a.b!` is refused, because a chained projection is not proposed.
  - A quoted token is never a reference ([SPEC-FEEDBACK.md #13](../SPEC-FEEDBACK.md)), so `"my field"!` is refused. A
    field whose name needs quoting cannot be a sibling.
- **JSON** carries it as a string holding the same text (`"type!"`), read by the same production, as #13 does for an
  application.

**Why mark it at all, rather than let a bare name find the sibling.**
- **No shadowing.** A record with a field named `text`, `type` or `size` never captures the schema entry of the same
  name. `value: type` names the entry `type`, and `value: type!` names the sibling.
- **No capture under substitution.** A template parameter is spelled bare and a sibling is spelled with `!`, so
  substituting `T := type` into a record template cannot turn a parameter into a sibling, or the reverse. Siblings need
  none of the §5.10 shadowing refusals that parameters need. This is the job de Bruijn's indices do in a lambda
  calculus ("Theory"), done here by marking instead of by renaming.
- **Self-describing.** The parser and the reader both know at the token that the slot depends on a sibling, without
  first looking up the enclosing record's fields.

## Where it stands, and how the other slots refuse it

**The reference atom includes the spelling, and a facet decides which slots read it.** `type!` is a reference, so
the reference grammar always reads it, and a read returns the sibling reference as written. Whether a slot admits one
is a constraint on what its atom reads, the way `allow_nan` constrains what a `float_type` reads:

```
reference_type => meta.atom & {
  of:             meta.type_ref
  allow_sibling?: boolean ~ true     // false: refuses a sibling reference, 'field!'
}
field_type_ref => !meta.reference_type { of: meta.type }
type_ref       => !meta.field_type_ref ^ { allow_sibling: false }
ref            => <T> !meta.reference_type { of: T  allow_sibling: false }

record_field => {
  type:      meta.field_type_ref
  optional?: boolean ~ false
  voidable?: boolean ~ false
  role?:     meta.field_role ~ FREE
  value?:    type!
}
```

**As built:** the kernel declares exactly these, and `record_template_field` carries
`( type: meta.field_type_ref | type_param: meta.param_name )` and `( value: type! | value_param: meta.param_name )?`.
A refinement may withdraw `allow_sibling` and never grant it back, and resolved output writes the facet only where it
is false.

- **The constructor follows the atom constructors' naming and their facet direction.**
  - Every other atom constructor is a `_type` (`integer_type`, `float_type`, `enum_type`), so `reference` becomes
    `reference_type`.
  - As with `float_type`'s `allow_nan`, the default is the widest reading and a refinement narrows it to `false`.
    `type_ref` is then a refinement of `field_type_ref`, so it IS-A `field_type_ref` by its declaration, and a type
    reference can stand wherever a field's type can.
- **Every reference a user writes refuses a sibling, as before.** `meta.ref<T>` and `meta.type_ref` set
  `allow_sibling: false`. Only `field_type_ref` and an instance written straight from the constructor admit one, just as
  only a `float_type` that leaves `allow_nan` at its default reads NaN.
- **There is no `{}` top instance, as there is none for `float_type`.** `of` is required, the way `format` is: a
  reference with no `of` could not say whether a bare name it reads names a type or a value, so no single instance
  covers every reference. Each named reference is declared from the constructor or refines one that is.
- **A choice cannot carry it.** `( meta.type_ref | sibling_ref )` has two string-class variants, so §5.4 derives
  `disjoint: false` and an untagged read cannot pick one. The union has to be one atom's value set.
- **Tree mode, bind mode and the JSON stack apply one rule.** A tree-mode read of `!meta.array { element_type: kind! }`
  and a user field `t: meta.type_ref` holding `kind!` are refused by the atom's facet, as a bind-mode read refuses
  them where the bound slot cannot hold a sibling reference. The first implementation's object model already drew
  that line; the facet states it in the schema.

**Where it is meaningful is a position rule, stated once.** A sibling reference stands only at a record field's
type (`record_field.type`, and a template field's `type`), the two slots typed `meta.field_type_ref`. At every other
slot holding a reference it is refused, naming the slot:
- an alias target, `element_type`, `key_type` and `value_type`;
- a choice variant and a tuple element;
- a parent in `parents`;
- a template argument, a `meta.ref<C>` value and a `!` tag (a tag is `"!" qualified-name`, so `!a!` does not parse).

An argument-carrying reference is the precedent: it is a reference every slot can read, and it survives only where an
application is still open (a record template's parents and field types, held text, `@meta.application`); everywhere
else a closed application lifts and is named bare. The sibling mark is a second such form, with a narrower place.

**Where the rule is checked.**
- **Sugar, at desugaring.** `type-ref` admits `sibling-ref` everywhere ("Grammar"), so `[ type! ]`,
  `box< type! >`, `x => type!` and `( type! | text )` all parse (written without the whitespace, `[type!]` is a parse
  error first). The desugar phase refuses them where they are written,
  because a lift would carry the sibling into an entry outside the record that cannot see it (it would need an
  application chosen per value, the template family this note does not propose, "Not proposed").
- **Explicit instances and resolved forms, where they are read.** `!meta.array { element_type: kind! }` is refused at
  the token by `element_type`'s type, `meta.type_ref`, in every read mode. No resolver walk is needed for it.
- **Identity** (§8.2) is the reference's form and its components, annotations excluded: `kind`, `kind<T>` and `kind!`
  are three references. A sibling reference names a field, not a type, so nothing can resolve it as an entry by
  mistake, and it has no fixed referent: its referent is per instance.

**A record template's field may carry it.** In `<T> { kind: meta.type_ref  v?: kind!  w: T }`, `v`'s sibling is `kind`,
an ordinary field, and an application closes `w` and leaves `v` as written. A template field whose sibling is typed by
a parameter falls under the same rules once the template is closed, and the closing application checks them.

## The sibling's rules

All of these are checked at the declaration, against the flattened record.
- **The sibling is declared before the dependent field.**
  - The record's fields are a telescope: a field may depend only on fields before it, in the order of `fields`, which
    is an ordered map. That makes a cycle impossible by construction (`{ a: b!  b: a! }` refers to a later field),
    so no cycle check is needed.
  - It is also the read order ("Reading").
  - Flattening keeps the order: inherited fields come first, and a restated field keeps its inherited position, so a
    base's sibling precedes a subtype's dependent field.
- **The sibling is typed by a reference to types**: `meta.type_ref`, or a narrower reference whose values are type
  names (`meta.ref<C>` over a constructor, or a refinement). A sibling typed `int32` is refused. This is the
  formation check at the declaration ("Theory"). A sibling typed by a reference that allows a sibling is admitted:
  `record_field.type` is one, and a sibling reference as its value is refused by the next rule, where it matters.
  - **As built:** the reference's `of`, past its alias hops, is a constructor or `top`. A value reference
    (`meta.ref<method>`) and a dependent field are refused as siblings.
- **Where the dependent field is present, the sibling's value names a type a value can be read against.** It is
  checked where the dependent field is read: with `xx => { foo: meta.type_ref  bar: foo! }`, `!xx { foo: int32
  bar: 32 }` reads `foo`, then reads `bar` against `int32`. Anything that is not such a type is refused, naming the
  sibling: a template, an application the closure does not hold, a sibling reference. Where the dependent field is
  absent nothing is read against the sibling, and nothing is checked.
  - **This is what keeps the kernel sound.** `record_field.type` is the sibling of `value?: type!`, and a user's
    `v?: kind!` resolves to `v => { type: kind!  optional: true }`: `type` holds a sibling reference, which names no
    type. Its `value` is absent, because a dependent field carries no default or pin (below), so nothing is read
    against `kind!`. Were a value written (`{ type: kind!  value: 5 }`), it is refused by this rule.
- **The sibling is there to read whenever the dependent field is.** It is required, carries a default, is pinned, or
  is a member of a field group with the dependent field optional. A sibling that is optional with no default, or
  voidable, is refused, because the dependent field would then have no type to read against.
  - **A group member is absent when another option is chosen** (the widening of 2026-11-07), so there a dependent field
    written without its sibling is refused where it is read. This is `record_template_field`: `( type | type_param )`
    beside `( value: type! | value_param )?`, a literal needing a closed type, so a field with `type_param` has no
    `value`.
  - **As built:** a group member beside a required dependent field is refused, and so is a refinement making such a
    field required, the rule being asked of the flattened record. A group's members are declared optional, so a
    dependent field that is itself a member counts as optional.
- **A sibling's pin or default names a type a value can be read against**: a closed type (a fixed reader)
  or an abstract family base (the dependent field read by dispatch over its members). A template (`kind?:
  meta.type_ref = box`) is refused, since no value is read against a template until it is applied.
  - **An application is not admitted as written.** §5.2's modifier grammar takes a bare token, so `= box<int32>` does
    not parse. To be admitted, the application would have to be resolved to its synthetic name first, as a closed
    application at any other slot is lifted and named bare; that is not proposed here.
  - In data, a free sibling naming an application the closure does not hold is refused, since reading never starts a
    materialisation. A record template is refused although `meta.tn` makes it a family base, abstract by
    construction: "family base" here means an abstract record whose members are declared types, read by dispatch over
    them, and a template's members are its applications, which are not values of the sibling's type until applied.
    Checked at the declaration; a free sibling's value in data is checked at the read (above).
- **A dependent field is never voidable.** It may be optional; when present it has a value, read against the type its
  sibling names. `v?: kind!` is a dependent field; `voidable: true` beside `type: kind!` is refused.
- **A dependent field carries no default or pin.** Its type is not fixed at its declaration, so neither is the type a
  value of it would be read against.
- **A dependent field may only be restated as itself.**
  - A refinement may make it required (`v: kind!` over `v?: kind!`), within §5.7's rules. It may not give it a named
    type: `value?: int32` over `value?: type!` is refused.
  - To fix the type, pin the sibling instead: `int_field => record_field ^ { type?: = int32 }`.
  - The resolved form keeps `type!` with the pin beside it, so the field is spelled the same way on every member of a
    family.
- **A sibling may be a discriminator.** Dispatch finds the discriminator before any field is read. A family base
  `{ kind: meta.type_ref  v?: kind! }` whose members each pin `kind` gives each member a fixed reader for `v`.

## Reading

**The rule: a dependent field's type is known when the reader reaches it.** It is known in one of three ways, and
only the third constrains the order a document writes fields in.
1. **The sibling is pinned**, on the record or on the member dispatch selected (`int_cell => cell ^ { kind?: = int32
   }`). The type is known when the schema compiles and the dependent field has a fixed reader. `{ v: 5  kind: int32 }`
   reads.
2. **The sibling is a discriminator.** Member dispatch's selector scan finds the discriminator before any field is
   read, wherever it is written. No lookahead is added: the scan exists already.
3. **The sibling is free**: neither pinned nor a discriminator. It must have been read already: written before the
   dependent field, or absent with its default applied. A dependent field written before a free sibling is refused,
   naming both fields.
   - This is an exception to [TSON-DATA]'s rule that a record's field order is insignificant, confined to a free
     sibling. It is written in Part 1 and in Part 3, since a streamed JSON reader meets the same sibling.
   - The alternative is to look ahead for every free sibling as the selector scan does for a discriminator, or to hold
     the dependent value as written until the sibling arrives (ASN.1's route, below). Either spreads lookahead or a
     second decoding path to every dependent record; this note requires the order instead, as a `!tag` is read before
     the value it types.
   - **As built:** a defaulted free sibling written after a field already read against its default is refused when the
     sibling arrives. A required sibling that never arrives is the missing-field error and nothing more.
- **Canonical and resolved output** write fields in declaration order, so they always satisfy the rule.
- **Schema documents are data** read against the kernel and follow the same rule.
  - A schema document's defaults and pins are already *held values*: a record reader holds the token as written and
    decodes it against the field's type once every reader exists ([TSON-SCHEMA] §5.2, a held value orders nothing).
    `value?: type!` states that type in the kernel instead of in prose.
  - The reading, and the wait order that [SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md) states, do not change, so the
    kernel's wait cycle does not grow.
  - **As built:** a schema document's dependent field holds its value as written, whatever its form, and the value is
    judged when the schema links, through the reader of the type its sibling names in the reading schema's namespace.

**Readers.**
- **Pinned sibling: fixed reader.** The dependent field compiles to the pinned type's reader, as an ordinary field
  would.
- **Free sibling: dispatch.** The record reader reads the sibling's name, finds the type in the holding schema's
  closure, and reads the dependent field through that type's reader. This is the dispatch a `meta.declared` position
  does by tag, with the tag taken from the sibling instead of from a `!` before the value.
- **Range check.** A sibling's value that names a type outside the slot's `of`, or no type at all, is the sibling
  reader's ordinary reference error. The dependent field is not read.

**Binding.** The kernel's own `record_field.value` stays held as written, decoded where it is used, so the kernel binds
as before. A user schema's dependent field binds to a host component of an open type; which one was left open.
- **As built:** the first implementation binds it to the host language's most general object type, which receives
  what the named type binds to. [SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md) keeps the choice open.

## `record_field.value` gets its real type

With `value?: type!` (above):
- **The value's type is checked by ordinary validation, with no prose rule.** `{ type: int32  role: DEFAULT  value:
  "nope" }` fails against `type!`, that is, against `int32`.
- **Compound defaults and pins follow.**
  - `origin?: point ~ { x: 0  y: 0 }` is read by `point`'s reader, and `tags?: [text] ~ [a b]` by the array's.
  - §5.2's restriction of `~` and `=` to bare tokens becomes a choice the spec makes on its own merits; the kernel
    no longer forces it.
- **What it left of `meta.value`.** The proposal expected `meta.value` to stay for two users until each went:
  `record_template_field.value`, whose type may be a parameter (`type_param`) and so has no sibling to name, and the
  facets that [`typed-facets.md`](typed-facets.md) retires.
  - **As built:** both went. The facets are typed by their family's instance
    ([SPEC-FEEDBACK.md #17](../SPEC-FEEDBACK.md)), and `record_template_field.value` is `type!` inside the group
    `( value: type! | value_param: meta.param_name )?`. Beside `type_param` it has no sibling to be read against,
    which is §5.10's rule that a literal needs a closed type, read off the kernel. `meta.value` and `meta.value_type`
    are deleted ([SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md)).
- **Bootstrap.**
  - `record_field` sits on the kernel's one wait cycle, and in Revision 38 `meta.value` is pre-loaded for it.
    `value?: type!` names no entry, so `record_field` stops waiting on `meta.value`.
  - The pre-loaded read of `record_field` gains the sibling field, and `meta.reference_type` its `allow_sibling`
    facet. `meta.field_type_ref` joins the pre-loaded set beside `meta.type_ref`, whose value set does not change.
  - **As built:** the cycle was re-measured on the first implementation. Reading `meta.field_type_ref`'s `of` waits on
    `meta.type_ref`, its own refinement, which the pre-loaded set already holds.

## What it adds to the dependency model

one-level.md's model has two read edges, shape → shape and value → shape, and the invariant that a shape never waits on
a value. A dependent field adds one edge, confined to a record instance:
- **Value → value (intra-record).** Reading `value` waits on the sibling's value in the same instance. That value is a
  name, a link. Reading `value` then waits on the shape of the named type, which is the value → shape edge the model
  already has.
- **A shape's field types are names or `sibling!` markers.** The marker is part of the shape, but the type it decodes
  to per value is not. A shape still waits on nothing a value supplies.
- **A pinned sibling is part of the shape.** Its value is a name, so the shape gains a link, never a read.

| declaration | edges | verdict |
|---|---|---|
| `order_field => record_field ^ { type?: = order }` | `order_field` → the name `order` (link) | sound |
| `record_field { type: point  value: { x: 0 } }` | `value` → `type` (`point`) → shape of `point` | sound |
| `bad => { a: b!  b: meta.type_ref }` | `a` refers to a later field | refused at the declaration |
| `bad => { n: int32  v: n! }` | `n` names no types | refused at the declaration |

**Under the ladder this is Pass 2 work.** The type a sibling names is a type in the holding schema's closure, as a reference
slot's name already is. Nothing here needs one level.
- **As built:** it landed after one level, and needed nothing from it.

## Theory, and why only decoding

**Martin-Löf, *Intuitionistic Type Theory* (Padua lectures, 1984).**
- **Σ-types are the read algorithm.** A dependent record is an iterated Σ, `Σ(x : A). B(x)`. To check a pair
  `(a, b)`, check `a : A`, then check `b : B(a)`. That is "read the sibling, then read the dependent field against
  what it names".
- **Formation is the declaration check.** `Σ(x : A). B(x)` is a type when `A` is a type and `B(x)` is a type for every
  `x : A`.
- **A universe à la Tarski is what makes `B` trivial.** The universe is a type `U` whose values are codes, with a
  decoding `T(a)` (written `El(a)` in later texts) giving the type each code stands for.
  - `meta.type_ref` is such a universe: its values are names, and decoding is a registry lookup.
  - With `A = U` and `B(x) = T(x)`, formation holds for every `x`, given the rule that the sibling's `of` lies within
    the slot's.
  - Decoding needs no computation: the reader is found by name.
- **Why the facet position is withdrawn.**
  - `max_items: !non_negative_integer ^ { min: min_items! }` is the family `B(n) = { m : ℕ | m ≥ n }`, a type
    *computed* from a number.
  - Checking such a family is what pushes a dependent type checker into evaluating types and deciding when two of them
    are equal, which means normalisation.
  - With decoding as the only family, two dependent types are equal exactly when their names are, which is §8.2's
    identity.
  - The cost: `min_items <= max_items`, `min_length <= max_length` and `min_prefix <= max_prefix` stay prose, as the
    numeric bounds would have anyway (a bound reached through a field group could not be stated either).

**de Bruijn.**
- **Telescopes** ("Telescopic mappings in typed lambda calculus", *Information and Computation* 91, 1991). A telescope
  `(x₁ : A₁, x₂ : A₂(x₁), …)` is a sequence of declarations, each depending only on the ones before it. That gives the
  declaration-order rule above, why it needs no cycle check, and the streaming order.
- **Indices** ("Lambda calculus notation with nameless dummies", 1972). Indices keep a bound variable apart from a free
  one without renaming: a variable is its distance to its binder, so substitution cannot capture it.
  - The `!` mark does the same job here: a sibling can never be confused with a schema entry or a parameter.
  - Indices themselves do not fit. A record's binder name is its field label, which is observable, so it is part of
    the type, and renaming a field is a different record. The resolved form therefore keeps the name.
  - Agda does the same: surface records name earlier fields, and the core uses indices.

**Dependent records.**
- Betarte and Tasistro, "Extension of Martin-Löf's type theory with record types and subtyping" (in *Twenty-Five Years
  of Constructive Type Theory*, 1998). Record extension and subtyping over dependent fields: the `^` and `&` case,
  where a subtype keeps a base's telescope order and pins a sibling.
- Pollack, "Dependently typed records in type theory" (*Formal Aspects of Computing* 13, 2002), and Coquand, Pollack
  and Takeyama, "A logical framework with dependently typed records" (TLCA 2003; *Fundamenta Informaticae* 65, 2005).
  - *Manifest fields*, fields whose value is fixed in the type, are the pinned sibling (`type?: = order`).
  - Leroy's manifest types ("Manifest types, modules, and separate compilation", POPL 1994) are the same idea for
    modules, and Scala's DOT builds on them.
- Norell's Agda (thesis, 2007). Records whose fields refer to earlier fields by name, field order significant, which is
  the shape proposed here.

**Precedent in a schema language: ASN.1.**
- ITU-T X.681 and X.682 define a component relation constraint. Its AtNotation (`@id`, or `@.id` for a relative path)
  makes an open type's type the one a sibling component's value selects from an information object set:
  `{ id: OID  value: TYPE-IDENTIFIER.&Type({Set}{@id}) }`.
- The order problem is solved the other way. The encoders wrap an open type with its length, so a decoder can skip it
  and come back once it has `id`. TSON has no length framing in text, which is why this note requires the order
  instead.
- Protobuf's `Any` (`type_url` beside the bytes) and OpenAPI's `discriminator` are weaker relatives. The first is a
  type carried by the value, and the second a dispatch on a sibling that names a variant rather than a type.

**The phase distinction (Harper, Mitchell and Moggi, POPL 1990)** is one-level's rule between entries: a shape never
waits on a value. A dependent field crosses it only through decoding a name, which is a link, so the crossing stays
confined to one record instance and adds no computation.

**Dependent contracts (Findler and Felleisen, ICFP 2002)** are what the withdrawn facet position would have been: a
check against a sibling's value once it is known. The step is sound, but it is a different mechanism (computing a type
from a value) and is not proposed.

## Not proposed

- **Sibling facets** (`max_items: … ^ { min: min_items! }`) and **sibling choice** (`exclusive_min: ( min! |
  exclusive_min! )`). The three coherence rules stay prose.
- **Chained projection** (`method.request.fields!`). That is an entry-level value → value edge the model does not
  have.
- **A sibling inside sugar or an argument** (`[type!]`, `box<type!>`). That is an application chosen per value, the
  template-family reading of a dependent field. The earlier draft's verdict on it stands:
  - it is not feasible for `record_field`, because of self-wait in materialisation, `value` stopping being held, and
    pins naming the reading schema's types;
  - for user schemas it would need an open family with kind-typed parameters, which is not proposed here.
- **Unifying templates and dependent fields.**
  - A template parameter substitutes into a shape, while a dependent field is read against a value. They sit on
    opposite sides of the model's invariant and stay two mechanisms, each spelled to say which side it is on: `<T>`
    with a bare `T`, and `field!`.
  - The overlap is a pinned sibling, which is a manifest field.

## Grammar

**[TSON-DATA] §7.4** (data value grammar, as extended by [SPEC-FEEDBACK.md #13](../SPEC-FEEDBACK.md)):

```abnf
reference    = sibling-ref
             / qualified-name ["<" ws type-args ws ">"]

sibling-ref  = unquoted-token "!"
             ; "!" adjacent to the token before it, and followed by
             ; whitespace (§7.5). The token is one segment: it
             ; contains no ".". It is a reference; a reference atom
             ; reads it unless `allow_sibling` is false ([TSON-SCHEMA]
             ; §8.1), not the grammar's concern. A schemaless read
             ; keeps it as a structured value, the field name and the
             ; mark, resolving nothing.
```

**As built:** "followed by whitespace or the end of the document", and the token is an identifier
([SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md)).

**[TSON-SCHEMA] §12.1:**

```abnf
type-ref     = paren-type
             / bracket-type
             / map-type
             / sibling-ref
             / type-name "<" type-args ">"
             / type-name
             ; one token of lookahead after the name ("!", "<", or
             ; neither) picks the alternative. A sibling-ref outside a
             ; record field's type is refused by §5.2's position rule.
```

**[TSON-DATA] §7.5 and [TSON-SCHEMA] §12.3**, one adjacency row:

| Operator | Type | Context | Rule |
|---|---|---|---|
| `!` | suffix | sibling reference (`field!`) | MUST be adjacent to the preceding token and MUST be followed by whitespace |

The modifier rule in §5.2 does not change, because a sibling reference is never a default or pin.

## Spec changes

As landed, through [SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md) for Parts 1 and 2 and in place for Part 3:
- **[TSON-DATA] §7.2.5, §7.4, §7.5**: the postfix `!` and `sibling-ref`.
- **[TSON-DATA] §2.5 (records)**: the field-order exception for a free sibling and its dependent field.
- **[TSON-DATA] §4**: a schemaless read keeps a sibling reference as a structured value.
- **[TSON-SCHEMA] §5.2**: the dependent field, the position rule, the sibling's rules, and the declaration-order
  rule.
- **[TSON-SCHEMA] §5.7 and §5.8**: restating a dependent field, pinning a sibling in a refinement, flattening's order,
  and a sibling as a discriminator.
- **[TSON-SCHEMA] §5.11**: a group member may be a sibling, beside an optional dependent field.
- **[TSON-SCHEMA] §5.12**: a qualified name through a dependent field is judged by the type its sibling names.
- **[TSON-SCHEMA] §8.1**:
  - `meta.reference` is renamed `meta.reference_type` and gains `allow_sibling`; `meta.field_type_ref` is declared,
    and `meta.type_ref` and `meta.ref<T>` set `allow_sibling: false`;
  - `record_field.type` and `record_template_field.type` are typed `meta.field_type_ref`;
  - `meta.reference_type`'s documentation: a reference is a name, an application or a sibling reference, and a
    reference with `allow_sibling: false` refuses the last;
  - `record_field.value?: type!`, and `record_template_field`'s `( value: type! | value_param: meta.param_name )?`;
  - resolved output writes `type!` as is.
- **[TSON-SCHEMA] §4.2, §7.4, §8.2, §9**: `value_type` and `value` are removed from the kernel and from every listing
  of it.
- **[TSON-SCHEMA] §12.1 and §12.3**: the grammar above.
- **[TSON-JSON] §5.6 and §6.1.6**: a sibling reference is a string holding the same text, and the same field-order
  sentence.

## Conformance vectors

The conformance corpus carries a vector for each of these.

**Schemas, valid:**
- a dependent field over a required sibling;
- a dependent field over a defaulted sibling;
- a pinned sibling in a refinement, with the resolved form keeping `type!`;
- a family whose discriminator is the sibling;
- an optional dependent field made required by a refinement;
- a template field with a sibling;
- a sibling that is a field group's member, and a dependent field sharing a group with other options;
- a resolved-form round trip.

**Schemas, invalid:**
- a sibling declared after its dependent field;
- a sibling naming no types (`n: int32  v: n!`), and one typed by a reference to values;
- a sibling that is optional with no default, or voidable;
- a sibling in a field group beside a required dependent field, and one made required by a refinement;
- a voidable dependent field (`kind!?` does not parse; `voidable: true` beside `type: kind!` is refused);
- a sibling pinned or defaulted to a template;
- `kind!` followed by anything but whitespace (`[kind!]`, `kind!}`);
- `a.b!`;
- `a!b`;
- a quoted sibling;
- in sugar, the position rule at each place other than a field's type, spelled with the whitespace the `!` needs:
  `[ type! ]`, `{ text => type! }`, `( type! | text )`, `box< type! >`, `x => type!`, `^`/`&` operands;
- in an explicit instance, the position rule at each other reference slot: alias target, `element_type`, map key
  and value, choice variant, tuple element, parent, template argument;
- `!a!` (a tag is no reference, so it does not parse);
- a default or pin on a dependent field;
- a dependent field restated with a named type;
- a sibling naming a field that does not exist;
- a refinement granting `allow_sibling` back.

**Data, valid and invalid:**
- a value read against the sibling's type;
- a default sibling applying;
- a pinned or discriminator sibling written after its dependent field (valid);
- the dependent field written before a free sibling (refused);
- a dependent field written without its group-member sibling (refused);
- a free sibling whose value names a template (refused);
- a dependent field written with a sibling reference as its sibling's value (refused);
- a sibling naming a type outside `of`;
- a value that mismatches the named type;
- JSON's string form.

**The kernel:** `record_field` with a default whose value does not match its type. In Revision 38 this is a prose
check; it is now an ordinary type mismatch.

## How it landed

In this order:
1. This note.
2. The conformance vectors above.
3. The spec text: Parts 1 and 2 through [SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md), and Part 3 in place.
4. `meta.tn`: `meta.reference_type` and its `allow_sibling` facet, `meta.field_type_ref`, the two field types,
   `record_field.value`, and the reference documentation. The rename reached about 22 files of the first
   implementation and 13 lines of the corpus.
5. The first implementation, a behaviour-neutral restructuring of its reference model first, then the feature: the
   reference grammar and both readers, desugaring, the position rule and the sibling's rules at resolution and link,
   the bootstrap with its wait cycle re-measured, and the readers, fixed and dispatching, with the order rule.
6. The widening of 2026-11-07: a sibling may be a field group's member beside an optional dependent field, and
   `record_template_field.value` became `type!`. `meta.value` and `meta.value_type` were then deleted.

## Open

Settled:
- **Names.** One word per concept: the field is a *sibling*, the reference a *sibling reference*, the field typed by
  one a *dependent field*.

Still open, as [SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md) records them:
- **Binding a user schema's dependent field.** Which host component it binds to: the most general object type (as
  built), the tree value, or a type the binding names.
- **A sibling in a template field typed by a parameter** (`kind: meta.type_ref = T`, `v?: kind!`). It depends on
  [`template-simplification.md`](template-simplification.md)'s open question 3, whether a pin on a `meta.type_ref`
  slot may carry a type parameter.
- **The quoted-name gap.** A field whose name needs quoting cannot be a sibling. Admit `"name"!`, or leave the gap.
- **The end of the document** as following whitespace (as built, it counts).
- **A sibling and its dependent field in two options of one group** (`( kind: meta.type_ref | v: kind! )`): as built
  it is admitted, and `v` can then be written in no document.
- **A literal under a closed type on a template nothing applies** (`box => <T> { n?: int32 ~ nope  w: T }`): as built
  it is judged only once an application closes the field.
