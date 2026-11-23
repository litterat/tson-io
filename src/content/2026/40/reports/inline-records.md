---
title: "Inline records: a record written where it is used"
description: "Lets a record body be written at a type slot, as a container already could be. The form already ran in canonical form, so the change is mostly a removal: one parser refusal and one sentence of Part 2. It also covers a parameter inside a record written in place, rules that an abstract record in place is empty, and records three defects found on the way."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Landed in Revision 40; recommendation 5 reversed"
id: "CR-inline-records"
---

# Inline records: a record written where it is used

**Status: recommendations 1 to 4 and 6 of §8 agreed by the author (2026-11-12); recommendation 5 reversed the same
day (§6a). The defects of §6 are being fixed separately. Whether this or the names-only reference
([`names-only-reference.md`](/2026/40/reports/names-only-reference)) goes first is argued in that note's §8.**

- **The proposal:** a record body may be written at a type slot, `at: { x: int32  y: int32 }`, as a container
  already may.
- **The finding:** this is already running in canonical form. A record written in place by hand loads and reads in
  both encodings today (§2). The schema grammar refuses the sugar and one sentence of [TSON-SCHEMA] §5.2 forbids it.
- **So the change is mostly a removal:** one parser refusal and one rule, plus refusals for what a record in place
  cannot be (§3). The model, the kernel, the readers and the resolved form do not change.
- **One part is not small:** a parameter inside a record in place, `page => <T> { meta: { cursor: T } }`, is
  reported as not implemented today (§5).
- **Three defects found on the way** exist now and should be fixed either way (§6).

Probes were run with the first implementation's `tson` command. "Not checked" is listed in §7.

## 1. The rule

A type slot holds a name or a type written in place. A record joins what may be written in place.

```
order => {
  id:    int32
  at:    { x: int32  y: int32 }
  lines: [{ sku: text  qty: int32 }]
  by:    ( text | { name: text  email: text } )
}
```

Resolved form, which is what closing an application in place already writes:

```
at => !meta.record_field { type: { of: !meta.record { fields: {
  x => !meta.record_field { type: int32 }
  y => !meta.record_field { type: int32 }
} } } }
```

**The line stays where inline types drew it.** A record written in place is structural: it has no name, carries no
chain, is a member of nothing, and is named by no tag. Two with equal fields are one type ([TSON-SCHEMA] §8.2).
Declare a record when something else must name it; write it in place otherwise.

## 2. What already runs

Each row is a schema written by hand in canonical form, compiled, and where it loads, read.

| Written | Result today |
|---|---|
| A record in place at a field's type | Loads; reads in TSON and JSON, with errors reported at `/at/y` and `/at/x` |
| At an array's element type and a map's value type | Loads and reads |
| As a choice variant beside `text` | Loads; the choice is disjoint and both variants read |
| Two records in place as the variants of one choice | Refused: not disjoint, and a variant in place has no tag |
| A record in place nested in another | Loads |
| Holding a dependent field | Loads |
| Naming a declared record that holds it (a cycle through a name) | Loads and reads |
| A required `void` field inside it | Refused as uninhabitable, at the enclosing declaration |
| A default that is no value of its field's type | Refused |
| A field group naming a field it lacks | Refused |
| A field naming no type | Refused as an unresolved reference |
| A default on a field typed by one | Refused: a field's value is a token |

So the passes that check a record field by field already reach one written in place, and the diagnostics already
name it by its form (`'{ x: int32  y: int32 }'`). This answers the cost the inline-types note raised in its §8.2.

## 3. What a record in place cannot be

Each line follows from having no name, and each is a refusal. Most already hold.

| It cannot | Because | Today |
|---|---|---|
| Be tagged in data, or be a family member | A tag names an entry | Holds |
| Be a variant of a choice that is not disjoint | The tag would have nothing to name | Holds |
| Carry a `chain`, or be composed or refined | Nothing can name it as a parent | Holds for `chain`; see §4 for `&` and `^` |
| Take parameters | An application names its head | Holds |
| Name itself | Recursion ties to a name | Holds: there is nothing to write |
| Be a map's key type | A key type is a name | Holds |
| Carry a default or a pin at the field it types | A field's value is a token | Holds |
| Be `abstract` | No subtype can exist to instantiate | **Loads today** (§6) |
| State `discriminators` | Dispatch needs members | **Loads today** (§6) |

`FINAL` in place is redundant and harmless. A `name_type` in place is meaningful and stays: it is the profile of
that record's field names.

## 4. The grammar

**The dispatch already exists.** At a declaration's body a brace opens a map when the first token is followed by
`=>` (or begins an application), and a record otherwise. At every other type position the parser today insists on
the map and refuses a record body with a message citing §5.2. The change is to use the declaration's dispatch at a
type position too.

**Where it parses:** wherever a type expression stands and a container may be written: a field's type, a field
group member's type, an array's element, a map's value, a tuple's element, a choice's variant.

**Where it does not,** as for any type written in place: a map's key, an argument, a parameter's bound, an alias's
target.

**Three forms to decide (§8):**

- **`{}` at a type slot.** A declaration `x => {}` is an empty record. At a slot the same reading is consistent; the
  alternative is to refuse it as meaningless.
- **Composition in place,** `at: point & { z: int32 }`. It would absorb `point`'s fields by value and be a member
  of nothing. Recommended: refuse in this step. It reads as inheritance and is not.
- **Refinement in place,** `at: point ^ { x?: = 0 }`. Recommended: refuse, for the same reason.

`!C { … }` at a slot stays refused, as it is for a container.

## 5. Inside an open record

```
page => <T> { items: [T]  meta: { cursor: T  total: int32 } }
```

Today the canonical form of this is reported as not implemented: a parameter standing inside a type written in
place is not substituted. For a container the desugarer avoids the case by writing `[T]` as the application
`meta.array<T>`, which the materialiser constructs when the record is applied. A record has no such spelling.

**Options:**

1. **Substitute into a record in place when the open record is applied.** The materialiser already substitutes
   into an open record's own fields and closes applications in place; a record in place is another field list. This
   delivers the whole feature. Size not measured.
2. **Leave it not implemented in the first step,** so an inline record over a parameter is a gap with a message
   saying to declare the record. Small, and incomplete in the place generics most want it.

**Recommendation:** option 1, measured by a spike before committing. If it is large, deliver in two steps with both
owed, as inline types was.

A record in place that names no parameter, inside an open record, needs nothing: it is closed already.

## 6. Defects found, independent of this proposal

1. **An abstract record in place loads.** `extension: ABSTRACT` on a record in place gives a slot no value can ever
   fill. It should be refused where it is written.
2. **`discriminators` on a record in place loads.** Nothing can be a member.
3. **`chain` or `parameters` on a record in place is refused with an internal message:** "TypeInline rejected the
   value the schema admits: java.lang.IllegalArgumentException". The verdict is right and the text is not.

All three are reachable today by writing canonical form, and become easier to reach once the sugar parses.

## 6a. Ruling: an abstract record in place is empty, not refused (2026-11-12)

The author's rule: if an application can be closed, it loads. `s: shape<circle>` over an abstract open record closes
to an abstract record in place, and the same record written by hand must be treated the same way.

- **It is a legitimate type that is empty.** It has no name, so no schema can add a member. A declared abstract
  record is different: an importing schema can add members, and it loads even as a required field's type.
- **The existing rule for an empty type applies** ([TSON-SCHEMA] §5.10.1): an optional field typed by it loads and
  can only be missing; a required one makes its record unsatisfiable and is refused, as `a: void` is.
- **So defects 1 and 2 of §6 are restated:** the fault is that the inhabitance check does not know an abstract
  record in place is empty. Nothing is refused for being abstract or for stating `discriminators`.
- **§3's last two rows are wrong as written,** and decision 5 of §8 is withdrawn.
- **Separate, and left for later:** `discriminators` on a record that is not abstract loads, declared or in place.

## 7. What it changes, and what was not checked

**Spec:**

- [TSON-SCHEMA] §5.2, *What may be written in place*: a record leaves the list of what MUST be declared, and the
  sentence "the one record in place is the one an application of an open record closes to" goes. Enums, refined
  atoms and namespace types stay declared.
- §4.2, what `of` holds: a record, with the limits of §3.
- §5.3's sugar table: a row for the record body.
- §12.1 and §12.2: `type-expr` admits a record body; the brace disambiguation is stated once for both positions.
- The kernel's `@doc` on `meta.type_inline`, and a re-stamp.
- [TSON-DATA] and [TSON-JSON]: nothing. A record in place is read as any record at a typed position.

**Implementation:** the parser's dispatch and its refusal; the desugarer writing a record body in place; the two
refusals of §6 and the message; §5's substitution. The design notes on the schema grammar and on forms written in
place.

**Corpus:** new valid vectors for each position of §4, invalid ones for each line of §3, and the vectors that pin
today's refusal of a record body at a type position, respelt or removed (not counted).

**Not checked:**

- Bind mode. A record in place binds by the Java component that holds it since inline types; no probe was run here.
- A qualified name entering a field typed by a record in place ([TSON-SCHEMA] §5.12).
- Name hygiene over a record in place's field names.
- Whether any diagnostic that prints a type becomes unreadable with records nested several deep.

**The tension with Revision 40's aim.** This is a second way to write a record that is used once. It is acceptable
because the split is by capability (§3) and because the form already exists: Revision 40 writes it whenever an
application closes in place, and forbidding an author from writing what the resolver writes is the stranger rule.

## 8. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| 1 | Admit a record body at a type slot | Yes |
| 2 | `{}` at a type slot | An empty record, as at a declaration |
| 3 | Composition and refinement in place | Refuse both in this step |
| 4 | A parameter inside a record in place | Substitute when applied; spike first to size it |
| 5 | `abstract` and `discriminators` in place | Refuse, now, whatever else is decided |
| 6 | A nesting limit on types written in place | Leave to the parked limits work; `max_depth` already bounds the source |

## 9. Steps

1. **Fix the three defects of §6** on their own: they are wrong today.
2. **Spike decision 4:** the canonical form of §5 loading and reading, to size the substitution.
3. **Parser and desugarer,** with the spec text and vectors, together.
