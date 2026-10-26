# Data under a schema — the text encoding rules

Part 2 §7, condensed. This is what changes in a data document once `!!schema:"…"` is in force. For the schemaless rules see the tson-data skill.

## `!!schema`

- Header form binds the whole document; before a record field value, map entry value, or array element it binds that value alone, then reverts.
- The referent is a schema *document*, never resolver output.
- It names a **namespace**, not a root type. The value names its own type: `!task { … }`. **Under `!!schema` the root must name its type** — an unannotated root is a validation error in every mode.
- A nested `!!schema` is admitted exactly where the position's type resolves to a `scoped` instance whose `scope` holds `EXTERN` — `extern`, `dynamic`, `extern_of<…>`, `extern_type<…>`; containers descend, so each element of `[extern]` is such a position. Where it is not admitted, the position decides the category: at a `scoped` position whose `scope` lacks `EXTERN` (`declared`) it is a **validation error**, by the cell rule; at a position whose own type is not `scoped` at all — a record, a choice, a `value`, an atom — it is a **resolver error**. A derived fact, not a list to memorise.
- **A schemaless outer document opens no schema scope**: a nested `!!schema` in a document with no `!!schema` of its own is a validation error.

## Type annotations

- `!name` = instantiation of `name` from the bound schema's type-name namespace (locals + imports, transitively). The built-in vocabulary is off; `!uuid` works only because the schema imports core (or declares `uuid`).
- **Records are closed, with no exception**: any field not declared by the record's type is a validation error, whether the record is annotated or sits at a typed position. Open-ended data lives in a declared map-typed field.
- Type-expression syntax is unavailable in data: annotate an array or map with a *named* type (`int_list => [integer]`, then `!int_list [1 2 4]`).
- `!T value` validates by what `T` is: an atom instance validates one token (`!age 42`, never `!age { … }`); a record type validates a record; a choice admits any conforming variant; a constructor (`!integer_type { min: 0 }`) validates a *constraint record* — that is what resolver output is. `!integer_type 42` and `!age { min: 0 }` are type errors.
- **Subsumption**: at a position typed `T`, `!S value` is admitted iff `S` is `T` or `T` is in `S`'s transitive `supertypes` (IS-A — composition and refinement chains, not subtraction lineage). The value then validates as `S` in full. What an *untagged* value means depends on `T`'s extension:
  - `T` OPEN or FINAL — the value is exactly `T`; there is no structural recovery of a subtype.
  - `T` ABSTRACT with no selector — the tag is **required**; an untagged value, or a tag naming `T` itself, is a validation error.
  - `T` ABSTRACT with `=?` selectors — the reader reads the selector fields at `T`'s types, matches the value (or tuple) against the members' pins, and validates the whole value as the matched member. A missing selector or unmatched value is a validation error; a tag is optional and, where written, must name the matched member or a subtype of it.
- Templates: never a data annotation. A record-bodied template may *type a position* as a family base; the tag then names an application's member, never the template.

## Atom positions

Base type resolution **does not apply under a schema at all** — not merely at typed positions. `true`, `false` and `42` mean whatever the position's type says; `twelve` at an `integer` field is a resolver error, `300` at `age` is a validation error. The root names its type or the document is invalid; there is no "legal but vocabulary-only" root.

**There is no `null`.** `void` admits `_` alone, and a bare `null` is the string `null` — so it satisfies a `text`-typed position and nothing else.

Enums: the token's decoded text, put into the label type's normalization form, must equal a member; the form is not consulted, so `"true"` and `true` are one value at `boolean`. `boolean`'s members bind to host booleans and every other enum's to host text; a host-language enum is a mapping the binder owns (`in-progress` → `IN_PROGRESS`), since no host guarantees a member is a legal constant.

Text: a value is its token put into the type's `normalization` form, and every facet and comparison judges that value. Under a folding type `Content-Type` and `content-type` are one value — one map key, one set member — and a round trip writes the folded form. A refusal quotes the token as written, then the value it was judged as. A value typed by an identifier family is a name, under name hygiene.

Constraint values typed `value` in the meta layer (`decimal_type.min`, etc.) are converted at schema load, never per validation.

## Sets

`[ … ]` syntax; set-ness is declared (`set<T>`, enum members). A repeated element is a validation error at the repeated occurrence. **Equality is over the element type's value space, not its lexical space**: two spellings of one value are one element, so `bytes` compares octets whatever the alphabet and `datetime` the instant whatever the offset. For a set of records, arrays, maps or choices, duplicates are whatever the processor's host equality relates (at least textual identity) — key a set by an atom where portable detection matters. Element order carries no meaning in data; resolved output keeps source declaration order. `_` elements are rejected. **A set may be empty**: `set<T>` admits `[]`, and only a type stating `min_items: 1` refuses it. A set's `ordered` is pinned `false`; an array is `ordered` and a map is not unless it says otherwise, and in every case output keeps the order written.

## The void sentinel `_`

| Position | `_` permitted? |
|---|---|
| array element | only under `[T?]`; a void element occupies a slot and counts toward size |
| tuple position | only where the position is voidable, `T?`; the slot must still appear (`[a, _]` ok; `[a]` is a validation error) |
| record field | only where the field is **voidable** (`?` on the type: `a: T?`, `a?: T?`, `a?: T? ~ v`); the field is then present with a void value. Anywhere else a validation error — at `a?: T ~ v`, omit the field to get the default injected |
| field group member | only at a voidable member (`( a: T? \| b: U )`); `_` is then present and chooses that member's option |
| map key | never (resolver error) |
| map entry value | only under `{K => V?}`; the entry is present with a void value and counts toward size |
| type positions in a schema | never (parse error) |
| field modifier | never — `~ _` and `= _` are refused; write `a?: void?` |

## Defaults and fixed values on read and write

An omitted field whose name carries `?` and which has a value (`a?: T ~ v`, `a?: T = v`) is **injected** into decoded output; one without a value stays missing; an omitted field whose name is unmarked is the missing-field error — including a marker `a: T = v`, which the document must write. Group members are never injected. At `a?: T? ~ v`, `_` is void and a missing key is *the default*. A written value at a FIXED field must equal the fixed value — a decoder must report a contradiction, never overwrite it.

Encoders should write defaults out; omitting a field equal to its default is a lossless size optimisation. An encoder holding the schema **must** write a void value as `_` at `a: T?` and at `a?: T? ~ v`; one without the schema omits the field, which is right everywhere else.

## Typed key equality and empty braces

Map keys are decoded by the declared key type, so keys equal under an atom key type are duplicates (`1` and `1.0` under a `number` key, `Content-Type` and `content-type` under a case-folding text key → validation error at the second); under a compound key type, host equality decides. The keys of a map keyed by an identifier family are names, and a look-alike scope. `{}` at a record- or map-typed position is the empty record or map (then the map's `min_items` applies); at an array, tuple, atom, or non-brace choice position it is a validation error (wrong form — arrays are `[]`).

## Choices in data

Write `!variant value`. Omit the tag only when the choice is disjoint (every variant a different discrimination class — and a float admitting NaN/infinity or a compound-keyed map has no class); otherwise a missing tag is a validation error. A tag is never wrong.

## Scoped positions: `declared`, `extern`, `dynamic`

One constructor, `scoped`, covers every position where the *data* names its own type; its `scope` names
which namespaces that name may be resolved in. Core declares the three admitting subsets and two
templates:

| Core type | `scope` | The value's type comes from |
|---|---|---|
| `declared` | `[LOCAL]` | the governing schema (a `!type-ref`, resolved in the governing namespace) |
| `extern` | `[EXTERN]` | any foreign schema (a nested `!!schema` plus a `!type-ref`) |
| `dynamic` | `[LOCAL EXTERN]` | either |
| `extern_of<S>` | `[EXTERN]`, one schema | the one schema `S` names |
| `extern_type<S, T>` | `[EXTERN]`, one type | the type `T` in the schema `S` |

`dynamic` is not `any`: the value is validated in full against the type it names. **A value naming no type
at a scoped position is a validation error**, at every one of these cells.

```
attachments => [claim_or_report]
claim_or_report => extern_of<"https://tson.io/2026/insurance/claim.tn">
```

At a scoped position with `EXTERN` the data opens the foreign scope and names the type:

```
attachments: [
  !!schema:"https://tson.io/2026/insurance/claim.tn?sha256=…"
  !insurance_claim { claim_id: CLM-5678  amount: 450.00 }
]
```

The directive binds to the one element it prefixes; put each directive-carrying element on its own line,
and the `!type` is mandatory there. `extern_of` and `extern_type` are ordinary partial applications, so a
field writes them inline and declares nothing; `S` stands in a key typed by meta's `schema_identity` (an
IRI-reference with no fragment) and `T` inside `[type_name]`, both value parameters — recorded as
`S: schema_identity` and `T: type_name` and checked at the application — so each application reaches one
schema (and one type). An application's identity is
the argument **as written**, so a pinned and an unpinned `S` are two applications. For several schemas or
several types, use the instance form (`!scoped { scope: [EXTERN]  schemas: { … } }`) or a named declaration.

## Error categories at this layer

- Resolver errors: unresolved type or annotation names, schema load/compile failures (bad facets, invalid defaults, refuted `@disjoint`, incoherent bounds, unproductive recursion, collisions in the import closure, import cycles, hash mismatches), a nested `!!schema` at a position whose type is not `scoped`, a built-in annotation on a container, a failed family check (a member not pinning a selector, colliding pins anywhere in the closure, composing onto a FINAL record, an undeclared family member), a token an atom's parser refuses (`twelve` at `integer`, a leap second at `time`, `ü` under `uri`).
- Validation errors: closed-record violations, constraint violations (a relative reference under `uri`, a scheme outside `schemes`), missing required fields (an unmarked name omitted), `_` at a non-voidable field, a field group with no option or two options chosen, or a chosen option missing a member, untagged non-disjoint choice values, an untagged value at an ABSTRACT position with no selector, an unmatched selector value, duplicate set members or typed-equal map keys, wrong-form empty braces, a value naming no type at a scoped position, a nested `!!schema` at a `scoped` position lacking `EXTERN` or in a schemaless document, a contradicting fixed value.
- **Not judged**, not an error: a schema the processor cannot obtain (not held, fetching not permitted, unreachable…) is reported as *unavailable*, beside the four categories and located at the reference — nothing was read, so nothing is known about conformance. A pin mismatch on a schema that *was* obtained stays a resolver error.
