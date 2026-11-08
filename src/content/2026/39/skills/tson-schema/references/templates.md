# Templates and parameters

Part 2 §5.10, §5.10.1, §8.2, condensed.

## Declaring

```
container => <T> { items: [T] }
pair      => <T, U> { first: T  second: U }
vector    => <T, N> !meta.array { element_type: T  min_items: N  max_items: N }
matrix    => <T, M, N> [[T; N]; M]
retry     => <N> { attempts?: int32 ~ N }
bounded   => <N> { attempts?: integer = N }
result    => <T> ( T | error )
e         => <M> !enum [a b M]
boxed     => <T: text> { a: T }
weighted  => <N: int8> { w?: integer ~ N }
```

`retry` routes a value parameter into a default, `bounded` into an injected pin, `result` puts a parameter in a collection slot, `e` uses one as an enum member, and `boxed` and `weighted` write a parameter's type.

Parameters go in `<>` immediately after `=>` (after a definition mark, `abstract <T> { … }`), each optionally followed by `:` and a type; separate with comma or whitespace. The body shapes divide in two:

- A **record template** — a fresh record, a composition or a refinement (`container`, `pair`, `retry`, `bounded`, `boxed`, `weighted`) — is a *family*: a `meta.record_template`, read as an ordinary record body at its declaration. In it a parameter stands in **three places and no other**: a field's whole type (`v: T`), a field's whole default or fixed value (`w?: int32 ~ N`), or an argument of an application (`items: box<T>`, `[T; N]`, a parent `result<T> & { … }`). A parameter as a field name, a group member, an `extension`, `name_type` or `discriminators`, or an operand of `&`/`^` (`<T> T & { name: text }`) is a resolver error.
- Every other template — over a container or sugar form (`matrix`), a constructor application (`vector`, `e`, `bounded_set => <N> !meta.set_type { element_type: text  min_items: N }`), a choice (`result`) or an alias — is an *abbreviation*: a `meta.template` holding the application `<params> !C core-value` as text, unread until the parameters are gone, so a parameter may stand in any slot (`min_items: N`, `variants: [T error]`, an enum member).

**A literal value needs a closed type**: a field whose type is a parameter, or an application over one, takes a parameter as its value or none — `<T> { v?: T ~ 5 }` is refused at the declaration.

## Using

`container<text>`, `vector<pixel, 1920>`, `matrix<pixel, 1080, 1920>`, `pair<text, {text => order}>`, `container<[integer]>`. A bare reference to a template is a resolver error — except a record template standing at a type position as a family base (below), never at an operand of `&` or `^`; the argument count must match. Arguments: a type expression (may nest), or a scalar literal (number, quoted string). An unquoted identifier argument (`true`, `OPEN`, `text`) is read as its parameter's recorded type says — a reference where that type is `meta.type_ref`, a literal (an enum member, say) where it is anything else: `e<c>` admits `c` as a member. In data and resolver output an application is the same reference, written unquoted with its arguments separated by whitespace — `pair<text integer>`.

## Parameter types

**Every parameter has a type, derived from the positions it stands in and recorded** — the kernel's `meta.template_param => { name: meta.param_name  type: meta.type_ref  bound?: meta.type_ref }`. It is never required of the author:

- a **type slot** (`element_type`, `key_type`, a record field's type) gives `meta.type_ref`;
- a **value slot** gives the slot's declared type — `min_items: N` and `[T; N]` give `numeric.count`, an enum's member list gives `text`;
- a **routed default or fixed value** (`w?: int32 ~ N`) gives the *field's* type, `int32`; where the field is typed by a parameter (`box => <T, N> { w?: T ~ N }`), `N`'s type is `T` — a `type` may name an earlier parameter of the same template;
- an **argument to another template** gives that template's recorded type for the position (a fixed point across templates); one left undetermined is `meta.type_ref`. The kernel's `meta.ref => <T> !meta.reference_type { of: T  allow_sibling: false }` records `T` as `meta.type_ref` — a type parameter whose argument may name a constructor or a type.

**The kind follows from the type**: `meta.type_ref` makes a *type parameter*, anything else a *value parameter*. Value parameters bind scalars only; type parameters bind references, simple or applied. **Several uses must agree**: the parameter's type is the use type that IS-A every other, and uses not ordered by IS-A are a resolver error — `<T> { a: T  b?: int32 ~ T }` (a type and a value) is refused, and so are two sibling widths such as `int8` and `int32`; declare the narrower type and use it in both places.

**A written type narrows what the uses derive**, read by the kind the uses give:

- on a **value parameter** it narrows `type`, and must IS-A the derived type: `<N: int8> { w?: integer ~ N }` records `int8`; `<N: text> !meta.array { element_type: text  min_items: N }` is refused, and so is `<N: int8>` there (`int8` is IS-A `integer`, not `numeric.count`) — write `<N: numeric.count>` or nothing;
- on a **type parameter** it is the `bound`: `boxed => <T: text> { a: T }` records `type: meta.type_ref  bound: text`, and `boxed<int32>` is refused. A bound follows IS-A edges only — `date` has a text form without being `text`, and `meta.identifier`, `stock_code => !unicode.text_type {}` or any other fresh construction fails `<T: text>`; a type meant to pass refines into the family (`stock_code => !text ^ { pattern: … }`);
- a bound is **inherited** through another template's argument list (`rebox => <T> boxed<T>` is bounded by `text`, so `rebox<int32>` is refused at its own application), and a written bound must IS-A every inherited one (`<T: currency_code> boxed<T>` narrows it; `<T: int32> boxed<T>` is refused);
- **a bound names a type, never a constructor**: `<T: unicode.text_type>` is refused at the declaration.

**All of these resolve in the template's one namespace.** A constructor's own slots are typed as its declaring document declared them (`meta.array.min_items` is the kernel's `numeric.count`), a schema's own fields as the schema declares them; a schema's own entry named `count` never stands in for `numeric.count`.

**Every application is checked at the call site**, against the parameter list, before anything is substituted: `vector<pixel, "two">` is refused at the argument, `boxed<int32>` at the application, `box<3>` because `3` lands at a type parameter. An argument the check cannot judge alone (an application, a name not yet resolved) is left to the substituted body, whose verdict is the same.

## Rules checked at the declaration

- Every declared parameter must be referenced somewhere in the body. `<T> { v: text }` is an error, not a degenerate template.
- Each parameter's uses agree on its type (above); the derivation, a written type and a bound are all checked here.
- A parameter must not shadow an entry of the schema's namespace (a type or a value entry). Rename it. A record template's parameter also must not be spelled like a name or token written among the arguments of an application in a field type it absorbs from a parent.
- Binding keys in a held constructor body must name real fields (`<T> !meta.array { elemen_type: T }` is a typo, caught at declaration); every field whose name is unmarked must be bound; concrete bindings are type-checked at declaration (`min_items: "two"` fails now).
- Nothing value-shaped that a parameter obscures is checked until materialisation — a resolver must not test with stand-in values.
- Heads are never parameters: `<A, N> A ^ { … }` and `<map> map<text, text>` are errors. `<N> !integer ^ { min: N }` is not a form; use `<N> !numeric.integer_type { min: N }` (fresh family, no IS-A `integer`) or keep the bound outside the template.
- No arithmetic, no default arguments, and no bound on the constructor an argument was built with (a *field* can say that instead: `meta.ref<meta.record>`).

## Value parameters in record bodies

In a **record** template the only way to route a value into a field is a modifier, and **the name's mark is the author's, exactly as beside a literal**: `attempts?: int32 ~ N` is a default, `attempts?: int32 = N` an injected pin, `attempts: int32 = N` a marker every document must write, and `attempts: int32 ~ N` is refused (a default on a key that is always written). Writing `min_items: N` in a record body declares a *field* named `min_items` of type `N`. In a held **constructor** body (`<N> !meta.array { … min_items: N }`) the slot is a value slot and the parameter stands in it directly.

While open, the parameter is the field's `value_param` (and a parameter standing for a field's whole type its `type_param`), with the role its modifier gives (`= N` FIXED, `~ N` DEFAULT); closing substitutes the argument into `value` (or `type`) and gives the field exactly the facts its literal spelling has — `retry<5>` is `attempts?: int32 ~ 5`. In a *fresh* record template a field pinned to a value parameter is also a family **selector** (below), whatever its name's mark. The argument is checked against the field's type at the application — `retry<text>` is refused there, because `N` is recorded as an `int32`.

## Partial application

A reference or refinement that leaves parameters open must re-declare them:

```
text_keyed_map => <V> {text => V}
uuid_pair      => <B> pair<uuid, B>
ok             => <T> result<T> & { note: text }
```

Implicit inheritance of parameters is not permitted; every parameter has a visible declaration site. A parent written as an application is kept in the template's `chain.parents` and closed with the body, so `ok<text>` — over a record template here, `result => abstract <T> { payload: T }` — is IS-A `result<text>`; the application at the operand mints no entry of its own, and a declared application of `ok` (`okt => ok<text>`) is IS-A `ok` and `result` too. A parameter is never itself an operand: `<T> T & { … }` and `<T> T ^ { … }` are refused.

## Record templates as family bases

A **record template** (fresh record, composition or refinement with a record body) may be named *bare* at a type position — `payload: result` — as the base of a family whose members are **the applications a declaration names** (`bt => box<int32>`, or `dog => pet<"dog", dog_details> & { … }`) and no others. An application written at a use site (`k: box<text>`) is a type read where it stands, never a candidate at a position typed by the template. The base is ABSTRACT by construction — not stated: the template's own `extension` is each application's, and `final` on a template is refused — and its `discriminators` are whatever selectors survive erasure: a `=?` field, or in a fresh record template a field pinned to a value parameter, whatever its name's mark —

```
pet  => <N, T> { type: text = N  pet: T }
dog  => pet<"dog", dog_details>
```

— one value per application being one pin per member; the base reads such a selector required, and each member is FIXED to its argument. A selector's declared type must mention none of the template's parameters, at any depth, value parameters included: `badge => <M, N> { kind: capped<M> = N  name: text }` is refused, while `kind: capped<9> = N` is fine. `abstract` written on a template (`result => abstract <T> { payload: T }`) is the *applications'* mark: `result<text>` is then an abstract base in its own right. Alias, container, constructor-application and atom templates are never bases; naming one bare is still an error. A record template is admitted by `meta.type_ref` and `meta.ref<meta.record_template>`, not by `meta.ref<meta.record>`, and it is no referent for a reference slot in a value entry — name a declared application there (`bt => box<int32>`, then `request: bt`).

## Recursion

```
node        => { value: text  children: [node] }
linked_list => <T> { value: T  next?: linked_list<T> }
tree        => <T> { value: T  children?: [tree<T>] }
```

- **Regularity**: a recursive application inside a template must pass each parameter through unchanged. `weird => <T> { next?: weird<[T]> }` is an error at declaration.
- **Productivity**: every type must admit a finite value. A required self-reference with no terminating path (`item => { inner: item }`, `pair => { l: pair  r: pair }`) is a resolver error at load. A cycle is guarded when it passes through a field whose key may be omitted or whose type admits `_` (`?` on the name or the type), a voidable tuple position, an array/map position whose floor admits emptiness or whose elements may be void, a choice with a non-recursive variant, or a group that must be chosen with at least one option that can be chosen without recursion. `node` above is productive because `[node]` may be empty. A template is judged with its parameters assumed inhabited. A required field typed `meta.ref<meta.alias>` (which admits no name) is unproductive too.
- A self-reference is a *reference*, not a wait: it orders nothing, so recursion never trips the wait-cycle rule.

## Materialisation model (for understanding resolver output)

In resolver output an entry is its value, and an open entry has one of two values. A **record template** is `!meta.record_template { fields: { v => !meta.record_template_field { type_param: T } }  parameters: [{ name: T  type: meta.type_ref }] }` — its fields label a parameter that stands for a whole type (`type_param`) or a whole value (`value_param`), its `chain.parents` the parents as written, its `discriminators` the family's. **Every other open entry** is an instance of the kernel's `meta.template` constructor — `vector => !meta.template { parameters: [{ name: T  type: meta.type_ref } { name: N  type: numeric.count }]  template: "!meta.array { element_type: T  min_items: N  max_items: N }" }` — holding the application as **text**; what is compared is the parsed form, never the text, so whitespace is free. Writing either constructor in source is refused. Closing an application substitutes every parameter token, innermost first, and a held body is then read once against the constructor's vocabulary. Sugar inside a template lifts to *open* synthetic entries (marked `@meta.synthetic`) that close along with it.

Where an application lands: a declaration whose body is a fully-bound application (`string_triple => vector<text, 3>`) **is** that application's entry — closed in place under the declared name, `@meta.application:vector<text 3>` on its key, no alias hop — and other uses of the same application resolve to it. An application nothing declares is its **expansion**: the closed synthetic entry its substituted form lands on, keyed on content (a use site's `box<int32>`, and `crate<int32>` over a template with the same field list, land on one entry), with no instantiation entry minted. The one exception is a **self-reaching** application — `nested<text>` over `nested => <T> ( T | [nested<T>] )` names itself inside its own body — which keeps one instantiation entry per canonical application (`tree<text>` and `tree<integer>` are two; `tree<user_id>` over `user_id => text` is `tree<text>`'s), a `!meta.alias` to its synthetic carrying `@meta.application`. Never key generated code or configuration on a minted name. A template with any open parameter can never be a data annotation (`!pair { … }` in data is an error).

Diagnostics for deferred checks land at the declaration that wrote the offending name: a bad name inside a held template body belongs to the template; a bad argument belongs to the applier, and the call-site check usually finds it before substitution.
