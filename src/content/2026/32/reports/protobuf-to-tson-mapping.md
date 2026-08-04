# Mapping Protocol Buffers IDL → TSON Schema (input for `tson-part3-json` / a possible `tson-part4-proto`)

> **Status:** Non-normative report · Prepared against TSON 2026 Revision 32 (Working Draft) · Input to the Revision 33 development cycle.
> References to "planned additions" describe design directions under consideration for future revisions, not committed specification. Produced with AI assistance (Anthropic Claude) in collaboration with the TSON author; citations of external standards should be verified against primary sources before normative use. Schema source files are cited with the `.tn` extension per the current draft-period convention (`.tn1` is reserved for the finalized version 1 release).


## Scope and framing

Same framing as the JSON Schema report: **one-directional, no round-trip requirement.** The primary use case is converting `.proto` definitions to TSON schemas that validate **protojson documents** (protobuf's canonical JSON mapping) — the natural companion to the JSON Schema on-ramp, since protojson is how protobuf-defined APIs surface as JSON. Binary wire-format compatibility is explicitly out of scope; where it matters (field numbers), the information is preserved as annotations, not semantics.

One strategic difference from the JSON Schema case, stated up front: **the strictness story inverts.** JSON Schema → TSON was a strengthening exercise (annotations become validated types, open objects become closed records). Protobuf → TSON is a *fidelity* exercise — protobuf is already closed-world and nominal, but it has almost **no constraint vocabulary** (no min/max, no patterns, no length bounds). A converted schema is structurally faithful but no stricter than the source unless enriched. The constraint layer the ecosystem actually uses — **protovalidate** (`buf.validate` options, CEL-based) — is where the strengthening material lives, and it gets its own section (§E).

## TL;DR

- Protobuf → TSON is the **best-aligned mapping yet examined**: messages are closed records, `oneof` is nearly isomorphic to TSON's field group (§5.11), protobuf maps allow **typed non-string keys** exactly as TSON `map<K,V>` does (the one place JSON Schema couldn't follow), enums are token sets, and there is no negation, no conditionals, no open-world constraint algebra to decline. Almost nothing lands in drop-with-report.
- The real impedance is **presence semantics**, and it resolves beautifully: proto3's implicit presence ("absent means the zero value, injected") is *exactly* TSON's `REQUIRED_DEFAULT` (`~ v`, injected on decode) — the construct that had **no** faithful JSON Schema mapping. Explicit presence (`optional`, message fields) is TSON `OPTIONAL` (`?`). Proto2/editions `required` is TSON's default. All three protobuf presence disciplines map onto existing TSON field states with matching injection semantics.
- `google.protobuf.Any` — protojson's `{"@type": "url", ...}` — is an in-band-discriminated open sum and maps conceptually onto TSON's **`extern`** (data must carry `!!schema` + `!type`). The `@type` member is the wire spelling of exactly the discrimination machinery designed in the JSON Schema work.
- Field numbers, reserved ranges, and wire-encoding variants (`sint32` vs `int32` vs `sfixed32`) are **wire metadata, not type semantics** — annotation vocabulary (`@field_number`, `@reserved`), preserved for provenance and a possible future binary story, ignored by validation.
- Protovalidate rules map onto TSON refinements almost term-for-term (`gte`/`lte` → `min`/`max`, `min_len` → `min_length`, `pattern` → `pattern` — and protovalidate uses **RE2**, which like I-Regexp excludes backreferences, so the regex story is *friendlier* than the ECMA-262 case). CEL expressions are the `if/then/else` analogue: drop-with-report.

## A. Type-by-type mapping (proto3 / editions primary; proto2 noted)

**Legend:** ✅ clean · ⬆ strengthens · ◑ transform/decision · ✗ drop-with-report · Ⓐ annotation-only.

### Scalar types

| Protobuf | TSON | |
|---|---|---|
| `double` | `float64` | ✅ NaN/±Infinity policy needed — see protojson §D |
| `float` | `float32` | ✅ same caveat |
| `int32`, `sint32`, `sfixed32` | `int32` | ✅ one value range; encoding variants → `@wire` annotation Ⓐ |
| `int64`, `sint64`, `sfixed64` | `int64` | ✅ but see protojson int64-as-string §D |
| `uint32`, `fixed32` | `uint32` | ✅ |
| `uint64`, `fixed64` | `uint64` | ✅ same protojson caveat |
| `bool` | `boolean` | ✅ |
| `string` (must be valid UTF-8) | `text` | ✅ exact — protobuf's UTF-8 requirement matches text semantics |
| `bytes` | binary type; in protojson position: `base64` | ✅ TSON's binary-as-distinct-type, which was *unrepresentable* in JSON Schema, is protobuf-native |

The three wire encodings per width (`int32`/`sint32`/`sfixed32`) collapse to one TSON type — a genuine loss only for binary wire compatibility, which is out of scope. `@wire { encoding: zigzag }`-style annotations preserve the information for a future part.

### Composite constructs

| Protobuf | TSON | |
|---|---|---|
| `message` | closed `record` | ✅ **exact philosophical match** — both are closed, nominal, field-set-fixed-by-schema. No triage rule needed; every message is a record |
| nested message | nested/namespaced type declaration | ◑ naming convention needed (see §F open questions) |
| `repeated T` | `[T]` | ✅ `packed` is wire-level Ⓐ |
| `map<K, V>` | `map<K, V>` | ✅ protobuf keys may be any integral, bool, or string type — TSON's typed map keys, which JSON Schema could not express, map directly. protojson stringifies keys on the wire (§D) |
| `enum` | `!enum [...]` of the value names | ◑ open/closed decision — §B |
| `oneof` | **field group** (§5.11), OPTIONAL | ✅ near-isomorphism — §C |
| `optional T` (proto3 ≥3.15) / editions `EXPLICIT` | `T?` (OPTIONAL) | ✅ |
| implicit-presence scalar (proto3 default) / editions `IMPLICIT` | `T ~ <zero-value>` (`REQUIRED_DEFAULT`) | ✅ **exact**, including injection — §B |
| proto2 `required` / editions `LEGACY_REQUIRED` | REQUIRED (TSON's default) | ✅ |
| proto2 `default = X` | `~ X` (`REQUIRED_DEFAULT`) | ✅ exact — protobuf injects on read, TSON injects on decode. The semantic match JSON Schema's non-injecting `default` denied us |
| `extensions` / extension ranges (proto2) | ✗ or `extern`-adjacent | ✗ rare in modern corpora; report |
| `reserved 4, 9 to 11; reserved "foo"` | `@reserved` annotation | Ⓐ no validation semantics; valuable provenance for schema evolution tooling |
| field numbers | `@field_number N` | Ⓐ mandatory to *preserve* (cheap, enables any future binary part), ignored by validation |
| `option` / custom options | annotations | Ⓐ except `buf.validate` options — §E |
| `service` / `rpc` | out of scope | — schema language only; note for a possible future part |
| groups (proto2, deprecated) | ✗ | ✗ |

### Well-known types

| Protobuf WKT | TSON | |
|---|---|---|
| `google.protobuf.Timestamp` | `datetime` | ⬆ protojson: RFC 3339 string — the core type validates it |
| `google.protobuf.Duration` | `duration` | ◑ protojson spells it `"3.000000001s"`, not ISO 8601 — needs a pattern-refined type or a core decision |
| `google.protobuf.Struct` / `Value` / `ListValue` | `map<text, value>` / `value` / `[value]` | ✅ |
| `google.protobuf.Empty` | `{}` | ✅ |
| wrappers (`Int32Value`, `StringValue`, …) | nullable scalar: `T?` in field position, or `(T \| null)` once the null atom lands | ✅ wrappers exist *only* to give scalars explicit presence — TSON expresses the intent directly and the wrapper disappears |
| `google.protobuf.Any` | `extern` | ◑ §C |
| `google.protobuf.FieldMask` | `text` with pattern, or `[token]` | ◑ |

## B. Presence, defaults, and enums — the three disciplines

**Presence is the section that had to be written carefully for JSON Schema and writes itself for protobuf.** Protobuf editions (2023) makes the disciplines explicit as `features.field_presence`, and each value lands on an existing TSON field state:

| Editions feature | Protobuf behavior | TSON field state |
|---|---|---|
| `LEGACY_REQUIRED` | must appear on wire | `REQUIRED` (default) |
| `EXPLICIT` | tracked presence; absent is distinguishable | `OPTIONAL` (`?`) |
| `IMPLICIT` | absent ⇔ zero value; readers see the zero | `REQUIRED_DEFAULT` (`~ zero`) |

The `IMPLICIT` row deserves emphasis because it exercises TSON's injection semantics *correctly*: protojson serializers omit zero-valued implicit fields by default, so the document arrives without them, and TSON's decode-time injection reconstructs exactly what a protobuf reader would see. The JSON Schema report ruled `default` → non-injecting annotation (injection would have changed semantics); for protobuf, injection *is* the source semantics. Same TSON construct, opposite converter rule, both principled.

**Enums** carry two decisions. First, representation: protobuf enum values are (name, number) pairs; protojson writes names and accepts numbers on parse. The strict mapping is a closed `!enum` of names, with numbers preserved as annotations (they're wire metadata like field numbers); accepting numeric spellings would need `(enum | int32)` and is better rejected — a documented strengthening. Second, openness: proto3 enums are **open** (unknown values are preserved, not errors; editions: `features.enum_type = OPEN/CLOSED`). A closed TSON enum is therefore stricter than an open proto3 enum — which is the correct strictness-first choice, but it changes forward-compatibility behavior: a document carrying a value added in a *newer* schema revision fails against the older converted TSON schema, where a protobuf reader would have shrugged. The conversion report should flag every open enum with exactly that sentence, because it's the one place the converted schema is *less* forward-compatible than the source, and teams doing rolling deployments need to know. (First-value-must-be-zero and `allow_alias` are authoring rules with no validation content — annotations.)

## C. Sums: `oneof` and `Any` — the discriminator work pays off

**`oneof` → field group is the cleanest sum mapping in either report.** A protobuf `oneof` is: a set of labelled fields inside a message, at most one set, setting one clears the others, discriminated by which field is present. TSON's field group (§5.11) is: labelled fields inside a record, exactly-one (REQUIRED group) or at-most-one (OPTIONAL group) present, discriminated by field label. The mapping is the OPTIONAL group, member for member:

```protobuf
message Payment {
  oneof method {
    CardDetails card = 1;
    BankDetails bank = 2;
    string voucher_code = 3;
  }
}
```

```
Payment => {
  ( card: CardDetails | bank: BankDetails | voucher_code: text )?
}
```

No discriminator token, no pinned constants, no tag — the label *is* the discriminator, in-band, exactly as protojson serializes it (the set member appears by name; the others are absent). Note what this is **not**: it is not a `choice`, and the JSON-Schema-derived machinery (discriminator fields, `REQUIRED_FIXED` pins) is not needed. The two sum styles now have a clean division of labor in TSON: *value-discriminated sums* (OpenAPI discriminator → `choice` + discriminator token) and *label-discriminated sums* (protobuf oneof → field group). Both major IDL traditions land on native constructs.

Two edges: protobuf cannot express a *required* oneof (at-most-one is all the language offers; protovalidate adds `required` on oneofs) — where a protovalidate rule says required, promote to a REQUIRED group, a strict upgrade TSON expresses natively. And oneof members can't be `repeated` or `map`, which TSON field groups don't care about — no rule needed.

**`Any` → `extern`.** `google.protobuf.Any` is an open sum discriminated by an in-band type URL; protojson spells it `{"@type": "type.googleapis.com/pkg.Msg", ...fields}` (with a `value` member for WKTs). TSON's `extern` is precisely this shape: membership deferred to an external schema, data required to carry `!!schema` + `!type`. The conceptual mapping is exact; the part-3 work is the encoding rule aligning `@type` URL parsing with extern's schema/type identification — i.e., `@type` is the wire spelling of extern's mandatory discrimination, the same "the annotation slot disappears in JSON, so the tag moves in-band" move as the discriminator design. Where a corpus uses `Any` as "truly anything," `value` is the honest lowering; the converter should offer both and report which it chose.

## D. Validating protojson: the encoding layer decisions

These are the lexical-layer items (the gap flagged as #2 in the open-gaps discussion) made concrete, because protojson — unlike "JSON as parsed by whatever library" — is a *specified* mapping, which makes the decisions tractable:

- **Field names**: protojson emits lowerCamelCase and parsers must accept both camelCase and the original proto name. A TSON record has one name per field, so the converter must pick one (camelCase, matching canonical output) and reject the other — a strengthening over the protojson parser contract, worth a converter flag (`--accept-proto-names` emitting a second schema) and a report line.
- **int64/uint64 as strings**: canonical protojson emits 64-bit integers as decimal strings; parsers accept numbers too. Strict-canonical validation wants a string-typed field with an integer pattern; permissive wants `(int64 | text^{pattern})`. Recommend: converter flag, canonical-strict default. This is the ugliest single decision in the mapping and it is protojson's fault, not TSON's.
- **bytes**: base64 (parsers also accept base64url) → TSON `base64` core type; canonical-strict rejects base64url. Flag + report.
- **float specials**: `"NaN"`, `"Infinity"`, `"-Infinity"` as strings. Whether TSON `float64` admits them, and in what spelling, is a core-library decision to make explicitly rather than inherit.
- **map keys**: always strings on the wire regardless of declared key type — so a `map<int32, V>` validates its protojson form as string keys with an integer pattern, while the *model* keeps the typed key. This is the same stringified-keys lowering the JSON Schema report reached for non-text map keys, except here it's specified by protojson rather than invented, including the canonicalization ("1" not "01").
- **Unknown fields**: protojson parsers reject unknown members **by default** (with an ignore option) — closed-record semantics already. TSON's closure matches the default protojson contract exactly; no strengthening, no divergence. The pleasant inverse of the JSON Schema situation.
- **Absent vs. present-zero**: covered by §B — implicit-presence omission + TSON injection reproduces reader semantics.

## E. Protovalidate: where the strictness material lives

Bare protobuf → TSON produces faithful structure with no constraints, because protobuf has none. The ecosystem's answer is protovalidate (`buf.validate` field options, the successor to protoc-gen-validate), and its rule vocabulary maps onto TSON refinements almost mechanically:

| buf.validate rule | TSON | |
|---|---|---|
| `const` | `= v` (`REQUIRED_FIXED`) | ✅ |
| `gt/gte/lt/lte` | `^ { min / max / exclusive_* }` | ✅ |
| `in` / `not_in` | `!enum` / ✗ (not_in is negation) | ◑ |
| `min_len/max_len` (string, code points) | `min_length/max_length` | ✅ unit matches if TSON counts code points — pin this down |
| `min_bytes/max_bytes` | byte-counted length facet or ✗ | ◑ |
| `pattern` (**RE2**) | `pattern` (I-Regexp) | ◑ friendlier than ECMA-262: RE2 also excludes backreferences and lookaround, so the untranslatable class is smaller; anchoring rules still needed |
| `prefix/suffix/contains` | pattern refinements | ✅ mechanical |
| `email/uri/uuid/ipv4/ipv6/hostname` | core `email/uri/uuid/ipv4/ipv6` types | ⬆ same upgrade as JSON Schema `format` |
| `repeated.min_items/max_items/unique` | `[T; N..M]` / `unique_items` | ✅ |
| `map.min_pairs/max_pairs` / `map.keys/values` rules | `min_items/max_items` / key_type & value_type refinement | ✅ |
| `required` (incl. on oneof) | `REQUIRED` / promote group to REQUIRED | ✅ |
| CEL expressions (`cel:` custom constraints) | ✗ drop-with-report | ✗ the `if/then/else` analogue; same verdict, same reasoning |

So the practical converter pipeline is: **proto structure → TSON structure (near-lossless), protovalidate rules → TSON refinements (the strictness layer), CEL → the report.** A team using buf's validation stack gets a TSON schema that enforces at validation time what they previously enforced in generated runtime code — which is a better pitch to protobuf shops than the JSON Schema pitch, since it *consolidates* two layers (IDL + validate plugin) into one schema.

## F. Closing the gap — what protobuf asks of TSON

Strikingly little, and nothing kernel-shaped. In tier order:

1. **Annotation vocabulary** (Tier 1): `@field_number`, `@reserved`, `@wire { encoding }`, `@enum_number`, `@proto_name` (original field name, for the camelCase decision), `@package`. Pure provenance; enables a future binary part without committing to one.
2. **Duration spelling** (Tier 1–2): decide whether core `duration` admits protojson's `"1.5s"` form, or ship a `proto_duration` refined type in a proto-companion module. A companion module (`proto.tn` alongside `core.tn`) is likely the right home for this plus the WKT aliases — vocabulary, not kernel.
3. **Float specials policy** (Tier 2): NaN/Infinity admission and spelling for `float32`/`float64` — needed for §D regardless of protobuf, protobuf just forces the question.
4. **Byte-counted string length facet** (Tier 2, optional): only if `min_bytes/max_bytes` matters in real corpora; otherwise report.
5. **Recursion semantics** (already flagged as open gap #3): protobuf makes it urgent — recursive messages are idiomatic (`message TreeNode { repeated TreeNode children = 2; }`) and appear in the first dozen schemas of any real corpus. This is the one *blocking* item, and it blocks the JSON Schema converter equally.
6. **Nothing from the JSON Schema additions list is newly required** — and two items get corroborating evidence: the null atom (#4) is what makes wrapper types collapse cleanly, and the field-group machinery being already-sufficient for oneof validates keeping `choice` and field groups as distinct constructs rather than unifying them.

Notably absent from the ask: no rest field (messages are closed), no discriminator token (oneof is label-discriminated), no open-record anything, no negation, no conditionals beyond CEL-in-the-report. Protobuf's design philosophy — closed, nominal, wire-pragmatic — is close enough to TSON's that the mapping is mostly transliteration plus encoding rules. The "this should be easier" instinct is confirmed by the shape of this section.

## Recommendations

- **Sequence it second.** The protobuf converter reuses the JSON Schema converter's report format, refinement mapping (protovalidate ≈ the constraint subset), and regex policy, while touching none of the hard JSON Schema machinery. Ship it after Stage 3 of the JSON Schema plan; it's a fast follow that widens the on-ramp to a different (and large) population.
- **Resolve recursion first** — it gates both converters and is spec work, not converter work.
- **Ship a `proto.tn` companion module** for WKT aliases, the duration spelling, and the annotation vocabulary, keeping the kernel and core untouched.
- **Make protovalidate support a headline**, not a footnote: "your buf.validate rules become schema-enforced" is the protobuf-native strictness pitch.
- **Canonical-strict protojson as the default posture**, with flags for the accept-both leniencies (proto names, int64 numbers, base64url) — each flag emitting a report line, so leniency is always visible.

## Caveats

- Editions (2023) is still propagating through the ecosystem; corpora are a mix of proto2, proto3, and editions files. The editions feature model is the right normalization target (as 2020-12 was for OpenAPI 3.0), with proto2/proto3 lowered to feature settings first.
- Open enums are the one forward-compatibility regression under strict conversion — flag per-enum, per the §B discussion.
- The protojson leniencies (dual field names, int64 as number, base64url) mean "validates canonical protojson" and "accepts everything a protojson parser accepts" are different products; the flags exist because both are legitimate.
- protovalidate's CEL layer can express arbitrary cross-field logic; corpora leaning heavily on CEL will see a fatter drop-report, and that's the correct outcome under the declined-constructs policy.
- `Any`-heavy APIs (common in gRPC reflection-adjacent designs) stress the `extern` mapping before `extern`'s cross-schema rules are fully settled — the same schema-chain scoping question deferred with `sealed` (#10), now with a concrete consumer.
- This report is written against protobuf as specified through editions 2023 and protojson's canonical mapping; TSON references are to the 2026 Revision 32 working draft plus the planned additions from the JSON Schema report, none of which are frozen.
