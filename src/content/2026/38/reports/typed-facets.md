---
title: "Typed facets: retiring \"value\" from meta.tn"
description: "Step 8 of One Level: declare each atom constructor beside its canonical instance and type its facets by that instance, so value and value_type leave the kernel. Adds a value-to-value edge to the resolution order: a value read against an atom waits on that atom's facets."
against: "TSON 2026 Revision 38 (Working Draft)"
status: "Landed in Revision 39"
id: "CR-typed-facets"
---

# Typed facets: retiring `value` from `meta.tn`

**Status: landed in Revision 39.**
- **Proposed:** step 8 of [`one-level.md`](one-level.md)'s order of work. Each atom constructor is declared beside its
  canonical instance, and its facets are typed by that instance instead of `value`. §7.4's eager-conversion rule
  for `value`-typed constraints goes. The dependency model gains a value-to-value edge: a value read against an atom
  waits on that atom's facets.
- **What happened:** as proposed. Every facet of a bundled constructor holding a value of its family is typed by the
  family's instance, declared at the root of the same document: `number`, `rational`, `date`, `time`, `datetime`,
  `duration`, `period`, `cidr4`, `cidr6`. `value` and `value_type` are deleted from the kernel. Their other slots went
  with the reference atom (`type_argument`) and with dependent fields (a field's default or pin, typed `type!`). The
  facet edge is rule 1 of the resolution order. The cycle this note predicted turned up in the kernel's own count type.
- **Where:** [TSON-SCHEMA] §4.2, §5.2, §5.5, §7.4, §13.2. [SPEC-FEEDBACK.md #17](../SPEC-FEEDBACK.md) (a facet is typed
  by its family's instance), [#4](../SPEC-FEEDBACK.md) (resolution order, the edge),
  [#12](../SPEC-FEEDBACK.md) (`type_argument` goes), [#16](../SPEC-FEEDBACK.md) (`count`, and the cycle) and
  [#21](../SPEC-FEEDBACK.md) (the last `value` slots).

That note's model and its removal of the ladder stand without this one. What this note needs from one level is one
thing: a constructor and its canonical instance in one document, so that a facet of the constructor can be typed by
the instance. It is the kernel's own pattern (§7.4: `integer_type`'s bounds are typed `integer`, "the exception that
proves the rule"), extended to every atom constructor in `meta.tn` once the ladder no longer keeps the instances a
rung below. The edge it needs, a reader waiting on the facets it checks with, is stated in one-level.md's model and
proved on the kernel there; this note is where the edge was found and where its consequences for `meta.tn` are worked
out. Examples written `c <- { … }` use [`construction-operator.md`](construction-operator.md)'s dropped spelling. Read
them as `!c { … }`.

## The `value` escape hatch in Revision 38

In Revision 38, `meta.tn` declares atom constructors (`decimal_type`, `float_type`, `rational_type`, `date_type`,
`time_type`, `datetime_type`, `duration_type`, `period_type`, `ipv4_type`, `ipv6_type`, `cidr4_type`, `cidr6_type`)
while their instances (`number`, `float64`, `date`, `ipv4`, `cidr4`, …) live one rung down in `core.tn` and `net.tn`.
Because `meta.tn` cannot reference `core.tn`, every bound and network list in `meta.tn` is typed `value`, requiring the
bespoke eager-conversion prose of §7.4. Nor can `meta.tn` declare `number => !decimal_type {}` itself under the
ladder, because its `!` targets resolve in the kernel's entries, not its own (§3.3.1).

Under one level, each atom constructor and its canonical instance sit together (or mutually resolve in the same pass, as
`integer_type` and `integer` already do in `meta-kernel.tn`):

```
decimal_type => atom & {
  ( min: number | exclusive_min: number )?
  ( max: number | exclusive_max: number )?
  multiple_of?:     number
  total_digits?:    non_negative_integer
  fraction_digits?: non_negative_integer
  members?:         !set_type { element_type: number  min_items: 1 }
}
number => !decimal_type {}

ipv4_type => atom & atom_specification & {
  spec?:      = "https://www.rfc-editor.org/rfc/rfc3986"
  within?:    [cidr4]
  excluding?: [cidr4]
}
ipv4 => !ipv4_type {}
```

**As built:** the constructors left `meta.tn`. They live in the data-format libraries under their family's map,
`numeric.decimal_type` in numeric.tn beside `number => !numeric.decimal_type {}` at its root, `net.ipv4_type` in
net.tn beside `ipv4 => !net.ipv4_type {}` (SPEC-FEEDBACK.md #15). The facets are as sketched. The digit counts are
typed `numeric.count`, the members `numeric.decimal_member_set`, and the network lists `[cidr4]` and `[cidr6]`. A
float's bounds are `number`, not `float64`, because they are validated against the value as written, before rounding.
A bound must now be spelled as a value of its family: `!number ^ { min: 0x10 }` is refused, as `!number 0x10` is in
data, where a `value`-typed slot used to decode it and narrow it (SPEC-FEEDBACK.md #17).

**What goes with it.** §7.4's "Constraint fields typed as `value`" and its eager-conversion rule: a token at a
`value`-typed position is read "under the atom it stands for, once that atom is in scope". With the facet typed by that
atom, the ordinary field reader does the same reading, and the paragraph, the bootstrap-ordering reason it gives
(§3.4), and `value_type`'s role in the escape are prose no longer needed. `record_field.value` is the other `value` slot,
retired by [`dependent-fields.md`](dependent-fields.md); `type_argument` goes with `type_ref`, below, so `value_type`
leaves the kernel. **As built:** all three. `record_field.value` and `record_template_field.value` are typed `type!`,
the field's own declared type (SPEC-FEEDBACK.md #21). Nothing in the bundled documents names `value`.

## The edge it adds to the dependency model

one-level.md's model reads every value against a closed **shape**, and a type's shape is its constructor and its
structural facts: field names and types, element and key types, parents, selector pins. An atom's **facets** are not
in that table: `uint8`'s `min: 0  max: 255` are values, read against `integer_type`'s shape. But the reader for a
value of `uint8` needs those facets to validate, so a reader is a shape *plus* the facets read against it, and a value
read against a refined atom waits on that atom's facets having been read: an entry-level **value → value edge** that
the model as stated does not have, its values being leaves.

The kernel already has the edge. In Revision 38 `integer_type.multiple_of` is typed `non_negative_integer`, which is
`!integer ^ { min: 0 }`, so reading `multiple_of: 15` in any integer refinement waits on `non_negative_integer`'s
facet `min: 0` having been read against `integer_type`, which waits on `integer`'s reader, whose facets are none. It is
acyclic, and today it is closed by pre-loading, which is why nothing has had to state it. Retiring `value` makes the
edge general: `decimal_type.min: number` waits on `number`'s facets (none), `ipv4_type.within: [cidr4]` on `cidr4`'s,
and a facet typed by a refinement with facets of its own waits on those.

**As built:** the example moved. `non_negative_integer` was unbounded, so it was replaced by the kernel's
`numeric.count => !int64 ^ { min: 0 }`, which types every count facet. `multiple_of` is typed `integer`, its sign a
coherence check, since a step is a value of the integer's domain and no count (SPEC-FEEDBACK.md #16). The edge is the
same: reading `min_length: 5` waits on `numeric.count`'s facets.

**The rule.** A value read against an atom `A` waits on `A`'s facets being read, and `A`'s facets are read against
`A`'s constructor's shape, each facet value waiting in turn on the atom its facet field is typed by. The graph of
these waits over a closure MUST be acyclic, refused naming the atoms on it. The kernel's loop is not on it:
`integer_type`'s facet fields are typed `integer`, whose facets are empty, and the chain stops.

**As built:** stated without singling out atoms, as rule 1 of the resolution order. Reading a value against a type `T`
waits on `T` being ready, an entry being ready when its declaration has been read, and entries waiting on each other
are refused naming the cycle in wait order (SPEC-FEEDBACK.md #4).

| declaration | waits | verdict |
|---|---|---|
| `uint8 => !integer ^ { min: 0  max: 255 }` | `uint8`'s facets → `integer`'s reader → `integer`'s facets (none) | sound |
| `integer_type.multiple_of: non_negative_integer`, `non_negative_integer => !integer ^ { min: 0 }` | a `multiple_of` value → `non_negative_integer`'s facets → `integer`'s reader | sound: the kernel today |
| `decimal_type.min: number`, `number => !decimal_type {}` | a `min` value → `number`'s facets (none) | sound |
| `integer_type.min?: non_negative_integer`, `non_negative_integer => !integer ^ { min: 0 }` | `non_negative_integer`'s `min` → `non_negative_integer`'s facets | cycle through values: refused |

The last row is admitted by one-level.md's model as stated, since no shape waits on anything. It is the reason this
edge has to be in the model before `value` is retired, and the reason one-level.md's step 2, the kernel fixed-point
proof, is expected to surface it: a model without the edge does not describe how the kernel's own `multiple_of` is read.

**As built: it surfaced.** Typing `integer_size.bits` by `numeric.count` is the last row in the kernel's own
vocabulary. `int64`'s `size` is read against `integer_size`, and `count` refines `int64`, so `count` waits on itself
and the kernel never becomes ready. `bits` is typed `integer`, its being above zero a coherence check
(SPEC-FEEDBACK.md #16). The kernel's measured wait cycle includes `numeric.count` and `numeric.integer_size` for this
reason, closed by pre-loading (SPEC-FEEDBACK.md #4, #15).

**Why an atom may be typed by its own instances.** one-level.md's model ("Which side a facet falls on is mechanical")
separates two closures. `decimal_type`'s *shape* closes on the kernel's `record`, since `min: decimal` is a name and
orders nothing, and `decimal`'s shape closes on it. `decimal`'s *reader* is the constructor's host parser, ready with the
shape, plus the checks from `{}`, none; so a reader for `money => decimal <- { min: 0.00 }` has a closed reader to
read its facet with. The edge above is the reader closure's own ordering, and the chain always stops at a base
instance, which carries no facets. The refused row is the one case where it cannot: an instance's facet typed by that
same instance.

**As built:** the soundness argument holds, as rule 2 of the resolution order: a reference orders nothing, so
`decimal_type => atom & { min?: number }` beside `number => !decimal_type {}` is sound (SPEC-FEEDBACK.md #4). The
first implementation runs the pair only as numeric.tn declares it. A constructor composing a base kind directly makes
a new form, which a processor backs with readers of its own, and it backs the bundled forms alone.

**What it keeps of the invariant.** A shape still never waits on a value. The new edge runs between values, is
acyclic by rule, and is read in dependency order after every shape is closed: an atom's
facets first, then the values read against it. Order independence and termination hold as before.

## `type_argument` goes with `type_ref`

**`type_argument.value`** is an argument to a template's value parameter, `bounded<10>`. Its type is the parameter's,
reached from a `type_argument` only by following the enclosing application's template name to that template's
parameter list, a projection through a reference that nothing in the kernel does and
[`dependent-fields.md`](dependent-fields.md)'s `sibling!` does not do either. It does not need to, because the record it
sits in does not survive: [`reference.md`](reference.md) makes the qualified name with its arguments one grammar and the
value of the kernel's one reference atom, so an open application in resolved output is that reference as written and
`type_ref` and `type_argument` go. An argument is a token inside a reference, typed where materialisation lands it: the
body is read as the constructor's instance, where `min: 10` is a facet read against `integer_type` under the rule above.
Nothing then names `value` in the kernel, and `value_type` goes with the escape hatch rather than surviving at one slot.
**As built:** as argued (SPEC-FEEDBACK.md #12).

## What landed, in order

The edge was stated in the dependency model as the resolution order's rule 1 (SPEC-FEEDBACK.md #4). The kernel's
fixed point was measured against it. Then:
- **The reference atom (step 6)** took `type_argument` with the `type_ref` record (SPEC-FEEDBACK.md #12).
- **Counts (#16)** replaced `non_negative_integer` with `numeric.count`, and found the `bits` cycle above.
- **This step (#17)** came after the kernel and the libraries settled under their maps (step 7). Each atom
  constructor was declared beside its canonical instance in its library, its facets typed by that instance, and
  §7.4's `value`-typed-constraint prose was proposed for deletion.
- **Dependent fields (#21)** retyped the last two `value` slots `type!`, and `value` and `value_type` left the kernel.

## Settled

- **Where the facet edge is stated.** In the dependency model from the start, as the reader closure, since the kernel
  already relies on it; this note keeps the typed-facet consequences and the examples. It is the resolution order's
  rule 1 (SPEC-FEEDBACK.md #4).
- **Facets of container types.** The rule is over every constructed type. An array reader is its element reader plus
  `min_items`, and one-level.md's mechanical rule says a facet is a value read against its field's type without
  mention of atoms; the examples above are atoms only because the kernel's facet chains are.
