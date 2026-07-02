---
title: "Unicode Number Format (UNF)"
draft: "1.1"
status: "Request for Comments (RFC)"
description: >
  A minimal, expressive, representation-preserving format for mathematical values — arbitrary
  precision, exact rationals, complex numbers, signed infinities — developed alongside the TSON
  specification and referenced by its numeric type vocabulary.
---

# **Unicode Number Format (UNF)**

**Version:** Draft 1.1
**Status:** Request for Comments (RFC)
**Last Updated:** March 2026
**Authors:** Litterat Pty Ltd
**License:** CC BY-SA 4.0

---

## **Purpose**

The Unicode Number Format (UNF) defines a minimal, expressive, and representation-preserving format for representing mathematical **values**—not formulas or expressions. It is designed to support long-term data interchange, archival, auditing, and cross-platform interoperability.

UNF emphasizes:

* **Lossless numeric representation**

* **Representation-preserving syntax** — UNF preserves the written form; the consuming type decides what is significant

* **Strict separation between values and expressions**

* **Precision by construction** (not by suffix)

It is suitable for systems that require mathematical exactness, human readability, and future-proof interoperability.

---

## **Encoding and Character Set**

* All representations are **UTF-8 encoded**.

* Unicode mathematical symbols (e.g., `∞`, `⁰`, `×`, `⁻`) are used directly.

* Normalization follows **Unicode NFC** (Normalization Form Canonical Composition). NFC is used rather than NFKC because NFKC compatibility decomposition would collapse superscript digits to their ASCII equivalents (e.g., `²` → `2`), destroying the semantic distinction between `10²³` (an exponent) and `1023` (a plain integer). NFC preserves superscript characters as distinct code points while ensuring that characters with multiple canonical representations are treated identically.

* Parsers must accept UTF-8 and interpret Unicode symbols accurately.

---

## **Supported Number Types**

| Type | Description |
| ----- | ----- |
| **Integer** | Arbitrary-precision signed integers |
| **Float** | Decimal or hexadecimal with scientific notation |
| **Rational** | Exact fractional representation (`a/b`) |
| **Complex** | Values of the form `a+bi` or `a+bj` |
| **Special** | IEEE 754-style `.inf`, `∞`, `.nan`, and signed zeros |

Expressions, constants (like `π`), and functions (like `ln`, `exp`) are **explicitly excluded** to maintain a pure value-focused format.

---

## **Core Grammar Rules**

number ::= complex | real\_number | rational | special\_value

real\_number ::= integer | float

complex ::= real\_number? sign imaginary\_part
          | real\_number

imaginary\_part ::= float\_number? imaginary\_unit
                 | decimal\_digits imaginary\_unit

imaginary\_unit ::= "i" | "j"

integer ::= decimal\_integer | hex\_integer | octal\_integer | binary\_integer

decimal\_integer ::= sign? decimal\_digits

hex\_integer ::= sign? "0x" hex\_digits

octal\_integer ::= sign? "0o" octal\_digits

binary\_integer ::= sign? "0b" binary\_digits

float ::= sign? float\_number

float\_number ::= decimal\_float | hex\_float

decimal\_float ::= decimal\_digits "." decimal\_digits? exponent?
                | decimal\_digits exponent
                | "." decimal\_digits exponent?

hex\_float ::= "0x" hex\_digits "." hex\_digits? hex\_exponent?
            | "0x" hex\_digits hex\_exponent
            | "0x" "." hex\_digits hex\_exponent?

rational ::= sign? decimal\_digits "/" positive\_decimal\_digits

special\_value ::= signed\_infinity | nan | signed\_zero

signed\_infinity ::= sign? ("." ("inf" | "infinity") | "∞")

nan ::= ".nan" nan\_payload?

nan\_payload ::= "#" hex\_integer

signed\_zero ::= sign "0.0"

**Note on special value syntax:** Special values use a dot prefix (`.inf`, `.nan`) to ensure they are syntactically part of the number format grammar rather than claiming identifier keywords. This follows the precedent established by YAML 1.2's Core Schema. The dot prefix means host format dispatch is purely character-based — no keyword matching is needed. The Unicode `∞` (U+221E) is an alternative to `.inf` and `.infinity`. Special value names are **lowercase only** — `.Inf`, `.NaN`, `.INF` are not valid. This ensures a single canonical representation.

**Note on pure imaginary values:** A pure imaginary value (one with no real component) MUST include an explicit coefficient. `1i`, `+1i`, and `-1i` are valid; bare `i` or `j` is NOT valid. This prevents ambiguity with identifiers in host formats where `i` and `j` are commonly used as variable names.

---

## **Type-Specific Entry Points**

The following entry points define constrained subsets of the UNF grammar for use in schema bindings and built-in type annotations in host formats such as TSON.

int32 ::= decimal\_integer         \# must fit in 32-bit signed range

int64 ::= decimal\_integer         \# must fit in 64-bit signed range

uint32 ::= decimal\_digits         \# no sign, must fit in 32-bit unsigned

uint64 ::= decimal\_digits         \# no sign, must fit in 64-bit unsigned

bigint ::= decimal\_integer        \# explicit arbitrary precision

float32 ::= float                 \# IEEE 754 single precision
          | special\_value

float64 ::= float                 \# IEEE 754 double precision
          | special\_value

decimal ::= float | decimal\_integer

rational\_type ::= rational

complex64 ::= complex             \# where components fit in float32

complex128 ::= complex            \# where components fit in float64

\# Composite Types

numeric ::= int64 | float64

real ::= integer | float | special\_value

exact ::= integer | rational | decimal

---

## **Lexical Elements**

sign ::= "+" | "-"

decimal\_digits ::= decimal\_digit (separator? decimal\_digit)\*

hex\_digits ::= hex\_digit (separator? hex\_digit)\*

octal\_digits ::= octal\_digit (separator? octal\_digit)\*

binary\_digits ::= binary\_digit (separator? binary\_digit)\*

positive\_decimal\_digits ::= positive\_decimal\_digit (separator? decimal\_digit)\*

decimal\_digit ::= \[0-9\]

positive\_decimal\_digit ::= \[1-9\]

hex\_digit ::= \[0-9a-fA-F\]

octal\_digit ::= \[0-7\]

binary\_digit ::= \[0-1\]

separator ::= "\_"

exponent ::= \[eE\] sign? decimal\_digits
           | "×" "10" superscript\_integer

hex\_exponent ::= \[pP\] sign? decimal\_digits

superscript\_integer ::= sign? superscript\_digit+

superscript\_digit ::= \[⁰¹²³⁴⁵⁶⁷⁸⁹\]

---

## **Semantic Rules and Constraints**

1. **Underscores**:

   * Cannot appear at the start or end of a digit sequence

   * Cannot be adjacent to signs, decimal points, or base prefixes (`0x`, `0o`, `0b`)

   * No multiple consecutive underscores

   * The underscore separator is for readability only and does not affect the numeric value

2. **Rationals**:

   * Always in reduced form

   * Denominator must be positive and nonzero

   * Sign is normalized to numerator

3. **Floats**:

   * Scientific notation can be ASCII (`e`) or Unicode (`×10ⁿ`)

   * Hex floats use binary exponent via `p`

4. **Complex Numbers**:

   * Must be real \+ imaginary or just imaginary with explicit coefficient

   * Imaginary unit: `i` (math) or `j` (engineering)

   * Bare `i` or `j` without a coefficient is not valid

5. **Special Values**:

   * Infinity: `.inf`, `.infinity`, or `∞` (U+221E), with or without leading sign

   * NaN: `.nan` with optional hex payload using `#` separator (e.g., `.nan#0xDEAD`)

   * Signed zeros distinguish `+0.0` and `-0.0`

   * All special value names are **lowercase only** — `.Inf`, `.NaN`, `.INF` are not valid

   * The dot prefix prevents collision with identifiers in host formats

   * Semantics follow IEEE 754-2019 (ISO/IEC 60559:2020); text representation follows YAML 1.2 Core Schema dot-prefix convention

6. **Defaults**:

   * Numbers without range overflow → int32/int64

   * Floats default to IEEE 754 double (64-bit)

   * Very large integers default to arbitrary precision

---

## **Host Format Integration**

UNF is designed to be embedded in host data formats (such as TSON, JSON extensions, or other text-based interchange formats). This section defines the interface contract between UNF and a host format's value resolution system.


### **First-Character Dispatch**

A host format can determine whether a token is a UNF candidate using a first-character check. A token is a UNF number candidate if and only if:

* Its first character is an ASCII digit (`0`–`9`), OR
* Its first character is a sign (`+` or `-`), OR
* Its first character is a decimal point (`.`), OR
* Its first character is the infinity symbol (`∞`, U+221E)

If the first character does not match any of these conditions, the token is **not a number** — no further UNF parsing is attempted. This provides O(1) dispatch for host formats.

The dot-prefix convention for special values (`.inf`, `.nan`) is what makes this dispatch purely character-based. There are no keyword exceptions — the `.` start character routes all special values through the same entry point as `.5` or other decimal-start floats.


### **Internal Resolution Priority**

When a token is dispatched to UNF, the parser MUST attempt to match in the following order. The first successful match determines the type:

1. **Special values** — `.nan` (with optional `#` payload), `.inf`/`.infinity`/`∞` (with optional sign), signed zeros
2. **Hex/octal/binary integer** — tokens starting with `0x`, `0o`, `0b` after optional sign
3. **Rational** — decimal digits followed by `/` followed by positive decimal digits
4. **Complex** — a real component followed by `+` or `-` and an imaginary component ending in `i` or `j`
5. **Float** — decimal digits with a decimal point or exponent (ASCII or Unicode), or hex float with `p` exponent
6. **Integer** — decimal digits with optional sign

If a token matches the first-character dispatch but fails all UNF patterns, the host format should treat it as a non-number (typically falling through to string resolution). For example, `.hidden` starts with `.` and passes the first-character check but does not match any UNF pattern — it falls through to string.


### **Lexer Requirements**

For a host format to support the full UNF grammar as single tokens, the host format's lexer must permit the following characters within value tokens:

* ASCII digits, letters (for `e`, `E`, `p`, `P`, `x`, `o`, `b`, `i`, `j`, `a`–`f`, `A`–`F`, `n`, `f`, `y`)
* Signs (`+`, `-`)
* Decimal point (`.`)
* Forward slash (`/`) for rationals
* Hash (`#`) for NaN payloads
* Underscore (`_`) for digit separators
* Infinity (`∞`, U+221E)
* Multiplication sign (`×`, U+00D7)
* Superscript digits (`⁰¹²³⁴⁵⁶⁷⁸⁹`)
* Superscript signs (`⁺⁻`)

Note that letters appear in multiple roles: `e`/`E` and `p`/`P` for exponents, `x`/`o`/`b` for base prefixes, `i`/`j` for imaginary unit, `a`–`f`/`A`–`F` for hex digits, and `inf`/`infinity`/`nan` for dot-prefixed special values. Since special values start with `.`, they enter the lexer through the decimal point path, not as identifier keywords.

Host formats that do not include all of these in their token character set may support a subset of UNF. At minimum, a host format claiming UNF support MUST handle: decimal integers, decimal floats with ASCII scientific notation, and the special values `.inf`/`.infinity`/`∞` and `.nan`.

---

## **Examples**

42                      \# integer

1\_000\_000              \# underscore for readability

0xFF                   \# hex integer

0b1010\_1010            \# binary

3.14159                \# float64

6.02e23                \# scientific notation

6.02×10²³              \# Unicode notation

1.602×10⁻¹⁹           \# Unicode with negative exponent

0x1.999999999999ap-4   \# exact binary float (0.1)

22/7                   \# rational

\-355/113               \# negative rational

3+4i                   \# complex

\-1.5-2.7j              \# complex in engineering format

1i                     \# pure imaginary (explicit coefficient required)

.inf                   \# positive infinity

\-.inf                  \# negative infinity

∞                      \# Unicode positive infinity

\-∞                     \# Unicode negative infinity

.nan                   \# not a number

.nan#0xDEAD            \# NaN with payload

---

## **Representation, Equivalence, and Parsing**

UNF is a **representation-preserving** format. The written form of a number is preserved as-is by the parser. UNF does not normalize, canonicalize, or strip information from numeric text. The significance of trailing zeros, choice of notation, and precision are determined by the consuming type or application — not by UNF.

### **Representation Preservation**

The following aspects of a number's written form are preserved:

* **Trailing zeros.** `3.0`, `3.00`, and `3.000` are distinct representations. A consuming `decimal` type may treat them as having different scale (e.g. Java's `BigDecimal("3.00")` has scale 2). A consuming `float64` type may discard the distinction (IEEE 754 does not distinguish `3.0` from `3.00`). UNF preserves what was written; the consuming type decides what is significant.

* **Notation choice.** `6.02e23` and `6.02×10²³` are both valid representations of the same value. UNF preserves whichever form was written.

* **Base prefix.** `255`, `0xFF`, `0o377`, and `0b11111111` represent the same integer but are distinct representations. The choice of base is preserved.

* **Underscore separators.** `1000000` and `1_000_000` represent the same value. The presence and placement of underscores is preserved.

### **Parsing Equivalence**

While representations are preserved as text, different representations of the same mathematical value MUST parse to the same numeric value when interpreted by a consuming type. This is a requirement on parsers, not on the text format:

* `6.02e23` and `6.02×10²³` MUST produce the same numeric value.

* `255`, `0xFF`, `0o377`, and `0b11111111` MUST produce the same integer value.

* `1000000` and `1_000_000` MUST produce the same value (underscores are stripped during parsing).

* `+42` and `42` MUST produce the same integer value.

The distinction between representation preservation and parsing equivalence is: "these are the same number" (yes, always — the parser must agree) vs "these are the same text" (no, not necessarily — the written form is preserved).

### **Grammar-Level Canonicalization**

A small number of syntactic rules are canonical at the grammar level — these are not value semantics but lexical requirements that ensure unambiguous parsing:

* Special values are always lowercase: `.inf`, `.infinity`, `.nan`. No mixed-case or uppercase forms are valid.

* Unicode superscripts map to their integer equivalents for numeric interpretation: `²³` parses as the integer 23 in an exponent position.

* NaN payloads use `#` as the separator between `.nan` and the hex value: `.nan#0xDEAD`.

* Rationals are in reduced form with a positive denominator: `4/6` is not valid; `2/3` is.

---

## **Out of Scope**

* No schema bindings; types are enforced externally

* No mathematical expressions, constants (π, e), or functions

* No unit annotations or unit semantics — unit association is the responsibility of the host format (e.g., via type annotations or metadata annotations in formats like TSON)

---

## **Normative References**

* **IEEE 754-2019** (also published as ISO/IEC 60559:2020) — Defines the mathematical semantics of infinity, NaN, signed zeros, and floating-point arithmetic. UNF's special values carry IEEE 754 semantics. Note that IEEE 754 §5.12 leaves text representation as implementation-defined; UNF provides a canonical text representation.

* **Unicode Standard, UAX #15** — Defines NFC (Normalization Form Canonical Composition) used by UNF for normalization.

* **YAML 1.2 Core Schema** — Precedent for the dot-prefix notation (`.inf`, `.nan`) for special floating-point values. UNF extends this convention with NaN payloads (`.nan#hex`).

* **RFC 4648** — Defines hexadecimal digit encoding used in hex integers, hex floats, and NaN payloads.

---

## **Intended Uses**

* Scientific data interchange and archival

* Financial systems needing exact numeric interchange

* Cross-language platform communication

* Logging or debugging tools needing lossless numerics

* Base numeric type resolution in text-based data formats (e.g., TSON §8)

---

This draft is now ready for community review and tooling experiments.
