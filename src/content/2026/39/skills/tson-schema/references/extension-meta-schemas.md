# Extending the vocabulary

Part 2 §2.2.3, §3.3, §4.1, §4.2, §5.2, §5.12, §6 and §9, condensed. This is for the schema that declares vocabulary
of its own: entries that are not types (an interface's methods, the routes bound to them), slots that name types
or other entries and are checked when the schema loads, and new constructors. Before revision 39 such a document
was a "meta-schema" on a rung of its own. Now there is **one level**: no `!!meta`, no meta layers, no rule about
which level may import which. Any schema may declare a constructor, a namespace type, a value or a reference.
The quoted diagnostics come from the Java implementation.

## When you are writing one

You are extending the vocabulary when a schema needs entries that are **values, not types**, and those values
name types (`request: order`) or other values (`method: orders.place_order`) that must resolve when the schema
loads. If every entry is a type, an ordinary schema with `&`, `^` and templates is enough, and better.

Vocabulary and its uses may live in one document: a schema may apply a constructor or a namespace type it
declares itself (§3.3.1). Split them when other schemas will share the vocabulary. The usual shape is a
vocabulary schema (`service.tn`) and the schemas that import it and hold values (`orders-api.tn`).

## The header and the namespace

```
!!id:"https://example.com/2026/39/service.tn"
!!import:"https://tson.io/2026/39/m/core.tn"
!schema {
  …
}
```

A schema document is `!!id`, its `!!import`s, its annotations, and a root tagged `!schema` (Part 2 §2.1, §12.1).
Import the kernel, `meta.tn`, directly when the vocabulary needs only kernel types, or `core.tn` (or one library)
when its fields want `int32`, `date` or `uuid`. Nothing stops a vocabulary from importing `core.tn`.

**One namespace, resolved from the root.** A document's names are its own entries plus its whole import
closure, one flat set. The kernel's machinery is reached by path: `meta.record`, `meta.namespace`,
`meta.type_ref`, `meta.ref<T>`, `meta.identifier`, `unicode.text_type`, `atom.specification`. Imports are
transitive, so the schemas that import yours see your names and the kernel's too, and every name in the closure
is **reserved** in every importer (§2.2.3). Keep your root to the names an author writes, and put machinery
under a map of your own (below).

## Entries that are not types: namespace types and value entries

```
since       => @meta.annotation text
method_name => meta.identifier
http_verb   => !enum [GET POST PUT PATCH DELETE]
status_code => !integer ^ { min: 100  max: 599 }
method      => { request?: meta.ref<meta.record>  response?: meta.type_ref  errors?: [meta.ref<meta.record>] }
interface   => !meta.namespace { key_type: method_name  value_type: method }
binding     => { method: meta.ref<method>  verb: http_verb  route: text  status?: status_code ~ 200 }
bindings    => !meta.namespace { key_type: meta.identifier  value_type: binding }
```

`meta.namespace` is a map constructor: `namespace => meta.map ^ { key_type: meta.identifier_ref  voidable?: =
false }`. A **namespace type** is an instance of it, as a map type is an instance of `meta.map`. A value of one is
a map whose keys are names of the identifier family `key_type` names, with no void values. `key_type` is
required. `method` and `binding` are ordinary records, the shapes of the map's values, and `since` is an
annotation type (below). The kernel's own namespace type is `meta.schema`.

**`name => !T { … }` where `T` is an ordinary type declares a value entry** (§4.1). Whether an entry is a type
depends on its head, not on the grammar. A head IS-A `meta.type` builds a type. An ordinary type (a namespace
type, a record) builds a *value* of `T`, read against `T` exactly as data is:

```
orders => !interface {
  place_order  => { request: place_order_request  response: order  errors: [problem] }
  cancel_order => { request: order_ref }
}
routes => !bindings {
  post_orders => { method: orders.place_order  verb: POST  route: "/orders"  status: 201 }
}
create_order => !operation { name: "create" }
```

The last is a value entry of a record type, `operation`.

A value entry is **never a type**. Naming it at a type position is a resolver error: `x => { s: orders }`
gives *"'orders', which is a value of the type 'interface' -- a value and not a type"*, and `response: orders`
fails the same way. Each key of a namespace value is a name under `key_type` (name hygiene applies to the key
set), and each value is ordinary data of the record type. Nothing in a value entry's payload lifts or mints, so
a reference-typed slot in it holds **one bare name**. A record written in braces (`request: { a: text }`) and
an application (`request: page<order>`) are both refused. Give the application a name first, `order_page =>
page<order>`, then write `request: order_page`.

A namespace type is the way to group many entries of one shape. A single value of a record type, like
`create_order`, is just as legal when the entries do not form a collection.

## Slots that name types: `meta.type_ref` and `meta.ref<C>`

A field whose value is the **name of a type** is typed by a reference over a constructor (§4.2):

| Type the slot | Admits |
|---|---|
| `meta.type_ref` | any type a value can have, and its aliases |
| `meta.ref<meta.record>` | the names of entries built with `meta.record`: record types, and constructors (whose declarations are records) |
| `meta.ref<net.uuid_type>` | types built with `uuid_type` (`stock_id`), never a UUID value |
| `meta.identifier_ref` | identifier families, the type of a `name_type` slot |

The value is one bare name, judged at link a member over the closure: `request: uuid` at
`meta.ref<meta.record>` is refused (*"'uuid' is an entry whose body is built by 'net.uuid_type', which is no
'meta.record'"*). A record template is built with `meta.record_template` and is no member, and an open entry is
never a referent. Name an application declared in the using schema instead (`bt => box<int32>`, then `request:
bt`).

Do not type such a slot `text` or `meta.type_name`. Those hold a bare token the resolver treats as data, so an
unresolved name loads clean. Revision 38's `kind<C>`, `type_kind` and `identifier_kind` are gone: each one is
the reference above.

## Slots that name values: `meta.ref<T>` and qualified names

`meta.ref<T>` with `T` **no constructor** holds a **qualified name** of a value whose type is `T` or IS-A it
(§5.12). The name is segments joined by `.`. The first segment is an entry of the writer's namespace, and each
further segment selects a member of a nested `!schema` map, a key of a namespace value, or a field of a record
value. Every hop is written out. There is no index (`[0]`), no quoted segment, no entry into a map that is no
namespace, and no argument list. The referent is found first and judged after, its type before its value.

| Written at `method: meta.ref<method>` | Result |
|---|---|
| `orders.place_order` | accepted: `orders` is an `interface` entry, `place_order` a key, the value a `method` |
| `orders` | refused: an `interface` value, where a `method` is wanted |
| `orders.cancel_order` (no such key) | refused: the keys are listed |
| `orders.place_order.nope` | refused: a `method` value has no field `nope` |
| `place_order` | refused: no entry `place_order`; a member is reached through its entry |
| `place_order_request` | refused: a record type, where a `method` value is wanted |

**The slot declares the spelling.** A slot typed `meta.ref<method>` holds a name and nothing else. A slot typed
`method` holds the value inline. A `meta.ref<T>` slot works in a data document too: a name written there is
judged against the namespace the document's imports bind, and a host receives the referent with the name.

## Slots read against a type another field names: dependent fields

A vocabulary often pairs a type with a value of it, as in a setting, a tagged payload, or a typed default.
Write the value's type as a **sibling reference**, `kind!` (§5.2; `declaration-forms.md` has the rules):

```
setting  => { kind: meta.type_ref  value?: kind! }
settings => !meta.namespace { key_type: meta.identifier  value_type: setting }
defaults => !settings {
  port => { kind: uint16  value: 8080 }
  home => { kind: geo.address  value: { street: "1 Main St"  city: Springfield } }
}
```

Each value is judged at link against the type its sibling names. `value: abc` under `kind: uint16` is a resolver
error naming the entry, the slot and the sibling. The sibling must be declared first. It must be typed by a
reference over a constructor (`meta.type_ref`, `meta.ref<C>`), never `meta.ref<method>`, and it must be there
whenever the dependent field is. The kernel's own `meta.record_field.value?: type!` is this pattern.

## Nested schema maps and the open concept maps

```
svc => !schema {
  method  => { … }
  binding => { … }
}
```

`name => !schema { … }` nests a schema map as an entry (§4.1). Its members are declarations like root entries,
named by their **path from the root**, `svc.method`. Every name resolves from the root, so inside `svc` a
sibling is written `svc.method`. A bare `method` there names the root's `method`, or fails to resolve. The
nested map takes at least one member, takes no parameters, and is tagged `!schema` or `!meta.schema`. Synthetic
entries mint at the root.

**Maps are open across documents.** A map of one path declared by several documents of a closure is **one map**,
the union of their members (§2.2.3). Each document contributes by declaring the map itself. No grammar declares
a dotted name such as `svc.extra => …`. A member path declared twice collides like any name: *"'geo.address'
collides with an entry of the same name brought in by !!import"*. A map's name also collides with any entry of
that name that is no map. Declare each map once per document.

**The kernel's maps are open on the same terms.** `numeric.tn` adds its constructors to the kernel's `numeric`,
and `net.tn` adds its own to the kernel's `net`. A schema may contribute to any of `meta`, `atom`, `numeric`,
`unicode`, `net`, `binary` (and `temporal`, with `temporal.tn` imported):

```
!!import:"https://tson.io/2026/39/m/meta.tn"
!schema {
  meta => !schema { code_type => unicode.text_type ^ { max_length?: = 4 } }
  code => !meta.code_type {}
}
```

Every importer then sees `meta.code_type` beside the kernel's members, and the path is reserved for the whole
closure. A member path the kernel already declares (`meta => !schema { record => … }`) is a collision, and so is
`meta => text`. Contributing to a kernel map is legitimate. Prefer a map named for your own concept (`svc`,
`policy`) unless the member really belongs to the kernel's concept: your own map is easier to find and less
likely to collide with a later library.

## Constructors

There is **no constructor marker**. An entry is a constructor exactly when it is `meta.top` or IS-A it. In
practice that means it composes or refines `meta.type`, a base kind (`meta.atom`, `meta.product`, `meta.sum`) or
another constructor (§4.2). Any schema whose closure holds the kernel may declare one, and may apply it in the
same document.

**Know what your processor backs.** A constructor composing a base kind directly (`currency_type => meta.atom &
atom.specification & { … }`) declares a new *form*. Only a processor that ships readers and writers for that
form can read it, and a pinned `spec` binds the processor to implement that specification exactly. The portable
way to get an atom family of your own is to **refine a constructor the processor already backs**, pinning or
narrowing its facets as the `meta.code_type` example above does. An instance of that refinement is read by the
backed family's reader.

Rules that bite:

- **Kind.** A constructor reaches exactly one of `meta.atom`, `meta.product` or `meta.sum` through its chain,
  counted only as the kernel's own entries. None → PRODUCT; two → error. `!C {}` inherits `C`'s kind.
- **Abstract roots.** `meta.top`, `meta.type` and the base kinds are `abstract`: `!meta.top {}` or `!meta.atom
  {}` is refused, and the diagnostic names the subtypes that would satisfy it. An annotation typed by one is a
  schema error.
- **Mixing operands is free.** A base kind seeds the kind and plain records lend vocabulary, as `net.iri_type =>
  unicode.text_type & atom.specification & { … }` does. Shared fields go in an ordinary record composed into each
  constructor.
- **`chain` is `meta.type`'s.** The resolver computes it. A constructor declaring a field of that name is refused
  (*"'y' declares a field 'chain', the name the kernel's 'type' gives a type's IS-A chain"*), and no declaration
  writes one.
- **Typed facets.** A facet holding a value of your family is typed by your family's own instance, declared
  beside the constructor (`min?: code`), and a counting facet by `numeric.count`. There is no `value` type to
  fall back on. A facet typed by the constructor's own instance orders nothing, so the mutual reference is sound
  (§3.4.1).
- **Tightening in the body.** A body field matching an inherited one is a tightening along §5.7's orders (an
  elided type is allowed). Keep the `?` on the name when pinning an optional field (`max_length?: = 4`), or the
  pin becomes a marker every instance must write.
- **Parameters.** A constructor's parameters follow the ordinary template rules: each takes its type from the
  slot it stands in, so a `meta.type_ref` slot makes a type parameter and an atom-typed slot makes a value
  parameter. Prefer a `meta.type_ref`-typed slot that the application fills over a type parameter.
- **Bodies are closed.** An application whose payload names a field the constructor does not declare is a
  resolver error naming the member and the real fields (§5.5).

## Annotations

An annotation resolves in the annotating document's namespace, from the root (§3.3.3). So an annotation type
your vocabulary declares works in your schema, in every schema that imports it, and in their data documents.
`@doc`, and `core.tn`'s `@deprecated` and `@comment` where `core.tn` is imported, already work. Add your own
the same way:

```
since    => @meta.annotation text
audience => @meta.annotation text
```

Written before an entry's name, an annotation is metadata about the declaration. Written after `=>`, it
annotates the value. Both are kept, and they are not the same place.

## A bundled example: `policy.tn`

`policy.tn` is a small vocabulary that follows every rule above. It imports `meta.tn` alone, keeps its whole
vocabulary under one map of its own, `policy`, and types its fields with the kernel's types and its own:

```
!!id:"https://tson.io/2026/39/m/policy.tn?sha256=e9cb5b9305ddec62f0e18e7ee7ed3d2a087d97a243a48b411daa11f5071a496f"
!!import:"https://tson.io/2026/39/m/meta.tn?sha256=c9b069b606f7cc8a043ebabe3fe91e4aaa35a9ffd814b68be0ba4bbe6d02bfb5"
!schema {
  policy => !schema {
    restriction_level => !enum [ASCII_ONLY SINGLE_SCRIPT HIGHLY_RESTRICTIVE …]
    script_policy     => { level: policy.restriction_level  permitting: [[text]] }
    limit             => !int64 ^ { min: 1 }
    limits            => { max_depth?: policy.limit ~ 64  …  max_wait_depth?: policy.limit ~ 64 }
    processor         => { identifier_policy: policy.identifier_policy  token_policy: policy.script_policy
                           unicode_data_version?: text  limits: policy.limits }
  }
}
```

Inside its own map it still writes `policy.restriction_level` and `policy.limit`, because names resolve from the
root. A closure holding it reserves only `policy`. A deployment that writes its policy down writes a *data*
document, with the tag qualified like any name:

```
!!import:"https://tson.io/2026/39/m/policy.tn"
!policy.processor {
  identifier_policy: { level: HIGHLY_RESTRICTIVE  per_segment: true  skeleton_distinctness: true  permitting: [[Latin Cyrillic]] }
  token_policy: { level: UNRESTRICTED  permitting: [] }
  limits: { max_depth: 128  max_import_closure: 256 }
}
```

## A using schema

```
!!id:"https://schemas.example.com/2026/39/orders-api-1.tn"
!!import:"https://example.com/2026/39/service.tn"
!schema {
  order_ref           => { id: uuid }
  order               => { id: uuid  total: number }
  place_order_request => { sku: text  qty: int32 }
  problem             => { title: text }

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

`service.tn` imports `core.tn`, so `uuid`, `number` and `int32` arrive transitively. The entry name `orders` is
the interface's identity in the one namespace, under its collision rule. `order` resolves through the schema's
own entries and `orders.place_order` through the value entry above it, or the schema fails to load. That
load-time check is the reason for the whole arrangement.

## Pitfalls specific to vocabularies

| You wrote | Problem | Write instead |
|---|---|---|
| `!!meta:"…/m/meta-kernel.tn"` or any `!!meta` | retired: a parse error; `meta-kernel.tn` no longer exists | `!!import:"https://tson.io/2026/39/m/meta.tn"` (or `core.tn`) and a root tagged `!schema` |
| a bare `{ … }` root | no `!schema` tag, so the document is data | `!schema { … }` |
| `interface => namespace & { key_type: = K  value_type: = V }` | revision 38's spelling; `namespace` is now a map constructor | `interface => !meta.namespace { key_type: K  value_type: V }` |
| `record`, `namespace`, `type_ref`, `identifier` unqualified | kernel machinery lives under `meta` | `meta.record`, `meta.namespace`, `meta.type_ref`, `meta.identifier` |
| `request: kind<record>`, `type_kind`, `identifier_kind` | kinds are gone | `meta.ref<meta.record>`, `meta.type_ref`, `meta.identifier_ref` |
| `method: ref<method>` | unqualified | `method: meta.ref<method>` |
| `request: meta.type_name`, `request: text` | inert token: an unresolved name loads clean | `meta.ref<meta.record>` or `meta.type_ref` |
| `x => { s: orders }`, `response: orders` | a value entry is a value, not a type | name the payload's types |
| `request: { … }` or `request: page<order>` in a value body | a reference slot there holds one bare name | `order_page => page<order>`, then `request: order_page` |
| `place => { at: address }` inside `geo => !schema { … }` | names the root's `address` | `at: geo.address` |
| `geo.place => { … }` | no grammar declares a dotted name | `geo => !schema { place => { … } }` |
| `meta => !schema { record => … }` | collides with the kernel's member | a new member name, or a map of your own |
| `currency_type => meta.atom & { … }` and expecting it to read | a new form needs a processor that backs it | refine a backed constructor: `code_type => unicode.text_type ^ { … }` |
| `min?: value` on your constructor | there is no `value` | type it by your family's instance |
| `widget_type => meta.atom & { chain?: … }` | `chain` is `meta.type`'s field | another name |
| `!meta.atom {}`, `!meta.top {}` | abstract | apply a concrete constructor, or compose |
| `{ kind: meta.ref<method>  v: kind! }` | a sibling must name a type | `kind: meta.type_ref` |

## Implementations

The Java implementation and its `tson` CLI read namespace values, value entries, `meta.ref<T>` names and
dependent fields directly. `tson validate service.tn orders-api.tn data.tn` checks the whole chain and needs no
bound classes. A constructor whose instances no reader factory backs is a different matter. That covers a new
form composed from a base kind, or a backed constructor composed with new facets. The CLI reports applying one as
`NOT_IMPLEMENTED` (exit 70), and that is a gap in the tool, not a fault in the schema. A refinement of a backed
constructor (`unicode.text_type ^ { … }`) compiles and validates.
