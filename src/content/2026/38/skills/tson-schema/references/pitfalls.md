# Pitfalls — check before delivering

Every mistake this skill has seen, with the fix. Read this before handing over a schema.

| You wrote | Problem | Write instead |
|---|---|---|
| no `!!import` of core, then `name: text` | `text` unresolved — kernel types are not field types | add `!!import:"https://tson.io/2026/37/m/core.tn"` |
| `!!schema:"…"` in a schema file | schemas are governed by `!!meta` | `!!meta:"…"` |
| `!!meta` after `!!import` | order is fixed | `!!id`, `!!meta`, `!!import…` |
| `person: { name: text }` inline, `age: !integer ^ { min: 0 }` inline | bare records and atom refinements must be named | declare `person`, `age`, reference by name |
| `age => integer { min: 0 }`, `age => integer ^ { min: 0 }` | atom refinement needs `!` | `age => !integer ^ { min: 0 }` |
| `employee => person { dept: text }` | no operator | `person & { dept: text }` |
| `!integer ^ { minimum: 0 }`, `{ maxLength: 5 }` | JSON Schema spellings are unknown facets | `min`, `max_length` |
| `!float64 ^ { multiple_of: 0.05 }` | floats have no `multiple_of` | `!number ^ { multiple_of: 0.05 }` |
| `!enum [1 2 3]` | numbers are never enum members | `!integer ^ { min: 1  max: 3 }` or `!integer ^ { members: [1 2 3] }` |
| `!enum ["Not Started"]`, `!enum { members: [ … ]  profile: TEXT }` | `enum` members are names; there is no `profile` | `!text_enum ["Not Started"]`, or the identifier `not_started` |
| `( identifier \| text )` expected to be tag-free | both are string-class text families | tag every value, or use a field group |
| `status: !enum [A B]` at a field | constructor application at a field position | declare `status => !enum [A B]` |
| `xs: list<text>`, `m: map<text, int>`, `[text]?` meaning voidable elements | no `list`/`map` generics; `?` placement | `[text]`, `{text => integer}`, `[text?]` |
| `int`, `string`, `bool`, `float`, `double`, `str`, `timestamp`, `binary`, `base64` | not core names | `integer`/`int32`, `text`, `boolean`, `float64`, `datetime`, `bytes` |
| `non_empty_text`, `positive_integer`, `non_negative_integer`, `negative_integer`, `non_positive_integer` | not in core | declare the line yourself: `title_text => !text ^ { min_length: 1 }`, `count => !integer ^ { min: 0 }` |
| `id: identifier`, `{identifier => handler}` with no declaration | core declares no `identifier` | `identifier => !identifier_type { continue_add: "-" }` in the schema |
| `unit`, `!unit {}` | no such type or constructor | `void` (a slot holding no value); for "any scalar" declare `scalar => !value_type {}` |
| `label: text?` meaning "may be left out" | `?` on the *type* admits `_`; the key is still required | `label?: text` (or `label?: text?` if `_` is also meant) |
| `port: integer ~ 8080`, `debug: boolean = false` meaning injected | a default needs `?` on the name; an unmarked `= v` is a marker the document must write | `port?: integer ~ 8080`, `debug?: boolean = false` |
| `f: text? ~ x` | the name is unmarked — a default only omission can reach | `f?: text? ~ x` (omitted → `x`, `_` → void) or `f?: text ~ x` |
| `f?: text? = x` | a pin on a voidable type | `f?: text = x` |
| `f: text? = _`, `f: text ~ _`, `f: void` | `_` is never a modifier value; `a: void` admits no document | `f?: void?` (omitted or `_`, nothing else) |
| `retry => <N> { attempts: int32 ~ N }` | a routed default takes the name mark a literal one does | `attempts?: int32 ~ N` |
| `(text \| void)` | void is not a variant | `field?: text` |
| `address?: address ~ { … }`, `tags?: [text] ~ []` | defaults only on atoms/enums, scalars only | drop the default and mark the name `?` |
| `account- { password }` | hyphen absorbed into the name | `account - { password }` |
| `config ^ { … } - { x }` | no removal on a refinement head | `config & {} - { x }` or restructure |
| `vector` (a non-record template) used bare; `<T> { v: text }` | missing args; unused parameter | `vector<text, 3>`; drop `<T>` |
| `<N> !integer ^ { min: N }` | parameterised atom refinement is not a form | `<N> !integer_type { min: N }` |
| `<T> { a: T  b?: int32 ~ T }` | one parameter in a type and a value position | two parameters |
| `<T: text_type> { a: T }` | a bound names a type, never a constructor | `<T: text>`, and refine into the family (`!text ^ { … }`) for an argument that must pass |
| `<N: int8> !array { element_type: text  min_items: N }` | a constructor template's value parameters are the meta's types | leave `N` unwritten: it is read as the meta's `non_negative_integer` |
| `k: dog_of<text>` where `dog_of => <T> pet & { … }` | a use-site application composing onto a record would be an undeclared family member | `dogs => dog_of<text>`, then `k: dogs` |
| `item => { inner: item }` | no finite value | `inner?: item` |
| `~array & { … }` in a user schema | there is no constructor marker; a constructor is an entry that IS-A `top`, declarable only under the meta-kernel | refine or apply instead (or write a meta-schema — `extension-meta-schemas.md`) |
| `op => vector<order, 3> & { … }`, `op => {text => order} ^ { … }` | a constructor application closes to a binding record with no fields | compose onto a *record* — a record template's application (`box<order> & { … }`) is fine |
| `x => { s: some_operation }` where `some_operation` is a `data`-kinded instance | a DATA entry is declared and applied, never named as a type | name the payload's types; see `extension-meta-schemas.md` |
| `@discriminator:type` on a choice of records | retired; a choice has no discriminator | `pet => abstract { type: text =?  … }` with each member pinning `type: = "dog"`, and the position typed `pet` |
| `@rest` on a map field, `additionalProperties` | retired; records are closed with no exception | a map-typed field, `extras?: {text => dynamic}` |
| `pet => { type: text = "pet" … }` as a discriminated base | a pin never changes, so no member could pin its own | `type: text =?` on the base (implies `abstract`) |
| `leaf => final { … }` then `x => leaf & { … }` or `leaf ^ { … }` | nothing composes or refines onto a FINAL record | drop `final`, or subtract (`leaf - { … }`) |
| a binding map or class table keyed on `box_text_04117bb4` | minted names are not stable | declare `bx => box<text>` and key on `bx` |
| `@expires:"…"` used in data without a declaration | annotations are types | declare `expires => @annotation text` |
| `@deprecated:"use email"` | `@deprecated` is a bare marker | `@deprecated @doc:"Use email."` |
| `@since:"1.2"`, `@todo:"…"`, `@lang:"en"`, `@documentation:"…"` | not in `meta.tn` | `@comment:"…"` for a maintainer's note, `@doc:"…"` for docs; a lifecycle annotation needs an extension meta-schema |
| `@ordered:TOTAL` | the annotation is `@ordering`; `ordered` is a container facet | `@ordering:TOTAL` |
| `@examples:[{ x: 1 }]` | examples are text | `@examples:["{ x: 1 }"]` |
| `?sha256=` written from memory | fabricated pin | compute it or omit it |
| `; comment`, `# comment`, `// comment` in a schema | no comment syntax (`;` is the size separator; `#` `/` are lexer errors) | `@doc:"…"` before the declaration or field |
| example data `metadata: { k: v }` for a `{text => text}` field | that is a record; the map needs `=>` | `metadata: { k => v }` |
| `!array { element_type: T  state: OPTIONAL }`, `element_state` | retired spellings | `voidable: true` (`[T?]`) |
| `!array { … unordered: true }` | the facet is `ordered` | `ordered: false` (an array is ordered by default; a map is not) |
| `tags: set<text>` meant non-empty | a set may be empty | `tag_set => !set_type { element_type: text  min_items: 1 }`, then `tags: tag_set` |
| `!set_type { element_type: T  min_items: 0 }` for a possibly-empty set | that is already `set<T>` | `set<T>` |
| `one => [text]` meant as a one-position tuple | a single bracketed type is an array | `one => tuple1<text>`, or `voidable_tuple1<text>` |
| `link: uri` holding `"../x"` | `uri` requires a scheme | `uri_reference` |
| `uri` holding `https://例え.jp/` | a URI is US-ASCII | `iri` (or `iri_reference`) |
| `!uri ^ { scheme: "https" }` | the facet is a set | `!uri ^ { schemes: [https] }` |
| `!text ^ { normalization: NFC }` | `normalization` is fixed at construction | a fresh family, `!text_type { normalization: NFC }` |
| `( a?: A \| b: B )` | the lone member of an option takes no `?` | `( a: A \| b: B )` |
| `( a: A  b?: B )` | a bare one-option group is plain fields | `a: A  b?: B`, or `( a: A  b?: B )?` for "`b` requires `a`" |
| `( a: A \| b: B  c: C )+` | `+` takes single unmarked members | `( a: A \| b: B  c: C )` or two groups |
| `( a: A \| b: B )` read as "at least one" | a bare group is *exactly one* | `( a: A \| b: B )+` |
| a nested `!!schema` at a `declared` position | `declared` admits LOCAL types only | type the position `dynamic`, `extern` or `extern_of<…>` |

