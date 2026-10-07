# Data under a schema — the text encoding rules

Part 2 §7, condensed. This is what changes in a data document once `!!schema:"…"` is in force. For the schemaless rules see the tson-data skill.

## `!!schema`

- Header form binds the whole document; before a record field value, map entry value, or array element it binds that value alone, then reverts.
- The referent is a schema *document*, never resolver output.
- It names a **namespace**, not a root type. The value names its own type: `!task { … }`. An unannotated root is legal but vocabulary-only; a validator asked to validate the document must report it as a validation error — nothing was checked.
- A nested `!!schema` at a position typed by the outer schema is a resolver error unless that position's type resolves to a `scoped` instance whose `scope` holds `EXTERN` — `extern`, `dynamic`, `extern_of<…>`, `extern_type<…>`, or a container of those (`[extern]`). This is a **derived fact**, not a list to memorise — and `value` is not one of them.
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

Enums: the token's decoded text must equal a member, whatever the profile; the form is not consulted, so `"true"` and `true` are one value at `boolean`. `boolean`'s members become host booleans, an `IDENTIFIER` enum's members are host-safe names, and a `TEXT` enum's members (`"lightly active"`) are plain text.

Constraint values typed `value` in the meta layer (`decimal_type.min`, etc.) are converted at schema load, never per validation.

## Sets

`[ … ]` syntax; set-ness is declared (`set<T>`, enum members). A repeated element is a validation error at the repeated occurrence. **Equality is over the element type's value space, not its lexical space**: two spellings of one value are one element, so `bytes` compares octets whatever the alphabet and `datetime` the instant whatever the offset. For a set of records, arrays, maps or choices, duplicates are whatever the processor's host equality relates (at least textual identity) — key a set by an atom where portable detection matters. Element order carries no meaning in data; resolved output keeps source declaration order. `_` elements are rejected. A `set<T>` is non-empty by default (`set_type.min_items` defaults to 1).

## The absent sentinel `_`

| Position | `_` permitted? |
|---|---|
| array element | only under `[T?]`; occupies a slot and counts toward size |
| tuple position | only where the position is `T?`; the slot must still appear (`[a, _]` ok; `[a]` is a validation error) |
| record field | only where the field is **voidable** (`?` on the type: `a: T?`, `a?: T?`, `a?: T? ~ v`); the field is then present with an absent value. Anywhere else a validation error — at `a?: T ~ v`, omit the field to get the default injected |
| field group member | only at a voidable member (`( a: T? \| b: U )`); `_` then counts as present and selects that alternative |
| map key | never (resolver error) |
| map entry value | only under `{K => V?}`; the entry counts toward size |
| type positions in a schema | never (parse error) |
| field modifier | never — `~ _` and `= _` are refused; write `a?: void?` |

## Defaults and fixed values on read and write

An omitted field whose name carries `?` and which has a value (`a?: T ~ v`, `a?: T = v`) is **injected** into decoded output; one without a value is absent; an omitted field whose name is unmarked is the missing-field error — including a marker `a: T = v`, which the document must write. Group members are never injected. At `a?: T? ~ v`, `_` means *none* and omission means *the default*. A written value at a FIXED field must equal the fixed value — a decoder must report a contradiction, never overwrite it.

Encoders should write defaults out; omitting a field equal to its default is a lossless size optimisation. An encoder holding the schema **must** write an absent value as `_` at `a: T?` and at `a?: T? ~ v`; one without the schema omits it, which is right everywhere else.

## Typed key equality and empty braces

Map keys are decoded by the declared key type, so keys equal under an atom key type are duplicates (`1` and `1.0` under a `number` key → validation error at the second); under a compound key type, host equality decides. `{}` at a record- or map-typed position is the empty record or map (then the map's `min_items` applies); at an array, tuple, atom, or non-brace choice position it is a validation error (wrong form — arrays are `[]`).

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
field writes them inline and declares nothing; `S` stands in a `uri`-typed key and `T` inside `[type_name]`,
both value parameters, so each application reaches one schema (and one type). An application's identity is
the argument **as written**, so a pinned and an unpinned `S` are two applications. For several schemas or
several types, use the instance form (`!scoped { scope: [EXTERN]  schemas: { … } }`) or a named declaration.

## Error categories at this layer

- Resolver errors: unresolved type or annotation names, schema load/compile failures (bad facets, invalid defaults, refuted `@disjoint`, incoherent bounds, unproductive recursion, collisions in the import closure, import cycles, hash mismatches), a nested `!!schema` at a position that does not resolve to an `EXTERN`-scoped type, a nested `!!schema` in a schemaless document, a built-in annotation on a container, a failed family check (a member not pinning a selector, colliding pins, composing onto a FINAL record).
- Validation errors: closed-record violations, constraint violations, missing required fields (an unmarked name omitted), `_` at a non-voidable field, untagged non-disjoint choice values, an untagged value at an ABSTRACT position with no selector, an unmatched selector value, duplicate set members or typed-equal map keys, wrong-form empty braces, a value naming no type at a scoped position, a contradicting fixed value.
- **Not judged**, not an error: a schema the processor cannot obtain (not held, fetching not permitted, unreachable…) is reported as *unavailable*, beside the four categories and located at the reference — nothing was read, so nothing is known about conformance. A pin mismatch on a schema that *was* obtained stays a resolver error.
