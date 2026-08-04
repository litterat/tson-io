# Mapping GraphQL SDL → TSON Schema

> **Status:** Non-normative report · Prepared against TSON 2026 Revision 32 (Working Draft) · Input to the Revision 33 development cycle.
> References to "planned additions" describe design directions under consideration for future revisions, not committed specification. Produced with AI assistance (Anthropic Claude) in collaboration with the TSON author; citations of external standards should be verified against primary sources before normative use. Schema source files are cited with the `.tn` extension per the current draft-period convention (`.tn1` is reserved for the finalized version 1 release).


## Scope and framing

Same framing: **one-directional, strictness-first, no round-trip.** But GraphQL forces a scoping decision none of the prior four languages did, and it should be stated before any table: **GraphQL SDL is not a data schema — it is a capability schema.** Fields take arguments (they are functions), and a response's shape is determined not by the SDL alone but by the *query*: every GraphQL response is a client-chosen projection of the type graph. There is no such thing as "a document conforming to type `User`" on the wire; there are documents conforming to *a selection set over* `User`.

This yields three conversion targets of increasing ambition, and the report covers the first two with the third as the product idea:

1. **Input universe** (input objects, arguments, enums, scalars): genuine data schemas — variables payloads validate against them directly. Full conversion, no caveats.
2. **Output type definitions** as model-level shapes: the type graph converted structurally (this section is most of §A), useful for codegen, diffing, and as the substrate for target 3 — but *not* directly a validator of responses, because of projection.
3. **Per-query schema derivation**: compile (SDL + a specific query document) → a TSON schema for *that query's* response shape — selection sets to records, fragments and inline spreads to their type conditions, `__typename` selections to discriminator fields, list/non-null wrappers to the corresponding TSON positions. This is mechanical (the GraphQL validation spec already defines the response shape of a valid query), and it is the genuinely novel product: **response contract validation per operation**, something the GraphQL ecosystem approximates today with generated client types but has no runtime-validation standard for.

## TL;DR

- **Nullability inverts, again, and differently**: GraphQL types are **nullable by default** with `!` for non-null — the third distinct optionality regime (JSON Schema: optional-by-default membership; protobuf: presence disciplines; GraphQL: in-band null-by-default). The conversion is mechanical (`T!` → `T`; bare `T` → `(T | null)`) but it makes GraphQL the **fifth and loudest corroboration of the null atom**: without it, the *default case* of every GraphQL field is inexpressible. Note carefully: GraphQL output nullability is about *values*, not *presence* — in a response, every selected field is present (possibly null), so bare `T` is `(T | null)` REQUIRED, **not** `T?`.
- **Unions and interfaces land on machinery already built.** GraphQL unions are closed sets of object types discriminated on the wire by `__typename` — an in-band sibling-property discriminator, the OpenAPI cell of the tag taxonomy, mapping to `choice` + discriminator token with `__typename: = <TypeName>` pinned per variant (the implicit-mapping degenerate case: tag value *is* the type name, always). Interfaces are structural IS-A → composition. Fifth language, still zero new sum constructs — and GraphQL unions being *closed by definition* (`union U = A | B` enumerates; nothing external can join) adds a second native-source evidence point for the deferred `sealed`, alongside ASN.1's closed object sets.
- **GraphQL has no map type** — the inverse of the additionalProperties problem. Key-value data in GraphQL travels as entry lists (`[KVPair!]!`) or JSON-blob custom scalars; the converter maps what's written and the *reverse* direction (TSON → SDL, for teams publishing graphs from TSON models) must lower `map<K,V>` to an entry-list convention. Nothing to add to TSON; a lowering-table entry.
- **Two type universes**: SDL separates input objects from output objects (input types cannot have unions or interfaces; circular input references must be nullable). The converter keeps them separate — merging them is a classic GraphQL-tooling mistake — and the input universe is where validation value concentrates first (variables payloads are real JSON documents crossing a trust boundary).

## A. Construct-by-construct

**Legend:** ✅ clean · ⬆ strengthens · ◑ transform/decision · ✗ drop-with-report · Ⓐ annotation-only.

### Scalars

| GraphQL | TSON | |
|---|---|---|
| `Int` (spec: 32-bit signed) | `int32` | ⬆ the spec range becomes checked |
| `Float` (double, finite) | `float64` ^ finite | ⬆ GraphQL *forbids* NaN/Infinity — the first source language to take a side in the queued float-specials decision; the strict profile enforces finiteness |
| `String` | `text` | ✅ |
| `Boolean` | `boolean` | ✅ |
| `ID` | `text` + `@graphql_id` Ⓐ | ◑ opaque; serialized as string but *accepts* Int input — input-position leniency (`(text \| int32)` coerced) vs output strictness (`text`); canonical-strict validates output form, flag the input coercion |
| custom scalar | `unknown`/`value`, or refined type when `@specifiedBy` names a known spec | ◑ `@specifiedBy("…rfc4122…")` → `uuid` etc. — a small URL→core-type table turns the ecosystem's scalar conventions (DateTime, UUID, EmailAddress from common scalar libraries) into validated types; unmatched → report |

### Type system

| GraphQL | TSON | |
|---|---|---|
| `type Obj { … }` (output) | closed `record` | ✅ closed by construction — selection sets can only name declared fields |
| field `f: T!` | `f: T` (REQUIRED) | ✅ |
| field `f: T` | `f: (T \| null)` (REQUIRED) | ✅ needs null atom; **not** `T?` — see nullability note above |
| list wrappers `[T!]!`, `[T]!`, `[T!]`, `[T]` | `[T]`, `[(T\|null)]`, `([T]\|null)`, `([(T\|null)]\|null)` | ✅ mechanical; all four combinations exercise the null atom in element and list position |
| field arguments | Ⓐ on the field (target 2) / consumed by derivation (target 3) | ◑ arguments are the capability layer — no data-schema equivalent; preserved for the per-query compiler |
| `interface I` / `type O implements I` | `I` as record; `O => I & { own fields }` | ◑ SDL requires implementors to *redeclare* interface fields, so conversion dedupes: fields matching the interface fold into the composition; covariant narrowings (`implements` allows subtype-narrowed field types) become refinements. Multiple interfaces with overlapping fields: fold the shared fields once — a converter rule, since TSON composition wants disjoint parents |
| `union U = A \| B` | `choice (A \| B)` + discriminator `__typename` | ✅ §B |
| `enum E { A B }` | `!enum [A, B]` | ✅ name-only symbols, like Avro |
| `input Inp { … }` | closed `record` (separate universe) | ✅ input nullability differs: an input field that is nullable *or* has a default **may be omitted** — so `f: T` (input) → `f: (T \| null)?` and `f: T! = v` → `~ v`; presence and nullness both in play, both expressible |
| argument/input defaults | `~ v` (`REQUIRED_DEFAULT`) | ✅ GraphQL injects defaults for omitted inputs — the injection-matching cluster with proto2/ASN.1/Avro |
| `@deprecated(reason:)` | `@deprecated` | ✅ |
| `@specifiedBy` | scalar table above | ◑ |
| custom directives | annotations | Ⓐ |
| descriptions (`"""…"""`) | `@doc` | ✅ |
| `extend type …` | schema-merge in the normalization front-end | ◑ pre-mapping transform, per the established dialect-pass pattern |
| root operation types (`Query`/`Mutation`/`Subscription`) | out of scope for data conversion; entry points for target-3 derivation | — |
| `schema` definition, introspection meta-fields | Ⓐ / consumed by tooling | — |

Recursion: idiomatic and universal (every graph schema is cyclic) — the recursion gap now blocks its **fifth** converter, with GraphQL the most aggressively recursive corpus of the set. Circular *input* types must include a nullable link (a GraphQL validation rule), which is a hint worth stealing when writing TSON's recursion rules: cycles are legal where some participating position admits absence/null, guaranteeing finite documents.

## B. `__typename` and abstract types: the discriminator, fifth appearance

On the wire, union- and interface-typed positions are discriminated by the `__typename` meta-field — a sibling string property whose value is the concrete object type's name. This is the OpenAPI cell of the tag taxonomy (in-band sibling property), in its purest form: the mapping is always implicit (value = type name, no mapping table can even exist), so conversion is the degenerate case identified in the very first report:

```
CatResult => { __typename: = Cat, ...Cat fields... }
DogResult => { __typename: = Dog, ...Dog fields... }
search_result => (CatResult | DogResult)   discriminator __typename
```

Union member sets are closed by definition — an evidence point for `sealed` (#10), and note the contrast *within GraphQL*: unions are sealed, interfaces are open (any type may `implements` them across schema extensions). The converter treats a union as a sealed choice and an interface-typed position as the open-subsumption case — the `[Pet]` vs `(Cat|Dog)` split from the sealing discussion, appearing natively in one source language. Interface-typed response positions therefore *require* the discriminator (open set, disjointness unprovable), which operationally means: target-3 derivation must inject `__typename` into every abstract-position selection it compiles, whether or not the source query asked for it — matching what every serious GraphQL client (Apollo, Relay) already does, for exactly this reason. That convergence is reassuring: the ecosystem independently discovered that open-set dispatch needs a mandatory in-band tag, which is the same conclusion the discriminator design reached from the resolver side.

One wire caveat: `__typename` appears in a response only if selected (servers don't volunteer it). So target-2 conversions mark it OPTIONAL-in-data unless target-3 injection is in play — a small profile item: *strict per-query validation* (typename always present, injected by the compiler) vs *lenient document validation* (typename optional, dispatch falls back to structural disjointness where provable).

## C. What GraphQL doesn't have / declined

- **No value constraints** (no ranges, lengths, patterns — like Avro; custom-directive conventions exist but no standard). Same pitch: refinements are the constraint layer the ecosystem lacks. The declined-list is again empty.
- **No maps** — reverse-lowering entry only, as framed in the TL;DR.
- **Null bubbling** (a field error nulls the nearest nullable ancestor) is *error* semantics, not type semantics: a bubbled response still type-checks against the converted schema (the nulled position was nullable by construction). Validation composes with, not against, GraphQL's error model — worth one reassuring paragraph in part 3, no machinery.
- **Arguments/capabilities**: not data; consumed by target 3, annotated in target 2.

## D. Closing the gap — what GraphQL asks of TSON

1. **Null atom (#4)**: fifth corroboration, and the decisive one — it is the *default case* of the language. Nothing further to argue; ship it.
2. **Finite-float refinement**: GraphQL resolves half of the float-specials decision (a `finite` facet or refined core type has its first mandating consumer).
3. **`@specifiedBy` URL table** (Tier 1 vocabulary, converter-side): the scalar-convention → core-type mapping.
4. **Recursion (#3)**: fifth blocker; adopt the nullable-link admissibility hint from GraphQL's own circular-input rule.
5. **Sealed evidence**: unions (sealed) vs interfaces (open) give the Stage-5 census a source where both cases are explicit language constructs rather than corpus statistics.
6. **The per-query compiler (target 3)** — not a TSON spec item at all, but the highest-leverage product in this report: (SDL, query) → response-contract TSON schema. It reuses the whole existing design (records, choices, discriminator token, null atom) and addresses a real, unserved need (runtime response validation per operation).
7. Nothing kernel-shaped. Fifth consecutive report where the kernel ask is zero beyond the already-planned items.

## Recommendations

- **Ship input-universe validation first** (variables payloads are the trust boundary and need no projection machinery), type-graph conversion second, the per-query compiler as the headline follow-on.
- **Fold the four-profile split into the shared converter architecture**: strict-per-query / lenient-document × output / input universes — same canonical-strict pattern as protojson and Avro, two axes instead of one.
- **Steal the circular-input rule** when writing Part 2's recursion clause.
- **Position against codegen, not instead of it**: generated client types check *compile-time* shape; per-query TSON schemas check *runtime* responses against the same contract — complementary, and the pitch writes itself for federated graphs where the server behind a field changes without the client's knowledge.

## Caveats

- SDL versions and drafts differ on details (`@specifiedBy` is post-June-2018-spec; `oneof` input objects are a late addition — if targeting them, they map to the REQUIRED field group, joining the label-discriminated cell); the normalization front-end pins a spec edition, per the established pattern.
- Federation directives (`@key`, `@external`, …) are a dialect atop SDL — annotations in this pass, though a federation-aware target 3 (validating subgraph responses) is a plausible extension.
- Target-2 output conversions are model artifacts, not document validators — the projection point from §Scope; docs must say so or users will mis-apply them to responses.
- TSON references: 2026 Revision 32 working draft plus planned additions from prior reports.
