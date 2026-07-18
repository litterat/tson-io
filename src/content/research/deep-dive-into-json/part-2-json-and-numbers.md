---
title: "A Deep Dive into JSON: Part 2. JSON & Numbers"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 2
description: >
  JSON's number representation was designed to align with JavaScript's number model which maps directly to IEEE 754 double-precision numbers and is easily readable in web browsers.
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-2-json"
originalDate: 2025-07-16
abstract: >
  JSON's number representation was designed to align with JavaScript's number model which maps directly to IEEE 754 double-precision numbers and is easily readable in web browsers. However, as JSON's application has evolved outside the browser, this simple design now creates challenges for applications requiring mathematical precision when using programming languages that support a wider range of mathematical values. This article examines JSON's numeric grammar, explores the broader mathematical concept of numbers, and investigates how the gap between mathematical ideals and computational realities affects data interchange formats and programming languages. By understanding these constraints, we can better evaluate the trade-offs inherent in any text-based numeric representation, and possibly come up with some new designs.
---

# **A Deep Dive into JSON: Part 2\. JSON & Numbers**

**Abstract:** JSON's number representation was designed to align with JavaScript's number model which maps directly to IEEE 754 double-precision numbers and is easily readable in web browsers. However, as JSON's application has evolved outside the browser, this simple design now creates challenges for applications requiring mathematical precision when using programming languages that support a wider range of mathematical values. This article examines JSON's numeric grammar, explores the broader mathematical concept of numbers, and investigates how the gap between mathematical ideals and computational realities affects data interchange formats and programming languages. By understanding these constraints, we can better evaluate the trade-offs inherent in any text-based numeric representation, and possibly come up with some new designs.

## **Numbers**

The humble number is a big subject when involving data interchange formats such as JSON. The data format sits between the real world of modelling of numbers that include units and constraints and the programming language which must interpret the data into its internal representation. In the case of human readable text-based data formats, the number value representation also needs to be elegant and concise so that both humans and machines can quickly write and understand the value represented. This article digs deep into the rabbit warren of this subject and explores the gap between JSON and the wider list of real-world number formats. Along the way, we will have to make some decisions about what is a value and how much information a data format contains.

## **JSON's Number Grammar: The Foundation**

It's interesting to first acknowledge that other than boolean values (more on that in the future), JSON only defines numbers as a first class value; a string being the universal value container. So from this point of view, it is an important element of the JSON data format. JSON was derived from JavaScript's numeric literal format which in the 3rd edition included hex notation. However, Crockford's "The Fat-Free Alternative to XML" states:

"A number can be represented as integer, real, or floating point. JSON does not support octal or hex because it is minimal. It does not have values for NaN or Infinity because it does not want to be tied to any particular internal representation. Numbers are not quoted. It would be insane to require quotes around numbers."

Right from the beginning, JSON was restricted to the most basic of number types, deciding to remove octal and hex that was supported in early versions of JavaScript. While I wouldn't use the specific words that "It would be insane to require quotes around numbers", I understand the goal and requirement to differentiate numbers from strings. However, using quotes would have made the format consistent and deferred the number format issue to an external plugin like UUID or URLs and allow less lock-in to the early representations of JavaScript. Instead, JSON requires that known number formats do not require quotes, while unknown numbers formats do require quotes and their own specific parsers.

Without octal and hex, the JSON specifications ([RFC8259](https://datatracker.ietf.org/doc/html/rfc8259) and ECMA-404), defines numbers with a simple grammar:

```abnf
number        = [ minus ] int [ frac ] [ exp ]
decimal-point = %x2E  ; .
digit1-9      = %x31-39  ; 1-9
e             = %x65 / %x45  ; e E
exp           = e [ minus / plus ] 1*DIGIT
frac          = decimal-point 1*DIGIT
int           = zero / ( digit1-9 *DIGIT )
minus         = %x2D  ; -
plus          = %x2B  ; +
zero          = %x30  ; 0
```

This grammar allows for:

```
integer: 42
negative: -17
zero: 0
decimal: 3.14159
scientific: 2.5e-4
large: 1.23E+10
precise: 0.123456789012345
```

Some of the obvious omissions that the grammar does not allow:

```
leading_zero: 007       Leading zeros forbidden
positive_sign: +42      Positive signs not allowed
decimal_only: .5        Must have digit before decimal
trailing_decimal: 42.   Must have digit after decimal
hex: 0xFF               Only base-10 supported
infinity: -Infinity     No special values
not_a_number: NaN       No special values
```

One of the commonly cited criticisms of JSON is that it doesn't provide representation for mathematical concepts standard in IEEE 754, Infinity, NaN (Not a Number) or signed 0\. [JSON5](https://json5.org/) and [YAML](https://yaml.org/) both provide support. Programming languages also provide support for these concepts. While it probably made sense to "not be tied to any internal representation", it seems clear that these special values have use beyond the IEEE 754 internal representation.

A big advantage of a textual representation over binary data formats is that we don't have to think about the internal binary representation of the number until we're reading it later. An integer can be as large as required without being concerned with if it will fit into a 16-bit integer or an unsigned 32-bit integer. The question of range restrictions are better suited to schemas, so from a purely data representation point of view, text has the advantage of deferring that decision until later. Deferring decisions and making problems out of scope is often a legitimate and smart decision choice for data interchange.

## **The Mathematical Universe**

Let's zoom out and look at the mathematical universe. The point of having numbers represented in data-interchange is to exchange information about the world. From that point of view it is worth understanding the various types of numbers and seeing how they are represented in text. For each of the different number types, the article will investigate the common text representation and how other data formats and programming languages support them.

Wikipedia provides a comprehensive [list of number types](https://en.wikipedia.org/wiki/List_of_types_of_numbers); for this exploration, we'll focus on the main types up to Complex numbers. The Wikipedia page also lists Hyper complex numbers (quarternion, octonions, etc) and p-adic numbers. I have not observed direct support for those numbers in programming languages, so I haven't explored them in this article. Of course, I'd be curious to learn in the comments if you have real-world applications needing these formats.

![](/images/deep-dive-into-json/part-2-json-and-numbers-image1.png)

### **Natural Numbers (ℕ) Whole Numbers (𝕎) & Integers (ℤ)**

Natural numbers, whole numbers, and integers all fall into the integer number plane which as software engineers were very comfortable. While there's limits to our ability to store very large values (beyond ±2^128), we can safely say that when using base-10, the text based representation is well defined and supported.

In software engineering other bases are also important, hex, octal and binary are often used for binary specific integers. In addition, while there are [different methods of representing these numbers](https://en.wikipedia.org/wiki/Hexadecimal) in different languages, a common representation used in C is a prefix of '0x','0o','0b' for hex, octal and binary (note: lineage and history of text syntax is something that will be explored in greater detail later.) There's plenty of situations where support for these formats in data interchange formats would be useful. While JSON does not support this syntax, JavaScript and many other programming languages do.

While JSON only supports base-10 integers, many other formats support hex, octal and maybe less common binary notation. YAML supports hex and octal. JSON5 supports hex. Amazon Ion supports binary and hex but not octal. The syntax for these are well defined, and it would be useful to have a more exhaustive list available in future data formats.

**Examples:** \-11539853, \-10, 0, 123, 0xFABECAFE, 0b00110101, 0o1723

### **Rational Numbers (ℚ): {p/q where p, q ∈ ℤ, q ≠ 0}**

Numbers expressible as fractions, providing exact representation for many real-world quantities. Rational numbers are not directly supported by many programming languages and a decimal approximation is usually stored instead (e.g. ⅓ as 0.3333…). However, there are programming languages where Rational numbers are directly supported in their standard libraries (e.g. Python, Julia, Clojure, and Ruby).

This is one example where JSON and many other data-exchange formats do not support the number type directly. This is likely because in most cases, the decimal value is good-enough and a string can be used where it is not. For instance, a recipe might call for "⅓ of a cup of flour", and the receiver is always going to be a human reader, so storing the value directly as a rational number is not required. However, there are likely use cases where rational numbers would be required.

The Julia programming language directly supports rational literals using "1//3" syntax (double '/'), while Haskell uses %, e.g. 1%3. Ruby uses a 'r' suffix, e.g. 1/3r. These modifications are required as there needs to be a distinction between a function that performs division vs a literal value that conserves the denominator and numerator. For a data format that doesn't deal with resolving expressions, it is possible to use the most basic format for rational numbers e.g. 1/3. It would be up to the receiver to either store the value as a rational value or resolve the expression to a decimal value and accept any rounding issues.

I've been unable to find a data format that has direct support for rational numbers. This isn't surprising as there's few programming languages with native support. Where native support isn't available, a new construct would be required or an approximation would need to be calculated. Ever built an application that required rational numbers in your data interchange? How did you solve it?

**Examples:** 1/3, 22/7, \-5/8

### **Irrational Numbers**

Irrational numbers are those that cannot be expressed as simple fractions, with non-terminating, non-repeating decimal expansions. These are further examples of those edge cases where keeping close enough representations as decimal (e.g. π as 3.145…) has been good enough. There's also been the issue that historically, we've really been limited to ASCII, numbers such as π are often "pi" instead. However, with Unicode and UTF8 as standard, those restrictions are lifted, so it would seem there's no reason not to allow π as a value.

The problem with irrational numbers is that they open the door to expressions. It would be rare to store just the value π. Instead, it might be 2π/5 which would not easily be stored in memory as a rational number without converting π and performing a multiplication and storing the estimated result. A full mathematical expression syntax is definitely out of scope for a data format. Other than scientific notation using e, I'm having trouble coming up with a reason that a data format would need to represent irrational numbers. If you have any, please let me know.

**Examples:** π, e, √2, φ (golden ratio)

### **Real Numbers (ℝ)**

The complete set of rational and irrational numbers, representing all points on the number line. Developers are used to storing these in single-precision or double-precision IEEE-754 floating point numbers. However, that may not always be the case. There are other methods being developed such as [posits](https://en.wikipedia.org/wiki/Unum_\(number_format\)) which might be used in future.

Within Real numbers there's also a few sub-classifications and formats that as software engineers are important. The most important is decimal numbers with a specified precision. For many solutions, it is often important to require a specific number of decimal places.

A very common method of expressing a real number is with [scientific notation](https://en.wikipedia.org/wiki/Scientific_notation), e.g. 1.6e-35. More recently, a number of programming languages like C, [Go](https://go.dev/ref/spec#Floating-point_literals), Julia and [Java](https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html#jls-3.10.2) have also supported hexadecimal floating point notation, e.g. 0X1.1FFFP-16. However, the more common scientific decimal notation is 3.5×102. Historically, with most data formats using ascii, it was difficult to support superscript integers required by this format, however, Unicode has support for superscript numbers and there's no reason such support couldn't be provided in a modern data format.

With JSON and many other data formats supporting the standard formats (e.g. 4.12 and 1.6e-35), this format and grammar is quite ubiquitous. The hex format which can be useful to alleviate rounding issues (e.g. 0x2.p10) could become more useful. Finally, the common scientific decimal notation (e.g. 10x103) could also be favoured where the data is being generated. Of course, when manually typing the super-script becomes an irritant.

Finally, ∞, \-∞, NaN (Not a Number) are concepts that were more associated with IEEE-754 floating point numbers. JSON5, YAML, and various other formats have chosen to support these. Often using a prefix period (e.g. \-.inf or .NaN); this is useful to keep these values as part of the number format grammar and not leak the values into the wider syntax.

**Examples:** 4.12, 1.123244523, \-1232.23432, 1.6e-35, 2e+2, 0x2.p10, 10x103

### **Imaginary and Complex Numbers (ℂ)**

Numbers of the form a \+ bi where i² \= \-1, essential for advanced mathematics and engineering. Other than using a custom string format, no data-interchange formats directly support complex numbers. However, languages like Python and Julia fully support complex number syntax as literals. The syntax for these are well established, with the suffix being either an i or j.

**Examples:** 3+4i, \-2i, 5+0j

## **Trends, thoughts and insights**

One of the trends I noticed in exploring the various number formats, is that support for more number types is becoming common in programming languages. With the rise of AI, Python is now the most widely used programming language and has built-in support for both rational and complex numbers. However, there's no data formats that provide support for either rational or complex numbers directly.

An interesting bias that I've also noticed while exploring number formats is the [decimal separator](https://en.wikipedia.org/wiki/Decimal_separator). Half the world uses commas as their decimal separator (i.e. 1234,56), while in data formats and programming languages the period is standard (i.e. 1234.56). While we can say that using period has more precedence, I wonder if there are requirements to use more localised number formats in data formats like JSON. A big problem with allowing a coma is that the coma is already an important element in JSON and used in objects and arrays. What does ‘\[ 1234,56 \]’ represent? A single decimal number in an array or two integers in an array? As these articles go further the shortage of ascii special characters (e.g. \~\!@\#$% etc) becomes an important element in deciding the syntax for text-based data formats.

As irrational numbers get involved the line between value and mathematical expression starts to get blurred. There’s likely situations where more complex expressions are required, but the line between more general utility data format to specialist requirements must be made. For mathematical expressions, there is at least one draft standard; [UnicodeMath](https://www.unicode.org/notes/tn28/) provides very comprehensive Unicode expressions.

It is often cited that to reduce implementation complexity, less number formats are supported by data formats. Crockford's quote "JSON does not support octal or hex because it is minimal" is a good example of this. However, these data interchange formats become the fabric of information exchange; the software, while minimal, simply pushes the issue further up the stack. It also goes against Crockford’s own point that “insane to require quotes around numbers”, but JSON requires quotes for any numbers that don’t fit its restrictive grammar.

There's a real gap between what JSON provides (and most other data formats) and the direction of programming languages. There's also differences between various programming languages with regard to how various non-standard number types are represented. It is useful to recognise these gaps and make a conscious decision about what formats should be natively supported and those that should be optional.

## **A Unicode Number Format standard?**

Having consistent number formats make it easier for developers to implement and agree on data formats. It reduces fragmentation and increases overall productivity as the libraries become more available. Much to my surprise, there isn't a well defined grammar for the various number formats beyond those embedded in programming languages. To close this gap, it might be useful to define a Unicode Number Formats RFC. The idea would be that it provides another building block along with existing standards of date/time (RFC 3339), UUIDs (RFC 9562), and base64-encoded binary data (RFC 3548\) to include a wide range of standardised number formats. Similar to date/time and UUIDs, these would be encoded into JSON strings (the universal value carrier), or provide the basis for future data interchange formats.

The aim of the standard would be to provide standard grammars for the following:

* **Integer:** Arbitrary-precision signed integers (binary, octal, decimal and hex notations)  
* **Float:** Decimal or hexadecimal with scientific notation (3.14159, 6.02e23, 6.02×10²³ or 0x1.99ap-4)  
* **Rational:** Exact fractional representation (a/b)  
* **Complex:** Values of the form a+bi or a+bj  
* **Special:** IEEE-style ∞, \-∞, NaN, and signed zeros

Expressions, constants (like π), and functions (like ln, exp) would not be included, to maintain a pure value-focused format. These formats/grammars are already deeply embedded in data formats and programming languages. Creating a separate RFC/standard would allow libraries and formats to show compliance in the same way that libraries conform to [iso8601](https://en.wikipedia.org/wiki/ISO_8601) date/time formats.

## **Conclusion**

JSON's numeric representation is mainly a reflection of JavaScripts capabilities of the time. As such, JSON prioritized simplicity and JavaScript compatibility over mathematical completeness. While it is likely true that JSON’s format covers 90% (my estimate) of use cases, the mathematical universe of numbers extends far beyond JSON's IEEE 754 foundation, encompassing exact fractions, complex numbers, arbitrary precision arithmetic, and specialized representations essential for financial, scientific, and systems programming applications. The gap between mathematical ideals and computational realities creates fundamental constraints that any text-based data format must navigate. It creates an artificial line between unquoted and quoted formats.

In exploring the gap between JSON's number formats and more recent programming languages like Python and Julia, it is clear there's a need for support for a wider range of number formats. However, in JSON and many other formats, there is limited if any support for relational and complex numbers. In addition, there's also no agreed grammar or textual representation for these number formats.

To close the gap, it might be useful to define a standard that covers a wider range of number formats that can be encoded using Unicode/UTF8. This is something to consider in building a new data format design. It is also worth considering how more complex non-standard formats might be supported without quotes, as once again, “it would be insane to require quotes around numbers”.

As further concepts of JSON are explored, this idea of what requires quotes and what doesn’t will continue to be an ever present issue. That’s the first of JSON’s three atomic value formats done. The next topic will continue the exploration of JSON value types and explore the boolean type and the wider issue of enum types.

