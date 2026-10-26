# Extension meta-schemas

Part 2 §2.2.2, §2.2.3, §4.1, §4.2, §5.12, §6, §9, condensed — for the document that declares vocabulary of
its own, such as an HTTP service's methods and the routes bound to them. The quoted diagnostics are the Java
implementation's.

## When you are writing one

A user schema declares types. A meta-schema declares the **vocabulary** user schemas are written in: the
things that stand after `!`. You are writing one when a schema needs to hold entries that are *not types* —
an interface's methods, a service's routes — and those entries name types (`request: order`) or other such
entries (`method: orders.place_order`) that must be checked when the schema loads. If no entry is anything
but a type, an ordinary schema with `&`, `^` and templates is enough, and better.

Two things are meta-schema-only, each a resolver error anywhere else: a **constructor** (an entry that IS-A
`top`), **namespace types** included; and a **reference**, `ref<T>`, since core declares no `ref`.

## The header

```
!!id:"https://example.com/2026/38/meta-svc-1.tn"
!!meta:"https://tson.io/2026/38/m/meta-kernel.tn"
!!import:"https://tson.io/2026/38/m/meta.tn"
```

`!!meta` is the **kernel**, not `meta.tn`: only a schema whose own `!!meta` names the meta-kernel may declare
an entry that IS-A `top`, so an extension is a *sibling* of `meta.tn`, and imports it for the vocabulary its
own declarations use. Imports are transitive (§2.2.3), so the kernel's entries arrive too: **inside a
meta-schema the kernel's types are ordinary field types** — `identifier`, `text`, `boolean`, `integer`,
`type_kind`, `kind<record>`, `ref<T>` all resolve as written. The SKILL.md rule "kernel types are only `!`
targets, import core for field types" is about *user* schemas.

**An import stands at the importer's level.** A meta-schema is kernel-governed and may import only
kernel-governed schemas — `meta.tn`, another meta layer — never `core.tn`, `net.tn` or a user schema: *"an
!!import stands at the importer's governing level, both schemas naming meta-kernel.tn as their !!meta or
neither"*. So
declare the small types your vocabulary needs (`status_code => !integer ^ { min: 100  max: 599 }`) beside it.

The schemas *governed* by your extension name it in their `!!meta` and import core — and the user schemas
whose types they name — at their own, ordinary level.

## Entries that are not types: namespace types

```
method_name => identifier
http_verb   => !enum [GET POST PUT PATCH DELETE]
status_code => !integer ^ { min: 100  max: 599 }
method      => { request?: kind<record>  response?: type_kind  errors?: [kind<record>] }
interface   => namespace & { key_type: = method_name  value_type: = method }
binding     => { method: ref<method>  verb: http_verb  route: text  status?: status_code ~ 200 }
bindings    => namespace & { key_type: = identifier  value_type: = binding }
```

The kernel's `namespace => abstract top & { key_type: identifier_kind  value_type: type_kind  ordered?:
boolean ~ false }` is the constructor whose instances are **maps keyed by names**; the schema map and a
record's `fields` are the kernel's own two. A namespace type pins `value_type` (`= V`) and pins `key_type`
(`= K`, an identifier family) or states it by default (`key_type?: ~ K`); one that leaves either open is
refused (*"'things' is a namespace type, so a value of it is a map, and it leaves its 'key_type' or
'value_type' open"*). `method` and `binding` are ordinary records, the shapes the map's values have.

A governed schema holds a **value** of a namespace type as an entry, written and read as the map it
describes:

```
orders => !interface {
  place_order  => { request: place_order_request  response: order  errors: [problem] }
  cancel_order => { request: order_ref }
}
routes => !bindings {
  post_orders => { method: orders.place_order  verb: POST  route: "/orders"  status: 201 }
}
```

Such an entry is a value and **never a type**: naming it where a type is expected — `x => { s: orders }`,
`response: orders` — is a resolver error. Each key of its map is a name under `key_type`, and each value is
ordinary data of the record type, validated against it. There is no `data` kind for
one-entry-per-operation designs (`operation => data & { … }`): group the entries under a namespace type.

## Slots that name types: kinds

A field whose value is the *name of a type* is typed by a **kind**: `type_kind` (any type a value can have),
`kind<record>` (record types only), `kind<uuid_type>`, and so on. The value is one bare name, judged at link
a member of the kind: `request: user_id`, where `user_id` is a uuid instance, is refused as no member of
`kind<record>`, and so is a constructor (`response: record`). A kind admits abstract records and record-template bases, but naming a record template
there is refused as open — name a declared application (`bt => box<int32>`, then `request: bt`).

In a value body a kind-typed slot holds **one bare name** and nothing else: nothing lifts or mints there, so
an application written in braces (`request: { name: page  arguments: [ { name: order } ] }`) is refused.
Give the application a name in the governed schema, `order_page => page<order>`, and write `request:
order_page`.

Do not type such a slot `type_name` or `text` — a bare token the resolver treats as data, so an unresolved
name loads clean — nor `type_ref`, which is for a slot that holds an *application* and is rarely what a
vocabulary wants. §9's guidance: **a slot that names a type is typed by a kind, a slot that names a value by
a reference, and `type_ref` is for a slot that holds an application.**

## Slots that name values: references and qualified names

`ref<T>` (`ref => <T> !ref_type { of: T }`) holds a **qualified name** of a value whose type is `T` or IS-A
it: segments joined by `.`, the first an entry of the writer's namespace (imports included), each further one
a key of a namespace value or a field of a record value. Every hop is written; there is no index (`[0]`), no
quoted segment, and no entry into a map that is no namespace. The referent is found first and judged after,
its type before its value. `T` names a type, never a constructor: `ref<record>` is refused at the
declaration — *"the names of the types built with a constructor are a kind: write kind<record>"*.

| Written at `method: ref<method>` | Result |
|---|---|
| `orders.place_order` | accepted: `orders` is an `interface` entry, `place_order` a key, the value a `method` |
| `orders` | refused: an `interface` value, where a `method` is wanted |
| `orders.cancel_order` (no such key) | refused: the keys are listed |
| `orders.place_order.nope` | refused: a `method` value has no field `nope` |
| `place_order` | refused: no entry `place_order`; a member is reached through its entry |
| `place_order_request` | refused: a record type, where a `method` value is wanted |

**The slot declares the spelling**: a slot typed `ref<method>` holds a name and nothing else, a slot typed
`method` holds the value inline. A reference reaches no data document — there a bare token at a record
position fills the record's positional field, as always.

## Constructors

There is **no constructor marker**. An entry is a constructor exactly when it is `top` or IS-A it — when its
chain reaches `type`, a base kind (`atom`, `product`, `sum`) or `namespace` — and the gate is §2.2.2's
placement rule: only a schema governed by the meta-kernel may declare one. A new atom family is the classic
case:

```
currency_type => atom & atom_specification & { spec?: = "https://www.iso.org/iso-4217-currency-codes.html" }
```

A meta-schema cannot construct an instance of a constructor it declares (its `!` heads resolve in the
kernel), so `currency => !currency_type {}` lives in a library the meta governs.

Rules that bite:

- **Kind.** A constructor reaches exactly one of `atom`, `product`, `sum` or `namespace` through its chain.
  None → `PRODUCT`; two → error. `!C {}` inherits `C`'s kind. There is no `data` kind.
- **Abstract roots.** `top`, `type`, the base kinds and `namespace` are `abstract`: `!atom {}` or
  `!namespace {}` is refused, naming the subtypes that would satisfy it. An annotation typed by one
  (`@type`) is a schema error.
- **Mixing operands is free.** A base kind seeds the kind and plain records lend vocabulary, as the kernel's
  `iri_type => text_type & atom_specification & { … }` does. Shared fields go in an ordinary record composed
  into each constructor.
- **`chain` is the kernel's.** `type`'s one field is `chain`, computed by the resolver; a constructor
  declaring a field of that name is refused, and no declaration writes one.
- **Tightening in the body.** A body field matching an inherited one is a tightening along §5.7's three
  orders (elided type allowed); keep the `?` on the name when pinning an optional field, or the pin becomes
  a marker every instance must write.
- **Parameters.** A constructor's parameters follow the ordinary template rules: each takes its type from the
  slot it stands in (a `type_kind` slot makes a type parameter, an atom-typed slot a value parameter).
  Prefer a kind-typed slot the application fills over a type parameter.
- **Bodies are closed.** An application whose payload names a field the constructor does not declare is a
  resolver error naming the member and the real fields (§5.5).

## Annotations for the schemas you govern

Annotations resolve one hop against a document's governing target (§6) — for a schema governed by your
extension, that is *your* namespace: your declarations plus `meta.tn`'s and the kernel's through the import.
So `@doc`, a bare `@deprecated` and `@comment:"…"` already work in governed schemas, and you add your own the
same way `meta.tn` does — a lifecycle annotation such as `since => @annotation text`, which meta does not
declare, belongs here:

```
since    => @annotation text
audience => @annotation text
```
```
@since:"2.1"
@doc:"The order service."
orders => !interface { place_order => { request: place_order_request  response: order } }
```

Written before the entry's name, the annotation is metadata about the declaration; after `=>` it annotates
the value. Both are kept; they are not the same place. A governed schema cannot declare annotations for
itself — only the meta can.

## What a governed schema looks like

```
!!id:"https://schemas.example.com/2026/38/app/orders-api-1.tn"
!!meta:"https://example.com/2026/38/meta-svc-1.tn"
!!import:"https://schemas.example.com/2026/38/app/order-1.tn"
!!import:"https://tson.io/2026/38/m/core.tn"
{
  @since:"2.1"
  @doc:"The order service."
  orders => !interface {
    place_order  => { request: place_order_request  response: order  errors: [problem] }
    cancel_order => { request: order_ref }
  }
  routes => !bindings {
    post_orders => { method: orders.place_order  verb: POST  route: "/orders"  status: 201 }
  }
}
```

The entry name is the interface's identity, in the type-name namespace with its collision rule — two
entries cannot quietly share a name, and an entry cannot reuse a type's. `order` resolves through the
import, `orders.place_order` through the entry above it, or the schema fails to load, which is the property
the arrangement exists for.

## Pitfalls specific to meta-schemas

| You wrote | Problem | Write instead |
|---|---|---|
| `!!meta:"…/m/meta.tn"` with a constructor or namespace type | an entry that IS-A `top` needs the meta-kernel as governing target | `!!meta:"…/m/meta-kernel.tn"` + `!!import:"…/m/meta.tn"` |
| `!!import:"…/m/core.tn"` in the meta itself | an import stands at the importer's level | declare what the vocabulary needs; kernel types are field types here |
| `operation => data & { … }` | there is no `data` kind | a record for the entry's shape, and a namespace type holding them |
| `request: type_name`, `request: text`, `request: type_ref` | inert token, or the application form | `request: kind<record>` or `type_kind` |
| `method: type_name` naming another entry's value | unchecked | `method: ref<method>`, written `orders.place_order` |
| `r: ref<record>` | `of` names a type, never a constructor | `r: kind<record>` |
| `x => { s: orders }`, `response: orders` in a governed schema | a namespace entry is a value, not a type | name the payload's types |
| `request: { name: page  arguments: [ … ] }` | a kind-typed slot in a value body holds one bare name | `order_page => page<order>`, then `request: order_page` |
| `widget_type => atom & { chain?: … }` | `chain` is `type`'s field | another name |
| `!namespace {}`, `!atom {}` | abstract | apply a concrete constructor, or compose |

## Implementations

In the Java implementation the values a governed schema's namespace entries hold are built by bound classes
— one per record type they hold (`method`, `binding`), supplied through `ProcessorConfig.bindings` or a
`DataNameBinder`. The `tson` CLI binds none, so it compiles a meta-schema (`tson compile meta-svc-1.tn`) but
reports a governed schema's entries as `BIND_MISMATCH` (exit 78) — *"Nothing is wrong with your document;
checking it needs an application that binds that type."* Details belong with that project.
