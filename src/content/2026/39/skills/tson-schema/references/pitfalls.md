# Pitfalls — check before delivering

Every mistake this skill has seen, with the fix. Read this before handing over a schema. The first
table covers the header, imports and the kernel's qualified names; the second is everything else.

## Header, imports and names

| You wrote | Problem | Write instead |
|---|---|---|
| a schema whose root is a bare `{ … }` | a root not tagged `!schema` makes the file a *data* document | `!schema { … }` |
| `!!schema:"…"` heading a data document | not a directive: only `!!id` and `!!import` exist | `!!import:"…"` (repeatable; the imports form one namespace) |
| `!!import:"…"` before a field value or array element | no directive stands below the header; a value cannot open a schema of its own | import the foreign schema in the document's header, and type the position `meta.declared` or a choice over the types it admits |
| `!!import` before `!!id` | `!!id` is the first line or absent | `!!id`, then the `!!import`s |
| `meta.tn` alone, then `id: uuid`, `n: int32`, `d: date`, `x: number`, `@title` | those belong to `net.tn`, `numeric.tn`, `temporal.tn`, `core.tn` | import the library you use, or `core.tn` for all of them |
| `!record`, `!array`, `!map`, `!set_type`, `!tuple`, `!choice`, `!enum_type`, `!void_type`, `!namespace { … }` | the kernel's machinery is written by path | `!meta.record`, `!meta.array`, `!meta.map`, `!meta.set_type`, `!meta.tuple`, `!meta.choice`, `!meta.enum_type`, `!meta.void_type`, `!meta.namespace { key_type: …  value_type: … }` |
| `!integer_type`, `!decimal_type`, `!float_type`, `!rational_type`, `!complex_type` | by path | `!numeric.integer_type`, `!numeric.decimal_type`, … |
| `!text_type`, `!identifier_type`, `!regex_type` | by path | `!unicode.text_type`, `!unicode.identifier_type`, `!unicode.regex_type` |
| `!uri_type`, `!iri_type`, `!uuid_type`, `!email_type`, `!ipv4_type`, `!hostname_type`, `!media_type_type`, … | by path | `!net.uri_type`, `!net.iri_type`, `!net.uuid_type`, … |
| `!bytes_type`, `!date_type`, `!time_type`, `!datetime_type`, `!duration_type`, `!period_type` | by path | `!binary.bytes_type`, `!temporal.date_type`, … |
| `identifier`, `type_name`, `field_name`, `param_name` used without declaring them | the kernel's are under `meta` | `meta.identifier`, `meta.type_name`, …; or declare your own `identifier => !unicode.identifier_type { continue_add: "-" }` |
| `tuple1<text>`, `voidable_tuple1<text>` | the kernel's, by path | `meta.tuple1<text>`, `meta.voidable_tuple1<text>` |
| `non_negative_integer` | no such name | `numeric.count` |
| `@disjoint`, `@annotation` | by path | `@meta.disjoint`, `@meta.annotation` |
| `@ordering:TOTAL`, `@bounded`, `@exact`, `@numeric` | the classifying markers live under `atom` | `@atom.ordering:TOTAL`, `@atom.bounded:true`, … |
| `to: ref<method>` | `ref` is the kernel's `meta.ref`, built on `meta.reference_type` | `to: meta.ref<method>` |
| `id => !reference { target: uuid }` | the alias constructor is `meta.alias` | `id => uuid` (or `!meta.alias { target: uuid }`) |
| `extras?: {text => any}`, `a: any`, `a: declared`, `x: value` | there is no "any value" or "any scalar" type | `meta.declared` (a value naming any type of the closure, tag required), with the foreign schema imported; or a choice; or `{text => text}` for free-form strings |
| `!number ^ { min: 0x10 }`, `!duration ^ { max: P1Y }`, `!date ^ { min: "2026-01-01T00:00:00Z" }` | a facet is typed by its family's instance, and the value fails it at load | `min: 16`; `max: P365D` (or a `period` for months); `min: 2026-01-01` |
| `!ipv4 ^ { within: ["10.0.0.1/8"] }` | `within` is `[cidr4]`, and a network has no host bits | `["10.0.0.0/8"]` |
| a separate schema written just to declare a constructor, a namespace type or a value entry | any schema may declare them | declare them in the schema itself; `extending.md` |
| `site => { at: address }` inside `geo => !schema { … }` | a name resolves from the root; there is no relative lookup | `at: geo.address` |

## Everything else

| You wrote | Problem | Write instead |
|---|---|---|
| `person: { name: text }` inline, `age: !integer ^ { min: 0 }` inline, `status: !enum [A B]` at a field | bare records, atom refinements and constructor applications must be named | declare `person`, `age`, `status`, reference by name |
| `age => integer { min: 0 }`, `age => integer ^ { min: 0 }` | atom refinement needs `!` | `age => !integer ^ { min: 0 }` |
| `employee => person { dept: text }` | no operator | `person & { dept: text }` |
| `!integer ^ { minimum: 0 }`, `{ maxLength: 5 }` | JSON Schema spellings are unknown facets | `min`, `max_length` |
| `!float64 ^ { multiple_of: 0.05 }` | floats have no `multiple_of` | `!number ^ { multiple_of: 0.05 }` |
| `!enum [1 2 3]` | numbers are never enum members | `!integer ^ { min: 1  max: 3 }` or `!integer ^ { members: [1 2 3] }` |
| `!enum ["Not Started"]` | `enum` members are identifiers | `!text ^ { members: ["Not Started"] }`, the identifier `not_started`, or an enum over a words type (next rows) |
| `!text_enum ["sedentary" "lightly active"]` | `text_enum` is withdrawn | a closed text set, `!text ^ { members: [ … ] }`; or names with spaces, `words => !unicode.identifier_type { medial: " " }` then `!meta.enum_type { name_type: words  members: [ … ] }` |
| `!meta.enum_type { type: kebab  members: [ … ] }` | the slot is `name_type` | `!meta.enum_type { name_type: kebab  members: [ … ] }` |
| `!meta.enum_type { name_type: text  … }` | `name_type` must be an identifier family | declare one (`words`, `kebab`), or use `!text ^ { members: [ … ] }` |
| `person => { "first name": text }`, `{ "@id": text }` | a field name is a value of the record's name type, an identifier by default (a resolver error, not a parse error) | `first_name`; for a JSON vocabulary, a name type on a fieldless abstract base — `declaration-forms.md` §2 |
| `json_record & address` (`address` declared plainly) | supertypes with different name types do not compose | declare `address => json_record & { … }` |
| a name type with `normalization: NONE`, or `ASCII_CASEFOLD` over a non-ASCII profile | a name type's form must imply NFC | `NFC` (the default), `NFKC_CASEFOLD`, or an `ASCII`-based profile with `ASCII_CASEFOLD` |
| `continue_add: "\u{AD}"` (soft hyphen), a control, a non-U+0020 space in a profile | the profile floor | only visible characters; `medial: " "` for words |
| `( identifier \| text )` expected to be tag-free | both are string-class text families | tag every value, or use a field group |
| `xs: list<text>`, `m: map<text, int>`, `[text]?` meaning voidable elements | no `list`/`map` generics; `?` placement | `[text]`, `{text => integer}`, `[text?]` |
| `int`, `string`, `bool`, `float`, `double`, `str`, `timestamp`, `binary`, `base64` | not bundled names | `integer`/`int32`, `text`, `boolean`, `float64`, `datetime`, `bytes` |
| `non_empty_text`, `positive_integer`, `non_negative_integer`, `negative_integer` | no library declares a bound a schema can write | declare the line yourself: `title_text => !text ^ { min_length: 1 }`, `count => !integer ^ { min: 0 }` |
| `unit`, `!unit {}` | no such type or constructor | `void` (a slot holding no value) |
| a local `date`, `uuid`, `title` beside a `core.tn` import | every name in the closure is reserved | another name, or import only the libraries you need |
| `label: text?` meaning "may be left out" | `?` on the *type* admits `_`; the key is still required | `label?: text` (or `label?: text?` if `_` is also meant) |
| `port: integer ~ 8080`, `debug: boolean = false` meaning injected | a default needs `?` on the name; an unmarked `= v` is a marker the document must write | `port?: integer ~ 8080`, `debug?: boolean = false` |
| `f: text? ~ x` | the name is unmarked — a default only omission can reach | `f?: text? ~ x` (omitted → `x`, `_` → void) or `f?: text ~ x` |
| `f?: text? = x` | a pin on a voidable type | `f?: text = x` |
| `f: text? = _`, `f: text ~ _`, `f: void` | `_` is never a modifier value; `a: void` admits no document | `f?: void?` (omitted or `_`, nothing else) |
| `retry => <N> { attempts: int32 ~ N }` | a routed default takes the name mark a literal one does | `attempts?: int32 ~ N` |
| `(text \| void)` | void is not a variant | `field?: text` |
| `address?: address ~ { … }`, `tags?: [text] ~ []` | defaults only on atoms/enums, scalars only | drop the default and mark the name `?` |
| `value: kind!` with `kind` declared after it, optional with no default, or typed `int32` / `meta.ref<method>` | a dependent field's sibling comes first, is always there to read, and names a *type* | declare `kind: meta.type_ref` (or `meta.ref<C>` over a constructor) before it, required, defaulted or pinned |
| `value: kind!?`, `value?: kind! ~ x`, `values: [kind!]` | a dependent field is never voidable, takes no modifier, and stands only at a record field's type | `value?: kind!` |
| `account- { password }` | hyphen absorbed into the name | `account - { password }` |
| `config ^ { … } - { x }` | no removal on a refinement head | `config & {} - { x }` or restructure |
| `vector` (a non-record template) used bare; `<T> { v: text }` | missing args; unused parameter | `vector<text, 3>`; drop `<T>` |
| `<N> !integer ^ { min: N }` | parameterised atom refinement is not a form | `<N> !numeric.integer_type { min: N }` |
| `<T> { a: T  b?: int32 ~ T }` | one parameter in a type and a value position | two parameters |
| `named => <T> T & { name: text }`, `<T> T ^ { … }` | a parameter is never an operand | compose a concrete parent, or put `T` in a field: `<T> { value: T  name: text }` |
| `t => box & { … }`, `t => box ^ { … }` (`box` a record template) | a record template named bare is a family base, never an operand | apply it: `box<text> & { … }`, or re-declare: `<T> box<T> & { … }` |
| `badge => <M, N> { kind: capped<M> = N … }` | a selector's type may mention no parameter, value ones included | fix the selector's type: `kind: capped<9> = N` |
| `<T: unicode.text_type> { a: T }` | a bound names a type, never a constructor | `<T: text>`, and refine into the family (`!text ^ { … }`) for an argument that must pass |
| `<N: int8> !meta.array { element_type: text  min_items: N }` | the slot reads `N` as a `numeric.count`, which `int8` is not IS-A | `<N: numeric.count>`, or leave `N` unwritten |
| `k: dog_of<text>` where `dog_of => <T> pet & { … }` | a use-site application composing onto a record would be an undeclared family member | `dogs => dog_of<text>`, then `k: dogs` |
| `item => { inner: item }` | no finite value | `inner?: item` |
| `a => b & {}` beside `b => a & {}` | a wait cycle | break the cycle; a *reference* cycle (`tree => { t?: tree }`) is fine |
| `op => vector<order, 3> & { … }`, `op => {text => order} ^ { … }` | a container closes to a binding record with no fields | compose onto a *record* — a record template's application (`box<order> & { … }`) is fine |
| `x => { s: orders }` where `orders => !interface { … }` | a value entry is a value, never a type | name the payload's types; see `extending.md` |
| `request: { … }` or `request: box<text>` inside a value entry, at a `meta.ref<…>` slot | a reference slot in a value body holds one bare name, and a value body lifts nothing | declare `bt => box<text>` and write `request: bt` |
| `!meta.record { chain: { supertypes: [ … ] } … }`, `@meta.application:…`, `@meta.synthetic` in source | `chain` and both annotations are the resolver's | compose with `&` or refine with `^`; never write them |
| `@discriminator:type` on a choice of records | a choice has no discriminator | `pet => abstract { type: text =?  … }` with each member pinning `type: = "dog"`, and the position typed `pet` |
| `@rest` on a map field, `additionalProperties` | records are closed with no exception | a map-typed field, `extras?: {text => text}` |
| `pet => { type: text = "pet" … }` as a discriminated base, members writing `type: = "dog"` | a pin never changes, so no member could pin its own | `type: text =?` on the base (implies `abstract`) |
| `leaf => final { … }` then `x => leaf & { … }` or `leaf ^ { … }` | nothing composes or refines onto a FINAL record | drop `final`, or subtract (`leaf - { … }`) |
| a binding map or class table keyed on a minted name such as `box_text_04117bb4` | minted names are not stable | declare `bx => box<text>` and key on `bx` |
| `@expires:"…"` used without a declaration | annotations are types | declare `expires => @meta.annotation text` |
| `@deprecated:"use email"` | `@deprecated` is a bare marker | `@deprecated @doc:"Use email."` |
| `@since:"1.2"`, `@todo:"…"`, `@lang:"en"`, `@documentation:"…"` | no bundled document declares them | `@comment:"…"` for a maintainer's note, `@doc:"…"` for docs; or declare your own (`since => @meta.annotation text`) |
| `@ordered:TOTAL` | the annotation is `@atom.ordering`; `ordered` is a container facet | `@atom.ordering:TOTAL` |
| `@examples:[{ x: 1 }]` | examples are text | `@examples:["{ x: 1 }"]` |
| `@title`, `@deprecated` under `numeric.tn` (or `meta.tn`) alone | the author annotations are `core.tn`'s | import `core.tn`, or declare them yourself |
| `?sha256=` written from memory | fabricated pin | compute it (`tson hash`, `pin.py`) or omit it |
| `; comment`, `# comment`, `// comment` in a schema | no comment syntax (`;` is the size separator; `#` `/` are lexer errors) | `@doc:"…"` before the declaration or field |
| example data `metadata: { k: v }` for a `{text => text}` field | that is a record; the map needs `=>` | `metadata: { k => v }` |
| `!meta.array { … unordered: true }` | the facet is `ordered` | `ordered: false` (an array is ordered by default; a map is not) |
| `tags: set<text>` meant non-empty | a set may be empty | `tag_set => !meta.set_type { element_type: text  min_items: 1 }`, then `tags: tag_set` |
| `!meta.set_type { element_type: T  min_items: 0 }` for a possibly-empty set | that is already `set<T>` | `set<T>` |
| `one => [text]` meant as a one-position tuple | a single bracketed type is an array | `one => meta.tuple1<text>`, or `meta.voidable_tuple1<text>` |
| `link: uri` holding `"../x"` | `uri` requires a scheme | `uri_reference` |
| `uri` holding `https://例え.jp/` | a URI is US-ASCII | `iri` (or `iri_reference`) |
| `!uri ^ { scheme: "https" }` | the facet is a set | `!uri ^ { schemes: [https] }` |
| `!text ^ { normalization: NFC }` | `normalization` is fixed at construction | a fresh family, `!unicode.text_type { normalization: NFC }` |
| `!bytes ^ { encoding: HEX }` | an alphabet is not a narrowing | another instance, `!binary.bytes_type { encoding: HEX }` |
| `( a?: A \| b: B )` | the lone member of an option takes no `?` | `( a: A \| b: B )` |
| `( a: A  b?: B )` | a bare one-option group is plain fields | `a: A  b?: B`, or `( a: A  b?: B )?` for "`b` requires `a`" |
| `( a: A \| b: B  c: C )+` | `+` takes single unmarked members | `( a: A \| b: B  c: C )` or two groups |
| `( a: A \| b: B )` read as "at least one" | a bare group is *exactly one* | `( a: A \| b: B )+` |
