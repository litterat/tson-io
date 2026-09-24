# Templates and parameters

Part 2 §5.10, §5.10.1, §8.2, condensed.

## Declaring

```
container => <T> { items: [T] }
pair      => <T, U> { first: T  second: U }
vector    => <T, N> !array { element_type: T  min_items: N  max_items: N }
matrix    => <T, M, N> [[T; N]; M]
retry     => <N> { attempts: int32 ~ N }
bounded   => <N> { attempts: integer = N }
result    => <T> ( T | error )
e         => <M> !enum [a b M]
```

`retry` routes a value parameter into a default, `bounded` into a fixed field, `result` puts a parameter in a collection slot, and `e` uses one as an enum member.

Parameters go in `<>` immediately after `=>`; separate with comma or whitespace. Four body shapes — record, container/sugar, reference (alias), constructor application — all become one thing: a *held* constructor application `<params> !C core-value`, unread until the parameters are gone.

## Using

`container<text>`, `vector<pixel, 1920>`, `matrix<pixel, 1080, 1920>`, `pair<text, {text => order}>`, `box<[integer]>`. A bare reference to a template is a resolver error; argument count must match. Arguments: a type reference (may nest), or a scalar literal (number, quoted string). An unquoted identifier argument (`true`, `OPEN`, `text`) is substituted as a token and read by the slot it lands in — a reference in a type slot, a literal in a value slot or enum member list.

## Rules checked at the declaration

- Every declared parameter must be referenced somewhere in the body. `<T> { v: text }` is an error, not a degenerate template.
- Each parameter is a **type** parameter (used at type positions) or a **value** parameter (used at value positions: `~ P`, `= P`, a scalar slot like `min_items: N`, a size bound `[T; N]`) — never both.
- A parameter must not shadow a type name in the schema's namespace. Rename it.
- Binding keys in a held constructor body must name real fields (`<T> !array { elemen_type: T }` is a typo, caught at declaration); every field whose name is unmarked must be bound; concrete bindings are type-checked at declaration (`min_items: "two"` fails now).
- Nothing value-shaped that a parameter obscures is checked until materialisation — a resolver must not test with stand-in values.
- Heads are never parameters: `<A, N> A ^ { … }` and `<map> map<text, text>` are errors. `<N> !integer ^ { min: N }` is not a form; use `<N> !integer_type { min: N }` (fresh family, no IS-A `integer`) or keep the bound outside the template.
- No parameter bounds, no arithmetic, no defaults for parameters.

## Value parameters in record bodies

In a **record** template the only way to route a value into a field is a modifier, written on an **unmarked** name: `attempts: int32 ~ N` or `= N`. Writing `min_items: N` in a record body declares a *field* named `min_items` of type `N`. In a held **constructor** body (`<N> !array { … min_items: N }`) the slot is a value slot and the parameter stands in it directly.

While open, such a field is required and FREE with the parameter in its `value`; closing makes it optional and FIXED (`= P`) or optional and DEFAULT (`~ P`) with the argument as its value — exactly what `attempts?: int32 = 5` written literally would be. In a *fresh* record template a field pinned to a value parameter is also a family **selector** (below). The bound value is checked against the field's type at materialisation — `retry<text>` fails because `text` does not conform to `int32`, located at the application site that wrote it.

## Partial application

A reference or refinement that leaves parameters open must re-declare them:

```
text_keyed_map => <V> {text => V}
uuid_pair      => <B> pair<uuid, B>
ok             => <T> result<T> & { note: text }
```

Implicit inheritance of parameters is not permitted; every parameter has a visible declaration site. A parent written as an application is held in `record.supertypes` and closed with the body, so `ok<text>` is IS-A `result<text>`; the application at the operand mints no entry of its own.

## Record templates as family bases

A **record-bodied** template (fresh record, composition or refinement with a `!record` body) may be named *bare* at a type position — `payload: result` — as the base of a family whose members are its applications. It is ABSTRACT by derivation (its entry carries `extension: ABSTRACT`, and `final` on it is refused), and its `discriminators` are whatever selectors survive erasure: a `=?` field, or in a fresh record template a field pinned to a value parameter —

```
pet  => <N, T> { type: text = N  pet: T }
dog  => pet<"dog", dog_details>
```

— one value per application being one pin per member. A selector's declared type must contain no type parameter. `abstract` written on a template (`result => abstract <T> { payload: T }`) is the *applications'* mark: `result<text>` is then an abstract base in its own right. Reference, container, constructor-application and atom templates are never bases; naming one bare is still an error.

## Recursion

```
node        => { value: text  children: [node] }
linked_list => <T> { value: T  next?: linked_list<T> }
tree        => <T> { value: T  children?: [tree<T>] }
```

- **Regularity**: a recursive application inside a template must pass each parameter through unchanged. `weird => <T> { next?: weird<[T]> }` is an error at declaration.
- **Productivity**: every type must admit a finite value. A required self-reference with no terminating path (`item => { inner: item }`, `pair => { l: pair  r: pair }`) is a resolver error at load. A cycle is guarded when it passes through a field whose key may be omitted or whose type admits `_` (`?` on the name or the type), an optional tuple position, an array/map position whose floor admits emptiness or whose elements admit absence, a choice with a non-recursive variant, or a required group with a non-recursive member. `node` above is productive because `[node]` may be empty.

## Materialisation model (for understanding resolver output)

In resolver output an open entry is a `type_definition` whose body is an instance of the kernel's `template` constructor — `!template { parameters: […]  template: "…" }` — holding the application as **text**; its `source` is the constructor that text applies (`record`, `array`, `map`, `set_type`, `scoped`, `reference`), and a parameter reference appears only inside the held text, never in `source`. What is compared is the parsed form, never the text, so whitespace is free. Closing an application substitutes every parameter token in the held body, innermost first, then reads the body once against the constructor's vocabulary. One entry exists per distinct fully-bound application (`tree<text>` and `tree<integer>` are two; every further `tree<text>` reuses the first). Sugar inside a template lifts to *open* synthetic entries (marked `@synthetic`) that close along with it. A declaration whose body is a fully-bound application (`string_triple => vector<text, 3>`) **is** that application's entry — closed in place under the declared name, `source` the application, no `!reference` hop — and other uses of the same application resolve to it; only an application no declaration names mints an internally named entry. Never key generated code or configuration on a minted name. A template with any open parameter can never be a data annotation (`!pair { … }` in data is an error).

Diagnostics for deferred checks land at the declaration that wrote the offending name: a bad name inside the template body belongs to the template; a bad argument belongs to the applier.
