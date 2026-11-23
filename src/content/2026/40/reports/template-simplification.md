---
title: "Template simplification: a template is an open record"
description: "Replaces Revision 39's templates, which had two representations and parameters that could be types or values, with one rule: a template is a record that carries parameters, and C<args> over a constructor constructs it. It follows that there are no value parameters, bounds are written and never inherited, no template is a type, and no application appears in a data document. Its six steps became Revision 40's parametric records."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Landed in Revision 40, as parametric records"
id: "CR-template-simplification"
---

# Template simplification: a template is an open record, and `C<args>` over a constructor constructs

**Status: a proposal for Revision 40, written against Revision 39. All six of its steps are implemented.**
- **Proposes:** one rule for [TSON-SCHEMA] §5.10, in three sentences (§1.1). A template is an open record: `record`
  carries `parameters`, each standing at a field's type or as an argument. `C<args>` over a constructor is
  construction sugar over its own reference fields (`set<text>` is `!meta.set_type { element_type: text }`). And
  `H<args>` at a reference slot of a schema document is a reference, which substitutes where `H` is an open record and
  constructs where it is a constructor. `meta.array<text>` and `result_of<text>` share a spelling and not an operation, and
  the kernel declares no template.
- **What follows** (§1.5), each a refusal or a rule of the total, two-valued kind, and each costed against the first
  implementation, the spec, the kernel, the conformance corpus and the tests:
    - no value parameters, a field's value included (§3);
    - nothing about a parameter is derived, a bound being written (§4);
    - no template is a type (§5);
    - a template body is a record body, so `template`, `record_template`, alias templates, templates over a value and
      open synthetic entries go (§6);
    - no application in a data document, where a reference is a name (§1.1).
- **What is done:** the proposed kernel and its resolved form were written by hand and measured (§1.3). They are
  the base of Revision 40's [`meta.tn`](/2026/40/m/meta.tn) and
  [`meta-resolved.tn`](/2026/40/m/meta-resolved.tn), which later proposals changed further.
  All six steps of §7 are built in the first implementation and the conformance corpus: value parameters are
  gone, a bound is written, a constructor is applied by constructing
  it, no template is a type, a data document refuses an application, and `record` carries `parameters`. The kernel
  there is the proposed one, and the hand-written resolved form is what the resolver produces.
- **Reviewed:** a type-theory review (2026-11-08) reads the proposal as making templates first-order type operators;
  §2.4 records that reading and where the proposal departs from the reviewer's version of it.
- **Where it would land:** [TSON-SCHEMA] §4.2, §5.3, §5.6, §5.7, §5.10, §8.1, §8.2 and §12.1, [TSON-DATA] §7.4, and
  [TSON-JSON] §5.6, where a kind's string may hold an application. It would reverse or narrow rules Revision 39
  accepted (change log #12, #19 and #20) and make moot the first implementation's outstanding work on #2.
- **Change-log numbers** are Revision 39's, which keep the numbers the entries had while open in `SPEC-FEEDBACK.md`.

**How to read the evidence.**
- Kernel line numbers are `meta.tn`'s in the Revision 39 draft, re-checked on 2026-11-08. Revision 38's
  `core.tn` is cited by its line numbers in the published Revision 38 document.
- ¶N names a paragraph of [TSON-SCHEMA] by its line in the Revision 39 draft of Part 2 as it stood when measured
  (2026-11-07). Spec sizes are `wc -c` per paragraph line, so they are bytes.
- Code sizes and history were measured on the first implementation, and are named by what each component does.
  Corpus counts are of the conformance corpus at the same date.
- **Measured** means counted from the tree.
- **Estimated** means judged from the spans of the code involved, and is labelled as such each time it appears.

## 1. The proposal

**Keep templates as type abstractions and nothing more, and give them no constructor of their own.** A template is a
record with `parameters`, an open record, read at its declaration as any record is; a constructor is applied by
constructing it; and the kernel declares no template.

The rule comes out of asking whether `meta.array<text>` and `result_of<text>` are one operation. They share a spelling and
not an operation. `array` has no parameters: `meta.array<text>` is sugar for the construction
`!meta.array { element_type: text }`, in the family of `[text]` and the positional `!meta.set_type text`, and nothing
is substituted. `result_of` has parameters: `result_of<text>` substitutes `text` for `T` in the record it wrote. What
the two have in common is where the argument lands, a reference-typed slot of an instance — `element_type` of an
`array`, the `type` of a `record_field` in a `record`. So the only body that needs a written parameter list is a
record's, a constructor needs none to be applied, and a constructor for templates would have nothing to hold.

The rest of this note is what the rule removes, refuses or changes (§1.5), the evidence for it (§2), and each
consequence costed (§3–§6).

### 1.1 The rule

Three sentences.

1. **A template is an open record.** `record` carries `parameters?: [meta.param; 1..]`. A record with parameters is
   open, a template, and one without is closed. A reference names an open record only as the head of an application,
   never bare, at a position or as an operand. A parameter is a type, written as a reference value: inside an open
   record a reference is a name, an application, a sibling reference or one of the record's parameters, looked up before
   the namespace. It stands in at least one of two places, and nowhere else: a field's `type`, or an argument of an
   application there or in a parent. A field's `value` is never a parameter. `record` is the only constructor that
   carries parameters: it is the only product that declares constructors (every constructor is a record composing
   `meta.type`) and the only one that declares family bases. No other constructor needs them (§9, "Parameters on any
   other constructor").

2. **`C<args>` over a constructor is construction sugar.** A constructor — a closed record IS-A `meta.type` — written as
   a head with arguments is constructed: `c<a₁ … aₙ>` is `!c { f₁: a₁ … fₙ: aₙ }`, where `f₁ … fₙ` are its required
   fields typed by a reference naming types and not pinned by its chain, in declaration order. A reference names types
   where its `of` is a constructor or `meta.top` ([TSON-SCHEMA] §5.2), read through refinements and aliases:
   `meta.type_ref`, `meta.identifier_ref`, a `meta.ref<C>` over a constructor. An argument is therefore always a type,
   and a field typed by a reference naming values is written in braces. A constructor with none takes no arguments. It
   is a row of §5.3's sugar table beside `[T]` and `{K => V}`, which are the same construction spelled by the grammar;
   nothing is written to permit it and no entry stands for it: `set` needs no `<T>` line, because `set_type` has one
   such field.

3. **At a reference slot of a schema document, `H<args>` is a reference.** Resolving it substitutes where `H` is an open
   record — binding the names the record writes and filling the slots they mark — and constructs where `H` is a
   constructor (rule 2). It supplies every argument, one for each parameter or each such field ([TSON-SCHEMA] §5.3): an
   open record is closed at application, and nothing names a partial one (§6.3). In a data document a reference is a
   name: an application there is a validation error, so a description names a declared `order_page => page<order>` and
   never `page<order>`. A resolved form still holds an application wherever one is open, in an open record's `parents`
   and field types and in the `application` annotation, and is read as one because its reader is told so: nothing in the
   document marks it ([TSON-SCHEMA] §8.1). With every argument closed it resolves at once, to the declaration that names
   it or its content-keyed expansion; with a parameter among its arguments, inside an open record, it is held as written
   until that record is applied (§1.4). Either way the result is a value of the body's constructor, and a type. The head
   is never one of its IS-A edges, for two reasons: a construction is an instance, which has no chain to its
   constructor, and a substitution's edges are its body's `parents` after substitution. `text_list => meta.array<text>` is
   not IS-A `array`; `text_result => result_of<text>` is IS-A `result` because `result_of`'s body names it as a parent,
   and is not IS-A `result_of`.

A parameter's bound is written (§4); a constructor's field judges its argument by the slot's own `of`: `namespace`'s
key argument must name an identifier family because `key_type: meta.identifier_ref` says so.

`void` is a type, and an admissible argument: `return<void, order_not_found>` closes an exchange with no response.
The field it lands in is a `void`-typed field, admitting the void sentinel or nothing as its own marks say
([TSON-SCHEMA] §5.2), exactly as if `void` had been written there.

### 1.2 What it looks like

```
; CONSTRUCTORS: closed records IS-A meta.type. No <…>; C<args> constructs over their required reference fields.
array      => meta.product & { element_type: meta.type_ref  voidable?: boolean ~ false  … }
set_type   => meta.array ^ { voidable?: = false  ordered?: = false  unique_items?: = true }
ref        => meta.reference_type ^ { allow_sibling?: = false }    ; a refined constructor, as the root's enum is
set        => meta.set_type              ; root alias: the root name survives, the <T> line goes

; TEMPLATES: open records. <…> declares fresh names, each standing at a field's type or as an argument.
result     => abstract { ok: boolean =? }
result_of  => <T> result & { value?: T }

; ONE SPELLING, TWO OPERATIONS.
tags:  set<text>             ->  !meta.set_type { element_type: text }           ; construction
pairs: meta.map<text int32>  ->  !meta.map { key_type: text  value_type: int32 }  ; construction
r:     result_of<text>       ->  !meta.record { parents: [result]  fields: { … value => { type: text … } } }
                                                                                  ; substitution
```

What a reader sees: a constructor is declared like any record — braces, fields, a chain — and `set<text>` fills a
field of an instance of it; a template is declared with a bracket, and `result_of<text>` fills the `type` slot of one
of its fields. The declaration form says which operation the spelling stands for, and nothing else differs.

**Several spellings, one entry.** `set_type` has exactly one bare required field, so §5.6 already admits
`!meta.set_type text` the way it admits `!enum [a b c]`. `set<text>`, `!meta.set_type text` and
`!meta.set_type { element_type: text }` denote one entry, as `[text]` and `meta.array<text>` do; `<…>` is the spelling that
also serves two slots (`meta.map<text int32>`) and a type position without a tag. §5.6 should say they are one.

**The name written is the constructor's own.** A kernel constructor is a member of `meta`, so the application is
`meta.array<text>` or `meta.map<text int32>`; the root holds `set` alone. `[T]` and `{K => V}` stay the spellings an
author reaches for, and the application is what they stand for.

**On field order.** A constructor's argument order is its field order, so reordering a constructor's reference fields
breaks its applications. That is no worse than `<A B>` becoming `<B A>`, which breaks a template's applications the
same way; and adding a required field to a constructor already breaks every construction of it. The order is visible
in the declaration either way, and the kernel is immutable and pinned.

### 1.3 The kernel

`record` keeps its shape and gains one field; `param` replaces `template_param`:

```
@doc:"""
  A record: named fields, fixed by the type, with the field groups over them.
  Closed — `parameters` absent — it is what readers and writers are built
  for. Open — `parameters` present — it is an open record: a reference names it
  only as the head of an application, never bare, and each application
  substitutes its arguments into the reference slots the parameters stand in
  and closes to a record without them. An open record's chain is computed
  per application, after substitution, since a parent may be an application
  (`<T> base<T> & { … }`). `extension` is each application's. `name_type`
  names no parameter: the record's own field names are read by it, at the
  declaration.
  """
record => meta.product & {
  access_pattern?: meta.product_access_type = NAMED
  size_type?:      meta.product_size_type = FIXED
  parameters?:     [meta.param; 1..]
  fields:          meta.field_map
  groups?:         [meta.field_group]
  extension?:      meta.record_extension_type ~ OPEN
  discriminators?: [text; 1..]
  name_type?:      meta.identifier_ref
}

@doc:"""
  One parameter of an open record: its name, and the bound an argument must
  IS-A, written as `<T: text>` and otherwise absent. Every parameter is a type
  parameter, written where it stands as its name, a reference value: it
  stands at a field's `type`, or as an argument of an application there or
  in a parent, and nowhere else. A field's `value` is never a parameter.
  """
param => {
  name:   meta.param_name
  bound?: meta.type_ref
}
```

`record_field` does not change shape: its slots admit a parameter because `reference_type` does (below), so no label
says which a `type` is. Its documentation loses "a record field is closed … never a parameter; a field
that may carry one is a `meta.record_template_field`" (`meta.tn:615-617`) and gains one sentence: *`type` names a
type, a sibling, or a parameter of the enclosing record; `value` is a literal and never a parameter.*

**`reference_type` changes its contract and not its shape.** Its documentation says a reference is a name, an
application or a sibling reference (`meta.tn:1067`). It gains a fourth: *inside an open record, a parameter of that
record, written as its name, alone or among an application's arguments.* That is what makes `type: T`,
`type: box<T>` and `parents: [result<T>]` values of the slots they stand in.
- **It is the lookup the series already has.** [TSON-SCHEMA] §3.3 says the one lookup that precedes the namespace is a
  template's own parameter list. A reference's grammar is read where it is written and its name is judged at link, so
  `T` reads as any name does, and in a closed record it is an unresolved name like any other.
- **A parameter stands where a type is named, never where a value is.** A field's `type` is a `meta.field_type_ref`,
  and an argument lands at a parameter or at a field rule 2 constructs over, each a reference naming types. A
  field's `value` takes none, whatever the field's type: `<T> meta.array ^ { element_type?: = T }` and
  `<M> { handler?: meta.ref<method> = M }` are resolver errors at the declaration, each fixing a value per
  application (§3.7). A parameter may be the field's type, `<M: meta.ref<method>> { handler?: M }`, which chooses the
  kind of reference and no value.
- **No bound is asked for at a narrow slot.** When the record is applied the argument lands in the slot and is judged
  by the slot's own `of`, as a closed argument is: `meta.namespace<int32 text>` is refused the same way written directly
  or reached through `<K> { m: meta.namespace<K text> }`, and reported at the declaration that wrote the argument (§4.1).
  No bound could say it: a bound is a type an argument must IS-A, a narrow slot admits the instances of a
  constructor, and a bound naming a constructor is refused (`a-template-bound-naming-a-constructor`).
- **No permission field.** `allow_sibling` exists because a sibling reference is admitted by one slot type and refused
  by the others. Where a parameter stands is the open record's rule, not the slot type's: rule 1 lists the slots, and
  `name_type`, though typed by a reference, is not one of them.
- **One refusal keeps the lookup unambiguous** ([TSON-SCHEMA] §5.10, "Scoping and shadowing"): a parameter may not
  shadow a schema entry. The second rule there, that a parameter may not be spelled like a name written in a field
  type the record absorbs, goes: with every argument a reference, each such name is an entry, so the first rule
  already refuses the same spelling (§5.5).

Deleted: `template` (`:499-502`), `template_param` (`:469-473`), `record_template` (`:806-815`),
`record_template_field` (`:717-723`), `record_template_field_map` (`:729`), and the four heads — `set` (`:1226`) and
`ref` (`:1087`) become the alias and refined constructor of §1.2; `tuple1` (`:925`) and `voidable_tuple1` (`:931`) go
(§6.2). `param_name` stays. The documentation at `:446-502` and `:687-815` shrinks to the two blocks above.

**No renames.** `array`, `map` and `tuple` keep their names, though `set`/`set_type`, `enum`/`enum_type` and
`identifier`/`identifier_type` pair a root name with a `_type` constructor. `meta.ref` is itself the refined
constructor, `meta.reference_type ^ { allow_sibling?: = false }`, as the root's `enum` is `meta.enum_type`'s: a
`meta.ref_type` beside the existing `meta.type_ref` would be one transposition from it. With construction
sugar the constructor's name is what an author writes at a use site, and `meta.array<T>` reads better than
`meta.array_type<T>`; the exception is accepted. `record` keeps its name for the same reason, and because `{ … }` is its
spelling. The `_type` suffix stays a convention a reader can lean on (a `_type` name constructs), never a rule.

**Written out and measured.** The proposed kernel is the Revision 39 kernel with these changes applied, and
the base of Revision 40's [`meta.tn`](/2026/40/m/meta.tn); its resolved form is the base of
[`meta-resolved.tn`](/2026/40/m/meta-resolved.tn). Both were first written by hand: the source parsed under the Revision 39 grammar, and the resolved form read
schemalessly into the wait graph of [TSON-SCHEMA] §3.4.1:

| | Revision 39 | Proposed |
|---|---|---|
| Entries | 88 | 81 |
| Wait cycles | 1 | 1 |
| The cycle holding `meta.record` | 25 entries | The same 25 |
| The cycle's closure | 66 | 69: `meta.param`, `meta.param_name` and the array of `meta.param` join it through `record.parameters` |
| Synthetic entries | 7 | 6 |

- **The kernel applies no template and declares no open record**, in Revision 39 as here. The four heads were
  declarations nothing in the kernel used, so removing them changes no other entry.
- **Nothing resolved it.** No processor reads `parameters` on `record` yet, so the resolved form is checked for its
  shape and its wait order and against no resolver's output.
- **`@meta.application` is an open record's alone.** An entry closing a substitution is a record, which does not
  state the head it came from, so it carries the annotation. A construction carries none: its value states its
  constructor and its arguments.
- **Construction sugar completes only a constructor whose other fields are optional.** `array`, `set_type`, `map`,
  `namespace`, `reference_type` and `ref` are such. `meta.enum_type<meta.identifier>` leaves the required `members`
  unwritten and is refused as any incomplete construction is.

**No clause is added to what makes an entry a type.** [TSON-SCHEMA] §4.1 says an entry is a type exactly when its
value is built by a constructor IS-A `meta.type`, and an open record is built by `meta.record` as a closed one is.
What keeps it out of every position is rule 1's refusal, stated on references: an open record is named only as the
head of an application. That one refusal covers a field or element typed `meta.type_ref`, a slot typed
`meta.ref<meta.record>`, and an operand of `&` or `^`, and since nothing points a value at an open record no reader
is built for one.

**Resolved forms, side by side:**

```
result      => !meta.record { extension: ABSTRACT  discriminators: [ok]
                              fields: { ok => { type: boolean  role: FIXED } } }
result_of   => !meta.record { parameters: [{ name: T }]  parents: [result]
                              fields: { ok => { … }  value => { type: T  optional: true } } }
text_result => !meta.record { parents: [result]
                              fields: { ok => { … }  value => { type: text  optional: true } } }

set_type    => !meta.record { parents: [meta.array]  fields: { … voidable, ordered, unique_items pinned … } }
tags        => !meta.set_type { element_type: text }
```

A resolved-form consumer reads `result_of` as data with the tool it already has for closed records and one scope:
the record's `parameters`, consulted before the namespace when a reference's name is judged. The only thing it cannot
do is read a *value* against it, which is the point of §5.

### 1.4 Forms inside an open record: no open synthetic entries

Only `record` carries parameters, so a parameter-bearing form inside a record body cannot be lifted to an open entry of
its own: there is nothing to hold its parameter list. One rule decides every such form: **inside an open record, a
form over a parameter is admitted only where it is a reference**, a name or an application.

| Written inside an open record | Is it a reference? | Result |
|---|---|---|
| `box<T>`, `set<T>`, `meta.ref<T>`, `meta.array<T>`, `meta.map<K V>` | Yes | Held as written until the record is applied (rule 3) |
| `[T]`, `{K => V}` | Yes: the grammar's spelling of `meta.array<T>` and `meta.map<K V>` | The same |
| `[T; 1..]`, `{K => V; ..10}`, `[T?]` | No: a size or a `?` sets a field that no argument list carries | A resolver error at the declaration, naming the form |
| `( T \| error )`, `[T, text]` | No: neither is a constructor over reference fields | A resolver error at the declaration, naming the form; a choice's message points at field groups |

Nothing is minted for a faceted form: admitting `[T; 1..]` would take a refined constructor nobody wrote, and would
leave the line between it, `{text => T}` and `( T | text )` to be argued form by form. The author writes the
constructor, or moves the container into the argument (§6.2). An inline record over a parameter,
`<T> { inner: { v: T } }`, needs no rule here: [TSON-SCHEMA] §5.3 already refuses a bare record at a field position.

What goes is a category: the open lift, open synthetic entries, their parameter capture, merging one into an existing
entry, and §8.2's identity clause for them. Revision 33 created open synthetics because a typed quotation could not
nest; Revision 34's held form kept them for the same reason. A held reference nests natively — it is the grammar's own
application — so no form needs one.

### 1.5 What follows

Each row follows from the three sentences, except where it says otherwise, and has a section that costs it.

| Consequence | Why it follows | Section |
|---|---|---|
| **No value parameters.** A parameter is a type and an argument is a reference. A parameter in a facet, a default or fixed value, an enum member, a size bound, a field name or a modifier is a resolver error naming the slot | Rule 1: a parameter stands at a field's type or as an argument, and nowhere else. It is also what lets a body be read at its declaration, value parameters being the stated reason a body is text | §3 |
| **Nothing about a parameter is derived.** A bound is written, and a parameter passed on to a bounded parameter is written with a bound that IS-A it | Not forced by the rule. With one kind of parameter the bound is the only derived fact left, and writing it makes a `param` complete at its declaration, with no fixed point across templates | §4 |
| **No template is a type.** No position names a template bare. Families are declared with records, and templates compose them | Rule 1: an open record is named only as the head of an application. The family base goes, and with it the head edge of Revision 39 change log #20 | §5 |
| **A template body is a record body.** No template over a container, an atom, a reference or a choice, and no alias template. `template`, `record_template` and their supporting entries leave the kernel, and so do the heads `set`, `ref`, `tuple1` and `voidable_tuple1` | Only `record` carries `parameters`, and rule 2 applies every other constructor without one | §6 |
| **No application in a data document.** A reference there is a name, and a description names a declared entry | Rule 3 is a schema document's. Revision 39 lets data write an application the closure already closed; refusing every one is the simpler line, and data then never needs the closure's applications searched | §1.1, §7 |
| **No open synthetic entries.** A parameter-bearing form inside an open record is a held reference, or is refused | Nothing but a record can hold a parameter list, and rule 3 holds a reference as written | §1.4, §6.1 |

The minimal feature set left is:

- `<T, U: bound>` parameters, on a record body only: braces, a composition `base & { … }`, or a refinement
  `box<T> ^ { … }` over an application of them.
- `H<args>` at any type position, a reference: it substitutes where `H` is an open record (the names it writes) and
  constructs where `H` is a constructor (its required reference fields, in declaration order). A declared application
  is the entry, a use-site one is its content-keyed expansion.
- `&` operands that may be applications, and applied parents that keep their IS-A edges.
- Regular recursion.

What the proposal leaves alone is listed in §9.

### 1.6 Proposed spec text

Replace ¶954, ¶958 and ¶1003 with:

> **An open record is a record with parameters.** `<T, U: bound>` before a record body — braces, a composition or a
> refinement — declares its parameters, each a name standing at a field's type, or as an argument of an application
> there or in a parent, and nowhere else: a field's value is never a parameter. There a parameter is a reference value:
> inside an open record a reference is a name, an application, a sibling reference or one of the record's parameters,
> looked up before the namespace (the shadowing rule). The slot judges the argument that arrives there when the record
> is applied. So the body is read at the declaration against `record`'s own vocabulary. A reference names an open record
> only as the head of an application (§5.10, "A template is not a type"); only `record` carries parameters.
>
> **At a reference slot of a schema document, `H<args>` is a reference.** Resolving it substitutes where `H` is an open
> record — binding the names it writes and filling the slots they mark — and constructs where `H` is a constructor
> (§5.3). It supplies every argument, so there is no partial application, and `void` is an argument like any type. In a
> data document a reference is a name, and an application is a validation error (§4.2). With every argument closed it
> resolves at once, to the declaration that names it or its expansion (§8.2); with a parameter among its arguments it is
> held as written until the open record holding it is applied. The result is a value of the body's constructor and a
> type. Its IS-A edges are a substituted record's parents, or none for a construction; the head is never one. An
> argument is judged against the parameter's written bound, or for a constructor's field against the slot's `of`.
>
> **No other form holds a parameter.** Inside an open record, a sugar form over a parameter is the reference its
> construction is written as (`[T]` is `meta.array<T>`, `{K => V}` is `meta.map<K V>`). Any other form over a parameter is a
> resolver error at the declaration. Container sugar carrying a size or a `?` — `[T; 1..]`, `[T?]` — sets a field no
> argument list carries, so §5.3's freedom of position for those forms stops at a parameter. A choice or a tuple —
> `( T | error )`, `[T, text]` — is not written as a reference over reference fields, and an untagged sum over a
> parameter cannot be judged disjoint until it is applied (§5.4). A labelled alternative inside the record is a field
> group: `( body: T | problem: problem )`.

In §4.2, replace the clause on an application in a data document, "names the entry the closure closed it to …
before it loads", with: "and in a data document a reference is a name: an application is a validation error."

Add to §5.3's sugar table: "`C<a₁ … aₙ>`, `C` a constructor: `!C { f₁: a₁ … fₙ: aₙ }`, its required fields typed by a
reference naming types and not pinned by its chain, in declaration order."

Add to §5.6: "A constructor with exactly one required reference field is written as an application, positionally, and
constructed in braces, to one entry."

The consequences carry their own text, in this note's §3.5, §4.4, §5.6 and §6.3.

## 2. Why

**Why this rule.**
1. **No real schema uses a value parameter.**
    - The kernel's four templates take one type parameter each, unbounded:
        - `tuple1 => <T> !meta.tuple { elements: [{ element_type: T }] }` (`meta.tn:925`)
        - `voidable_tuple1` (`:931`)
        - `ref => <T> !meta.reference_type { of: T  allow_sibling: false }` (`:1087`; `reference_type.of` is
          `meta.type_ref`, `:1076`)
        - `set => <T> !meta.set_type { element_type: T }` (`:1226`)
    - `core.tn`, `numeric.tn`, `temporal.tn`, `net.tn` and `policy.tn` declare no template.
    - The one consumer schema measured, an RPC vocabulary built on the first implementation, declares `call => <Req>`,
      `return => <Resp, Err>` and `return_plain => <Resp>`: type parameters only, no bounds. Its 8 applications are all
      declared, and it names no template bare.
    - Revision 38's value-parameter templates are `core.tn`'s `extern_of => <S>`, `extern_type => <S, T>` and
      `kind => <T> !kind_type { of: T }` (Revision 38's `core.tn`, lines 306, 313, 335). None exists in the Revision 39
      kernel.
    - `extern` is deferred, and the forms tried for it were closed constructors, not templates (§3.6).
2. **Value parameters are the stated reason a template body is text.** The kernel says so in `meta.template`'s
   documentation: a parameter stands wherever a token stands, `min_items: N` as readily as `element_type: T`, "so a body
   carrying one is not typed by any constructor's own record shape until it closes". The first implementation holds a
   body as text for exactly that reason: a value parameter refuses to read at all (`N` is not a `numeric.count`).
   Without them a body can be a typed value — and once every parameter stands where a type is named, the only body
   that needs a written parameter list is a record's, which is why the proposal needs no constructor for templates
   at all.
3. **The family base is the costliest part of templates to build, and carries an open defect.** In the first
   implementation it reaches about twelve components (§5.2), and a record template base's discriminator rules cannot
   fire: the base is built with no groups and every selector required, not voidable and FREE. §5 also removes the
   head edge Revision 39 change log #20 added.
4. **A template rule Revision 39 accepted is where an inconsistency landed, and its fix is not built yet:**
    - change log #20 accepted the expansion rule: an applied parent reached the template head at a closed operand and
      not through a template, and the fix is a head edge the first implementation has not built. §5 removes it.
    - #2 (closed by #7) exists only because of value parameters, and #19's problem statement is two contracts on one
      constructor, which §3 and §5 remove.

### 2.1 Census

**Kernel and bundled schemas (measured).**

| Schema | Template | Parameters | Value parameter | Bound | Family base |
|---|---|---|---|---|---|
| r39 `meta.tn:925` | `tuple1` | `T` → `tuple.elements[].element_type` | no | no | no (abbreviation) |
| r39 `meta.tn:931` | `voidable_tuple1` | `T` | no | no | no |
| r39 `meta.tn:1087` | `ref` | `T` → `reference_type.of` | no | no | no |
| r39 `meta.tn:1226` | `set` | `T` → `set_type.element_type` | no | no | no |
| r39 `core`/`numeric`/`temporal`/`net`/`policy` | none | — | — | — | — |
| r38 `core.tn:306` | `extern_of<S>` | `S` → `scoped.schemas` key | **yes** (`schema_identity`) | no | no |
| r38 `core.tn:313` | `extern_type<S, T>` | `S`; `T` → `[type_name]` | **yes**, both | no | no |
| r38 `core.tn:335` | `kind<T>` | `T` → `kind_type.of` | **yes** (`type_name`) | no | no |

**Consumer (measured).** The RPC vocabulary declares 3 record templates, 4 type parameters, no value parameter, no
bound, no bare position.

**Consumer (reported by its project, 2026-11-10, not measured here).** Beyond the RPC vocabulary, its fixtures declare
`page<T>` and `exchange<Req, Resp>`, both record bodies over unbounded parameters applied at declarations, and pin two
forms the proposal refuses: a value parameter (§3) and a template over an `!http` namespace value (§6.2). One use the
proposal states for it: `void` as an argument, `return<void, order_not_found>`, landing at `response: void` inside a
field group (§1.1).

**Conformance corpus, by rule (measured 2026-11-07, before the Revision 39 merge).** 66 source files declare a
template: 10 fixtures, 7 `class2/link`, 30
`class2/schema/invalid`, 1 `refused` and 18 `valid`.

| Group | Subjects |
|---|---|
| Value parameter, valid (7) | `a-constructor-templates-value-is-the-slots-type` (`vec => <N> !meta.array { … min_items: N }`), `a-family-base-names-the-entries-its-members-name` (`bounded<M>`, `pet => <N> { kind: bounded<9> = N … }`), `a-quoted-token-in-a-held-body-stays-text` (`<N> … max_length: N`), `a-record-templates-fields-label-a-whole-parameter` (`c?: T ~ V  d?: int32 ~ N`), `a-routed-pin-is-fixed-where-it-is-written` (`response<order, 201>`), `a-value-argument-lands-in-the-body-it-closes` (`maxint<10>`), `an-enum-applied-through-a-template-is-typed-as-one-applied-directly` (`<M> !enum [a b M]`) |
| Value parameter, invalid (8): the rule dies or the vector is rewritten | `a-constructor-template-narrowed-by-a-schema-type`, `a-discriminator-typed-by-an-application-of-a-parameter`, `a-literal-argument-whose-type-is-still-open-in-a-field-type`, `…-in-an-operand`, `a-literal-value-on-a-field-typed-by-an-application-of-a-parameter`, `a-template-parameter-read-as-two-unrelated-types`, `a-template-value-argument-outside-its-enum`, `a-template-may-not-refine-a-final-record` (`u => <N> c ^ { y?: text ~ N }`) |
| Value parameter, fixtures (2) | `validate-template-members.tn` (`names<c>`, 2 validate vectors), `validate-text-normalization.tn` (`typed_by<safe_header, Content-Type>`, 1 of its 9 vectors reads it) |
| Expected outputs carrying `value_param` (4) | `a-routed-pin…`, `an-inherited-literal-spelled-like-a-parameter…`, `a-record-templates-fields-label…`, `a-family-base-names…` |
| A parameter in a slot it may not occupy (8): stays refused under one rule | `a-parameter-deciding-a-fields-role`, `…-how-an-open-record-may-be-realised`, `…-whether-a-field-is-optional`, `…-whether-a-field-is-voidable`, `a-parameter-naming-a-field-in-an-open-record`, `…-a-group-member…`, `…-an-open-records-discriminators`, `…-an-open-records-name-type` |
| Bounds (6) | valid `a-bounded-template-parameter-is-recorded-with-its-bound`; invalid `a-template-bound-naming-a-constructor`, `a-type-argument-outside-its-bound-in-a-composition-operand`, `…-where-a-declaration-names-the-application`, `…-outside-its-parameters-bound`, `a-written-bound-wider-than-the-one-it-inherits` |
| Family base named bare (1 fixture) | `validate-template-family-members.tn` (`holder => { any: box … }`, 3 validate vectors) |
| Applied parents (5) | fixtures `validate-alias.tn`, `validate-complete-chain.tn`, `validate-family.tn` (`outcome => abstract <T>`, `won => <T> outcome<T> & …`); `link/valid/a-subtype-template-closes-to-an-is-a-edge`; `schema/valid/an-open-parent-is-a-reference-as-written` |
| Alias template (1) | `schema/valid/an-open-alias-target-is-a-reference-as-written` (`uuid_pair => <B> pair<uuid, B>`) |

**Conformance corpus, by body (measured 2026-11-10, at the Revision 39 merge).** 101 template declarations in 80
source files: 12 fixtures, 7 `class2/link`, 39 `class2/schema/invalid`, 1 `refused` and 21 `valid`.

| Body | Declarations | Under the proposal |
|---|---|---|
| A record body: braces (63), a composition (14), an explicit `!meta.record` (7), a refinement (2) | 86 | Stays, the value-parameter cases apart |
| A constructor over a value parameter: `integer_type` (4), `meta.array` (2), `enum` (2), `text_type` (1) | 9 | Goes with value parameters (§3) |
| A bare reference: `uuid_pair => <B> pair<uuid, B>`, `wrong => <T: int32> boxed<T>` | 2 | Refused (§6.3); the second is an `invalid` vector about a bound and is rewritten over a record body |
| `ts => <T> [T]`, in an `invalid` vector about shadowing | 1 | Rewritten over a record body, the verdict kept |
| `rows => <T> !meta.array { element_type: T  min_items: 1 }` | 1 | A refined constructor, with a change of identity (§6.2) |
| `orders => <T> !interface { get => { response: T } }`, a template over a value | 1 | Lost (§6.2) |
| `<U> !meta.template { … }`, an `invalid` vector | 1 | Goes with `meta.template` |

Inside the record bodies, the only form over a parameter that is not a plain reference is `[T]`, three times; no
choice, tuple, faceted container sugar or inline record holds a parameter anywhere in the corpus. `meta.tuple1` and
`meta.voidable_tuple1` are applied by one fixture, `validate-core-templates.tn`, which five `class2/validate` vectors
read.

**The first implementation's tests (measured, with the value-parameter count by heuristic).**
- 65 test classes declare a template, 20,671 lines in all.
- 35 of them contain value-parameter-shaped cases (12,630 lines in those files).
    - The heuristic grep matches `~ N`/`= N`, a parameter in a facet, `<"…">`/`<10>`, `; N]` and `[a b M]`.
- 4 use a written bound.
- 4 are about value parameters throughout, 752 lines.
- 9 are about family bases, 1,506 lines.

### 2.2 Churn (measured)

Templates are the area of the first implementation that has changed most. Of its 1,293 non-merge commits, the first
touching templates landed on 2026-07-23; **143** touch the core template components and their three design notes, and
**119** name templates, parameters, materialisation, applications or family bases in their subject.

| Component | Commits | First |
|---|---|---|
| materialisation (closing an application) | 94 | 2026-08-20 |
| parameter typing (deriving each parameter's type and bound) | 30 | 2026-09-29 |
| the held body | 28 | 2026-08-26 |
| the template body in the schema model | 27 | 2026-08-26 |
| the regularity check (§5.10.1) | 11 | 2026-08-21 |
| merging an open synthetic into an existing entry | 10 | 2026-09-01 |
| the template parameter in the schema model | 7 | 2026-09-29 |
| the record template's body, field and substitution | 2 each | 2026-11-05 |
| the definition resolver (every feature) | 184 | — |

### 2.3 Size of the area (measured)

**Spec.** Part 2 is 437,917 bytes. §5.10 with §5.10.1 is 43,086 bytes (lines 939–1053). §8.2 is 18,067 bytes
(1522–1556).

**Main code**, in lines: the template-specific components of the first implementation come to about 4,330.

| Component | Lines |
|---|---|
| materialisation | 1,128 |
| parameter typing | 717 |
| resolved-form writing and held-text substitution | 483 |
| the held body | 246 |
| derived names of synthetic entries | 238 |
| the regularity check | 180 |
| the record template body | 168 |
| merging an open synthetic | 158 |
| record template substitution | 147 |
| the record template field | 110 |
| family selectors | 109 |
| the identity of numeric arguments | 96 |
| the open entry | 84 |
| ancestry of applications | 77 |
| the template body model | 68 |
| the reader for an abstract template | 68 |
| closing an application | 66 |
| the type argument model | 59 |
| the template parameter model | 58 |
| the record head shared by record and record template | 47 |
| the desugarer's record template definition | 27 |

The shared components carry template arms throughout: the definition resolver (2,755 lines), the schema resolver
(1,377), the desugarer (1,223) and the linker (2,060).

### 2.4 The type-theory reading: templates are a λ-calculus at the type level

A review of the kernel from a type-theory perspective (2026-11-08) put the problem this note works on in one sentence:
TSON refuses computation in data, but a template is computation in a schema. It is substitution, with parameters
passed on to other templates, open parents (`<T> result<T> & { … }`), inferred parameter types and bounds, and partial
application. That is a small λ-calculus over types, and it is why Revision 39 needs held text, a materialisation depth
limit, a parameter whose type is derived, and two constructors for open entries (the proposal leaves none: the
operator is the record itself, §1).

The review named two consistent positions and said Revision 39 stands between them:
- **First order.** Every parameter declared with its type, never inferred; parents closed; no parameter passed as an
  argument to another application. Materialisation is then one substitution with no fixed point.
- **Representable.** Templates stay as they are, and the held body gets a parsed form in the vocabulary, so the kernel
  describes everything it holds.

**The proposal takes the first position, and the first position is what makes the second possible.** They are not
alternatives. The held body is text because of value parameters (§2, reason 2); once every parameter is a type, the
body reads as a typed value. So §3, §4 and §5 make templates first-order, and the open record makes them representable.

**In the review's terms, under the proposal:**
- **Every parameter has one kind, `type`.** §3 removes value parameters rather than declaring their types, as the
  review's `<T: meta.type_ref, N: numeric.count>` would. One kind means a parameter needs no type at all, only an
  optional bound.
- **A template is a type operator of kind `typeⁿ → type`, and is never itself an argument.** §5 refuses a bare
  template at every position, arguments included, so no parameter ranges over templates. That is the line between first
  and higher order. Templates still nest: `<T> box<T>` is a composition of operators, and needs no higher kind.
- **Nothing about a parameter is inferred.** §3 removes the derived type and §4 the inherited bound, so the
  cross-template fixed point goes (§4.2).
- **An application is β-reduction, and its result is a normal form.** A content-keyed expansion is a hash-consed normal
  form; a declared application is a named one (§8.2).
- **Recursion is regular.** §5.10.1 admits only recursive applications that pass the parameters through unchanged
  (`tree<T>` inside `tree`), so the set of distinct applications a schema reaches is finite, and closing them always
  terminates. Non-regular recursion (`t => <T> { x: t<box<T>> }`, a nested datatype) is refused.

**Where the proposal departs from the review's first-order list, and why:**
- **A parameter may be passed to another application.** The review would forbid it. It is not what makes the calculus
  higher order, which only a parameter ranging over templates does. Forbidding it would lose `<T> box<T>` bodies and the
  applied parents of the corpus's family fixtures (`validate-family.tn`). With §4, passing a parameter on carries
  only a written bound check, so it costs no fixed point.
- **Parents may be applied** (§9, last bullet). `ok => <T> result<T> & { … }` is first order. The alternative, a choice
  template over untagged variants, runs into §5.4's disjointness, and with §5 an applied parent needs no edge to a
  template head.
- **Recursion stays** (§9, first bullet). The review's "one substitution with no fixed point" holds for a body that does
  not mention itself. A regular recursive body ties a knot over a finite set instead, and refusing that would lose
  `tree<T>`.
- **The alias refusal is about cost, not order.** `uuid_pair => <B> pair<uuid, B>` is a saturated application under a
  λ and is first order. It is refused because a body is a record body (§6.3), not because of the calculus.

**What follows for the limits.**
- `policy.tn`'s `max_materialisation_depth` becomes a resource cap and stops being a semantic guard. The regularity
  check already bounds the distinct applications, so the limit no longer decides whether a valid schema terminates.
- `max_wait_depth` belongs to the kernel's wait order ([`one-level.md`](/2026/39/reports/one-level)), not to templates, and stays.

**Proposed spec text.** Add to the opening of §5.10:

> **A template is a type operator.** Applied to types, it yields a type: its body with each parameter replaced by its
> argument. Every parameter stands for a type, and no template is itself an argument, so templates are first order.
> Recursion is regular (§5.10.1), so the applications a schema reaches are finite in number and closing them terminates.

### 2.5 Where this sits in the history of templates

The proposal returns to typed bodies, which Revision 32 had and Revision 34 gave up. That needs saying, and why the
return is not the old midpoint again.

| Revision | Where a parameter stands | What broke |
|---|---|---|
| 32 (`meta-kernel.tn`) | `parameters` on the entry wrapper (`type_definition`), the body a typed constructor value; a type parameter rides `type_ref` ("a parameter of either kind"); value parameters through `record_field.value_param`, `type_argument.value` and `array_min<T, MIN>` | A value slot (`min_items: N`) has no spelling of its own |
| 33 | `instance_template`, a typed quotation of an application, used uniformly | A parameter in a list-valued slot cannot be written: `<T> ( T \| error )` refused by rule (Revision 33 change log #53) |
| 34 (CR addendum, "Open-form representation — two endpoints") | Outcome A, complete the quotation with a shadow type per constructor, or Outcome B, hold the body unread; B recommended | — |
| 35–39 | Held text bodies; value parameters everywhere; parameter types derived by a fixed point across templates | The cost of §2.2–§2.3 |
| 40 (this proposal) | Typed record bodies; a parameter stands only at a field's type or as an argument | §1.4's choice and tuple boundary, taken on purpose (§9) |

**Why it is different.** The addendum framed the whole problem as one axis — "the template problem, in every design, is
only ever about the immediate slots" — and its two endpoints, and every revision from 32 to 39, took value parameters as
a requirement. §3 removes the premise rather than choosing a point on the axis: once every hole is a name there is
nothing to quote, so the addendum's lesson that "a quotation typed slot-by-slot is a second grammar, and it will be
incomplete wherever the first grammar recurses" holds with no second grammar to be incomplete. Revision 32 was nearly
this design: names rode `type_ref`, and `value_param` was the one fragment of quotation in it. The addendum's own
principle — "any slot that holds names can hold a parameter for free, because a parameter is a name" — pointed here, and
went unproposed because no revision asked whether value parameters were needed. The decision now also has evidence the
earlier rounds lacked: a census finding no value parameter in the kernel, the bundled schemas or the one consumer
(§2.1), and a measured cost for Outcome B (§2.2–§2.3). Revision 33's demand experiment, which was to judge the
template mechanisms against the REST surface, was never run; the RPC consumer is in effect that experiment, and its
answer is three record templates over type parameters.

**What is the same, on purpose.** Revision 33's boundary returns for choices and tuples: only `record` carries
parameters, and neither is written as a reference over reference fields (§1.4). The addendum called
`result => <T> ( T | error )` "the likeliest headline use of generic schemas". This proposal answers it with a
discriminated record family and field groups, and with the reason the untagged form cannot be judged where it is
declared (§9, "Parameters on `choice`").

**Where Revision 32's placement went.** Its wrapper's other per-entry facts now live on `meta.type`, as `chain`.
Moving `parameters` beside it would reopen every constructor; §9 records why it is not taken.

## 3. Consequence: no value parameters

Rule 1 (§1.1) puts a parameter at a field's type or as an argument, and nowhere else. This section states that as
the rule an author meets, and costs it.

### 3.1 The rule

A parameter is a type. It stands only at a field's type, or as an argument of an application there or in a parent
(rule 1, §1.1). Through an application it reaches whatever that application's slots hold: an array's, set's or
map's element, key or value type, a reference's `of`. An argument is a reference, simple or an application.

A parameter anywhere else is a resolver error at the declaration, naming the slot. That covers a facet (`min_items: N`),
a field's default or fixed value (`w?: int32 ~ N`), an enum member, a size bound (`[T; N]`), a field name, a group
member, `optional`, `voidable`, `role`, `extension`, `discriminators` and `name_type`. One rule replaces Revision 39's
two: the general kind check, and a record template's three places.

### 3.2 Evidence of cost

**Revision 39 rules affected.**
- change log #2 (an alias of a schema-namespace template: which namespace its value parameters read in, closed by
  #7) is moot.
- change log #12 (an application is a reference value) loses its value-argument half (`maxint<10>`).

**An open defect of the first implementation closes**: an application argument where a value parameter stands is
accepted when a record template closes.

**Bug history in this area.** Six fixes in the first implementation: a routed `= P` FIXED where it is written; a field
whose value arrived by parameter, fixed and not just filled; a template's value argument of an enum type matched in
the label type's form; where a template parameter's type is read, decided by the template's form; and two to parameter
types against written types.

**What it removes in main code (estimated; about 600–750 lines):**

| Where | What goes | Lines (est.) |
|---|---|---|
| parameter typing (717) | the parameter's kind; whether a parameter reads in the structure or the schema namespace; routed values; the atom branch of the token walk; the walk of a positional `!enum [a b M]` payload; the value-type half of the occurrence check; most of the component's documentation | ≈200 |
| materialisation (1,128) | converting a value argument, its type and its check; the parameter kinds and their on-demand computation | ≈75 |
| the linker | the check of open literals and its call sites | ≈50 |
| record template substitution | the `value_param` switch and the open-literal refusal | ≈35 |
| the record template field and body | the `value_param` alternative and its documentation | ≈30 |
| the definition resolver | building a field from `value_param`, and the `value_param` arm of the labelling | ≈30 |
| the desugarer | the implicit selector of a field pinned to a parameter (§3.7), the value branch of the labelling, parameter names as size bounds | ≈30 |
| derived names | the value-argument segments, and their use of numeric identity | ≈20 |
| the type argument's value variant | 37 occurrences in 17 files, including both data-grammar reference parsers, the emitter, the tree writer and the schemaless reader; the argument type collapses to a reference | ≈100–150 |
| the template parameter model | its `type`, and the test of whether it is a type parameter | ≈15 |

**What stays though value parameters go:**
- The bound check on arguments, which composition operands run through, stays in both places that close an
  application. It loses the kind conversion and shrinks to a check.
- The identity of numeric arguments stays: closed size lifts (`[float32; 0xFF]`) hash through it.

**Tests.** The four value-parameter test classes (752 lines) go. Value cases come out of about 31 more.

**Corpus.** The 7 valid and 8 invalid subjects, 2 fixtures and 4 expected files of §2.1 are deleted or rewritten. The 8
slot-refusal vectors keep their verdict.

### 3.3 What it removes in the spec and the kernel

Kernel:
- `template_param => { name, type, bound? }` (`meta.tn:469-473`) becomes `{ name: meta.param_name  bound?: meta.type_ref }`.
- `record_template_field` (`:717-723`) drops `value_param`, leaving `value?: type!` as on `record_field`. The entry
  itself goes with `record_template` (§1.3).
- The documentation at `:446-468` and `:687-716` shrinks to a few lines.

Spec, about 15–16 KB of 43 KB in §5.10, plus about 5 KB elsewhere (estimated per paragraph from the measured sizes):

| Paragraph | Bytes | What goes |
|---|---|---|
| §5.10 ¶960–968, "A parameter's type is derived …", its five bullets, "The kind follows from the type" | 2,852 | all, replaced by about 400 (§3.5) |
| ¶970 "Several uses must agree" | 1,151 | the value cases; bound agreement moves to §4 |
| ¶972–976 narrowing | 1,312 | the value bullet; the bound bullet is rewritten under §4 |
| ¶980 "A value conforms to where it is defined …" | 2,823 | all but one sentence on a bound's namespace |
| ¶982 call-site check | 901 | the value half |
| ¶954 "Held bodies, and where a parameter stands" | 2,687 | about 1,000: value slots, routed values, "a literal value needs a closed type" in its value-parameter form |
| ¶956 substitution | 1,287 | about 400: an argument read as a value, enum members |
| ¶999 family base | 5,529 | about 1,500: a selector pinned to a value parameter, the `capped<9> = N` / `badge` condition |
| §5.7 ¶856 "Open modifiers" | 2,581 | all |
| §5.3 ¶644 size bounds | 1,206 | about 200: "or, within a template body, a value-parameter name" and its classification rule |
| §8.2 ¶1533 "Value arguments compare as values …" | 1,027 | all |
| §12.1 `type-arg`, `value-literal`, `size-bound`, the `type-param` comment | about 800 | the value alternatives |
| §8.1 ¶1457, ¶1505, ¶1510 | about 600 | `value_param` and the value-typed parameter in the examples |

[TSON-DATA] §7.4: a reference's argument is a reference.

### 3.4 What is lost, and how to write it instead

| Lost spelling | Replacement |
|---|---|
| `pet => abstract <K, T> { kind?: text = K  pet: T }` with `dog => pet<"dog", dog_type> & { … }` | `pet => abstract <T> { kind: text =?  pet: T }` with `dog => pet<dog_type> & { kind?: = "dog" }`. Under §5, a hand-written base (§5.4). Without the template: `dog => pet & { kind?: = "dog"  pet: dog_type }` |
| `response => <T, S> { status: int32 = S  body: T }`, `created => response<order, 201>` | `response => <T> { status: int32  body: T }`, `created => response<order> & { status?: = 201 }`. §5.7 allows required → injected and FREE → FIXED (line 840), as a corpus fixture's `pet_type?: = "dog"` does. Use `&`: `^` on an application is what [`refinement-source.md`](/2026/40/reports/refinement-source) refuses |
| `retry_policy => <N> { attempts?: integer ~ N }`, `retry_policy<5>` | `retry_policy => { attempts?: integer ~ 3 }`, `retry5 => retry_policy & { attempts?: ~ 5 }` (§5.7 line 842: a restatement may change a default) |
| `maxint => <N> !integer_type { max: N }`, `maxint<10>` | `maxint10 => !integer ^ { max: 10 }` |
| `vector => <T, N> [T; N]`, `matrix<pixel, 1080, 1920>`, `grid => <T, N> { x: [[T; 1..N]; 2..N] }` | `[pixel; 1920]` and `[[pixel; 1920]; 1080]` inline (sugar carries no position restriction, §5.3), or a refined constructor per size, `row1920 => meta.array ^ { min_items?: = 1920  max_items?: = 1920 }`, applied as `row1920<pixel>` |
| `names => <M> !enum [a b M]`, `names<c>` | `named => !enum [a b c]` |
| `typed_by => <T, N> { w?: T ~ N }`, `typed_by<safe_header, Content-Type>` | `typed_by => <T> { w?: T }`, `typed_by<safe_header> & { w?: ~ Content-Type }` |
| `vec => <N> !meta.array { element_type: text  min_items: N }`, `vec<0>` | `[text; 0..]` is refused by §5.3 as `[text]`; write `[text]`, or name each bound |

**Genuinely lost:**
- One name abstracting over a facet value or a size.
- A field every application is forced to fill. A FREE field a member does not tighten stays FREE, where in Revision 39
  every application binds every parameter.
- In a template family, a bare declared application (`dogpet => pet<"dog", dog_type>`) can no longer supply a pin;
  members are written with `&`.

Nothing in the kernel, the bundled schemas or the consumer schema measured is lost.

### 3.5 Proposed spec text

Replace §5.10 ¶960–976 with:

> **Parameters are types.** Every parameter stands for a type: an argument for it is a reference, a name or an
> application, and a parameter stands only at a field's type, or as an argument of an application there or in a parent.
> A parameter anywhere else — a facet (`min_items: N`), a field's default or fixed value, an enum member, a size bound,
> a field name, a group member, `optional`, `voidable`, `role`, `extension`, `discriminators`, `name_type` — is a
> resolver error at the declaration, naming the slot. A parameter carries its name and, where one is written, a bound
> (`<T: text>`); nothing about it is derived from where it stands.

Replace §5.7 ¶856 with:

> **Values in a template.** A `=` or `~` value is a literal of the field's declared type. In a template body a field
> whose type mentions a parameter takes no value, its type differing per application; a value that differs per
> application is written where the application is declared: `created => response<order> & { status?: = 201 }`.

Delete §8.2 ¶1533.

In §5.3 ¶644, end the bound rule at "a non-negative decimal integer without leading zeros", deleting the
value-parameter clause and its classification sentence.

In §12.1: `type-arg = type-ref`; delete `value-literal`; `size-bound = decimal-natural`; the `type-param` comment
reads "the written type is the parameter's bound".

### 3.6 `extern` is no evidence for value parameters

`extern` is deferred out of Revision 39 ([`extern.md`](/2026/40/reports/extern)), and Revision 38's `extern_of<S>` and
`extern_type<S, T>` do not return, so they are no evidence for value parameters. The forms tried for it were closed
constructors instantiated per use (`recipe => !meta.extern { schema: "https://…/cook.tn"  type: recipe }`), not
templates.

### 3.7 Knock-ons

- **A pin on a slot typed `type_ref` is a value slot like any other.**
  `my_set => <T> meta.array ^ { element_type?: = T … }` routes a type parameter through a field's value, and is
  refused with every other parameter at a value.
    - Admitting it would make `record_field.value` a parameter slot, and rest the proposal on `value?: type!`
      ([`dependent-fields.md`](/2026/39/reports/dependent-fields)): the pin's slot is typed `type_ref` by its sibling and not by a
      declaration. Refused, the proposal does not depend on how dependent fields are decided (§8).
    - Nothing measured writes one. Revision 39 change log #21's open item, `kind: meta.type_ref = T` beside
      `v?: kind!`, is written `v?: T`.
    - Its sibling `my_bounded => <N> meta.array ^ { max_items?: = N }` is a value parameter and goes regardless.
- **A refinement template over a closed source has nowhere to put a parameter.** `<T> c ^ { … }` with `c` closed can
  only tighten what `c` declares, and a parameter is IS-A nothing, so the unreferenced-parameter rule refuses every
  such template. `a-template-may-not-refine-a-final-record` cannot be restated over a type parameter and is subsumed.
- **The implicit selector goes.** §5.7 ¶856 makes a field of a fresh record template pinned to a value parameter a
  selector (`response => <T, S> { status: int32 = S … }` dispatches on `status`); with no value parameters, only `=?`
  declares a selector.

## 4. Consequence: bounds are written, never inherited

Rule 1 does not force this. It is taken with it so that a `param` is its name and its written bound, known in full at
its declaration, with no fixed point across templates.

### 4.1 The rule

A bound is what the declaration writes. A parameter passed as an argument to a bounded parameter MUST itself be
written with a bound that IS-A that bound:

- `rebox => <T: text> boxed<T>` resolves;
- `rebox => <T> boxed<T>` is a resolver error at `rebox`, naming `boxed`'s `T: text`;
- `wrong => <T: int32> boxed<T>` stays refused, as it is in Revision 39.

Each application is checked against the written bounds; an application nested in a body is checked when the body
closes, and reported at the declaration that wrote the argument (§5.10 ¶988).

### 4.2 What it removes

This depends on §3. Once a parameter has no type to derive, the bound is the only derived fact left, and this rule
makes it written.

Main code (estimated, about 400 lines):
- Parameter typing loses its cross-template fixed point (the iteration to a settled state and the bookkeeping of
  deferred parameters), inference of a parameter's type from its uses, and bound inheritance with its narrowest-bound
  computation. It ends as a single non-iterative check at declaration, about 220 lines.
- Materialisation loses the stamping of parameters and the replay of its early checks against them. The deferral
  itself stays, for a reason that is not about bounds: judging an argument reads its chain, and an argument is a name
  at a type position, which orders nothing. A check asked for while a declaration is being made ready therefore
  waits until all are, or `a => boxed<b> & { … }` beside `b => boxed<a> & { … }` would be a wait cycle.
- The schema resolver loses its second inference pass and the stamping of parameters with the result, the condemnation
  of a parameter left without a kind, and the recheck call.
- The special grounding case of `loop => <T> loop<T>` ("a parameter the fixed point leaves undetermined is given
  `type_kind`") goes.

Spec: ¶965 (553 bytes, "An argument to another template … a fixed point"), ¶978 (1,212, "A bound is inherited") and
the "derived, never required of the author" framing in ¶960. A replacement of about 400 bytes.

An open item of the first implementation goes with it: verifying, at ingest of a resolved form, that a recorded
`meta.template_param.type` or `bound` is IS-A the type the held body derives. Nothing is left to verify.

Corpus: `a-written-bound-wider-than-the-one-it-inherits` is rewritten. The new vector is a parameter passed to a
bounded position with no bound, and a second runs the same check against an imported template's recorded bound.

### 4.3 What is lost

Only the inferred bound: an author writes `<T: text>` where a callee already requires `text`.

### 4.4 Proposed spec text

Replace ¶978 with:

> **A bound is written.** A parameter passed as an argument to a parameter that has a bound MUST be written with a
> bound that IS-A it: `rebox => <T: text> boxed<T>`. `rebox => <T> boxed<T>` is a resolver error at `rebox`. No bound
> is inferred, so a parameter is known in full at its declaration.

## 5. Consequence: no template is a type

Rule 1 (§1.1): a reference names an open record only as the head of an application.

### 5.1 The rule

No position names a template bare: not a field, element, variant or argument position, and not an operand.

An application of a template is a type: the declaration naming it where one does, its expansion otherwise (§8.2).

A family is declared with records: an abstract base states the selectors and the fields every member shares, a template
composes the base, and each member composes an application and pins the selectors:

```
pet    => abstract { kind: text =?  name: text }
pet_of => <T> pet & { pet: T }
dog    => pet_of<dog_type> & { kind?: = "dog" }
cat    => pet_of<cat_type> & { kind?: = "cat" }
holder => { p: pet }
```

An application's IS-A edges come from its template's written parents: the closed ones, and for an applied parent the
entry that parent application denotes. The template's own name is never one of them. `abstract` on a template is each
application's `extension`, so `result => abstract <T> { … }` still makes `result<text>` an abstract base over
`ok<text>`; `final` on a template stays a resolver error.

### 5.2 Evidence of cost

In the first implementation the family base reaches about twelve components:
- a reader for an abstract template;
- the record-template arms of family selection (a family's selectors, its extension and its names);
- the family body that record extension builds;
- both encodings' discrimination classes and value-reader contexts;
- the JSON stack's dispatch;
- the compiler;
- the resolver's family-base edges (about 35 lines);
- the head edge at a closed operand in composition;
- the template arm of extension (74 lines in all);
- the open entry's test of whether it is a family base;
- membership of `meta.record_template` entries in a reference over their constructor.

A search finds 19 sites that switch on a record template body or ask whether an entry is a family base.

Open defects it closes in the first implementation: the family-base seam itself, and "a record template base's
discriminator rules cannot fire" (the family body is built with no groups, and family selection makes every selector
required, not voidable and FREE).

Revision 39 rules:
- **change log #20** resolves to one rule: no application earns an edge to a template head, so the closed
  operand (`dog => pet<…> & { … }`) and the template parent (`ok => <T> result<T> & { … }`) agree.
- **change log #19**'s problem statement (one constructor carrying a closed record and a family base)
  dissolves. §3 removes its label problem (a pin against a parameter), and the proposal removes the separate constructor it
  argues for.

### 5.3 What it removes

Main code, before the removals of §6.1: about 250 lines (estimated).

Spec:
- ¶999 (5,529 bytes; what remains after §3, about 4,000, is replaced by about 600);
- the family/abbreviation split in ¶952 (about 800);
- ¶1001's "a family base is reached by a position";
- the record-template half of ¶1003 and §8.1 ¶1457 (2,758, rewritten);
- §4.2's `kind<record_template>`.

Tests: about 1,500 lines across the 9 family-base test classes are rewritten over hand-written bases or deleted.

Corpus: `validate-template-family-members.tn` and its 3 validate vectors. `a-family-base-names-the-entries-its-members-name`
goes under §3 anyway.

### 5.4 What is lost, and how to write it instead

| Lost | Replacement |
|---|---|
| `shape => <T> { kind: text =?  data: T }` named at `p: shape` | `shape => abstract { kind: text =? }`, `shape_of => <T> shape & { data: T }`, members `circle_shape => shape_of<circle> & { kind?: = "circle" }`, position `p: shape` |
| `holder => { any: box }` over `box => <T> { v: T }` (any declared `box<…>`) | `boxed => abstract { }`; `box => <T> boxed & { v: T }`; members declared `bt => box<int32>`. Each is IS-A `boxed`, and `any: boxed` dispatches by tag |
| A declared application being a family member with no composition (`bt => box<int32>` IS-A `box`) | the same declaration, IS-A whatever `box`'s written parents reach |

What the template base carries in Revision 39 is exactly the fields that mention no parameter (¶999: "a field whose type
mentions a type parameter omitted"). The hand-written base states those fields itself, so no information is lost.

What is genuinely lost is the extra declaration: one more name per family.

Nothing in the consumer schema measured names a template bare. Its declared applications
(`place_order_call => call<new_order>`) lose the IS-A edge to `call` that the family base adds, and nothing reads that
edge.

### 5.5 It reverses the record_template direction of change log #19

Revision 39 change log #19 makes a record template its own constructor because it is a family base:
a record is what readers and writers are built for, and a template is never read or written against, since a position
it types dispatches to a member. `meta.record_template`'s documentation says the same: "That is why it is its own
constructor and not a record with an optional list of parameters." Without family bases, that reason is gone.

**As built:** #19 is in Revision 39 and is implemented, so this reverses a rule that runs. Against what #19 built:

| #19's work | Under the proposal |
|---|---|
| the desugarer's labelled `!record_template` payload | undone; a record template is a `record` with `parameters` (§1) |
| the `type_param`/`value_param` labels on a record template's fields | undone: `value_param` by §3, `type_param` by the open record (a `type` naming a parameter, recognised by the shadowing rule, as an argument already is) |
| a record head sharing five facts between the two bodies | undone; one body is left |
| building a record field from a record template field | undone; building a record field survives |
| refusing a parameter that shadows another name | **survives**: every template's parameter list |
| refusing an absorbed spelling | subsumed: with every argument a reference, a name an absorbed field type writes is an entry, so the shadowing refusal covers it |
| spelling out `x => T` | **survives** as the spelling-out of the positional field; the label it attaches becomes a plain `type: T` |

### 5.6 Proposed spec text

Replace ¶999 with:

> **A template is not a type.** No position names a template bare — a field, element, variant or argument position or
> an operand of `&` or `^` — and an application of one is a type: the declaration naming it where one does, its
> expansion otherwise (§8.2). A family is declared by records: an abstract base states the selectors and the fields its
> members share, a template composes the base, and each member composes an application and pins the selectors. An
> application's IS-A edges are its template's written parents' — each closed parent, and for an applied parent the entry
> its application denotes — and never the template's own name. `abstract` on a template is each application's
> `extension`; `final` on a template is a resolver error.

## 6. Consequence: a template body is a record body

Only `record` carries `parameters` (rule 1), and every other constructor is applied without one (rule 2). So no
template stands over a container, an atom, a reference or a choice, no template's body is a bare reference, the kernel
needs neither `template` nor `record_template`, and no form inside an open record lifts to an open entry (§1.4).

### 6.1 What it removes

This rests on §3 (a parameter must be a reference) and on §5 (no position names an open record, so no reader is
built for it).

Main code (estimated, about 1,000 lines out and about 120 in):
- the held body (246), and resolved-form writing's text substitution with its parse-back and the internal error a
  failed parse-back raises (about 115);
- the record template body (168), field (110), substitution (147, replaced by about 40 over the reference map),
  definition (27) and head (47);
- the open entry as a kind of its own (84): an open entry is a record whose `parameters` is non-empty;
- the template body model (68) and the template parameter model (58), replaced by `param`;
- materialisation's closing of a non-record body, and the kernel heads' special cases (`set`, `ref`) in the desugarer
  and the linker;
- the desugarer's record-template labelling (about 90);
- the resolver's open-record path and the template arms of building a field;
- the record-template arms of field names, name types and entry kinds;
- parameter typing's walk over the data tree, replaced by the constructor's own reader and a check that a parameter
  stands at a field's type or as an argument;
- open synthetic entries as a category (§1.4): the open lift in the desugarer, merging an open synthetic into an
  existing entry (158), and their parameter capture.

What comes in: construction sugar over a constructor's required reference fields (one function, shared by the sugar
forms `[T]` and `{K => V}`, which are the same construction spelled by the grammar); holding a reference with a
parameter among its arguments until the open record is applied, which is what a held `box<T>` already does; and
the refusal of every form over a parameter that is not a reference (§1.4).

These figures were estimated before three refusals were added: container sugar with a size or a `?` over a
parameter, a template over a value, and an application in a data document. Each removes more, and none is counted.

Kernel: about 180 lines with their documentation (§1.3).

Spec:
- ¶954, ¶958 and ¶1003 (about 6 KB), the held-body half of ¶954 among them;
- ¶986, "Declaration-time checking splits …" (1,481) with its stand-in-value prohibition;
- most of ¶988, "Where a deferred diagnostic lands" (807);
- the example block at ¶994–997;
- §8.2 ¶1535's "parsed held body", and §8.2's identity clause for open synthetic entries (equality up to
  consistent renaming of parameters);
- §5.3's open half of the lift rule: a parameter-bearing form lifts to nothing;
- §4.2's `kind<record_template>` and every mention of `meta.template` in §8.1;
- §12.1: `type-def`'s `[type-params] type-expr` alternative narrows to a record body; `type-ref`'s argument list is
  unchanged.

Spec text added: about 1 KB (§1.6).

Revision 39: change log #19's record template constructor is replaced by §5 and the open record; the
question of what type a `template.body` field would have never arises (§9.1).

### 6.2 What is lost

- **`tuple1` and `voidable_tuple1`.** Their parameter stands in a nested slot (`elements: [{ element_type: T }]`), which
  construction sugar does not reach: `tuple`'s one required field is a list of records, not a reference (§9.5). A
  one-position tuple is written out, as a declaration:
  `one_text => !meta.tuple { elements: [{ element_type: text }] }`, or in `tuple`'s positional form
  `one_text => !meta.tuple [{ element_type: text }]`, and a voidable position adds `voidable: true` to the element.
    - What is lost is the inline spelling. A constructor application is valid only as the body of a declaration
      ([TSON-SCHEMA] §5.6, "Named definitions required"), so `only: meta.tuple1<text>` becomes the declaration and
      `only: one_text`.
    - `[T; 1..1]` is an array bounded to one element, not a tuple, and serves only where a host binding does not care
      for a FIXED product.
    - The bundled schemas apply neither head. The corpus applies both in `validate-core-templates.tn`, read by five
      `class2/validate` vectors (one element, the void sentinel, two elements, `[_]` and `[]`); the fixture moves to
      declared one-position tuples and the vectors keep their verdicts.
- **A template over a non-record constructor.** `<T> !meta.array { element_type: T  min_items: 1 }` has no home
  for `parameters`. The replacement is a refined constructor, `nonempty_type => meta.array ^ { min_items?: = 1 }`,
  applied as `nonempty_type<text>` by rule 2, or the sugar at the use site, `[text; 1..]`.
- **An abbreviation is no longer its expansion.** In Revision 39 a template over a container is transparent: with
  `rows => <T> !meta.array { element_type: T  min_items: 1 }`, `rows<uuid>` and `[uuid; 1..]` are one entry, which
  `an-application-nothing-declares-is-its-expansion` pins. Under the proposal `rows => meta.array ^ { min_items?: = 1 }`
  is a refined constructor: `rows<uuid>` is `!rows { element_type: uuid }` and `[uuid; 1..]` is
  `!meta.array { element_type: uuid  min_items: 1 }`. They admit the same data and are two entries, neither IS-A the
  other.
    - **Accepted.** A declared refined constructor makes a named kind of array, as the kernel's `set_type` does:
      `set<text>` and an array written with `unique_items: true` are two entries already.
    - The transparent spelling stays the sugar, `[uuid; 1..]`, at every closed use site. Nothing is minted for sugar
      over a parameter (§1.4), so two entries arise only where an author declares the constructor.
    - The vector is rewritten to pin two entries.
- **A template over a value.** `orders => <T> !interface { get => { response: T } }` with `order_api => orders<order>`
  (`a-namespace-entry-closed-from-a-template-states-its-application`): the body is an instance of a namespace type, a
  value entry and no type, and its parameter stands in a record nested in the map. It is refused: the body is not a
  record, and `interface` has no reference field of its own to construct over.
    - **What is lost** is writing the structure of an interface or API surface once and stamping it per resource.
      Shapes are still shared, through record templates the values name (`response: page<order>`).
    - **Instead:** one declaration per instantiation, `order_api => !interface { get => { response: order } }`. Or the
      vocabulary carries the resource as data, `crud => { resource: meta.type_ref  path: text }` with
      `order_api => !crud { resource: order  path: "/orders" }`, and the consumer that knows `crud` supplies the
      operations.
    - **Evidence.** One corpus vector and one test of the first implementation
      (`fetch => <T> !operations { get => { request: T  response: T … } }`), each written to pin the mechanism. No
      bundled schema and nothing in the consumer schema measured declares one; its three templates are records.
    - **It is not a type operator** (§2.4): its application is a value, so it is the one template that computes data,
      and Revision 39 has it only because a held text body substitutes into anything.
    - **Keeping it** needs a home for `parameters` on an instance of an arbitrary record, which is the wrapper of
      §9.1, and an account of where a parameter stands at any depth of a value. It can return as a facility of its
      own for values if a consumer shows the per-resource boilerplate is real; nothing here forecloses that.
- **Container sugar with a size or a `?` over a parameter** (§1.4): `page => <T> { items: [T; 1..] }`. Two ways to
  write it instead:
    - Declare the constructor once and apply it: `nonempty_type => meta.array ^ { min_items?: = 1 }`, then
      `page => <T> { items: nonempty_type<T> }`. The template stays generic over the element and still says `items` is
      a list.
    - Move the container into the argument: `page => <T> { items: T }`, applied as `page<[uuid; 1..]>` or through a
      declared `uuid_list => [uuid; 1..]`. The template no longer says `items` is a list, and no bound can say it.

  The corpus holds no instance; the first implementation's tests do (`paged => <T> { items: [T; 1..] }`, and
  `[tree<T>; 1..]`).
- **A choice or tuple over a parameter**, as a template or inside one (§1.4, §9): `( T | error )`, `[T, text]`. The
  corpus holds none; the spec's own examples do (`<T> ( T | error )`, and `nested => <T> ( T | [nested<T>] )` in
  §5.10.1 and §8.2, which need a record-bodied example of regular recursion).
- Nothing else: 86 of the corpus's 101 template declarations have a record body (§2.1), and the consumer schema
  measured declares record templates only.

### 6.3 Alias templates (partial application)

- **Rule.** A template's body is a record body, so a body that is a bare reference is a resolver error, whether a
  partial application (`uuid_pair => <B> pair<uuid, B>`) or the identity (`ident => <T> T`). It needs no rule of its
  own: a bare reference is not a record.
- **Removes:**
    - materialisation's closing of a held alias, and the alias-closing cycle and its diagnostic;
    - the resolver's open-alias path and its two callers;
    - the held reference in resolved-form writing;
    - the `!meta.alias` held head, and "Reference-kind templates compose during substitution";
    - spec ¶1017 and ¶1024 (1,756 bytes) and the alias rows in ¶952 and ¶1003;
    - about 100 lines of code in all (estimated).
- **Lost:** the convenience of naming a partial application. Instead, restate the body
  (`uuid_pair => <B> { first: uuid  second: B }`) or apply the head at each use (`pair<uuid, int32>`).
- **Corpus:** `an-open-alias-target-is-a-reference-as-written` is deleted.
- **Proposed text,** replacing ¶1017–1024: "**No alias templates.** A template's body is a record body; a body that
  is a bare reference — `<B> pair<uuid, B>`, `<T> T` — is a resolver error. A use site writes the application it
  means."

## 7. Order of work and dependencies

All six steps are built. The proposal lands in the order its parts depend on each other:
1. **Value parameters out (§3).**
    - The corpus moves first: delete or rewrite the 15 subjects, 2 fixtures and 4 expected files of §2.1, and add a
      vector for a parameter in a facet slot under the one rule.
    - Then the spec (§3.5), the kernel (`template_param`, `record_template_field`), and the code.
    - It depends on nothing.
    - Built. Three points it settled:
        - a literal in an argument list is refused by the grammar, in a schema document and in a data document
          alike, so [TSON-DATA] §7.4's `type-arg` is a reference;
        - a parameter at a construction's type slot, `<T> !meta.array { element_type: T }`, stays admitted until
          step 5, the kernel's `set`, `meta.ref` and `tuple1` being such templates;
        - the absorbed-spelling refusal refuses nothing the shadowing refusal does not (§1.3).
2. **Written bounds (§4).** Depends on 1: while value parameters exist, a parameter's type is derived and the fixed
   point stays.
    - Built. A parameter is checked once, at its declaration, and a bound a callee asks for is a bound the passing
      declaration writes.
    - A sugar form over a parameter is looked through: `[boxed<T>]` is judged at the declaration that wrote it, since
      one lifted entry serves every template writing that form and can carry no one declaration's bound.
    - A malformed written bound, `<T: [text]>`, fails the declaration where it resolves.
    - The deferral of an argument's check stays (§4.2).
3. **The alias refusal and construction sugar.** Each is independent of everything, and small; they can go first.
    - An alias template (§6.3). The refusal stops being a rule of its own at step 5, when a body is a record only.
    - Construction sugar over reference fields (rule 2): it is the rule `[T]` and `{K => V}` already follow, and it is
      what lets the `set` and `ref` heads go. Built first, it settled three points the rule leaves open:
        - a field with a default is not an argument slot: a slot is a required field with no default and no pin;
        - a use-site construction names its content-keyed entry, as `[text]` does, and never a declaration of the same
          construction;
        - an argument is not followed through an alias, so `meta.array<user_id>` is `[user_id]` and not `[uuid]`.
          That is the sugar forms' identity, and [TSON-SCHEMA] §8.2's clause comparing an application's arguments
          past their aliases is scoped to substitutions.
4. **No template is a type (§5).** It reverses #19's record template constructor (§5.5). The parts of #19 that
   survive (the shadowing refusal, building a record field) stay. It depends on
   nothing, but is smaller after 1.
    - The corpus moves first, and fills a gap: no vector and no test of the first implementation exercises a member
      that composes an application to pin a selector. §5's family shape is `pet => abstract { kind: text =? }`,
      `pet_of => <T> pet & { pet: T }`, `dog => pet_of<dog_type> & { kind?: = "dog" }`, read at `p: pet`, reaching
      `pet` through `pet_of`'s written parent.
    - Revision 39's template-base form of the same pinning (`tpet => <B> fbase & { kind: text =? … }`,
      `tdog => tpet<text> & { kind?: = "dog" }`) is exercised only by the first implementation's own tests, in both
      encodings.
    - A `class2/validate` vector for each form, valid and pin-missing, lands before the code relies on the first.
    - Built. Points it settled:
        - a selector (`=?`) on a template is each application's, as `abstract` is, so an application of a selector
          template is abstract, and one written at a use site with nothing composing it has no member to read;
        - no reference holds a template, so `meta.ref<meta.record_template>` has no members, and a template is in
          no `subtypes` index;
        - an applied parent whose application nothing declares earns no edge;
        - a template named bare inside a held, non-record body is not caught until step 5 removes held bodies.
5. **`parameters` on `record` (rule 1), and the kernel.**
    - It depends on 1 (a parameter is a reference) and on 4 (an open record is read by nothing).
    - Removing open synthetic entries (§1.4) depends on it: until then a parameter-bearing form inside a record
      template still lifts. The refusals of §1.4 land with it, with `schema/invalid` vectors.
    - The kernel moves in one step: `record.parameters?`, `param`, the deletions of §1.3, and the two heads replaced
      by an alias and a refined constructor. The kernel's `!!id` is re-stamped once.
    - Change log #19's record template constructor is replaced here.
    - A corpus vector pins `void` as an argument: an application whose field is then `void`-typed, valid with the
      sentinel or nothing as the field's marks say.
    - Reading a resolved form stays a mode of the reader and no mark in the document. Its one use is test code
      checking a resolver's output, so the mode is a flag the reader does not publish.
    - In the first implementation's model a record body gains its parameters, and a reference gains a parameter case
      beside the sibling case, a parameter being a name that resolves to no entry. The invariant to state there: no
      closed position, and no member set over `meta.ref<meta.record>`, reaches an open record. A test of whether a
      body is a reference goes by chain, `meta.ref` being a subtype constructor, as `set_type` already requires of
      arrays.
    - Built. The hand-written resolved form of §1.3 is what the resolver produces, and the measurements hold: 81
      entries, one wait cycle of 25, a closure of 69 and six synthetic keys. Points it settled:
        - a parameter is itself a reference, since it stands as an argument, and never equals a name of the same
          spelling: the record holding it scopes it;
        - `parameters` is the list written before the body and nothing else: stated as a binding inside
          `!meta.record { … }` it is refused;
        - a parameter is never a field's name or the record's `name_type`;
        - a constructor applied to a parameter at an operand, `<T> customer & meta.array<T>`, is refused as its
          closed spelling is, a container having no fields to contribute;
        - a closed form holding an application, `[box<text>]`, is still named before the application closes, so the
          merge of a lifted entry with the one construction mints stays;
        - an open record's own references are checked for arity at its declaration and judged where it is applied,
          so a name that resolves to nothing is reported per application, and not at all while nothing applies the
          record. The rule's reading at the declaration asks for more, and it is outstanding work.
6. **No application in a data document (rule 3).** Independent of the rest, and built.
    - The refusal sits in the reference atom's own reader, which both encodings share: in a data document a
      reference carrying arguments is a constraint violation, and its message names the remedy, the entry the
      schema declares. A schema document and a resolved form read through the mode that keeps applications.
    - What goes is the lookup of an application in data against the closure's applications: the index of applications
      and of aliases beside a reference's members, and the comparison of arguments past their aliases for data.
    - A refusal's list of admitted names leaves out minted entries, which data could only have reached by writing
      the application.
    - Seven `class2/validate` vectors over `validate-kind-applications.tn` pinned Revision 39's rule:
        - `t: set<text>` is kept as written and moved to `invalid`, the vector for the refusal;
        - two valid vectors and one invalid one are rewritten to name the declared entry (`names`, `paired`);
        - `an-application-nothing-closed-is-refused` keeps its verdict for the simpler reason;
        - one valid and one invalid vector are deleted, with a fixture only they read. Comparing arguments past
          aliases is schema identity and no longer a question data can ask, and `box<order_id>` in data is the case
          `set<int32>` already is.
    - [TSON-JSON] changes with it: §1.6's item on references, the kinds row of §5's table, and §5.6, where a string
      holding an application is a validation error whether or not the closure closes it.
    - Left alone: data may still write a minted entry's internal name, which is a question of what a reference
      admits ([`rev40-proposal.md`](/2026/40/reports/rev40-proposal) §1.1).

The SPEC-FEEDBACK entry for this proposal states what is running at each step. It is a proposal until step 1 lands.

## 8. Open questions

None. Each question raised against the proposal is answered in the section that owns it; what was decided against is
in §9.

**Decided elsewhere.** Whether dependent fields (`kind!`, and `value?: type!` on `record_field`) stay is not this
proposal's question and it does not depend on the answer: no parameter stands at a field's value. If they go, the
sibling form in `reference_type`'s documentation and the dependent-field paragraph in `record_field`'s go with them.

## 9. Not proposed

- **Refusing recursion.** The regularity check (about 180 lines in the first implementation) and knot-tying cost about
  2 KB of §5.10.1 and §8.2 ¶1532. Refusing recursion loses `tree<T>`/`linked_list<T>` (the alternative is one
  declaration per instantiation, `text_tree => { value: text  children?: [text_tree] }`), and a refusal needs the same
  reachability walk.
- **Requiring every application to be declared.** A use-site application closes to its content-keyed expansion, and a
  reference held inside an open record closes to one when the record is applied, so content identity and expansions
  stay. Open synthetic entries do not (§1.4). With data naming declared entries only, it is the first thing to
  examine after this proposal ([`rev40-proposal.md`](/2026/40/reports/rev40-proposal)).
- **Keeping templates over non-record constructors.** §3 removes the atom templates by itself (their slots are
  values); construction sugar over the constructors themselves removes the rest (containers, `ref`, namespace), so a
  template body is a record only. A template over a container with a facet set is a refined constructor instead
  (§6.2).
- **Named construction slots** on a constructor (`<element_type> meta.product & { … }`), §9.2.
- **Parameters on `choice`.** A choice's variants are a list, not positional reference fields, so construction sugar
  does not reach it, and it carries no parameters: a choice template is refused, and so is a choice holding a parameter
  inside an open record (§1.4). This is the boundary Revision 33 drew around list-valued slots (Revision 33 change log #53),
  taken on purpose this time, with the argument below. No use case found needs a choice template:

  | Use case | Instead |
  |---|---|
  | `result => <T> ( T \| error )`, `either<L, R>` | A discriminated record family (`result_of<T>`, §5.1). An untagged sum over a parameter is disjoint for some arguments and not others, so one template would be valid or refused per application, with the error found at each — the deferred diagnosis the proposal removes. A discriminated envelope is also what OpenAPI and structured-output consumers expect |
  | `{ body: ( T \| problem ) }` inside a record template | A field group, `( body: T \| problem: problem )`: labelled, and the parameter is an ordinary field type |
  | `one_or_many => <T> ( T \| [T] )` | `( text \| [text] )` at each use, or one declaration per type. The one genuine loss, and it is a name, not expressiveness: a JSON habit (`"to": "a"` or `["a", "b"]`) the template would only abbreviate |
  | `optional<T>`, `nullable<T>` | Already refused: optionality is the position's (§5.2), and a variant may not resolve to `void` (§5.4) |

  `( ok<text> | err )` stays writable where it is used, every variant closed.
- **Parameters on any other constructor.** Putting `parameters?` on `meta.type`, beside `chain?`, would let every
  constructor value be open. It was considered and not taken: nothing needs it, and only `record` declares
  constructors and family bases.

  | Constructor | Parameter use case | Served by |
  |---|---|---|
  | `array`, `set_type`, `map`, `namespace` | `<T> [T]`, `<V> { text => V }` | Construction sugar: `meta.array<T>`, `meta.map<text V>` |
  | the same with facets | `nonempty<T>`, `bounded_map<V>` | A refined constructor applied by construction sugar: `nonempty_type => array ^ { min_items?: = 1 }`, `nonempty_type<T>` |
  | `reference_type` | `meta.ref<T>` | Construction sugar over `of` |
  | `enum_type` | a parameter as a member | §3: members are values |
  | `tuple` | `pair => <A, B> [A, B]`, `tuple1<T>` | Not served: `elements` is a list of records. A record template (`{ first: A  second: B }`) changes the wire form from positional to named. Generic positional tuples are rare: the bundled schemas apply `tuple1` nowhere, and the corpus only in the fixture written to exercise it. A one-position tuple is written out (§6.2); arguments read as a list are not taken (§9.5) |

  `record` is the one constructor whose parameters nothing else expresses.
- **Changing what makes an entry a type.** [TSON-SCHEMA] §4.1's constructor test sets `!meta.array { … }` apart from
  an instance of any other record, though a constructor's instance is data a processor reads as it reads the rest.
  Whether that distinction is needed is a question about §4.1 and not about templates: this proposal adds nothing to
  it (§1.3), does not need it answered, and leaves it for a follow-up. The refusal of a template over a value
  (§6.2) arises only because the two are treated differently.
- **Normalising a construction to its source constructor.** Rewriting `!rows { element_type: uuid }` to
  `!meta.array { element_type: uuid  min_items: 1 }`, where a refined constructor only pins fields, would keep
  `rows<uuid>` and `[uuid; 1..]` one entry (§6.2). It costs a rule in §8.2, and `set_type` only pins fields too, so
  `set<text>` would collapse into a plain array unless the rule exempted it.
- **Refusing applied parents.** The alternative, a choice template `result => <T> ( ok<T> | err )`, reads untagged
  record variants, which §5.4's disjointness may refuse. With §5, applied parents need no head edge and
  change log #20's head edge goes, so they stay.

### 9.1 Not taken: a `template` constructor wrapping a body

One constructor could hold every open entry, with `record_template` folded into it:

```
template => meta.top & {
  parameters: [meta.template_param; 1..]
  body:       meta.top
}
```

with the body the constructor's value as written, read at the declaration, and a record template a `template` over a
`!meta.record` body. It was not taken, for three reasons. With value parameters gone the only slots a parameter can
stand in are reference slots, and the kernel's own non-record templates (`set`, `ref`) each stand in a top-level field
of the constructor they apply — which rule 2 covers with no declaration. Once those go, every remaining body is a
record, and a wrapper around a record whose only extra fact is a list is the list as a field. And the wrapper's
`body: meta.top` raises the question of whether the kernel can type "a value of some constructor IS-A
`top`" as a field; with no body field there is nothing to type.

### 9.2 Not taken: named construction slots

An alternative keeps the bracket on constructors to name the fields an application fills:

```
array => <element_type> meta.product & { element_type: meta.type_ref  … }
map   => <key_type value_type> meta.product & { … }
```

It makes the order explicit and lets a constructor expose fewer slots than it has reference fields. It was not taken:
the bracket gains two readings (a name that is a field of the declared record, or a fresh parameter) resolved by
lookup; a clash (`<value> { value: value }`) needs a refusal; and the list needs a home in the resolved form for a body
that is not a record, which is the wrapper of §9.1 or `parameters` on `top`. It would be worth revisiting only if
the kernel came to want a constructor whose application fills some of its reference fields and not others; nothing in
it today does.

A related play, `array => <T> meta.product & { element_type: meta.type_ref = T }`, means something else: `= T` pins
the field, so every instance would carry the argument and `meta.array<text>` would be a refined constructor rather than an
instance, and a parameter at a field's value is refused (§3.7). It is also Revision 32's spelling of `array`
(§2.5), which needed it because a constructor had no other way to be applied.

### 9.3 Not taken: a construction spelling of its own

`!C<args>` for construction beside `T<args>` for substitution would let a reader tell the two operations apart, and
would make an author know the head's kind. It was not taken. The single spelling has one cost, recorded below, and
`!C<args>` does not repair it.

**Why not.**
- **`!` does not mean "construct".** A tag says the value after it is read as the type it names ([TSON-DATA] §3.2);
  `!meta.array { … }` constructs only because that type is a constructor. By that reading `!set<text> [a b]` is a set
  of text carrying its type, the form §3.2 names and refuses: a tag is a qualified name and nothing more. As
  construction, a tag with arguments would denote a type, where the reading every other tag has makes it a value of
  that type, and it would take the spelling a generic tag in data would need.
- **The parse would depend on the head.** `!C text` and `!C { … }` are a tag and the value after it. `!C<args>` would
  be a complete value, so whether a value follows a tag would turn on what the head resolves to, which the data
  grammar does not know.
- **At a use site the kind is the head's own business.** Both operations stand at a reference slot and yield a type,
  and neither earns an edge to the head (rule 3). Leaving the kind unwritten is what lets a head change kind without
  its users changing: this proposal turns `set` and `ref` from templates into an alias and a refined constructor and
  touches no use site. With `!`, each such change breaks every application.
- **It would fall on the commonest spellings.** `meta.ref<…>` is written 129 times in the corpus and `set<…>` 16,
  and to an author they are generic types as `result_of<…>` is.

**What the single spelling costs.**
- **A constructor's arity and order are derived, not written** (§1.2, "On field order"): its required fields typed by
  a reference and not pinned by its chain, in declaration order. A refinement that pins a reference field takes one
  argument fewer than its source, and nothing at its declaration says so. A `!` would mark the head as a constructor
  and leave the list as derived. Named construction slots write it (§9.2), and are the form to revisit if this cost
  proves real.

A `_type` name constructs (§1.3): a convention, and the cue an author has. A spelling of its own would be worth
revisiting only if one name could be both a constructor and a template, which §5 and the one namespace rule out.

### 9.4 Not taken: a label for a parameter on `record_field`

`( type: meta.field_type_ref | type_param: meta.param_name )` would keep every `type` a name of the closure, with a
parameter under a label of its own. It is the shape of Revision 39's `record_template_field` (`meta.tn:717-723`), and
it was not taken because a label reaches one of the three places a parameter stands:

| Where `T` stands | Example | Covered by a label |
|---|---|---|
| A field's whole type | `value?: T` | `type_param` |
| An argument in a field type | `items: box<T>` | no: recognised by its text, as in Revision 39 |
| An argument in a parent | `<T> result<T> & { … }`, `parents: [result<T>]` | no: the same |

So a label is a second mechanism beside the lookup an argument needs in any case, and it adds a rule across fields:
`type_param` only where the record has `parameters`. It is also §2.5's quotation typed slot by slot, incomplete where
the reference grammar recurses. A parameter is a name, and a slot that holds names holds it.

A marked spelling in the reference grammar, as `kind!` marks a sibling reference, would let resolved output be read
with no scope and retire the shadowing refusal. It is a [TSON-DATA] §7.4 grammar change for a lookup §3.3 already states, and
was not taken.

### 9.5 Not taken: arguments read as the elements of a list field

`meta.tuple<text>` could stand for the one-position tuple, and `meta.tuple<text int32>` for `[text, int32]`: where a
constructor's one unmarked field is a list, the arguments would be its elements. It was not taken:

- **It is a second rule, not rule 2 extended.** Rule 2 lands each argument in a field of its own, and the fields fix
  the arity. Here every argument lands in one field and nothing fixes how many. For `tuple` it also takes a second
  hop, from the list's element (`tuple_element`) to that record's `element_type`.
- **Two constructors have the shape,** `tuple` and `choice`, and both have sugar for two or more.
- **It reaches `choice`.** `meta.choice<T error>` would be a reference an open record can hold, so the refusal of a choice
  over a parameter would rest on disjointness alone (§1.4).
- **It half-replaces.** A voidable position is not an argument, so `voidable_tuple1`'s case is written out either way.

What it would buy beyond `tuple1` is a tuple over a parameter: `[T, text]` inside an open record would be the held
reference `meta.tuple<T text>`, and §1.4's refusal of a tuple would go. That is the condition for revisiting it. Nothing
measured wants a generic positional tuple (§6.2).
