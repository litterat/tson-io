# Schema grammar reference

Verbatim excerpts from TSON Part 2 §12 (2026 Revision 39): the section's opening, the schema grammar — from the `schema-document` production (header, root annotations, the `!schema` tag, the schema map) down — the disambiguation summary, and the adjacency rules; followed by condensed notes on error categories, name hygiene, and the schema-side resource limits. The header directives (`!!id` and `!!import`, the only two), `qualified-name`, `sibling-ref` and the data-side reference production are Part 1 §7.4 grammar; see the tson-data skill's grammar notes.

This section defines the schema grammar — the schema document's body grammar, the second of the two body grammars behind the shared document header ([TSON-DATA] §2.2, §7.4). This grammar adds no token of its own ([TSON-DATA] §7.3): the productions below consume the same token stream, and the reserved special tokens of [TSON-DATA] §7.2.5 receive their meaning here — `+`, which that section emits as a special token from Revision 37, among them. The reference production — a qualified name with an argument list, and the sibling reference — is [TSON-DATA] §7.4's; this grammar's `sibling-ref` and `type-ref` reuse it, `type-ref` with a wider argument.

A schema document is the header [TSON-DATA]'s grammar defines, followed by the root value: its annotations, the tag `!schema`, and the **schema map**, the annotated, braced declaration map. `ws`, `ws1`, `separator`, `token`, `unquoted-token`, `annotation`, `field-name`, `record`, `empty-brace`, `identifier`, `qualified-name`, `sibling-ref`, `id-directive`, `import-directive` and `core-value` are imported from [TSON-DATA] §7.3, §7.4, and §7.7; the data grammar's value productions appear at exactly two points — the full `core-value` as the constructor-application payload (`instance`, §5.6), and its braced subset (`record` / `empty-brace`) as the value-refinement body (`value-refinement`, §5.5), the same text under two heads, which is the desugar §5.6 states. No production of this grammar uses the full `data-value`: a record-refinement body is a braced `record-def` (§5.7), and a field-modifier value is restricted to a bare token — or, for the selector `=?`, nothing at all — (§5.2), never the void sentinel, annotations, a tag, or a container.

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
                   ( [ definition-mark ws ] type-def
                   / nested-map )

nested-map       = ( "!schema" / "!meta.schema" ) ws schema-map
                 ; a schema map nested as an entry (§4.1): its members
                 ; are declarations of the document, named by path

definition-mark  = "abstract" / "final"
                 ; how a record may be realised (§5.2): one word,
                 ; read unconditionally at this one position and an
                 ; ordinary identifier everywhere else; a bare mark
                 ; with no type-def is a declaration missing its
                 ; definition; a mark on a non-record definition is
                 ; a resolver error; written before the parameter
                 ; list of a template (§5.10)

; ── Type Definition (declaration right-hand side) ─────────

type-def = value-refinement              ; never parameterised
         / instance
         / [type-params] structural-def
         / [type-params] type-expr
         ; there is no constructor marker: an entry is a
         ; constructor by being IS-A `meta.top` (§4.2), and `~` is
         ; a special token with no role at type-def position

type-params = "<" ws type-param *( separator type-param ) [ ws "," ] ws ">"
type-param  = param-name [ ws ":" ws type-expr ]
            ; the written type narrows a value parameter's type
            ; or bounds a type parameter, by the kind the body's
            ; uses give (§5.10)
param-name  = type-name   ; same lexical class as type-name

structural-def = refined-def
               / construction-def
               / record-def

refined-def  = ( sibling-ref / type-ref ) ws "^" ws record-def
             ; record refinement, and constructor refinement (§5.7);
             ; the head's optional arguments serve user-template
             ; heads only (§5.7). No removal clause.

construction-def = supertype-ref 1*(ws "&" ws supertype-ref)
                   [ws record-def] [ws removal-set]
                 / supertype-ref ws "&" ws record-def [ws removal-set]
                 / supertype-ref ws removal-set

supertype-ref = sibling-ref / type-ref
              ; composition and subtraction operands are named
              ; type references, optionally with arguments —
              ; never paren, bracket or map forms (§4.3, §5.8); a
              ; sibling reference parses here, as at every reference
              ; position, and the resolver refuses it (§5.2)

removal-set  = "-" ws "{" ws field-name
               *( separator field-name ) [ ws "," ] ws "}"

record-def   = "{" ws [record-entry *(separator record-entry)
               [ ws "," ]] ws "}"
record-entry = field-def / group-def

value-refinement = "!" qualified-name ws "^" ws ( record / empty-brace )
                 ; value refinement (§5.5): the type's own field
                 ; bindings — the braced subset of the core-value
                 ; payload `instance` takes, read by the same data
                 ; grammar; the target MUST resolve to a value whose
                 ; type states refinement rules (§3.3.1, §5.7)

instance     = [type-params ws] "!" qualified-name ws core-value
             ; constructor application (§5.5): the target resolves
             ; in the document's namespace (§3.3.1) to a constructor,
             ; `meta.top` or IS-A it — `meta.alias` included (§5.10)
             ; — or to an ordinary type, which makes the entry a
             ; value entry (§4.1). The payload is a core value —
             ; braced bindings or the positional form (§5.6) — never
             ; annotations or directives; an application inside it
             ; is the reference production of [TSON-DATA] §7.4,
             ; written unquoted. With a parameter list the body is
             ; held unread until materialisation (§5.10), except a
             ; `!meta.record` body, which resolves to a
             ; `!meta.record_template`, read as vocabulary and
             ; labelled at its declaration; open and closed
             ; share one production and one payload grammar.

; ── Field Definitions ─────────────────────────────────────

field-def      = *annotation field-name ["?"] ws ":" ws
                 ( field-type field-modifier
                 / field-type
                 / field-modifier )
               ; the "?" on the name answers omission (§5.2);
               ; "a?:" lexes as name, "?", ":" with no lexer change

field-type     = type-expr ["?"]
               ; the "?" on the type answers a written "_" — the
               ; field is voidable (§5.2); a sibling-ref here is a
               ; dependent field (§5.2)

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
group-member = *annotation field-name ["?"] ws ":" ws type-expr ["?"]
               ; "|" separates options and a separator the members
               ; of one option. A "?" on a member's name marks it
               ; optional within its option; the "?" on its type
               ; makes it voidable; no modifier is admitted, a
               ; group never injecting. The group's own "?" makes
               ; it optional; "+" is sugar for at-least-one and is
               ; admitted only where every option is one unmarked
               ; member. Which groups restate plain fields or
               ; another group, and are refused for it, is the
               ; resolver's check (§5.11).

; ── Type Expressions (any type position) ──────────────────

type-expr = paren-type
          / bracket-type
          / map-type
          / sibling-ref
          / type-ref
          ; one token of lookahead after a name ("!", "<", or
          ; neither) picks sibling-ref, an application, or a name

type-ref  = qualified-name [ "<" ws type-args ws ">" ]
          ; a reference to a type: a name, or an application —
          ; [TSON-DATA] §7.4's production with the wider argument
          ; below.

; ── Compound Type Expressions ─────────────────────────────

paren-type = "(" type-expr "|" type-expr *("|" type-expr) ")"   ; choice, 2+ variants

bracket-type = "[" element-type [ ws ";" ws size-spec ] ws "]"           ; array
             / "[" element-type 1*(separator element-type) "]"           ; tuple

map-type     = "{" ws map-key ws "=>" ws element-type
               [ ws ";" ws size-spec ] ws "}"                            ; map sugar (§5.3)

map-key      = sibling-ref / type-ref
             ; a simple ref, optionally with arguments — never
             ; paren, bracket or map forms (§5.3); a sibling
             ; reference parses and the resolver refuses it (§5.2)

element-type = type-expr [ "?" ]
             ; nesting is this recursion: [[T; N]; N] and
             ; {text => [order; 1..]} work by the same rule
             ; that makes [[T]] work; a sibling-ref is refused
             ; here by the resolver, before any lift (§5.2)

size-spec    = size-bound [ ws ".." ws [ size-bound ] ]
             / ".." ws size-bound
             ; a size-bound is decimal-natural or, within a
             ; template body, a value-parameter name (§5.3)

; One production per container, at every position: an
; element's "?" belongs to element-type inside the brackets,
; and a field's own "?" to field-type, so "xs: [T?]?" is
; unambiguous — element voidable, field voidable.

; ── Terminals ─────────────────────────────────────────────

type-args  = type-arg *(separator type-arg) [ ws "," ]
           ; separator = ws "," ws / ws1; a trailing comma
           ; follows a value and changes nothing
type-arg   = type-expr / value-literal
           ; wider than the data grammar's: a schema argument
           ; may be sugar, which lifts to its own entry (§5.3);
           ; a sibling-ref is refused here by the resolver
value-literal = token
           ; a single scalar lexeme: a number, quoted string,
           ; or other non-name token. An unquoted token that
           ; satisfies qualified-name (`true` and `false`
           ; included) parses as a type-ref; it is read as its
           ; parameter's recorded type (§5.10), so a name bound
           ; to a parameter standing in an enum's member list
           ; is a member and one bound to a type parameter must
           ; resolve as a type.
size-bound = unquoted-token
           ; text MUST match the decimal-natural production
           ; of [TSON-DATA] §7.6 or, within a template body,
           ; be a value-parameter name (§5.3)
type-name  = identifier
           ; [TSON-DATA] §7.7: a declared key is one segment, an
           ; unquoted token whose decoded text matches the
           ; identifier grammar — XID_Start-initial, so no name
           ; begins with a digit, a sign, or a dot, which is what
           ; makes numbers undeclarable (param-name shares the
           ; rule). Every referenced name and every `!` head is a
           ; qualified-name, each segment held to the same grammar.
           ; A token in name position that fails the grammar is a
           ; parse error. field-name is any unquoted or single-line
           ; token ([TSON-DATA] §2.5, §7.4) — in field-def,
           ; group-member and removal-set as in data — and is
           ; judged not by this grammar but at link, by the
           ; record's name type (§5.2): a name that is no value of
           ; it is a resolver error, and under the default name
           ; type that is the identifier grammar. The schema
           ; grammar and the data grammar share the production.
           ; Resolver-materialised synthetic and instantiation
           ; entries (§8.2) carry internal names in this same
           ; class; the resolver keeps them disjoint from
           ; declared names by construction (freshness, §8.2),
           ; and they are unreachable from source because they
           ; do not exist at source level.
```

Notes:

- The `type-params` slot declares type parameters (§5.10), each optionally followed by `:` and a type expression — a written type, decided on the one token after the name; parameters take precedence over namespace lookup, and references to a parameterized type MUST supply matching type arguments — except that a record template may be named bare at a type position as a family base (§5.10), never at an operand of `&` or `^` (§5.8).
- `definition-mark` is read unconditionally: `pet => abstract base & { … }` is a marked composition, and a type named `abstract` cannot stand alone as a declaration's whole body, which is the sole reservation the two words carry (§5.2, [TSON-DATA] §7.7). ABSTRACT's rule — no direct instances, a value at a position typed by it a value of some subtype, a tag naming the base itself refused — is the rule the kernel's own `meta.top`, `meta.type`, `meta.atom`, `meta.product` and `meta.sum` are read by, each marked `abstract` (§4.1), so a direct application of one is refused as any abstract record's is.
- `=?` is two tokens the lexer already emits — `=` then `?` — admitted by `field-modifier` only with no value; `a: T =? v` is a parse error. It is refused by the resolver on a name carrying `?`, on a voidable type, on a group member, on a dependent field, and on a type that is not an atom-family instance or an enum (§5.2).
- `sibling-ref` is [TSON-DATA] §7.4's — an unquoted token of one segment with an adjacent `!` followed by whitespace — and is a `type-expr` alternative picked by one token of lookahead after the name; `[ kind! ]`, `box< kind! >`, `( kind! | text )` and `x => kind!` parse, `[kind!]` does not, and every position but a record field's type refuses one at the resolver (§5.2).
- `paren-type` produces choice types; choices require at least two variants — `(T)` is a parse error.
- `group-def` produces field groups (§5.11): one or more options separated by `|`, each one or more members. That a group has at least two members, and the rules giving each presence rule one spelling, are the resolver's (§5.11). Inside a record body, `(` at entry position (after any leading annotations) opens a group; `(` after a `field-name ":"` opens a `paren-type`. The two never collide — a group is an entry, a choice is a type expression. A `?` or a `+` after the closing `)` marks the group; member positions reject modifiers by grammar.
- A `?` after a field's *name* records `optional: true` on the `meta.record_field`; a `?` after a *type* at a field, tuple position, array element, map value or group member records that the position admits `_` (`voidable: true` on a `meta.record_field`, `meta.tuple_element`, `meta.array` or `meta.map`); a `?` after a group member's *name* lists it in the group's `optional_members`; a `?` after a group's closing `)` records `optional: true` on the `meta.field_group`, and a `+` there lowers to the one-option form (§5.11). Those are the only positions, and there is no generic "optional type" in TSON.
- `type-def` reaches the bracket and map forms through `type-expr` like any other position; there is no separate declaration-level container production, and no positional restriction on size specifiers or element/position `?` (§5.3).
- `instance` is decidable on one token after the optional parameter list: `!` opens an `instance`, with or without a preceding `<…>`; `<` only ever starts `type-params`, so consuming it first costs no lookahead. Inside the `!` branch a following `^` separates `value-refinement` from `instance`; `value-refinement` admits no parameter list — a parameterised refinement of an instance is no form (§5.10), and `<…> ! name ^` is a parse error.
- A `!` head naming an ordinary type declares a value entry (§4.1); one naming `schema` or `meta.schema` is `nested-map`, and the payload is the schema grammar.
- The trailing record-def in `construction-def` is optional (`customer => address & contact` is valid). When a `{` follows a `&`-chain, it always belongs to the construction's record-def.
- The refined-def target and every `supertype-ref` operand are restricted to a named reference — a `type-ref`, a name optionally with type-args, or a `sibling-ref`; inline structural forms cannot precede `^`, `&`, or `-` by grammar (§4.3); a sibling reference parses there, as at every reference position, and the resolver refuses it (§5.2). A `^` whose resolved target states no refinement rule for a field the body names (a container instance, for example) is a resolver error reported with the target's type.
- The removal clause attaches to construction heads only; a refinement head admits none — `T ^ { ... } - { ... }` is a parse error (§5.7, §5.9).
- After a bare type-ref in type-def position, `{` is a parse error; the diagnostic SHOULD suggest `^` (refinement) or `&` (composition).
- Parameters and type arguments inside `<>` alike separate by comma or whitespace — the general separator convention ([TSON-DATA] §7.4): `<T, MIN>` and `<T MIN>`, `map<text, integer>` and `map<text integer>` are all valid. Canonical resolved output writes one space and no comma.
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
;                    dispatch continues on what follows
;   <              → type-params (each name optionally followed
;                    by ":" and a type-expr); then dispatch continues:
;     !              → instance, held open (§5.10)
;     otherwise      → templated structural-def / type-expr
;   !schema {      → nested-map (§4.1); likewise !meta.schema
;   ! name ^       → value refinement (§5.5)
;   ! name         → constructor application, or a value entry (§5.5)
;   name ^         → refined-def (§5.7)
;   name &         → construction-def (composition, §5.8)
;   name -         → construction-def (subtraction, §5.9)
;   name {         → parse error (write ^ or &)
;   name!          → sibling-ref: refused at the resolver as a body
;   {              → brace form; consume "{" and dispatch on
;                    content (reusing [TSON-DATA] §2.8's
;                    consume-one-then-inspect machinery):
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
;                      arguments, expect "=>")
;     name (other)   → parse error
;   (              → paren-type (choice)
;   [              → bracket-type (array or tuple, full syntax)
;   name < / name  → type-ref
;
; type-expr position (field types, array elements, etc.):
;   (              → paren-type (choice)
;   [              → bracket-type (full syntax at every position)
;   {              → map-type: "{" name … "=>" required;
;                    "{" name ":" remains a parse error — bare
;                    records must be declared (§5.2); the
;                    diagnostic SHOULD say so and distinguish
;                    the two brace meanings
;   name <         → application ("<" adjacent, [TSON-DATA] §7.5)
;   name !         → sibling-ref ("!" adjacent, whitespace after)
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
;   [{ ...          → nested map-type
;
; after a construction body "}":
;   -              → removal clause (§5.9)
;   otherwise      → declaration boundary rules below
;
; declaration boundary (resync): after a bare type-ref in
; type-def position, one/two-token lookahead decides:
;   ^              → refinement body of the current type-def
;   <              → type arguments of the current type-ref
;   &              → composition continues the current type-def
;   -              → removal clause of the current type-def
;   ","            → current declaration complete
;   name "=>"      → current declaration complete; a new one begins
;   "}"            → current declaration complete; map closes
;   "{"            → parse error (write ^ or &)
;   name (other)   → parse error
```

Each case in the type-def block is decided by at most two tokens of lookahead at the start of the production — the brace form by one consumed token plus one token of lookahead, the same budget in the same sense as the data grammar's §2.8 dispatch; inside a bracket form, the choice between tuple, sized array, and unconstrained array is made by one-token lookahead after the complete preceding element type. A `field-type` can itself be nested (`(email | [phone])?`) and parses without backtracking via the disambiguation above; the outer `?` there makes the field voidable (§5.2). The schema body requires at most two tokens of lookahead to detect a declaration boundary. The parser never backtracks at any level.


### 12.3 Adjacency Rules

The following rows extend the adjacency table of [TSON-DATA] §7.5 for the operators of the type-definition grammar; as there, the rules are enforced by the parser via source-position comparison.

| Operator | Type | Context | Rule |
|---|---|---|---|
| `!` | prefix | type-def body (constructor application, value refinement) | MUST be adjacent to the following unquoted-token (constructor or instance name) |
| `?` | suffix | field type, tuple position, array/map element (element-type, §5.3), field group | MUST be adjacent to the preceding token (type name or closing bracket/paren) |
| `&` | binary | composition | whitespace on either side optional |
| `^` | binary | refinement (§5.5, §5.7) | whitespace on either side optional |
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

Everything that makes a schema fail to load is a **resolver error**, however value-like the rule: unresolved names (every name resolves from the root, so a bare `address` written inside `geo => !schema { … }` names the root's `address`, not `geo.address`), unknown facet members, incoherent bounds, invalid defaults, a facet value its family's instance refuses (`!number ^ { min: 0x10 }`), a braced payload at an atom instance (`!integer { min: 0 }` — the form is `!integer ^ { … }`), `^` on a constructor or on a value whose type states no refinement rule (a container instance, a namespace value), refuted `@meta.disjoint`, unproductive recursion, a **wait cycle** (`a => b & {}` beside `b => a & {}`; `c1 => !c2 {}` beside `c2 => !c1 {}`; `note => @note:"x" text`), an alias chain with no terminal, unused or shadowing parameters, a parameter whose uses disagree or whose written type does not IS-A what they derive, an argument refused by its parameter's type or bound, a direct application of an abstract entry (`!meta.top {}`, `!meta.atom {}`), a constructor declaring a field named `chain`, a declared field name or enum member that is no value of its name type (`{ "first name": text }` under the default), supertypes with different name types, a name type whose form does not imply NFC, a parameter as an operand of `&`/`^` or anywhere in a record template but a field's type, value or an argument, a record template named bare at an operand, `chain`, `@meta.synthetic` or `@meta.application` written in source, a name at a reference-typed slot the reference does not admit (a value entry at `meta.type_ref`, a record type at `meta.ref<method>`, a qualified name that reaches nothing or enters a map that is no namespace), a reference whose `of` names a value entry or an open entry, a sibling reference anywhere but a record field's type, a dependent field whose sibling is declared after it, is voidable, may be absent with no default, or is typed by anything but a reference over a constructor, a refused field spelling (a default on an unmarked name, a parametric one included, a pin on a voidable type, `=?` where a selector cannot stand, a default or pin on a dependent field), a field group that restates plain fields or another group, a failed family check (a member not pinning a selector, colliding pins anywhere in the closure, composing onto or refining a FINAL record, a use-site application that composes onto a record and so would mint an undeclared family member), import collisions (two different schemas declaring one name or member path, a local name reusing an imported one — a nested schema map excepted, which is open and merges), import cycles, two distinct pins for one identity, hash mismatches. Two outcomes sit beside the categories and are no verdict on validity: **refused** — this processor will not supply the schema (not held and not fetched, off its allowlist, a required pin missing, too large) or declined the document under its hygiene policy or limits — and **undetermined** — it could not obtain the schema (nothing at the reference, no answer), so nothing was judged. **Validation errors** are reserved for data checked against a schema that loaded. Parse errors are grammar-level (any directive but `!!id`/`!!import`, a directive out of its header position, `{}` as the schema map, `name {` without an operator, `(T)` one-variant choice, `_` at a type position, a `!C …` or `!I ^ …` form at a type-expression position (`{ e: !enum [A B] }` — name it first), a modifier on a group member, `a: T =? v`, two definition marks, `T ^ { } - { }`, `<…> !I ^ { … }`). A root not tagged `!schema` is no error: it classifies the document as data, so a schema body written as bare `{ … }` reads as a data document. There are no warnings.

## Name hygiene at the schema layer (Part 2 §11.4, Part 1 §8.2)

Beyond the identifier grammar, conforming processors enforce by default (as *policy refusals*, not validity errors): skeleton distinctness (no two names in one scope may be visually confusable — `admin` vs Cyrillic `аdmin`, also pure-ASCII `comer`/`corner`), `Identifier_Status=Allowed` characters only, and a UTS #39 restriction level (default Highly Restrictive over the whole name; per-segment relaxation admits `id_пользователя`). Scopes at this layer: the members of one enum and the field names of one record (group labels included), each under its `name_type`'s profile — a profile's own added characters (`json_name`'s `@` and `$`, a medial space) are exempt from the `Identifier_Status` check and still read by the look-alike and script rules — the declared names of one schema map (the root, and each nested `!schema` map as a scope of its own), and the merged namespace at each `!!import`. The per-name rules reach every segment of a qualified name without a scope. A schema's own identifier-typed values are judged too: a field's default or fixed value, the keys of a value entry's map (`orders => !api { place_order => … }`), a qualified name's segments, an annotation's value. A value typed by an identifier family is a name wherever it stands, so data gains two scopes: the keys of one map keyed by an identifier family (a namespace value's among them), and the elements of one set of one. A `text`-keyed map stays data. A deployment states its identifier and token policies and its limits in the vocabulary `https://tson.io/2026/39/m/policy.tn` declares; no document selects the policy it is judged under. Practical advice for an author: keep names single-script or separate scripts with `_`, and avoid pairs that differ only by `l`/`I`, `O`/`0`, `rn`/`m`.

## Resource limits for schemas (Part 2 §11.5)

A schema is untrusted input wherever it is accepted over the wire or reached through `!!import`. These
limits join Part 1 §9.1's policy on the same terms: every one has a default, MUST be configurable or have
its enforced value documented, MUST report the threshold on refusal, and a refusal is **not a verdict** —
it is reported beside the four error categories, distinguished by the rule that refused. Each is a field of
`policy.limits`.

| Limit | Applies to | Default |
|---|---|---|
| `max_import_closure` | schemas reachable from one header through `!!import` | 64 |
| `max_schema_entries` | declarations in one schema map, nested maps' members, synthetic and instantiation entries included | 65,536 |
| `max_alias_chain` | hops from a use site to a terminal entry | 64 |
| `max_supertype_chain` | length of one type's `chain.supertypes` | 64 |
| `max_materialisation_depth` | nested open synthetics closed for one application | 64 |
| `max_wait_depth` | the longest chain of waits in one document's resolution, an entry waiting on the next being ready | 64 |

The document-side counters of Part 1 §9.1 — nesting depth, token length, document size, total values, and
the rest — apply to a schema document as a document.
