# Declaration forms in depth

Part 2 §3–§6 and §8.3, condensed. The SKILL.md decision table picks the form; this file has the rules each form is checked against.

## Contents

1. Canonical form — what every declaration becomes
2. Records, field slots, name types and dependent fields
3. Type expressions and types written in place
4. Constructor application, value entries, open construction and completion, value refinement
5. Value refinement `^` — the facet kinds
6. Composition `&` — restating a field
7. Subtraction `-`
8. Record extension (`abstract`, `final`) and sealed families (`=?`)
9. Choice types and disjointness
10. Field groups
11. Annotations in schemas — what an annotation may do
12. One namespace — what a name means where
13. Externs — one entry of another schema

---

## 1. Canonical form

**An entry is its value.** Every declaration resolves to `!C { bindings }` — a constructor applied to a record of its own fields — with no wrapper around it: `person => !meta.record { fields: { … } }`, `id => !meta.alias { target: uuid }`. A type's value carries `chain: { parents? supertypes? subtypes? }`, its IS-A order, computed by the resolver and never written by a declaration (`!meta.record { chain: … }` in source is a resolver error); an empty chain is omitted, and `supertypes` and `subtypes` are sets of names. No kind is recorded: a consumer reads what an entry is from its constructor. A parametric record is `!meta.record { parameters: [ … ] … }` (`parametric-records.md`); an incomplete entry (§4) resolves to nothing and is not written. Sugar desugars, its targets the kernel's entries by path whatever the document imports:

| Source | Canonical |
|---|---|
| `{ a: text }` | `!meta.record { fields: { a => !meta.record_field { type: text } } }` — `fields` is a map from name to field |
| `[T]` | `!meta.array { element_type: T }` |
| `[T; N]` | `!meta.array { element_type: T  min_items: N  max_items: N }` |
| `[T; N..M]`, `[T; N..]`, `[T; ..M]` | `min_items`/`max_items` as given |
| `[T?]` | `voidable: true` on the array |
| `(A \| B)` | `!meta.choice { variants: [A B]  disjoint: … }` — the resolver always writes `disjoint` |
| `{K => V}` | `!meta.map { key_type: K  value_type: V }` |
| `[T, U?]` | `!meta.tuple { elements: [ { element_type: T } { element_type: U  voidable: true } ] }` |
| `meta.array<T>`, any `C<args>` over a constructor | `!C { f₁: a₁ … }` over its argument slots: `meta.array<T>` is `[T]` |
| `set<T>` | `!meta.array { element_type: T  ordered: false  unique_items: true }` — the completion of the incomplete `meta.set_type`, with `@meta.completion:{ of: [meta.set_type] }` on a declared one's key |
| `!enum [a b]` | `!meta.enum_type { name_type: meta.identifier  members: [a b] }` — the completion of the incomplete `enum` |
| `!integer ^ { min: 0 }` | `!numeric.integer_type { chain: { supertypes: [integer] }  min: 0 }` |
| `employee => person & { dept: text }` | `!meta.record { chain: { supertypes: [person] }  fields: { name => … dept => … } }` — flattened |
| `!int8 ^ { min: 0 }` | `!numeric.integer_type { chain: { supertypes: [int8 integer] }  size: { bits: 8  signed: true }  min: 0 }` — inherited facets survive |
| `name => T` | `!meta.alias { target: T }` — a hop, kept as written |
| a form at a type slot, `tags: [text]` | `type: { of: !meta.array { element_type: text } }` — written in place (§3) |
| `kind!` at a record field's type | `type: { of: !meta.dependent { on: kind } }` (§2) |

**Positional form.** When a constructor has exactly one field whose *name is unmarked* (whatever its modifier), the value after `!C` fills it directly: `!meta.array text`, `!meta.ref method`. Fields whose name carries `?` never count — `binary.bytes_type.encoding?` is *not* a positional slot, so write `!binary.bytes_type { encoding: HEX }`. A completion takes the positional form over the one required field its incomplete entry leaves absent: `enum` writes `name_type` and leaves `members`, so `!enum [true false]` is `!enum { members: [true false] }`, and `!meta.set_type text`, `!meta.set_type { element_type: text }` and `set<text>` are one completion. The general `!meta.enum_type { name_type: kebab  members: [...] }` has two required fields and needs braces. `meta.record_field` has one (`type`), so the explicit record form may write `fields: { x => text }`. In a schema document a bare token fills a positional field only where that field is atom-typed or a type slot; at a record whose positional field is a record or a choice, write the braces.

**Bodies are closed.** Every member of a construction or refinement body must be a field the constructor declares; an unknown member is a resolver error. This is why `!integer ^ { minimum: 1 }` is refused rather than silently ignored.

**Top-level constructor applications are constructions**: `lookup => {text => integer}`, `lookup => meta.map<text integer>` and `lookup => !meta.map { … }` are the same thing — a type with no supertypes, nominally distinct from the same construction written in place. A type a collection constructor built may still be refined (`!lookup ^ { min_items: 1 }`, §5).

**The explicit record form** is the brace form spelled out: `person => !meta.record { fields: { name => { type: text }  nick => { type: text  optional: true } } }` is `{ name: text  nick?: text }`. It is rarely worth writing, except to state a record's `name_type` (§2). It takes no definition mark: it states `extension` itself.

## 2. Records and field slots

A field answers three independent questions, one slot each — `name?: type? ~ default`, `name?: type? = fixed`, `name: type =?`:

1. **May the key be omitted?** `?` on the *name*. Unmarked, the key must be written.
2. **May a written value be `_`?** `?` on the *type* — the field is *voidable*, exactly as `?` means at an array element or map value.
3. **What may a written value be?** The modifier: none (free), `~ v` (default, injected on omission, overridable), `= v` (fixed — a written value must equal `v`), `=?` (selector, §8).

| Spelling | Key | `_` | Value | A missing key yields |
|---|---|---|---|---|
| `a: T` | written | refused | any | — (a validation error) |
| `a?: T` | may be omitted | refused | any | nothing |
| `a: T?` | written | admitted | any | — (an error) |
| `a?: T?` | may be omitted | admitted | any | nothing |
| `a?: T ~ v` | may be omitted | refused | any | `v` |
| `a?: T? ~ v` | may be omitted | admitted | any | `v` (and `_` is void) |
| `a?: T = v` | may be omitted | refused | `v` only | `v` |
| `a: T = v` | written | refused | `v` only | — (an error): a **marker** the document states (`"jsonrpc": "2.0"`) |
| `a?: void?` | may be omitted | admitted | none | nothing |
| `a: void?` | written | admitted | none | — (an error) |
| `a?: void` | may be omitted | refused | none | nothing |

Refused, as rules: a default on an unmarked name (`a: T ~ v` — only omission reaches a default; write `a?: T ~ v`); a pin on a voidable type (`a: T? = v`, `a?: T? = v`); any modifier on a `void` field, and `_` as a modifier value (`~ _`, `= _` — write `a?: void?`); `a: void` (no document satisfies the record). What a missing key yields is derived, never stored: unmarked → the missing-field error; marked with a value → the value, injected; marked without → nothing, the field stays missing.

Resolved output keys each field by its name in the record's `fields` map and stores its `type` and four facts per `meta.record_field`: `optional` (name's `?`), `voidable` (type's `?`), `role` (`FREE`/`DEFAULT`/`FIXED`) and `value`; defaults `false`/`false`/`FREE` are omitted. `type` is a `meta.type_expr` — a name, or a type written in place as `{ of: … }`. `value` is itself a dependent field (`value?: type!`), read against the type the field's own `type` names.

**Which fields may carry a value:** only fields whose declared type, after following its alias chain, is an atom-family instance or an enum — a reference among them, named or written in place (`handler?: meta.ref<method> ~ orders.place_order`). A record, container, tuple, choice, `void` or `meta.declared`, named or written in place, takes none. Value modifiers are single scalar tokens; no arrays/records/maps, never `_`. Values are read by the field's own type at schema load — a default that fails its type is a load error. At a field typed by a reference naming values the token is a qualified name, judged at link. A value is always a literal, never a parameter: a field whose type names a parameter takes none (`parametric-records.md`).

**Encoders with the schema** must write a void value as `_` at `a: T?` (omission is the missing-key error) and at `a?: T? ~ v` (omission reads back as the default). A marker `a: T = v` must always be written. Otherwise encoders should write defaulted values out (a document that states its defaults reads without its schema); omitting a field equal to its default is a permitted optimisation.

**Elided types:** in a composition body a restating entry may omit the type — `port?: = 9090` — inheriting it from the parent. Keep the name's `?` when restating an optional field: `port: = 9090` would also move it to required, making it a marker the document must write. A modifier-only entry naming no inherited field is refused. In a fresh `{ … }` every field needs a type.

### Field names and the name type

A record's field names are values of its **name type**, `meta.record.name_type` — an identifier family, by default the kernel's `meta.identifier`, the same slot an enum has for its members. A declared field name is any single-line token, quoted where it is no identifier, and is judged when the schema links: under the default `{ "first name": text }` is a resolver error (*field name 'first name' is not an identifier*), not a parse error. A schema translated from JSON-LD, JSON Schema or OpenAPI, whose members are `@id`, `$ref`, `@context`, declares the profile its names need **once, on a fieldless abstract base**, and its records compose it — the brace form has no syntax of its own for a name type:

```
json_name   => !unicode.identifier_type { start_add: "@$" }
json_record => !meta.record { name_type: json_name  extension: ABSTRACT  fields: {} }
node        => json_record & { "@id": text  "@type": text  label: text }
```

- **One name type, inherited.** A record with supertypes takes theirs; supertypes with different name types do not compose — `json_record & address`, where `address` states none and so has `meta.identifier`, is a resolver error. Declare the record over the same type, `address => json_record & { city: text }`. A composition over one record keeps its type (`tightened => node & { "$ref": text }`).
- **Its form implies NFC.** A document's names are matched in the name type's `normalization`: under `http_name => !unicode.identifier_type { start: ASCII  continue: ASCII  medial: "-"  normalization: ASCII_CASEFOLD }`, `Content-Type` in a document is the field `content-type`, and both spellings in one record are a duplicate. `NONE` is refused at load; `ASCII_CASEFOLD` only over a profile whose every character is ASCII.
- **It admits no `.`**: a qualified name's segments are matched against a record value's field names, so a profile holding `.` is a resolver error at the record. A vocabulary with dotted names is translated with the names changed, or held as a map keyed by `text`.
- **The schema's own references match exactly.** A group member, a restated or removed field, a dependent type's `on` and a `discriminators` entry name a field by its declared spelling, under a folding type too.
- **A document's names are judged by the record that reads them**: a name it does not declare is an unrecognised field (a validation error), and a record nested in a relaxed one judges its own names. Hygiene runs under the name type's profile.
- **When to use it**: the names are given by a vocabulary, a protocol or a system of record. Never for keys — a key that is no name (`""`, a leading space) belongs in a map.

### Dependent fields

A field's type may be a **dependent type**: a sum written in place in which an earlier field of the same record, the *sibling*, names the type this field is read against, instance by instance. Its canonical form is `{ of: !meta.dependent { on: kind } }`, and the schema grammar writes it `kind!` — one identifier with an adjacent `!` followed by whitespace:

```
setting => { kind: meta.type_ref  value?: kind! }
cell    => { of: meta.ref<meta.atom>  v: of! }
shaped  => { shape: meta.type_expr  value?: shape! }
```

`{ kind: int32  value: 7 }` reads `7` as an `int32`; `{ kind: int32  value: seven }` is a validation error at `value`. Checked at the declaration, against the flattened record, each a resolver error:

- **Position**: `kind!` is a record field's or a group member's whole type and nothing else. `[kind!]`, `box<kind!>`, `( kind! | text )`, `{kind! => text}`, `x => kind!` and `kind!?` are parse errors; the canonical form declared (`x => !meta.dependent { on: kind }`) or written in place at any other slot is a resolver error. `kind!` is no data grammar: in a data document or a construction's payload it is a parse error.
- **The sibling is declared before** the dependent field — inherited fields come first, so a base's sibling serves a subtype's dependent field.
- **The sibling names a type**: typed by a reference whose `of` is a constructor or `meta.top`, past its alias hops (`meta.type_ref`, `meta.ref<C>` over a constructor, a refinement of one), or by the type-slot choice `meta.type_expr`, whose other variant is a type written in place. `int32`, a reference naming values (`meta.ref<method>`) and another dependent field are refused. There is no path through a value (`exchange!.request` is not grammar); a body tied to its exchange is a parametric envelope applied once per exchange.
- **The sibling is there whenever the dependent field is**: required, defaulted, pinned, or a member of a field group with the dependent field optional. Optional with no default, or voidable, is refused.
- **Its pin or default names a type a value can be read against** — not a parametric record.
- **The dependent field** is never voidable, carries no default or pin, and is restated only as itself (a restatement may make it required; pinning the sibling is what fixes its type).
- A sibling may be a discriminator; removing a sibling (§7) must remove its dependent field too.

In data the type is known from a pinned sibling, a discriminator, or a free sibling written **before** the dependent field (or its default): a dependent field written before a free sibling with no default is a validation error. A free sibling hands the choice of type to the document's author — every type of the closure for `meta.type_ref` — so a schema for untrusted input pins it, makes it a selector, or narrows the reference. In a schema document, a dependent field in a value entry holds its value as written and is judged when the schema links.

## 3. Type expressions and types written in place

One form per container, legal at every type position. Arrays: `[T]`, `[T; N]`, `[T; N..M]`, `[T; N..]`, `[T; ..M]`; bounds are non-negative decimal integers, never a parameter. `[T; 0..]` is an error (write `[T]`); `[T; N..N]` is the same as `[T; N]` (prefer `N`). `min_items <= max_items` is checked at load. A count facet admits any `numeric.count` (0 to 2⁶³−1).

Tuples need two or more positions; a position may be voidable, `T?` (the slot is still mandatory — a short tuple is a validation error; write `_`). For a tail that may be left off use `[T; 1..]`. A one-position tuple has no bracket spelling (`[T]` is an array) and is declared: `one_text => !meta.tuple [{ element_type: text }]` admits `[a]`, and `voidable: true` on the element admits `[_]`.

Maps: `{K => V}`, one entry only; the key is a name — never an application, a paren, bracket or brace form: declare and name a composite key type (`method_ref => meta.ref<method>`, then `{method_ref => V}`). `?` is legal on the value side only. No annotations inside the sugar braces. A map is unordered unless it says otherwise; `!meta.map { key_type: K  value_type: V  ordered: true }` makes entry order part of its value. Sets (`set<T>`) may be empty; a non-empty one is a named completion, `tag_set => !meta.set_type { element_type: T  min_items: 1 }`.

**A type slot holds a name or a type written in place.** A field's type, an array's element, a map's value, a tuple position and a choice variant are typed by the kernel's `meta.type_expr`, `( meta.type_ref | meta.type_inline )`. A form at a slot is its construction, held where it stands: `tags: [text]` is `type: { of: !meta.array { element_type: text } }`. Nothing is lifted to an entry and nothing is named for its content. What may be written in place:

- a container, a tuple, a choice or a reference, an applied constructor (`meta.map<text int32>`), or a completion of an incomplete entry (`set<text>`, `nonempty<uuid>`);
- **a record**, `at: { x: int32  y: int32 }` — at a field's type, a group member's, an element, a map value, a tuple position or a variant; it holds fields, groups, annotations, dependent fields and further types written in place, and is judged as a declared record is;
- an application of a parametric record, which closes in place to the record it substitutes to (`parametric-records.md`);
- at a record field's type alone, a dependent type (§2).

**Never written in place**, each declared and named: an atom refinement or construction (`!integer ^ { min: 0 }`, `!enum [A B]` — a parse error at a type slot), a namespace type (`f: meta.namespace<meta.identifier method>` is refused), `meta.declared`, and composition or subtraction (`at: point & { z: int32 }` is a parse error; declare `point_3d => point & { z: int32 }`). Nothing is written in place where only a name stands: a map's key, an argument, a parameter's bound, an alias's target, a reference's `of`.

**A type written in place is no entry.** It has no name, carries no `chain` and no `parameters`, IS-A nothing, is named by no tag and is a member of nothing. Its identity is structural: two equal types written in place are one type, and a name and a type written in place are never one type — over `text_list => [text]`, an inherited `tags: text_list` is not restated as `tags: [text]`. A value at a position typed in place carries no tag naming the type. An abstract record written in place is empty (nothing can name it as a parent), so a required field typed by one is refused. A record that something must name — a tag, a family member, a recursion, an import — is declared.

**A declaration naming an application is that application's entry.** `bx => box<text>` resolves to the substituted record under `bx`, `@meta.application:{ head: box  arguments: [text] }` on its key. `f: box<text>` at a slot is the same shape closed in place with no name, and is never looked up to `bx`: two types of one shape. A data document reaches a generic type only through such a declaration, since no value carries an argument list.

## 4. Constructor application, value entries, open construction, value refinement

`!T value` is always **an instance of `T`**, in a schema as in data; what the entry *is* follows from `T`:

- **`T` a constructor** — `meta.top` or an entry that IS-A it, not abstract (so not `meta.top`, `meta.type`, `meta.atom`, `meta.product`, `meta.sum`): `meta.enum_type`, `meta.array`, `meta.map`, `meta.tuple`, `meta.choice`, `meta.namespace`, `meta.alias`, `numeric.integer_type`, `unicode.text_type`, `binary.bytes_type`, `net.uuid_type`, a constructor the schema declares itself… The entry is a **type**. Construction transfers kind only; no IS-A. Founding a new family with an atom constructor is legal but rarely what you want. An alias of a constructor is applied as its target is (`list => meta.array`, then `!list { element_type: text }`).
- **`T` an incomplete entry** — `enum`, `meta.set_type`, one the schema declares: the construction **completes** it (below), and the entry is a type.
- **`T` an ordinary type** — a record, a namespace type: the entry is a **value entry**, read against `T` as data is (`orders => !interface { … }`, `create_order => !operation { … }`). Nothing can be typed by it, no reference over a constructor admits it, and a `meta.ref<T>` slot names it (§12). A reference slot in a value body holds one bare name, never a `{ … }` record or an application (name the application, `bt => box<text>`, then `request: bt`).
- **`!schema { … }`** (or `!meta.schema { … }`) as an entry is a **nested schema map**: its members are entries named by path (`geo.address`), §12.

**Open construction — `!C ^ { values }` over a constructor.** The form constructs `C` and leaves it open: the body writes some of `C`'s fields and leaves at least one required field absent, and the entry is an **incomplete entry** — no type and no value, carrying no chain, not written in resolver output. A body writing every required field is refused (that is `!C { … }`).

```
nonempty   => !meta.array ^ { min_items: 1 }
array_min  => !meta.array ^ { min_items: 10 }
max_things => !array_min ^ { max_items: 5 }
by_name    => !meta.map ^ { key_type: text }
```

- **Written further** with `!X ^ { values }`: the result is another incomplete entry, IS-A nothing. A field `X` has written is written once — restating it, even to the same value, is refused; to narrow it, complete `X` and refine that type.
- **Completed** by `!X { values }`, `!X value` (positional, one required field absent) or `X<A …>`, the arguments filling the argument slots `X` left absent in declaration order: `tags => nonempty<text>` is `!meta.array { element_type: text  min_items: 1 }`, `counts => by_name<int32>` is `{text => int32}`. The result is the constructor's construction over both bodies, no supertypes, no relation to `X`; a declared completion carries `@meta.completion:{ of: [nonempty] }` on its key. Coherence is judged at the completion: `array_min` and `max_things` load, and `max_things<text>` is refused (`min_items` 10 above `max_items` 5).
- **Named only** before `^` and as a completion's head; an alias of one is another name for it. Named where a type is — a field's type, a variant, an argument, a bound, an `&` operand, a reference's `of`, an annotation — it is a resolver error naming its absent fields; as a data tag (`!enum`, `!set`), a validation error. The kernel's `enum` (`!meta.enum_type ^ { name_type: meta.identifier }`) and `meta.set_type` (`!meta.array ^ { voidable: false  ordered: false  unique_items: true }`, with `set` its alias) are incomplete entries: a field holding an enum *type* is `meta.enum_type`, and one holding array types `meta.ref<meta.array>`.
- **Where it is the right form**: a construction you want filled differently at each use — a sized or flagged container (`nonempty`), a map with a fixed key type. A constructor *derived* from another, whose instances are types, is a composition instead: `list_type => meta.array & { ordered?: = false }`.

**An application of a constructor constructs it.** `C<a₁ … aₙ>` over a constructor is `!C { f₁: a₁ … }`, `f₁ …` being its **argument slots** — required fields with no default or pin that hold a type, in declaration order: `meta.array<text>` is `[text]`, `meta.map<text int32>` is `{text => int32}`, `meta.ref<method>` is `!meta.ref { of: method }`. Each argument is judged by its slot's `of` and not followed through an alias (`meta.array<user_id>` is `[user_id]`). A construction leaving another required field unwritten is refused (`meta.enum_type<meta.identifier>`, `members` unwritten).

`!I ^ { values }` over a value — **value refinement**. `I` must be, past its alias chain, a value whose type states refinement rules: an atom-family **instance** (`integer`, `text`, `int8`, `date`, a refined atom of your own), one of the kernel's reference instances (`meta.type_ref`), or a type a collection constructor built (`tags => [text]`, a namespace type). It establishes IS-A `I`; facets merge over `I`'s. The body is data (`size: { bits: 8  signed: true }` binds a nested value); a bare value, a second `!`, an annotation, or a map in body position is a parse error. Over a record, a tuple, a choice or a namespace *value*, `^` is refused, a record's diagnostic naming `R & { … }`. `^` follows `!name` alone: `person ^ { … }`, `meta.array ^ { … }` and `box<text> ^ { … }` are parse errors.

Kinds: a constructor's chain reaches at most one base kind (`meta.atom`, `meta.product`, `meta.sum`), each counted only as the kernel's entry; two are refused as a diamond. `!C {}` is of the base kind `C` reaches.

Category errors in data mirror this: `!numeric.integer_type 42` and `!age { min: 0 }` are both type errors — constructors type constraint records, instances type scalars.

### The three spellings of "like `uuid`"

| Spelling | Example | What it buys |
|---|---|---|
| alias | `id => uuid` | one type under two names; a hop, resolved but not rewritten |
| refinement | `id => !uuid ^ {}` | a **new** type that IS-A `uuid` — the empty refinement is legal and is the nominal-subtype spelling |
| fresh instance | `id => !net.uuid_type {}` | a new atom family with **no** relation to `uuid` |

## 5. Value refinement `^` — the facet kinds

`!I ^ { values }` copies a value, tightens it, keeps IS-A `I`. Only fields `I`'s type declares may be written. Each facet tightens by its kind:

| Facet kind | Examples | Rule |
|---|---|---|
| ordered bound | `min`, `max`, `min_length`, `max_items`, exclusive bounds | may only move inward |
| step | `multiple_of` | strictly positive; tightens only to an integer multiple (`15` under `5`) |
| permission | `allow_nan`, `allow_infinity`, …, `allow_relative`, `allow_fragment`, `allow_idn`, `allow_parameters`; on a collection `unique_items` (to `true`) and `voidable` (to `false`) | granted → withdrawn only (`allow_parameters` is withheld by default, so only a fresh instance grants it) |
| member set | enum `members`, numeric `members`, a URI's or IRI's `schemes`, a media type's `types` and `suffixes` | subset only, compared by the family's value identity |
| settable once | `unicode.text_type.pattern`, `unicode.text_type.members`, `net.uuid_type.version` | set where the source left it unset, or restated verbatim; never changed |
| fixed at construction | `normalization`, the identifier profile facets (`start`, `continue`, `start_add`, `continue_add`, `medial`, `exclude`), an enum's or a record's `name_type`, a collection's `ordered` and type slots (`element_type`, `key_type`, `value_type`) | pinned where the type is constructed; a refinement restates it or leaves it alone, never sets or moves it — a different one is a fresh construction |
| selector | `size`, `component`, `format`, `encoding` | only along the family's own narrowing relation: a width chain for `size` (`!int8 ^ { size: { bits: 16 } }` widens and fails), a partial order for `component`; `encoding` never moves |
| reference `of` | `!meta.type_ref ^ { of: unicode.identifier_type }` | narrows to a type IS-A the source's |
| grid | `fraction_digits` on `time`, `datetime`, `duration` | an ordered bound on the value's resolution (`!datetime ^ { fraction_digits: 3 }`), at most 9 |

Every facet value is read by its declared type at load — a bound on `numeric.decimal_type` is a `number`, on `temporal.date_type` a `date` (`type-families.md`) — so a value the family refuses is a resolver error before any tightening rule is consulted. Each rule is judged against the source's effective value, its default where it wrote none.

**Collections refine too.** Over `tags => [text]`, `some_tags => !tags ^ { min_items: 1 }` IS-A `tags`; `!tags ^ { element_type: uuid }` and `!tags ^ { ordered: false }` are refused (another element type or order is another construction); over `label => text`, `!tags ^ { element_type: label }` restates the slot, an alias being its target. A namespace type refines the same way: `small => !api ^ { max_items: 3 }` IS-A `api`. The sugar itself takes no `^` (`{text => text} ^ { … }` is no form): use the size specifier, `{text => text; 1..}`, or refine a declared map.

## 6. Composition `&` — restating a field

`A & B & { body }` — the trailing body is optional. `&` is the one way to derive a record, and so the one way to declare a constructor. Parents must contribute **disjoint** field names (a field reaching the result through two paths — even from one origin — is an error). Body entries matching an inherited field **restate** it; others are new fields, appended after all inherited fields. Field order: parents left to right, each in declared order, restated fields in place.

```
config     => { host: text  port?: integer ~ 8080  debug: boolean }
production => config & { host?: = "prod.example.com"  port?: = 9090 }
```

**A misspelt restatement is a new field.** `person & { agee: adult }` adds `agee` and loads; only a modifier-only entry (`agee?: = 3`) is refused for naming no inherited field. Check every restated name against the parent.

Field facts move along three orders, and a restatement is valid exactly when **no question moves backwards**:

- **omission** — nothing (`a?: T`) → required (`a: T`) → injected (`a?: T ~ v` / `= v`);
- **voidable** — true (`T?`) → false (`T`);
- **role** — FREE → DEFAULT → FIXED.

So `a: T` → `a?: T ~ v` is fine (required → injected); `a?: T ~ v` → `a: T` is refused (a default is not removable); `a?: T?` → `a?: T` and `a?: T` → `a: T` are fine, each reverse refused. `a?: T? ~ v` reaches a pin only as `a?: T = v`, since a pin on a voidable type is refused. A marker `a: T = v` may be relaxed by a subtype to `a?: T = v`. A restatement may change a **default**, never a **pin**. A restated field's type must be the inherited type or IS-A it (or `void` at a voidable position) — `[int8]` restating `[int32]` is refused, no IS-A edge joining them, and a type written in place restates only an equal one. Narrowing a voidable field to `void` — `a?: void?` — is the IS-A-preserving way to forbid a field's value while keeping it in the contract. The same rules hold in a constructor's body: `list_type => meta.array & { ordered?: = false }` moves a default to a pin. The composed body re-emits the whole inherited field set, so resolver output is self-describing.

Operands are named: a name, or an application of a parametric record, absorbed by value (`dog => pet_of<dog_type> & { … }`, `ok => <T> result<T> & { note: text }`; `parametric-records.md`). No inline form precedes `&`, no parameter (`<T> T & { … }`), no parametric record named bare, no constructor's application (`meta.array<text>` has no fields), no extern, and no incomplete entry. Composing onto a **FINAL** parent is a resolver error, and so is composing parents with different name types (§2). A restated **group member** stays a member, in its own option; a `?` on its name is the in-option mark, which a restatement may drop and may not add.

**Constructorness is inherited through composition**: an entry composing with something IS-A `meta.top` — `meta.atom`, `unicode.text_type` — is a constructor, in any schema whose closure holds the kernel. A record mixin such as `atom.specification` lends vocabulary without conferring it, and `box => <T> base & { value: T }` over a plain record is a parametric record, not a constructor. A constructor composing a base kind directly declares a new *form*, which a processor must back with a reader; prefer refining or composing one it already backs (`extending.md`).

A restated field's annotations are the restatement's own, in source order, followed by the inherited field's — a restatement adds and never removes.

## 7. Subtraction `-`

`head - { f1 f2 }` on a construction head (bare source, or `&` chain with or without body). Order: merge supertypes (disjointness still enforced — subtraction cannot mend a diamond), apply body, then remove. Rules: whitespace before `-` is mandatory (`account- {` absorbs the hyphen); removing a nonexistent field is an error; removing a field the same body adds is an error; the body may not tighten a removed field; the removal set is non-empty by grammar; removing a dependent field's sibling must remove the dependent field too; removing a group member takes it out of its option, an emptied option leaves the group, and a group the declaration rules would then refuse is rewritten as the spelling it equals (a lone one-member option dissolves into a plain field taking the group's `optional` as its name's mark). Result: a record with an empty chain — not substitutable for the source, and nothing records what it was subtracted from. A subtraction headed by a constructor is no longer one; a parameterised one declares a parametric record with no parents.

`- { f }` removes; `f?: void?` forbids the value while keeping the contract. Choose by whether substitutability matters. Subtraction is admissible on a **FINAL** record — it mints no IS-A edge, which is all FINAL constrains.

## 8. Record extension and sealed families

A record may carry one **definition mark** between `=>` and its record definition — braces, a composition or a subtraction, before a parametric record's `<…>`:

```
pet     => abstract { name: text  age: integer }
dog     => pet & { breed: text }
leaf    => final { id: uuid  payload: bytes }
```

- **OPEN** (no mark, the default) — direct instances; anything may compose onto it.
- **ABSTRACT** — no direct instances. A position typed by it admits exactly its subtypes, and the tag is **required** there (`!dog { … }`); a tag naming the base itself is refused.
- **FINAL** — direct instances, no subtypes: `&` naming it is a resolver error, here or in any importing schema. `-` stays admissible.

The mark is never inherited (`dog` is OPEN), and it lowers into the kernel's `meta.record.extension`. A mark before anything but a record definition is a parse error: before `!` (`abstract !meta.record { … }` — the kernel's form states `extension: ABSTRACT` itself), a name, a declared application (`x => abstract box<text>`; write `abstract box<text> & {}`), a sugar form or a choice. An abstract base with no subtype in its own schema is legal — importers supply members.

**The selector `=?`** makes a *discriminated* family, where a value is placed by a field it carries rather than by a tag (OpenAPI's `discriminator`, a sealed interface):

```
pet => abstract { pet_type: text =?  name: text }
dog => pet & { pet_type: = "dog"  breed: text }
cat => pet & { pet_type: = "cat"  indoor: boolean }
```

`=?` reads *pinned, but not here — the members pin it*, and implies ABSTRACT (`abstract` beside it is allowed; `final` is refused). The kernel's form states both: `!meta.record { discriminators: [pet_type]  extension: ABSTRACT … }`, `discriminators` beside any other `extension` being refused. Checked at load:

1. the marked field is typed by an atom-family instance or an enum, its name unmarked, its type not voidable, not a group member, not a dependent field (it may be a dependent field's sibling), and it carries no value;
2. every subtype, transitively, restates it FIXED (`pet_type: = "dog"` or `pet_type?: = "dog"`);
3. the pins are pairwise distinct **as values** (`= 255` and `= 0xFF` collide; text pins compare in the field type's normalization form) — as tuples, in declaration order, where several fields are marked.

**A family is judged over the closure that holds it.** An importing schema may add members; one that adds a member failing to pin, or colliding with an imported one — or that merely imports two schemas whose members collide — is refused, in the importing schema, with both origins named.

At a position typed `pet`, data is placed by reading `pet_type` and matching the pins; the tag becomes optional and, if written, must agree. A family discriminates one level. The marked fields lower into `meta.record.discriminators`: present means the members are selected by those fields, absent means by the tag. The base cannot pin the field itself — a pin never changes, so no member could then pin its own.

**A member is declared.** A record written in place, or an application closed in place, is a member of nothing: an application at a type slot whose record would be IS-A a declared type (`k: dog_of<text>` over `dog_of => <T> pet & { … }`) is refused; declare `dogs => dog_of<text>`, then `k: dogs`. A family over a parametric record is an abstract base, the parametric record composing it, and members composing its declared applications (`parametric-records.md`). A mark or selector on a parametric record is each application's.

## 9. Choice types and disjointness

`(A | B | …)`, two or more variants, each a distinct type; no variant may resolve to `void`. Every choice records a derived `disjoint` fact — a `disjoint` field in the `!meta.choice` body, never written by a declaration — by **discrimination class**:

| Class | Types |
|---|---|
| boolean | `boolean` |
| number | every numeric family |
| string | every text family — `text`, identifier families, `uri`/`uri_reference`, `iri`/`iri_reference`, `regex`, `email` — and `uuid`, temporal, `bytes`, network (`hostname`, `host`, `media_type` included), references (`meta.type_ref`, `meta.ref<…>`), and their refinements |
| brace | records, maps |
| bracket | arrays, tuples |

An enum takes its members' shared class (`[true false]` boolean, `[A B]` string); a text member set (`!text ^ { members: ["80" "443"] }`) is string-class, so `( ports | integer )` is disjoint. `meta.identifier` is string-class, so `( meta.identifier | int32 )` is disjoint and `( meta.identifier | text )` is not. `rational`, `complex`, **a float still admitting NaN or infinity** (`float32`/`float64` as declared), **a map whose key is not an atom or enum**, a nested choice, `meta.declared`, and unresolved or cyclic aliases have **no** class and make the choice non-disjoint. So `( float64 | text )` needs tags unless the float narrows `allow_nan` and `allow_infinity` to false — the same in every encoding. Disjoint iff every variant has a class and none repeats. Value-set separation (disjoint ranges, patterns, enum members) does **not** count.

**Variants written in place.** A variant is a name or a type written in place (`( [text] | integer )`). A tag can only name a name, so **a choice that is not disjoint names every variant**: `( [text] | [int32] )` is refused; declare `texts => [text]`, `ints => [int32]`, then `( texts | ints )`. Two variants reaching one entry (an alias and its target, two externs of one type) are refused.

**Nested choices nest one deep.** A variant that is a choice must be disjoint: over `narrow => ( int32 | text )`, `( boolean | narrow )` loads and `!narrow 5` reads `5` there as the number; over `either => ( a | b )` (two records), `( text | either )` is refused — list the variants, `( text | a | b )`. A choice holding a choice is not disjoint, so it is no variant of a third.

**Tags.** A tag names a variant, or a type that IS-A exactly one variant: at `item => ( text | shape )` with `shape` abstract and `circle => shape & { r: integer }`, `!circle { … }` selects `shape` and validates as a `circle`, and `!shape { … }` is refused as at any abstract position. A variant the tag names is selected before one its type only IS-A; a tag IS-A two variants and naming neither is a validation error. The tag is optional only when the choice is disjoint; otherwise a missing tag is a validation error. Emitter rule: if two variants share a class, tag every value; at a disjoint choice write each untagged value in its variant's form (a text `42` quoted). `@meta.disjoint` on the declaration asserts the derived fact and fails the load if false.

When the tag would be mandatory, prefer a single-group record (§10) — label discrimination needs no tag and permits same-typed alternatives. A choice has **no discriminator field**: for records told apart by a member they carry, type the position by an abstract base with a `=?` selector (§8) instead of a choice over the members.

## 10. Field groups

```
( a: T | b: U | c: V )                    exactly one of a, b, c
( a: T | b: U )?                          at most one
( email: E | phone: P )+                  at least one
( host: H  port: P | socket: S )          host and port together, or socket
( include: I | name?: N  type?: T )       include alone, or at least one of name and type
( b: B  a?: A )?                          a requires b; b may appear alone
( a: A  b: B )?                           both or neither
```

A group lists **options** separated by `|`; an option holds one or more members, separated as fields are. Three rules decide validity: an option is **chosen** when any of its members is present; a chosen option must contain every member whose name is not marked `?` (a `?` on a member's name makes it optional *within its option*); and a bare group admits exactly one chosen option, a `?` after the `)` at most one. `)+` is sugar for "at least one of": `( a: A | b: B )+` lowers to the one-option group `( a?: A  b?: B )`, and is allowed only where every option is a single unmarked member.

**Each presence rule has one spelling**, and a group that restates plain fields or another group is refused at load: the only member of an option takes no `?` (`( a?: A | b: B )` is `( a: A | b: B )`); a written one-option group is `?`-marked, with two or more members and at least one unmarked (`( b: B  a?: A )?`) — bare with an unmarked member it is plain fields, bare with every member marked it is what `+` writes, and `?`-marked with every member marked it is optional fields; `+` takes only single unmarked members. Groups do not nest, and a field sits in one option of one group.

Members are `name: type`, `name?: type` or with a voidable type (`name: type?`) — no modifier, since the group answers presence and never injects. A member's type may be any type expression, a record written in place included, or a dependent type, and a member may be a dependent field's sibling (the dependent field is then optional). A voidable member written `_` is present and chooses its option. Labels share the record's field namespace including inherited fields. Resolution flattens members into fields with `optional: true` plus a `groups` entry, `!meta.field_group { members: [[host port] [socket]]  optional_members?: [...]  optional?: … }`; validation runs after field validation, reporting a chosen option's missing members, then counting. In a composition body a restated member stays a member, in its option: it may drop its `?` but not add one; its type may go voidable → not or narrow (`a: void?` leaves a member that can only be written `_`); it may take `= v` (checked, never injected), never `~ v`, never `=?`. A restated group must keep its options, labels and order, and may only go optional → required. Groups are not type expressions — `[( a: T | b: U )]` is not expressible; use an array of a named choice.

Labelled-sum idiom: a record whose entire body is one required group of one-member options, e.g. `event => { ( created: datetime | modified: datetime | accessed: datetime ) }`, instance `{ modified: "2026-05-21T13:05:00Z" }`; where an option holds several fields, the variant it lowers to is record-shaped.

## 11. Annotations in schemas

An annotation names a type of the **annotating document's one namespace**, resolved from the root — for a schema document, its own entries and its import closure; for a data document, the closure its `!!import`s bind. There is no separate annotation namespace: an annotation a schema declares is usable on the schema's own declarations and in the data documents that import it alike.

| From | Annotations |
|---|---|
| `meta.tn` | `@doc` (root), `@meta.annotation`, `@meta.disjoint`, `@atom.ordering`, `@atom.bounded`, `@atom.exact`, `@atom.numeric`; the resolver's `@meta.application` and `@meta.completion` |
| `core.tn` | `@title`, `@comment`, `@examples`, `@deprecated`, `@read_only`, `@write_only` |
| your schema | anything you declare: `expires => @meta.annotation text`, `internal => @meta.annotation void` |

`@doc` is CommonMark 0.31.2 (no extensions, raw HTML never executed); `@deprecated`, `@read_only`, `@write_only` are bare; `@examples` is a list of text. A schema importing a library without `core.tn` has no `@title` or `@deprecated` and may declare them itself.

Usage: `@expires:"2026-12-31"`; `@internal` (bare — shorthand for `@internal:_`). A bare annotation is valid only against a `void`-targeted type; a valued one only against a non-void type. Any type in the namespace can serve as an annotation, an extern among them; the `@meta.annotation` marker is advisory. A name at a reference-typed slot of an annotation's value is judged in the annotating document's namespace. An annotation whose name does not resolve, or names an incomplete entry, is a resolver error. An annotation typed by an abstract entry (`@meta.top`, `@meta.type`, an abstract record) is a schema error. A type annotated with itself (`note => @note:"x" text`) is a wait cycle. `@meta.application:{ head: box  arguments: [int32] }` (on a declared application's key) and `@meta.completion:{ of: [nonempty] }` (on a declared completion's key) are the resolver's; writing either is a resolver error. Placement: before the declaration name → entry metadata; after `=>` → definition metadata; before a field name → field metadata. All preserved in resolver output.

Schemas have no comment syntax; `@doc:"…"` is the way to annotate. The `;` used for commentary in the specification's listings is ABNF convention and a parse error in a real schema.

### What an annotation may do

An annotation never changes a value, its type, or its validity — a schema with every annotation erased
admits exactly the same values. Within that it may carry a **load-time check** (`@meta.disjoint`, verified
against the derived fact or the load fails — the one checked annotation), or be a representation directive
for a named class of encodings (none is declared). Facts that *do* change what conforms are grammar, not
annotations: `abstract`/`final` and `=?` (§8). So `@discriminator`, `@rest`, `@abstract`, `@final` and
`@sealed` are unresolved-name errors, and a record is closed with no exception — open-ended data goes in a
map-typed field (`extras?: {text => text}`).

**The restated-field rule:** a restated field's annotations are the restatement's own, in source order,
followed by the inherited field's, in source order. A restatement **adds and never removes**.

## 12. One namespace — what a name means where

**A document's namespace is its own entries plus every entry of its import closure — one set, consulted at every position**: a constructor head (`!C`), a refinement source, an operand, a field type, a variant, an argument, a reference's `of`, a parameter's bound, an annotation. The only lookup before it is the enclosing parametric record's parameter list. The kernel is an ordinary import (`meta.tn`, pre-loaded), reached through `core.tn` or a library or directly; a schema whose closure lacks it sees none of its names, though it may still write record and container sugar, whose desugar targets are the kernel's whatever the document imports.

- **Names resolve from the root.** A one-segment name is a root entry; each further segment selects a member of a nested `!schema` map (`geo.address`), and — for a *value's* qualified name at a `meta.ref<T>` slot — a key of a namespace value or a field of a record value (`orders.place_order`). Inside a nested map a sibling is still written `geo.address`; a bare `address` names the root's. No relative lookup, so no shadowing rule.
- **Imports are transitive and flat.** One name means one thing across the closure. The same schema reached twice (the diamond through `meta.tn`) unifies; two *different* schemas declaring one name, or a local declaration reusing a name the closure binds, fail the load — no hiding, no redefinition, no aliasing to escape with. So every closure name is reserved: under `core.tn` you cannot declare `date`, `uuid` or `title`; under `numeric.tn` alone you may declare `date`, but never `numeric` (a kernel map). Two schemas that both declare a name you need are reached through externs (§13).
- **Nested maps are open.** `geo => !schema { … }` declared by two documents of a closure is one map holding both documents' members; the kernel's own maps are open the same way (`net.tn` adds to the kernel's `net`), and a schema may add a member to one (`extending.md`). Within one document, declare a map once.
- **Merged entries keep their home resolution.** An imported entry's own references were resolved in its defining schema and are not re-resolved against the importer.
- **Order and cycles.** Declaration order carries nothing; forward references are fine. What is refused is a *wait* cycle — entries whose declarations must each be read before the other: `a => b & {}` beside `b => a & {}`, `c1 => !c2 {}` beside `c2 => !c1 {}`. A name at a reference-typed slot (a field's type, an argument) waits on nothing, so `tree => { t?: tree }` and mutual recursion are fine. Import cycles are errors, through externs too; share types through a third schema.
- **Data documents** resolve every `!tag` and `@annotation` in the namespace their `!!import`s bind, never against definitions of their own. A foreign type is used by importing its schema; no value opens a namespace.

**Value entries and qualified names.** A slot typed `meta.ref<T>` over an ordinary type `T` holds a value's qualified name; the referent is found first and judged after, and the whole walk is written:

| Written at `method: meta.ref<method>` | Result |
|---|---|
| `orders.place_order` | accepted: `orders` an `interface` entry, `place_order` a key of its map, the value a `method` |
| `orders` | refused: an `interface` value, where a `method` is wanted |
| `orders.cancel_order` | refused: no such key; the keys are listed |
| `place_order` | refused: a member is reached through its entry |
| `place_order_request` | refused: a record type, where a `method` value is wanted |
| `box<text>` | refused: a reference holds a name, never an application; declare `bt => box<text>` and write `bt` |

A map that is no namespace is not entered, a type entry admits no further segment, and no segment selects through an extern. **A quoted token at a reference position is the reference its text spells**: `"orders.place_order"` is the name `orders.place_order`, and a name is quoted exactly when a segment falls outside the token profile (`"main.public api.ping"`). Each segment is a name of the family of what it enters — `meta.type_name` at the root and at a schema map, the namespace's `key_type` at a namespace value, the record's `name_type` at a record value — and none of those admits `.`, so the split is the same whatever is entered. A segment selecting a dependent field reaches a value of the type its sibling names. Building the namespace types and value entries: `extending.md`.

## 13. Externs — one entry of another schema

An **extern** names one entry of another schema under a name of the declaring document, without importing that schema: none of the foreign schema's names enter the namespace. It is how a schema uses two schemas that each declare `order`, which one closure cannot hold:

```
!!id:"https://example.com/shipping.tn"
!!import:"https://tson.io/2026/40/m/core.tn"
!schema {
  order_v1 => !meta.extern { schema: "https://example.com/order-1.tn"  type: order }
  order_v2 => !meta.extern { schema: "https://example.com/order-2.tn"  type: order }
  envelope => { id: uuid  body: (order_v1 | order_v2) }
}
```

- **`schema`** is a reference on an `!!import` value's terms (it may carry `?sha256=`); **`type`** is the target's name in that schema, from its root (`order`, `geo.address`). Several externs under one prefix are a nested schema map of them (`v1 => !schema { order => !meta.extern { … } }`).
- **A hop.** The extern is another name for its target: its identity is the target's, every judgement through it is made of the target, and a reference admits it where it admits the target. It is no type and carries no chain.
- **What it names**: a type a value can have — a record, an atom instance, an enum, a choice, a named collection, an alias, a declared application, another extern. A parametric record, an incomplete entry, a constructor, a value entry, a schema map, or a name the foreign schema lacks is a resolver error. A schema that wants another schema's value or constructor imports it.
- **Where it stands**: wherever a type's name does — a field's type, an element, a map key or value, a tuple position, a variant, an argument, a bound, an alias target, a name at a `meta.type_ref` or `meta.ref<C>` slot.
- **Sealed.** Composing, subtracting, refining or applying it (`!order_v1 { … }`, `order_v1<text>`), and a default or pin at a field typed by it, are resolver errors, through an alias as directly. No qualified name selects through it (`order_v1.lines` reaches nothing).
- **Written, and read with the imports.** The head is written `!meta.extern`; one reaching `meta.extern` through an alias is refused. Each foreign schema joins the reference closure on an import's terms — obtained, verified, resolved first, counted by the import-closure limit, the relation acyclic — and must share the declaring document's kernel, so a schema of another revision is not externed.
- **Values.** A value at an extern position is read against the target under the foreign schema's names; the tag in front of it is the enclosing scope's. So a subtype or variant of the target is tagged only by a name the enclosing schema holds — an extern of its own (`rush_v1 => !meta.extern { … type: rush_order }`, then `!rush_v1 { … }`) — and a family meant to be read across the boundary names selectors.
