---
title: "The reference: one syntax, one value"
description: "Step 6 of One Level: one grammar for a qualified name with its arguments, written wherever a type is named, and that grammar the value of a single kernel reference atom. kind_type, ref_type and the type_argument record go, leaving meta.ref<T> as the one spelling; in data the argument list is written unquoted rather than quoted as first proposed."
against: "TSON 2026 Revision 38 (Working Draft)"
status: "Landed in Revision 39, its data spelling changed"
id: "CR-reference"
---

# The reference: one syntax, one value

**Status: landed in Revision 39, its data spelling changed.**
- **Proposed:** step 6 of [`one-level.md`](/2026/38/reports/one-level)'s order of work. One grammar for a qualified name with its
  arguments, written wherever a type is named, and that grammar the value of one kernel reference atom, so that
  `kind_type`, `ref_type`, `type_ref` and `type_argument` go.
- **What happened:** the grammar and the one atom landed. `kind_type`, `ref_type`, `kind` and the `type_argument`
  record are gone, and `meta.ref<T>` is the one spelling. The kernel's atom is `meta.reference_type`, with `of` typed
  `meta.type_ref` and an `allow_sibling` facet for dependent fields. The data spelling differs from this note's: an
  argument list is written unquoted in data, parsed by a reference production that moved into the data grammar
  with the lexer unchanged. The quoted spelling chosen below was dropped ("In data"). Names resolve from the root,
  not by the lexical scope this note assumed.
- **Where:** [TSON-SCHEMA] §4.1, §4.2, §5.10, §5.12, §8.1, §8.2, §12.1, §12.3; [TSON-DATA] §4, §7.2.5, §7.4, §7.5.
  [SPEC-FEEDBACK.md #11](/2026/38/reports/implementation-feedback) (one atom, one spelling), [#12](/2026/38/reports/implementation-feedback) (an application is
  a reference value), [#13](/2026/38/reports/implementation-feedback) (a reference in data is grammar), [#14](/2026/38/reports/implementation-feedback)
  (qualified names and tags, resolved from the root), [#21](/2026/38/reports/implementation-feedback) (`allow_sibling`) and
  [#22](/2026/38/reports/implementation-feedback) (`type-ref` names a reference, `type-expr` an expression).

[`one-level.md`](/2026/38/reports/one-level)'s "The reference atom" is the measured argument that `kind_type`, `ref_type` and
`type_ref` are one atom, kept apart only by the ladder's two stores. This note is the syntax that argument stops short
of: the qualified name, with its arguments, is one grammar wherever a type is named, and that grammar is the atom's
value. [`kernel-namespace.md`](/2026/38/reports/kernel-namespace) depends on it (qualified names at type positions, qualified tags in
data), and [`typed-facets.md`](/2026/38/reports/typed-facets) and [`dependent-fields.md`](/2026/38/reports/dependent-fields) lose their last
`value`-typed slot to it.

## The problem

Revision 38 names a type in five spellings, each with its own grammar and its own home:

| where | spelling | grammar | holds |
|---|---|---|---|
| a type position in a schema | `text`, `result<T>` | `type-name = identifier`, `supertype-ref`, `type-args` (§12.1) | a name, or a head with arguments |
| a tag in data | `!order` | `type-ref = "!" identifier` ([TSON-DATA] §7.4) | one segment |
| a `kind<T>`-typed slot | `order` | one segment, judged a member (§4.2) | a type's name |
| a `ref<T>`-typed slot | `orders.place_order` | one token, parsed into segments by the slot (§5.12) | a value's name |
| resolved output, open applications | `{ name: result  arguments: [{ name: T }] }` | the `type_ref` and `type_argument` records (§8.1) | an application as data |

All five describe a location in the namespace. The first four are text a position parses; the fifth is the same text
taken apart into a record so that a value argument has somewhere to sit, and that somewhere is the one slot in the
kernel still typed `value` once facets and defaults are typed. The records exist because a qualified name had no grammar
of its own to be a value in.

## The proposal

**One grammar.** A **reference** is segments joined by `.`, optionally followed by an argument list:

```
reference = segment *("." segment) [ws "<" ws arguments ws ">"]
segment   = identifier                      ; [TSON-DATA] §7.7, each segment NFC
arguments = argument *(ws1 argument)        ; positional, against the head's parameters
argument  = reference / token               ; a type argument, or a value argument
```

It is written at every position that names a type, as the tag of a value in data, and as the value of a reference-typed
slot. The three are the same grammar read at three positions, and a position may admit fewer forms (a tag admits no
arguments, say) without admitting a different set of names.

**As built:** the production is [TSON-DATA] §7.4's `reference = qualified-name "<" ws type-args ws ">"`, with `<`
adjacent to the name (§7.5) and arguments separated by whitespace or a comma, as §12.1's are. A qualified name is one
unquoted token, `.` being a token character, and a quoted token is never a reference (SPEC-FEEDBACK.md #13).

**One value.** The kernel's atom, as one-level.md sketched it:

```
reference => atom & { of: type_name }    -- values are references; the referent IS-A `of`
kind      => <T> reference <- { of: T }
ref       => <T> reference <- { of: T }  -- the two may be one; one-level.md's open item
```

**As built:** one spelling, and `of` is a reference itself, so a qualified name can stand there:

```
reference_type => meta.atom & { of: meta.type_ref  allow_sibling?: boolean ~ true }
ref            => <T> !meta.reference_type { of: T  allow_sibling: false }
field_type_ref => !meta.reference_type { of: meta.type }
type_ref       => !meta.field_type_ref ^ { allow_sibling: false }
```

There is no `kind`: what `of` names decides what a slot holds. A constructor, `top` or anything IS-A them, and the
slot holds type names. Any other type, and it holds value names. A second spelling would say nothing the first does
not (SPEC-FEEDBACK.md #11). The atom was first declared `reference`. It was renamed `reference_type` when dependent
fields gave it `allow_sibling`, a permission true only at a record field's type, where a sibling reference `kind!` may
stand (SPEC-FEEDBACK.md #21). `<-` is `construction-operator.md`'s spelling, which was
dropped. `!T { … }` is the spelling throughout.

Its values are the grammar above, so `type_ref` and `type_argument` go. An open alias's `target`, a record template's
`chain.parents` and the `application` annotation are reference-typed slots holding `result<T>` as written, and a
template parameter standing in an argument is the parameter's name as a segment, as it is anywhere else in a record
template (§5.10's three places). A closed application still lifts to a minted entry and is named bare where it stands
(§5.3), so a resolved form carries arguments only where an application is still open, as today. **As built:** those
three slots are typed `meta.type_ref`, and the name `type_ref` now belongs to that reference atom instance, not to
the retired record (SPEC-FEEDBACK.md #12).

**Arguments are typed where they land, not where they are written.** A type argument is a reference and is judged as
the parameter's `bound` says. A value argument is a token, and its type is the parameter's, reached only through the
head's parameter list; nothing reads it there. Materialisation substitutes it into the body and the body is read as the
constructor's instance, where `min: 10` is a facet read against `integer_type` under the dependency model's facet rule.
That is the rule the kernel already applies to a held body's tokens (§5.10), and it is why `type_argument.value` never
needed a type: an argument is a token in a reference, and the reference is syntax until it is applied. Nothing is held;
a reference is written. **As built:** as stated, `maxint<10>` closing to `!numeric.integer_type { max: 10 }`; an
argument's channel (filed as a reference or as a value) is no part of the reference's identity (SPEC-FEEDBACK.md #12).

## Where it stands

| position | reads the reference as | arguments |
|---|---|---|
| a field type, element, key, value, variant, parameter bound | a type | an application, lifted when closed |
| the left operand of `<-`, an operand of `&` or `^` | a type or constructor | an application (`maxint<10>`, `result<T> & { … }`) |
| the right operand of `<-` | a type of the same constructor | an application |
| `of` on the atom | a type or constructor | none |
| a `!` tag in data and in resolved output | a type | none: `!meta.record`, `!order` |
| the value of a `kind<T>` or `ref<T>` slot | a type or a value, judged IS-A `of` | by the slot's rule, below |

**As built:** the `<-` rows are the `!` head and the `^` source, `<-` having been dropped. The last row is a
`meta.ref<T>` slot. A record field's type may also hold a sibling reference (SPEC-FEEDBACK.md #21).

**The walk.** The first segment resolves in the one namespace, innermost `!schema` map outward then imports
(kernel-namespace.md's lexical scope); each further segment selects inside what the name has reached: an entry of a
`!schema` map, a key of a namespace value, a field of a record. The referent is found first and judged after (§5.12),
never chosen among candidates, and the judgement is the slot's: an `of` in the `type` family makes the slot a type
reference, delivered as a type with structural identity; any other `of` names a value. Both are one-level.md's.

**As built:** there is no lexical scope. The first segment names an entry of the document's root namespace, its own
root entries and its import closure, and inside a nested map a sibling is written by its path. The rest of the walk is
as stated (SPEC-FEEDBACK.md #14).

**Qualified tags.** `!meta.record { … }` in a resolved form, or `!orders.place_order` in data, is the grammar at the tag
position. [TSON-DATA] §7.4's `type-ref = "!" identifier` becomes `"!" reference` with no arguments, and §7.7 is
untouched: the identifier grammar applies per segment, and `.` is already a token character. A schemaless read
(TSON-DATA §4) leaves a dotted tag as it leaves any tag it cannot resolve, unresolved and preserved; it does not refuse
one. **As built:** as stated, the production `"!" qualified-name`. An annotation's name became a qualified name too,
`"@" qualified-name` (`@atom.ordering:TOTAL`, `@meta.disjoint`), on the same terms (SPEC-FEEDBACK.md #14, #15).

## Identity

§8.2 compares the parsed form and never the text, and this grammar is what "parsed form" means for a reference: the
segments, the head's resolved entry, the arguments as references or tokens. Whitespace inside an argument list is free;
`result<T>` and `result< T >` are one reference, and two spellings of one application reduce to one minted entry as
they do today. A reference's canonical text, the one resolved output writes, has no whitespace and arguments separated
by a single space. **As built:** as stated, with a trailing comma also free (`box< text, >` and `box<text>` close to one
entry) and a nested argument compared as the entry it closed to (SPEC-FEEDBACK.md #12).

## In data

The note's reasoning, as first written: a reference carrying arguments is not one token. `<` is a special character
reserved by [TSON-SCHEMA] ([TSON-DATA] §7.2.5), so `t: list<text>` in a data document lexes as four tokens and is a parse
error, as it is in Revision 38. Where a data value must name an applied type, two spellings were weighed and the first
chosen:
- **quoted:** `t: "list<text>"`, the slot's type parsing the text as §5.12 already parses a qualified name out of one
  token. Resolved output would take this form wherever an open application survives (`target: "result<T>"`), as a
  template body is text in Revision 38. Chosen because it needs no Part 1 change and the resolver already owns the
  parse.
- **lexical:** admit `<`…`>` into a token when adjacent to a name. A Part 1 lexer change for a form that no bundled
  output carries and data rarely needs; declined.

**As built: neither.** The quoted spelling lost on a reading problem. A quoted token would be text or a reference by
its shape, so a held body's text literal that happens to parse as an application (`pattern: "box<T>"`) would be read
as one. What replaced it keeps the lexer untouched and moves the grammar instead. `<` and `>` join `!` and `@` as
special characters with a role in data (§7.2.5), each already a single-character token, and the parser assembles
`qualified-name "<" type-args ">"` into one reference value. Under one level a `!T { … }` body is data read against
`T`, the schema document itself included. So anything that can stand in one has to be data grammar, and the reference
production [TSON-SCHEMA] §12.1 already had was the one data needed. An open application is written unquoted
everywhere: `!alias { target: result<T> }`, `parents: [result<T>]`, `@meta.application:response<order 201>`. A
schemaless read keeps it as a structured value, head and arguments, resolving nothing. A Class 1 processor no longer
refuses one. JSON, which has no unquoted form, carries the same text in a string, read by the same production
(SPEC-FEEDBACK.md #13).

A reference without arguments stays one unquoted token in data, as every kind and reference value was in Revision 38.

## Settled and open

- **One spelling or two.** Settled: one, `meta.ref<T>`. This note left it deferred. A one-segment restriction could
  not be the difference, since a type-name slot must admit `geo.address` once libraries make room with sub-namespaces,
  and the remaining candidate difference was that a `ref<T>` points at another definition where a `kind<T>` slot
  takes the name as its value. Revision 39 drops the distinction: `of` decides (SPEC-FEEDBACK.md #11).
- **Arguments in a data value.** Settled: a slot typed by a reference over a constructor may name an applied type,
  written unquoted (`t: set<text>`). It resolves by structural identity against the applications the closure closed.
  Data never creates one, so an application nothing in the closure closed names no type and is refused
  (SPEC-FEEDBACK.md #12).
- **Value arguments.** Open: whether a value argument may be any token, or only those §12.1's `value-literal` admits
  (SPEC-FEEDBACK.md #13).
- **Diagnostics.** A reference that fails names the segment that failed and what the previous segment reached. The
  first implementation's value walk reports this way; the spec states no rule for it.
