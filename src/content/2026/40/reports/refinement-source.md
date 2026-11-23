---
title: "Refinement source: the source of ^ is a declared name"
description: "One refusal: an application written at a ^ source is a resolver error, and is refined through the declaration that names it. This removes a case where a schema's resolved output depended on the order of two unrelated declarations. Open construction later took record ^ out altogether."
against: "TSON 2026 Revision 39 (Working Draft)"
status: "Landed in Revision 40 with the parametric records; record ^ then went with open construction"
id: "CR-refinement-source"
---

# Refinement source: the source of `^` is a declared name

**Status: a proposal for Revision 40 (decided 2026-11-08), written against the Revision 39 draft. Not started.**
- **Proposes:** one refusal in [TSON-SCHEMA] §5.7. An application written at a `^` source is a resolver error; an
  application is refined through the declaration that names it.
- **Why:** the resolved output of one schema varied with the order of two unrelated declarations at a `^` source.
  Revision 39 change log #1 accepted resolution (a), an order-independent closing, which the first implementation has
  not built. The refusal removes the case.
- **Independent of** [`template-simplification.md`](/2026/40/reports/template-simplification): it follows from none of that
  proposal's rules and depends on nothing in it.
- **What happened:** nothing yet.
- **Where it would land:** [TSON-SCHEMA] §5.7 ¶860. It would replace change log #1's resolution (a).

**How to read the evidence.** ¶N names a paragraph of [TSON-SCHEMA] by its line in the Revision 39 draft of Part 2 as it
stood on 2026-11-07. The code size was measured on the first implementation, and is named by what the component does.

## 1. The rule

The source of `^` is a declared name. `x => box<text> ^ { … }` is a resolver error; the author writes
`tb => box<text>` and then `x => tb ^ { … }`.

**What still works.** An application applied to the declaration's own parameters (`<T> box<T> ^ { … }`) is absorbed
as a composition operand is, as in the draft.

## 2. Why

Revision 39 change log #1 accepted resolution (a): the resolved output of one schema varied with the order of two
unrelated declarations at a `^` source, and the fix is an order-independent closing the first implementation has not
built. In the draft `x` is IS-A `box` and `tb` with nothing minted, or IS-A a minted synthetic with a second entry for
`tb`, depending on which of two unrelated declarations comes first.

With the source a declared name, there is one entry for the application, the declaration, and nothing to close at the
source.

## 3. What it removes

- The resolver's closing of an application found at a refinement source (about 22 lines), and the application branch
  of resolving a refinement source.
- The on-demand publishing that exists so that a source's fields are readable the next step.
- The sentence in §5.7 ¶860 admitting "an *applied* record template" as a source.

## 4. What is lost, and how to write it instead

| Lost spelling | Replacement |
|---|---|
| `x => box<text> ^ { … }` | `tb => box<text>`, then `x => tb ^ { … }`: one more name per refined application |
| `created => response<order> ^ { status?: = 201 }` | `created => response<order> & { status?: = 201 }`: composition takes an application as an operand, and §5.7 allows required → injected and FREE → FIXED |

## 5. Proposed spec text

For §5.7 ¶860:

> The source of `^` is a name. An application at the source is a resolver error, except one applied to the
> declaration's own parameters, which is absorbed as a composition operand is (§5.8); an application is refined
> through the declaration that names it.

## 6. Order of work

Small, and independent of everything: it can land before any step of
[`template-simplification.md`](/2026/40/reports/template-simplification) §7.
