---
title: "The reference holds only names: an application leaves it"
description: "Takes the application box<T> out of meta.reference_type, so that a reference is a name and an application is schema-grammar sugar for one construction, meta.apply. The argument list leaves the data grammar, the tree and the JSON encoding, one of the two reference parsers goes, and the reference entries become one constructor, meta.ref."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Landed in Revision 40"
id: "CR-names-only-reference"
---

# The reference holds only names: an application leaves it

**Status: all eight decisions of §7 agreed by the author (2026-11-12), under the ruling of §0a. Nothing is built
and the kernel below is a sketch, not yet written by hand or loaded.**

- **What stays:** `meta.reference_type` is an atom whose value is a name ranging over the namespace. A type's name
  (`orders.order`) and a value's name (`orders.exchanges.get_order`) are both references, as today.
- **What changes:** an application, `box<T>`, stops being a value of that atom. It is schema-grammar sugar for a
  construction, as `[T]` and `kind!` are. Today the atom also holds applications, which are expressions that build
  a type, not names.
- **The resolved form** (§0) is a name, a parameter, or a construction in place. One construction, `meta.apply`,
  holds a head and arguments, each of them a reference.
- **Where an application still stands in a reference value** after inline types: only inside an open record, and
  in one annotation (§1). No bundled schema's resolved form writes one.
- **Proposed:** an application that cannot close yet is written in place as a construction, as a dependent type
  is (§3). A constructor's application over a parameter stops being an application at all: it is the construction,
  with the parameter at its slot (§2).
- **What goes:** the argument list from the data grammar, the tree and the JSON encoding; one of the two reference
  parsers; the special treatment of `[T]` inside an open record; `meta.ref` as a second name for one constructor
  (§5).
- **What I overstated before:** "two lookups become one". The grammar and the parser unify. Whether a reference
  names types or values stays a fact several rules need (§4).
- **It shares its hard part with inline records:** substituting a parameter into a type written in place (§8).

Counts are from the first implementation and the conformance corpus as they stood, by pattern search.

## 0. The model, beside Java's reflection types

| Resolved form | Is | Java's counterpart |
|---|---|---|
| `orders.order` | A reference: a name | `Class` |
| `T`, inside an open record | A reference: a parameter's name | `TypeVariable` |
| `{ of: !meta.array { element_type: T } }` | A construction in place | `GenericArrayType` |
| `{ of: !meta.apply { head: box  arguments: [T] } }` | A construction in place | `ParameterizedType` |

**Where it differs from Java.** Java keeps `List<String>` as a `ParameterizedType` for ever. Here an application
whose arguments are all known closes when it is resolved, to the record or the construction it denotes, as Revision
40 already has it. So `meta.apply` stands only where an argument is a parameter, inside an open record, and no
reader, bound class or closed schema ever meets one.

**One name is not in the namespace:** a parameter. It is still a name, resolved through one more scope (the open
record's `parameters`), and it does not survive closing. In Java terms `TypeRef` becomes `NameRef | ParamRef`.

## 0a. Ruling (2026-11-12)

- **The resolved form closes every application to its constructor form.** A reader or a planner never closes an
  application itself.
- **Which edges are decided at resolution and which at linking is an implementation matter.** Intermediate forms
  are not the spec's concern, so keeping `meta.apply` everywhere until link time is neither required nor ruled out
  inside the implementation.
- **A parameter as a name outside the namespace is accepted for now.** It may be revisited.
- **Removing `ApplicationRef` is the next step.**

**Confirmed by the author:**

- **`box<T>` inside an open record must be `meta.apply`.** Nothing can close it until the record is applied, and an
  open record compiles to nothing, so no reader meets it.
- **`box<text>` may reach the linker either way:** still as an application, or already closed to
  `{ of: !meta.record { … } }`. That is the implementation's choice.
- **The end result is the same:** the closed type in place.

## 1. Where an application stands today

In source an author writes `head<args>` freely. Resolution has already removed most of them:

| Written | Resolves to |
|---|---|
| `set<text>`, `meta.ref<method>` (a constructor's) | The construction, in place or declared |
| `f: page<order>` (an open record's, closed, at a slot) | The record it closes to, in place |
| `order_page => page<order>` (declared) | The record, under the declaration's name |
| `page<order> & { … }` (an operand) | Its fields, absorbed |

What is left as an application in resolved output:

| Where | Example | Why it cannot close |
|---|---|---|
| A field's type inside an open record | `cursor: box<T>` | `T` is not known yet |
| A container over a parameter inside an open record | `items: [T]`, held as `meta.array<T>` | The same, by a rewrite (§2) |
| An open record's `chain.parents` | `parents: [result<T>]` | The same |
| The `meta.application` annotation | `@meta.application:pair<text integer>` | It records what a declaration closed |

Outside an open record a reference value never carries arguments. In a data document under a schema an
application is already a validation error.

## 2. A constructor's application over a parameter is a construction

`items: [T]` inside an open record is rewritten today to the reference `meta.array<T>`, because a parameter
inside a type written in place is not substituted. That rewrite is why `[T; 1..]`, a tuple over a parameter and a
choice over a parameter are each refused or argued separately: an argument list carries type slots only.

With substitution into a type in place, the sugar means what it means everywhere else:

```
items => !meta.record_field { type: { of: !meta.array { element_type: T } } }
```

- A parameter is a leaf at a type slot, inside an open record, replaced when the record is applied.
- `[T; 1..]`, `( T | text )` and a tuple over `T` are written in place with no special rule.
- The desugarer's handling of forms over a parameter is deleted, with most of its design note.

This is the same mechanism inline records needs for `meta: { cursor: T }` (its decision 4).

## 3. An open record's application over a parameter

`cursor: box<T>` cannot be a construction: `box` is a record to be closed, and `T` is unknown. Four places it
could live:

| Option | Form | Verdict |
|---|---|---|
| In the reference | `type: box<T>` | Today. The reference is then not names only |
| An atom of its own, as text | `type: box<T>`, a different atom | Fails as the sibling atom did (a string beside a name) |
| Expand it where it is written | `box`'s fields with `T` left in them | Loses sharing; a recursive one needs `self` |
| **A construction in place** | `type: { of: !meta.apply { head: box  arguments: [T] } }` | Proposed |

**The proposed form** follows the dependent type: a type written in place that means something only under a binder,
here the open record's parameters. It is replaced when the record is applied, by closing it in place as today.

```
apply => meta.type & { head: meta.type_ref  arguments: [meta.type_ref; 1..] }

page => !meta.record {
  parameters: [ !meta.param { name: T } ]
  chain: { parents: [ { of: !meta.apply { head: result  arguments: [T] } } ] }
  fields: {
    cursor => !meta.record_field { type: { of: !meta.apply { head: box  arguments: [T] } } }
    items  => !meta.record_field { type: { of: !meta.array { element_type: T } } }
  }
}
```

- **Arguments are names or parameters,** which is already the rule for an open record's application, so
  `arguments` is a list of `meta.type_ref` and nothing nests.
- **`chain.parents` becomes a list of `meta.type_expr`.** `supertypes` and `subtypes` stay lists of names.
- **Rules it needs:** written in place only; only inside an open record; at least one argument is a parameter, or
  it would have closed. A reader never meets one, because an open record compiles to nothing.
- **The annotation** holds the same two facts as data, or keeps a text form of its own (§7).

## 3a. The annotation (agreed 2026-11-12)

`meta.application` stays, on a declaration's key: which open record an entry instantiates is the one fact its value
does not state. Its value is typed `meta.apply`:

```
application => @meta.annotation meta.apply

@meta.application:{ head: pair  arguments: [text integer] }
text_pair => !meta.record { fields: { … } }
```

- **Read by** the resolver (an applied parent's IS-A edge, a recursive application tying to a name), the check on
  reading a resolved form, and consumers recovering a family. No reader or planner.
- **On the key, not in the record:** a record closed in place has no key and must equal the one written by hand.
- **Consequence for `meta.apply`'s rules:** "only inside an open record, with a parameter among its arguments" is a
  rule of the type slot it is written at, as a dependent type's is, not of the constructor. On the annotation every
  argument is a name.

## 4. What unifies, and what does not

With the sibling gone and the application out, a reference value is a qualified name, or inside an open record a
parameter standing for one.

**Unifies:**

- **The grammar.** One production: a qualified name.
- **The parsers.** `TypeNameRefParser` and `RefParser` (93 and 90 lines) become one, and `ReferenceGrammar` (195)
  loses its argument list.
- **The resolution of a name.** One walk from the root: a member of a schema map, a key of a namespace value, a
  field of a record value. A type is only ever reached as a member of a schema map, so the type side is the walk
  with no value to enter.

**Does not:**

- **Whether a reference names types or values** stays a derived fact, read from whether `of` is a constructor. The
  rule that a dependent field's sibling names types, construction sugar's choice of which fields are type slots,
  inhabitance and record extension all ask it. In code it is `namesTypes`, in 10 main files; perhaps 3 of those go.
- **The member index** of a reference over a constructor stays, for messages and for inhabitance.

So the two readings of `of` remain two readings of one predicate. What goes is the difference in grammar.

## 5. What it removes

- **[TSON-DATA]:** `reference = application`, `type-args`, the grammar role of `<` and `>` in data, and the
  adjacency row. The data grammar is tokens and structures again; Revision 39 added the argument list and the
  sibling form, and Revision 40 would have removed both. The lexer does not change.
- **[TSON-SCHEMA]:** "in a data document a reference is a name"; "where only a name may stand an application
  closes nowhere", which becomes what the slot's type says; the canonical text of an application; the rules on
  forms over a parameter.
- **[TSON-JSON]:** the string form of an application.
- **Kernel:** `meta.ref` and `meta.reference_type` become one constructor (§7), one entry fewer; `meta.apply` is
  one more.
- **Java:** `ApplicationRef` leaves `TypeRef` (11 main files), with the trap that a reference's argument is itself
  a reference; `TsonApplicationReference` and `TsonReference` in the tree; `ReferenceEvent` and `ReferenceValue`
  in the stream and the AST (11 and 6 main files); the writers' cases; the desugarer's `openForm`.

## 5a. One constructor, `meta.ref` (agreed 2026-11-12)

```
ref            => meta.atom & { of: meta.type_ref }
type_ref       => !meta.ref { of: meta.type }
identifier_ref => !meta.type_ref ^ { of: unicode.identifier_type }
```

`meta.reference_type` goes. Why `ref` and not `reference`:

- `meta.type_ref` and `meta.identifier_ref` already use the short form.
- `iri_reference` already uses the long word for the RFC's term, a different thing.
- It is what authors write today, so no schema that writes `meta.ref<T>` changes.
- The kernel abbreviates elsewhere where the prose uses the full word (`meta.param`, `doc`).

## 6. What it costs, and the risks

- **Resolved forms of open records are longer** and less like the source. `box<T>` is two tokens; the construction
  is a line.
- **The materialiser** substitutes into types in place and closes an `apply` it finds there. It already closes
  applications in place; what moves is where it finds them.
- **The applied parent's IS-A edge** finds a declaration by its application. That lookup compares structure, where
  it compares canonical text today (`CanonicalApplication`).
- **Messages** still say `box<T>`, rendered from the structure.
- **Corpus:** 22 vectors write `@meta.application`; every expected form of an open record changes; 9 class 1
  vectors write an application in data and flip to invalid or go.
- **A type in place under a binder,** again. Unlike a dependent type it never reaches a reader, so the identity
  question is confined to comparing open records.
- **Not checked:** whether any consumer reads an application from a schemaless tree. The HTTP consumer's schemas
  write `meta.ref<exchange>`, which is construction sugar and unaffected.

## 7. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| 1 | An application leaves the reference | Yes. **Agreed** |
| 2 | A constructor over a parameter is the construction in place (§2) | Yes. **Agreed** |
| 3 | An open record's application over a parameter is `!meta.apply` in place (§3) | Yes. **Agreed** (§0a) |
| 4 | The name of that constructor | `meta.apply`. **Agreed** |
| 5 | The annotation's value | **Agreed:** typed `meta.apply`, head and arguments (§3a) |
| 6 | `meta.ref` and `meta.reference_type` | **Agreed:** one constructor, named `meta.ref` (§5a) |
| 7 | An argument list in source | **Agreed:** unchanged, schema-grammar sugar wherever a type is written |
| 8 | The Java type of a reference that names a value (§9, §9a) | **Agreed:** `ValueRef<T>`, chosen from `of` |

## 8. Order

**Recommended before the ruling of §0a: inline records, then this.** The steps as they now stand follow the list
below.

- **Inline records does not touch `meta`.** Its closed part is a parser change over a form that already runs.
- **Its decision 4 is this proposal's prerequisite.** Substituting a parameter into a type written in place is
  what §2 needs, and a record in place over a parameter is the smaller place to build and test it.
- **After it, this proposal's first step is a deletion:** `[T]` inside an open record written in place, and the
  handling of forms over a parameter removed. Only then does §3 change the kernel.
- **Doing this first** would mean building the substitution for containers and `apply` together, with the kernel
  changing under it.

**Steps** (inline records' defects and closed sugar are merged):

1. **Substitution into any type written in place.** A parameter is a leaf at a type slot; `[T]` inside an open
   record is the construction; the handling of forms over a parameter goes. This is inline records' step 2 and §2
   here as one change. No kernel change. Spiked first.
2. **`meta.apply`.** An open record's application over a parameter, and an applied parent, are written as it;
   `ApplicationRef` leaves `TypeRef`; the annotation takes its new form. Needs decisions 4 and 5.
3. **The argument list leaves the data grammar,** the JSON string form, the tree and the stream.
4. **One reference constructor, and the Java type of a value's name.** Needs decisions 6 and 8.

## 9. Feedback from the HTTP consumer (2026-11-12)

**It confirms the cut.** The consumer already treats a reference as the name of something that exists, and an
application as a declaration's business. Its inventory, by its own report:

- Every application in its schemas is construction sugar (`meta.ref<exchange>`, `meta.ref<protocol>`, `set<host>`)
  or an open record's application declared under a name. All are unaffected.
- No main code touches `ApplicationRef`, an argument list, a tree reference or the `meta.application` annotation.
  Two tests read what an alias closed and adjust to whatever form the annotation takes (decision 5).
- Every pin it has about an application in a value or a data document asserts the refusal.
- Nothing reads an application from a schemaless tree, which answers §6's unchecked point.

**One request, taken as decision 8.** §4 keeps "names types or names values" as a fact derived from `of`, and
decision 6 merges the two constructors. A host then receives both kinds as one Java `TypeRef`, and only the field's
declared type tells `Binding.exchange` (a value's name) from `Signature.request` (a type's name). Once the grammar
no longer distinguishes them, the Java model is the only place left that can.

- **Proposed:** a reference that names a value binds to its own type, beside `TypeRef`. The reader already knows
  which it is building: `of` selects it when the schema compiles. Modelled in §9a.
- **This is where §4's two readings stay visible:** one grammar and one parser, two result types.
- **Related and separate:** the consumer reports that a judged reference in a schema value carries no referent. A
  type for a value's name is the natural place to carry one, but delivering it is its own change.

**On the order (§8),** the consumer agrees, with one question: whether inline records reach a slot naming a type
inside a value. They do not. A slot typed `meta.type_ref` or `meta.ref<meta.record>` holds one bare name in a
value's payload ([TSON-SCHEMA] §5.12), and the record-body sugar is schema grammar, which a payload is not. Only a
slot typed `meta.type_expr` holds a type in place, and the consumer's signatures do not use it.

## 9a. The Java model of decision 8 (agreed 2026-11-12)

| Slot | Returns | A host may also bind |
|---|---|---|
| `meta.ref<net.uuid_type>`, naming a type | `TypeRef`, which is `NameRef` or `ParamRef` | nothing else |
| `meta.ref<method>`, naming a value | `ValueRef<T>` | `String` |

- **`ValueRef<T>` is today's `Ref<T>`, renamed:** the name as written and the value it names, delivered once, by
  the linker for a schema document and by the read for a data document. It becomes the natural type of a value's
  reference, in a tree read and a bound one. `TypeRef` is no longer offered at such a slot.
- **Why:** `TypeRef` is a `TypeExpr`, so a value's name can be passed today where a type expression is wanted.
- **No shared parent.** Nothing holds "either kind".
- **One grammar, two parsers.** A parser has one result type, so two thin parsers stay over one qualified-name
  grammar, chosen from `of` where they are chosen today.
- **Goes:** the value-names parser carrying what it reached through a `TypeRef`'s closure.
- **Cost:** a host component typed `TypeRef` on a value's slot becomes `ValueRef<T>` or `String`.

**Two points from the HTTP consumer's review, answered:**

- **A `String` component on a value's slot keeps binding, and the name is judged as it is today.** The judgement is
  the parser's, made before the value is converted to the component's type, so it does not depend on the target. A
  host declares `ValueRef<T>` only to receive the referent.
- **`ValueRef<T>` has the name form only.** A parameter stands for a type, never for a value's name
  ([TSON-SCHEMA] §5.10), so there is no counterpart of `ParamRef`. With no shared parent the two sides are not
  symmetric, and are not meant to be.
- **The review read an earlier draft that had one sealed parent.** It is dropped (above). The type-or-value fact
  is carried by the two types being distinct.

## 10. The walk through a record value's field, and a quoted segment

**The walk is a stated feature and is retained.** [TSON-SCHEMA] §5.12: each segment after the first selects a
member of a nested schema map, a key of a namespace value, or a field of a record value, so
`orders.exchanges.place_order` reaches through the field `exchanges`. Two corpus vectors pin it
(`a-qualified-name-selects-a-field-of-a-record-value`, `a-binding-names-a-method-through-a-records-field`). Nothing
in this proposal touches the walk: it removes the argument list, not a segment.

**A quoted segment, `api."/x".request`, is refused today, on purpose** (§5.12): a segment is a [TSON-DATA] §7.7
identifier, and a key under a wider profile "cannot be written as a segment".

- **The gap this leaves:** a namespace's `key_type` and a record's `name_type` may be wider than §7.7 (a path
  template, a JSON member name such as `content-type`). Such a key or field is declared and cannot be named, so the
  reference does not range over the whole namespace.
- **What a quoted segment would cost:** a reference of several tokens in the data grammar, which is what this
  proposal removes; an escape form inside the JSON string; and a rule for the canonical spelling, since an
  identifier could then be written either way.
- **No instance needs it yet.** The HTTP consumer references exchanges, whose keys are identifiers, and nothing
  references a resource.
- **Agreed by the author (2026-11-12): not now, and left open.** After step 3 the reference's grammar is one
  production and one parsing function, so a segment form is one later change, with a proposal of its own.

