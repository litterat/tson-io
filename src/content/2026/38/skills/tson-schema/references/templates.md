# Templates and parameters

Part 2 §5.10, §5.10.1, §8.2, condensed.

## Declaring

```
container => <T> { items: [T] }
pair      => <T, U> { first: T  second: U }
vector    => <T, N> !array { element_type: T  min_items: N  max_items: N }
matrix    => <T, M, N> [[T; N]; M]
retry     => <N> { attempts?: int32 ~ N }
bounded   => <N> { attempts?: integer = N }
result    => <T> ( T | error )
e         => <M> !enum [a b M]
boxed     => <T: text> { a: T }
weighted  => <N: int8> { w?: integer ~ N }
```

`retry` routes a value parameter into a default, `bounded` into an injected pin, `result` puts a parameter in a collection slot, `e` uses one as an enum member, and `boxed` and `weighted` write a parameter's type.

Parameters go in `<>` immediately after `=>`, each optionally followed by `:` and a type; separate with comma or whitespace. The body shapes divide in two:

- A **record template** — a fresh record, a composition or a refinement (`container`, `pair`, `retry`, `bounded`, `boxed`, `weighted`) — is a *family*: a `record` with `parameters`, read as an ordinary record body at its declaration. In it a parameter stands in **three places and no other**: a field's type (`v: T`), a field's default or fixed value (`w?: int32 ~ N`), or an argument of an application (`items: box<T>`, `[T; N]`, a parent `result<T> & { … }`). A parameter as a field name, a group member, an `extension` or `name_type`, or an operand of `&`/`^` (`<T> T & { name: text }`) is a resolver error.
- Every other template — over a container or sugar form (`matrix`), a constructor application (`vector`, `e`), a choice (`result`) or a reference (an alias) — is an *abbreviation*: a *held* application `<params> !C core-value`, unread until the parameters are gone, so a parameter may stand in any slot (`min_items: N`, `variants: [T error]`, an enum member).

## Using

`container<text>`, `vector<pixel, 1920>`, `matrix<pixel, 1080, 1920>`, `pair<text, {text => order}>`, `box<[integer]>`. A bare reference to a template is a resolver error — except a record template standing at a type position as a family base (below), never at an operand of `&` or `^`; argument count must match. Arguments: a type reference (may nest), or a scalar literal (number, quoted string). An unquoted identifier argument (`true`, `OPEN`, `text`) is read as its parameter's recorded type says — a reference where that type is `type_kind`, a literal (an enum member, say) where it is anything else.

## Parameter types

**Every parameter has a type, derived from the positions it stands in and recorded** — the kernel's `template_param => { name: param_name  type: type_kind  bound?: type_kind }`. It is never required of the author:

- a **type slot** (`element_type`, `key_type`, a field's type — each typed `type_kind`) gives `type_kind`;
- a **value slot** gives the slot's declared type — `min_items: N` and `[T; N]` give `non_negative_integer`, an enum's member list gives `text`;
- a **routed default or fixed value** (`w?: int32 ~ N`) gives the *field's* type, `int32`; where the field is typed by a parameter (`<T, N> { w?: T ~ N }`), `N`'s type is `T` — a `type` may name an earlier parameter of the same template;
- an **argument to another template** gives that template's recorded type for the position (a fixed point across templates); one left undetermined is `type_kind`. Core's `kind => <T> !kind_type { of: T }` records `T` as `type_name` — a value parameter whose argument is a constructor's name.

**The kind follows from the type**: `type_kind` makes a *type parameter*, anything else a *value parameter*. Value parameters bind scalars only; type parameters bind references, simple or compound. **Several uses must agree**: the parameter's type is the use type that IS-A every other, and uses not ordered by IS-A are a resolver error — `<T> { a: T  b?: int32 ~ T }` (a type and a value) is refused, and so are two sibling widths such as `int8` and `int32`; declare the narrower type and use it in both places.

**A written type narrows what the uses derive**, read by the kind the uses give:

- on a **value parameter** it narrows `type`, and must IS-A the derived type: `<N: int8> { w?: integer ~ N }` records `int8`; `<N: text> !array { element_type: text  min_items: N }` is refused;
- on a **type parameter** it is the `bound`: `boxed => <T: text> { a: T }` records `type: type_kind  bound: text`, and `boxed<int32>` is refused. A bound follows IS-A edges only — `date` has a text form without being `text`, and `identifier`, `stock_code => !text_type {}` or any other fresh construction fails `<T: text>`; a type meant to pass refines into the family (`stock_code => !text ^ { pattern: … }`);
- a bound is **inherited** through another template's argument list (`rebox => <T> boxed<T>` is bounded by `text`), and a written bound must IS-A every inherited one;
- **a bound names a type, never a constructor**: `<T: text_type>` is refused at the declaration.

**Where a value parameter's type is read follows the template's form.** A template whose held body applies a meta constructor other than `record` (`vec => <N> !array { element_type: text  min_items: N }`, core's `extern_type`) binds into the meta's own slots, so its value parameters' types — written ones included — are read in the structure namespace: `N` is the meta's `non_negative_integer`, and `<N: int8>` there is refused. A record template's parameters are read in the schema's own namespace. Bounds are always the schema's.

**Every application is checked at the call site**, against the parameter list, before anything is substituted: `vector<pixel, "two">` is refused at the argument, `boxed<int32>` at the application. An argument the check cannot judge alone (an application, a name not yet resolved) is left to the substituted body, whose verdict is the same.

## Rules checked at the declaration

- Every declared parameter must be referenced somewhere in the body. `<T> { v: text }` is an error, not a degenerate template.
- Each parameter's uses agree on its type (above); the derivation, a written type and a bound are all checked here.
- A parameter must not shadow a type name in the schema's namespace. Rename it.
- Binding keys in a held constructor body must name real fields (`<T> !array { elemen_type: T }` is a typo, caught at declaration); every field whose name is unmarked must be bound; concrete bindings are type-checked at declaration (`min_items: "two"` fails now).
- Nothing value-shaped that a parameter obscures is checked until materialisation — a resolver must not test with stand-in values.
- Heads are never parameters: `<A, N> A ^ { … }` and `<map> map<text, text>` are errors. `<N> !integer ^ { min: N }` is not a form; use `<N> !integer_type { min: N }` (fresh family, no IS-A `integer`) or keep the bound outside the template.
- No arithmetic, no default arguments, and no bound on the constructor an argument was built with.

## Value parameters in record bodies

In a **record** template the only way to route a value into a field is a modifier, and **the name's mark is the author's, exactly as beside a literal**: `attempts?: int32 ~ N` is a default, `attempts?: int32 = N` an injected pin, `attempts: int32 = N` a marker every document must write, and `attempts: int32 ~ N` is refused (a default on a key that is always written). Writing `min_items: N` in a record body declares a *field* named `min_items` of type `N`. In a held **constructor** body (`<N> !array { … min_items: N }`) the slot is a value slot and the parameter stands in it directly.

While open, the parameter rides the field's `value`, with the role its modifier gives (`= N` FIXED, `~ N` DEFAULT) where it is written; closing substitutes the argument and gives the field exactly the facts its literal spelling has — `retry<5>` is `attempts?: int32 ~ 5`. In a *fresh* record template a field pinned to a value parameter is also a family **selector** (below), whatever its name's mark. The argument is checked against the field's type at the application — `retry<text>` is refused there, because `N` is recorded as an `int32`.

## Partial application

A reference or refinement that leaves parameters open must re-declare them:

```
text_keyed_map => <V> {text => V}
uuid_pair      => <B> pair<uuid, B>
ok             => <T> result<T> & { note: text }
```

Implicit inheritance of parameters is not permitted; every parameter has a visible declaration site. A parent written as an application is kept in the template's `chain.parents` and closed with the body, so `ok<text>` — over a record template here, `result => abstract <T> { payload: T }` — is IS-A `result<text>`; the application at the operand mints no entry of its own. A parameter is never itself an operand: `<T> T & { … }` and `<T> T ^ { … }` are refused.

## Record templates as family bases

A **record template** (fresh record, composition or refinement with a `!record` body) may be named *bare* at a type position — `payload: result` — as the base of a family whose members are **the applications a declaration names** (`bt => box<int32>`, or `dog => pet<"dog", dog_details> & { … }`) and no others. An application written at a use site (`k: box<text>`) is a type read where it stands, never a candidate at a position typed by the template. The base is ABSTRACT by construction — not stated: the record's own `extension` is each application's, and `final` on a template is refused — and its `discriminators` are whatever selectors survive erasure: a `=?` field, or in a fresh record template a field pinned to a value parameter, whatever its name's mark —

```
pet  => <N, T> { type: text = N  pet: T }
dog  => pet<"dog", dog_details>
```

— one value per application being one pin per member; the base reads such a selector required, and each member is FIXED to its argument. A selector's declared type must mention none of the template's parameters, at any depth, value parameters included: `badge => <M, N> { kind: capped<M> = N  name: text }` is refused, while `kind: capped<9> = N` is fine. `abstract` written on a template (`result => abstract <T> { payload: T }`) is the *applications'* mark: `result<text>` is then an abstract base in its own right. Reference, container, constructor-application and atom templates are never bases; naming one bare is still an error.

## Recursion

```
node        => { value: text  children: [node] }
linked_list => <T> { value: T  next?: linked_list<T> }
tree        => <T> { value: T  children?: [tree<T>] }
```

- **Regularity**: a recursive application inside a template must pass each parameter through unchanged. `weird => <T> { next?: weird<[T]> }` is an error at declaration.
- **Productivity**: every type must admit a finite value. A required self-reference with no terminating path (`item => { inner: item }`, `pair => { l: pair  r: pair }`) is a resolver error at load. A cycle is guarded when it passes through a field whose key may be omitted or whose type admits `_` (`?` on the name or the type), a voidable tuple position, an array/map position whose floor admits emptiness or whose elements may be void, a choice with a non-recursive variant, or a group that must be chosen with at least one option that can be chosen without recursion. `node` above is productive because `[node]` may be empty. A template is judged with its parameters assumed inhabited.

## Materialisation model (for understanding resolver output)

In resolver output an entry is its value, and an open entry has one of two values. A **record template** is the record itself with its parameters: `box => !record { fields: { v => !record_field { type: T } }  parameters: [{ name: T  type: type_kind }] }`, its `chain.parents` the parents as written and its `discriminators` the family's. **Every other open entry** is an instance of the kernel's `template` constructor — `vector => !template { parameters: [{ name: T  type: type_kind } { name: N  type: non_negative_integer }]  template: "!array { element_type: T  min_items: N  max_items: N }" }` — holding the application as **text**; what is compared is the parsed form, never the text, so whitespace is free. Closing an application substitutes every parameter token, innermost first, and a held body is then read once against the constructor's vocabulary. Sugar inside a template lifts to *open* synthetic entries (marked `@synthetic`) that close along with it.

Where an application lands: a declaration whose body is a fully-bound application (`string_triple => vector<text, 3>`) **is** that application's entry — closed in place under the declared name, `@application:{ name: vector  arguments: [{ name: text } { value: 3 }] }` on its key, no `!reference` hop — and other uses of the same application resolve to it. An application nothing declares is its **expansion**: the closed synthetic entry its substituted form lands on, keyed on content (a use site's `box<int32>`, and `crate<int32>` over a template with the same field list, land on one entry), with no instantiation entry minted. The one exception is a **self-reaching** application — `tree<text>` names itself inside its own body — which keeps one instantiation entry per canonical application (`tree<text>` and `tree<integer>` are two; `tree<user_id>` over `user_id => text` is `tree<text>`'s), a `!reference` to its synthetic carrying `@application`. Never key generated code or configuration on a minted name. A template with any open parameter can never be a data annotation (`!pair { … }` in data is an error).

Diagnostics for deferred checks land at the declaration that wrote the offending name: a bad name inside the template body belongs to the template; a bad argument belongs to the applier, and the call-site check usually finds it before substitution.
