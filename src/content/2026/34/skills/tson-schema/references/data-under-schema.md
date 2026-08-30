# Data under a schema — the text encoding rules

Part 2 §7, condensed. This is what changes in a data document once `!!schema:"…"` is in force. For the schemaless rules see the tson-data skill.

## `!!schema`

- Header form binds the whole document; before a record field value, map entry value, or array element it binds that value alone, then reverts.
- The referent is a schema *document*, never resolver output.
- It names a **namespace**, not a root type. The value names its own type: `!task { … }`. An unannotated root is legal but vocabulary-only; a validator asked to validate the document must report it as a validation error — nothing was checked.
- A nested `!!schema` at a position typed by the outer schema is a resolver error unless that position's type is `extern`, `value`, `unknown`, or a container of those (`[extern]`, `{text => value}`). Schemaless outer documents permit nested directives anywhere.

## Type annotations

- `!name` = instantiation of `name` from the bound schema's type-name namespace (locals + imports, transitively). The built-in vocabulary is off; `!uuid` works only because the schema imports core (or declares `uuid`).
- **Records are closed**: any field not declared by the record's type is a validation error, whether the record is annotated or sits at a typed position.
- Type-expression syntax is unavailable in data: annotate an array or map with a *named* type (`int_list => [integer]`, then `!int_list [1 2 4]`).
- `!T value` validates by what `T` is: an atom instance validates one token (`!age 42`, never `!age { … }`); a record type validates a record; a choice admits any conforming variant; a constructor (`!integer_type { min: 0 }`) validates a *constraint record* — that is what resolver output is. `!integer_type 42` and `!age { min: 0 }` are type errors.
- **Subsumption**: at a position typed `T`, `!S value` is admitted iff `S` is `T` or `T` is in `S`'s transitive `supertypes` (IS-A — composition and refinement chains, not subtraction lineage). The value then validates as `S` in full. Without an annotation the value is exactly `T`; there is no structural recovery of a subtype.
- Templates: never a data annotation.

## Atom positions

Base type resolution is off at typed positions. `true`, `false`, `null`, `42` mean whatever the position's type says; `twelve` at an `integer` field is a parse (resolver) error, `300` at `age` is a validation error.

`null` is accepted only at a `void`-typed position (any type whose flattened body is `void`), as a spelling of `_`, and round-trips to `_`. Elsewhere `null` must satisfy the declared type — under core there is no null-typed atom, so it will not.

Enums: the token's decoded text must equal a member name; `boolean` members `true`/`false` become host booleans.

Constraint values typed `value` in the meta layer (`decimal_type.min`, etc.) are converted at schema load, never per validation.

## Sets

`[ … ]` syntax; set-ness is declared (`!set { element_type: T }`, enum members). A repeated element is a validation error at the repeated occurrence (equality by the element type's contract). Order is unspecified; comparison tools sort. `_` elements are rejected (`set` fixes `state = REQUIRED`).

## The absent sentinel `_`

| Position | `_` permitted? |
|---|---|
| array element | only under `[T?]`; occupies a slot and counts toward size |
| tuple position | only where the position is `T?`; the slot must still appear (`[a, _]` ok; `[a]` is a validation error) |
| record field | OPTIONAL and OPTIONAL_FIXED-with-`_` fields only. At REQUIRED, REQUIRED_DEFAULT, REQUIRED_FIXED it is a validation error — omit the field to get the default/fixed value injected |
| map key | never (resolver error) |
| map entry value | only under `{K => V?}`; the entry counts toward size |
| type positions in a schema | never (parse error) |
| field modifier | `= _` on optional fields only |

## Defaults and fixed values on read and write

REQUIRED_DEFAULT and REQUIRED_FIXED fields missing from the data are **injected** into decoded output. OPTIONAL and OPTIONAL_FIXED fields are never injected. A written value at a FIXED field must equal the fixed value — a decoder must report a contradiction, never overwrite it. Encoders should write defaults out; omitting a field equal to its default is a lossless size optimisation.

## Typed key equality and empty braces

Map keys are decoded by the declared key type, so keys equal under that type are duplicates (`1` and `1.0` under an integer key → validation error at the second). `{}` at a record- or map-typed position is the empty record or map (then the map's `min_items` applies); at an array, tuple, atom, or non-brace choice position it is a validation error (wrong form — arrays are `[]`).

## Choices in data

Write `!variant value`. Omit the tag only when the choice is disjoint (every variant a different discrimination class); otherwise a missing tag is a validation error. A tag is never wrong.

## extern

```
attachments => [claim_or_report]
claim_or_report => !extern { schema: "https://tson.io/2026/insurance/claim.tn" }
```

At an extern position the data must open the foreign scope and name the type:

```
attachments: [
  !!schema:"https://tson.io/2026/insurance/claim.tn?sha256=…"
  !insurance_claim { claim_id: CLM-5678  amount: 450.00 }
]
```

The directive binds to the one element it prefixes; put each directive-carrying element on its own line. The `!type` is mandatory there. `types: [a b]` on the extern restricts which foreign types are admitted. `unknown` (core) is the alternative when the parent has no contract at all on the data.

## Error categories at this layer

- Resolver errors: unresolved type or annotation names, schema load/compile failures (bad facets, invalid defaults, refuted `@disjoint`, incoherent bounds, unproductive recursion, collisions in the import closure, import cycles, hash mismatches), a nested `!!schema` at a non-permissive position, a built-in annotation on a container.
- Validation errors: closed-record violations, constraint violations, missing required fields, `_` at required-family positions, untagged non-disjoint choice values, duplicate set members or typed-equal map keys, wrong-form empty braces, missing `!type` at an extern position, a contradicting fixed value.
