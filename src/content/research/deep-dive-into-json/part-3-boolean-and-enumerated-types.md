---
title: "A Deep Dive into JSON: Part 3. Boolean & Enumerated types"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 3
description: >
  JSON's boolean type is one of only three atomic value types in JSON; numbers (explored in [Part 2](/research/deep-dive-into-json/part-2-json-and-numbers), and strings to be explored later). It is also the format's only supported enumerated type.
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-3-boolean"
originalDate: 2025-07-24
abstract: >
  JSON's boolean type is one of only three atomic value types in JSON; numbers (explored in [Part 2](/research/deep-dive-into-json/part-2-json-and-numbers), and strings to be explored later). It is also the format's only supported enumerated type. This article examines the JSON boolean type and the broader concept of enumerated types (e.g. categorical data, and finite value sets) in data interchange formats. It explores the general concept of enum types and how they differ from string types, and investigates the potential benefits of making them distinct from strings.
---

# **A Deep Dive into JSON: Part 3\. Boolean & Enumerated types**

**Abstract:** JSON's boolean type is one of only three atomic value types in JSON; numbers (explored in [Part 2](/research/deep-dive-into-json/part-2-json-and-numbers), and strings to be explored later). It is also the format's only supported enumerated type. This article examines the JSON boolean type and the broader concept of enumerated types (e.g. categorical data, and finite value sets) in data interchange formats. It explores the general concept of enum types and how they differ from string types, and investigates the potential benefits of making them distinct from strings.

## **Introduction**

After exploring JSON's number representation in Part 2, we turn to what might seem like the simplest of JSON's value types: the boolean. At first glance, true and false appear straightforward, simple binary true or false values. Similar to numbers they deserve to be first class citizens of JSON. However, booleans are, fundamentally, a two-value enumeration, making them JSON's only native enum type. This special status raises the question, if JSON can support unquoted enum values for the specific case of booleans, why not for the general case of arbitrary enumerations?

In real-world applications, enumerated types are ubiquitous. Order statuses progress through "pending", "processing", "shipped", and "delivered". API responses return "success" or "error". Priority levels range from "low" through "critical". Yet JSON provides no native mechanism for representing these finite, well-defined value sets from arbitrary strings. Instead, developers must choose between string values or numeric codes.

This article dives deep into the concept of enumerated types and how a text based data representation might better support them. The general theme with both [Part 2](/research/deep-dive-into-json/part-2-json-and-numbers) (numbers) and Part 3 (enums) is about separation of concerns. While it is possible to use strings and integers for enumerated types, it doesn't mean it is a good idea. So as data formats evolve, which data types deserve the right to be separated out as first class citizens. Let's see if Enums deserve a higher status.

## **The Boolean Type: JSON's Lone Enum**

JSON inherits its boolean literals directly from JavaScript, where true and false are reserved keywords. JavaScript however, does not natively provide support for enum types, instead [various methods](https://www.codecademy.com/resources/docs/javascript/enums) are used to create them. So it isn't surprising that when defining JSON, Crockford did not make an effort to include them. Instead, enum values are once again stored in strings, the universal value container. While this has been good enough, enum types are supported by most modern languages so there's definitely benefit to explore their usage.

For JSON, the specification is remarkably terse about booleans. RFC 8259 simply states:

"The literal names MUST be lowercase. No other literal names are allowed."

This brevity masks several important design decisions. JSON requires exact lowercase matching; True, TRUE, or 1 are not valid boolean values. There's no numerical coercion as many languages allow. Most significantly, booleans enjoy the privilege of being unquoted, creating a clear syntactic distinction between the boolean value true and the string value "true".

From a parser's perspective, this is interesting; when a JSON parser encounters an unquoted sequence of characters, it must:

1. Recognise it as an identifier (not a number or syntax error)  
2. Check if it matches one of the reserved values: true, false, or null  
3. Error if it doesn't match

The format recognises that {"active": true} is more elegant than {"active": "true"}. Yet this recognition stops at exactly three values. Crockford's quote that "It would be insane to require quotes around numbers" seems relevant here with regard to true, false and null values. This also aligns with many programming languages where these are reserved words.

## **Exploring Enums**

The idea of an [Enumerated type](https://en.wikipedia.org/wiki/Enumerated_type) is simple enough; there's a restricted set of values that represent a specific concept. The key characteristics are that the set is finite and each value in the set has a symbolic name (and is often backed by a numeric value). A very simple example would be low, medium and high to represent a priority. Originally in languages like the original C, Enums were not supported. Instead a developer would create a macro definition that would simply replace a value anywhere it was used. For example:

`#DEFINE LOW 1`  
`#DEFINE MEDIUM 2`  
`#DEFINE HIGH 3`

To increase type safety, many programming languages now natively support enums. C introduced them in 1989, while Java introduced them in Java 1.5 in 2004, and Python added them in Python 3.4 in 2014\. Inbuilt enums in programming languages assists in a number of ways. It allows compile-time checking that reduces runtime errors as well as clearer logic that can include exhaustiveness checking. For instance, in Java, a priority enum could be defined as:

`enum Priority { LOW, MEDIUM,HIGH }`

Java, like many other programming languages has the symbolic identifier (e.g. HIGH), but also includes an ordinal (i.e. integer value) and a string value representation. However, outside the world of compilers and the concept of type safety, each instance of a data file stands alone. Take for instance, this small JSON file:

`{ "priority": "high" }`

Without the use of a schema, it is impossible to determine that the priority value is an enum as distinct from a string. Also, and possibly more importantly, it is impossible to know how many priorities are available. It may be that "high" is the highest priority as per the previous low, medium and high example. It's possible that there is a "critical" priority or any number of other priorities in between. It's only by looking at many document examples, the program that generated the JSON document, or other specifications that the true set of possible values can be understood.

The other issue with enumerated values is that updating them requires that all readers are also updated to support new values. Take the previous example of priority having an initial set of three values. When "critical" is added to one writer of the format, all readers need to be updated or clients need to make reasonable choices for unknown values. If a client isn't updated it may reject the message, or use an incorrect default priority such as "low", when it receives the unknown "critical" value. These types of issues are out of scope for this article, but good to be aware.

One of JSON's major advantages over things like XML and XML Schema is the complexity of building out schemas without really fully understanding the problem. If I'm in a small team with a single code base, having "high" listed in a JSON file is the most obvious and simple choice. There's no need for a schema; a verbal agreement is completely fine. The "high" value would be a reflection of what was defined in the program. There's no need to go beyond that as a definition. As such, it is really quite an elegant solution to just state that "high" is one of the agreed enum values and leave it at that.

The flip side of keeping it simple, is that there's plenty of officially defined enums. For instance country codes ([ISO3166](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes)). These official enums change over time, so it is important to define which version of enums that are supported. Once again, this would normally fall to a Schema, a specification or the programming language libraries in use.

In summary, enumerated types have progressed from simple macro overlays on integers to becoming first class concepts in many programming languages. There's generally the three representations of an enum value; symbolic, integer and string. Outside the scope of the compiler it is harder to control or be aware of all the values of an enum type without supporting schemas or documentation. As a building block to data formats enumerated types are incredibly important, so there's value in recognising them in data formats.

## **How do other formats support Enums?**

There's a familiar tension between the implementation mechanics of using strings and integers and the high level concept of the set. In data interchange formats like JSON, we're forced to use strings and integers instead of having an independent concept that is distinct from both of these.

XML uses strings and supports enums through XML Schema definitions. This is similar to JSON Schema definitions of Enums. [JSON Schema](https://json-schema.org/understanding-json-schema/reference/enum) goes further than XML and allows any value to be included in an enum list. [ECON](https://ec-lang.org/econ/), a JSON derivative, includes unquoted values for enums. [EDN-Format](https://github.com/edn-format/edn) has the concept of symbols, that as per its specification should map to something other than strings, but doesn't define what that is. YAML doesn't distinguish between unquoted strings and quoted strings, so there's no distinction. There's little agreement about how to handle enum types in text-based file formats.

On the other hand, binary encoding systems default to using integer values. Protobufs is using a binary encoding that supports enums as encoded as integers. As an aside, their [discussion on closed versus open enums](https://protobuf.dev/programming-guides/enum/) is a great example of the issues with enumerated types in data communication. [Avro](https://avro.apache.org/docs/1.12.0/idl-language/) which relies on a schema also includes enums; Avro also includes the concept of a default value which is used when the value cannot be read. Avro, similar to Protobufs, uses integers for binary encoding. [ASN.1](https://www.oss.com/asn1/resources/asn1-made-simple/asn1-quick-reference/enumerated.html), also a schema supported system, also uses integers. It makes sense that these binary encoding systems use integers by default, they are more compact and closer to the implementation.

## **The YAML Norway problem**

In text representation it is worth calling out the YAML Norway problem. YAML supports unquoted strings, so enumerated types are not directly supported or distinct from strings. However it does allow numerous ways of writing [boolean values](https://yaml.org/type/bool.html) (e.g. Y, N, No, On, Off). The parser attempts to infer the intended type which leads to unintended surprises. Take for example this short YAML snippet:

`countries:`  
`- NO`  
`- SE`  
`- DK`

A developer might expect this to parse as three country codes: Norway, Sweden, and Denmark, but instead YAML interprets NO as a boolean false and the other two values as strings. In another example, a survey response might use the answers: Yes, No, and Maybe, but instead of maintaining them as strings, the parser once again interprets them as boolean true, false and the string "Maybe".

Based on the Norway problem, it is clear that having too many rules or inferences in a data format adds complications. So, from this perspective it is really useful that JSON only has three reserved words, true, false & null, and that it has limited inference.

## **A question of consistency**

Returning back to the boolean values of true and false. These are the most well recognised of enumerated values, however, we also treat a boolean as its own type that is distinct from other enumerated types. Syntactically, other enumerated types are unquoted values in many programming languages, so why not align these in data formats?

One argument against the alignment of using unquoted values is that it further complicates the format's syntax. It needs to continue to interpret three key words while allowing all other unquoted identifiers through as strings to be interpreted by a custom string to enum value. It would also need to disallow numbers at the start of the enumerated values to ensure they are not confused with numbers. As mentioned in Part 2, it is a good reason to keep .infinity for floating point values; the period before the name ensures it is parsed as a number instead of an enumerated value. But the counter is that allowing enumerated values just aligns booleans with all other enumerated values.

A second argument against using unquoted values is that without a schema, the values will be read into string values and then the application will need to convert the string into the appropriate enum value. If this conversion to string is happening anyway, why not continue to use string values? However, by allowing an enum type in the parser we also provide more information to the application and developer about the value. It's also likely that the parser design already supports reading identifiers that are checked against the existing true/false/null values. The changes to include them would be minimal.

Yet another possibility is to create a new syntax for enumerated types that makes a clear distinction between them and the boolean values. Adding syntactic markers to enum values could more clearly mark values as being enum values; but where do you stop with expecting the developer to remember the various syntaxes and what additional syntax errors are created by attempting to make a data format better. Most modern languages that have direct support for Enums will have a syntax like Priority.HIGH, but a data format doesn’t know anything about the Priority enum.

With the use of a schema, and assuming the schema can define the enumerated type (more on that in the future), the argument becomes clearer. Data format editors can highlight typo errors and ensure the value is from the correct enum type. Having an enumerated schema design that is distinct from strings or integers allows some of the benefits seen in compilers to carry over to data formats.

While this nuanced discussion feels a little bit like splitting hairs, the difference between boolean and other enumerated types is somewhat blurred. Boolean algebra and its place in software is enough to elevate it above being just another enumerated type. However, when it comes to syntax and semantics having a common presentation is probably useful as to not introduce another syntax for developers to learn.

## **Conclusion**

JSON's boolean values of true and false and special value of null is another inherited design from JavaScript. While these special values are often considered their own types, they are special cases of enumerated types. While binary data formats use integer values to encode enumerated values, text based data formats have more flexibility. Enumerated types generally have three representations, string, integer and symbolic. As programming languages evolve, there's a general pull towards the symbolic representation of their values instead of the concrete string or integer values. This separation of concerns is important and there's clear advantages of using symbolic values over strings or integers, especially in the context of compilers.

In text based data representation, outside the scope of the compiler these benefits of symbolic enumerated values seem less clear. Consistency and clear separation of concerns is probably the strongest argument for allowing enumerated types as distinct from strings. The format of using unquoted strings instead of using a prefix or other qualifier is in my opinion the most aesthetic. However, whether enums require this first-class position in data formats is unclear. The ECON and EDN-Format are examples that allow unquoted strings in support of this.

As we design new formats and protocols, the enum question deserves serious consideration. The line JSON drew at booleans was somewhat arbitrary and future formats might choose to draw it elsewhere. My personal view after delving into this subject is still murky, but I'm liking the ECON solution of using unquoted strings. It aligns with boolean values and brings one major type out of the already overloaded string. What do you think? Should enumerated values be syntactically distinct from strings in data interchange formats? Should they have their own distinct syntax?

Where to next? The final atomic value format to explore in JSON is strings. You may have already noticed I call them the universal value format. It's a chance to look at all the other types (dates, times, uuid, base64, etc) that get stuffed into a string.

