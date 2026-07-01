---
title: "TSON Resolver Output Reference"
draft: "2026-28"
status: "Non-normative"
description: >
  Complete resolver output for meta-kernel.tn1, meta.tn1, and core.tn1 expressed as TSON data
  documents. These are test fixtures for validating TSON resolver implementations against the
  Draft 2026-28 specification.
---

# TSON Resolver Output Reference

**Status:** Non-normative companion to TSON Specification Draft 2026-28
**Purpose:** Complete resolver output for `meta-kernel.tn1`, `meta.tn1`, and `core.tn1` expressed as TSON data documents. These are test fixtures — parse the source schema, run the resolver, compare against this reference.

**Conventions:**
- Fields at their default values are omitted (`constructor` defaults to `false`; `state` defaults to `REQUIRED`).
- `subtypes` is mandatory resolver output per spec §7.9 — the resolver MUST compute and populate it as the transitive inverse of `supertypes`. This reference shows `subtypes` for the lattice roots (`top`, `atom`, `product`, `sum`) and a few illustrative entries to demonstrate the materialisation; for other entries it is elided to keep the document readable. An implementation is expected to populate `subtypes` everywhere, derived from the schema's `supertypes` graph.
- `supertypes` and `subtypes` ordering is implementation-defined; the resolver chooses what works for its lookup strategy. Fixture-comparison tools SHOULD canonicalise both lists (lexical sort) and `set<T>`-typed fields (per spec §4.2.6 — sets are unordered) before byte-comparison.
- Resolver output as shown here is NOT a canonical wire format. Different implementations may produce byte-different output for the same source schema (ordering of `supertypes`/`subtypes`, ordering of synthetic entries, choice of hash algorithm for constrained synthetics). Applications needing cross-implementation canonical output must perform their own canonicalisation.
- `supertypes` and `subtypes` on `type_definition` are resolver-**derived** fields; a source schema never declares them at the top level. They are computed from the source's `&` composition and narrowing relationships during Pass 2 of resolution (spec §7.5.1). The `record.supertypes` field inside a body is different — that field is author-declared via `&`.
- Annotations from the source schema are preserved on the side they were authored on. By the convention used by meta-kernel, meta, and core, entry-level annotations like `@doc`, `@ordered`, `@bounded`, `@numeric`, `@annotation` are written before the entry's key and bind to the key (the `type_name` token) per spec §5.4 / §7.7. Fixture entries below show annotations in the same key-side position.
- Synthetic types appear at the end of each document.
- Parameterized references are shown as `name`. Bare parameter references inside a template body (e.g. `T`) are shown as `T` and interpreted against the enclosing `parameters` list.

**Supertypes rules:**
- `&` composition and instance/constructor narrowing establish IS-A. Construction via `!T {}` does NOT transfer `T`'s supertypes — only its `kind`.
- Base kinds (`top`, `atom`, `product`, `sum`) are real participants in the IS-A lattice. They appear in supertypes when explicitly composed, and their own compositions contribute transitively (`atom` composes with `top`, so any `~atom &` type also IS-A `top`).
- `type_definition.supertypes` carries the **transitive** IS-A chain: direct compositions followed by each direct's own chain, deduplicated.
- `record.supertypes` (inside body) carries only the **direct** non-anonymous `&` compositions from the source.
- Bare `{...}` (with no explicit `&`) produces `kind: PRODUCT` by structural default but records no supertypes — the universal "every type IS-A top" is axiomatic and not enumerated.

**Well-formedness invariant:**
- `type_definition.body` is typed as `top` (required). For every resolved entry, the body's underlying type MUST have `top` in its transitive supertypes chain. This is satisfied by every constructor in the system because each composes (directly or transitively via `atom`/`product`/`sum`) with `top`. The invariant falls out of the IS-A lattice and needs no special enforcement — but a resolver that produces a body whose type does not IS-A `top`, or omits the body entirely, has a bug.

---

## 1. Meta-Kernel Resolver Output

```
!!schema:"http://tson.io/1/m/meta-kernel.tn1"
@doc:"Meta-kernel resolver output — test fixture"
!schema {

  @doc:"Base kinds."
  top => !type_definition {
    kind: PRODUCT
    subtypes: [atom product sum reference unit integer_type string_type uri_type regex_type]  ; transitive — see Conventions
    body: !record { fields: [] }
  }

  atom => !type_definition {
    kind: PRODUCT
    supertypes: [top]
    subtypes: [unit integer_type string_type uri_type regex_type]  ; direct ~atom & compositions in kernel; meta/core extend
    body: !record { supertypes: [top]  fields: [] }
  }

  product => !type_definition {
    kind: PRODUCT
    supertypes: [top]
    subtypes: [record array set map tuple]  ; ~product & compositions
    body: !record { supertypes: [top]  fields: [
      !record_field { name: access_pattern  type: product_access_type }
      !record_field { name: size_type       type: product_size_type }
    ] }
  }

  sum => !type_definition {
    kind: PRODUCT
    supertypes: [top]
    subtypes: [choice]  ; ~sum & compositions in kernel; meta adds extern, unknown_type
    body: !record { supertypes: [top]  fields: [] }
  }

  reference => !type_definition {
    kind: PRODUCT
    supertypes: [top]
    body: !record { supertypes: [top]  fields: [
      !record_field { name: target  type: type_name }
    ] }
  }


  @doc:"Unit atom constructor."
  unit => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom top]
    subtypes: [value token marker]  ; instances via !unit {}
    body: !record { supertypes: [atom]  fields: [] }
  }

  @doc:"Escape hatch primitive."
  value => !type_definition {
    kind: ATOM
    source: unit
    body: !unit {}
  }

  @doc:"Lexical token primitive."
  token => !type_definition {
    kind: ATOM
    source: unit
    body: !unit {}
  }

  @doc:"Marker primitive — admits only the absent sentinel `_`."
  marker => !type_definition {
    kind: ATOM
    source: unit
    body: !unit {}
  }


  @doc:"Internal scalar types."
  boolean => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [true false] }
  }


  @doc:"Integer constraint vocabulary."
  integer_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom top]
    body: !record { supertypes: [atom]  fields: [
      !record_field { name: min          type: integer  state: OPTIONAL }
      !record_field { name: max          type: integer  state: OPTIONAL }
      !record_field { name: multiple_of  type: integer  state: OPTIONAL }
      !record_field { name: pattern      type: regex    state: OPTIONAL }
    ] }
  }

  integer => !type_definition {
    kind: ATOM
    source: integer_type
    body: !integer_type {}
  }


  @doc:"String constraint vocabulary."
  string_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom top]
    body: !record { supertypes: [atom]  fields: [
      !record_field { name: min_length  type: integer  state: OPTIONAL }
      !record_field { name: max_length  type: integer  state: OPTIONAL }
      !record_field { name: length      type: integer  state: OPTIONAL }
      !record_field { name: pattern     type: regex    state: OPTIONAL }
    ] }
  }

  string => !type_definition {
    kind: ATOM
    source: string_type
    body: !string_type {}
  }


  @doc:"Mixin record."
  atom_specification => !type_definition {
    kind: PRODUCT
    body: !record { fields: [
      !record_field { name: spec  type: uri }
    ] }
  }


  @doc:"URI constraint vocabulary."
  uri_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [string_type atom_specification atom top]
    body: !record { supertypes: [string_type atom_specification]  fields: [
      !record_field { name: min_length  type: integer  state: OPTIONAL }
      !record_field { name: max_length  type: integer  state: OPTIONAL }
      !record_field { name: length      type: integer  state: OPTIONAL }
      !record_field { name: pattern     type: regex    state: OPTIONAL }
      !record_field { name: spec        type: uri      state: REQUIRED_FIXED  value: "https://www.rfc-editor.org/rfc/rfc3986" }
      !record_field { name: scheme      type: string   state: OPTIONAL }
    ] }
  }

  uri => !type_definition {
    kind: ATOM
    source: uri_type
    body: !uri_type {}
  }


  @doc:"Regex constraint vocabulary."
  regex_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [string_type atom_specification atom top]
    body: !record { supertypes: [string_type atom_specification]  fields: [
      !record_field { name: min_length  type: integer  state: OPTIONAL }
      !record_field { name: max_length  type: integer  state: OPTIONAL }
      !record_field { name: length      type: integer  state: OPTIONAL }
      !record_field { name: pattern     type: regex    state: OPTIONAL }
      !record_field { name: spec        type: uri      state: REQUIRED_FIXED  value: "https://www.rfc-editor.org/rfc/rfc9485" }
    ] }
  }

  regex => !type_definition {
    kind: ATOM
    source: regex_type
    body: !regex_type {}
  }


  @doc:"Identifier types — references to the token primitive."
  type_name  => !type_definition { kind: REFERENCE  body: !reference { target: token } }
  field_name => !type_definition { kind: REFERENCE  body: !reference { target: token } }
  param_name => !type_definition { kind: REFERENCE  body: !reference { target: token } }


  @doc:"Type parameter declaration."
  parameter => !type_definition {
    kind: PRODUCT
    body: !record { fields: [
      !record_field { name: name  type: param_name }
    ] }
  }


  @doc:"Internal enumerations."
  product_access_type => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [INDEX NAMED] }
  }

  product_size_type => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [FIXED VARIABLE] }
  }

  field_state => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [REQUIRED REQUIRED_DEFAULT REQUIRED_FIXED
                            OPTIONAL OPTIONAL_FIXED] }
  }

  element_state => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [REQUIRED OPTIONAL] }
  }

  type_kind => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [ATOM PRODUCT SUM REFERENCE] }
  }


  @doc:"Annotation type markers."
  annotation => @annotation !type_definition {
    kind: REFERENCE
    body: !reference { target: marker }
  }

  documentation => @annotation !type_definition {
    kind: REFERENCE
    body: !reference { target: string }
  }

  doc => @annotation !type_definition {
    kind: REFERENCE
    body: !reference { target: documentation }
  }

  alias => @annotation !type_definition {
    kind: REFERENCE
    body: !reference { target: string }
  }


  @doc:"Supporting records."
  record_field => !type_definition {
    kind: PRODUCT
    body: !record { fields: [
      !record_field { name: name   type: field_name }
      !record_field { name: type   type: type_name }
      !record_field { name: state  type: field_state  state: REQUIRED_DEFAULT  value: REQUIRED }
      !record_field { name: value  type: value        state: OPTIONAL }
    ] }
  }

  tuple_element => !type_definition {
    kind: PRODUCT
    body: !record { fields: [
      !record_field { name: element_type  type: type_name }
      !record_field { name: state         type: element_state  state: REQUIRED_DEFAULT  value: REQUIRED }
    ] }
  }


  @doc:"Constructors."
  record => !type_definition {
    kind: PRODUCT
    constructor: true
    supertypes: [product top]
    body: !record { supertypes: [product]  fields: [
      !record_field { name: access_pattern  type: product_access_type  state: REQUIRED_FIXED  value: NAMED }
      !record_field { name: size_type       type: product_size_type    state: REQUIRED_FIXED  value: FIXED }
      !record_field { name: fields          type: array#record_field }
      !record_field { name: supertypes      type: array#type_name       state: OPTIONAL }
    ] }
  }

  array => !type_definition {
    kind: PRODUCT
    constructor: true
    parameters: [!parameter { name: T }]
    supertypes: [product top]
    body: !record { supertypes: [product]  fields: [
      !record_field { name: access_pattern  type: product_access_type  state: REQUIRED_FIXED  value: INDEX }
      !record_field { name: size_type       type: product_size_type    state: REQUIRED_FIXED  value: VARIABLE }
      !record_field { name: element_type    type: T }
      !record_field { name: state           type: element_state        state: REQUIRED_DEFAULT  value: REQUIRED }
      !record_field { name: unordered       type: boolean              state: REQUIRED_DEFAULT  value: false }
      !record_field { name: unique_items    type: boolean              state: REQUIRED_DEFAULT  value: false }
      !record_field { name: min_items       type: integer              state: OPTIONAL }
      !record_field { name: max_items       type: integer              state: OPTIONAL }
    ] }
  }

  set => !type_definition {
    kind: PRODUCT
    constructor: true
    parameters: [!parameter { name: T }]
    source: array
    supertypes: [array product top]
    body: !record { supertypes: [array]  fields: [
      !record_field { name: access_pattern  type: product_access_type  state: REQUIRED_FIXED  value: INDEX }
      !record_field { name: size_type       type: product_size_type    state: REQUIRED_FIXED  value: VARIABLE }
      !record_field { name: element_type    type: T }
      !record_field { name: state           type: element_state        state: REQUIRED_FIXED    value: REQUIRED }
      !record_field { name: unordered       type: boolean              state: REQUIRED_FIXED    value: true }
      !record_field { name: unique_items    type: boolean              state: REQUIRED_FIXED    value: true }
      !record_field { name: min_items       type: integer              state: OPTIONAL }
      !record_field { name: max_items       type: integer              state: OPTIONAL }
    ] }
  }

  map => !type_definition {
    kind: PRODUCT
    constructor: true
    parameters: [!parameter { name: K }  !parameter { name: V }]
    supertypes: [product top]
    body: !record { supertypes: [product]  fields: [
      !record_field { name: access_pattern  type: product_access_type  state: REQUIRED_FIXED  value: NAMED }
      !record_field { name: size_type       type: product_size_type    state: REQUIRED_FIXED  value: VARIABLE }
      !record_field { name: key_type        type: K }
      !record_field { name: value_type      type: V }
      !record_field { name: min_items       type: integer              state: OPTIONAL }
      !record_field { name: max_items       type: integer              state: OPTIONAL }
    ] }
  }

  tuple => !type_definition {
    kind: PRODUCT
    constructor: true
    supertypes: [product top]
    body: !record { supertypes: [product]  fields: [
      !record_field { name: access_pattern  type: product_access_type  state: REQUIRED_FIXED  value: INDEX }
      !record_field { name: size_type       type: product_size_type    state: REQUIRED_FIXED  value: FIXED }
      !record_field { name: elements        type: array#tuple_element }
    ] }
  }

  enum => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom top]
    body: !record { supertypes: [atom]  fields: [
      !record_field { name: members  type: set#token }
    ] }
  }

  choice => !type_definition {
    kind: SUM
    constructor: true
    supertypes: [sum top]
    body: !record { supertypes: [sum]  fields: [
      !record_field { name: variants  type: array#type_name }
    ] }
  }


  @doc:"Resolver output."
  type_definition => !type_definition {
    kind: PRODUCT
    body: !record { fields: [
      !record_field { name: source       type: type_name        state: OPTIONAL }
      !record_field { name: kind         type: type_kind }
      !record_field { name: parameters   type: array#parameter  state: OPTIONAL }
      !record_field { name: constructor  type: boolean          state: REQUIRED_DEFAULT  value: false }
      !record_field { name: supertypes   type: array#type_name  state: OPTIONAL }
      !record_field { name: subtypes     type: array#type_name  state: OPTIONAL }
      !record_field { name: body         type: top              }
    ] }
  }

  schema => !type_definition { kind: REFERENCE  body: !reference { target: map#type_name#type_definition } }


  @doc:"Synthetic container types."
  array#record_field => !type_definition {
    kind: PRODUCT
    source: array
    body: !array { element_type: record_field }
  }

  array#type_name => !type_definition {
    kind: PRODUCT
    source: array
    body: !array { element_type: type_name }
  }

  array#parameter => !type_definition {
    kind: PRODUCT
    source: array
    body: !array { element_type: parameter }
  }

  array#tuple_element => !type_definition {
    kind: PRODUCT
    source: array
    body: !array { element_type: tuple_element }
  }

  set#token => !type_definition {
    kind: PRODUCT
    source: set
    body: !set { element_type: token }
  }

  map#type_name#type_definition => !type_definition {
    kind: PRODUCT
    source: map
    body: !map { key_type: type_name  value_type: type_definition }
  }
}
```


---

## 2. Meta-Schema Resolver Output

```
!!schema:"http://tson.io/1/m/meta.tn1"
@doc:"Meta-schema resolver output — test fixture"
!schema {

  binary_encoding => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [BASE64 BASE64URL BASE32 HEX] }
  }

  binary => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom top]
    body: !record { supertypes: [atom]  fields: [
      !record_field { name: encoding    type: binary_encoding }
      !record_field { name: min_length  type: integer          state: OPTIONAL }
      !record_field { name: max_length  type: integer          state: OPTIONAL }
    ] }
  }

  extern => !type_definition {
    kind: SUM
    constructor: true
    supertypes: [sum top]
    body: !record { supertypes: [sum]  fields: [
      !record_field { name: schema  type: uri }
      !record_field { name: types   type: array#type_name  state: OPTIONAL }
    ] }
  }

  unknown_type => !type_definition {
    kind: SUM
    constructor: true
    supertypes: [sum top]
    body: !record { supertypes: [sum]  fields: [] }
  }


  @doc:"Numeric constraint constructors."
  real_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom top]
    body: !record { supertypes: [atom]  fields: [
      !record_field { name: min             type: value    state: OPTIONAL }
      !record_field { name: max             type: value    state: OPTIONAL }
      !record_field { name: allow_nan       type: boolean  state: OPTIONAL }
      !record_field { name: allow_infinity  type: boolean  state: OPTIONAL }
      !record_field { name: pattern         type: regex    state: OPTIONAL }
    ] }
  }

  decimal_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom top]
    body: !record { supertypes: [atom]  fields: [
      !record_field { name: min              type: value    state: OPTIONAL }
      !record_field { name: max              type: value    state: OPTIONAL }
      !record_field { name: total_digits     type: integer  state: OPTIONAL }
      !record_field { name: fraction_digits  type: integer  state: OPTIONAL }
      !record_field { name: pattern          type: regex    state: OPTIONAL }
    ] }
  }

  rational_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom top]
    body: !record { supertypes: [atom]  fields: [
      !record_field { name: min              type: value    state: OPTIONAL }
      !record_field { name: max              type: value    state: OPTIONAL }
      !record_field { name: max_denominator  type: integer  state: OPTIONAL }
    ] }
  }


  @doc:"Spec-bound constraint constructors."
  date_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom atom_specification top]
    body: !record { supertypes: [atom atom_specification]  fields: [
      !record_field { name: spec     type: uri    state: REQUIRED_FIXED  value: "https://www.rfc-editor.org/rfc/rfc3339" }
      !record_field { name: min      type: value  state: OPTIONAL }
      !record_field { name: max      type: value  state: OPTIONAL }
      !record_field { name: pattern  type: regex  state: OPTIONAL }
    ] }
  }

  time_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom atom_specification top]
    body: !record { supertypes: [atom atom_specification]  fields: [
      !record_field { name: spec              type: uri      state: REQUIRED_FIXED  value: "https://www.rfc-editor.org/rfc/rfc3339" }
      !record_field { name: min               type: value    state: OPTIONAL }
      !record_field { name: max               type: value    state: OPTIONAL }
      !record_field { name: precision         type: integer  state: OPTIONAL }
      !record_field { name: require_timezone  type: boolean  state: OPTIONAL }
      !record_field { name: pattern           type: regex    state: OPTIONAL }
    ] }
  }

  datetime_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom atom_specification top]
    body: !record { supertypes: [atom atom_specification]  fields: [
      !record_field { name: spec              type: uri      state: REQUIRED_FIXED  value: "https://www.rfc-editor.org/rfc/rfc3339" }
      !record_field { name: min               type: value    state: OPTIONAL }
      !record_field { name: max               type: value    state: OPTIONAL }
      !record_field { name: precision         type: integer  state: OPTIONAL }
      !record_field { name: require_timezone  type: boolean  state: OPTIONAL }
      !record_field { name: pattern           type: regex    state: OPTIONAL }
    ] }
  }

  duration_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom atom_specification top]
    body: !record { supertypes: [atom atom_specification]  fields: [
      !record_field { name: spec     type: uri    state: REQUIRED_FIXED  value: "https://www.iso.org/standard/70907.html" }
      !record_field { name: min      type: value  state: OPTIONAL }
      !record_field { name: max      type: value  state: OPTIONAL }
      !record_field { name: pattern  type: regex  state: OPTIONAL }
    ] }
  }

  uuid_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [atom atom_specification top]
    body: !record { supertypes: [atom atom_specification]  fields: [
      !record_field { name: spec     type: uri      state: REQUIRED_FIXED  value: "https://www.rfc-editor.org/rfc/rfc9562" }
      !record_field { name: version  type: integer  state: OPTIONAL }
      !record_field { name: pattern  type: regex    state: OPTIONAL }
    ] }
  }

  email_type => !type_definition {
    kind: ATOM
    constructor: true
    supertypes: [string_type atom_specification atom top]
    body: !record { supertypes: [string_type atom_specification]  fields: [
      !record_field { name: min_length  type: integer  state: OPTIONAL }
      !record_field { name: max_length  type: integer  state: OPTIONAL }
      !record_field { name: length      type: integer  state: OPTIONAL }
      !record_field { name: pattern     type: regex    state: OPTIONAL }
      !record_field { name: spec        type: uri      state: REQUIRED_FIXED  value: "https://www.rfc-editor.org/rfc/rfc5322" }
    ] }
  }


  @doc:"Annotation types — usable as annotations because meta is in the schema chain (§5.4)."
  @annotation
  ordered => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [NONE PARTIAL TOTAL] }
  }

  bounded    => @annotation !type_definition { kind: REFERENCE  body: !reference { target: boolean } }
  numeric    => @annotation !type_definition { kind: REFERENCE  body: !reference { target: marker } }
  deprecated => @annotation !type_definition { kind: REFERENCE  body: !reference { target: string } }
  since      => @annotation !type_definition { kind: REFERENCE  body: !reference { target: string } }
  todo       => @annotation !type_definition { kind: REFERENCE  body: !reference { target: string } }
  lang       => @annotation !type_definition { kind: REFERENCE  body: !reference { target: string } }
}
```


---

## 3. Core Library Resolver Output

```
!!schema:"http://tson.io/1/m/meta.tn1"
@doc:"Core type library resolver output — test fixture"
!schema {

  @doc:"Marker primitive — re-exported from kernel."
  marker => !type_definition {
    kind: ATOM
    source: unit
    body: !unit {}
  }

  boolean => !type_definition {
    kind: ATOM
    source: enum
    body: !enum { members: [true false] }
  }


  @doc:"Numeric atom families."
  @ordered:TOTAL @bounded:false @numeric
  integer => !type_definition {
    kind: ATOM
    source: integer_type
    body: !integer_type {}
  }

  @ordered:PARTIAL @bounded:false @numeric
  real => !type_definition {
    kind: ATOM
    source: real_type
    body: !real_type {}
  }

  @ordered:TOTAL @bounded:false @numeric
  decimal => !type_definition {
    kind: ATOM
    source: decimal_type
    body: !decimal_type {}
  }

  @ordered:TOTAL @bounded:false @numeric
  rational => !type_definition {
    kind: ATOM
    source: rational_type
    body: !rational_type {}
  }

  @ordered:NONE @bounded:false @numeric
  complex => !type_definition {
    kind: ATOM
    source: unit
    body: !unit {}
  }


  @doc:"Signed integers — narrowings of integer."
  int8 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: -128  max: 127 }
  }

  int16 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: -32768  max: 32767 }
  }

  int32 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: -2147483648  max: 2147483647 }
  }

  int64 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: -9223372036854775808  max: 9223372036854775807 }
  }

  int128 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: -170141183460469231731687303715884105728  max: 170141183460469231731687303715884105727 }
  }

  int256 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: -57896044618658097711785492504343953926634992332820282019728792003956564819968  max: 57896044618658097711785492504343953926634992332820282019728792003956564819967 }
  }


  @doc:"Unsigned integers — narrowings of integer."
  uint8 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 0  max: 255 }
  }

  uint16 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 0  max: 65535 }
  }

  uint32 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 0  max: 4294967295 }
  }

  uint64 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 0  max: 18446744073709551615 }
  }

  uint128 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 0  max: 340282366920938463463374607431768211455 }
  }

  uint256 => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 0  max: 115792089237316195423570985008687907853269984665640564039457584007913129639935 }
  }


  @doc:"Semantic integer narrowings."
  positive_integer => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 1 }
  }

  non_negative_integer => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { min: 0 }
  }

  negative_integer => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { max: -1 }
  }

  non_positive_integer => !type_definition {
    kind: ATOM
    source: integer_type
    supertypes: [integer]
    body: !integer_type { max: 0 }
  }


  bigint => !type_definition { kind: REFERENCE  body: !reference { target: integer } }


  @doc:"IEEE 754 float narrowings of real."
  float32 => !type_definition {
    kind: ATOM
    source: real_type
    supertypes: [real]
    body: !real_type { min: -3.4028235e+38  max: 3.4028235e+38 }
  }

  float64 => !type_definition {
    kind: ATOM
    source: real_type
    supertypes: [real]
    body: !real_type { min: -1.7976931348623157e+308  max: 1.7976931348623157e+308 }
  }


  @doc:"String family."
  @ordered:NONE @bounded:false
  string => !type_definition {
    kind: ATOM
    source: string_type
    body: !string_type {}
  }

  non_empty_string => !type_definition {
    kind: ATOM
    source: string_type
    supertypes: [string]
    body: !string_type { min_length: 1 }
  }


  @ordered:NONE @bounded:false
  regex => !type_definition {
    kind: ATOM
    source: regex_type
    body: !regex_type {}
  }

  @ordered:NONE @bounded:false
  uri => !type_definition {
    kind: ATOM
    source: uri_type
    body: !uri_type {}
  }


  @doc:"Binary encoding instances."
  base64 => !type_definition {
    kind: ATOM
    source: binary
    body: !binary { encoding: BASE64 }
  }

  base64url => !type_definition {
    kind: ATOM
    source: binary
    body: !binary { encoding: BASE64URL }
  }

  base32 => !type_definition {
    kind: ATOM
    source: binary
    body: !binary { encoding: BASE32 }
  }

  hex => !type_definition {
    kind: ATOM
    source: binary
    body: !binary { encoding: HEX }
  }


  @doc:"Temporal types."
  @ordered:TOTAL @bounded:false
  date => !type_definition {
    kind: ATOM
    source: date_type
    body: !date_type {}
  }

  @ordered:PARTIAL @bounded:true
  time => !type_definition {
    kind: ATOM
    source: time_type
    body: !time_type {}
  }

  @ordered:PARTIAL @bounded:false
  datetime => !type_definition {
    kind: ATOM
    source: datetime_type
    body: !datetime_type {}
  }

  @ordered:PARTIAL @bounded:false
  duration => !type_definition {
    kind: ATOM
    source: duration_type
    body: !duration_type {}
  }


  @doc:"Identifier types."
  @ordered:NONE @bounded:true
  uuid => !type_definition {
    kind: ATOM
    source: uuid_type
    body: !uuid_type {}
  }

  @ordered:NONE @bounded:false
  email => !type_definition {
    kind: ATOM
    source: email_type
    body: !email_type {}
  }


  @ordered:NONE @bounded:false
  unknown => !type_definition {
    kind: SUM
    source: unknown_type
    body: !unknown_type {}
  }


  @doc:"Annotation types — re-exported from kernel."
  annotation    => @annotation !type_definition { kind: REFERENCE  body: !reference { target: marker } }
  documentation => @annotation !type_definition { kind: REFERENCE  body: !reference { target: string } }
  doc           => @annotation !type_definition { kind: REFERENCE  body: !reference { target: documentation } }
  alias         => @annotation !type_definition { kind: REFERENCE  body: !reference { target: string } }


  @doc:"Type references."
  float     => !type_definition { kind: REFERENCE  body: !reference { target: float32 } }
  double    => !type_definition { kind: REFERENCE  body: !reference { target: float64 } }
  number    => !type_definition { kind: REFERENCE  body: !reference { target: real } }
  int       => !type_definition { kind: REFERENCE  body: !reference { target: integer } }
  str       => !type_definition { kind: REFERENCE  body: !reference { target: string } }
  text      => !type_definition { kind: REFERENCE  body: !reference { target: string } }
  timestamp => !type_definition { kind: REFERENCE  body: !reference { target: datetime } }
}
```


---

## 4. Body Patterns and Source Semantics

### Kind determination

Composing with `atom` (directly or via `~atom &`) sets `kind: ATOM`. Composing with `product` sets `kind: PRODUCT`. Composing with `sum` sets `kind: SUM`. The base kinds themselves resolve as `kind: PRODUCT` (they are record definitions). `top` is also `kind: PRODUCT` — it is the root of the structural lattice. Bare `{...}` without explicit composition resolves to `kind: PRODUCT` by structural default.

### Supertypes

Two operations establish IS-A:
1. **`&` composition.** `uri_type => !!type ~string_type & atom_specification & {...}` makes `uri_type` directly IS-A `string_type` and IS-A `atom_specification`. Base kinds participate normally: `string_type => !!type ~atom & {...}` makes `string_type` IS-A `atom`, and `atom => !!type top & {}` makes `atom` IS-A `top`, so `string_type` transitively IS-A `top`.
2. **Instance and constructor narrowing.** `uint8 => !!type !integer { min: 0 max: 255 }` makes `uint8` IS-A `integer`. `set => !!type <T> ~array<T> {...}` makes `set` IS-A `array`.

Construction via `!T {}` does NOT establish IS-A with `T` or with `T`'s supertypes. Only `kind` is inherited. `integer => !!type !integer_type {}` records `source: integer_type` but has no supertypes — `integer_type`'s `[atom, top]` does not propagate to `integer`.

`type_definition.supertypes` records the **transitive** chain; `record.supertypes` (inside a `!record` body) records only the **direct** non-anonymous `&` compositions. They differ whenever a direct ancestor has its own supertypes. Example: `string_type` composes directly with `atom`, so its body records `supertypes: [atom]`, but its `type_definition.supertypes` is `[atom, top]` because `atom` itself IS-A `top`.

### The `source` field

Single meaning: **the constructor that produced this type.**

| Context | Example |
|---|---|
| Constructor instance | `integer.source: integer_type` |
| Instance narrowing | `uint8.source: integer_type` |
| Constructor narrowing | `set.source: array` |
| Synthetic container | `array#record_field.source: array` |

References carry their target in `body: !reference { target: T }`, not in `source`.

### Body patterns

| `!!type` form | Resolved shape | Example |
|---|---|---|
| Root `{}` | PRODUCT, `body: !record { fields: [] }`, no supertypes | `top` |
| Base kind `top & {}` | PRODUCT, `supertypes: [top]`, `body: !record { supertypes: [top] fields: [] }` | `atom`, `sum`, `reference` |
| Unit atom ctor `~atom & {}` | ATOM, `constructor: true`, `supertypes: [atom top]`, `body: !record { supertypes: [atom] fields: [] }` | `unit` |
| Atom ctor `~atom & { f }` | ATOM, `constructor: true`, `supertypes: [atom top]`, `body: !record { supertypes: [atom] fields: [...] }` | `integer_type`, `string_type`, `enum`, `binary`, `real_type` |
| Derived atom ctor `~T & U & { f }` | ATOM, `constructor: true`, `supertypes: [T U ...transitive]`, `body: !record { supertypes: [T U] fields: [merged] }` | `uri_type`, `regex_type`, `email_type`, `date_type`..`uuid_type` |
| Product ctor `~product & { f }` | PRODUCT, `constructor: true`, `supertypes: [product top]`, `body: !record { supertypes: [product] fields: [...] }` | `record`, `array`, `map`, `tuple` |
| Sum ctor `~sum & { f }` | SUM, `constructor: true`, `supertypes: [sum top]`, `body: !record { supertypes: [sum] fields: [...] }` | `choice`, `extern`, `unknown_type` |
| Ctor narrowing `~T<P> { ov }` | `constructor: true`, `source: T`, `supertypes: [T ...T's chain]`, `body: !record { supertypes: [T] fields: [...] }` | `set` |
| Ctor instance `!T {}` | kind from T's family, `source: T`, **no supertypes**, `body: !T {}` | `integer`, `string`, `uri`, `boolean`, `unknown`, `value`, `token`, `marker`, `complex` |
| Instance narrowing `!T { v }` | `source: T's ctor`, `supertypes: [T ...T's chain]`, `body: !T's_ctor { v }` | `uint8`, `non_empty_string`, `type_name` |
| Fresh record `{ fields }` | PRODUCT, `body: !record { fields: [...] }`, **no supertypes** | `atom_specification`, `record_field`, `tuple_element`, `parameter`, `type_definition` |
| Synthetic `[T]` / `set<T>` / `map<K,V>` | kind from ctor's family, `source: <ctor>`, no supertypes, `body: !<ctor> { args }` | `array#record_field`, `set#token` |
| Reference `!!type name` | REFERENCE, no supertypes, `body: !reference { target: <n> }` | `bigint`, `float`, `schema`, `annotation` (→ `marker`), `numeric` (→ `marker`) |
| Valued annotation `@annotation T` | REFERENCE, no supertypes, `body: !reference { target: T }` | `documentation`, `doc` |

### The unit family

The kernel defines three instances of `unit`: `value`, `token`, and `marker`. Core re-exports `marker` and adds `complex`. Each is `kind: ATOM`, `source: unit`, `body: !unit {}` — distinguished by name and by prose-level parsing contract (§7.11), not by schema shape.

`value` appears in `record_field.value: value?` and in meta constraint fields where the constrained atom is not in scope (e.g. `real_type.min: value?`). Where the atom IS available (`integer_type.min: integer?`), the real type is used.

`token` types record fields where identifiers appear (`record_field.name: field_name`, `parameter.name: param_name`); these are themselves narrowings of `token`.

`marker` is the target type of bare annotations like `@annotation` and `@numeric` — the resolver fills the implicit `_` and validates against marker's parsing contract.

`complex` is host-defined and not used in the kernel or meta.

### References

References have `kind: REFERENCE`, no supertypes, and `body: !reference { target: T }`. The `reference` type in the kernel provides the body shape. The resolver flattens references at use sites and attaches `@alias`.

### Nested synthetic types

Synthesis recurses. When an inline form contains another inline form (a tuple of arrays, an array of arrays, a map whose value is a tuple), each level synthesises independently and the outer body references the inner synthetic name.

Example. Given `matrix => !!type [[integer; 3]; 3]` — a 3×3 matrix expressed as an array of three-element integer arrays:

```
matrix => !type_definition {
  kind: PRODUCT
  source: array
  body: !array { element_type: array#integer#3  min_items: 3  max_items: 3 }
}

array#integer#3 => !type_definition {
  kind: PRODUCT
  source: array
  body: !array { element_type: integer  min_items: 3  max_items: 3 }
}
```

Two distinct entries: the named `matrix` for the outer 3-element array, and a synthesised `array#integer#3` for the inner 3-element array. Both have `source: array` and constraint values pinning size to 3. The outer body's `element_type` references the synthesised name, not the source form — synthesis flattens nesting into the schema namespace one entry at a time.

Tuple-of-tuples follows the same pattern. Given `bounds => !!type [coordinate, coordinate]` where `coordinate => !!type [float, float]`:

```
bounds => !type_definition {
  kind: PRODUCT
  source: tuple
  body: !tuple { elements: [
    !tuple_element { element_type: coordinate }
    !tuple_element { element_type: coordinate }
  ] }
}

coordinate => !type_definition {
  kind: PRODUCT
  source: tuple
  body: !tuple { elements: [
    !tuple_element { element_type: float }
    !tuple_element { element_type: float }
  ] }
}
```

Here `coordinate` is named (so no synthesis), and `bounds` references it twice. If `coordinate` had been written inline (`bounds => !!type [[float, float], [float, float]]`), the resolver would synthesise a single `tuple#float#float` entry (deduped) and `bounds` would reference it twice from its `tuple_element` positions.
