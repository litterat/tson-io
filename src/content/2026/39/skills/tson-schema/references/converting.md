# Converting from JSON Schema, OpenAPI, TypeScript, Protobuf — and from revision 38

Construct-by-construct mappings, for when the task starts from an existing schema or type
definition rather than from a domain. Every target below assumes the schema imports `core.tn`
(or the library that declares the name).

| Source | TSON |
|---|---|
| `type: object`, `properties`, `required` | `{ … }`; listed in `required` → unmarked name (`a: T`); not listed → `?` on the name (`a?: T`); `additionalProperties: true` → a map field (`extras?: {text => text}`, or `{text => meta.declared}` where each value names its type) — records are always closed |
| `minimum`/`maximum`/`exclusiveMinimum` | `min`/`max`/`exclusive_min` via `!integer ^ { }` or `!number ^ { }`. No library declares a sign-bounded integer: `minimum: 0` is a named `count => !integer ^ { min: 0 }` of your own |
| `minLength`/`maxLength`/`pattern` | `min_length`/`max_length`/`pattern` via `!text ^ { }`; `minLength: 1` is your own `title_text => !text ^ { min_length: 1 }` |
| `minItems`/`maxItems`/`uniqueItems` | `[T; N..M]`; unique → `set<T>`, which admits `[]`; unique with `minItems: 1` → a named `!meta.set_type { element_type: T  min_items: 1 }` |
| `prefixItems` (fixed tuple) | `[T, U]`; one item → `meta.tuple1<T>` (`[T]` is an array) |
| `number` / `integer` | `number` / `integer` (JSON numbers are exact; use `float64` only when rounding is intended) |
| `format: uuid/date-time/date/email` | `uuid`, `datetime`, `date`, `email` |
| `format: ipv4/ipv6/hostname`; a host or an IP; a MAC; a media type (`contentMediaType`, OpenAPI's content keys) | `ipv4`, `ipv6`, `hostname`, `host`, `mac`, `media_type` (from `net.tn`, which core imports). A `Content-Type` with parameters is your own `!net.media_type_type { allow_parameters: true }` |
| `format: uri` / `uri-reference` / `iri` / `iri-reference` | `uri` (scheme required, US-ASCII) / `uri_reference` (relative admitted) / `iri` / `iri_reference`; an allowed-schemes list → `!uri ^ { schemes: [https] }` |
| `format: duration` | `duration` for seconds-based spans (`PT90M`), `period` for years and months (`P1Y2M`) — the two never mix |
| `enum: ["a","b"]` | `!enum [a b]` if members are identifiers (a vocabulary of names); names with spaces → `!meta.enum_type { name_type: words  members: ["lightly active" …] }` over `words => !unicode.identifier_type { medial: " " }`; arbitrary strings → `!text ^ { members: ["80" "443"] }`; numeric enums → `!integer ^ { members: [ … ] }`; mixed → a choice of an enum and a member-set integer |
| `const`, `default` | `const` on a required property → `a: T = v` (a marker the document writes); on an optional one → `a?: T = v`; `default` → `a?: T ~ v` |
| `nullable` / `T \| null` | `?` on the **type**: required + nullable → `a: T?`; optional + nullable → `a?: T?`; nullable with a default → `a?: T? ~ v` (omitted → default, `_`/`null` → void). TSON has no `null`; `_` is the void sentinel |
| TypeScript `a?: T`, `a: T \| null`, `a?: T \| null` | `a?: T`, `a: T?`, `a?: T?` — the same three characters |
| `oneOf` of distinct types | `(a \| b)` — check disjointness; else a field group |
| `oneOf` + `discriminator` (propertyName, mapping) / sealed class / Rust enum | an abstract base with a selector: `pet => abstract { pet_type: text =?  … }`, each member `dog => pet & { pet_type: = "dog"  … }`, the position typed `pet`; `mapping` becomes the pins. `final` for a leaf nothing may extend |
| tagged union with no shared base | a field group, or a choice with mandatory tags |
| a payload whose type a sibling names (`{ "kind": "int32", "value": 7 }`, a typed setting) | a dependent field: `setting => { kind: meta.type_ref  value?: kind! }` — narrow `kind` to `meta.ref<meta.atom>` (or another constructor) to restrict what it may name |
| `anyOf` of `required` sets, `dependentRequired` | field groups: at least one of → `( email: E \| phone: P )+`; `oneOf: [{required: [host, port]}, {required: [socket]}]` → `( host: H  port: P \| socket: S )`; `a` requires `b` → `( b: B  a?: A )?` |
| `allOf` | `a & b & { … }` (fields must not overlap) |
| `$ref` | a named declaration; to another document, `!!import` it and use its names (one flat namespace — no prefix) |
| `$defs` grouping, a namespaced module | a nested schema map, `geo => !schema { address => { … } }`, used as `geo.address` |
| property names that are no identifiers — JSON-LD's `@context`/`@id`/`@type`, `$ref`, `$id` | a name type on a fieldless abstract base, composed into each record: `json_name => !unicode.identifier_type { start_add: "@$" }`, `json_record => !meta.record { name_type: json_name  extension: ABSTRACT  fields: {} }`, `node => json_record & { "@id": iri  "@type": text  name: text }`. Every record composed with one must share the name type. A key that no profile can state (`""`, a leading space) is data: a map |
| property names compared without case (HTTP headers) | a name type with `normalization: ASCII_CASEFOLD` over the `ASCII` base (`declaration-forms.md` §2) |
| TypeScript `Pick`/`Omit` | `^` (fix/narrow) / `-` removal |
| generics `Box<T>`, `Result<T, E>`; `T extends string` | templates; a constraint → a bound, `<T: text>` (by IS-A only: the argument must refine `text`) |
| OpenAPI `components/schemas` | ordinary declarations, in a schema the description imports |
| OpenAPI `paths` / operations | a namespace type holding the operations, and a value entry of it, both in an ordinary schema: `method => { request?: meta.ref<meta.record>  response?: meta.type_ref }`, `interface => !meta.namespace { key_type: meta.identifier  value_type: method }`, then `orders => !interface { place_order => { request: place_order_request  response: order } }` — `extension-meta-schemas.md` |
| `operationId`, `description`, `deprecated`, `$comment`, `examples` | the entry's name; `@doc:"…"` (CommonMark) before the entry; bare `@deprecated` (a reason goes in `@doc`); `@comment:"…"`; `@examples:["…"]` as text |
| `requestBody` / `responses.<status>.content.schema` | reference-typed slots on the method record (`request?: meta.ref<meta.record>`, `response?: meta.type_ref`), naming declared types; a status is a value slot (`status_code => !integer ^ { min: 100  max: 599 }`) or a fixed field on the error type (`sku_not_found => problem & { status: = 404 … }`) |
| an operation naming another (a link, a binding to a method) | a `meta.ref<method>` slot, written `orders.place_order` (declare `method_ref => meta.ref<method>` where a processor needs a named slot type) |
| `parameters` (path/query/header) | a record of `name`, location enum, `type: meta.ref<meta.atom>` (admits only atom types), `required` |
| Protobuf `repeated`, `map<K,V>`, `oneof`, `optional` | `[T]`, `{K => V}`, field group, `?` on the name; `int32/uint64/bytes` → `int32`/`uint64`/`bytes` |
| Protobuf `google.protobuf.Any` | `meta.declared` (the value names its type), with the schemas it may come from imported |
| an object whose key order matters | `!meta.map { key_type: text  value_type: V  ordered: true }` — a map is unordered by default |

## From a revision 38 schema

A revision 38 schema converts mechanically; `pitfalls.md` "Retired in revision 39" has one row per
spelling. In order:

| Revision 38 | Revision 39 |
|---|---|
| `!!id` / `!!meta:"…/38/m/meta.tn"` / `!!import:"…/38/m/core.tn"` | `!!id` / `!!import:"…/39/m/core.tn"` — drop `!!meta`; rewrite every `2026/38` URL and drop or re-stamp its pin |
| `!!import:"…/38/m/net.tn"` beside core | drop it: core imports `net.tn` (keep it only where you import libraries one by one) |
| the root `{ … }` | `!schema { … }` |
| a data document's `!!schema:"…"` | `!!import:"…"` |
| a nested `!!schema` before a value, at `extern`/`dynamic`/`extern_of<…>` | import that schema in the document header; type the position `meta.declared` or a choice |
| `!enum_type`, `!text_type`, `!identifier_type`, `!integer_type`, `!decimal_type`, `!set_type`, `!map`, `!array`, `!record`, `!bytes_type`, `!uuid_type`, `!uri_type`, … | the same name by path: `meta.`, `unicode.`, `numeric.`, `binary.`, `net.`, `temporal.` (`type-families.md` names each one's map) |
| `kind<C>`, `type_kind`, `atom_kind`, `identifier_kind` | `meta.ref<C>`, `meta.type_ref`, `meta.ref<meta.atom>`, `meta.identifier_ref` |
| `ref<T>` (meta-schemas only) | `meta.ref<T>`, in any schema |
| `@disjoint`, `@annotation`, `@ordering`, `@bounded`, `@exact`, `@numeric` | `@meta.disjoint`, `@meta.annotation`, `@atom.ordering`, `@atom.bounded`, `@atom.exact`, `@atom.numeric` |
| `tuple1<T>`, `voidable_tuple1<T>`, `identifier`, `non_negative_integer` | `meta.tuple1<T>`, `meta.voidable_tuple1<T>`, `meta.identifier`, `numeric.count` |
| `value`, `!value_type {}` | no equivalent; type the slot |
| a meta-schema (`!!meta` the meta-kernel) declaring constructors or namespace types | an ordinary schema importing `meta.tn` (or core) declaring the same entries, by path (`meta.atom & { … }`, `!meta.namespace { … }`) |
| a description schema governed by that meta-schema, holding `orders => !interface { … }` | the same value entries, in any schema whose closure declares `interface` |

Do not fake a feature the source has and TSON lacks (open records, regex-keyed properties, conditional schemas, a bound on how an argument's type was built, a value naming a schema the document never imported) — say so and choose the nearest honest shape.
