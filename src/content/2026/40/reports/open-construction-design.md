---
title: "Open construction"
description: "One operation in place of record refinement: construct a constructor from a base with data. !C ^ { … } with a required field absent declares an incomplete entry, which a later application completes into the plain construction. ^ follows !name and takes values, & is the only way to derive a record, and the kernel's enum and set become incomplete entries."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Landed in Revision 40"
id: "CR-open-construction"
---

# Open construction: design for sign-off

**Status:** for sign-off, 2026-11-14; §6's points answered the same day. Nothing is built but the throwaway spike (`refine-and-compose.md` §14, the
working record this note is drawn from). No vector or implementation starts before sign-off.

## 1. The rule

**One operation.** Construct the constructor `C` from a base `B` with data `D`. `B` is nothing, or an entry `C`
built. The result's body is `B`'s with `D` merged, and its tag is always `C`. `^` never makes a constructor; `&` is
the only thing that does.

| Operation | Written | Result | IS-A |
|---|---|---|---|
| Construction | `!C { … }`, every required field | a type | none |
| Construction left open | `!C ^ { … }`, a required field absent | an incomplete entry | none |
| Refinement of a type | `!T ^ { … }` | a type | `T` and its chain |
| Refinement of an incomplete entry | `!X ^ { … }`, fields `X` has not written, a required one left absent | an incomplete entry | none |
| Completion | `!X { … }`, `!X value`, `X<A …>`, every required field `X` lacks, among fields `X` has not written | a type, `!C { merged }` | none |

**An incomplete entry** is an entry `C` built with a required field of `C` absent. Completeness is derived from the
fields, never marked.

- It is a base for `^` and a head to complete, and nothing else. It is refused wherever a type is named: a field's
  type, a variant, an argument, a bound, an operand of `&`, the `of` of a `meta.ref`, a tag in data.
- It has no IS-A, and a completion carries no chain: `tags => nonempty<text>` is
  `!meta.array { element_type: text  min_items: 1 }` and equal to that construction written anywhere.
- **A field is written once.** A refinement or a completion of an incomplete entry writes only fields the entry has
  not written; one written again is refused, whatever the value. A constructor is its own empty incomplete entry, so
  rows two and four are one rule, and a required field may be written by `^` so long as one stays absent
  (`!meta.map ^ { key_type: text }`, then `!that ^ { max_items: 9 }`, then `that<int32>`).
- Each field written is read against its own type where it is written. Required fields, defaults and coherence
  across fields are checked where the entry is closed, and the refusal is reported there:
  `array_min => !meta.array ^ { min_items: 10 }`, `max_things => !array_min ^ { max_items: 5 }` load, and
  `max_things<text>` is refused, `min_items` 10 above `max_items` 5.
- `^` keeps what its base is, so `!enum ^ { members: [A B] }` is refused (it would close the entry), and
  `!meta.array ^ { … }` writing every required field is refused (nothing is left open).
- `!x value` (§5.6's positional form, any value not in braces: `!x [ … ]`, `!x text`) completes only where exactly
  one required field is absent, the value being that field's. `x<A …>` fills
  the absent type slots in the constructor's declared order.

**Over a type, a written value moves by its facet's kind** (§5.7's seven kinds), for every constructor and not the
atom families alone: `!tags ^ { min_items: 2 }`. For the collections: bounds move inward, `ordered` and a type slot
are restated only, `unique_items` goes to true only, `voidable` to false only. So narrowing is a relation between
types, and an incomplete entry only accumulates.

**The resolved form holds complete entries only.** An incomplete entry resolves to no value, so the schema value has
no entry for it and resolver output does not write it; nor an alias of one. Nothing dangles, since every use closes
to a plain construction. A partial form is never output. What the processor holds for importers is §2.

**There is no record `^`** (§11, which replaces what this paragraph first said: refused over a constructor only).

## 2. Where a processor holds it (investigated, not built)

Everything that crosses an import travels in the namespace a linked schema holds: the two import merges (resolver
and linker), the collision rule by origin, key annotations, facts, the kernel's names, alias hops. That namespace is
already wider than resolver output, which is the document's own entries projected from it.

- **Recommended: the incomplete entry is in that namespace, and the projection leaves it out.** It is a fourth case
  of the entry type, holding the constructor, the absent fields and the parsed node, opaque to the model as a held
  dependent value already is. Imports, collisions, `@doc`, aliases and "is no type" diagnostics then need nothing new.
  The cost is one arm in each of the eight switches over an entry, which the compiler finds, and one line where a
  schema map is written. The spike ran this way.
- **Not recommended: a second map beside the entries.** The namespace stays the schema value, but both merges, the
  collision rule across two maps, origins, key annotations and alias targets are each done twice.
- **The node, not a tree.** A tree loses a token's form and a name comes back quoted.
- **Reading each field where it is written puts `meta.identifier_ref` on the kernel's wait cycle,** `enum` writing a
  value at `name_type`. It joins the hand-built set, and §3.4.1's measured cycle grows by one. Reading only at the
  closure avoids that and is refused: a published entry could then carry a field no completion can use.
- **The corpus's runner contract** gains one sentence: an expected resolved form lists complete entries.

## 3. The kernel

```
set_type  => !meta.array ^ { voidable: false  ordered: false  unique_items: true }
enum      => !meta.enum_type ^ { name_type: meta.identifier }
namespace => meta.map & { key_type: meta.identifier_ref  voidable?: = false }
```

`meta.set_type` and `enum` stop being constructors. `meta.namespace` narrows a slot's declared type, which is a new
constructor, so it is `&`. No rename of `meta.array` or `meta.map`: nothing in the spike wanted a named top.

## 4. What goes

- The fallback lookup for a refined constructor's class and the fact recorded for it.
- The reader registry's entries for `meta.set_type` and `enum`, and the bootstrap's two cases.
- From the spike's own design: the read rule for a body lacking required fields, a fourth kind of entry, a chain on
  completions.

## 5. What is lost

| Today | After | Replacement |
|---|---|---|
| `a: enum`, a field holding an enum type over identifiers | `enum` is no type | `a: meta.enum_type`, any name type |
| `meta.set_type & { … }` | no refined constructor | `meta.array & { … }`, restating three pins |
| `!meta.ref { of: meta.set_type }`, the kind of sets | a set is an array with two facets | `of: meta.array`, wider; no narrower one |
| A set's `voidable: false` as a pin | a written facet | none needed: it held only through `meta.set_type` |
| `minlist => meta.array ^ { min_items?: = 1 }` | refused | `!meta.array ^ { min_items: 1 }`, or `&` for a constructor |
| A resolved form lists every name its source offers | incomplete entries are the source's | the source |

Resolved forms change: `!enum { … }` is written `!meta.enum_type { name_type: meta.identifier … }`, `!meta.set_type
{ … }` is written `!meta.array { …  ordered: false  unique_items: true }`, and `enum`, `set`, `meta.set_type` leave
`meta-resolved.tn`.

## 6. Settled at sign-off (2026-11-14)

1. **Over an incomplete entry nothing is replaced.** `!array_min ^ { min_items: 5 }` and `{ min_items: 12 }` are both
   refused under a written 10: a field is written once, and the closure checks the whole. To narrow, complete it and
   refine the type.
2. **The one rule covers required fields too.** There is no separate rule that a refinement never writes a required
   field; it writes any unwritten field and leaves one required field absent.
3. **An alias of an incomplete entry is allowed** (`set => meta.set_type`), and is not written in the resolved form.
4. **An incomplete entry is imported like any entry.**
5. **Step 1 is first.**

## 7. Steps

Each changes the corpus and the implementation together, carrying its vectors and its spec text.

| Step | What | Depends on |
|---|---|---|
| 1 | `meta.namespace` to `&`. Measured: no code change, 319 and 799 vectors pass | nothing |
| 2 | Incomplete entries in the resolver, held beside the schema value: `!C ^ { … }`, refinement, completion, the collection facets' kinds, refinement of a collection type, the refusals at every position a type is named | sign-off |
| 3 | The kernel: `set_type` and `enum` as incomplete entries; the lookup and its fact removed; fixtures | 2 |
| 4 | Record `^` removed (§11): `refined-def` leaves the grammar, every record refinement is re-spelled `&` | 3 |
| 5 | Part 2 read end to end against the rule: §5.5, §5.7, §5.10, §7.5, §8.1, §9, §12, and the changelog | 4 |

The first is step 1, which stands alone.

## 8. Not in this

- Renaming `meta.array` and `meta.map`, and named tops.
- `!X { … }` reading two ways by what `X` is: a completion, or a value entry.
- Entries beside `record`, `tuple`, `choice` and `ref`.
- `<E: set>` loading where `<E: enum>` is refused, a defect of today that step 3 removes with `meta.set_type`.

## 9. The spike

The spike keeps a chain switch and writes the entry in the resolved form, both dropped here, so step 2 is written fresh with
its merge and its refusals as reference.

## 10. The completion annotation (added 2026-11-15, signed off with step 3)

An incomplete entry stays out of the resolved form and has no IS-A. What it leaves behind is one derived annotation
on the key of an entry declared as a completion, beside `@meta.application`:

```
bounded => !meta.array ^ { min_items: 2 }
capped  => !bounded ^ { max_items: 5 }
tags    => capped<text>
```
```
@meta.completion:{ of: [capped bounded] }
tags => !meta.array { element_type: text  min_items: 2  max_items: 5 }
```

- `of` lists the incomplete entries the completion closed, nearest first, each by its own name past alias hops
  (`!set text` lists `meta.set_type`). The constructor is not listed: the value's tag states it.
- The names are plain names, not references: the entries are not in the document, so nothing judges them at link.
- Derived and never written: an author's `@meta.completion` is a resolver error, as `@meta.application` is. Read as
  stated when a resolved form is read.
- The value is untouched, so a completion still equals the construction written directly. A completion written in
  place has no key and carries none. A refinement of a completed type carries none: its chain states what it is.
- Nothing reads it after resolution. It is the record that the entry came through an incomplete one, which the
  resolved form otherwise cannot show. §8.1's "nothing else records provenance" changes to say so.

## 11. No record `^` (added 2026-11-15, signed off the same day)

**The operator decides the body.** `^` always follows `!name` and its body is values; it never declares a record or
a constructor. `&` always follows a bare name and its body is field definitions; it is the only way to derive a
record, and so the only way to make a constructor.

| Intent | Revision 39 | Revision 40 |
|---|---|---|
| Narrow a record's fields | `employee => person ^ { age: adult  country: = "AU" }` | `employee => person & { age: adult  country: = "AU" }` |
| Nominal subtype of a record | `vip => person ^ {}` | `vip => person & {}` |
| Partly filled constructor | `minlist => meta.array ^ { min_items?: = 1 }` | `minlist => !meta.array ^ { min_items: 1 }` |
| New constructor | `meta.map ^ { … }` or `&` | `meta.map & { … }` only |

- `refined-def` leaves the grammar, so a bare `name ^ {` is a parse error, for a record and a constructor alike.
- `!person ^ { … }` over a record is refused, naming `person & { … }`: a record takes no `^`, as a tuple or a choice
  takes none.
- A restated field in an `&` body follows the rules it followed in a refinement body. They are unchanged.
- **Lost:** `^` refused a new field and `&` does not, so `person & { agee: adult }` adds a field where
  `person ^ { agee: adult }` was refused. A modifier-only entry naming no inherited field is still refused. No
  replacement.
