# Extension meta-schemas

Part 2 §2.2.2, §4.1, §4.2, §5.5, §6, §9, condensed — for the document that declares *constructors* of its own,
such as an HTTP operation, a method on an interface, or a deployment record. Every rule here was checked against
the Java implementation at Revision 34; the quoted messages are its diagnostics.

## When you are writing one

A user schema declares types. A meta-schema declares the **vocabulary** user schemas are written in — the things
that stand after `!`. You are writing one when a schema needs to say `create_order => !operation { … }` and
`operation` is yours. Two signals it is the right tool: the payload holds *references to types* (`request: order`)
that must be checked when the schema loads, and the entries are not types themselves (no data value is ever an
operation). If neither holds, an ordinary schema with `&`, `^` and templates is enough — and often better, since
a record type can be composed with and a constructor's instance cannot (see "The `data` kind", below).

## The header

```
!!id:"https://example.com/2026/35/meta-http-1.tn"
!!meta:"https://tson.io/2026/35/m/meta-kernel.tn"
!!import:"https://tson.io/2026/35/m/meta.tn"
```

`!!meta` is the **kernel**, not `meta.tn`: a `~` declaration is legal only in a document governed by the kernel
(§4.2), so an extension is a *sibling* of `meta.tn`, and it imports `meta.tn` for the vocabulary its own
declarations use. Imports are transitive (§2.2.3), so the kernel's entries arrive too: **inside a meta-schema
the kernel's types are ordinary field types** — `type_ref`, `type_name`, `identifier`, `text`, `boolean`,
`integer` all resolve as written. The SKILL.md rule "kernel types are only `!` targets, import core for field
types" is about *user* schemas; do not import core here.

The schemas *governed* by your extension name it in their `!!meta` and still import core for their own fields.

## `~` — declaring a constructor

```
http_verb   => !enum [GET POST PUT PATCH DELETE HEAD OPTIONS]
status_code => !integer ^ { min: 100  max: 599 }
parameter   => { name: text  in: parameter_location  type: type_ref  required: boolean }

signature => {
  request:   type_ref?
  response:  type_ref?
  errors:    [type_ref]?
  safe:      boolean ~ false
}

method    => ~data & signature
operation => ~data & signature & {
  verb:    http_verb
  path:    text
  status:  status_code ~ 200
  safe:    = false
}
```

Rules that bite (§4.2):

- **Kind.** A `~` declaration reaches exactly one base kind through its supertype chain — `atom`, `product`,
  `sum` or `data`. None → `PRODUCT` by default; two → error. `!C {}` inherits `C`'s kind.
- **Level discipline.** Anything that composes with, refines, or subtracts from a constructor must itself be
  `~`. The reverse is free: **non-constructor operands in a `~` declaration are legal** — a base kind seeds the
  level and plain records lend vocabulary, exactly as the kernel's `uri_type => ~text_type & atom_specification
  & { … }` does. This is the pattern for shared vocabulary: put the common fields in an ordinary record
  (`signature`) and compose it into each constructor. **Do not** try `operation => method & { … }` — see below.
- **Trailing body optional.** `method => ~data & signature` is complete.
- **Tightening in the body.** A body field matching an inherited one is a tightening under the §5.7 table
  (elided type allowed): `safe: = false` pins the inherited default to a fixed value, and a governed schema that
  then writes `!operation { safe: true }` is refused at load — *"'safe' is fixed on 'operation' and cannot be
  given another value — the schema declares it with '=' (fixed); for a default the data may override, use
  '~'"*. Use this to reserve a field for a later version of the vocabulary.
- **Value-route-only parameters.** A `~` declaration's parameters may appear only as `= P` / `~ P` value
  routes on its own fields. A type-channel parameter (`<T> ~data & { request: T }`) is a resolver error at the
  declaration; type parameters are a template feature, not a constructor one.
- **Bodies are closed.** An application whose payload names a field the constructor does not declare is a
  resolver error naming the member and the real fields (§5.5).

## The `data` kind

`~data & { … }` makes a constructor whose instances are `kind: DATA` — entries that ride in a schema map
without being types. That is what an operation, a method, a route are: declared, documented, looked up by
name, never the type of any value. §4.1 names *"an HTTP operation binding request and response types by name"*
as the motivating case.

The price is fixed by the same section, and it is the thing to know before designing: **a DATA entry may be
declared and applied but never named where a type is expected** — as a field type, element type, variant,
argument, composition operand or refinement source. Measured:

```
m => !method { request: order }
x => { s: m }
```
> `'x' field 's' names 'm', which is built with 'method' and describes something other than a data value — it
> is declared by this schema but is not a type, so nothing can be typed by it`

```
create_order => place_order & { verb: text }          (place_order is a !method instance)
```
> `supertype 'place_order' has no fields to contribute — its body is a binding record, not a vocabulary, so
> there is nothing for '&' to compose with (§5.8, and §5.7's vocabulary-body rule read across). Compose with
> the head it derives from`

Consequences for a design:

- **One constructor cannot extend another by naming its instance.** Share vocabulary through a plain record
  mixin (`signature` above) composed into both; relate the two constructors by *erasure* — an `operation` is a
  `method` with binding fields added — rather than by reference.
- **A governed schema cannot point one entry at another.** If an operation must refer to a method declared
  elsewhere, the slot is a `type_name` and the resolver will not check it: `method: plaec_order` loads clean.
  Whatever reads the description must check the name against the merged namespace itself. State that in the
  constructor's `@doc`.
- **An alias to a DATA application is refused in the Java implementation** (`get_order => fetch<order>` where
  `fetch` is a templated `~data` constructor): the reference resolves to a DATA entry, and a reference is
  defined as pointing at a type. Templated constructors declare fine; nothing can currently name their
  applications. Write each application out.
- If the entries *are* naturally the type of something — a call record, an exchange — consider a record type
  under plain `meta.tn` instead: `place_order => method<order, order> & { … }`, `create_order => place_order &
  http & { verb: = POST  path: = "/orders" }` composes, IS-A holds, fixed values read back from the resolved
  schema, and the reference is compiler-checked. The cost is that schema facts stated as fields are injected
  into every instance.

## Slots that hold types — `type_ref`, never `type_name`

§9's rule for extensions: **a constructor field that holds a type reference MUST be typed `type_ref`**, not
`type_name` and not `text`. `type_ref` is the slot that participates in flattening, `@alias` recording and
structural identity, and — the practical half — an unresolved name in one is a load error of the governed
schema. A `type_name` slot carries a bare token the resolver treats as data; nothing checks it. `[type_ref]`
works the same way per element (the kernel's `choice.variants` is one).

In a governed schema a bare token fills `type_ref.name` (`request: order`). An application **with arguments**
at such a slot must be written as the braced record, because `<` is not data syntax: `body: { name: page
arguments: [ { name: order } ] }`, or declare `order_page => page<order>` and name that.

## Annotations for the schemas you govern

Annotations resolve one hop against a document's governing target (§6) — for a schema governed by your
extension, that is *your* namespace: your declarations plus `meta.tn`'s and the kernel's through the import.
So `@doc`, `@deprecated:"…"`, `@since:"…"` already work in governed schemas, and you add your own the same way
`meta.tn` does:

```
interface => @annotation identifier
```
```
@interface:orders
@doc:"Accept an order and confirm it."
place_order => !method { request: order  response: order }
```

Written before the entry's name, the annotation is metadata about the declaration and is read back from the
entry's annotations; after `=>` it annotates the definition. Both are kept; they are not the same place. A
governed schema cannot declare annotations for itself — only the meta can.

## What a governed schema looks like

```
!!id:"https://schemas.example.com/2026/35/app/orders-api-1.tn"
!!meta:"https://example.com/2026/35/meta-http-1.tn"
!!import:"https://schemas.example.com/2026/35/app/order-1.tn"
!!import:"https://tson.io/2026/35/m/core.tn"
{
  @doc:"Place an order."
  create_order => !operation { verb: POST  path: "/orders"  status: 201  request: order  response: order }

  cancel_order => !method { request: order_ref  safe: false }
}
```

The entry name is the operation's identity, and it lives in the type-name namespace with its collision rule —
two operations cannot quietly share a name, and an operation cannot reuse a type's. `order` resolves through
the import or the schema fails to load, which is the property the whole arrangement exists for.

## Pitfalls specific to meta-schemas

| You wrote | Problem | Write instead |
|---|---|---|
| `!!meta:"…/m/meta.tn"` with a `~` declaration | `~` needs the kernel as governing target | `!!meta:"…/m/meta-kernel.tn"` + `!!import:"…/m/meta.tn"` |
| `!!import:"…/m/core.tn"` in the meta itself | not needed; kernel types are already field types here | drop it (governed schemas still import core) |
| `operation => method & { … }` (`method` is `~data`) | a DATA entry is not a composition operand | put shared fields in a plain record, compose it into both |
| `request: type_name` / `request: text` | inert token; unresolved names load clean | `request: type_ref` |
| `<T> ~data & { request: T }` | type-channel parameter in a constructor | drop the parameter; the slot is a `type_ref` the application fills |
| `x => { s: some_operation }` in a governed schema | naming a DATA entry as a type | reference the payload's types, not the operation |
| `field: (op_a \| op_b)` | DATA entries are not variants | a list of `type_ref`s to the payload types |

## Implementations

In the Java implementation an instance of a `~data` constructor is *built* by a bound class — a public record
named for the constructor (`@Typename(name = "operation")`) implementing `Data`, whose `references()` hands the
`type_ref` slots to the linker — supplied through the config's `metaNameBinder`. Without it a governed schema
does not resolve: the constructor is declared and nothing can build the value it constructs. A field the meta
declares and the record lacks, or the reverse, is reported by name at load. Details belong with that project.
