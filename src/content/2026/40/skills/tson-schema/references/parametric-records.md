# Parametric records and applications

Part 2 §5.3, §5.10, §5.10.1, §8.2, condensed. A **parametric record** is a record that carries
`parameters`; nothing else in TSON takes parameters.

## Declaring

```
pair     => <A, B> { first: A  second: B }
labelled => <T: text> { label: T  tags?: [T] }
page     => <T> { items: [T; 1..]  cursor?: { after: T }  pick?: ( T | int32 ) }
response => <T> { status?: int32 ~ 200  body: T }
outcome  => abstract <T> { ok: boolean =?  value?: T }
```

Parameters go in `<>` immediately after `=>` (after a definition mark, `abstract <T> { … }`), each
optionally followed by `:` and a **bound**; separate with comma or whitespace. A parameter is a *type*,
and nothing about it is derived from where it stands.

**The body is a record body**: braces, a composition (`<T> base & { … }`), or the explicit
`<T> !meta.record { fields: { … } }`. `<…>` before anything else is a resolver error at the declaration,
whether or not anything applies it. What to write instead:

| You wanted | Write |
|---|---|
| `<T> [T]`, `<T> {text => T}`, `<T> !meta.array { element_type: T  min_items: 1 }` | the form at the use site (`[order]`), or a construction left open, `nonempty => !meta.array ^ { min_items: 1 }`, completed where used, `nonempty<order>` (`declaration-forms.md` §4) |
| `<T> ( T \| error )`, `<A, B> [A, B]` | a record holding the choice or tuple (`<T> { r: ( T \| error ) }`), a discriminated family (below), or a field group |
| `<B> pair<uuid, B>` (an alias with a parameter open) | the application at each use, `pair<uuid, text>`, or a record restating the body, `<B> { first: uuid  second: B }` |
| `<T> !api { … }` (a value per argument) | one value entry per instantiation |
| `<N> { attempts?: int32 ~ N }`, `<N> [T; N]` (a value as a parameter) | the value where the application is declared (next section) |

## Where a parameter stands

A parameter stands at a field's type, at any slot of a type written in place there, at any depth
(`items: [T; 1..]`, `idx: {T => int32}`, `cursor?: { after: T }`, `pick?: ( T | int32 )`), and as an
argument of an application at those slots or in a parent (`b: box<T>`, `<T> box<T> & { … }`).
**Nowhere else**: a parameter as a default or pin, a facet, a size bound, an enum member, a field name,
a group member, `extension`, `discriminators` or `name_type` is a resolver error naming the slot.

A field whose type names a parameter — whole, as an argument, or inside a type written in place — carries
no `~` or `=` value and is no selector, since its type differs per application (`<T> { v?: T ~ 5 }` is
refused). **A value that differs per application is written where the application is declared**, as a
restatement in a composition:

```
created     => response<order> & { status?: = 201 }
flagged     => <T> { entry: T  priority?: priority }
status_flag => flagged<status> & { priority?: ~ 2 }
```

Inside a parametric record every form is written in place whether or not it names a parameter, and a
constructor's application over one is its construction: `meta.array<T>` is the form `[T]` is, and
`meta.map<text meta.array<T>>` the form `{text => [T]}` is. A choice over a parameter is judged where
each application closes: `pick => <T> { v: ( T | int32 ) }` loads, `pick<text>` loads, and
`p => pick<int32>` lists `int32` twice and is refused at `p`.

## Bounds

`<T: text>` writes a bound (`meta.param.bound`); an unwritten one is absent. An argument must name a
type that IS-A the bound, past alias hops: `labelled<int32>` is refused at the application.

- **IS-A edges only.** `date` has a text form without being `text`, and a fresh
  `!unicode.text_type {}` is a peer of `text`, so both fail `<T: text>`. A type meant to pass refines into
  the family: `stock_code => !text ^ { pattern: "[A-Z]{3}" }`.
- **A bound names a type**, never a constructor (`<T: unicode.text_type>` is refused) and never an
  incomplete entry (`<E: enum>` is refused).
- **A bound is written, never inherited.** A parameter passed to a bounded parameter is written with a
  bound that IS-A it, wherever it is passed: `rebox => <T: text> { b: labelled<T> }` loads, and
  `rebox => <T> { b: labelled<T> }` is refused at `rebox`, naming `labelled`'s `T: text`. A parameter
  passed to a constructor's slot needs no bound: the slot's `of` judges the argument that arrives
  (`<K> { m: {K => text} }`).

## Applying

`H<a₁ … aₙ>` supplies every parameter, positionally. **An argument is a name or, inside a parametric
record, one of its parameters.** A sugar form, a record body, an applied constructor, a completion or
another application written as an argument of a parametric record's application is refused; declare it
first:

```
ints     => [integer]          ; then box<ints>, never box<[integer]>
box_text => box<text>          ; then pair<box_text, int32>, never pair<box<text>, int32>
```

An argument may be any type, `void` included. A number or a quoted string is never an argument
(`box<3>` is a parse error). An argument is judged by identity past aliases, so over `user_id => uuid`,
`box<user_id>` and `box<uuid>` are one application.

**Where an application closes** decides what it is:

- **Declared**, `order_page => page<order>`: the substituted record under that name, a closed
  `!meta.record` whose key carries `@meta.application:{ head: page  arguments: [order] }`. It takes no
  definition mark (`x => abstract box<text>` is a parse error): its `extension` is its head's.
- **At a composition operand**, `dog => pet_of<dog_type> & { … }`: absorbed by value, its fields the
  composing declaration's own.
- **At a type slot**, `f: page<order>`: closed in place to a record with no name, structural, a member of
  nothing, never tagged and never looked up to a declaration. So `f: page<order>` and `f: page_order` are
  two types of one shape, the first structural and the second nominal.
- **Over a parameter, inside a parametric record**: kept as `meta.apply` until the holder is applied, then
  closed where it stands by the same rules.

Every application abstract is the parametric record marked (`outcome => abstract <T> { … }`); one
application marked alone is a record composing it, `x => abstract box<text> & {}`.

**In data, a reference is a name.** No value carries an argument list: a tag or a reference-typed field
names the application a declaration gives it (`!order_page { … }`, `t: order_page`), and a tag naming a
parametric record is a validation error.

## Families

No position names a parametric record bare — not a field, an element, a variant, a reference slot, an
operand of `&` — and no application is IS-A its head. **A family is declared with records**: an abstract
base states the selectors and the shared fields, a parametric record composes it, and each member
composes a declared application and pins the selectors:

```
pet    => abstract { kind: text =?  name: text }
pet_of => <T> pet & { pet: T }
dog    => pet_of<dog_type> & { kind?: = "dog" }
cat    => pet_of<cat_type> & { kind?: = "cat" }
holder => { p: pet }
```

`dog` and `cat` are IS-A `pet` through `pet_of`'s written parent, and a value at `p` is placed by its
`kind`. `k: pet_of<dog_type>` at a use site would close in place to an unnameable member of `pet`, and is
refused; name the member, `k: dog`. `final` on a parametric record is refused. A mark or
selector written on a parametric record is each application's: `outcome<order>` is an abstract record
dispatching over the declarations composing it (`ok_order => outcome<order> & { ok: = true }`).

## Composition over applications

A parent may be an application, its arguments naming the declaration's own parameters:
`ok => <T> result<T> & { note: text }`. While `ok` is parametric, `result<T>` stands in its
`chain.parents` as `meta.apply`, closed with everything else when `ok` is applied. IS-A edges go to
declared names only: an applied parent's edge is the entry a declaration gives that application, where
one exists, and the head's own name is never one. A restatement is judged with each application's
arguments: `wrap => <T> box<T> & { v: int32 }` admits `wrap<int32>` and refuses `wrap<text>`. A parameter
as an operand (`<T> T & { … }`), a constructor applied at an operand (`<T> base & meta.array<T>`) and a
parametric record named bare at an operand are resolver errors.

## Recursion

```
node      => <T> { value: T  next?: node<T> }
tree      => <T> { value: T  children?: [tree<T>] }
node_text => node<text>
tree_text => tree<text>
```

- **Regularity**: a recursive application passes each parameter through unchanged, in order.
  `weird => <A, B> { next?: weird<B, A> … }` is refused at the declaration.
- **Recursion ties to a declaration.** Closing `node_text` reaches `node<text>` again and ties it to
  `node_text`, so `next` holds `node_text`. A recursive application no declaration closes —
  `f: node<text>` in a closed record — is refused: declare `node_text => node<text>`, then `f: node_text`.
- **A parametric record that could never be closed is refused at its declaration**, applied or not:
  `wrap => <T> { label: text  n: node<T> }` would close `node` in place with nothing to tie to. Take the
  closed type as the parameter instead: `wrap => <N> { label: text  n: N }`, then
  `wrap_text => wrap<node_text>`.
- **Productivity**: every type admits a finite value. A cycle is guarded by a field whose key may be
  omitted or whose type admits `_`, a voidable tuple position, an array or map whose floor admits
  emptiness, a choice with a non-recursive variant, or a group with a terminating option.
  `item => { inner: item }` is refused. A parametric record is judged with its parameters assumed
  inhabited.
- A self-reference is a reference, not a wait, so recursion never trips the wait-cycle rule.

## Scoping and what a parameter is not

Parameters are local to their record and do not compose across `&`; sharing a name is how two positions
agree (`homogeneous_pair => <T> { first: T  second: T }`). Every declared parameter is used
(`<T> { v: text }` is refused). A parameter that shadows an entry of the namespace — a type, a value entry
or an incomplete entry — is refused; rename it. A parameter is never a head (`<T> { v: T<text> }`), takes
no default argument, and bounds no constructor: what a slot can say of a name it holds is a reference's
business (`meta.ref<meta.record>`).

## Resolver output

A parametric record resolves to `!meta.record { parameters: [!meta.param { name: T }] … }`, each
parameter its name and its written `bound`, its fields' types naming the parameters where they stand.
Types written in place are `{ of: … }`: `items: [T; 1..]` is
`type: { of: !meta.array { element_type: T  min_items: 1 } }`, and an open application over a parameter
is `{ of: !meta.apply { head: box  arguments: [T] } }` — the one place `meta.apply` stands. A declared
application is a closed `!meta.record` with `@meta.application` on its key; an application at a slot of a
closed record is `{ of: !meta.record { … } }`. A consumer that builds readers skips every record carrying
`parameters`: no position names one.
