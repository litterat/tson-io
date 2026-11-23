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
| `identifier`, `type_name`, `field_name`, `param_name` used without declaring them | the kernel's are under `meta`, and a field name's default type is `meta.identifier` | `meta.identifier`, `meta.type_name`, `meta.param_name`; or declare your own `identifier => !unicode.identifier_type { continue_add: "-" }` |
| `non_negative_integer` | no such name | `numeric.count` |
| `@disjoint`, `@annotation` | by path | `@meta.disjoint`, `@meta.annotation` |
| `@ordering:TOTAL`, `@bounded`, `@exact`, `@numeric` | the classifying markers live under `atom` | `@atom.ordering:TOTAL`, `@atom.bounded:true`, … |
| `to: ref<method>`, `!meta.reference_type { of: X }` | the one reference constructor is the kernel's `meta.ref` | `to: meta.ref<method>`, or `!meta.ref { of: X }` |
| `id => !reference { target: uuid }` | the alias constructor is `meta.alias` | `id => uuid` (or `!meta.alias { target: uuid }`) |
| `extras?: {text => any}`, `a: any`, `a: declared`, `x: value` | there is no "any value" or "any scalar" type | `meta.declared` (a value naming any type of the closure, tag required), with the foreign schema imported; or a choice; or `{text => text}` for free-form strings |
| `!number ^ { min: 0x10 }`, `!duration ^ { max: P1Y }`, `!date ^ { min: "2026-01-01T00:00:00Z" }` | a facet is typed by its family's instance, and the value fails it at load | `min: 16`; `max: P365D` (or a `period` for months); `min: 2026-01-01` |
| `!ipv4 ^ { within: ["10.0.0.1/8"] }` | `within` is `[cidr4]`, and a network has no host bits | `["10.0.0.0/8"]` |
| a separate schema written just to declare a constructor, a namespace type or a value entry | any schema may declare them | declare them in the schema itself; `extending.md` |
| `site => { at: address }` inside `geo => !schema { … }` | a name resolves from the root; there is no relative lookup | `at: geo.address` |
| two imports that each declare `order` | one closure holds one `order` | import neither, and name each through an extern: `order_v1 => !meta.extern { schema: "…/order-1.tn"  type: order }` (`declaration-forms.md` §13) |

## Everything else

| You wrote | Problem | Write instead |
|---|---|---|
| `age: !integer ^ { min: 0 }`, `status: !enum [A B]`, `f: meta.namespace<meta.identifier method>` at a field | atom refinements, enum constructions and namespace types are nominal and must be named | declare `age`, `status`, `api`, and reference them by name (a record body *may* be written at a field: `at: { x: int32 }`) |
| `at: point & { z: int32 }`, `at: point - { x }` | composition and subtraction are declared, never written at a type slot | `point_3d => point & { z: int32 }`, then `at: point_3d` |
| `age => integer { min: 0 }`, `age => integer ^ { min: 0 }` | atom refinement is `!` then `^`; `^` after a bare name is a parse error | `age => !integer ^ { min: 0 }` |
| `employee => person { dept: text }` | no operator | `person & { dept: text }` |
| `employee => person ^ { age: adult }`, `x => box<text> ^ { v: = "a" }`, `vip => person ^ {}` | `^` follows `!name` and takes values; a record is derived with `&` | `person & { age: adult }`, `box<text> & { v: = "a" }`, `person & {}` |
| `minlist => meta.array ^ { min_items?: = 1 }` | `^` after a bare name; a constructor's partial filling is a construction left open | `minlist => !meta.array ^ { min_items: 1 }` (then `minlist<text>`), or a narrower constructor `meta.array & { min_items?: = 1 }` |
| `!person ^ { name: x }`, `!orders ^ { … }` | a record, tuple, choice or namespace value states no refinement rule | restate fields in a composition, `person & { name: = "x" }` |
| `person & { agee: adult }` meant to restate `age` | a misspelt restatement silently adds a new field | check each restated name against the parent; a modifier-only entry (`agee?: = 3`) is refused, a typed one is not |
| `!integer ^ { minimum: 0 }`, `{ maxLength: 5 }` | JSON Schema spellings are unknown facets | `min`, `max_length` |
| `!float64 ^ { multiple_of: 0.05 }` | floats have no `multiple_of` | `!number ^ { multiple_of: 0.05 }` |
| `!datetime ^ { precision: 3 }` | the temporal grid facet is `fraction_digits` | `!datetime ^ { fraction_digits: 3 }` |
| `!enum [1 2 3]` | numbers are never enum members | `!integer ^ { min: 1  max: 3 }` or `!integer ^ { members: [1 2 3] }` |
| `!enum ["Not Started"]` | `enum` members are identifiers | `!text ^ { members: ["Not Started"] }`, the identifier `not_started`, or an enum over a words type (next rows) |
| `!text_enum ["sedentary" "lightly active"]` | no such constructor | a closed text set, `!text ^ { members: [ … ] }`; or names with spaces, `words => !unicode.identifier_type { medial: " " }` then `!meta.enum_type { name_type: words  members: [ … ] }` |
| `!meta.enum_type { type: kebab  members: [ … ] }` | the slot is `name_type` | `!meta.enum_type { name_type: kebab  members: [ … ] }` |
| `!meta.enum_type { name_type: text  … }` | `name_type` must be an identifier family | declare one (`words`, `kebab`), or use `!text ^ { members: [ … ] }` |
| `a: enum`, `<E: enum>`, `a: set`, `meta.ref<meta.set_type>` | `enum` and `meta.set_type` (`set`) are incomplete entries, no types | declare an enum and name it (`s: status`); a slot holding enum types is `meta.enum_type`, one holding array types `meta.ref<meta.array>` |
| `nonempty => !meta.array ^ { min_items: 1 }` then `t: nonempty` | an incomplete entry is no type | complete it: `t: nonempty<text>`, or `tags => nonempty<text>` then `t: tags` |
| `x => !nonempty ^ { min_items: 2 }` over that `nonempty` | a field of an incomplete entry is written once | complete it, then refine the type: `tags => nonempty<text>`, `more => !tags ^ { min_items: 2 }` |
| `person => { "first name": text }`, `{ "@id": text }` | a field name is a value of the record's name type, an identifier by default (a resolver error, not a parse error) | `first_name`; for a JSON vocabulary, a name type on a fieldless abstract base — `declaration-forms.md` §2 |
| a field or namespace key named `"a.b"`, a name type admitting `.` | `.` joins a qualified name's segments | rename (`a_b`), or hold the vocabulary as a map keyed by `text` |
| `json_record & address` (`address` declared plainly) | supertypes with different name types do not compose | declare `address => json_record & { … }` |
| a name type with `normalization: NONE`, or `ASCII_CASEFOLD` over a non-ASCII profile | a name type's form must imply NFC | `NFC` (the default), `NFKC_CASEFOLD`, or an `ASCII`-based profile with `ASCII_CASEFOLD` |
| `continue_add: "\u{AD}"` (soft hyphen), a control, a non-U+0020 space in a profile | the profile floor | only visible characters; `medial: " "` for words |
| `( meta.identifier \| text )` expected to be tag-free | both are string-class text families | tag every value, or use a field group |
| `( [text] \| [int32] )` | a choice that is not disjoint names every variant, so a tag can select it | `texts => [text]`, `ints => [int32]`, then `( texts \| ints )` |
| `( text \| either )` over `either => ( a \| b )` | a nested choice must be disjoint | list the variants: `( text \| a \| b )` |
| `xs: list<text>`, `m: map<text, int>`, `[text]?` meaning voidable elements | no `list`/`map` generics; `?` placement | `[text]` (or `meta.array<text>`), `{text => integer}`, `[text?]` |
| `int`, `string`, `bool`, `float`, `double`, `str`, `timestamp`, `binary`, `base64` | not bundled names | `integer`/`int32`, `text`, `boolean`, `float64`, `datetime`, `bytes` |
| `non_empty_text`, `positive_integer`, `non_negative_integer`, `negative_integer` | no library declares a bound a schema can write | declare the line yourself: `title_text => !text ^ { min_length: 1 }`, `count => !integer ^ { min: 0 }` |
| `unit`, `!unit {}` | no such type or constructor | `void` (a slot holding no value) |
| a local `date`, `uuid`, `title` beside a `core.tn` import | every name in the closure is reserved | another name, or import only the libraries you need |
| `label: text?` meaning "may be left out" | `?` on the *type* admits `_`; the key is still required | `label?: text` (or `label?: text?` if `_` is also meant) |
| `port: integer ~ 8080`, `debug: boolean = false` meaning injected | a default needs `?` on the name; an unmarked `= v` is a marker the document must write | `port?: integer ~ 8080`, `debug?: boolean = false` |
| `f: text? ~ x` | the name is unmarked — a default only omission can reach | `f?: text? ~ x` (omitted → `x`, `_` → void) or `f?: text ~ x` |
| `f?: text? = x` | a pin on a voidable type | `f?: text = x` |
| `f: text? = _`, `f: text ~ _`, `f: void` | `_` is never a modifier value; `a: void` admits no document | `f?: void?` (omitted or `_`, nothing else) |
| `(text \| void)` | void is not a variant | `field?: text` |
| `address?: address ~ { … }`, `tags?: [text] ~ []` | defaults only on atoms, enums and references, scalars only | drop the default and mark the name `?` |
| `value: kind!` with `kind` declared after it, optional with no default, or typed `int32` / `meta.ref<method>` | a dependent field's sibling comes first, is always there to read, and names a *type* | declare `kind: meta.type_ref` (or `meta.type_expr`, or `meta.ref<C>` over a constructor) before it, required, defaulted or pinned |
| `value: kind!?`, `value?: kind! ~ x`, `values: [kind!]`, `x => kind!` | a dependent field is never voidable, takes no modifier, and stands only as a record field's whole type (`[kind!]`, `kind!?` are parse errors) | `value?: kind!` |
| `{ type: kind! }` in a data document or a `!meta.record_field { … }` payload | `kind!` is schema grammar; in a value it is a parse error | `{ type: { of: !meta.dependent { on: kind } } }` |
| `account- { password }` | hyphen absorbed into the name | `account - { password }` |
| `<N> { attempts?: int32 ~ N }`, `<T, N> [T; N]`, `<N> !integer ^ { min: N }` | a parameter is a type, never a value, size or facet | `<T> { … attempts?: int32 }`, then declare each application with its value: `fast => retry<job> & { attempts?: ~ 5 }` |
| `<T> [T]`, `<T> ( T \| error )`, `<B> pair<uuid, B>` | a parametric record's body is a record body | the form at the use site, `nonempty => !meta.array ^ { min_items: 1 }` then `nonempty<T>`, a record holding the choice, or the application at each use — `parametric-records.md` |
| `<T> { v?: T ~ 5 }` | a field typed by a parameter takes no value | restate it where the application is declared |
| `<T> { v: text }` | an unused parameter | drop `<T>` |
| `named => <T> T & { name: text }` | a parameter is never an operand | put `T` in a field: `<T> { value: T  name: text }` |
| `t => box & { … }`, `h: box`, `request: box` (`box` parametric) | no position names a parametric record bare | apply it: `box<text> & { … }`, `<T> box<T> & { … }`, `h: box<text>`; at a reference slot a declared application, `bt => box<text>` |
| `pair<box<text>, int32>`, `box<[integer]>`, `box<3>` | an argument of a parametric record's application is a name or a parameter | `box_text => box<text>` then `pair<box_text, int32>`; `ints => [integer]` then `box<ints>` |
| `rebox => <T> { b: labelled<T> }` over `labelled => <T: text> { … }` | a bound is written, never inherited | `rebox => <T: text> { b: labelled<T> }` |
| `<T: unicode.text_type> { a: T }` | a bound names a type, never a constructor | `<T: text>`, and refine into the family (`!text ^ { … }`) for an argument that must pass |
| `k: dog_of<text>` where `dog_of => <T> pet & { … }` | an application closed in place would be an undeclared family member | `dogs => dog_of<text>`, then `k: dogs` |
| `f: node<text>` in a closed record, `node` recursive | a recursive application ties only to a declaration | `node_text => node<text>`, then `f: node_text` |
| `wrap => <T> { n: node<T> }` (`node` recursive) | it could never be closed | `wrap => <N> { n: N }`, then `wrap_text => wrap<node_text>` |
| `x => abstract box<text>`, `abstract !meta.record { … }` | a mark stands before a record definition alone | `x => abstract box<text> & {}`; the kernel's form states `extension: ABSTRACT` |
| `x => !meta.apply { … }` | an application is declared by its spelling | `x => box<text>` |
| `final` on a parametric record | every application must stay composable | mark the records that compose it |
| `item => { inner: item }` | no finite value | `inner?: item` |
| `a => b & {}` beside `b => a & {}` | a wait cycle | break the cycle; a *reference* cycle (`tree => { t?: tree }`) is fine |
| `orders => [order]` then `op => orders & { … }`; `x => meta.array<order> & { … }` | a construction has no fields to compose | compose onto a *record*; a parametric record's application (`box<order> & { … }`) is fine |
| `x => { s: orders }` where `orders => !interface { … }` | a value entry is a value, never a type | name the payload's types; see `extending.md` |
| `request: { … }` or `request: box<text>` at a `meta.ref<…>` slot, in a value entry or data | a reference holds one bare name, never a record or an application | declare `bt => box<text>` and write `request: bt` |
| `t: set<text>`, `!box<text> { … }`, `"set<text>"` in a data document | no value carries an argument list | declare the application in the schema (`names => set<text>`) and write `t: names`, `!names { … }` |
| `!meta.record { chain: { supertypes: [ … ] } … }`, `@meta.application:…`, `@meta.completion:…` in source | `chain` and both annotations are the resolver's | compose with `&`, refine with `^`; never write them |
| `@discriminator:type` on a choice of records | a choice has no discriminator | `pet => abstract { type: text =?  … }` with each member pinning `type: = "dog"`, and the position typed `pet` |
| `@rest` on a map field, `additionalProperties` | records are closed with no exception | a map-typed field, `extras?: {text => text}` |
| `pet => { type: text = "pet" … }` as a discriminated base, members writing `type: = "dog"` | a pin never changes, so no member could pin its own | `type: text =?` on the base (implies `abstract`) |
| `!meta.record { discriminators: [kind] … }` with no `extension` | `discriminators` stands beside `extension: ABSTRACT` | add `extension: ABSTRACT`, or write the brace form with `=?` |
| `leaf => final { … }` then `x => leaf & { … }` | nothing composes onto a FINAL record | drop `final`, or subtract (`leaf - { … }`) |
| `order_v1 & { … }`, `!order_v1 { … }`, `o?: order_v1 ~ x`, `order_v1.lines` (`order_v1` an extern) | an extern is sealed, and no name selects through it | declare what you need in the foreign schema, or import it |
| `ext => meta.extern`, then `!ext { … }` | an extern's head is written `!meta.extern` | `!meta.extern { schema: …  type: … }` |
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
| `one => [text]` meant as a one-position tuple; `meta.tuple1<text>` | a single bracketed type is an array, and a one-position tuple is declared | `one => !meta.tuple [{ element_type: text }]` (`voidable: true` on the element admits `[_]`) |
| `link: uri` holding `"../x"` | `uri` requires a scheme | `uri_reference` |
| `uri` holding `https://例え.jp/` | a URI is US-ASCII | `iri` (or `iri_reference`) |
| `!uri ^ { scheme: "https" }` | the facet is a set | `!uri ^ { schemes: [https] }` |
| `!text ^ { normalization: NFC }` | `normalization` is fixed at construction | a fresh family, `!unicode.text_type { normalization: NFC }` |
| `!bytes ^ { encoding: HEX }` | an alphabet is not a narrowing | another instance, `!binary.bytes_type { encoding: HEX }` |
| `!v4 ^ { version: 7 }` over `v4 => !uuid ^ { version: 4 }` | `version` is settable once | refine `uuid` itself: `!uuid ^ { version: 7 }` |
| `( a?: A \| b: B )` | the lone member of an option takes no `?` | `( a: A \| b: B )` |
| `( a: A  b?: B )` | a bare one-option group is plain fields | `a: A  b?: B`, or `( a: A  b?: B )?` for "`b` requires `a`" |
| `( a: A \| b: B  c: C )+` | `+` takes single unmarked members | `( a: A \| b: B  c: C )` or two groups |
| `( a: A \| b: B )` read as "at least one" | a bare group is *exactly one* | `( a: A \| b: B )+` |
