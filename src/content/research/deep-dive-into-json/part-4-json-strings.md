---
title: "A Deep Dive into JSON: Part 4. JSON Strings"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 4
description: >
  Strings are the universal value container in JSON for values that are not numbers (integers and floats, see [Part 2](/research/deep-dive-into-json/part-2-json-and-numbers)) and boolean values (see Part 3).
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-4-json"
originalDate: 2025-07-31
abstract: >
  Strings are the universal value container in JSON for values that are not numbers (integers and floats, see [Part 2](/research/deep-dive-into-json/part-2-json-and-numbers)) and boolean values (see Part 3). It's also the last of the atomic value types before exploring compound types of JSON arrays and objects. This article examines JSON's string representation, from its Unicode foundations to its role as the default container for strings, dates, urls, uuids, binary data, and various other formats. It investigates the concept of sub-parsers and concludes with proposing borrowing a concept from YAML and applying it to JSON.
---

# **A Deep Dive into JSON: Part 4\. JSON Strings**

**Abstract:** Strings are the universal value container in JSON for values that are not numbers (integers and floats, see [Part 2](/research/deep-dive-into-json/part-2-json-and-numbers)) and boolean values (see Part 3). It's also the last of the atomic value types before exploring compound types of JSON arrays and objects. This article examines JSON's string representation, from its Unicode foundations to its role as the default container for strings, dates, urls, uuids, binary data, and various other formats. It investigates the concept of sub-parsers and concludes with proposing borrowing a concept from YAML and applying it to JSON.

**Introduction**

[Parts 2](/research/deep-dive-into-json/part-2-json-and-numbers) and [Part 3](/research/deep-dive-into-json/part-3-boolean-and-enumerated-types) explored how JSON handles numbers and boolean/enumerated types. Now we turn to JSON's most versatile type, the string. It’s also the last of the atomic value types to explore. At first glance, strings seem straightforward, sequences of characters enclosed in double quotes. Yet strings have become JSON's swiss army knife, pressed into service for everything the format doesn't natively support.

Consider this JSON response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created": "2024-12-19",
  "priority": "high",
  "content": "First line\nSecond line\nThird line",
  "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYfFcSJ...",
  "query": "SELECT * FROM users WHERE active = true",
  "description": "A product with \"special\" features"
}
```

Every string field here represents a different kind of data: a UUID, an ISO 8601 date, enumerated value, multi-line text with escaped newlines, Base64 encoded binary data, SQL code, and text with escaped quotes. Some values have a specific standard or syntax while others are free text. The string type has become the universal value container, a catch-all for structured data that JSON can't otherwise express.

This overloading isn't accidental, it's a direct consequence of JSON's minimalist design and what it has inherited from JavaScript. But as we'll explore, treating strings as the default fallback for all complex data types simply pushes the issue of these types up the stack.

## **JSON's String Specification**

The formal definition of JSON strings is simple enough. According to RFC 8259, a string is a sequence of [Unicode](https://en.wikipedia.org/wiki/Unicode) code points wrapped in quotation marks, with certain characters requiring escape sequences:

```abnf
string = quotation-mark *char quotation-mark
char = unescaped / escape (
  %x22 /          ; "  quotation mark  U+0022
  %x5C /          ; \  reverse solidus U+005C
  %x2F /          ; /  solidus         U+002F
  %x62 /          ; b  backspace       U+0008
  %x66 /          ; f  form feed       U+000C
  %x6E /          ; n  line feed       U+000A
  %x72 /          ; r  carriage return U+000D
  %x74 /          ; t  tab             U+0009
  %x75 4HEXDIG )  ; uXXXX              U+XXXX
escape = %x5C           ; \
quotation-mark = %x22   ; "
unescaped = %x20-21 / %x23-5B / %x5D-10FFFF
```

JSON strings are sequences of Unicode code points, not bytes. This was progressive for 2001, when many formats were still ASCII-centric.

As an aside, for those not familiar with Unicode, it defines 154,998 [characters](https://en.wikipedia.org/wiki/Character_\(computing\)), 168 [scripts](https://en.wikipedia.org/wiki/Script_\(Unicode\)) and 3790 emojis used in various ordinary, literary, academic, and technical contexts. The Unicode codespace is divided into 17 planes, numbered 0 to 16\. Plane 0 is the [Basic Multilingual Plane](https://en.wikipedia.org/wiki/Basic_Multilingual_Plane) (BMP), and contains the most commonly used characters. Each character, referenced as a code point (integer value) can be encoded into UTF-8, UTF-16, UTF-32 or other format. All code points in the BMP can be accessed as a single code unit in UTF-16 encoding and can be encoded in one, two or three bytes in UTF-8. Code points in planes 1 through 16 (the supplementary planes) are accessed as surrogate pairs in [UTF-16](https://en.wikipedia.org/wiki/UTF-16) and encoded in four bytes in [UTF-8](https://en.wikipedia.org/wiki/UTF-8). UTF-8 has quickly become the main encoding standard, because it efficiently encodes basic text like this in a single byte but also allows encoding all Unicode code points. As mentioned in [Part 1](/research/deep-dive-into-json/part-1-introduction-and-core-limitations), Crockford’s [KIM](https://www.crockford.com/kim.html) provides another method of encoding Unicode.

Back to JSON; only quotation marks and backslash (reverse solidus) must be escaped in JSON strings. Control characters (U+0000 through U+001F) must be escaped, but everything else is optional. Curiously, the forward slash (/) can be escaped but doesn't need to be, potentially, a historical artifact from embedding JSON in HTML \<script\> tags.

JSON provides only one escape format for arbitrary Unicode characters: \\uXXXX. The single entry of four hex values can be used for values in the Basic Multilingual Plan. However for emojis and other characters that are not in BMP, the escaped encoding must be done as UTF-16 surrogate pairs. For instance the emoji: 😀 can be encoded as \\uD83D\\uDE00. However, encoding emojis and other characters in this way is optional. It's interesting to note that if the first escape sequence of a UTF-16 value isn't followed by a second sequence the outcome is undefined.

## **Where’s multi-line support?**

One of JSON's most visible limitations is the lack of multi-line string literals. Any string containing line breaks must use \\n escapes. For example:

```json
{
  "poem": "Roses are red\nViolets are blue\nJSON is simple\nBut multi-line strings aren't true"
}
```

This design choice prioritizes parsing simplicity over human readability. Compare this to YAML's and other programming languages approaches to multi-line strings.

```yaml
poem: |
  Roses are red
  Violets are blue
  YAML handles multi-line
  Without much ado
```

Python's triple-quoted strings:

```python
poem = """Roses are red
Violets are blue
Python makes multi-line
Easy for you"""
```

ECON allows continuation of quotes on the next line.

```
string = "The quick brown fox\n"
  "jumps over the lazy dog.";
```

There’s various approaches to multi-line syntax, but in effect they all provide a similar level of visual improvement over JSON’s single line method. Since JavaScript (ES6) released in 2015, it’s been possible to use back-ticks to create multi-line strings. Java introduced a similar method to Python in Java 15 in 2020\. The Java specification for text blocks ([JEP378](https://openjdk.org/jeps/378)) is a good example of how nuanced the treatment of multi-line strings when it comes to white space. C\# also allows multiple-quotes for [raw string literals](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/tokens/raw-string). It seems clear that it would be insane not to provide multi-line string support in a new data format (apologies to Crockford :). The Python/Java/C\# syntax seems like the preferred approach with Python now being the most popular programming languages.

Choosing syntax is not always a simple choice for building a new data format. A very interesting distinction between JSON and YAML is the use of new-lines as part of the syntax. JSON has the feature that it doesn’t use any white space as part of the syntax. YAML on the other hand is built on white space as part of the syntax. While, this deep dive into JSON gives me a bias towards the JSON approach of not requiring white space, to support multi-line strings requires it. So as the design of a new format takes shape it is likely that a more flexible approach will be required.

## **Single quotes?**

Since JavaScript was created, it has supported both double-quotes and single-quotes for strings. Given JSON was derived from JavaScript, it's a little surprising that it wasn’t included. I guess the “being minimal” is the likely driver behind the decision to use one. Python, Ruby, Perl, Bash, PHP are examples of other programming languages that allow both single quotes and double quotes. The advantage to allowing both is that it allows the opposite quote to be added instead of using an escape sequence. For example:

```
"He said 'hello'"
'She said "goodbye"'
```

While this is visually appealing, it adds complexity to the parser and possibly more to the writer. The string needs to be written to a buffer, checked for quotes and then choosing which quote to use on the final output and escape the right quote if the string uses both. Using a single method, allows the implementation to simply escape required characters as the string is written; no temporary buffers or checking required.

[JSON5](https://json5.org/) has opted to allow both single and double quotes as well as multi-line strings (using a backslash continuation). There’s obviously a balance between providing a well defined canonical data representation that limits options, but there’s also value in providing flexibility and data representation that is easy to read. As the series progresses, the question of a new format’s purpose is likely to pull it in one direction or the other. JSON5 has the slogan “JSON for humans”, and states on its site:

JSON5 is an extension to the popular [JSON](https://tools.ietf.org/html/rfc7159) file format that aims to be easier to **write and maintain *by hand* (e.g. for config files)**. It is *not intended* to be used for machine-to-machine communication. (Keep using JSON or other file formats for that. 🙂)

There’s a sub-text that features that make it easier to read and provide higher levels of flexibility create higher potential for bugs and errors to exist in machine-to-machine communication. This is the argument behind keeping JSON minimal for instance. Personally, I’m not completely sure that this argument is a good one; serialization libraries are long lived and fragmenting the serialization job across libraries and application code seems more likely to cause issues.

As the series develops and the format is further defined, it will be interesting to see how these arguments affect the design.

## **The Universal Value Container**

As already pointed out, JSON strings are really an escape hatch to other data formats and their parsers. There's [been suggestions](https://www.tbray.org/ongoing/When/201x/2016/08/20/Fixing-JSON) that the really common formats like dates be included in the specification. However, the string as an escape hatch to other parsers keeps JSON's syntax simple and allows these other formats to plug-in. It also becomes difficult to decide which sub-formats are important enough to include, once dates are included, why not add uuids?

As shown in the introduction, a JSON string is often more than just plain text. Instead it contains an embedded format that is not directly understood by the JSON parser. It reminds me of the excellent video of the [UX designer watching on with horror as all the different shapes fit through through](https://www.youtube.com/watch?v=cUbIkNUFs-4) the square hole (in this case Timestamp shape goes through the string hole).

![](/images/deep-dive-into-json/part-4-json-strings-image2.png)

This isn’t a bad solution by any means, but it does disconnect the syntax of many useful types from the data format itself. JSON Schema does its bit to plug that gap by creating the [format option](https://json-schema.org/understanding-json-schema/reference/type#format) and defining some well known types such as ‘uuid’. However, the [specification](https://json-schema.org/draft/2020-12/json-schema-validation#name-vocabularies-for-semantic-c) itself only defines those type names in the text based specification and doesn’t provide a schema that lists the formats. JSON Schema also allows using [regular expressions](https://json-schema.org/understanding-json-schema/reference/string#regexp) which can be used more generically to define well structured syntax, but these schemas are not available to the format itself. Regular expressions also don’t provide the expressiveness of a full grammar (e.g. BNF). The topic of schemas is for future articles, however, it’s worth questioning, is the type a ‘UUID’, or is the type a ‘string’ with the format of a ‘UUID’? We’ll come back to this question later.

## **Structured Strings**

What formats are there, that aren’t just a regular text string? This is a good chance to let AI ([cluade.ai](http://cluade.ai/) in this case) do its thing. Here’s a list of types and their reference standard. After exploring number formats, enumerations and now structured strings, do a sense check. Are you surprised by how many or how few other formats are listed?

#### **Numeric Types**

* Decimal numbers (exact precision) \- 19.99 \- IEEE 754-2008 decimal floating point  
* Complex numbers \- 3.0+4.0i \- ISO/IEC 80000-2 mathematical notation  
* Binary literals \- 0b11010101 \- IEEE 1364 (Verilog) binary notation  
* Octal literals \- 0o755 \- POSIX file permissions notation  
* Hexadecimal literals \- 0xDEADBEEF \- IEEE 1364 hexadecimal notation  
* Infinity and NaN values \- ∞, \-∞, NaN \- IEEE 754 floating point standard

#### **Date/Time Types**

* Date-only values \- 2024-01-15 \- ISO 8601  
* Time-only values \- 14:30:00 \- ISO 8601  
* Date-time with timezone \- 2024-01-15T14:30:00Z \- ISO 8601  
* Duration/time spans \- PT2H30M \- ISO 8601 duration format  
* Time intervals \- 2024-01-01/2024-12-31 \- ISO 8601 interval notation

#### **Binary & Encoded Data**

* UUIDs \- 550e8400-e29b-41d4-a716-446655440000 \- RFC 4122  
* Base64 data \- SGVsbG8gV29ybGQ= \- RFC 4648  
* Hash values \- 5d41402abc4b2a76b9719d911017c592 \- RFC 1321 (MD5), FIPS 180-4 (SHA)

#### **Text & Pattern Types**

* Regular expressions \- /^\[a-zA-Z0-9\]+$/ \- IEEE POSIX.2 (Basic/Extended RE)  
* URLs \- https://example.com/path?query=value \- RFC 3986  
* Email addresses \- user@domain.com \- RFC 5322  
* Phone numbers \- \+1-555-123-4567 \- ITU-T E.164  
* IP addresses (IPv4) \- 192.168.1.1 \- RFC 791  
* IP addresses (IPv6) \- 2001:db8::1 \- RFC 4291  
* MAC addresses \- 00:1B:44:11:3A:B7 \- IEEE 802  
* Domain names \- subdomain.example.com \- RFC 1035

#### **Geometric & Mathematical Types**

* Geographic coordinates \- 40.7128°N, 74.0060°W \- ISO 6709  
* Quaternions \- 0.707+0.0i+0.707j+0.0k \- ISO/IEC 80000-2

#### **Version & Semantic Types**

* Version numbers \- 1.2.3-alpha.1+build.123 \- Semantic Versioning 2.0.0  
* Software licenses \- MIT, GPL-3.0-or-later \- SPDX License List

#### **Network & Protocol Types**

* CIDR blocks \- 192.168.1.0/24 \- RFC 4632  
* MIME types \- text/html; charset=utf-8 \- RFC 2046  
* HTTP status codes \- 200 OK, 404 Not Found \- RFC 7231

#### **Multimedia & Format Types**

* Color spaces \- CMYK(75, 68, 67, 90\) \- ISO 12647 (printing standards)

#### **Business & Domain Types**

* Credit card numbers \- 4532-1234-5678-9012 \- ISO/IEC 7812  
* ISBN codes \- 978-3-16-148410-0 \- ISO 2108  
* Barcodes \- EAN-13: 1234567890123 \- ISO/IEC 15420

#### **Security & Cryptographic Types**

* JWTs \- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \- RFC 7519  
* X.509 Certificates \- MIIC+jCCAeKgAwIBAgI... \- RFC 5280

#### **Network & Protocol Standards**

* **SIP URIs** \- sip:user@domain.com \- RFC 3261  
* **LDAP URLs** \- ldap://host:port/dn?attributes?scope?filter \- RFC 4516  
* **FTP URLs** \- ftp://user:pass@host:21/path \- RFC 1738  
* **Data URLs** \- data:text/plain;base64,SGVsbG8= \- RFC 2397

## **Type Domains**

Putting the “date shape through the string hole” is a good time to touch on the concept of type domains. Serialization and data formats are about moving data and information from one domain (the programming language) to the other domain (data format). Programming languages are incredibly rich and also hugely different from one to the next. While there are many object-oriented languages, there’s also functional and procedural languages. Each language has similarities and will offer lists, arrays, numbers, etc, but the implementation and nuances of each are going to be different. Data formats on the other hand are restricted, largely, this restriction comes from their static nature. Once the data file is written it stays as is until modified. The role of serialization is to move information from one domain to the other. The analogy of putting things through a restricted set of holes isn’t a bad one.

![](/images/deep-dive-into-json/part-4-json-strings-image3.png)

For instance, if the bucket represents the JSON data format serializer, squares are for strings, circles are for numbers, rectangles are for null, semi-circles are for arrays… I think you get the idea. The job of the serialization code is to take the rich set of data structures and types offered by the programming language and find a matching type in the data format’s domain model. Once the value is passed through, the serializer formats the data and the file is written. The code that takes those values and writes the file is the easy part of serialization, the more difficult part is building the transformers that get the data ready to pass through the holes. For instance, a UUID is first transformed into a string before being put through the string hole.

In the reverse, the JSON parser reads the file and pushes through the data via the specific holes. Once again, this is the easy part, the more difficult task is to match up what was passed through the hole to the data structure that the developer wants. In these situations, many of the string values are then decoded by a secondary parser before ending in their final state. So a UUID is received as a string and put through a parser and potentially held in memory as a UUID object rather than a string.

The advantage of creating more holes to pass values between the two domains is that it adds more information. Allowing a native UUID object and having a parser that is part of the native format allows editors to pick up errors and provide better error handling. It ensures that the server when receiving a request is able to respond with a suitable error before the message makes it to process the actual data.

## **Where to next?**

If you’ve followed along through numbers, enumerated types, and this article, you might be wondering where this is all heading. As I’ve explored these various types, what stands out is that the format is a representation of a type. The question above about is a UUID a type or is it a string with the format of a uuid is somewhat rhetorical. After exploring the various data formats made available by JSON, the type is clearly a UUID and not a string. The string is just the textual representation of the type.

In number formats, Crockford’s quote that “it would be insane to put quotes around numbers” has been reverberating. The quotes or lack of quotes are just a syntactic sugar around a value. If we remove the question of quotes all together we’re left with a series of unicode characters that represent a value. The question I’m currently pondering is, what if all types could be represented by a string of unicode characters and the question of quotes is only a syntactic choice. Let’s for argument sake, allow any number to also be put into quotes.

```json
{
  "age": "22",
  "date": "2025-07-20"
}
```

The keen observer will point out that the reason we have syntax at all is so that we can distinguish between what type of value we’re looking at. In JSON, there’s only numbers, boolean, null and strings which represent atomic value types. It’s very easy to distinguish between them. Numbers are unquoted and start with “\[minus\] int”; that is an optional minus or integer character \[0-9\]. A string always starts with a quote, which leaves boolean values starting with a letter. There’s absolutely no issue with knowing what type is following with just a single unicode character. While, we as humans can see that “22” is an integer and “2025-07-20” is a date, without further information, the parser can’t.

So this is the crux of the issue; JSON’s syntax is minimal and reduced to a small number of types (holes in the bucket), mainly because from a grammar/syntax perspective, it needs to be able to distinguish between types easily. Adding more custom types both makes the parser more complicated and would require pattern matching or other techniques. It’s much easier to say “it’s minimal” than to articulate that adding more types requires complex techniques and slows processing.

The dilemma is, does a data format strictly support a set number of types or does it provide a method to specify a type. Those that are familiar with YAML, might be aware that YAML has the ability to specify the type. For example, also thanks to claude.ai:

```yaml
# Built-in types (global tags with !!)
name: !!str "Alice"
age: !!int 29
active: !!bool true

# Built-in types using full tag URIs (same as above)
email: !<tag:yaml.org,2002:str> "alice@company.com"

# Local/custom types (single !)
user_id: !uuid 550e8400-e29b-41d4-a716-446655440000

# Custom types using domain-based tag URIs
employee_id: !<tag:mycompany.com,2024:employee_id> EMP-12345
```

The \!\! is an interesting syntax. The first exclamation is the marker for a type, and the second exclamation is shorthand \<tag:yaml.org,2002:\>. Notice that “\!uuid” is a custom type and “\!\<tag:mycompany.com,2024:employee\_id\>” allows reference to an external tag definition.

## **What’s your type?**

What would it look like to use a similar syntax to YAML on a JSON like syntax. Let’s take the very first example from this article and add some type information:

```
{
  "id": !uuid 550e8400-e29b-41d4-a716-446655440000,
  "created": !date 2024-12-19,
  "priority": !priority high,
  "content": !text """
  First line
  Second line
  Third line""",
  "image": !base64
    iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...,
  "query": !sql "SELECT * FROM users WHERE active = true",
  "description": !text 'A product with "special" features'
}
```

If you look closely, I’ve removed the quotes from the uuid, date, priority, and base64 types as an example. If we know that the value doesn’t include white space and doesn’t use characters like { or : in the value then we don’t need the double quotes from a syntax perspective. The quotes are syntactic sugar and are completely optional as we’ve been told by the format which type and sub-parser to use. I’ve also thrown in triple quoted multi-line string and a single quoted text using double quotes in the text. As an experiment, what’s your first reaction to this syntax?

There’s an idea forming here that JSON values are limited because of the limited syntax and the ability to determine the types from the text. If that limitation is removed by adding additional type information the need for quotes, be it single or double quotes is removed. Would it be possible to split the atomic value parsing completely from the structural parsing (ie arrays and records). The atomic value parser just takes any quoted or unquoted value and hands it to the corresponding type parser. Using the bucket analogy, the syntax is adaptable and the number of holes can be added as required by the format. That way the date type goes through the date hole, etc.

This suggests another outcome, that there’s two levels to the design of the system. At the syntax level, the low level parser simply tokenises the various string formats (single quotes, double quotes, no quotes) into a string to be delegated to the correct parser. The syntax of the underlying format knows nothing of numbers, booleans, null, etc. It also allows bringing the parsers that have been in the application code (e.g. dates, uuid, etc) into the realm of the underlying parser.

Adding \!type information to every value is probably not going to go down well with all developers. A full schema would solve that as a schema could be used to add types to all fields, allowing the parser to select the correct value parser without adding \!type information to every field; as mentioned that’s also for a later article. So, a fallback default set of types would need to be required to allow as a base. As discussed earlier, the syntax of the default parser would need to be unambiguous enough that the various types can be clearly distinguished. That value parser most likely looks like a slightly larger super-set of the JSON current atomic values of numbers, boolean, null and string. The middle ground between the base value parser and the full schema becomes the addition of \!type information. These articles are still in discovery mode, but this concept could provide a solid foundation for a new data format.

It’s also worth returning to the issue of machine to machine and the need for canonical formats. Canonical formats are useful in security where there should be no ambiguity about how the data is written, one character (e.g. white space or quote) out of place and the security solution may fail. It might be that for machine to machine, a more standardised syntax is required. A canonical format used for security might limit/skip white space or only use double quotes for values. This could be accomplished using a “strict” mode.

## **Conclusion**

The last three articles have explored all the atomic value types of JSON in what even I would call a ridiculous amount of detail. Every aspect of the value formats were explored and the real-world gaps exposed. An important outcome of this investigation has been the disjoint world of known versus unknown data formats and their associated parsers. While JSON Schema can patch some holes, it attempts to patch those in a format that was not designed to be patched. Of course, it is also silly to ignore the success of JSON and developers ability to make it work. I’m left wondering if there was a better solution that was able to provide different levels of support from minimalist and quick solutions to providing full schemas yet.

As we've seen throughout this series, JSON's limitations often stem from what it inherited from JavaScript and its minimalist philosophy. While there’s solid reasons for a single string format and not allowing single-quotes or multi-line strings, the string overloading problem suggests that data formats need richer type systems and more flexible parsers. Modern applications deal with increasingly complex data types: timestamps with microsecond precision, binary attachments, multi-language text, cryptographic signatures. Forcing all of these into strings with ad-hoc encoding schemes creates fragility, inefficiency, and pushes the work to the application layer. The minimalist design with no ability to expand the supported types creates a conceptual dead-end for the data format with no ability to expand. The YAML \!type concept has the potential to provide a way forward to both support a minimal base set of types and expansion to both well defined (e.g. UUID) and user defined types.

One of the aims that is forming for this potential new data format is that it is built from building blocks that are opt-in and allow very simple JSON-like simplicity but have the capability to expand in a clean manner that doesn’t conflate concepts. It should also be possible that the methods to opt-in can potentially be replaced and isn’t set in stone. Adding a \!type option to values doesn’t say what the type system should look like, other than that there is a type name. The question of schema references also needs to be explored.

In Part 5, we'll explore JSON’s compound types of array and object. In addition, it will investigate the fundamental truths of serialization and the effects it has on compound types.

