---
title: "One level: schemas without the meta ladder"
description: "Removes revision 38's meta ladder (!!meta as a rung, meta layers, placement, the import-level rule) in favour of one namespace per schema, a computed resolution order with a single cycle rule, one header directive, value entries of ordinary types and one reference atom. Its eight-step order of work landed in revision 39, with the kernel-namespace step built differently and extern deferred."
against: "TSON 2026 Revision 38 (Working Draft)"
status: "Landed in Revision 39; step 7 built differently, one sub-step partly done, one deferred"
id: "CR-one-level"
---

# One level: schemas without the meta ladder

**Status: landed in Revision 39, step 7 differently from proposed, one sub-step partly done and one deferred.**
- **Proposed:** remove Revision 38's meta ladder (`!!meta` as a rung, meta layers, placement, direction of service, the
  import-level rule), replacing it with one namespace per schema, a computed resolution order with one cycle rule,
  one header directive, value entries of ordinary types, one reference atom, the kernel's machinery under its own
  names, and facets typed by their instances.
- **What happened:** steps 1 to 8 of the order of work all landed on the Revision 39 proposal branch, step 3 being the
  planned drop of the construction operator. Step 7 was built differently: the kernel's maps are open, every name
  resolves from the root, and synthetics mint at the root. Sub-step 5f is partly done (a resolved form is still read
  under its source's imports), and 5h, `extern`, is deferred.
- **Where it landed:** [TSON-SCHEMA] §2.2, §3.3, §3.4, §4.1, §4.2, §5.12, §7.8, §8.1, §11.5, §12.1 and [TSON-DATA]
  §2.2, §3.3, §7.4, in [SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md) to [#17](../SPEC-FEEDBACK.md); #18 to #20 and #22
  were found while the steps landed, and #21 is dependent fields. "Order of work, as landed" gives each step's entries.

The sections from "Verdict" to "The reference atom" are the report on Revision 38 and the design as decided before
any of it was built; where the built design differs, a marked **As built** note says so where the claim is made. The
measurements of Revision 38 come from two probes over Revision 38 on the first implementation, which pin every outcome
quoted here.

Companion notes: [`slots.md`](slots.md) reads the same design through Self's and Newspeak's slots, as a language
designer would, and [`computation.md`](computation.md) keeps some future-dreaming about computation that sits beside
TSON without entering it. [`identity.md`](identity.md) is a research map for identity and delegation, for agents acting
on people's behalf. [`construction-operator.md`](construction-operator.md) proposed `c <- { … }` and is dropped:
`!T { … }` is an instance of `T`, and `^` refining any value under its type's rules is
[SPEC-FEEDBACK.md #5](../SPEC-FEEDBACK.md). [`dependent-fields.md`](dependent-fields.md) is `sibling!`, a feature the
model admits and the ladder can carry, and [`typed-facets.md`](typed-facets.md) retires `value` from `meta.tn`'s facets
once one level lets a constructor and its instance share a document; [`kernel-namespace.md`](kernel-namespace.md) puts
the kernel's declarations under one entry, `meta`, so an importing schema reserves one name (as built, six maps);
[`reference.md`](reference.md) is the syntax of "The reference atom" below, the qualified name with its arguments as
one grammar and the atom's value. All four are kept out of this note. The API and agent sketches below came from
private experiments built on Revision 38; what is kept of them is the design reasoning.

**Revision 38 took one step of this inside the ladder.** It has no `data` kind: `namespace` is a constructor under
`top` whose instances are maps (§4.1), so a governed schema's entry may hold a value, written as the bare map and walked
as `orders.get`. That is this note's "entries are types or values" step, confined to namespaces.

## Verdict

**Design rule: correctness over churn.** TSON has no users yet, and its base is meant to last for generations. A
rewrite of the spec and of every implementation is an acceptable price for a more correct base, so nothing in this note
is weighed by how much it changes: re-pinning every meta layer, rewriting the corpus, and redoing the resolver all count
for nothing against a rule that is more correct.

**Under that rule, one level is warranted:**
- **One checked rule replaces five that leaked.** Visibility, placement, direction of service and the meta-as-import
  cycle check held the ladder up (measured below), and an import across levels went through all four, so Revision 38
  added a fifth, the level of an import (§2.2.3). Read-defer-resolve with a cycle check is one rule, and it is checked.
- **The bootstrap becomes an instance of the rule.** The kernel's shape loop, `record` described by a `!record`, is
  the one cycle closed by hand, by pre-loading, and its resolved form is the fixed point, instead of being an
  exception four rules carve out.
- **A value entry needs no mark of its own.** Revision 38 lets a governed schema's entry hold a value only as a
  namespace map, since a namespace type is the one constructor whose instances are not types (§4.1). One level lets an
  entry be a value of any ordinary type, which the kind system already tells from a type ("Entries are types or
  values").
- **A constructor and its instance can share a document.** `decimal_type` and `number` sit together, as
  `integer_type` and `integer` already do in the kernel, which is what lets `meta.tn`'s `value`-typed facets be typed
  by the atoms they bound ([`typed-facets.md`](typed-facets.md), a feature this enables).
- **The fixture check gets stronger.** A resolved form trusts only the pre-loaded kernel.
- **The reference vocabulary converges.** `kind_type`, `ref_type` and the name-only `type_ref` are one atom over a
  qualified name, kept apart only because `of` resolves in two stores; under the ladder `ref<T>` is dead at the level
  data lives and the `members` index names the wrong level's types ("The reference atom", below).
- **Explicitness survives at a finer grain.** The header used to say a document *may* declare constructors; each entry
  now says it *is* one, by composing `top`. A data document still declares nothing, and a document's kind is still in
  its header. **As built:** a document's kind is in its root's tag, `!schema` for a schema, read with the header and
  before any value ([SPEC-FEEDBACK.md #8](../SPEC-FEEDBACK.md)).

**Two features one level enables are kept out of it.** `sibling!` ([`dependent-fields.md`](dependent-fields.md))
reads a field against a type its sibling names: a value waiting on a shape, which the model below already orders, plus
one edge inside a record instance that the model does not need and that note adds; it lands under the ladder, on its
own. Typed facets ([`typed-facets.md`](typed-facets.md)) retire `value` from `meta.tn` once a constructor and its
instance share a document, and add an edge between values that the model below does not state.

**So it is one revision, in eight ordered steps.** An earlier draft split it in two, because two of the deletions
carried correctness questions of their own, who may extend the kernel and which names a schema may use, and landing
them beside the dependency model would have hidden which decision moved a fixture. Both are decided on paper
("Decisions before the ladder goes"), so the reason is gone, and one revision never publishes the intermediate state,
`<-` and `namespace` under `type` beside a ladder the next revision would delete. The order of the steps is a work
order on the proposal branch ("Order of work, as landed"), not a publication boundary.

**The correctness work is the dependency model** ("The dependency model: shape and value", below): what an entry's
reading may wait on, and what counts as a cycle. Everything else in this note rides on that definition, and it is
specified, and proved on the kernel, before anything is removed.

**Under a rule weighted by cost, the verdict would differ.** Most of the problems that motivated this have local
fixes: namespaces became a constructor inside the ladder (Revision 38), and the host-shape gap is a bug fix. That is
recorded so the rule stays visible as the reason for the verdict, and so the verdict is revisited if the rule ever
changes.

## The question

Within schemas, TSON has a ladder: a schema is governed by a meta layer, a meta layer by the meta-kernel, and only a
kernel-governed document may declare a constructor. Suppose the ladder goes:
- the meta-kernel stays self-referencing;
- every schema imports it;
- a constructor and its instances can sit in one document;
- the resolver works out the order to resolve things in, instead of the author declaring it with levels.

What does that remove, and what does it cost? The part that is hard is that a body can't be read until the declaration
it is an instance of has been resolved. That is a type depending on a term in the same scope.

**Scope: the schema level only.** Data governed by a schema stays, and stays a separation worth keeping. The ladder
that goes is the one between schemas: `!!meta` as a rung, meta layers, and placement. A schema then has to identify
itself some other way, and the `-resolved.tn` forms, which today prove the resolver isn't drifting, have to survive.

Then three threads this note pulls on:
- whether the data/schema line, which consumers of Revision 38 treat as fixed, blurs as well;
- how an API description and its HTTP routes combine with the schema records they name;
- how an agent's plan sits in that picture.

## The ladder today, measured

The probe's constructor is a namespace type, `steps => namespace & { key_type: = identifier  value_type: = step }`, the
shape every meta layer's vocabulary has.

| case | outcome on Revision 38 |
|---|---|
| constructor declared in a meta layer, applied in a schema it governs | resolves |
| a meta layer applying its own constructor | refused: "'!steps' does not resolve against the structure namespace" (§3.3.1) |
| an ordinary schema declaring `steps => namespace & { … }` | refused: "supertype 'namespace' names no type this schema declares or imports" |
| an ordinary schema importing the kernel, with core or declaring a constructor | refused at the import: "an !!import stands at the importer's governing level" (§2.2.3), before core's `void` collides or placement (§2.2.2) is reached |
| a schema whose `!!meta` names itself, declaring only types | refused: "is part of an import cycle" ([TSON-DATA] §2.2.3) |
| in one governed schema, an instance naming a type declared beside it | resolves; a kind slot naming the namespace value beside it is refused: "'s' is a value of the namespace type 'steps', a map of names -- a value and not a type" |

**What the table shows:**
- **Separate mechanisms hold one ladder up:**
    - visibility: the kernel's names aren't in an ordinary schema's namespace, so `namespace` is simply undeclared;
    - placement: a constructor may be declared only under the kernel;
    - direction of service: a schema's `!` targets come from its meta, never from its own entries;
    - the import-cycle rule, which counts `!!meta` as an edge;
    - and a fifth, the import's level (§2.2.3): an ordinary schema imports no kernel-governed one, so the kernel's names
      never reach it and placement is reached by no loaded document.
- **The kernel escapes the first four by being pre-loaded.** Its own doc says so: "the circularity is closed by
  pre-loading rather than by resolution". §2.2.2's "when a schema is its own meta, the two namespaces are the same
  entry set" is true only for the one document that is pre-loaded.
- **Ordering is already solved inside one document for types.** An instance naming a type declared beside it resolves,
  and so do recursive types. The ladder only constrains *constructors*.

## What collapsing it would remove

**From a service vocabulary built on Revision 38:**
- **The two-file split for an API.** A vocabulary for describing HTTP services (`operation`, `http_verb`,
  `status_code`, `path_template`) had to be a meta layer, separate from the descriptions that use it, because its
  constructors may only be declared under the kernel. With one level it is an ordinary library declaring `operation`
  as an ordinary record type beside `http_verb`, `status_code` and `path_template`, and an API description imports it
  like any other schema, with no `!!meta` between them. No kernel extension is involved (see "Entries are types or
  values").
- **The supporting vocabulary inside the meta layer.** It is declared in the layer because of levels: a meta layer
  imports no ordinary library (§2.2.3). Under one level the rule is withdrawn and the vocabulary returns to an ordinary
  library.

**From the kernel, `meta.tn`, `core.tn`, and the spec:**
- the placement rule (§2.2.2);
- the direction-of-service rule (§3.3.1's split between the structure namespace and the type namespace);
- the import-level rule (§2.2.3);
- the pre-loading special case: pre-loading becomes the general bootstrap, the kernel being the one document whose
  read-dependency cycle is closed by hand;
- **sibling duplication** (§3.3.5, §5.10): `core.tn` no longer redeclares fresh siblings of the kernel's `void`,
  `boolean`, `integer`, `text`, `regex`, `iri`, `kind` and `doc`, nor of `meta.tn`'s `set`, and §5.10's rule that two
  same-named entries with the same resolved body are one type when parameter types are compared is deleted;
- **`value_type` and `value`** (§4.2, §7.4): out of `meta.tn`'s facets once a constructor and its instance share a
  document ([`typed-facets.md`](typed-facets.md)), and out of `type_argument`, which goes with `type_ref` when the
  reference atom's value carries the application ([`reference.md`](reference.md)); `record_field.value` and
  `record_template_field.value` keep it until dependent fields land, and then nothing in the kernel names it.
  **As built:** both are deleted. The facets are typed by their instances
  ([SPEC-FEEDBACK.md #17](../SPEC-FEEDBACK.md)), and the two field slots are `value?: type!`, typed by the field's own
  `type` ([SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md)).

Namespaces are not on this list: Revision 38 made `namespace` a constructor whose instances are maps, inside the
ladder, and one level keeps it ("Namespaces stay a constructor", below).

**What stays:** the kind checks. A kind slot refusing an instance declared beside it is already one-document behaviour.

## The proposal

### One namespace per schema

- A schema's namespace is its own entries plus its imports'. `!` targets resolve in that same namespace. An entry's
  `!T` names either a constructor, making the entry a type, or an ordinary type, making it a value.
- `!!meta` stops being a rung. A schema that wants the kernel imports it, which is what `meta.tn` already does
  (`!!import` of the kernel beside its `!!meta`). What still has to say "this is a schema" is below, under "How a
  schema identifies itself".
- `core.tn` imports `meta.tn` (which imports the kernel) instead of redeclaring `void`, `boolean`, `integer`, `text`,
  `regex`, `iri`, `set`, `kind`, and `doc`. A user schema then imports `core.tn` and gets the entire vocabulary once,
  with one canonical identity per type.

**As built** ([SPEC-FEEDBACK.md #7](../SPEC-FEEDBACK.md)): one namespace per schema, every name resolving there,
transitively. The kernel and `meta.tn` became one document, `meta.tn`; numeric.tn, temporal.tn and net.tn each import
it alone, and `core.tn` imports those three and redeclares none of the kernel's names.

### Two kinds of dependency

| | example | cycles |
|---|---|---|
| **link** | `order => { items: [line] }`: a name at a type position | fine: recursive types; linked after everything is declared |
| **read** | `get => !operation { … }`: a body whose reader *is* a declaration | an error, except the kernel's own, closed by pre-loading |

Today's levels are a coarse, declared ordering that guarantees every read dependency points into another document.
That's the same move as GHC's Template Haskell stage restriction, where a splice may run only code from an imported
module, and Racket's phase levels (Flatt 2002), where a module's dependencies are declared per phase. One level
computes the ordering instead, and the next section says exactly what is ordered.

### The dependency model: shape and value

**As built** ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md)): the model below landed as seven rules worded as an entry
being *ready* and a read *waiting*, rather than as shape and value. Reading a value against a type waits on that type
and on each type the read reaches; a declaration waits on its head, its refinement source and its `&` operands. A name
at a `meta.type_ref` or `meta.ref<T>` slot orders nothing, and neither does a held value (a default, a pin, a
dependent field, a template body), which is judged once every entry is ready, still at load. Cycles, order
independence and the kernel's pre-loaded cycle are as below.

**The central definition.** A read dependency is never on a whole entry. Reading a value needs its type's **shape**,
never the type's **values**. Splitting each entry into the two, and stating which waits on which, is what lets the
cycle check refuse exactly the unsound schemas: without the split it either refuses sound ones or admits unsound ones.

**Shape** is what a reader needs to read a value of the type:

| entry | its shape |
|---|---|
| a type built by a constructor (`order => { … }`, `!integer_type { … }`) | its constructor; field names, field types as names, optional and voidable marks, groups; key, element and value types; parents; family selectors and their pins |
| a constructor (an entry composing `top`) | the shape of its instances: it is a record type whose values are entries |
| a template | its parameters and its open body's shape |
| an application | its template's shape with the arguments, as names, substituted |
| an alias | its target's shape |
| a value entry (`create_order => !operation { … }`) | none: it is not a type |

**Values** are everything read *against* a shape: a value entry's payload, a field's default or pin (`~ v`, `= v`),
an annotation's value.

**Edges:**
- **shape → shape (read).** An entry's declaration is an instance of a constructor `C`: its shape waits on `C`'s shape,
  including constructors tagged inside the declaration. An alias waits on its target's shape, an application on its
  template's.
- **value → shape (read).** A value waits on the shape of the type it is read against.
- **names (link).** A type name inside a shape (a field's type, an argument, a pinned kind-typed sibling) is a link. It
  orders nothing, which is why recursive types and mutual constructor/instance pairs (`decimal_type` and `number`) are
  sound.

**The invariant: a shape never waits on a value.** Values are leaves of the entry-level graph, so an entry cycle can
only run through shapes, and every value can be read once the shapes are closed. One case looks as if it breaks the
invariant, and is held to it by a rule that already exists:
- **A family selector's pins are part of the base's shape,** since dispatch reads them. §5.2 already confines a selector
  to an atom or an enum, whose shapes never wait on a user value, so the pins are read with readers that are always
  closed.

A dependent field adds one edge inside a record instance and a second such case, the pinned dependent field;
[`dependent-fields.md`](dependent-fields.md) states both and shows the invariant holds.

**Which side a facet falls on is mechanical.** A constructor's facets need no hand assignment, because the side
follows from the facet field's type and from who reads it:
- a facet typed `type_kind` or `type_ref` (`record_field.type`, `array.element_type`) is a **link**, and orders nothing,
  which is why `tree => { t: tree }` is sound;
- a facet dispatch reads (a family selector's pins) is **shape**, held to the invariant by §5.2 as above;
- every other facet is a **value**, read against the facet field's type.

That last line is where closure has two stages, and the stages must not be confused. A type's **shape** closes when its
shape → shape edges do, and a link never delays it: `decimal_type => atom & { min?: decimal … }` closes on the kernel's
`record` alone, and `decimal => decimal_type <- {}` on `decimal_type`, the field type `decimal` being a name. A type's
**reader** closes later: an atom's reader is its constructor's host parser, linked to the constructor and ready as soon
as the shape is, plus its facet checks, and a facet check needs its facet value read by the reader of the facet's type.
Reading `min: 0.00` on `money => decimal <- { min: 0.00 }` waits on `decimal`'s reader, which is the parser plus the
checks from `{}`, none. The chain stops at a base instance because a base instance carries no facets, and every base
instance in the kernel is one (`integer => integer_type <- {}`). A reader may wait on a reader, so reader closure has
its own cycle, between values; [`typed-facets.md`](typed-facets.md) states the edge and the refusal, and the kernel's
`integer_type.min: integer` is on no such cycle.

**A cycle is a cycle of shape → shape edges,** refused naming the entries on it. The kernel is the one exception: the
shape of `record` is described by a `!record`, and that cycle is closed by pre-loading the kernel's shapes.

| declaration | edges | verdict |
|---|---|---|
| `point => { x: int32  next?: point = { x: 1 } }` | the default (a value) → shape of `point` | sound: a default never makes a cycle |
| `frame => { origin: point = { x: 0  y: 0 } }`, `point` declared after it | value → shape of `point` | sound: order of declaration is irrelevant |
| `decimal_type => atom & { min?: number … }`, `number => !decimal_type {}` | `decimal_type` links `number`; `number`'s shape → `decimal_type`'s shape | sound: `decimal_type`'s shape is a kernel `record` |
| `step => top & { takes: type_kind }`, then `s => !step { takes: order }` | shape of `step` → kernel `record`; `s`'s value → shape of `step` | sound |
| `a => b`, `b => a` | shape of `a` → shape of `b` → shape of `a` | cycle: refused |
| `c1 => !c2 { … }`, `c2 => !c1 { … }` | shape of `c1` → shape of `c2` → shape of `c1` | cycle: refused |

**As built:** an alias loop (`a => b`, `b => a`) is not a wait cycle; §8.3 refuses an alias chain with no terminal.
A composition cycle (`a => b & {}`, `b => a & {}`) is the wait rule's.

**What the model guarantees:**
- **Termination.** Shapes are finite and acyclic apart from the kernel, values are leaves, and nothing computes.
  Template expansion is the one place a bound must be stated (open below). **As built:** it needs no new bound;
  §5.10.1's regular recursion and §11.5's materialisation depth bound it.
- **Order independence.** The result doesn't depend on the order entries are written in. This is the property that lets
  a resolved form be read without any order asked of it.
- **One algorithm.** A schema's source, its resolved form and an agent plan are read by the same rule over different
  pre-loaded sets.

**The proof obligation.** The model is proved on the kernel before anything else changes: `meta-kernel-resolved.tn`,
read by this algorithm over the pre-loaded kernel shapes, must describe that kernel exactly. A kernel that isn't a fixed
point under the model means the model is wrong, not the kernel.

### Resolution in passes: read, defer, resolve

No order is asked of the author, or of any output. Where `!T { … }` is met and `T` isn't resolved yet, its AST is
read and held, and it isn't processed until `T` is resolved:

1. **Read.** Every entry is read to its AST. TSON reads any body without a schema, so nothing has to be resolved
   first. Each `!T` met, at an entry's head or nested inside its body (`!response` inside an `!operation`), is
   recorded as an edge, shape or value as the model above assigns it.
2. **Shapes: defer and resolve.** A shape whose shape edges are all resolved is processed and its reader compiled.
   Processing one can release others waiting on it. Repeat until nothing changes.
3. **Fail on what is left.** A shape still waiting when nothing more can be released is on a cycle, or waits on one.
   That fails the compile, naming the cycle: "'step' waits on 'step'". The kernel's own cycle is the one exception,
   closed by pre-loading.
4. **Facts over the closure:** chains, `subtypes`, a kind's `members`, family discriminators (§3.3.4). These need
   every shape and no value.
5. **Values.** Every value is read against its now-closed shape: value entries' payloads, defaults and pins,
   annotation values. Then kind slots are judged for membership, and references resolved. Nothing here can wait on a
   shape, because all shapes are closed.

**As built** ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md)): the first implementation makes an entry ready on demand,
the first time anything asks for it, rather than in passes; a read that reaches an entry not yet ready makes it ready
first, then starts over. The verdict and output are the passes', and source order is not consulted (a test resolves
each bundled schema shuffled and gets the same output). A cycle is refused naming its entries in wait order:
"'a' waits on 'b' waits on 'a'".

**"Partially where required"** is step 2 doing only what is needed, on shapes alone. A kind's membership needs every
entry's kind, and an entry's kind comes from its head (`!operation`), which is known once the AST is read. So
`kind<operation>` can be judged without any operation's body having been processed, and judgement never waits on
itself.

**This is the same algorithm wherever it runs.** A schema's own source, its resolved form (below) and an agent plan are
all read this way. The only difference is what is pre-loaded: the kernel for a schema and a resolved form, the
kernel plus the interface for a plan.

**Why the dependent part stays manageable:**
- **The phase distinction holds between entries.** The dependency is on *declarations*, and the only reduction is
  substitution.
- **No term-level computation.** `Type : Type` is dangerous where types contain functions: Girard's paradox builds a
  term that never normalises from λ, Π and `Type : Type` alone, with no recursion needed. Cardelli's polymorphic
  λ-calculus with `Type : Type` is a sound programming language but inconsistent as a logic, and its type checking is
  undecidable, because deciding type equality may need evaluation that doesn't terminate. TSON has no term-level
  functions, so self-description (the kernel's `record` described by a `!record`) can't loop through evaluation.
- **Termination narrows to template expansion,** the one type-level reduction: a template is a function over types,
  and expanding it is beta-reduction. It has to be bounded with or without levels, and is, by §5.10.1's
  regular-recursion rule.

### Prior art

The design corresponds to well-studied work in programming languages and type theory. These are analogies, naming what
the design borrows and where it stops, not foundations it rests on:

- **One reflexive loop instead of a regress (ObjVLisp).** Smalltalk-80's metaclasses stack a class on a metaclass on
  `Metaclass`; ObjVLisp (Cointe 1987) ends the regress with one loop, `Class` an instance of itself. The kernel is that
  loop: `record` is described by a `!record`, the one cycle closed by hand.
- **Strict metamodelling and the clabject (Atkinson and Kühne).** The ladder is strict metamodelling, as in OMG MOF's
  four layers, where every element is an instance of exactly one element one level up. Atkinson and Kühne's deep
  instantiation drops the fixed levels, and their *clabject*, an element that is at once an instance and a type, is what
  `integer` is: an instance of `integer_type`, and the type of integer values. One level is that move, inside one
  namespace.
- **Prototypes and lattices (Self, CUE).** Self (Ungar and Smith) has no classes: an object is a clone of a prototype
  with slots changed, which is how a refinement reads (`slots.md`, which also takes Newspeak's module model, not its
  class-based object model). CUE (van Lohuizen) puts types and values in one lattice, unification being meet. TSON's
  `&` and `^` act like meet among types (`integer` to `uint8` narrows facets), but TSON keeps two lines CUE erases: a
  schema exports a namespace and data doesn't, and applying a constructor isn't narrowing. `!integer_type {}` transfers
  kind, not supertypes (§4.1), so `integer_type`'s instances are types and `integer`'s are values, which is the
  boundary the kind rules stand on.
- **A value carrying its type (Abadi, Cardelli, Pierce and Plotkin).** `scoped` (`dynamic`, `declared`, `extern`,
  §7.8) is their `Dynamic` (1991): a dependent pair `Σ (T : Type). T` whose type component is visible, so the value is
  checked in full against the `!T` it names, and `scoped` narrows `T` to the types of the namespaces it admits. Under
  one directive only `declared` survives of it ("The scope push goes"), the pair's `T` drawn from one closure. It is
  not an existential package (Mitchell and Plotkin), which hides `T`, and not gradual typing's `?` (Siek and Taha),
  which defers checks to casts: nothing at a scoped slot is admitted unchecked.
- **The phase distinction (Harper, Mitchell and Moggi).** Their phase distinction keeps a module's static part from
  depending on its dynamic part, and "a shape never waits on a value" is that rule between entries.
- **Checking, not inference (Pierce and Turner).** Bidirectional typing separates checking a term against a known type
  from synthesising one. Values here have only the checking direction: a value is read against a closed shape, and
  nothing about a shape is inferred from a value.
- **Total by design (Dhall).** Dhall, roughly System Fω without general recursion, terminates by construction rather
  than by a check. TSON has no term-level functions at all, and bounds its one type-level reduction by a rule.

### Typed template bodies: open, and in neither revision

`template => top & { parameters: [template_param]  template: text }` holds a body as text, and §5.10 says why: a
parameter stands wherever a token stands, so `min_items: N` is not a value of any constructor's record shape until it
closes. A typed body would need:
- **every slot of every constructor widened** to accept a concrete value of its type or a parameter reference. That
  changes every constructor's reader, and the one-spelling rule and open-synthetic identity (§5.10, §8.2) would be
  restated over the typed form;
- **for a declaration-time guarantee, reasoning over parameter ranges.** Proving
  `<N: int8> !integer_type { min: N  max: 200 }` sound for every argument before application means proving that the
  value set of `int8` (`[-128, 127]`) lies at or below `200`: refinement subtyping, which Liquid Types and F\*
  discharge with an SMT solver. Interval containment like this one is cheap, but it is still computation over
  parameter types, which the dependency model excludes.

The payoff is real (resolved-output consumers would no longer need the schema parser for a held body, §1.3), but it is
a feature of its own. It's listed under "Open", and neither revision includes it.

### Namespaces stay a constructor

In Revision 38 `namespace` is a constructor under `top` whose instances are maps (§4.1), so an entry's value is written
and read *as the map*, with no special case. One level doesn't change that, because `namespace` under `top` works
unchanged in one store. The alternative, a namespace kind as an ordinary record whose one field is typed by a pinned
sibling (`ns => abstract { of: kind<namespace>  entries: of! }`, a dependent field), brings back the path
`orders.entries.get` and needs a second, reading-side §5.6 rule to walk `orders.get`. Measured by a probe over
Revision 38:

| case | outcome |
|---|---|
| `iface => namespace & { key_type: = identifier  value_type: = meth }`, written `orders => !iface { get => { … } }` | the entry is the map: a namespace value of `iface`, holding each value under its key |
| `request: no_such` inside | refused at `/get/request` |
| `ref<meth>` to `orders.get` | resolves; `orders.nope` refused: "'orders' has no key 'nope' -- it holds get" |
| a record field holding a plain map `{identifier => meth}` | not entered: "a map that is no namespace, so it is not entered by name" |
| `ref<meth>` bound to a text host component, naming `nobody.get` | refused: "'nobody' is no entry of this schema or its imports" |

**As built** ([SPEC-FEEDBACK.md #9](../SPEC-FEEDBACK.md)): `namespace` stays a constructor, as a refinement of `map`
(`namespace => meta.map ^ { key_type: meta.identifier_ref  voidable?: = false }`), so a namespace type is an instance
of it and a namespace value is the map. That is step 4 below.

### What it costs

Churn isn't counted (see "Verdict"). What is left are properties of the design, and each needs an answer:
- **A document's role is no longer visible from its header,** unless a header opt-in keeps it. Whether a schema
  defines vocabulary becomes visible per entry: an entry composing `top` is a constructor. The spec currently prefers
  the document-level statement ("the ladder keeps that role explicit rather than emergent"), and §11.2 and §11.3 treat
  `!!meta` and `!!import` as the sensitive channel because they select vocabulary. Decided: no guard ("Decisions
  before the ladder goes", 1).
- **A schema can extend the language it is written in.** Its meaning then depends on itself, so tooling and readers
  have more to hold in their heads.
- **More work per untrusted schema.** A schema named by a request body can declare constructors and use them. §9.1
  would want a bound on read-dependency depth beside nesting depth.
- **Less push toward sharing.** Today one meta layer is *the* `operation`. With one level, any schema can declare its
  own; sharing still works through imports, but nothing pushes toward it.
- **Every schema reserves meta's names.** With `core.tn` importing `meta.tn` and imports transitive, each name
  `meta.tn` declares (`record`, `array`, `map`, `set`, `template`, `choice`, every `*_type` constructor) is reserved in
  each schema importing `core.tn` (§2.2.3). That reverses an argument Revision 38 just made: it moved five network
  names out of core into `net.tn` because `mac` and `hostname` are plausible schema type names, and `record`, `template`
  and `map` are far more plausible ones. Decided: one namespace, room made with sub-namespaces ("Decisions before
  the ladder goes", 2). **As built:** a schema importing core reserves the roots' names (`text`, `enum`, `set`, `doc`,
  `uuid`, `title` among them) and seven map names, `meta`, `atom`, `numeric`, `unicode`, `net`, `binary` and
  `temporal`; `record`, `map`, `namespace`, `template` and `identifier` are free
  ([SPEC-FEEDBACK.md #15](../SPEC-FEEDBACK.md)).

### Decisions before the ladder goes

Three questions this note used to leave open have correctness answers of their own, and each is settled on paper
here, so that the ladder's removal is deletion.

**1. Who may extend the kernel. Decided: anyone, with no opt-in.** With placement gone, any schema can declare
constructors, and a reviewer loses the header-level fact that a document *cannot* redefine what `record` means. The
first draft of this note proposed a header-level opt-in to restore it. It is not wanted, for three reasons.
- **Declaring a constructor was always ordinary.** A constructor composing `product`, `sum` or `namespace` makes types
  whose values the kernel's own readers already read: records, variants, maps. That is what a service vocabulary is,
  `interface`, `operation`, `api`, meta-level types instantiated in a schema, and it needs no permission it does not
  need today.
- **A new atom is the one case that is not, and it guards itself.** `uuid_type => meta.atom & { … }` is declarable by
  anyone, and its values are readable only where the processor binds a parser and reader to it. Unbacked, the type is
  declared and no value of it reads; that is by design, it is a fact about the processor and not about the document,
  and no header can state it. The guard the ladder spelled in a header is already in the structure.
- **The header has one directive.** `!!import` and `!!id` are all a header carries ("How a schema identifies itself"),
  and the rules live in the schema structures themselves: what a document composes is visible per entry as
  `meta.top`, `meta.atom` or `meta.product` ([`kernel-namespace.md`](kernel-namespace.md)), and a policy that wants to
  refuse an extension judges the closure on that spelling.

The depth bound no longer depends on a guard. §9.1 states one limit on read-dependency depth over a closure, beside
nesting depth, as a general limit every processor enforces; the kernel's own depth is fixed by its namespace.

**As built** ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md), [#7](../SPEC-FEEDBACK.md)): any schema declares a
constructor, with no extension guard. A constructor that composes a base kind directly makes a new form, which a
processor backs with readers of its own; the first implementation backs the forms the kernel and the data-format
libraries declare, and refuses an instance of any other as not implemented, which is the self-guard above. Decision 1
is partly done: refining an existing constructor with a field of its own (`c => record & { extra: text }`) makes no
new form and should read as record composition, but its instances are refused the same way. The depth bound is §11.5's
*wait depth*, default 64, rather than a §9.1 row.

**2. Which names a schema may use. Decided: one global namespace per closure, collisions refused, room made with
sub-namespaces.** The cost is above under "Every schema reserves meta's names". **Partitioning the namespace by role
doesn't answer it under one level.**
Revision 38 lets a schema's `record` and the kernel's coexist because no position consults both (§3.3.5): a `!` head
wants a constructor and a type-ref wants a type. One level removes exactly that. A `!` head takes either role
(`!decimal_type { … }` makes a type, `!operation { … }` a value of an ordinary type), and so does a supertype position
(`atom & { … }` builds a constructor, `point & { … }` a record). In a prototype system (`slots.md`), constructing a
type from a constructor and constructing a value entry from an ordinary record type are the same slot-closing operation
at two points in the order, so the grammar position no longer partitions the store. Partitioning by role is the two
stores again, which "The reference atom" calls the ladder. [`construction-operator.md`](construction-operator.md)
settles the head position itself, `<-` taking a constructor and `!` a type whose instances are values, and leaves `&`
and the type-ref position taking both roles, so the decision is one about the namespace. Two candidates were weighed
and both rejected: **non-transitive imports for reservation**, a second visibility rule beside the import rule, which is
decided transitive ("How a schema identifies itself"); and **local shadowing** with a diagnostic, which weakens §2.2.3's
reservation that identity relies on. What is kept is §2.2.3 as it stands, over the whole closure:
- **One namespace, at every level, loaded transitively.** A schema's namespace is its own entries and every entry of
  every schema in its import closure; `!!import` of `meta.tn` brings the kernel it imports. Nothing is hidden by depth.
- **A collision is an error.** Two libraries that both declare `address`, imported together, refuse the load, as two
  different declarations of one name do today, identity deciding what "different" means.
- **Room is made with sub-namespaces.** The kernel's and `meta.tn`'s constructors sit under `meta`
  ([`kernel-namespace.md`](kernel-namespace.md)), so the rare vocabulary costs one name; importing `core.tn` puts the
  common atoms, `text`, `integer`, `uuid`, at the root, where every schema wants them bare; and a library that wants
  room for its own `address` declares it under its own entry, `geo => !schema { address => { … } }`, reached as
  `geo.address`. Import aliasing is not needed, and resolved output stays free of an import list (§8.1).

**As built** ([SPEC-FEEDBACK.md #14](../SPEC-FEEDBACK.md), [#15](../SPEC-FEEDBACK.md)): `geo => !schema { … }`
declares, its members named by their path from the root. The kernel's machinery sits under six maps rather than one
(`meta`, `atom`, `numeric`, `unicode`, `net`, `binary`), and temporal.tn adds a seventh, `temporal`.

**3. `namespace` stays a constructor.** Settled by Revision 38 (§4.1) and kept ("Namespaces stay a constructor",
above): no `of!` record, no reading-side §5.6 rule, no parent slots in its place.

### How a schema identifies itself

Today classification *is* `!!meta`. [TSON-DATA] §2.2's kind dispatch: after an optional `!!id`, a `!!meta` makes the
document a schema; anything else makes it data. That takes at most two directives of lookahead and no value parsing,
so a stream or a content sniffer can classify a document from its opening bytes. Whatever replaces `!!meta` as a rung
must keep that budget.

**The kernel is named, never implied.** A v1 kernel immutable under its identity (§10) makes that identity the language
version: a processor pre-loads the kernels it knows and refuses a document naming one it does not in the header,
instead of in the body with an error about an unknown constructor. The resolved form needs the same line, since it
trusts only the pre-loaded kernel and must say which.

**`!!schema` on a data document is already an import.** §7.1 says so: "the directive names a namespace, not a root
contract", a schema has no privileged entry point, and under a schema the root MUST name its type. That is what
`!!import` does for a schema document. So a data document may carry several namespaces in scope, with §2.2.3's
collision rule between them, as every schema document does, and the two directives are one.

**Then the root says what the document is.** The kernel is to a schema what a schema is to data, so §7.1's rule
applies to it: a schema document's root names its type, `!meta.schema { … }`, and a document is a schema exactly when
its root is a value of `meta.schema`. "Exports a namespace versus refers into one" (below) becomes a property of the
root's type rather than of the header, and there is one document kind.

**Decided: one directive, `!!import`; `!!schema` and `!!meta` retired.** The root's tag, `!meta.schema`, signals that
what follows is a schema map under the imported kernel. The other rows are kept for the record.

**As built** ([SPEC-FEEDBACK.md #8](../SPEC-FEEDBACK.md)): the root's tag is `!schema`, which names the kernel's
root entry `schema => meta.schema`, an alias, whatever the document imports. Classification reads the header, the
root's leading annotations and its tag, never the root's value; a schema carrying a document-level `@doc` is classified
past that annotation's value, so the two-directive budget is not kept exactly. A Class 1 processor refuses a schema
document at the root's tag rather than reading it as a map.

| option | classifies by | for | against |
|---|---|---|---|
| **one directive, `!!import`; the root names its type** (decided) | after an optional `!!id`, any `!!import`s; a root tagged `!meta.schema` is a schema, any other root is data, no imports is schemaless data | one document kind and one header grammar; the import-free schema `{ a => { b: b }  b => {} }` is unambiguous because a schema root is tagged and a map root is not; the resolved form is the source without sugar, header and root tag included; a Class 1 processor rejects nothing, a schema read schemalessly being a map with a preserved tag | one more token to classify, the root's tag, still with no value parsing; one token on every schema document |
| **`!!schema` naming the kernel** | a `!!schema` naming a kernel makes the document a declaration map; any other `!!schema` makes it data | dispatch stays in the header | keeps `!!schema` distinct from `!!import` for the one case where it implies the root's type, which is the privileged entry point §7.1 rules out |
| **keep `!!meta`, change its meaning** | `!!meta` naming the kernel revision | dispatch unchanged | a directive with one legal value per revision, and the old meaning read into the name |
| **classify by `!!import`** | a header with any `!!import` is a schema | no directive just for classification | fails on the import-free schema; the kernel imports nothing, so it is special again |

**The import rules under one directive:**
- **Every import is a schema document**: its root is a `meta.schema` value. A document whose root is anything else
  cannot be imported, refused by the same test that classifies it. A data document may import; nothing imports it.
- **Imports are transitive.** Importing `meta.tn`, which imports the kernel, brings both; importing `core.tn` brings
  the whole series. The import-level rule (§2.2.3) is gone, and this is what remains of it.
- **Diamonds resolve by identity.** One document reached by two routes is one import. Two pins of one identity
  (`x.tn?sha256=A` beside `x.tn?sha256=B`), or two revisions of one base, in one closure is a collision, refused at the
  importer that joins them. A closure therefore names one kernel: there is no importing across language versions.
  **As built:** two pins of one identity are refused; two revisions of one base are refused only where they declare a
  common name, since nothing defines a revision for an arbitrary identity ([SPEC-FEEDBACK.md #8](../SPEC-FEEDBACK.md)).

**What follows:**
- **The kernel identifies itself and imports nothing.** Its header is `!!id` alone, its root `!meta.schema { … }`,
  and it is never resolved from a document: it is pre-loaded by special resolution, first, and its identity must be
  the one the software was built for. A kernel of another revision is not loaded, and a document in the wild
  claiming the kernel's identity is checked against the pre-loaded bytes, as the first implementation already checks
  its bundled schemas against their digests. The shape loop inside it (`record` described by a `!record`) is the one
  cycle, closed by the same pre-loading.
- A resolved form's header is the source's header. Today it cannot carry `!!import` and the import list is supplied at
  ingest (§8.1); now nothing is supplied at ingest.
- `!!id` stays optional in the grammar and required for publication, as now.

**The scope push goes.** §7.8's EXTERN cell exists so that data can name a schema the declaring schema did not import,
the change "always visible in the data, never implicit", and it is spelled as a `!!schema` directive on the value.
Decided: no directive at a value position, and a foreign type is used by importing its schema. A schema-driven form,
`extern`, is deferred out of this revision: a foreign schema that keeps its own names puts two
namespaces in one document, and either a tag's meaning depends on its position, or the data carries prefixes. What the
scope push's removal takes with it:
- `scoped`'s EXTERN cells, `extern`, `extern_of<S>` and `extern_type<S, T>`, and the open-world `dynamic`. The LOCAL
  cell, `declared`, a position whose value names a type of the closure by its tag, is the one form of `scoped` left, and
  whether it keeps the constructor or becomes an atom of its own is step 5's. **As built:** it keeps a constructor of
  its own, `declared_type => meta.sum & {}`, decided 2026-11-08 (D1 under "Decided").
- The typed-position restriction, and the count of scope pushes a data document can provoke (§9.1): a schemaless
  document already refuses a pushed scope, and under a schema there is nothing left to count.
- [TSON-JSON] §3.3's nested `$schema`: the leading member becomes `$import`, a list, at the top of a document and
  nowhere else, and §11's sensitive channel is one directive instead of three.

### Resolved forms

The `-resolved.tn` fixtures (`spec/m/meta-kernel-resolved.tn`, `meta-resolved.tn`, `core-resolved.tn`,
`net-resolved.tn`) are the one check of the resolver that isn't the implementation marking its own work: parse the
source, run the resolver, canonicalise, compare by name. They must survive.

**Today a resolved form is data, read under its source's meta.** `meta-resolved.tn` is `!!schema` the kernel;
`core-resolved.tn` is `!!schema` `meta.tn`. Its type names are inert: the namespace they resolve in "is declared by
the source schema's header and supplied at ingest … never by this document". The meta is what supplies a reader for
every tag the fixture uses. That is the one place the ladder carries weight for the proof, and the probe shows it:

| case | outcome on Revision 38 |
|---|---|
| a governed schema's resolved entries (`order`, `s => !steps { … }`) read as data under the layer that declares `steps` | reads |
| the same entries plus `steps`'s own resolved body, read as data under the kernel alone | `steps`'s body reads as an ordinary `!record`; `s` is refused: "'steps' is not admissible at a 'top' position" |

**Under one level the source's meta is gone, and its own constructors are in the fixture.** `!steps { … }` sits beside
`steps => !record { … }`, and the kernel alone has no reader for it. Reading the fixture with the read-defer-resolve
algorithm is what closes the gap:

- `!!schema` names the kernel, always.
- Each entry is read to its AST. `s => !steps { … }` waits on `steps`; `steps`'s own entry is a `!record` the kernel
  reads, so it resolves first and compiles the reader `s` was waiting for.
- No order is asked of the fixture. A fixture whose constructors wait on each other in a cycle doesn't read, as a
  source with the same cycle doesn't compile.

**As built** ([SPEC-FEEDBACK.md #8](../SPEC-FEEDBACK.md), [#4](../SPEC-FEEDBACK.md)): a resolved form's header is its
source's and its root is `!schema`, so it is read under its own imports, and nothing is supplied at ingest. Reading it
by the wait-order algorithm over its own entries is not running (sub-step 5f, partly done), so a fixture holding an
instance of a constructor it declares does not read back. The kernel and `meta.tn`
are one document since step 7, so the kernel's fixture is `meta-resolved.tn`; numeric.tn and temporal.tn have
fixtures of their own.

**What that keeps, and what it strengthens:**
- **The drift check is unchanged.** A fresh resolution of the source is compared with the fixture by name, as the
  fixture check does now.
- **The trusted base shrinks to the pre-loaded kernel.** The fixture's readers come from the fixture's own entries,
  never from a fresh resolution, so a drift in how the resolver handles a constructor's declaration shows up as a
  difference instead of being absorbed into the reader. Today `core-resolved.tn` is read under `meta.tn`, whose own
  resolution is also under test.
- **The kernel's fixture stays the fixed point.** `meta-kernel-resolved.tn` read under the pre-loaded kernel must
  describe that kernel: the one closed loop, already checked.
- **A resolved form re-resolves to itself.** Every stage is explicit in it, so reading it and resolving the result is a
  no-op. That is a second check the fixtures can carry once their readers come from themselves.

**What the fixture still can't say on its own** is the namespace its type names resolve in: `order` in a kind slot
names an entry of the source's closure, imports included. That stays "supplied at ingest" from the source's header,
as today. Without `!!meta` that header is the source's `!!import` list alone. **As built:** the form carries that
`!!import` list itself, so nothing is supplied at ingest.

### Entries are types or values

In Revision 38 an entry is a type exactly when its value IS-A `type` (§4.1). The only values a governed schema's
entries hold are namespace maps, since a namespace type is the one constructor whose instances are not types and only a
meta-schema may declare one; a kind slot refuses such an entry as "a value and not a type". Under one level an entry's
value is either built by a constructor or is an instance of an ordinary type:

| entry | its value | IS-A | a type? |
|---|---|---|---|
| `order => { sku: text }` | an instance of the constructor `record` | `record`, `type`, `top` | yes |
| `create_order => !operation { … }`, `operation` an ordinary record | an instance of `operation` | `operation` | no |
| `uuid_type => atom & { … }`, a kernel extension | a constructor | `atom`, `type`, `top` | builds types |

- **An entry is a type exactly when its value is built by a constructor in the `type` family.** `type_kind`'s members
  are computed that way already, so a value entry is excluded without being marked, as a namespace value is today.
- **The `top` family is entered only to build types and namespaces.** Extending the kernel (a new kind of atom, a new
  constructor) still composes `top`, `atom`, `product`, `sum` or `namespace`. `operation` doesn't: it is an ordinary
  record type, and its instances are value entries.
- **What placement guarded moves into the structure.** Today only a kernel-governed document may declare a
  constructor. Under one level any schema can, a product or namespace constructor being read by the kernel's readers
  and an atom constructor by nothing until the processor backs it (decision 1 under "Decisions before the ladder
  goes").

**The cost is the split between the two binders.** A host binding layer built on Revision 38 binds a meta layer's
vocabulary, the records its namespace types hold, with one binder and document types with another, and keeps them
apart deliberately: a meta layer's vocabulary is a separate namespace on purpose. Once a value entry may be an instance
of an ordinary type, the type no longer says which binder it belongs to. The natural line is between types whose
instances are entries and types whose instances are in documents. A type used both ways has to bind once for both, or
the line has to be drawn by the use instead of by the type.

**As built** ([SPEC-FEEDBACK.md #9](../SPEC-FEEDBACK.md)): an entry is a type exactly when its value is built by a
constructor IS-A `type`; any other entry is a value, its tag naming its type, and the schema map's values are
`declared`. The first implementation took the third option, one binder for schemas and data (D3).

### What `kind<T>` means

Today `kind<T>` is "the name of a type built with the constructor `T`", and `ref<T>` "the name of a value whose type
IS-A `T`", refused for a constructor (`ref<record>` is `kind<record>`). With value entries in the schema map, both read
as one rule:

> `kind<T>` is the name of an entry whose value IS-A `T`, for any `T`.

- **For a constructor `T`, nothing changes.** A type entry's value is an instance of its constructor, so `kind<record>`
  and `type_kind` (`kind<type>`) have today's members.
- **For an ordinary type it is new.** `kind<operation>` names the operation entries: today's one-segment
  `ref<operation>`.
- **`ref<T>` is the qualified form,** reaching through namespace values (`orders.place_order`). The one-segment
  cases of the two merge.
- **The slot's meaning comes from `T`, not from the spelling.** If `T` is in the `type` family the name is a type
  reference: it takes part in structural identity and is delivered to a host as a type reference. Otherwise it names a
  value.
- **In a data document** the probe already shows `type_kind` judged for membership. The same rule extends to value
  entries, which is how an agent plan's `method` could be checked (see the agent section).

**As built** ([SPEC-FEEDBACK.md #11](../SPEC-FEEDBACK.md)): the rule is running under one spelling, `meta.ref<T>`; no
`kind` stands beside it.

### The reference atom: `kind`, `ref` and `type_ref` are one

The section above was an argument from what one level would allow. This one is an argument from what the kernel
already does, measured on Revision 38: the three ways the kernel holds a name in a slot are one atom, and the only thing
keeping them apart is the ladder.

**The three forms.** `kind_type` is an atom whose `of` names a constructor of the structure namespace and whose values
are one-segment type names, with a resolver-computed `members` index. `ref_type` is an atom whose `of` names a type of
the writer's own namespace and whose values are qualified names walking entries, then namespace keys and record
fields. `type_ref` is a record, `{ name: type_name  arguments?: [type_argument] }`, the application form. The types
under `type` otherwise describe data: an atom's values are tokens, a record's are records, an array's are arrays. These
three describe a *location in the namespace*, and all three are represented by the one thing, a qualified name.

**Four measured facts.**
1. **Every slot delivers into one host shape.** The first implementation reads a kind-typed, a reference-typed and a
   `type_ref`-typed slot into the same host type reference, and the judgement belongs to the slot, never to the host
   shape. The implementation found the one atom before the spec did.
2. **`type_ref` without arguments is already `kind<type>`.** No bundled resolved output carries an `arguments:` field:
   every closed application lifts to a minted entry (`array_type_name_xxhash`, `kind_type_type_c430c650`), so in
   resolved output a closed type reference is a bare name. The kernel's own slots that name a type (`record_field.type`,
   `map.key_type`, `array.element_type`, `choice.variants`, `template_param.bound`) are typed `type_kind`, which is
   `kind<type>`; `type_ref` survives in three slots (`type_chain.parents`, `reference.target`, `type_argument.name`).
   What it carries beyond a name is an application still open: the kernel's `type_ref` doc keeps `arguments` "inside
   template bodies and in an alias's `reference.target`", and a record template's resolved body is one (a record
   template is a `record` with `parameters`). The bundled outputs show none only because no bundled schema has one. So
   `type_ref` is two things: a bare name, which is `kind<type>`, and the open-application form, which nothing else
   expresses.
3. **`kind<C>` is `ref<C>` read at the meta level.** A schema map's entry is its value (Revision 38), so
   `order => { sku: text }` is a value of the kernel type `record`. `kind<record>`, "the name of an entry whose value is
   built with `record`", is then "the name of an entry whose value IS-A `record`", which is `ref<record>`'s predicate
   word for word, minus the kind's exclusions: not a constructor whose instances are types (a namespace constructor, whose
   instances are maps, is a member), and not a template over another constructor (a record template is a type and a
   member). The spec refuses `ref<record>` and makes `kind<record>` the spelling for one reason only: `of` resolves in
   two stores, the structure namespace for a kind and the type-name namespace for a reference. Two stores is the ladder.
   The exclusions are facts about `top`'s family, not about stores, and survive as one predicate on the referent.
4. **The ladder makes half the vocabulary dead and the index wrong.** A reference's first segment names an entry
   holding a value, and under the import-level rule (§2.2.3) a namespace type, the only thing that puts a value in an
   entry, exists only in a kernel-governed schema. So `ref<T>` in a schema governed by meta.tn, which is where data
   lives, would admit no value at all: an empty atom, which is why core.tn declares no `ref`. And
   `kind_type.members`, the derived index in resolved output, is computed over the *declaring* schema's closure, while
   the names at the slot resolve in the *holding* document's. For a kind declared at level 2 and held at level 1 the
   index lists level-2 types, and the linker rightly ignores it; it is honest only when declaring and judging closure
   coincide, a level-1 kind on level-0 data. Neither is a bug in the atoms. Both are the two stores showing through
   them.

**Is `kind_type` an atom or a sum?** An atom. A sum's values are values of a variant; a kind's values are names. The
kind's own example decides it: `name_type: kind<identifier_type>` admits `identifier` and refuses `NewYork`. `choice` is
the sum, and its `variants: [type_kind]` is built over the kind; `enum_type` is an atom with a `members` field on the
same terms. What `members` shows is only fact 4, that the set is closure-relative.

**What one level makes of it.** One namespace is one store, so one atom:

```
reference => atom & { of: type_name }    -- a qualified name; past entries, keys and fields, the referent IS-A `of`
kind      => <T> !reference { of: T }    -- the one-segment spelling
ref       => <T> !reference { of: T }    -- the qualified spelling; the two may be one
```

**As built** ([SPEC-FEEDBACK.md #10](../SPEC-FEEDBACK.md) to [#13](../SPEC-FEEDBACK.md)): the alias body was renamed
`alias`, freeing the word, and the atom is `reference_type`, with one template over it and no `kind`:

```
reference_type => meta.atom & { of: meta.type_ref  allow_sibling?: boolean ~ true }
ref            => <T> !meta.reference_type { of: T  allow_sibling: false }
field_type_ref => !meta.reference_type { of: meta.type }               -- a record field's type, `kind!` admitted
type_ref       => !meta.field_type_ref ^ { allow_sibling: false }      -- Revision 38's `type_kind`
identifier_ref => !meta.type_ref ^ { of: unicode.identifier_type }     -- Revision 38's `identifier_kind`
```

`allow_sibling` admits a sibling reference, `kind!`, at a record field's type alone
([SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md)). The `type_ref` and `type_argument` records are gone: an application is
a value of the atom ([SPEC-FEEDBACK.md #12](../SPEC-FEEDBACK.md)), written unquoted in data, `<` and `>` being data
grammar ([SPEC-FEEDBACK.md #13](../SPEC-FEEDBACK.md)).

- `of` names any entry of the one namespace, constructor or type: `kind<record>` and `ref<operation>` are the same
  declaration with a different `of`, which is "What `kind<T>` means" above, now with its kernel shape.
- `type_ref` goes too: the atom's value is the qualified name *with its arguments*, one grammar at every position
  ([`reference.md`](reference.md)). A closed application lifts to a minted entry as it does today, so no slot holding a
  closed name carries arguments; an open one, in a template body or an alias's target, is the reference as written.
- `members` goes. With one closure the declaring closure is the judging closure, so the index is computable at ingest
  and says nothing a reader cannot recompute; if a resolved form keeps it for inspection it is honest for the first time.
  **As built:** a resolved form states `of` alone, and `members` written by an author is refused as an unknown field.
- The slot's meaning still comes from `of`, not the spelling: an `of` in the `type` family makes the slot a type
  reference (structural identity, delivered to a host as a type reference); any other `of` names a value. **`namespace`
  is where that rule is not yet clean.** Revision 38 lists `myapi`, a value, under `kind<api>` and `kind<namespace>`
  beside the namespace types, and under no kind of types (§4.2), which supports the merge: a kind reaches values today.
  But under one level a namespace type and its values share a closure, which the ladder prevents (a meta layer cannot
  apply its own constructor), so `!reference { of: namespace }` admits both; and `namespace` sits under `top`, not
  `type`, so the rule above reads it as naming values and drops the namespace types the kind and namespace rules put in
  `type_kind`. **Decided: `namespace` moves under `type`.** A namespace type has values, maps, as a record type has
  records; then `kind<type>` includes `interface`, `ref<interface>` names `orders`, and the rule needs no exception.
  Whether it is then `abstract map & { … }`, a map constructor keyed by names, is weighed on what one level opens up
  (Open). **As built:** `namespace` is a refinement of `map` (step 4), and so IS-A `type`.
- **`kind` and `ref` cannot differ by spelling alone.** Two templates expanding to the same `!reference { of: T }` make
  `kind<X>` and `ref<X>` one application with one canonical content (§8.2), so a slot cannot know which was written. A
  one-segment restriction cannot be the difference, since decision 2's sub-namespaces make `geo.address` a type name a
  `kind<type>` slot must admit. If a difference remains it is this: a `ref<T>` points at another definition, where a
  `kind<T>` slot takes the name as its value. Deferred ([`reference.md`](reference.md), "One spelling or two").
  **As built:** one spelling, `meta.ref<T>`; a second could say nothing the first does not
  ([SPEC-FEEDBACK.md #11](../SPEC-FEEDBACK.md)).

**Why this is a second proof.** The verdict's first argument was that one checked rule replaces five that leaked. This
one is from the other end: the kernel's own vocabulary, designed under the ladder, converges on one reference atom at
exactly the point where the two stores become one, and the cost of not collapsing shows up inside the atoms as a dead
spelling and a lying index. A design that is right tends to show the same simplification from both directions.

**Not under the ladder.** Writing `reference` while `of` resolves in two stores would put the store choice in a field
name (`{ name | of | kind }`) and carry the ladder inside the atom. Under the ladder the honest kernel is Revision 38's,
with `ref` confined to kernel-governed schemas.

## Pulling the thread: does the data/schema line blur too?

A rule consumers of Revision 38 adopted is "data can name a schema; only a schema can name a type". The probe says the
strong form of that is already untrue:

| case | outcome |
|---|---|
| user schema imports core, declares `pick => { t: kind<type> }`; data writes `!pick { t: order }` | admitted |
| the same, `t: no_such` | refused: "'no_such' is not a member of this kind" |
| the same, `t: record`, a constructor | refused: not a member |
| the same schema adds `rpick => { m: ref<order> }` | refused: "has an unresolved reference 'ref'" -- core declares no `ref`, the closure holding no value entry to name |
| data governed by `meta.tn`: `!record { fields: { sku => { type: no_such } } }` | admitted: grammar and shape judged, membership not |

**A data document can hold a checked name for a type today.** Membership is judged over the governing schema's
closure. This is a "value type for naming a type in data" that a consumer had weighed and set aside. It exists through
core's own `kind`, which keeps it in an ordinary schema's reach, since an ordinary schema cannot import the kernel
(§2.2.3). A reference to a value does not, under the ladder: it names an entry holding a value, and only a
kernel-governed schema can declare the namespace type that puts one there, so a schema that governs data has none to
name. Under one level it does ("The reference atom", above).

**So what separation is left?** A data document *declares nothing*: no name in it can be resolved against by anyone
else. It can *refer* to types (kinds), and under one level values (refs), in the namespace it names. The line is between a
document that **exports a namespace** and one that **only refers into one**, not between "may name a type" and "may
not".

**And that line blurs too.** A document can have names of its own that it doesn't export: local bindings. The agent
plan, below, is exactly that. So the restatement this experiment arrives at:

> A document that exports a namespace is a schema. A document with at most a local scope is data. Any document may
> refer to a type or a value in the namespace it names.

**The separation is kept, on that footing.** Data governed by a schema is what this note keeps: one level applies to
schemas, and a data document still declares nothing others resolve against, still names its schema with `!!schema`,
and still can't extend the language it is read in. What the probe changes is the *reason* for the line, which moves
from "may name a type" to "exports a namespace". A schema and a data document alike refer into their imports and
nowhere else. **As built:** a data document names its schemas with `!!import`, several in one namespace
([SPEC-FEEDBACK.md #8](../SPEC-FEEDBACK.md)), and a kind-typed position in every data document is judged by membership
over its closure ([SPEC-FEEDBACK.md #9](../SPEC-FEEDBACK.md)).

### The API and the deployment descriptor

A consumer of Revision 38 kept these apart with an argument that doesn't survive the probe: the API must be a schema
because it names types, and a descriptor is data because it names none. Data can already hold a checked type name, so
on that argument alone an API could be data.

**The arguments that do hold have nothing to do with levels:**
- §8.2: no document may name, import or otherwise select the policy it is judged under.
- §3.5: an API is immutable once published and pinned by identity, while a policy has to move without minting one.
- A descriptor configures one instance, not a contract, and nothing may name it.

**The restatement draws the line in the same place, for those reasons.** The API exports a namespace that others refer
into: a binding's `ref<method>`, an agent plan's methods, a coverage check claiming operations by name. So it is a
schema. A descriptor exports nothing and nothing names it, so it is data.

**What opens up is one-directional.** A descriptor could refer *into* the API: `ref<operation>` for what this instance
serves, or exemptions from a coverage check moving from code into configuration. That is data referring into a
namespace it names, which the rule allows. The API naming a descriptor still isn't, and neither is a descriptor naming
the schema whose policy it sets.

**Membership, as Revision 38 states it.** Two behaviours the probe shows are the spec's rules (§4.2), not gaps:
- **Membership depends on the governing schema.** At a kind slot under a user schema, membership is judged. Under a
  meta-schema such as `meta.tn`, a data document describes a schema whose namespace it does not carry, so the slot
  checks the grammar and membership is judged at ingest.
- **`members` is the governing closure's.** It is computed at link over the governing schema's closure; the list a
  declaring schema's resolved output carries is a derived index, discarded and recomputed on ingest (fact 4 under "The
  reference atom" is why it cannot be trusted as written).

## API descriptions and HTTP routes over schema records

**Under Revision 38,** an API description is governed by a meta layer and imports the ordinary schema of its records.
A method's `request`, `response` and `errors` are kind slots naming records in that schema, and a binding's `method` is
a `ref<method>`; the resolver judges them all. What the resolver can't judge is checked by the consumer when the
description is read: placement against the request record's fields, the `implements` claim, and a verb or status
against the method.

**Under one level:**

```
!!id:"https://schemas.example.com/2026/38/app/orders-api-1.tn"
!!import:"https://schemas.example.com/2026/38/http/http.tn"     -- operation, response, http_verb, path_template
!!import:"https://schemas.example.com/2026/38/app/order-1.tn"
!!import:"https://tson.io/2026/38/m/core.tn"
{
  page          => <T> { items: [T]  next?: uri  total: int32 }
  order_page    => page<order>
  paged_get     => operation & { method?: = GET }                  -- an application's own endpoint shape, declared here
  list_orders   => !paged_get { path: "/orders"  responses: [ !response { status: 200  body: order_page } ] }
}
```

The sketch predates the one-directive decision; as built, the root is `!schema { … }`.

**What changes:**
- The description is a schema like any other. Its records, its templates and its own endpoint shapes (`paged_get`, a
  refinement of the ordinary record type `operation`) sit beside its operations, which are value entries.
- Under the ladder `paged_get` would need a meta layer per application. That is why a CRUD family is written out
  operation by operation.
- Payload names are kind slots, judged once the closure's facts are in. `order_page` is an alias, resolved like any
  entry, and an operation body is a value body that lifts and mints nothing, as a namespace value is today (§4.1).
- `list_orders` waits on `paged_get`, which waits on `operation` from the import. Nothing is asked of the order the
  entries are written in.

**Some checks relate two fields of one value, and stay outside the type system.**
- a `{segment}` in the path template must be a field of the request record;
- a placement's `query: [status]` must name a field of the record at `request`.

These need the field names of the type a sibling names, not a value of it: a projection through the sibling's target,
roughly `ref<request.fields!>`. A dependent field ([`dependent-fields.md`](dependent-fields.md)) reads a sibling's value
and stops there, and the chained projection is an entry-level value → value edge the dependency model's invariant
excludes, values being leaves. Two more reasons it doesn't fit:
- **One expression can't serve both endpoint kinds.** `query` sits in a placement shared by an operation (where
  `request` is a sibling) and a binding (where it is reached through `method`).
- **It would move membership only.** Each field placed exactly once over the path, query, headers and body, path
  template variables binding fields, the scalar-only rule and the GET remainder are relational, and the consumer keeps
  them whatever the type system gains.

So these checks stay with the consumer, on the principle that an unsound description has no model.

**Routes become a projection.** A gateway reads an `!api` into a route table, and under one level that is unchanged.
What changes is that the description, its vocabulary and the records it names are one closure with no `!!meta` hop, so
the gateway reads one schema and its imports.

## The agent and the agent VM

An agent experiment on Revision 38 was the strongest evidence for this note, because it already described one-level
documents and worked around the ladder to do it. Its plan is an ordinary map document of `name => !method { request }`
steps and a final `return`: the steps are local, def-before-use declarations, each applying an interface's method like
a constructor, and `login.user.id` is a qualified name into an earlier step's response. Under the ladder the plan had
to be read schemalessly, method names as preserved unknown tags, with the hazard that a method named `date` parses as
the built-in. Under one level its typing is read-defer-resolve one step at a time: a step's response type comes from
its head, known once its AST is read, and since a plan cannot branch on values, each step depends on earlier
declarations and never on values, the easy end of dependent typing. By the restatement above a plan is data: it has a
local scope, refers into an interface, and exports nothing. Its compiled form stands to the plan as a resolved schema to
its source, and admitting it re-runs the same forward pass, so the agent verifier and the resolver are one algorithm
over different documents. What it needed was a reference to a value in data, which the ladder could not give, and the
interface's namespace in scope; the answer TSON already has is a derived schema importing both the agent vocabulary
and the interface, which governs the plan and retires an `interface:` field that sets the scope for later fields.

## Order of work, as landed

One revision, Revision 39, on its proposal branch, in eight steps with two rhythms. Steps 1 to 3 touch no kernel
entry, so each was checked against the `-resolved.tn` fixtures before the next started. Steps 4 to 8 rewrite the kernel
document once, with the fixtures moving once ([`kernel-namespace.md`](kernel-namespace.md), "Resolved forms"), and
what makes one move checkable is step 2's harness, which is why the proof preceded everything. The spec text landed per
step, as [SPEC-FEEDBACK.md](../SPEC-FEEDBACK.md) entries.

**The model, the proof and the operator, under the ladder.**

1. **Specify the dependency model:** shape and value; the three sides a facet falls on (link, shape, value) by the
   mechanical rule; the two closures, shape then reader, with the reader-closure edge and its cycle check stated here
   ([`typed-facets.md`](typed-facets.md), "The edge it adds") since the kernel's `multiple_of` relies on it; the
   invariant that a shape never waits on a value; what a cycle is; and the limits, a read-dependency depth over a
   closure as a general §9.1 limit, and a template-expansion bound.
   **Outcome: landed** as [SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md)'s seven rules, worded as readiness and waits (see
   the As built note under "The dependency model"). The depth limit is §11.5's *wait depth*, default 64; template
   expansion needs no new bound.
2. **Prove it on the kernel.** `meta-kernel-resolved.tn` comes out as a fixed point under read-defer-resolve over the
   pre-loaded kernel shapes, and every facet chain in the kernel closes its reader without a cycle. The harness that
   shows it stays, and is rerun on every kernel edit below. Until it passes, nothing below starts.
   **Outcome: landed** ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md)). The kernel has one wait cycle, holding
   `meta.record`; the bootstrap builds by hand only the instances and refinements on it and makes every other entry
   ready by the algorithm, and its output equals the kernel's ordinary resolution against itself, entry for entry. A
   test holds the hand-built set to the measured cycle and was rerun on each kernel edit below. Since step 7 the
   kernel's fixture is `meta-resolved.tn`.
3. **Dropped: the construction operator.** `!C { … }` is an instance of `C`, a `!` head's role following from its
   head's chain ([`construction-operator.md`](construction-operator.md)). [SPEC-FEEDBACK.md #5](../SPEC-FEEDBACK.md)
   keeps what it opened: `^` refines any value under the rules its type states.
   **Outcome: dropped as planned;** #5 landed.

**The ladder goes, and the kernel is rewritten once.** Steps 4 to 8 are ordered by dependency: the reference atom
must exist before `meta.` can be written at a type position, and the kernel must be one document under `meta` before
its facets can be typed by its instances. The paper decisions ("Decisions before the ladder goes", "How a schema
identifies itself", "The scope push goes") land as text here, where the ladder they replace is deleted.

4. **Folded into step 5.** `namespace => abstract type & { … }` as written would leave `api` a constructor IS-A
   `type`, so step 6's rule would read `ref<api>` as naming types. Decided instead: `namespace` is a map constructor
   whose keys are names, `namespace => map ^ { key_type: identifier_kind … }`; a namespace type is its instance
   (`schema => !namespace { … }`, `api => !namespace { key_type: identifier  value_type: method }`) and `orders =>
   !api { … }` an ordinary value of the type `api`, with no exception at `type_kind`, `kind<namespace>` or `ref<api>`,
   and `namespace` no longer a fourth base kind. It needs value entries of ordinary types, so it lands with step 5.
   **Outcome: landed with 5e** ([SPEC-FEEDBACK.md #9](../SPEC-FEEDBACK.md)) as
   `namespace => meta.map ^ { key_type: meta.identifier_ref  voidable?: = false }`, `identifier_kind` having become
   `identifier_ref` at step 6. `key_type` is required, and the kernel's one namespace type is
   `schema => !meta.namespace { key_type: meta.type_name  value_type: meta.declared }`.

5. **One directive, and the ladder deleted.** `!!import` only; `!!meta` and `!!schema` retired; a document is a schema
   when its root is `!meta.schema { … }`; the kernel carries `!!id` alone, is pre-loaded by special resolution and
   bound to the software's revision. Placement (§2.2.2), direction of service (§3.3.1) and the import-level rule
   (§2.2.3) go, with no extension guard in their place (decision 1). Value entries become instances of ordinary types
   and the binder split is redrawn. §7.8's scope push goes: `scoped` reduces to `declared`, and [TSON-JSON] §3.3's
   `$schema` becomes the leading `$import`.
   **Outcome: landed, except 5f (partly) and 5h (deferred).** The sub-steps, in the order they landed:
   - **5a, pins held. Landed** ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md), rule 3). A default, a pin and a template
     body hold what a schemaless read gives and bind as written, judged against their type once every entry is ready,
     still at load.
   - **5b, the bootstrap in wait order. Landed.** Only the kernel's cycle is built by hand; every other kernel entry is
     made ready by the algorithm ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md)).
   - **5c, the scope push disabled. Landed** ([SPEC-FEEDBACK.md #6](../SPEC-FEEDBACK.md)). A directive inside a value
     is a parse error, `scoped`, `extern`, `dynamic`, `extern_of` and `extern_type` are in no bundled schema, and
     `declared_type => sum & {}` with `declared` is the LOCAL cell. [TSON-JSON]'s binding member stands at the top of a
     document alone.
   - **5d, one namespace. Landed** ([SPEC-FEEDBACK.md #7](../SPEC-FEEDBACK.md)). Placement, direction of service, the
     import-level rule, the governing-target check, the structure/type-name split and §3.3.5's siblings are deleted;
     core.tn redeclares none of the kernel's names.
   - **5g, one directive. Landed** ([SPEC-FEEDBACK.md #8](../SPEC-FEEDBACK.md)). The header is an optional `!!id`
     and any number of `!!import`s; `!!meta` and `!!schema` are parse errors naming their replacement; a root tagged
     `!schema` is a schema; the kernel's header is `!!id` alone; [TSON-JSON]'s member is `$import`.
   - **5e, value entries and `namespace` as a map. Landed** ([SPEC-FEEDBACK.md #9](../SPEC-FEEDBACK.md)), with step 4.
     `create_order => !operation { … }` is a value entry; one binder serves schemas and data (D3).
   - **5f, wait order everywhere. Partly done** ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md), "What is not running").
     Every schema resolves by the one algorithm, but a resolved form is still read under its source's imports, not by
     the algorithm over its own entries.
   - **5h, `extern` restored. Deferred** out of Revision 39.
6. **One reference** ([`reference.md`](reference.md)): the qualified name with arguments as one grammar at every type
   position, as the tag in data ([TSON-DATA] §7.4), and as the value of one atom; `kind_type`, `ref_type`, `type_ref`
   and `type_argument` go, and `members` with them. It cannot be written while `of` resolves in two stores, so it
   follows step 5, and it precedes step 7, which writes `meta.integer_type`.
   **Outcome: landed** ([SPEC-FEEDBACK.md #10](../SPEC-FEEDBACK.md) to [#13](../SPEC-FEEDBACK.md)). There is no
   `kind_type`, `ref_type`, `kind` or `type_argument`; the atom is `reference_type`, with `of: meta.type_ref` and, since
   dependent fields, `allow_sibling`; `meta.ref<T>` is the one spelling, and `type_kind` and `identifier_kind` are
   renamed `meta.type_ref` and `meta.identifier_ref`. A reference with arguments is data grammar, written unquoted
   ([SPEC-FEEDBACK.md #13](../SPEC-FEEDBACK.md)), where [`reference.md`](reference.md) had proposed a quoted token.
   The alias body was renamed `alias` ([SPEC-FEEDBACK.md #10](../SPEC-FEEDBACK.md)), and
   [SPEC-FEEDBACK.md #22](../SPEC-FEEDBACK.md) later named §12.1's `type-ref` apart from `meta.type_ref`.
7. **The kernel under `meta`** ([`kernel-namespace.md`](kernel-namespace.md)): `meta.tn` merges into the kernel as
   `meta => !schema { … }`, closed maps (rule A); §4.1 restated so every `!schema` value declares; lexical scope inside
   a `!schema` body; synthetics homed by path; `core.tn` imports the kernel directly, re-exports `kind`, `ref`,
   `declared` and `doc` by alias, and keeps the common atoms at the root; `net.tn`'s constructors under `net.`. The
   fixtures move here, once, and step 2's harness is rerun on the rewritten kernel.
   **Outcome: landed differently** ([SPEC-FEEDBACK.md #14](../SPEC-FEEDBACK.md), [#15](../SPEC-FEEDBACK.md)).
   **As built:**
   - `meta.tn` and the kernel are one document, `meta.tn`, and every `!schema` value declares, as planned.
   - **Six maps, not one.** The kernel nests `meta`, `atom`, `numeric`, `unicode`, `net` and `binary`, beside a root
     holding the vocabulary an author writes (`void`, `boolean`, `integer`, `int64`, `text`, `bytes`, `iri`,
     `iri_reference`, `regex`, `doc`, `enum`, `set`, `schema`).
   - **The maps are open, not closed.** A map of one path declared by several documents of a closure is the union of
     their members, and a member path two of them declare collides, by identity: rule C of
     [`kernel-namespace.md`](kernel-namespace.md), not A. numeric.tn and net.tn add their constructors to the kernel's
     `numeric` and `net`, which closed maps would refuse.
   - **No lexical scope.** Every name resolves from the root; inside `geo` a sibling is written `geo.address`, and a
     bare `address` names the root's.
   - **Synthetics mint at the root,** one entry per form across the document, not homed by path; a dotted name
     contributes its text with each dot written `_`.
   - **core.tn imports numeric.tn, temporal.tn and net.tn and declares no aliases.** `meta.ref` and `meta.declared` are
     written by path; `doc`, `set` and `enum` sit at the kernel's root; core.tn's own root holds the author annotations.
   - net.tn's constructors are under `net.` (`net.uuid_type`), as planned, and temporal.tn's under `temporal`.
   - The fixtures moved once, and step 2's harness was rerun on the rewritten kernel.

   Lexical scope, synthetics homed by the innermost map, and who may contribute to an open map are open in #14.
8. **Typed facets** ([`typed-facets.md`](typed-facets.md)): with every constructor beside its canonical instance in
   the one kernel document, each facet is typed by the instance, §7.4's `value`-typed-constraint prose goes, and
   `value_type` is deleted, its last slot having gone in step 6.
   **Outcome: landed** ([SPEC-FEEDBACK.md #17](../SPEC-FEEDBACK.md)), with every counting facet typed by a fixed
   64-bit range ([SPEC-FEEDBACK.md #16](../SPEC-FEEDBACK.md)). `value_type` and `value` are deleted from the kernel; the
   field slots that held `value` are typed by the field's own type, `value?: type!`.

Steps 1 and 2 were the correctness work. Step 3 was small and testable on its own. Steps 4 to 8 were mostly deletion
once the decisions held, one kernel rewrite checked by the harness. Dependent fields
([`dependent-fields.md`](dependent-fields.md)) had their own order of work and landed beside these steps
([SPEC-FEEDBACK.md #21](../SPEC-FEEDBACK.md)); on 2026-11-07 the rule was widened so a sibling may be a field group's
member beside an optional dependent field, and `record_template_field` gained `( value: type! | value_param )?`.
[SPEC-FEEDBACK.md #18](../SPEC-FEEDBACK.md) to [#20](../SPEC-FEEDBACK.md) were found while the record and template
machinery was rewritten: a restated field's type narrows by IS-A, a record template is its own constructor, and an
applied parent reaches the head at a closed operand.

## Decided

Settled on paper, each where the note states it; a decision marked "at implementation" is a direction the
implementation confirms.

- **The rule: correctness over churn** ("Verdict"). Nothing here is weighed by how much it changes.
- **One revision, Revision 39,** in eight ordered steps: the model, the proof and the operator under the ladder, then
  `namespace` under `type`, the ladder's removal, the reference, the kernel namespace and typed facets as one kernel
  rewrite ("Order of work, as landed").
- **Three features are kept out of this note:** dependent fields ([`dependent-fields.md`](dependent-fields.md)), typed
  facets ([`typed-facets.md`](typed-facets.md)) and the kernel under its own name
  ([`kernel-namespace.md`](kernel-namespace.md)). One level enables them; none is part of it.
- **No construction operator.** `!C { … }` stays; `^` refines any value under its type's rules
  ([SPEC-FEEDBACK.md #5](../SPEC-FEEDBACK.md)).
- **One directive.** `!!import` only; `!!schema` and `!!meta` are retired; a root tagged `!meta.schema` is a schema
  document ("How a schema identifies itself"). **As built:** the tag is `!schema`, an alias at the kernel's root.
- **Import rules.** Every import is a schema document, by the test that classifies it; imports are transitive;
  diamonds resolve by identity, two pins or two revisions of one base refused at the joining importer; a closure names
  one kernel. **As built:** two revisions of one base are refused where they declare a common name.
- **The bootstrap.** The kernel carries `!!id` alone, imports nothing, is pre-loaded first by special resolution, and
  must be the revision the software was built for; no other revision's kernel is loaded.
- **No scope push.** §7.8's value-position `!!schema` goes; a foreign type is used by importing its schema, and
  [TSON-JSON]'s `$schema` survives only as the leading `$import` ("The scope push goes"). `extern` is deferred.
- **`namespace` sits under `type`** ("The reference atom"): a namespace type has values, so `kind<type>` reaches it and
  `ref<interface>` names its instances, with no exception to the atom's rule. **As built:** as a refinement of `map`.
- **The kind's membership is unchanged**: by construction, as §4.2 states it. `integer` is a member of
  `kind<integer_type>` because `integer_type` built it, and is not IS-A `top`; no new predicate is needed.
- **`!` survives in a schema** as the value-entry mark, `!meta.schema { … }` at the root being the first example
  ([`construction-operator.md`](construction-operator.md)).
- **Anyone may declare a constructor, with no header opt-in** (decision 1): product and namespace constructors are
  read by the kernel's readers, an atom constructor only once the processor backs it, and the depth bound is a general
  §9.1 limit. **As built:** partly; an instance of a constructor refining `record` with fields of its own is still
  refused, and the depth bound is §11.5's wait depth.
- **`namespace` stays a constructor** (decision 3, "Namespaces stay a constructor").
- **The kernel's names sit under `meta`**, closed maps (rule A in kernel-namespace.md, at implementation), the two
  kernel documents becoming one. **As built:** the two documents are one, but implementation did not confirm rule A.
  The kernel's machinery sits under six open maps, each the union of every document's members (rule C), beside a root
  vocabulary ([SPEC-FEEDBACK.md #14](../SPEC-FEEDBACK.md), [#15](../SPEC-FEEDBACK.md)).
- **One global namespace per closure** (decision 2): transitive, a collision refused by identity as §2.2.3 does today,
  room made with sub-namespaces (`geo => !schema { … }`); non-transitive imports, local shadowing and import aliasing
  all rejected. **As built:** every name resolves from the root, with no lexical scope inside a sub-namespace.
- **The shape/value boundary is a rule, not a table.** A facet's side follows from its field type and its reader
  (link, shape or value; "Which side a facet falls on is mechanical"), and closure has two stages, shape then reader.
  Step 2 checks that no kernel facet closes a reader loop on itself.
- **Step 5's sub-steps,** their outcomes under "Order of work, as landed", and five decisions taken while it landed:
  - **D1, `declared`. Decided 2026-11-08: `declared` stays `declared_type => meta.sum & {}`,** with
    `declared => !meta.declared_type {}`. Its values are values of a type the closure declares, chosen by the tag,
    which is a sum, as `choice` is the closed one. The earlier direction, that `declared` becomes an atom constructor
    of its own, is superseded. `scoped`, `scope_kind` and `scope_set` are gone, as decided.
  - **D2, `namespace`'s `key_type`. Superseded.** The direction was an optional `key_type`, absent meaning the host
    supplies the key family, so that a record's fields could be a namespace keyed by its `name_type`. As built,
    `key_type` is required, `meta.identifier_ref`, and a record's fields go through `field_map`, a plain map keyed by
    `text`, each key judged by the record's `name_type` ([SPEC-FEEDBACK.md #9](../SPEC-FEEDBACK.md)).
  - **D3, one binder. Done.** One bind context serves schemas and data, the kernel's names fixed to the schema model;
    a value entry no class binds is held as a tree for validation, and refused from a schema loaded to bind
    ([SPEC-FEEDBACK.md #9](../SPEC-FEEDBACK.md)).
  - **D4, resolved form or source. Done.** Reading a resolved form is the caller's choice, as ingest is
    ([SPEC-FEEDBACK.md #8](../SPEC-FEEDBACK.md)).
  - **D5, the kernel's names. Done.** `!schema` resolves against the pre-loaded kernel, and the kernel's names enter a
    schema only by import ([SPEC-FEEDBACK.md #8](../SPEC-FEEDBACK.md)).
- **`kind<T>` and `ref<T>`: one name.** `ref<T>` stays and `kind` goes; `type_kind` and `identifier_kind` are
  `meta.type_ref` and `meta.identifier_ref` ([SPEC-FEEDBACK.md #11](../SPEC-FEEDBACK.md)).
- **`namespace` as `map ^ { key_type: meta.identifier_ref … }`.** `field_map` is a text-keyed map judged by its
  record's `name_type`, so no namespace leaves `key_type` to its host ([SPEC-FEEDBACK.md #9](../SPEC-FEEDBACK.md)).
- **The binder split:** one binder, D3.
- **The cycle message:** the entries in wait order, `'a' waits on 'b' waits on 'a'`
  ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md)).
- **The read-dependency depth bound:** §11.5's *wait depth*, the longest chain of waits within one document's
  resolution, default 64, a chain past it refused as a limit and not a verdict ([SPEC-FEEDBACK.md #4](../SPEC-FEEDBACK.md)).

## Open

- **Typed template bodies:** whether to widen every constructor slot to admit a parameter reference so a held body is
  typed, and whether a declaration-time guarantee over parameter ranges is worth the interval reasoning it needs
  ("Typed template bodies", above). Still open; [`template-simplification.md`](template-simplification.md) is a
  separate proposal against the Revision 39 draft, not started.
- **Reading a resolved form by the algorithm over its own entries** (sub-step 5f's remainder), and with it
  **re-resolving a resolved form to itself** as a second fixture check. Still open.
- **Whether a circular dependency through an import is the same error as one within a document.** Still open. As
  built, an import is ready before a document's resolution starts, so a wait never crosses one; Revision 38 refuses a
  cycle through `!!import` by [TSON-DATA] §2.2.3.
- **Lexical scope, synthetics homed by the innermost map, and who may contribute to an open map.** Open in
  [SPEC-FEEDBACK.md #14](../SPEC-FEEDBACK.md).
- **`extern`**, a schema-driven external form: deferred.
