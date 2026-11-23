---
title: "Extern: one entry of another schema, under a local name"
description: "Restores a way for a schema to name a type declared by another: order_v1 => !meta.extern { schema: …  type: order }. It is a hop whose identity is the foreign entry's, sealed against derivation, and a value at its position is read under its own schema's names. Records what a throwaway spike found and what the first implementation added."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Landed in Revision 40"
id: "CR-extern"
---

# Extern: one entry of another schema, under a local name

**Status: signed off 2026-11-15 and landed in four steps: the spec text and the schema side, reading in TSON text,
host binding, and the JSON encoding. After them: `schema` as an `iri_reference`, and a schema handed over as
text held in flight under its own identity, so a self-reference is the cycle. The spec text is [TSON-SCHEMA] §5.13 and §7.9, [TSON-JSON] §8.6, and the
changelog's items 114–116. §6 holds what the throwaway spike found; §9 what the
implementation added and what is left.**

- **Ruled, 2026-11-15:** the schema system needs a way to reference an external schema; without one a schema can
  address only the namespace it has. Removing the `!!schema` directive from data stays right. The form is singular,
  and it is a scope change: a foreign value uses the names of its own schema.
- **History:** Revision 38's external forms and the scope push of [TSON-SCHEMA] §7.8 were removed in Revision 39
  (Revision 39 changelog, disposition #6), and an extern was deferred on 2026-11-07. §5 keeps what was tried.

## 1. The form

```
order_v1 => !meta.extern { schema: "https://example.com/order-1.tn"  type: order }
order_v2 => !meta.extern { schema: "https://example.com/order-2.tn"  type: order }
envelope => { id: uuid  body: (order_v1 | order_v2) }
```

```
!envelope { id: …  body: !order_v2 { sku: A  payment: !card { … } } }
```

An extern brings in one entry of another schema under a name the importer chooses. None of the foreign schema's names
enter the importer's namespace, so two schemas that both declare `order` are named side by side. A prefix is a nested
schema map of externs (`v1 => !schema { order => !meta.extern { … } }`), which needs no second constructor.

## 2. The rules

1. **A hop.** `order_v1` is another name for the foreign entry, as an alias is for its target (§8.3), and its
   identity is the foreign entry's: declaring schema and path. Every judgement through it compares by identity, so
   `meta.ref<meta.record>` admits `order_v1` where both schemas hold one kernel. Two names for one type is what an
   alias already gives; nothing here lets one name mean two types.
2. **Where it stands.** A field, element, variant or map-value type, a type argument, an alias target, and a name at
   a reference slot.
3. **Sealed, and absolute.** It takes no `&`, `^` or subtraction, is no constructor or application head, and a
   field typed by it takes no default or pin. A record derived from it would carry inherited fields typed by foreign
   names, and its values would sit half in each scope. No qualified name walks through an extern into the foreign
   namespace (§5.12): a schema that wants another schema's value imports it.
4. **A dependency, loaded with the imports.** An extern is recognised by its written head, `!meta.extern`, so a
   document's externs are found with its imports before any name resolves; a constructor alias (`ext => meta.extern`,
   then `!ext { … }`) is refused. The foreign schema joins the reference closure of §3.4.1 on an import's terms: the
   same schema source and policy ([TSON-DATA] §8.2), one digest per identity across imports and externs, resolved
   first, counted by §11.5's import closure, and listed beside the imports on the linked schema. Three requirements,
   each a resolver error that refuses the importing schema:
   - **Every extern's schema fully loads**: found, verified, resolved and linked, and the named entry found and
     admitted by rule 7.
   - **One kernel.** A kernel the foreign schema's closure holds is the importer's, by identity, so a schema of
     another revision is not externed; the diagnostic names both kernels. A foreign schema that imports nothing holds
     none and is admitted, its forms being the processor's own kernel's (§3.3.1).
   - **No cycle.** The reference relation over imports and externs together is acyclic: a schema reaches itself
     through neither, nor through a mix of the two.
5. **The scope.** A value at a position typed by an extern is read against the foreign type, and every tag,
   annotation and reference name inside its body resolves in the foreign schema's namespace. Scopes nest as values do
   and are total: nothing of the outer namespace is reachable inside. A name means one type throughout a scope.
6. **The boundary tag is the outer scope's.** The tag and annotations written in front of the value belong outside:
   at a choice the tag selects the extern before any scope is known, and `(order_v1 | order_v2)` read the other way is
   `!order` against `!order`. A foreign subtype written at the boundary is brought in by an extern of its own and
   admitted by identity through the hop. A writer names the boundary value by the outer name.
7. **What is named.** A type a value can have, anywhere in the foreign schema's closure: a record, an atom instance,
   an enum, a choice, a named collection, an alias, a declared application, a member of a nested map, another extern.
   Refused, each naming the foreign entry: an open record, an incomplete entry, a constructor, a value entry, a schema
   map, a name the closure does not hold.

## 3. What this form buys, and costs

- **The foreign readers and writers are used as compiled.** Nothing compiles per embedding.
- **A foreign value is spelled as in its own document** and copies between the two unchanged.
- **The data does not show the change.** Only the schema does, so a diagnostic inside a foreign value names its scope.
- **A type name alone no longer identifies a type to a host.** A tree consumer and a binder need the schema with the
  name.
- **Name hygiene is judged per namespace** ([TSON-DATA] §8.3): look-alike names in two scopes are not compared.

## 4. The consumer's case

The HTTP project serves `order-1.tn` and `order-2.tn` side by side (§3.5), both declaring `order`, and its service
description cannot name both: importing both is refused (`'order' is declared by two different schemas`). With two
externs the description names both at its `meta.type_ref` slots. Its three codec requirements are rule 4, plus one
sentence owed where extern is specified: a deployment descriptor has no identity, so no extern names one. It asks for
no pins that disagree across revisions, and gets none.

A layout answers the same case with no new construct, the version in the path (`orders => !schema { v1 => !schema
{ … } }`, one open map across the two documents, §2.2.3). It loads today and is worth a sentence of guidance in
§3.5, but it reaches only schemas whose authors can still choose their names.

## 5. What was tried, and why it lost

- **A sum whose place is a mapping** (`extern_type`, an open sum over a foreign schema). A sum gives a place, and
  references, type slots, choices and `&` take a name. Whoever declares the place must know the foreign schema, and a
  layer such as `service.tn` declares `response?: meta.type_ref` without knowing the description's schemas.
- **A namespace entry** (`v1 => !meta.extern { schema }`, then `v1.order`), with or without a `types` list. Written in
  data, one value has two spellings, `!appeal` alone and `!v1.appeal` embedded, a writer maps identities back to
  paths, and the types two closures share have two paths. Kept as a later convenience over the nested map of §1.
- **Reference slots only.** No data ever holds a foreign value, so nothing changes scope. It is rule 2 with the type
  positions taken out, and it does not let a schema hold a foreign value at all.
- **A `!!schema` directive in the value** (Revision 38). The data chooses its own schema; a directive inside a value
  stays a parse error ([TSON-DATA] §3.3).
- **A type carried in the data** (Protocol Buffers' `Any`, Revision 38's `dynamic`): data-driven, and not coming back.

Prior art for the form taken: an XML Schema element reference into another namespace, and JSON Schema's `$ref` to an
external URI resolved in the referenced document's own base, whose instances carry no tags. Protocol Buffers'
versioned packages (`acme.orders.v1`) are the layout of §4.

## 6. What the spike found

Twenty-six files, 286 lines added, and three new classes; every case below was run. The schema side came out of
existing machinery plus one new fact, a target attached to the entry at link. The data side needed code only at the
boundary: an extern's reader is the foreign schema's own compiled reader.

- **Rules 1 to 4 and 7 hold.** Membership, a choice's distinct variants and its disjointness are judged through the
  hop: `(order_v1 | order_v2)` needs tags, `(o1 | o1b)` over one entry and `(order | o1)` beside an import are one
  type twice and refused. A cycle through an extern is refused by the import-cycle guard, and one digest per identity
  holds across an import and an extern. A schema importing one that declares externs has the extern names and none of
  the foreign ones.
- **Rules 5 and 6 hold**, nested three schemas deep, at a `meta.declared` position and at a `meta.ref` slot inside
  the foreign value. The alternative for rule 6 was reasoned and loses as §2 says.
- **Sealed.** `&`, `-`, `^` and construction were already refused, with misleading reasons, and take one message. An
  alias of an extern, a template argument and a parameter bound work.
- **The resolved form** writes the entry as written and reads back.
- **Forced by the implementation.**
  - The foreign schema must load with the imports, before anything is read through it, so externs are collected
    before resolution, which rule 4's written head gives. The spike loaded it at the end of resolution, too late
    for an annotation read through an extern.
  - Externs are listed apart from imports on the linked schema; a consumer walking dependencies reads both.
  - One binder serves the importer and every foreign schema, so two schemas' `card` collide in bind mode: the
    collision an extern removes from the schema reappears in the host until the binder is told the schema.
- **Left as found.** Judging `of` across the boundary compares by spelling, exact only for one shared kernel. A
  diagnostic inside a foreign value names the foreign schema but continues the importer's schema pointer, and its
  message does not say the scope. A failure loading the foreign schema does not say it came through an extern.
  Annotations in front of the boundary are dropped in bind mode. JSON was assessed, not built: the object's leading
  `$type` is the outer tag and every nested one is foreign.

## 7. Rulings, 2026-11-15

Each is folded into §2; this is the list.

- An external reference is needed; the form is singular and a scope change; `!!schema` in data stays removed.
- The boundary tag is the outer scope's.
- `type` is `text`. It claims nothing false; `meta.type_ref` would claim a name judged in the declaring namespace.
- The foreign schema loads with the imports, and the importing schema is refused unless every extern's schema has
  fully loaded.
- An extern's schema holds the importer's kernel, and externs create no cycle.
- The head is written `!meta.extern`; an alias of the constructor is refused, that being the easier of the two.
- The boundary is absolute: no value entry is brought in and no name walks through an extern.
- A default or pin at an extern-typed field is refused.
- An annotation through an extern is admitted (`@t:value`): §6 admits any type of the namespace, `@t` is the outer
  name, and the value is read by the foreign type.
- §11.5's import closure counts every schema document reachable from one header, by `!!import` or by an extern.
  Revision 38's foreign-schemas limit stays retired: the schema fixes which foreign schemas a document reaches, and
  the data cannot add one.
- Hosts, which is this implementation's API and no part of the spec: a binder is asked by the entry's identity,
  declaring schema and name, a name-only form kept for a caller with one schema; a tree keeps the names as written.

## 8. Spec changes, in outline

- **[TSON-SCHEMA] §9, `meta.tn`**: the entry `meta.extern`. **§4.1, §8.3**: the hop and its identity.
- **§2.2.3, §3.3, §3.4.1**: a namespace is still a document's own entries and its import closure; an extern is one of
  those entries, and its schema joins the reference closure without joining the namespace.
- **§5.3, §5.7–§5.9**: the positions it stands at, and the sealed refusals.
- **§7.2, §7.8**: the scope rule and the boundary tag; §7.8's closing paragraph is replaced. **§8.1**: resolved output
  writes the entry as written. **§11.2, §11.4, §11.5**: source policy, per-scope hygiene, and the import closure counting externs.
- **[TSON-DATA] §3.3, §9.1** and **[TSON-JSON] §3.3, §8.5**: one sentence each; [TSON-JSON] states the `$type` rule of §6.

## 9. What the implementation added, and what is left

**Readings taken while building, each marked [editorial] in the changelog for confirmation.**
- An extern entry takes a fifth kind, EXTERN, from its form, as an alias takes ALIAS. Ruled 2026-11-16: accepted,
  the derived kind being expected to go.
- `schema` was `iri`, which requires a scheme. Ruled 2026-11-16: it is `iri_reference`, as an `!!import` value is.
- A schema declares no value entry of an extern type (`!order_v1 { … }` is refused with the other heads).
- The boundary admits a tag as §7.2 does, by identity: the extern, a name of the enclosing scope reaching the
  target or a subtype of it (an extern of a subtype, or the entry's own name where the scope imports its schema), and
  a variant where the target is a choice. A tag naming the position's own extern is read as no tag.
- A foreign value is part of its document: limits, policies and name hygiene run across the boundary.
- In JSON, where a choice or a declared position selects an extern the selecting `$type` is the boundary's; a
  position whose extern's target is a map is map-typed.

**Left.**
- No JSON writer writes a `$type`, a boundary's included (it predates the extern).
- In TSON text, a root typed by an extern and an extern reached through an alias of a container write no boundary
  tag.
- A tag naming an extern at a position no extern types is refused in both encodings, where §8.3 admits it.
- A map key typed by an extern reports outside the foreign scope in JSON.
- The import closure limit is counted by nothing yet, externs included.

**For the HTTP consumer.** Nothing must change. `TsonLinkedSchema.dependencies()` lists imports and externs'
schemas; walking `schema().imports()` alone misses an extern's schema. One bind context now binds two versions that
both declare `order`, the binder asked by declaring schema and name (`DataNameBinder.byNamespace`).
