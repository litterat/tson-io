---
title: "References and dependent fields: what a name ranges over"
description: "Finds that meta.reference_type held five kinds of value, only two of them names in the namespace, and that the sibling form kind! was the furthest from a name. It compares three places a dependent field could be held, and records the author's choice: the field's type is a sum written in place, meta.dependent, and kind! leaves the data grammar."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Landed in Revision 40 as Option C"
id: "CR-references-and-dependent-fields"
---

# References and dependent fields: what a name ranges over

**Status: Option C decided by the author (2026-11-12, §9). §9 lists
what is decided, what is still open, and the steps. Sections 2 to 7 are the comparison as it was argued and are kept
for the reasoning; where they disagree with §8 or §9, those win.**

- **Dependent fields stay.** What changes is where the kernel holds one.
- **The finding:** `meta.reference_type` holds five kinds of value, and only two of them are names that resolve in
  the namespace (§1). A sibling reference, `kind!`, is the furthest from one: it names a field, and it is resolved
  at each read.
- **Decided (2026-11-12):** the sibling leaves the reference. Every option below starts with that step.
- **Where it lands (§2):** an atom of its own in the type slot (A), a fact of the field (B, with or without an
  atom), or a variable written in place (C). B and C both take `kind!` out of the data grammar.
- **C carries a second variable, `self`** (§2.5): a record written in place naming itself. It is what closing a
  recursive application in place lacks today. The choice between B and C turns on whether that is wanted.
- **Proposed for the two readings of `of` (§3):** no split into two atoms. The two readings are one predicate; what
  differs is the grammar each side carries, and the cause is that an application is held in a reference.
- **Not proposed here:** moving the application out of the reference. It is where the evidence points and it needs
  its own note (§3.4).
- **What does not change:** how a dependent field is read, the field-order rule, and the rules on its sibling. Those
  are most of what the complexity ledger counted against the feature (§4.2).

Counts are from the first implementation and the conformance corpus as they stood, by pattern search; a figure marked
*estimate* was not measured.

## 1. What one atom holds today

```
reference_type => meta.atom & { of: meta.type_ref  allow_sibling?: boolean ~ true }
ref            => meta.reference_type ^ { allow_sibling?: = false }
field_type_ref => !meta.reference_type { of: meta.type }
type_ref       => !meta.field_type_ref ^ { allow_sibling: false }
identifier_ref => !meta.type_ref ^ { of: unicode.identifier_type }
```

| Value | Example | Looked up in | Resolved | Where it may stand |
|---|---|---|---|---|
| A type's name | `order`, `geo.address` | The namespace | At link | Any reference over a constructor |
| A value's qualified name | `orders.place_order` | The namespace, then values | At link | A reference over any other type |
| A parameter | `T` | The open record's parameters | When the record is applied | Inside an open record |
| An application | `box<T>` | Its head in the namespace | When the record is applied | Inside an open record |
| A sibling reference | `kind!` | The fields of the same record | At each read, per instance | A record field's type |

**The test this note applies:** a reference's value is a name, and a name resolves in the namespace.

- The first two rows pass.
- A parameter is a variable standing for a namespace name. Substitution replaces it with one, so a closed schema
  holds none. It passes in the sense that matters: it ranges over the namespace.
- An application is not a name. It is an expression that builds a type. Since inline types, a closed one is a type
  written in place, so a reference value carries arguments only inside an open record ([TSON-SCHEMA] §4.2).
- A sibling reference is not a name in the namespace and is never replaced by one.

**In type-theory terms** a parameter and a sibling are both bound variables. `page => <T> { item: T }` binds `T`
when the record is applied, once, at resolution. `{ kind: meta.type_ref  payload: kind! }` binds `kind` in each
value, at read. The first is a function over types; the second is a dependent pair. That difference is why one can
live in the reference and the other cannot: the first is gone before anything is read.

## 2. The sibling leaves the reference

### 2.1 What its place in the reference costs

- **A permission that exists to be withdrawn.** `allow_sibling` is true at one type and set false at every other.
  `meta.ref` is a refinement only to withdraw it, and `meta.type_ref` refines `meta.field_type_ref` for the same
  reason.
- **Two near-identical choices.** `type_expr` and `field_type_expr` differ only in admitting the sibling.
- **A rule about where it may not be written.** The shared production parses `kind!` wherever a reference stands,
  so the desugarer refuses it at every slot but a field's type (`siblingsAtFieldTypesOnly`), and 21 vectors pin
  those refusals.
- **A data-grammar form.** A resolved form is read as data, so [TSON-DATA] §7.4 carries `sibling-ref` as a core
  value, the tree carries `TsonSiblingReference`, and [TSON-JSON] spells it as the string `"kind!"`. No data
  document that is not a schema may hold one.
- **In code:** `allowSibling` at 36 sites in 7 main files; `SiblingRef` or `TsonSiblingReference` in 36 main files.

### 2.2 Option A: an atom of its own

```
reference_type  => meta.atom & { of: meta.type_ref }
type_ref        => !meta.reference_type { of: meta.type }
identifier_ref  => !meta.type_ref ^ { of: unicode.identifier_type }
dependent_type  => meta.atom & { }
sibling         => !meta.dependent_type { }
field_type_expr => @meta.disjoint ( meta.type_ref | meta.sibling | meta.type_inline )
```

Resolved form unchanged: `payload => !meta.record_field { type: kind! }`.

- **Removes:** `allow_sibling`, `field_type_ref`, the refinement in `meta.ref`, the sibling branch of the shared
  reference parser.
- **Keeps:** `field_type_expr`, the form in the data grammar and in both encodings, and the tree's node for it.
- **The problem:** the choice must stay disjoint, and [TSON-SCHEMA] §5.4 decides that by form class. A reference is
  string-class. In the JSON encoding `"kind!"` is a string too, so two variants share a class. Fixing it means a new
  form class with a spelling in each encoding, or a tag at the slot.

### 2.3 Option B: a fact of the field

The dependency is stated on the field, beside `type`, as `discriminators` states dispatch on the record.

```
reference_type => meta.atom & { of: meta.type_ref }
type_ref       => !meta.reference_type { of: meta.type }
identifier_ref => !meta.type_ref ^ { of: unicode.identifier_type }

record_field => {
  ( type: meta.type_expr | typed_by: text )
  optional?: boolean ~ false
  …
  value?: type!
}
```

Resolved forms:

```
payload => !meta.record_field { typed_by: kind }
value   => !meta.record_field { typed_by: type  optional: true }     -- the kernel's own
```

- `typed_by` holds a field name of the same record, typed `text` and judged by the record's `name_type`, exactly as
  `discriminators` and a group's `members` are.
- `payload: kind!` stays the source spelling, in the schema grammar only ([TSON-SCHEMA] §12.1), as sugar for
  `typed_by`. A canonical-form author writes the field.
- **Removes everything Option A removes, and:** `field_type_expr`, so a field's `type` is a `meta.type_expr` like
  every other type slot; `sibling-ref` from [TSON-DATA] §7.4 with its adjacency rule; the JSON string form; the
  tree's node; the writers' case for it; the desugarer's position rule, since only a field declaration parses the
  mark.
- **Needs no new form class.** A field name is a plain token.
- **Fits the code as it stands.** `RecordField` already answers `typeExpr()` and `sibling()` as two optionals.

**A variant, B with an atom** (the author's, 2026-11-12): the field is typed by an atom of its own and not `text`.

```
dependent_type => meta.atom & { }
sibling        => !meta.dependent_type { }
record_field   => { ( type: meta.type_expr | typed_by: meta.sibling )  … }
```

- The slot's type then says what it holds, and the rule "names an earlier field of this record, under its
  `name_type`" has a type to belong to. `discriminators` and a group's `members` stay `text`, judged by a rule.
- The field name discriminates the group, so the atom needs no form class of its own, which was Option A's problem.
- **One choice it leaves:** the atom's value is written `kind`, a plain token, or `kind!`. The first takes
  `sibling-ref` out of the data grammar as B does; the second keeps it. Recommended: `kind`.

### 2.4 Option C: a variable written in place

A type slot holds a name, a type written in place, or a variable that something else binds. The kernel has three
such variables and holds two of them in the reference:

| Variable | Bound by | Resolved | Today |
|---|---|---|---|
| A parameter, `T` | The open record's parameter list | When the record is applied | A reference value |
| A sibling, `kind!` | The record instance | At each read | A reference value |
| Self, "this record" | The enclosing record type | When the record compiles | Missing (§2.5) |

Option C writes a variable as a construction in place, inside the wrapper inline types added. A variable is a type
with no name, which is what the wrapper holds.

```
reference_type => meta.atom & { of: meta.type_ref }
type_ref       => !meta.reference_type { of: meta.type }
identifier_ref => !meta.type_ref ^ { of: unicode.identifier_type }

dependent      => meta.sum & { on: text }
type_expr      => @meta.disjoint ( meta.type_ref | meta.type_inline )      -- unchanged, and a field's type too
```

Resolved forms:

```
payload => !meta.record_field { type: { of: !meta.dependent { on: kind } } }
value   => !meta.record_field { type: { of: !meta.dependent { on: type } }  optional: true }     -- the kernel's own
```

- **`dependent` is a sum.** `meta.declared` is the open sum in which a value's tag names its type; this is the sum
  in which a sibling does. It is a type and not a reference, which is the objection this note started from.
- `on` names a field of the nearest enclosing record, typed `text` and judged by that record's `name_type`.
- `payload: kind!` stays as source sugar in the schema grammar, as under B.
- **Removes what B removes,** except that the rule on where a sibling stands becomes a resolver rule (below).
- **Needs no new form class and no field group.** The construction is brace-class inside a wrapper that already is.
- **Rules it adds:**
  - A variable is written in place and never declared: `x => !meta.dependent { on: kind }` is refused. Records,
    enums and atoms are declared only; this is the first constructor whose instances are in place only.
  - `[kind!]` becomes expressible, as an array whose element type is the variable. To keep today's behaviour one
    rule refuses a `dependent` anywhere but directly at a field's type. Lifting it later is a decision about
    readers, with no kernel change.
- **What it weakens:** a type written in place has had a meaning of its own, and its identity is structural
  ([TSON-SCHEMA] §8.2). One holding a variable means something only under its binder: two records each with
  `{ of: !meta.dependent { on: kind } }` hold equal text and different types. Anything keyed by structural identity,
  the compiled readers' memo among them, must not share across binders.

### 2.5 The missing variable: `self`

**The problem it answers.** Recursion ties to a name. `tree => <T> { v: T  kids?: [tree<T>] }` applied at a slot,
`f: tree<text>`, closes to a record in place whose `kids` must name that record, and there is nothing to write. So
today a recursive application closes only under a declaration (`text_tree => tree<text>`), and an open record that
holds a recursive one it is not on a cycle with is refused where it is declared ([TSON-SCHEMA] §5.10.1).

**The form,** under Option C:

```
f => !meta.record_field { type: { of: !meta.record { fields: {
  v    => !meta.record_field { type: text }
  kids => !meta.record_field { type: { of: !meta.array { element_type: { of: !meta.self { } } } }  optional: true }
} } } }
```

**What it removes:** the rule that recursion ties to the declaration closing it, the refusal of a recursive
application with no declaration, and the refusal of an open record that could never be closed (`HeldRecursion`).
A generic may then hold a recursive generic.

**What it has to settle:**

- **Mutual recursion.** Two open records naming each other close to nested records in place, and the inner one must
  name the record two levels out. Either `self` carries a depth (`up: 1`), or only direct recursion closes in place
  and the rest keeps today's refusal.
- **Identity.** A recursive type folded once and the same type unrolled once are one type with different text.
  Closing always folds at the same point, so forms the resolver produces compare equal; one written by hand in
  canonical form may not. A rule is needed: one canonical folding, or hand-written `self` refused.
- **Meaning under composition.** `self` means the record it is written in, never a subtype of it. The rule that
  keeps this simple: where the record has a name the name is written, so `self` stands only in a record written in
  place, which is a member of nothing and is composed into nothing.
- **Reading.** A compiled reader's cycle ties through a name today; it would tie through the record in place.

`self` is not possible under A or B without a further form: neither has a place for a variable that stands at any
depth of a type.

### 2.6 Side by side

| | Today | A: an atom | B: a field | C: a variable in place |
|---|---|---|---|---|
| Kernel entries for references | 5 | 3, plus 2 | 3 | 3, plus 1 (2 with `self`) |
| `allow_sibling` | Yes | Gone | Gone | Gone |
| `field_type_expr` | Yes | Yes, three variants | Gone | Gone |
| `kind!` in the data grammar and JSON | Yes | Yes | Gone | Gone |
| New disjointness rule | No | Yes | No | No |
| A field group in `record_field` | No | No | Yes | No |
| Where a sibling stands is fixed by | A desugarer rule | The slot's type | The kernel's shape | One resolver rule |
| `[kind!]` expressible | No | No | No | Yes, refused by that rule |
| Carries `self` | No | No | No | Yes |
| A type in place means the same anywhere | Yes | Yes | Yes | Not one holding a variable |

**Every option starts with the same step:** the sibling leaves `meta.reference_type`, and `allow_sibling`,
`field_type_ref` and the shared parser's sibling branch go. So that step is decided, and what remains is where the
sibling lands. B with an atom is a safe landing: moving from it to C later respells one field of `record_field`.

**For where it lands, decide `self` first.**

- **If recursion in place is wanted, C.** One form carries both variables, and B would leave the sibling a special
  case of the field beside a general form for `self`.
- **If it is not, B.** It is the smaller change, adds no rule about where a variable stands, and keeps every type
  written in place closed.
- **Not A.** It keeps the form in the data grammar and needs a new disjointness rule, and C gives the same reading
  (a sibling is a type expression) without either.

Nothing a schema can express today differs between B and C.

### 2.7 What no option changes

- Reading: a dependent value is read against the type its sibling's value names, in both encodings and both modes.
- The field-order rule for a free sibling ([TSON-DATA] §2.5).
- The rules on the sibling: declared before, typed by a reference naming types or a type slot, there to read.
- The known gap (a tree or JSON read against a sibling written in place).
- `ValuesByName.dependentType`, the walk's exception for a dependent field (§3.5 asks about it).

## 3. The two readings of `of`

### 3.1 It is one predicate

[TSON-SCHEMA] §4.2: a value of a reference whose `of` is `T` is a name, and conforms when the entry it names holds
a value whose type is `T` or IS-A it. A type is a value of its constructor, so `meta.ref<meta.record>` holds the
names of records by the same sentence that makes `meta.ref<method>` hold the names of methods.

### 3.2 What differs in practice

| | `of` is a constructor | `of` is any other type |
|---|---|---|
| What is named | A type entry | A value: an entry, or inside one |
| Grammar | A path to a declaration; in an open record, an application | A qualified name; segments enter values |
| Lookup | Membership in an index of the closure's members | The walk of [TSON-SCHEMA] §5.12, then a judgement |
| Structural identity | Takes part | Does not |
| A sibling may be typed by it | Yes | No |
| Counts as inhabited | Only with a member | Always |

In code this is one derived flag, `namesTypes`: 35 sites in 10 main files, two parsers (`TypeNameRefParser`,
`RefParser`), and a lookup that needs the namespace before it can say what a slot means (`KindMembers.namesTypes`).

### 3.3 Options

1. **Leave it.** One atom, one predicate, the flag derived.
2. **Two atoms,** one for a constructor's types and one for a type's values. The slot's meaning becomes something an
   author states. It adds a kernel entry and a rule that each `of` is the right sort, renames a spelling the consumer
   uses (`meta.ref<meta.record>`), and leaves both grammars and both lookups in place.
3. **One reading.** A reference's value is a qualified name. It resolves by one walk, and the referent's type is
   judged against `of`. A type is reached only as a member of a schema map, because that is the only place a type
   lives, so the type side is the walk with no value to enter.

### 3.4 Assessment

**Not option 2.** The predicate is already one. Two atoms would give one rule two names and remove none of the
difference in §3.2.

**Option 3 is where the difference comes from, and it is blocked by one thing.** Row 2 of §3.2 is the only real
split, and its type side is wider only because a reference value may be an application. With the sibling out (§2)
and a parameter read as a variable for a name, the application is the last value in the atom that is not a name.

Where an application still stands in a reference value:

- an open record's `chain.parents`;
- an open record's field types, and the type slots of constructions written in them;
- the `meta.application` annotation.

Moving it out would make `meta.reference_type` an atom of qualified names, let the two parsers and the two lookups
become one, and take `reference = application` out of [TSON-DATA] §7.4, the other half of what Revision 39 added
there. It is a larger change than §2: `TypeRef` carries arguments throughout the resolver, and the inline-types
decisions lean on an application being kept as written inside an open record.

**Recommendation:** leave the atom as one (option 1) in this step, and examine the application's place as the next
note, with the resolved form of an open record written by hand first.

### 3.5 Values by name through a dependent field

A qualified name's segment may select a dependent field, and the walk then needs the type its sibling names: the
pin, else what the value holds, else the default ([TSON-SCHEMA] §5.12). This is `ValuesByName.dependentType`, part of
`HeldValues`, and a group of vectors (about 10, *estimate*).

- The consumer's schemas write no dependent field, so nothing it names passes through one.
- The alternative is one line of rule: a qualified name does not enter a dependent field, as it does not enter a map
  that is no namespace.

This is independent of §2 and can be decided either way.

## 4. What step 1 removes (Option B or C)

- **Kernel:** `allow_sibling`, `field_type_ref`, `field_type_expr`; `meta.ref` becomes a plain refinement or the
  constructor itself (§6). C adds `meta.dependent`.
- **Part 1:** the `sibling-ref` production, its adjacency row, and its mentions (16).
- **Part 2:** the sibling bullet of §4.2, the position rule in §5.2, and the mentions of `allow_sibling`.
- **Part 3:** the string form (7 mentions).
- **Java:** `SiblingRef` in both models, `Reference` (one member left), `FieldTypeExpr`, `TsonSiblingReference`, the
  sibling branch of `ReferenceGrammar` and `TsonDataStream`, `siblingsAtFieldTypesOnly`, the `allowSibling` sites.
- **Corpus:** the 21 vectors on where a sibling is written change from a resolver refusal to a parse error or go;
  21 expected resolved forms are respelt; class 1 vectors for the data-grammar form go (not counted).
- **With `self` (C only),** later and separately: `HeldRecursion` and the two recursion refusals of §2.5.

## 5. What it costs, and the risks

- **B: `record_field` gains a field group, inside the hand-built bootstrap cycle.** The kernel already uses groups
  (`integer_type`), but not in that cycle. This is the first thing to try by hand.
- **C: a type in place may hold a variable** (§2.4), so structural identity and everything memoised by it has to
  know the binder. `meta.dependent` joins the bootstrap cycle, the kernel's own `value` field being typed by one.
- **C: `self` brings three open rules** (§2.5): depth, canonical folding, and the reader's cycle.
- **A resolved form no longer shows `kind!`.** `typed_by: kind`, or the construction, is plainer and less
  recognisable.
- **Two spellings in a schema document:** the sugar and the canonical field. Every other piece of sugar has the
  same pair.
- **A refinement restating a dependent field** restates `typed_by` or the construction; the rule that it is
  restated only as itself carries over, but under B each restatement rule needs rereading against a group member.
- **Not checked:** whether any reader depends on a field's `type` being present before it knows the field is
  dependent.

## 6. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| 1 | Is closing a recursive application in place wanted (`self`, §2.5) | Yours; it decides 2 |
| 2 | The sibling: an atom (A), a fact of the field (B), or a variable in place (C) | C with `self`, B without |
| 2a | Under B, the field's name and type | `typed_by: meta.sibling`, the value written `kind` |
| 2b | Under C, whether `[kind!]` is admitted | Refuse it in this step |
| 2c | Under C with `self`, mutual recursion | Direct recursion only at first; no depth |
| 3 | `meta.ref` once nothing is withdrawn: an empty refinement, or the one constructor | Keep both names in this step |
| 4 | `kind!` as source sugar | Keep |
| 5 | The two readings of `of` | One atom; no split |
| 6 | The application's place in a reference | A separate note, next |
| 7 | A qualified name entering a dependent field (§3.5) | Refuse it |

## 7. Steps

1. **Write the kernel and the resolved fixtures by hand** for the chosen option and load them. This settles the bootstrap
   question and shows every rule of the current text the change runs into.
2. **Spec:** Parts 1, 2 and 3 edited in place, and the change log.
3. **Corpus,** then the implementation, together.
4. **The next note:** an application outside the reference (§3.4).

## 8. Spike results: Options A and C (2026-11-12)

Two spikes, each on the first implementation as it stood. Figures are the spikes' own; the diff sizes were
rechecked.

| | A: an atom | C: a sum in place |
|---|---|---|
| Main sources | +275 / −441, plus 135 in new files: flat | +358 / −790: about 430 smaller |
| Kernel entries | 83 to 84 | 83 to 82 |
| Bootstrap wait cycle | 32 to 33, `meta.sibling` hand-built | 32 to 31, nothing new hand-built |
| Class 2 vectors failing, of 736 | 5 | 16 (13 write `kind!` in a resolved form) |
| Unit tests failing | 14, all pins | 4, all on `kind!` in data |
| `kind!` in the data grammar, tree, writers | Stays, with a new stream event and tree node | Gone |
| Record readers' dependent state | Unchanged | Unchanged |

**What the spikes corrected in this note:**

- **§2.2, A's disjointness rule is narrower and worse than stated.** A plain form class is unsound: `text` can hold
  `"kind!"` in JSON. The sound rule makes the sibling class a refinement of the string class, disjoint only against
  a reference, with JSON classifying a string by its content and a mirror rule in the text encoding.
- **§2.6, A does not fix the position by the slot's type.** The schema grammar still parses `kind!` wherever a
  reference stands, so the desugarer's rule stays.
- **§2.4, the identity cost of C is overstated for `dependent`.** Nothing keys a dependent type apart from the
  record field holding it; the record reader intercepts the field before the inline-reader memo. The cost is real
  for `self`, whose reader captures its binder.
- **§2.4, C's position rule is a link rule, and it has a hole.** `type_expr` admits a dependent at every slot, so a
  data document typed by the kernel may write one as an array's element type and reads with no diagnostic.
  Closing it needs a read-time rule, or a field-only type at `record_field.type`.
- **A dependent field's reader cannot be planned like the other sums.** A tag, a form class and a discriminator are
  all found inside the value being read. A dependent type's discriminant is outside it, in the enclosing record's
  state for that instance. So it stays a case in the record reader under any option.

**What that says.** A is out: more correct, no simpler. C is a clear gain in the model and the grammars and neutral
for readers. Its hole comes from saying a dependent type is a type that can stand alone, when its meaning exists
only in a field of a record, which is what Option B states in the kernel's shape. B removes what C removes and was
not spiked; its one unknown is a field group inside the bootstrap cycle.

## 9. Decision: Option C (2026-11-12)

**Decided by the author:**

- **The sibling leaves `meta.reference_type`.** `allow_sibling`, `field_type_ref` and `field_type_expr` go, and a
  record field's `type` is a `meta.type_expr`.
- **A dependent field's type is a sum written in place:** `{ of: !meta.dependent { on: kind } }`, with
  `dependent => meta.sum & { on: text }`.
- **`kind!` is sugar over it,** valid in a schema document only, and restricted by the schema grammar to a record
  field's type. It leaves the data grammar, the tree, the writers and the JSON encoding.
- **What a type in place may hold is a separate problem.** `of` is typed `meta.type` and the list of what it admits
  is a rule beside the kernel's types, as it already is for a namespace type. `dependent` joins that list as the one
  entry admitted at a single slot, checked at link. That a kernel-typed data document can write a form the list
  refuses is not solved here.

**Options A and B are closed.** A by its spike (§8). B because, with the point above set aside, C needs no field
group and keeps one `type` on a field.

**Consequences for the earlier sections:**

- §6 decisions 1 and 2 are answered: C, without a decision on `self`. `self` stays a possible later step that C
  makes room for (§2.5); nothing here builds it.
- §6 decision 2b is answered by the grammar: `[kind!]` does not parse. The canonical form of it is refused at link.
- The desugarer's position rule goes once the parser reads `kind!` only at a field's type. The spike still has it.

**Still open, with a recommendation each:**

| # | Question | Recommendation |
|---|---|---|
| 1 | `kind!` in a data document fails with a generic separator error | Accept it; a targeted one puts the form back |
| 2 | `meta.ref` withdraws nothing: an empty refinement, or the constructor itself | Keep the empty refinement in this step |
| 3 | `on` is `text`, naming a declared field by its spelling | Settled: as a `discriminators` entry does |
| 4 | `meta.declared_type` in place is refused only by omission | Add the clause to [TSON-SCHEMA] §4.2 here |
| 5 | The two readings of `of` (§3); a name entering a dependent field (§3.5) | No split; refuse it; a step each |
| 6 | An application outside the reference (§3.4) | The next note |

**Steps:**

1. **The implementation.** The parser reads `kind!` only at a field's type, and the desugarer's position rule
   goes.
2. **Spec, edited in place:** Part 1 §7.4 and §7.5, Part 2 §4.2, §5.2, §5.3, §8.1, §8.2 and §12.1, Part 3 §5.6, the
   change log, and `SPEC-FEEDBACK.md`.
3. **Corpus:** the 13 vectors that write `kind!` in a resolved form, the 3 that write `allow_sibling`, the 8 or so
   invalid vectors that now pass for the wrong reason, and new vectors for the link rule and for `kind!` in data.
4. **The design notes.**
