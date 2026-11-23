# Data under a schema — the text encoding rules

Part 2 §7, condensed. This is what changes in a data document once `!!import:"…"` binds a schema. For the schemaless rules see the tson-data skill.

## `!!import`

- A data document's header is an optional `!!id`, then any number of `!!import`s. There is no other directive — any other name is a parse error — and **no directive stands below the header**: a value cannot open a schema of its own.
- Each `!!import` names a schema *document*, never resolver output. Several imports form **one namespace**, the union of their closures; a name two of them declare differently is the same collision a schema would hit.
- The imports name a **namespace**, not a root type. The value names its own type: `!task { … }`. **Under `!!import` the root must name its type** — an unannotated root is a validation error in every mode.
- A document with no `!!import` is schemaless: base type resolution and the built-in vocabulary apply there and only there. A schemaless `!mac` keeps its meaning when the document moves under a schema whose closure holds `net.tn`.

## Type annotations

- `!name` = instantiation of `name`, a qualified name resolved from the root of the bound namespace (`!order`, `!geo.address` for a member of a nested schema map) — never against definitions of the document's own. The built-in vocabulary is off: `!uuid` works only because the closure holds `net.tn` (as `core.tn` does), `!date` only with `temporal.tn`, `!int32` only with `numeric.tn`. A tag carries no argument list; a generic type reaches a tag through a name a declaration gave it (`bx => box<text>`, then `!bx`).
- **Records are closed, with no exception**: any field not declared by the record's type is a validation error, whether the record is annotated or sits at a typed position. Open-ended data lives in a declared map-typed field.
- **Field names are judged by the record that reads them**, under its name type: matched against the declared names in the name type's form (under a case-folding name type `Content-Type` is the field `content-type`, and both spellings in one record are a duplicate), a name that is no value of it being an unrecognised field. A document that imports a schema has its field names judged by that schema alone, so `{ "@id": x }` is fine wherever the record declares `"@id"`.
- Type-expression syntax is unavailable in data: annotate an array or map with a *named* type (`int_list => [integer]`, then `!int_list [1 2 4]`).
- **A type written in place is named by no tag.** A value at a position whose type is written in place (`tags: [text]`, `f: page<order>`, `at: { x: int32 }`) carries no tag naming the type, and a tag there is a validation error; the value is read by the type's own form.
- `!T value` validates by what `T` is: an atom instance validates one token (`!age 42`, never `!age { … }`); a record type validates a record; a choice admits any conforming variant; a constructor (`!numeric.integer_type { min: 0 }`) validates a *constraint record* — that is what resolver output is. `!numeric.integer_type 42` and `!age { min: 0 }` are type errors. A tag naming a **value entry** (`!orders`), an **incomplete entry** (`!set`, `!enum`) or a **parametric record** (`!box`) is a validation error: none is a type.
- **Subsumption**: at a position typed `T`, `!S value` is admitted iff `S` is `T` or `T` is in `S`'s `chain.supertypes` (IS-A — composition and refinement chains; a subtracted type has none). The value then validates as `S` in full. What an *untagged* value means depends on `T`'s extension:
  - `T` OPEN or FINAL — the value is exactly `T`; there is no structural recovery of a subtype.
  - `T` ABSTRACT with no selector — the tag is **required**; an untagged value, or a tag naming `T` itself, is a validation error.
  - `T` ABSTRACT with `=?` selectors — the reader reads the selector fields at `T`'s types, matches the value (or tuple) against the members' pins, and validates the whole value as the matched member. A missing selector or unmatched value is a validation error; a tag is optional and, where written, must name the matched member or a subtype of it.
- A family built over a parametric record is used through its abstract base (`pet => abstract { kind: text =? … }`, `pet_of => <T> pet & { pet: T }`, `dog => pet_of<dog_type> & { kind?: = "dog" }`): the position is typed `pet`, and a value is placed by its selector or tagged `!dog`.

## Reference-typed positions

A field typed by a reference holds a **name**, never the thing named:

- at `meta.type_ref` or a `meta.ref<C>` over a constructor, a type's name, judged a member of the document's closure: at `kind: meta.ref<net.uuid_type>` write `kind: stock_id`, never a UUID; at `request: meta.ref<meta.record>`, `request: person`, never a person;
- at `meta.ref<T>` over an ordinary type, a value's qualified name: `method: orders.place_order`, walked over the namespace the document's imports bind; a name reaching nothing, a type, or a value of another type is a validation error;
- **never an argument list**: `<` and `>` have no role in a data value, so `pair<text integer>` is a parse error. A generic type is written by the name its schema declares for the application (`text_pair => pair<text, text>`, then `text_pair`); a type no declaration names is named nowhere in data, though a value at a position it types is written untagged;
- **quoting is spelling**: a quoted token there is the reference its text spells, so `orders.place_order` and `"orders.place_order"` are one name. Write it unquoted unless a segment holds a character outside the token profile (`"main.public api.ping"`). The same holds of a type's name in a type value written as data, `!meta.array { element_type: "text" }`;
- `kind!` is schema grammar; in a data document it is a parse error. A type value read as data writes a dependent type in full, `{ type: { of: !meta.dependent { on: kind } } }`.

**Dependent fields.** At `setting => { kind: meta.type_ref  value?: kind! }`, `{ kind: int32  value: 7 }` reads `7` as an `int32`. Where the sibling is free (neither pinned nor a discriminator), **write it before the dependent field** — the one place field order matters in TSON text; a dependent field written first is a validation error naming both. A pinned or discriminating sibling orders nothing.

## Atom positions

Base type resolution **does not apply under a schema at all** — not merely at typed positions. `true`, `false` and `42` mean whatever the position's type says; `twelve` at an `integer` field is a parse error of the atom (`ATOM_FORM_INVALID` in the Java CLI), `300` at `age` is a validation error. The root names its type or the document is invalid; there is no "legal but vocabulary-only" root.

**There is no `null`.** `void` admits `_` alone, and a bare `null` is the string `null` — so it satisfies a `text`-typed position and nothing else.

Enums: the token's decoded text, put into the name type's normalization form, must equal a member; the form is not consulted, so `"true"` and `true` are one value at `boolean`. `boolean`'s members bind to host booleans and every other enum's to host text; a host-language enum is a mapping the binder owns (`in-progress` → `IN_PROGRESS`), since no host guarantees a member is a legal constant.

Text: a value is its token put into the type's `normalization` form, and every facet and comparison judges that value. Under a folding type `Content-Type` and `content-type` are one value — one map key, one set member — and a round trip writes the folded form. A refusal quotes the token as written, then the value it was judged as. A value typed by an identifier family is a name, under name hygiene.

Facet values in a schema (`numeric.decimal_type.min`, `temporal.date_type.max`, …) are typed by their family and read at schema load, never per validation.

## Sets

`[ … ]` syntax; set-ness is declared (`set<T>`, `!meta.set_type { … }`, enum members). A repeated element is a validation error at the repeated occurrence. **Equality is over the element type's value space, not its lexical space**: two spellings of one value are one element, so `bytes` compares octets whatever the alphabet and `datetime` the instant whatever the offset. For a set of records, arrays, maps or choices, duplicates are whatever the processor's host equality relates (at least textual identity) — key a set by an atom where portable detection matters. Element order carries no meaning in data; resolved output keeps source declaration order. `_` elements are rejected. **A set may be empty**: `set<T>` admits `[]`, and only a type stating `min_items: 1` refuses it. A set's `ordered` is pinned `false`; an array is `ordered` and a map is not unless it says otherwise, and in every case output keeps the order written.

## The void sentinel `_`

| Position | `_` permitted? |
|---|---|
| array element | only under `[T?]`; a void element occupies a slot and counts toward size |
| tuple position | only where the position is voidable, `T?`; the slot must still appear (`[a, _]` ok; `[a]` is a validation error) |
| record field | only where the field is **voidable** (`?` on the type: `a: T?`, `a?: T?`, `a?: T? ~ v`); the field is then present with a void value. Anywhere else a validation error — at `a?: T ~ v`, omit the field to get the default injected. A dependent field and its sibling are never voidable |
| field group member | only at a voidable member (`( a: T? \| b: U )`); `_` is then present and chooses that member's option |
| map key | never (resolver error) |
| map entry value | only under `{K => V?}`; the entry is present with a void value and counts toward size. A namespace value's entries are never void |
| type positions in a schema | never (parse error) |
| field modifier | never — `~ _` and `= _` are refused; write `a?: void?` |

## Defaults and fixed values on read and write

An omitted field whose name carries `?` and which has a value (`a?: T ~ v`, `a?: T = v`) is **injected** into decoded output; one without a value stays missing; an omitted field whose name is unmarked is the missing-field error — including a marker `a: T = v`, which the document must write. Group members are never injected. At `a?: T? ~ v`, `_` is void and a missing key is *the default*. A written value at a FIXED field must equal the fixed value — a decoder must report a contradiction, never overwrite it.

Encoders should write defaults out; omitting a field equal to its default is a lossless size optimisation. An encoder holding the schema **must** write a void value as `_` at `a: T?` and at `a?: T? ~ v`; one without the schema omits the field, which is right everywhere else.

## Typed key equality and empty braces

Map keys are decoded by the declared key type, so keys equal under an atom key type are duplicates (`1` and `1.0` under a `number` key, `Content-Type` and `content-type` under a case-folding text key → validation error at the second); under a compound key type, host equality decides. The keys of a map keyed by an identifier family are names, and a look-alike scope. `{}` at a record- or map-typed position is the empty record or map (then the map's `min_items` applies); at an array, tuple, atom, or non-brace choice position it is a validation error (wrong form — arrays are `[]`).

## Choices in data

Write `!variant value`. Omit the tag only when the choice is disjoint (every variant a different discrimination class — and a float admitting NaN/infinity, a compound-keyed map, a nested choice or `meta.declared` has no class); otherwise a missing tag is a validation error. A tag is never wrong. At a disjoint choice an untagged value is read in its token's class, with no fallback: `42` at `( int8 | text )` is the number, `"42"` the text.

- **A tag names a variant, or a type that IS-A exactly one variant.** At `( text | shape )`, `shape` abstract, `!circle { … }` selects `shape` and validates as a `circle`; `!shape { … }` is refused as at any abstract position. A tag whose type IS-A two variants and names neither is a validation error.
- **A nested choice is tagged by its own name**, and its value read there untagged: at `( boolean | narrow )` over `narrow => ( int32 | text )`, write `!narrow 5`. A value carries one tag.
- A variant written in place (`( [text] | int32 )`) has no name, so it is selected untagged alone; a choice that needs tags names every variant.

## Declared positions: `meta.declared`

`meta.choice` is the *closed* sum; the kernel's `meta.declared` is the *open* one. A value at a position typed `meta.declared` names its own type by its tag, among **every type of the reading document's closure**, and is validated in full against it:

```
attachments => { items: [meta.declared] }
```

```
!!import:"https://example.com/attachments.tn"
!!import:"https://example.com/insurance/claim.tn"
!attachments {
  items: [
    !insurance_claim { claim_id: CLM-5678  amount: 450.00 }
  ]
}
```

- **A value naming no type at a declared position is a validation error** — `meta.declared` is not "any": it is "any type the closure holds, named".
- A foreign type is admitted by **importing its schema** — into the schema that declares the position, or into the data document itself, whose namespace is the union of its imports — or by an **extern** the schema declares (below). No value names a schema of its own: a directive at a value position is a parse error.
- Where only a few types are meant, a choice over them says so and is checked at load.

## Extern positions: a foreign value's scope

A schema names one entry of a schema it does not import with an extern, `order_v2 => !meta.extern { schema: "https://example.com/order-2.tn"  type: order }`. A value at a position typed by one is a **foreign value**, read against the target under the foreign schema:

```
!!import:"https://example.com/shipping.tn"
!envelope {
  id: 9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f
  body: !order_v2 { sku: A  payment: !card { number: "4111" } }
}
```

- **Inside the value, every name is the foreign schema's**: tags, annotations, names at reference-typed slots, tags at declared positions. `!card` above is `order-2.tn`'s `card`, whatever the reading document's namespace holds under that name. Write the body exactly as in a document importing the foreign schema.
- **The tag in front of it is the enclosing scope's.** It names the extern, or a name of the enclosing scope reaching the target or a subtype of it — usually another extern (`rush_v1 => !meta.extern { … type: rush_order }`, then `!rush_v1 { … }`). The foreign schema's own name (`!rush_order`) is unresolved at the boundary.
- An untagged value, or one tagged by the position's own extern, is the target itself: placed by its selectors where it is abstract and names them, and refused where it is abstract and names none.
- Scopes nest (a foreign schema's own externs open scopes inside its values) and are set by the schema, never by the data. Limits, policies and name hygiene run across the boundary as within one document, and a diagnostic inside a foreign value names the foreign schema and the extern.

## Error categories at this layer

- Parse errors: a directive past the header or under any name but `id` and `import`, a directive at a value position, `<` or `>` in a value (an argument list), `kind!` in a data document, malformed values, and a token an atom's parser refuses (`twelve` at `integer`, a leap second at `time`, `ü` under `uri`). (The Java CLI reports structural ones under the code `VALIDATION_ERROR` and atom refusals as `ATOM_FORM_INVALID`.)
- Resolver errors: unresolved type or annotation names (`!uuid` under a schema whose closure lacks `net.tn`), schema load/compile failures (bad facets, facet values their family refuses, invalid defaults, refuted `@meta.disjoint`, incoherent bounds, unproductive recursion, wait cycles, collisions in the import closure, import cycles, hash mismatches), a failed family check (a member not pinning a selector, colliding pins anywhere in the closure, composing onto a FINAL record, an undeclared family member), a failed dependent-field rule, a choice that is not disjoint holding a variant written in place or a non-disjoint choice, an extern whose foreign schema does not load or runs on another kernel.
- Validation errors: closed-record violations (an undeclared field name, a name that is no value of the record's name type included), a name at a reference-typed field that reaches nothing or the wrong kind of thing, constraint violations (a relative reference under `uri`, a scheme outside `schemes`), missing required fields (an unmarked name omitted), `_` at a non-voidable field, a field group with no option or two options chosen, or a chosen option missing a member, a dependent field written before its free sibling, untagged non-disjoint choice values, a tag whose type IS-A two variants of a choice and names neither, a tag at a position typed in place or naming a parametric record or an incomplete entry, an untagged value at an ABSTRACT position with no selector or at a `meta.declared` position, an unmatched selector value, duplicate set members or typed-equal map keys, wrong-form empty braces, a contradicting fixed value.
- **Refused** and **undetermined** are two outcomes beside the four categories, neither a verdict on validity, both located at the reference and naming their reason. *Refused*: this processor will not supply the schema — not held and not fetched, a host off its allowlist, a required pin missing, past its size limit — or declined the document under its hygiene policy or limits; a processor configured otherwise may accept it. *Undetermined*: it could not obtain the schema — nothing at the reference, no answer — so nothing was judged. A pin mismatch on a schema that *was* obtained stays a resolver error.
