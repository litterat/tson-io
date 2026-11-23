# Schema grammar reference

Verbatim excerpts from TSON Part 2 §12 (2026 Revision 40): the section's opening, the schema grammar — from the `schema-document` production (header, root annotations, the `!schema` tag, the schema map) down — the disambiguation summary, and the adjacency rules; followed by condensed notes on error categories, name hygiene, and the schema-side resource limits. The header directives (`!!id` and `!!import`, the only two) and `qualified-name` are Part 1 §7.4 grammar; see the tson-data skill's grammar notes. A data value carries no argument list and no `kind!`: both are this grammar's alone.

This section defines the schema grammar — the schema document's body grammar, the second of the two body grammars behind the shared document header ([TSON-DATA] §2.2, §7.4). This grammar adds no token of its own ([TSON-DATA] §7.3): the productions below consume the same token stream, and the reserved special tokens of [TSON-DATA] §7.2.5 receive their meaning here — `+`, which that section emits as a special token from Revision 37, among them. This grammar's `type-ref` is a name or an application, a name and an argument list, the application being sugar for the construction `meta.apply` written in place (§5.10); [TSON-DATA] §7.4's argument list in data spells no reference, and is refused wherever one is read (§4.2). A dependent field's type, `dependent-type`, is this grammar's alone (§5.2).


### 12.1 The Schema Grammar

A schema document is the header [TSON-DATA]'s grammar defines, followed by the root value: its annotations, the tag `!schema`, and the **schema map**, the annotated, braced declaration map. `ws`, `ws1`, `separator`, `token`, `unquoted-token`, `annotation`, `field-name`, `record`, `empty-brace`, `identifier`, `qualified-name`, `id-directive`, `import-directive` and `core-value` are imported from [TSON-DATA] §7.3, §7.4, and §7.7; the data grammar's value productions appear at exactly two points — the full `core-value` as the constructor-application payload (`instance`, §5.6), and its braced subset (`record` / `empty-brace`) as the body after `^` (`value-refinement`, §5.5), the same text under two heads, which is the desugar §5.6 states. No production of this grammar uses the full `data-value`: a composition body is a braced `record-def` of field definitions (§5.8), and a field-modifier value is restricted to a bare token — or, for the selector `=?`, nothing at all — (§5.2), never the void sentinel, annotations, a tag, or a container.

A `schema-map` copies the shape of [TSON-DATA]'s `map` production but requires at least one entry — `{}` at schema-body position is a parse error. An entry is called a **declaration**. Annotations before the tag bind to the schema; annotations at the head of an entry bind to the key; annotations after `=>` bind to the type definition (§2.1, §6).

```
; ── Schema document ───────────────────────────────────────

schema-document  = [ id-directive ] ws *( import-directive ws )
                   *( annotation ws ) "!schema" ws schema-map ws
                 ; the root's tag, "!schema", names the pre-loaded kernel's
                 ; root `schema` (§2.1); it is what classifies the document
                 ; ([TSON-DATA] §2.2). A root with any other tag —
                 ; `!meta.schema` included — or none, is a data document.

; ── Schema Map (schema body) ──────────────────────────────

schema-map       = "{" ws schema-map-entry
                   *( separator schema-map-entry ) [ ws "," ] ws "}"
                 ; a comma may follow a value ([TSON-DATA] §2.4);
                 ; every list in this grammar admits one after its
                 ; last element

schema-map-entry = *( annotation ws ) type-name ws "=>" ws
                   *( annotation ws )
                   ( type-def / nested-map )

nested-map       = ( "!schema" / "!meta.schema" ) ws schema-map
                 ; a schema map nested as an entry (§4.1): its members
                 ; are declarations of the document, named by path

definition-mark  = "abstract" / "final"
                 ; how a record may be realised (§5.2): one word,
                 ; read unconditionally at the head of a type-def and
                 ; an ordinary identifier everywhere else; it stands
                 ; before a record definition alone — braces, a
                 ; composition or a subtraction, and before the
                 ; parameter list of a parametric record (§5.10). A
                 ; bare mark is a declaration missing its definition,
                 ; and one before `!` or a type-expr a parse error

; ── Type Definition (declaration right-hand side) ─────────

type-def = value-refinement              ; never parameterised
         / instance
         / [ definition-mark ws ] [type-params] structural-def
         / [type-params] type-expr
         ; there is no constructor marker: an entry is a
         ; constructor by being IS-A `meta.top` (§4.2), and `~` is
         ; a special token with no role at type-def position.
         ; type-params parse before any body; the resolver admits
         ; them before a record body alone — braces, a
         ; composition or `!meta.record` (§5.10)

type-params = "<" ws type-param *( separator type-param ) [ ws "," ] ws ">"
type-param  = param-name [ ws ":" ws type-expr ]
            ; the written type is the parameter's bound (§5.10)
param-name  = type-name   ; same lexical class as type-name

structural-def = construction-def
               / record-def
               ; `^` follows `!` and a name alone (value-refinement);
               ; after a bare type-ref it is a parse error (§5.7)

construction-def = supertype-ref 1*(ws "&" ws supertype-ref)
                   [ws "&" ws record-def] [ws removal-set]
                 / supertype-ref ws "&" ws record-def [ws removal-set]
                 / supertype-ref ws removal-set

supertype-ref = type-ref
              ; composition and subtraction operands are named
              ; type references, optionally with arguments —
              ; never paren, bracket or map forms (§4.3, §5.8)

removal-set  = "-" ws "{" ws field-name
               *( separator field-name ) [ ws "," ] ws "}"

record-def   = "{" ws [record-entry *(separator record-entry)
               [ ws "," ]] ws "}"
record-entry = field-def / group-def

value-refinement = "!" qualified-name ws "^" ws ( record / empty-brace )
                 ; value refinement or open construction (§5.5): field
                 ; bindings — the braced subset of the core-value
                 ; payload `instance` takes, read by the same data
                 ; grammar; the target MUST resolve to a value whose type
                 ; states refinement rules, a constructor of types or an
                 ; incomplete entry (§3.3.1, §5.5, §5.7)

instance     = [type-params ws] "!" qualified-name ws core-value
             ; constructor application (§5.5): the target resolves
             ; in the document's namespace (§3.3.1) to a constructor,
             ; `meta.top` or IS-A it — `meta.alias` included (§8.3)
             ; — to an incomplete entry, which it completes (§5.5),
             ; or to an ordinary type, which makes the entry a
             ; value entry (§4.1). The payload is a core value —
             ; braced bindings or the positional form (§5.6) — never
             ; annotations or directives; an argument list inside
             ; it is a parse error, a payload being data
             ; ([TSON-DATA] §7.2.5), so a type slot there writes
             ; an application as { of: !meta.apply { … } }
             ; (§5.10). A parameter list is admitted before
             ; `!meta.record` alone, which declares a parametric record
             ; (§5.10).

; ── Field Definitions ─────────────────────────────────────

field-def      = *annotation field-name ["?"] ws ":" ws
                 ( field-type field-modifier
                 / field-type
                 / field-modifier )
               ; the "?" on the name answers omission (§5.2);
               ; "a?:" lexes as name, "?", ":" with no lexer change

field-type     = type-expr ["?"] / dependent-type
               ; the "?" on the type answers a written "_" — the
               ; field is voidable (§5.2)

dependent-type = unquoted-token "!"
               ; a dependent field's type (§5.2), sugar for
               ; { of: !meta.dependent { on: kind } }: "!" adjacent
               ; to the token before it and followed by whitespace
               ; (§12.3); the token is one segment, an identifier,
               ; naming a field of the same record. No "?" follows,
               ; so a dependent field is never voidable. A name with
               ; an adjacent "!" at any other position is a parse
               ; error

field-modifier = ws ("~" / "=") ws token
               / ws "=" ws "?"
               ; "~" default, "=" fixed: the value is a single
               ; scalar token, never a compound value, an
               ; application or the void sentinel (§5.2); "=?" is
               ; the selector a discriminated family's members pin
               ; (§5.2) — two special tokens, no value

; ── Field Groups (§5.11) ──────────────────────────────────

group-def    = *annotation "(" ws group-option
               *( ws "|" ws group-option ) ws ")" [ "?" / "+" ]
group-option = group-member *( separator group-member )
group-member = *annotation field-name ["?"] ws ":" ws field-type
               ; "|" separates options and a separator the members
               ; of one option. A "?" on a member's name marks it
               ; optional within its option; the "?" on its type
               ; makes it voidable, and its type may be a
               ; dependent-type, a member being a field; no modifier is admitted, a
               ; group never injecting. The group's own "?" makes
               ; it optional; "+" is sugar for at-least-one and is
               ; admitted only where every option is one unmarked
               ; member. Which groups restate plain fields or
               ; another group, and are refused for it, is the
               ; resolver's check (§5.11).

; ── Type Expressions (any type position) ──────────────────

type-expr = paren-type
          / bracket-type
          / brace-type
          / type-ref
          ; one token of lookahead after a name ("<" or neither)
          ; picks an application or a name

type-ref  = qualified-name [ "<" ws type-args ws ">" ]
          ; a type: a name, or an application, the construction
          ; meta.apply written in place (§5.10), with the
          ; argument below.

; ── Compound Type Expressions ─────────────────────────────

paren-type = "(" type-expr "|" type-expr *("|" type-expr) ")"   ; choice, 2+ variants

bracket-type = "[" element-type [ ws ";" ws size-spec ] ws "]"           ; array
             / "[" element-type 1*(separator element-type) "]"           ; tuple

brace-type   = map-type / record-def
             ; one dispatch at every position a brace opens a type
             ; (§12.2). A record-def is the declaration's own
             ; structural-def at type-def position, and at a type
             ; slot a record written in place (§5.2), which the
             ; resolver refuses where only a name stands: an
             ; argument, a parameter's bound

map-type     = "{" ws map-key ws "=>" ws element-type
               [ ws ";" ws size-spec ] ws "}"                            ; map sugar (§5.3)

map-key      = type-ref
             ; a name: an application parses and the resolver
             ; refuses it, a key being declared and named, and
             ; paren, bracket and brace forms do not parse (§5.3)

element-type = type-expr [ "?" ]
             ; nesting is this recursion: [[T; N]; N] and
             ; {text => [order; 1..]} work by the same rule
             ; that makes [[T]] work, each form written in place
             ; (§5.3)

size-spec    = size-bound [ ws ".." ws [ size-bound ] ]
             / ".." ws size-bound
             ; a size-bound is decimal-natural (§5.3)

; One production per container, at every position: an
; element's "?" belongs to element-type inside the brackets,
; and a field's own "?" to field-type, so "xs: [T?]?" is
; unambiguous — element voidable, field voidable.

; ── Terminals ─────────────────────────────────────────────

type-args  = type-arg *(separator type-arg) [ ws "," ]
           ; separator = ws "," ws / ws1; a trailing comma
           ; follows a value and changes nothing
type-arg   = type-expr
           ; wider than the data grammar's in what parses: an
           ; argument is a name or a parameter, and a sugar form
           ; or a record body parses and the resolver refuses
           ; it, the form being declared first or, of a
           ; constructor's application, written in place; of a
           ; parametric record's, an application is refused too, and of
           ; a constructor's it closes at the slot it fills
           ; (§5.3); a number or a quoted string is no
           ; type-expr, an argument being a type (§5.3)
size-bound = unquoted-token
           ; text MUST match the decimal-natural production
           ; of [TSON-DATA] §7.6; a parameter's name here is a
           ; resolver error (§5.3)
type-name  = identifier
           ; [TSON-DATA] §7.7: a declared key is one segment, an
           ; unquoted token whose decoded text matches the
           ; identifier grammar — XID_Start-initial, so no name
           ; begins with a digit, a sign, or a dot, which is what
           ; makes numbers undeclarable (param-name shares the
           ; rule). Every name at a type position and every `!` head
           ; is a qualified-name, each segment held to the same
           ; grammar.
           ; A token in name position that fails the grammar is a
           ; parse error. field-name is any unquoted or single-line
           ; token ([TSON-DATA] §2.5, §7.4) — in field-def,
           ; group-member and removal-set as in data — and is
           ; judged not by this grammar but at link, by the
           ; record's name type (§5.2): a name that is no value of
           ; it is a resolver error, and under the default name
           ; type that is the identifier grammar. The schema
           ; grammar and the data grammar share the production.
```

Notes:

- The `type-params` slot declares a parametric record's parameters (§5.10), each optionally followed by `:` and its bound, decided on the one token after the name; parameters take precedence over namespace lookup, and a reference to a parametric record MUST supply every argument, at every position (§5.10).
- `definition-mark` is read unconditionally at the head of a type-def: `pet => abstract base & { … }` is a marked composition, and a type named `abstract` cannot stand alone as a declaration's whole body, which is the sole reservation the two words carry (§5.2, [TSON-DATA] §7.7). It belongs to the record definition and to no other alternative, the mark being sugar for that record's `extension`: before a construction (`abstract !meta.record { … }`, `final !enum [A B]`, `abstract !meta.array ^ { … }`), a name, a declared application (`abstract box<text>`), a sugar form or a choice it is a parse error at the mark. The kernel's form states `extension` itself, and a resolved form, whose entries are constructions, carries no mark. ABSTRACT's rule — no direct instances, a value at a position typed by it a value of some subtype, a tag naming the base itself refused — is the rule the kernel's own `meta.top`, `meta.type`, `meta.atom`, `meta.product` and `meta.sum` are read by, each marked `abstract` (§4.1), so a direct application of one is refused as any abstract record's is.
- `=?` is two tokens the lexer already emits — `=` then `?` — admitted by `field-modifier` only with no value; `a: T =? v` is a parse error. It is refused by the resolver on a name carrying `?`, on a voidable type, on a group member, on a dependent field, and on a type that is not an atom-family instance or an enum (§5.2).
- `dependent-type` is a `field-type` alternative and no `type-expr`, so it stands as a record field's or a group member's whole type and nowhere else: `[kind!]`, `box<kind!>`, `( kind! | text )`, `x => kind!`, `kind! ^ { … }` and `{kind! => text}` are parse errors, and so is `kind!?`. It is no data grammar ([TSON-DATA] §7.4), so a construction's payload (`instance`) cannot hold it.
- `paren-type` produces choice types; choices require at least two variants — `(T)` is a parse error.
- `group-def` produces field groups (§5.11): one or more options separated by `|`, each one or more members. That a group has at least two members, and the rules giving each presence rule one spelling, are the resolver's (§5.11). Inside a record body, `(` at entry position (after any leading annotations) opens a group; `(` after a `field-name ":"` opens a `paren-type`. The two never collide — a group is an entry, a choice is a type expression. A `?` or a `+` after the closing `)` marks the group; member positions reject modifiers by grammar.
- A `?` after a field's *name* records `optional: true` on the `meta.record_field`; a `?` after a *type* at a field, tuple position, array element, map value or group member records that the position admits `_` (`voidable: true` on a `meta.record_field`, `meta.tuple_element`, `meta.array` or `meta.map`); a `?` after a group member's *name* lists it in the group's `optional_members`; a `?` after a group's closing `)` records `optional: true` on the `meta.field_group`, and a `+` there lowers to the one-option form (§5.11). Those are the only positions, and there is no generic "optional type" in TSON.
- `type-def` reaches the bracket and map forms through `type-expr` like any other position; there is no separate declaration-level container production, and no positional restriction on size specifiers or element/position `?` (§5.3).
- `instance` is decidable on one token after the optional parameter list: `!` opens an `instance`, with or without a preceding `<…>`; `<` only ever starts `type-params`, so consuming it first costs no lookahead. Inside the `!` branch a following `^` separates `value-refinement` from `instance`; `value-refinement` admits no parameter list — a parameterised refinement or open construction is no form, and `<…> ! name ^` is a parse error.
- A `!` head naming an ordinary type declares a value entry (§4.1); one naming an incomplete entry completes it (§5.5); one naming `schema` or `meta.schema` is `nested-map`, and the payload is the schema grammar.
- The trailing record-def in `construction-def` is optional (`customer => address & contact` is valid). When a `{` follows a `&`-chain, it always belongs to the construction's record-def.
- Every `supertype-ref` operand is restricted to a named reference — a `type-ref`, a name optionally with type-args; inline structural forms cannot precede `&` or `-` by grammar (§4.3). Nor does any follow a type at a type slot: `at: point & { z: int32 }` is a parse error, composition and subtraction being declared (§5.2). `^` follows `!` and a name alone, so a bare `type-ref` followed by `^` — `person ^ { … }`, `meta.array ^ { … }`, `box<text> ^ { … }`, `<T> box<T> ^ { … }`, or at a type slot — is a parse error, whatever the name resolves to, and its diagnostic SHOULD name the composition, `person & { … }` (§5.7). A `^` whose resolved target is neither a constructor of types nor an incomplete entry, and whose type states no refinement rule for a field the body names (a tuple, for example), is a resolver error reported with the target's type.
- The removal clause attaches to construction heads only (§5.9).
- After a bare type-ref in type-def position, `{` is a parse error; the diagnostic SHOULD suggest `&` (composition).
- Parameters and type arguments inside `<>` alike separate by comma or whitespace — the general separator convention ([TSON-DATA] §7.4): `<T, MIN>` and `<T MIN>`, `meta.map<text, integer>` and `meta.map<text integer>` are all valid. Canonical resolved output writes one space and no comma.
- `_` is not valid in type-expr, type-def body or field-modifier positions (§5.2, §7.6); empty records use `{}`, and a field that may only be omitted or `_` is spelled `a?: void?`.
- A comma may follow the last element of every list in this grammar — declarations, fields, groups, removal sets, parameters, arguments, tuple elements ([TSON-DATA] §2.4); `[text, int32, ]` and `pair<uuid, B, >` are legal. A comma following nothing, or another comma, is a parse error, as in data.


### 12.2 Disambiguation Summary

This section is informative.

```
; document (after the header):
;   @              → annotation; before the tag it binds to the schema
;   !schema {      → schema document; the schema map opens
;   ! other        → data document; a Class 1 read, or a Class 2 read
;                    of a data value under the header's imports
;
; schema map:
;   @              → annotation; binds to the entry key (name) or,
;                    after "=>", to the type definition
;   name =>        → declaration (two-token lookahead)
;   }              → schema map closes
;   anything else  → parse error
;
; type-def position (after =>):
;   abstract / final → definition-mark (§5.2); consumed, then
;                    dispatch continues on what follows, which
;                    must be a structural-def
;   <              → type-params (each name optionally followed
;                    by ":" and a type-expr); then dispatch continues:
;     !              → instance; the resolver admits
;                      `!meta.record` alone (§5.10)
;     otherwise      → structural-def / type-expr; the
;                      resolver admits a record body alone
;   !schema {      → nested-map (§4.1); likewise !meta.schema
;   ! name ^       → value refinement, or open construction (§5.5)
;   ! name         → constructor application, a completion, or a value entry (§5.5)
;   name ^         → parse error (`^` follows `! name`; write &)
;   name &         → construction-def (composition, §5.8)
;   name -         → construction-def (subtraction, §5.9)
;   name {         → parse error (write &)
;   name!          → parse error (a dependent type is a field's, §5.2)
;   {              → brace form, the one dispatch for every
;                    position a brace opens a type; consume "{"
;                    and dispatch on content (reusing
;                    [TSON-DATA] §2.8's consume-one-then-inspect
;                    machinery):
;     "}"            → empty record ({}, meta.top's shape)
;     "("            → record-def (leading field group)
;     "@"            → record-def (annotations precede field
;                      names, §6; the map sugar admits no
;                      interior annotations, §5.3, so "@"
;                      commits to a record)
;     name ":"       → record-def (field)
;     name "?"       → record-def (field with an omittable key)
;     name "=>"      → map-type
;     name "<"       → map-type (generic key; consume the
;                      arguments, expect "=>"; the resolver
;                      refuses the key, a key being a name)
;     name (other)   → parse error
;   (              → paren-type (choice)
;   [              → bracket-type (array or tuple, full syntax)
;   name < / name  → type-ref
;
; type-expr position (field types, array elements, etc.):
;   (              → paren-type (choice)
;   [              → bracket-type (full syntax at every position)
;   {              → brace form, dispatched as at type-def
;                    position (above): a record-def, a record
;                    written in place (§5.2), or a map-type;
;                    "{" "{" and "{" "[" are parse errors, a
;                    map's key being a name
;   name <         → application ("<" adjacent, §12.3)
;   name !         → dependent-type, as a field's or a group member's
;                    whole type ("!" adjacent, whitespace after,
;                    §5.2); a parse error at any other position
;   name ? / name  → simple ref
;
; record-def entry position (after leading annotations):
;   (              → group-def (field group, §5.11)
;   name ":"       → field-def
;   name "?" ":"   → field-def, key omittable (§5.2)
;
; inside a group-def (§5.11):
;   name ":"       → member
;   name "?" ":"   → member, optional within its option
;   "|"            → next option
;   ")"            → group closes; an adjacent "?" or "+" marks it
;
; after a field's type-expr:
;   ?              → voidable (§5.2)
;   ~ token        → default
;   = token        → fixed
;   = ?            → selector (§5.2); no value follows
;   & / -          → parse error (composition and subtraction
;                    are declared, §5.2)
;   ^              → parse error (`^` follows `! name`)
;   name "=>"      → parse error ("record body expected; =>
;                    begins a map type only at type positions")
;
; map-type internal rules:
;   exactly one key => value entry ("a map type is a single
;   key => value entry" — the data grammar's multi-entry habit
;   does not carry over, §5.3); a "?" on the key side of "=>"
;   is a parse error, and the value side admits it (§5.3); the
;   key "<" case is the one place the
;   generic-key rule is reachable — after the arguments close,
;   ":" here is a parse error whose diagnostic SHOULD read
;   "expected =>; if you meant a record field, a generic key
;   cannot name one"
;
; bracket-form internal disambiguation:
;   [type sep type  → tuple (whitespace or comma)
;   [type ; spec    → array with size constraint
;   [type ]         → unconstrained array
;   [type ? ...     → element "?"
;   [[ ...          → nested bracket-type (full syntax)
;   [{ ...          → nested brace form (map-type or record-def)
;
; after a construction body "}":
;   -              → removal clause (§5.9)
;   otherwise      → declaration boundary rules below
;
; declaration boundary (resync): after a bare type-ref in
; type-def position, one/two-token lookahead decides:
;   ^              → parse error (`^` follows `! name`; write &)
;   <              → type arguments of the current type-ref
;   &              → composition continues the current type-def
;   -              → removal clause of the current type-def
;   ","            → current declaration complete
;   name "=>"      → current declaration complete; a new one begins
;   "}"            → current declaration complete; map closes
;   "{"            → parse error (write &)
;   name (other)   → parse error
```

Each case in the type-def block is decided by at most two tokens of lookahead at the start of the production — the brace form by one consumed token plus one token of lookahead, the same budget in the same sense as the data grammar's §2.8 dispatch; inside a bracket form, the choice between tuple, sized array, and unconstrained array is made by one-token lookahead after the complete preceding element type. A `field-type` can itself be nested (`(email | [phone])?`) and parses without backtracking via the disambiguation above; the outer `?` there makes the field voidable (§5.2). The schema body requires at most two tokens of lookahead to detect a declaration boundary. The parser never backtracks at any level.


### 12.3 Adjacency Rules

The following rows extend the adjacency table of [TSON-DATA] §7.5 for the operators of the type-definition grammar; as there, the rules are enforced by the parser via source-position comparison.

| Operator | Type | Context | Rule |
|---|---|---|---|
| `!` | prefix | type-def body (constructor application, completion, value refinement, open construction) | MUST be adjacent to the following unquoted-token (constructor, instance or incomplete entry name) |
| `<` | prefix of a list | application (§5.10) | MUST be adjacent to the preceding unquoted-token (the head); whitespace inside the list is free; `box <text>` is a parse error. The argument list is this grammar's alone: in a data value `<` and `>` are parse errors ([TSON-DATA] §7.2.5) |
| `!` | suffix | dependent type, a record field's type (§5.2) | MUST be adjacent to the preceding unquoted-token, and MUST be followed by whitespace; `a!b`, `kind!}` and `kind!?` are parse errors |
| `?` | suffix | field type, tuple position, array/map element (element-type, §5.3), field group | MUST be adjacent to the preceding token (type name or closing bracket/paren) |
| `&` | binary | composition | whitespace on either side optional |
| `^` | binary | refinement or open construction, after `! name` alone (§5.5, §5.7) | whitespace on either side optional |
| `-` | prefix | removal clause (§5.9) | at least one whitespace character MUST separate the preceding token from `-`; whitespace optional before the following `{` |
| `~` | modifier | default value | whitespace optional |
| `=` | modifier | fixed value | whitespace optional |
| `=?` | modifier | selector (§5.2) | whitespace optional before `=` and between `=` and `?` |
| `?` | suffix | field name (omittable key, §5.2); group-member name (optional within its option, §5.11) | MUST be adjacent to the preceding field name |
| `+` | suffix | field group (at least one of, §5.11) | MUST be adjacent to the preceding `)` |
| `:` | separator | parameter type (§5.10) | whitespace optional on both sides |
| `\|` | separator | choice variant; field-group option | whitespace optional |
| `;` | separator | array size spec; map size spec (§5.3) | whitespace optional |
| `..` | binary | size-spec range (§5.3) | whitespace on either side optional |
| `=>` | separator | schema declaration; data map entry; map type sugar (§5.3) | whitespace optional (compound token from lexer) |

The whitespace requirement before removal `-` is a lexer fact restated as a rule: hyphen-minus continues an unquoted token ([TSON-DATA] §7.2.4 — hyphenated names are legal), so in `account- { password }` the hyphen is absorbed into `account-` and no removal clause exists — the same footgun class as `[1-2]` lexing as one token. When a token ending in `-` appears at a type-def position followed by `{`, the diagnostic SHOULD note the absorbed hyphen and suggest whitespace before `-`.


## Error categories at the schema layer (Part 2 §1.3, Part 1 §8.1)

Everything that makes a schema fail to load is a **resolver error**, however value-like the rule:

- **Names.** An unresolved name (every name resolves from the root, so a bare `address` written inside `geo => !schema { … }` names the root's `address`, not `geo.address`); a local name reusing one the closure binds, or two different schemas declaring one name or member path (a nested schema map excepted, which is open and merges); a name at a reference-typed slot the reference does not admit (a value entry at `meta.type_ref`, a record type at `meta.ref<method>`, a qualified name that reaches nothing or enters a map that is no namespace); a reference whose `of` names a value entry, a parametric record or an incomplete entry; an annotation that does not resolve; `chain`, `@meta.application` or `@meta.completion` written in source.
- **Bodies and facets.** An unknown facet or field in a construction or refinement body; incoherent bounds; a facet value its family's instance refuses (`!number ^ { min: 0x10 }`); a braced payload at an atom instance (`!integer { min: 0 }` — the form is `!integer ^ { … }`); a direct application of an abstract entry (`!meta.top {}`, `!meta.atom {}`); a constructor declaring a field named `chain`.
- **`^`.** `!R ^ { … }` over a record (the diagnostic names `R & { … }`), or over a value whose type states no refinement rule for a field the body names (a tuple, a choice, a namespace value); a facet moved against its rule (a bound outward, `normalization`, `encoding`).
- **Incomplete entries.** An open construction `!C ^ { … }` that writes every required field (that is `!C { … }`); a field an incomplete entry already wrote, written again; a completion leaving a required field absent; an incomplete entry named where a type is — a field's type, a variant, an argument, a bound, an `&` operand, a reference's `of`, an annotation.
- **Fields.** A field name that is no value of its record's name type (`{ "first name": text }` under the default); supertypes with different name types; a name type whose form does not imply NFC or whose profile admits `.`; a refused field spelling (a default on an unmarked name, a pin on a voidable type, `=?` where a selector cannot stand, `_` as a modifier value); a value modifier on a field typed by anything but an atom or an enum (a record, container, tuple or choice, named or written in place); a value that fails the field's type; `a: void`.
- **Types written in place.** A namespace type, a declared sum, an enum or another atom construction written at a slot (name it); a dependent type declared (`x => !meta.dependent { … }`) or at any slot but a record field's type; `parameters` or `chain` on a type written in place; a required field typed by an abstract record written in place.
- **Dependent fields.** A sibling declared after the dependent field, voidable, optional with no default, or typed by anything but a reference over a constructor or `meta.type_expr`; a default or pin on the dependent field; a dependent field restated as anything else; a removal taking the sibling and leaving the dependent field.
- **Parametric records.** `<…>` before anything but a record body; a parameter declared and unused, or shadowing an entry; a parameter anywhere but a field's type, a slot of a type written in place there, or an argument (a default or pin, a facet, a size bound, an enum member, a field name, a group member); a parameter as an operand or a head; a parametric record named bare at any position; `final` on one; a bound naming a constructor or an incomplete entry; an argument a bound refuses, or a parameter passed to a bounded one without a bound that IS-A it; a sugar form, an applied constructor or an application as an argument of a parametric record's application; an application where only a name stands (a map's key, a reference's `of`, a bound, an alias target); `x => !meta.apply { … }`; irregular recursion (`weird<B, A>` inside `weird => <A, B>`); a recursive application no declaration closes (`f: node<text>`); a parametric record that could never be closed (`wrap => <T> { n: node<T> }`).
- **Composition and families.** A diamond; composing onto a FINAL record; a modifier-only entry naming no inherited field; a restatement that moves a field fact backwards or changes a pin; a restated type that is not the inherited one or IS-A it; a member not pinning a selector, or colliding pins anywhere in the closure; an application at a type slot whose closed record would be a member of a declared family (`k: dog_of<text>`).
- **Choices.** A `void` variant; two variants reaching one entry; `@meta.disjoint` refuted; a choice that is not disjoint holding a variant written in place; a choice holding a choice that is not disjoint.
- **Externs.** A target that is a parametric record, an incomplete entry, a constructor, a value entry, a schema map or no name of the foreign schema; composing, subtracting, refining, applying or defaulting through one; a head reaching `meta.extern` through an alias; a foreign schema on another kernel.
- **Loading.** Unproductive recursion; a **wait cycle** (`a => b & {}` beside `b => a & {}`; `c1 => !c2 {}` beside `c2 => !c1 {}`; `note => @note:"x" text`); an alias chain with no terminal; import cycles, through externs too; two distinct pins for one identity; hash mismatches.

Two outcomes sit beside the categories and are no verdict on validity: **refused** — this processor will not supply the schema (not held and not fetched, off its allowlist, a required pin missing, too large) or declined the document under its hygiene policy or limits — and **undetermined** — it could not obtain the schema (nothing at the reference, no answer), so nothing was judged. **Validation errors** are reserved for data checked against a schema that loaded: a tag naming a parametric record, an incomplete entry or a value entry is one. **Parse errors** are grammar-level: any directive but `!!id`/`!!import`, a directive out of its header position, `{}` as the schema map, `name {` or `name ^ {` with no `!` (`person ^ { … }`, `box<text> ^ { … }` — write `&`), `(T)` one-variant choice, `_` at a type position, a `!C …` or `!I ^ …` form at a type slot (`{ e: !enum [A B] }` — name it first), `&`, `^` or `-` after a field's type (`at: point & { z: int32 }`), `kind!` anywhere but a record field's or group member's whole type, and `kind!?`, a modifier on a group member, `a: T =? v`, two definition marks, a mark before `!`, a name or a declared application, `<…> !I ^ { … }`, a map key opening with `{` or `[`, a number or quoted token as an argument, and an argument list or a `kind!` in a value — a data document's or a construction's payload. A root not tagged `!schema` is no error: it classifies the document as data, so a schema body written as bare `{ … }` reads as a data document. There are no warnings.

## Name hygiene at the schema layer (Part 2 §11.4, Part 1 §8.2)

Beyond the identifier grammar, conforming processors enforce by default (as *policy refusals*, not validity errors): skeleton distinctness (no two names in one scope may be visually confusable — `admin` vs Cyrillic `аdmin`, also pure-ASCII `comer`/`corner`), `Identifier_Status=Allowed` characters only, and a UTS #39 restriction level (default Highly Restrictive over the whole name; per-segment relaxation admits `id_пользователя`). Scopes at this layer: the members of one enum and the field names of one record (group labels included), each under its `name_type`'s profile — a profile's own added characters (`json_name`'s `@` and `$`, a medial space) are exempt from the `Identifier_Status` check and still read by the look-alike and script rules — the declared names of one schema map (the root, and each nested `!schema` map as a scope of its own), and the merged namespace at each `!!import`. A parametric record's parameter list is no scope. A foreign schema reached by an extern is judged in its own namespace, never against the declaring document's. The per-name rules reach every segment of a qualified name without a scope. A schema's own identifier-typed values are judged too: a field's default or fixed value, the keys of a value entry's map (`orders => !api { place_order => … }`), a qualified name's segments, an annotation's value. A value typed by an identifier family is a name wherever it stands, so data gains two scopes: the keys of one map keyed by an identifier family (a namespace value's among them), and the elements of one array of unique elements of one (a `set<…>` among them). A `text`-keyed map stays data. A deployment states its identifier and token policies and its limits in the vocabulary `https://tson.io/2026/40/m/policy.tn` declares; no document selects the policy it is judged under. Practical advice for an author: keep names single-script or separate scripts with `_`, and avoid pairs that differ only by `l`/`I`, `O`/`0`, `rn`/`m`.

## Resource limits for schemas (Part 2 §11.5)

A schema is untrusted input wherever it is accepted over the wire or reached through `!!import` or an
extern. These limits join Part 1 §9.1's policy on the same terms: every one has a default, MUST be
configurable or have its enforced value documented, MUST report the threshold on refusal, and a refusal is
**not a verdict** — it is reported beside the four error categories, distinguished by the rule that
refused. Each is a field of `policy.limits`.

| Limit | Applies to | Default |
|---|---|---|
| `max_import_closure` | schemas reachable from one document through `!!import` and through externs | 64 |
| `max_schema_entries` | declarations in one schema map, nested maps' members included | 65,536 |
| `max_alias_chain` | hops from a use site to a terminal entry | 64 |
| `max_supertype_chain` | length of one type's `chain.supertypes` | 64 |
| `max_wait_depth` | the longest chain of waits in one document's resolution, an entry waiting on the next being ready | 64 |

Closing an application needs no limit of its own: each parametric record is closed at most once on a
path, a repeat tying to the declaration being closed or refused. The document-side counters of Part 1
§9.1 — nesting depth, token length, document size, total values, and the rest — apply to a schema
document as a document.
