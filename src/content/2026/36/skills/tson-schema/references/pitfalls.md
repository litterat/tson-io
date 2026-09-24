# Pitfalls — check before delivering

Every mistake this skill has seen, with the fix. Read this before handing over a schema.

| You wrote | Problem | Write instead |
|---|---|---|
| no `!!import` of core, then `name: text` | `text` unresolved — kernel types are not field types | add `!!import:"https://tson.io/2026/36/m/core.tn"` |
| `!!schema:"…"` in a schema file | schemas are governed by `!!meta` | `!!meta:"…"` |
| `!!meta` after `!!import` | order is fixed | `!!id`, `!!meta`, `!!import…` |
| `person: { name: text }` inline, `age: !integer ^ { min: 0 }` inline | bare records and atom refinements must be named | declare `person`, `age`, reference by name |
| `age => integer { min: 0 }`, `age => integer ^ { min: 0 }` | atom refinement needs `!` | `age => !integer ^ { min: 0 }` |
| `employee => person { dept: text }` | no operator | `person & { dept: text }` |
| `!integer ^ { minimum: 0 }`, `{ maxLength: 5 }` | JSON Schema spellings are unknown facets | `min`, `max_length` |
| `!float64 ^ { multiple_of: 0.05 }` | floats have no `multiple_of` | `!number ^ { multiple_of: 0.05 }` |
| `!enum [1 2 3]` | numbers are never enum members | `!integer ^ { min: 1  max: 3 }` or `!integer ^ { members: [1 2 3] }` |
| `!enum ["Not Started"]` | a non-identifier member needs the `TEXT` profile | `!enum { members: ["Not Started"]  profile: TEXT }`, or the identifier `not_started` |
| `status: !enum [A B]` at a field | constructor application at a field position | declare `status => !enum [A B]` |
| `xs: list<text>`, `m: map<text, int>`, `[text]?` meaning optional elements | no `list`/`map` generics; `?` placement | `[text]`, `{text => integer}`, `[text?]` |
| `int`, `string`, `bool`, `float`, `double`, `str`, `timestamp`, `binary`, `base64` | not core names | `integer`/`int32`, `text`, `boolean`, `float64`, `datetime`, `bytes` |
| `label: text?` meaning "may be left out" | `?` on the *type* admits `_`; the key is still required | `label?: text` (or `label?: text?` if `_` is also meant) |
| `port: integer ~ 8080`, `debug: boolean = false` meaning injected | a default needs `?` on the name; an unmarked `= v` is a marker the document must write | `port?: integer ~ 8080`, `debug?: boolean = false` |
| `f: text? ~ x` | the name is unmarked — a default only omission can reach | `f?: text? ~ x` (omitted → `x`, `_` → none) or `f?: text ~ x` |
| `f?: text? = x` | a pin on a voidable type | `f?: text = x` |
| `f: text? = _`, `f: text ~ _`, `f: void` | `_` is never a modifier value; `a: void` admits no document | `f?: void?` (omitted or `_`, nothing else) |
| `(text \| void)` | void is not a variant | `field?: text` |
| `address?: address ~ { … }`, `tags?: [text] ~ []` | defaults only on atoms/enums, scalars only | drop the default and mark the name `?` |
| `account- { password }` | hyphen absorbed into the name | `account - { password }` |
| `config ^ { … } - { x }` | no removal on a refinement head | `config & {} - { x }` or restructure |
| `box` (template) used bare; `<T> { v: text }` | missing args; unused parameter | `box<text>`; drop `<T>` |
| `<N> !integer ^ { min: N }` | parameterised atom refinement is not a form | `<N> !integer_type { min: N }` |
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
| `?sha256=` written from memory | fabricated pin | compute it or omit it |
| `; comment`, `# comment`, `// comment` in a schema | no comment syntax (`;` is the size separator; `#` `/` are lexer errors) | `@doc:"…"` before the declaration or field |
| example data `metadata: { k: v }` for a `{text => text}` field | that is a record; the map needs `=>` | `metadata: { k => v }` |

## Also worth checking

| You wrote | Problem | Write instead |
|---|---|---|
| `!!meta` after `!!import` | order is fixed | `!!id`, `!!meta`, `!!import…` |
| `!integer ^ { minimum: 0 }`, `{ maxLength: 5 }` | JSON Schema spellings are unknown facets | `min`, `max_length` |
| `!enum [1 2 3]` | numbers are never enum members | `!integer ^ { members: [1 2 3] }` |
| `; comment`, `# comment`, `// comment` in a schema | no comment syntax (`;` is the size separator; `#` `/` are lexer errors) | `@doc:"…"` before the declaration or field |
