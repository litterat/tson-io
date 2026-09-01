# Pitfalls — check before delivering

Every mistake this skill has seen, with the fix. Read this before handing over a schema.

| You wrote | Problem | Write instead |
|---|---|---|
| no `!!import` of core, then `name: text` | `text` unresolved — kernel types are not field types | add `!!import:"https://tson.io/2026/34/m/core.tn"` |
| `!!schema:"…"` in a schema file | schemas are governed by `!!meta` | `!!meta:"…"` |
| `!!meta` after `!!import` | order is fixed | `!!id`, `!!meta`, `!!import…` |
| `person: { name: text }` inline, `age: !integer ^ { min: 0 }` inline | bare records and atom refinements must be named | declare `person`, `age`, reference by name |
| `age => integer { min: 0 }`, `age => integer ^ { min: 0 }` | atom refinement needs `!` | `age => !integer ^ { min: 0 }` |
| `employee => person { dept: text }` | no operator | `person & { dept: text }` |
| `!integer ^ { minimum: 0 }`, `{ maxLength: 5 }` | JSON Schema spellings are unknown facets | `min`, `max_length` |
| `!float64 ^ { multiple_of: 0.05 }` | floats have no `multiple_of` | `!number ^ { multiple_of: 0.05 }` |
| `!enum [1 2 3]`, `!enum ["Not Started"]` | members are identifiers | `!integer ^ { min: 1  max: 3 }`; `not_started` |
| `status: !enum [A B]` at a field | constructor application at a field position | declare `status => !enum [A B]` |
| `xs: list<text>`, `m: map<text, int>`, `[text]?` meaning optional elements | no `list`/`map` generics; `?` placement | `[text]`, `{text => integer}`, `[text?]` |
| `int`, `string`, `bool`, `float`, `double`, `str`, `timestamp`, `bytes` | not core names | `integer`/`int32`, `text`, `boolean`, `float64`, `datetime`, `base64` |
| `(text \| void)`, `(T \| null)` | void is not a variant | `field: text?` |
| `field: text? ~ x`, `field: text = _`, `field: text ~ _` | illegal state combinations | `text ~ x`, `text? = _`, omit |
| `address: address ~ { … }`, `tags: [text] ~ []` | defaults only on atoms/enums, scalars only | drop the default or make the field optional |
| `account- { password }` | hyphen absorbed into the name | `account - { password }` |
| `config ^ { … } - { x }` | no removal on a refinement head | `config & {} - { x }` or restructure |
| `box` (template) used bare; `<T> { v: text }` | missing args; unused parameter | `box<text>`; drop `<T>` |
| `<N> !integer ^ { min: N }` | parameterised atom refinement is not a form | `<N> !integer_type { min: N }` |
| `item => { inner: item }` | no finite value | `inner: item?` |
| `~array & { … }` in a user schema | constructors only in meta-schemas | refine or apply instead (or write a meta-schema — `extension-meta-schemas.md`) |
| `op => box<order> & { … }`, `op => alias_to_box_order & { … }` | a template application (or an alias to one) is a binding record with no fields to compose | give the application a body of its own first (`boxed => box<order> & { … }` with the fields you add), or compose with the head it derives from |
| `x => { s: some_operation }` where `some_operation` is a `~data` instance | a DATA entry is declared and applied, never named as a type | name the payload's types; see `extension-meta-schemas.md` |
| `@expires:"…"` used in data without a declaration | annotations are types | declare `expires => @annotation text` |
| `?sha256=` written from memory | fabricated pin | compute it or omit it |
| `; comment`, `# comment`, `// comment` in a schema | no comment syntax (`;` is the size separator; `#` `/` are lexer errors) | `@doc:"…"` before the declaration or field |
| example data `metadata: { k: v }` for a `{text => text}` field | that is a record; the map needs `=>` | `metadata: { k => v }` |
