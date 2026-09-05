# Schema grammar reference

Verbatim excerpts from TSON Part 2 §12 (2026 Revision 35): the schema-body ABNF, the disambiguation summary, and the adjacency rules; followed by condensed notes on error categories, name hygiene, and the schema-side resource limits. The header (`!!id`, `!!meta`, `!!import`) is Part 1 grammar; see the tson-data skill's grammar notes.

The schema-document header is defined entirely by [TSON-DATA]'s grammar; this document defines the schema body: `schema-map`, the annotated, braced declaration map that [TSON-DATA]'s `schema-doc` production delegates here. `ws`, `ws1`, `separator`, `token`, `unquoted-token`, `absent`, `annotation`, `field-name`, `record`, `empty-brace`, `identifier`, and `core-value` are imported from [TSON-DATA] §7.3, §7.4, and §7.7; the data grammar's value productions appear at exactly two points — the full `core-value` as the constructor-application payload (`instance`, §5.6), and its braced subset (`record` / `empty-brace`) as the atom-refinement body (`atom-refinement`, §5.5), the same text under two heads, which is the desugar §5.6 states. No production of this grammar uses the full `data-value`: a record-refinement body is a braced `record-def` (§5.7), and a field-modifier value is restricted to a bare token or the absent sentinel (§5.2), never annotations, a type-ref, or a container.

A `schema-map` copies the shape of [TSON-DATA]'s `map` production but requires at least one entry — `{}` at schema-body position is a parse error. An entry is called a **declaration**. Annotations before the opening brace bind to the schema; annotations at the head of an entry bind to the key; annotations after `=>` bind to the type definition (§2.1, §6).

```
; ── Schema Map (schema body) ──────────────────────────────

schema-map       = *( annotation ws ) "{" ws schema-map-entry
                   *( separator schema-map-entry ) ws "}"

schema-map-entry = *( annotation ws ) type-name ws "=>" ws
                   *( annotation ws ) type-def

; ── Type Definition (declaration right-hand side) ─────────

type-def = atom-refinement                ; never parameterised
         / instance
         / [type-params] structural-def
         / [type-params] type-ref
         ; there is no constructor marker: an entry is a
         ; constructor by being IS-A `top` (§4.2), and `~` is
         ; a special token with no role at type-def position

type-params = "<" ws param-name *( separator param-name ) [ ws "," ] ws ">"
param-name  = type-name   ; same lexical class as type-name

structural-def = refined-def
               / construction-def
               / record-def

refined-def  = type-name [ws "<" type-args ">"] ws "^" ws record-def
             ; record refinement, and constructor refinement in
             ; a meta-schema (§5.7, §4.2); the optional <type-args> head serves
             ; user-template heads only (§5.7). No removal clause.

construction-def = supertype-ref 1*(ws "&" ws supertype-ref)
                   [ws record-def] [ws removal-set]
                 / supertype-ref ws "&" ws record-def [ws removal-set]
                 / supertype-ref ws removal-set

supertype-ref = type-name [ws "<" type-args ">"]
              ; composition and subtraction operands are named
              ; type references, optionally with arguments —
              ; never paren, bracket, or map forms (§4.3, §5.8)

removal-set  = "-" ws "{" ws field-name
               *( separator field-name ) [ ws "," ] ws "}"

record-def   = "{" ws [record-entry *(separator record-entry)
               [ ws "," ]] ws "}"
record-entry = field-def / group-def

atom-refinement = "!" type-name ws "^" ws ( record / empty-brace )
                ; atom refinement (§5.5): the constructor's own
                ; constraint bindings — the braced subset of the
                ; core-value payload `instance` takes, read by the
                ; same data grammar; the target MUST resolve to an
                ; atom-family instance (§3.3.1)

instance     = [type-params ws] "!" type-name ws core-value
             ; constructor application (§5.5): the target MUST
             ; resolve to an entry that IS-A `top` (§3.3.1), the
             ; kernel's `reference` included (§5.10). The payload
             ; is a core value — braced bindings or the positional
             ; form (§5.6) — never annotations or directives. With a
             ; parameter list the body is held unread until
             ; materialisation (§5.10); open and closed share one
             ; production and one payload grammar. What no payload
             ; can spell is an application: `box<text>` is schema
             ; grammar, and inside a `!C` payload an application is
             ; written in `type_ref`'s own record form,
             ; `{ name: box  arguments: [ { name: text } ] }`.

; ── Field Definitions ─────────────────────────────────────

field-def      = *annotation field-name ws ":" ws
                 ( field-type field-modifier
                 / field-type
                 / field-modifier )

field-type     = type-ref ["?"]

field-modifier = ws ("~" / "=") ws ( token / absent )
               ; the value is a single scalar token or the
               ; absent sentinel — never a compound value (§5.2)

; ── Field Groups (§5.11) ──────────────────────────────────

group-def    = *annotation "(" ws group-member
               1*( ws "|" ws group-member ) ws ")" ["?"]
group-member = *annotation field-name ws ":" ws type-ref
               ; no "?", no modifier on members

; ── Type References (any type position) ───────────────────

type-ref = paren-type
         / bracket-type
         / map-type
         / type-name "<" type-args ">"
         / type-name

; ── Compound Type Expressions ─────────────────────────────

paren-type = "(" type-ref "|" type-ref *("|" type-ref) ")"   ; choice, 2+ variants

bracket-type = "[" element-type [ ws ";" ws size-spec ] [ ws "," ] ws "]"  ; array
             / "[" element-type 1*(separator element-type) [ ws "," ] "]"  ; tuple
             ; a comma may follow the last element ([TSON-DATA] §2.4),
             ; here as in data: `[text, int32, ]` is legal

map-type     = "{" ws map-key ws "=>" ws element-type
               [ ws ";" ws size-spec ] ws "}"                            ; map sugar (§5.3)

map-key      = type-name [ "<" type-args ">" ]
             ; a simple ref, optionally with arguments — never
             ; paren, bracket, or map forms (§5.3)

element-type = type-ref [ "?" ]
             ; nesting is this recursion: [[T; N]; N] and
             ; {text => [order; 1..]} work by the same rule
             ; that makes [[T]] work

size-spec    = size-bound [ ws ".." ws [ size-bound ] ]
             / ".." ws size-bound
             ; a size-bound is decimal-natural or, within a
             ; template body, a value-parameter name (§5.3)

; One production per container, at every position: an
; element's "?" belongs to element-type inside the brackets,
; and a field's own "?" to field-type, so "xs: [T?]?" is
; unambiguous — element optional, field optional.

; ── Terminals ─────────────────────────────────────────────

type-args  = type-arg *(separator type-arg) [ ws "," ]
           ; separator = ws "," ws / ws1; a comma may follow the
           ; last argument, so `pair<uuid, B, >` is legal (§2.4)
type-arg   = type-ref / value-literal
value-literal = token
           ; a single scalar lexeme: a number, quoted string,
           ; or other non-name token. An unquoted token that
           ; satisfies identifier (`true` and `false` included)
           ; parses as a type-ref; it is substituted as a token and read
           ; by the position it lands in (§5.10), so a name
           ; reaching an enum's member list is a member and
           ; one reaching a type slot must resolve as a type.
size-bound = unquoted-token
           ; text MUST match the decimal-natural production
           ; of [TSON-DATA] §7.6 or, within a template body,
           ; be a value-parameter name (§5.3)
type-name  = identifier
           ; [TSON-DATA] §7.7: an unquoted token whose decoded
           ; text matches the identifier grammar — XID_Start-
           ; initial, so no name begins with a digit, a sign, or
           ; a dot, which is what makes numbers undeclarable
           ; (param-name shares the rule, as do every referenced
           ; name and every `!` head). A token in name position
           ; that fails the grammar is a parse error. The
           ; field-name production is lexical and admits a quoted
           ; spelling, but a declared field name — in field-def,
           ; group-member, and removal-set — MUST likewise match
           ; identifier after decoding; failure is a parse error.
           ; Resolver-materialised instantiation and synthetic
           ; entries (§8.2) carry internal names in this same
           ; class; the resolver keeps them disjoint from
           ; declared names by construction (freshness, §8.2),
           ; and they are unreachable from source because they
           ; do not exist at source level.
```

Notes:

- The `type-params` slot declares type parameters (§5.10); parameters take precedence over schema-namespace lookup, and references to a parameterized type MUST supply matching type arguments.
- `paren-type` produces choice types; choices require at least two variants — `(T)` is a parse error.
- `group-def` produces field groups (§5.11); a group requires at least two members. Inside a record body, `(` at entry position (after any leading annotations) opens a group; `(` after a `field-name ":"` opens a `paren-type`. The two never collide — a group is an entry, a choice is a type-ref. The `?` after the closing `)` sets the group's state; member positions reject `?` and modifiers by grammar.
- The `?` suffix marks field-level, tuple-position-level, array-element-level, or group-level optionality and is valid only in those positions, recording `state: OPTIONAL` on the containing `record_field`, `tuple_element`, `array`, or `field_group`. There is no generic "optional type" in TSON.
- `type-def` reaches the bracket and map forms through `type-ref` like any other position; there is no separate declaration-level container production, and no positional restriction on size specifiers or element/position `?` (§5.3).
- `instance` is decidable on one token after the optional parameter list: `!` opens an `instance`, with or without a preceding `<…>`; `<` only ever starts `type-params`, so consuming it first costs no lookahead. Inside the `!` branch a following `^` separates `atom-refinement` from `instance`; `atom-refinement` admits no parameter list — a parameterised refinement of an atom instance is no form (§5.10), and `<…> ! name ^` is a parse error.
- The trailing record-def in `construction-def` is optional (`customer => address & contact` is valid). When a `{` follows a `&`-chain, it always belongs to the construction's record-def.
- The refined-def target and every `supertype-ref` operand are restricted to a bare type-name, optionally with type-args; inline structural forms cannot precede `^`, `&`, or `-` by grammar (§4.3). A `^` whose resolved target has no refinable body (a choice, for example) is a resolver error reported with the target's kind.
- The removal clause attaches to construction heads only; a refinement head admits none — `T ^ { ... } - { ... }` is a parse error (§5.7, §5.9).
- After a bare type-ref in type-def position, `{` is a parse error; the diagnostic SHOULD suggest `^` (refinement) or `&` (composition).
- Parameters and type arguments inside `<>` alike separate by comma or whitespace — the general separator convention ([TSON-DATA] §7.4): `<T, MIN>` and `<T MIN>`, `map<text, integer>` and `map<text integer>` are all valid.
- `_` is not valid in type-ref or type-def body positions (§7.6); empty records use `{}`.


### 12.2 Disambiguation Summary

This section is informative.

```
; schema body (after the header):
;   @              → annotation; before "{" it binds to the schema,
;                    inside the braces to the entry key (name) or,
;                    after "=>", to the type definition
;   {              → schema map opens
;   name =>        → declaration (two-token lookahead)
;   }              → schema map closes; end of document
;   anything else  → parse error
;
; type-def position (after =>):
;   <              → type-params; then dispatch continues:
;     !              → instance, held open (§5.10)
;     otherwise      → templated structural-def / type-ref
;   ! name ^       → atom refinement (§5.5)
;   ! name         → constructor application (§5.5)
;   name ^         → refined-def (§5.7)
;   name &         → construction-def (composition, §5.8)
;   name -         → construction-def (subtraction, §5.9)
;   name {         → parse error (write ^ or &)
;   {              → brace form; consume "{" and dispatch on
;                    content (reusing [TSON-DATA] §2.8's
;                    consume-one-then-inspect machinery):
;     "}"            → empty record ({}, top's shape)
;     "("            → record-def (leading field group)
;     "@"            → record-def (annotations precede field
;                      names, §6; the map sugar admits no
;                      interior annotations, §5.3, so "@"
;                      commits to a record)
;     name ":"       → record-def (field)
;     name "=>"      → map-type
;     name "<"       → map-type (generic key; consume the
;                      arguments, expect "=>")
;     name (other)   → parse error
;   (              → paren-type (choice)
;   [              → bracket-type (array or tuple, full syntax)
;   name ? / name  → type-ref
;
; type-ref position (field types, array elements, etc.):
;   (              → paren-type (choice)
;   [              → bracket-type (full syntax at every position)
;   {              → map-type: "{" name … "=>" required;
;                    "{" name ":" remains a parse error — bare
;                    records must be declared (§5.2); the
;                    diagnostic SHOULD say so and distinguish
;                    the two brace meanings
;   name <         → generic
;   name ? / name  → simple ref
;
; record-def entry position (after leading annotations):
;   (              → group-def (field group, §5.11)
;   name ":"       → field-def
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

Each case in the type-def block is decided by at most two tokens of lookahead at the start of the production — the brace form by one consumed token plus one token of lookahead, the same budget in the same sense as the data grammar's §2.8 dispatch; inside a bracket form, the choice between tuple, sized array, and unconstrained array is made by one-token lookahead after the complete preceding element type. A `field-type` can itself be nested (`(email | [phone])?`) and parses without backtracking via the disambiguation above; the outer `?` there is field optionality (§5.2). The schema body requires at most two tokens of lookahead to detect a declaration boundary. The parser never backtracks at any level.


### 12.3 Adjacency Rules

The following rows extend the adjacency table of [TSON-DATA] §7.5 for the operators of the type-definition grammar; as there, the rules are enforced by the parser via source-position comparison.

| Operator | Type | Context | Rule |
|---|---|---|---|
| `!` | prefix | type-def body (constructor application, atom refinement) | MUST be adjacent to the following unquoted-token (constructor or instance name) |
| `?` | suffix | field type, tuple position, array/map element (element-type, §5.3), field group | MUST be adjacent to the preceding token (type name or closing bracket/paren) |
| `&` | binary | composition | whitespace on either side optional |
| `^` | binary | refinement (§5.5, §5.7) | whitespace on either side optional |
| `-` | prefix | removal clause (§5.9) | at least one whitespace character MUST separate the preceding token from `-`; whitespace optional before the following `{` |
| `~` | modifier | field default value (`port: integer ~ 8080`) — its only role in the grammar | whitespace optional |
| `=` | modifier | fixed value | whitespace optional |
| `\|` | separator | choice variant; field-group member | whitespace optional |
| `;` | separator | array size spec; map size spec (§5.3) | whitespace optional |
| `..` | binary | size-spec range (§5.3) | whitespace on either side optional |
| `=>` | separator | schema declaration; data map entry; map type sugar (§5.3) | whitespace optional (compound token from lexer) |

The whitespace requirement before removal `-` is a lexer fact restated as a rule: hyphen-minus continues an unquoted token ([TSON-DATA] §7.2.4 — hyphenated names are legal), so in `account- { password }` the hyphen is absorbed into `account-` and no removal clause exists — the same footgun class as `[1-2]` lexing as one token. When a token ending in `-` appears at a type-def position followed by `{`, the diagnostic SHOULD note the absorbed hyphen and suggest whitespace before `-`.



## Error categories at the schema layer (Part 2 §1.3, Part 1 §8.1)

Everything that makes a schema fail to load is a **resolver error**, however value-like the rule: unresolved names, unknown facet members, incoherent bounds, invalid defaults, refuted `@disjoint`, unproductive recursion, unused or shadowing parameters, an entry that IS-A `top` declared by a schema whose `!!meta` is not the meta-kernel, a failed `@discriminator` or `@rest` check, import collisions or cycles, hash mismatches. **Validation errors** are reserved for data checked against a schema that loaded. Parse errors are grammar-level (`name {` without an operator, `(T)` one-variant choice, `[text,]`, `_` at a type position, `?` or a modifier on a group member, `T ^ { } - { }`). There are no warnings.

## Name hygiene at the schema layer (Part 2 §11.4, Part 1 §8.2)

Beyond the identifier grammar, conforming processors enforce by default (as *policy refusals*, not validity errors): skeleton distinctness (no two names in one scope may be visually confusable — `admin` vs Cyrillic `аdmin`, also pure-ASCII `comer`/`corner`), `Identifier_Status=Allowed` characters only, and a UTS #39 restriction level (default Highly Restrictive over the whole name; per-segment relaxation admits `id_пользователя`). Scopes at this layer: the members of one enum, the declared names of one schema, and the merged namespace at each `!!import`. Practical advice for an author: keep names single-script or separate scripts with `_`, and avoid pairs that differ only by `l`/`I`, `O`/`0`, `rn`/`m`.

## Resource limits for schemas (Part 2 §11.5)

A schema is untrusted input wherever it is accepted over the wire or reached through `!!import`. These
limits join Part 1 §9.1's policy on the same terms: every one has a default, MUST be configurable or have
its enforced value documented, MUST report the threshold on refusal, and a refusal is **not a verdict** —
it is reported beside the four error categories, distinguished by the rule that refused.

| Limit | Default |
|---|---|
| import closure (schemas reachable from one header) | 64 |
| entries in one schema map | 65,536 |
| reference chain length | 64 |
| supertype chain length | 64 |
| template materialisation depth | 64 |

The document-side counters of Part 1 §9.1 — nesting depth, token length, document size, total values, and
the rest — apply to a schema document as a document.
