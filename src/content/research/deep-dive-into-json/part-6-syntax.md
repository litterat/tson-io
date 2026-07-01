---
title: "A Deep Dive into JSON: Part 6. Syntax"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 6
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-6-syntax"
originalDate: 2025-08-17
abstract: >
  Part 6 of the deep dive into JSON series investigates the syntax of JSON. JSON inherited its syntax from JavaScript which provides a very succinct data format that itself inherits from a long lineage of programming languages. As languages and data formats evolve, can there be alignment that builds common understanding between data formats and programming languages. This article explores the early history of what syntax means and how it might affect the design of a new data format.
---

# **A Deep Dive into JSON: Part 6\. Syntax**

**Abstract**: Part 6 of the deep dive into JSON series investigates the syntax of JSON. JSON inherited its syntax from JavaScript which provides a very succinct data format that itself inherits from a long lineage of programming languages. As languages and data formats evolve, can there be alignment that builds common understanding between data formats and programming languages. This article explores the early history of what syntax means and how it might affect the design of a new data format.

## **Introduction**

[Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects) of the series both looked at the existing structure of JSON compound types and used first principles to create a set of structural primitives. It also touched upon perception and how we view the meaning of syntax, this also plays an important role. This article looks at the history of syntax and how it is currently developing.

When JSON was first created, it inherited the syntax from JavaScript. In Crockford’s article “JSON: The Fat-Free Alternative to XML“ from 2006, he states, “A number of people independently discovered that JavaScript's object literals were an ideal format for transmitting object-oriented data across the network”. JSON is said to have gained traction as an alternative to XML as its much simpler syntax was compact and a perfect fit for the AJAX environment it was designed for. JavaScript’s object literals are compact as they’ve been able to inherit the combined history of the many programming languages that have come before it. JavaScript was based on Java which was influenced by C/C++. The C language was itself a follow on from the B language which was based on BCPL. Finally BCPL was derived from CPL which was also influenced by Algol 58/60 which also took elements from Fortran that was originally developed in 1956\.

As the design of a new data format is formed it is worth acknowledging that history and seeing how recent programming language syntax might affect a new design. While this will go a little deeper into the history of syntax than is needed, it is useful to acknowledge the history behind the meaning. Also, as this series is nearing the end of exploring JSON, it’s also just an indulgence to see the changes and see how early influences from seventy years ago are still relevant today.

## **Early Compiler History**

In investigating this article I fell down a rather fascinating rabbit hole that focused on some of the early [history of compilers](https://en.wikipedia.org/wiki/History_of_compiler_construction). In particular in the late 1950s when Fortran, Algol, Cobol, Lisp and other programming languages were in their early infancy. These solutions were considered [automatic programming](https://en.wikipedia.org/wiki/Automatic_programming). A lot happened in this area between 1958 and 1960 and Algol 58 is pivotal for compilers and syntax today.

A conference of experts on the topic of an International Algebraic Language (it was only later renamed to Algol) was convened in Zurich from 27 May to 2 June 1958\. The [preliminary report](https://dl.acm.org/doi/pdf/10.1145/377924.594925) contained the objectives;

I. The new language should be as close as possible to standard mathematical notation and be readable with little further explanation.

II. It should be possible to use it for the description of computing processes in publications.

III. The new language should be mechanically translatable into machine programs.

At the time, this was as close to Java’s idea of write once, run anywhere mantra that was possible. The differences in computers were stark and word sizes (the number of bits that a computer's processor can handle as a single unit during operations) were not standard. Character sets (the codes used to represent letters) would not start to be standardised until the ASCII standard was first published in 1963\. As such, the preliminary report also stated, “The characters are determined by ease of mutual understanding and not by any computer limitations, coders notation, or pure mathematical notation.”

At the time keyboards were not standardised either, with many different keyboard layouts and with a lot less characters than we take for granted today. In the [Communications of the ACM, Volume 1, Issue 7](https://dl.acm.org/toc/cacm/1958/1/7) from July 1958, there contained an article for the [Lincoln Keyboard](https://dl.acm.org/doi/pdf/10.1145/368873.368879), ”A new typewriter keyboard, for direct and punched paper tape computer input will replace the usual commercial keyboard with 88 characters chosen for the convenience of programmers”. While this keyboard had seven symbols for logic it did not have square brackets. A fascinating constraint considering how embedded into JSON and all programming language syntax square brackets have become.

Following the Algol 58 preliminary report, John Backus who was present at the initial meeting would go on to publish in the Proceedings of the 1st International Conference on Information Processing (UNESCO, Paris 15-20 June 1959\) his paper on [Backus-Syntax and Semantics of Proposed IAL](https://www.softwarepreservation.org/projects/ALGOL/paper/Backus-Syntax_and_Semantics_of_Proposed_IAL.pdf). This paper describes what we now understand as [Backus-Naur Form](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form) syntax and is used to describe Algol 58 in a formal way. Backus called these metalinguistic formulas and they haven’t changed that much since first published; here’s the syntax for integers and numbers presented in the paper (take note, it looks like his keyboard didn’t support \< \> or \[ \] at the time):

---

![](/images/deep-dive-into-json/part-6-syntax-image15.png)

---

This is by no means an exhaustive or in-depth history on compilers; it is here to provide context and demonstrate the timing of when compilers and syntax was started. It is also worth mentioning that in 1957 Noam Chomsky published [Syntactic Structures](https://en.wikipedia.org/wiki/Syntactic_Structures) which also influenced compiler theory. There’s also [Grace Hopper](https://en.wikipedia.org/wiki/Grace_Hopper) who first suggested the idea of an english based computer language in 1952 and developed [A-0](https://en.wikipedia.org/wiki/A-0_System), the first computer language and a precursor to [Cobol](https://en.wikipedia.org/wiki/COBOL) (designed in 1959). [John McCarthy](https://en.wikipedia.org/wiki/John_McCarthy_\(computer_scientist\)) was also developing Lisp in 1958\. It’s a fascinating time in computer science and worth further reading if you have time.

## **JSON Syntax**

Moving forward only forty years and an incredible amount has changed in computer science, all built on top of this early work. In 2001, we’ve already had the personal computer revolution and the internet stock market bubble is bursting. JavaScript which was invented at Netscape in 1995 is already an ECMAStandard from 1997\. It would still be a few years before the first iPhone was made available in 2007\. To get to the simple JSON syntax a number of important milestones were required.

Brendan Eich, the original developer of JavaScript (code named Mocha) is said to have taken influence from [Java, Scheme and Self as initial concepts](https://brendaneich.com/2008/04/popularity/). Interestingly none of these languages had the Object literal syntax used by JavaScript or JSON. The closest I’ve found is Python which already contained dictionary and array literals. [For example](https://www.w3schools.com/python/python_dictionaries.asp):

thisdict \= {  
"brand": "Ford",  
"electric": False,  
"year": 1964,  
"colors": \["red", "white", "blue"\]  
}

## **JSON Array literals and square brackets**

Going further back, we can trace back the idea of array indexing to Algol 58, the idea of an array literal we see in JSON has taken a few more steps to be defined. In the B programming language, it was possible to initialise a vector, here’s the instructions from [A tutorial introduction to B](https://www.bell-labs.com/usr/dmr/www/btut.pdf) from Bell labs from 1973\.

---

![](/images/deep-dive-into-json/part-6-syntax-image16.png)

---

By the time C came around array initialization changed:

int arr\[5\] \= {1, 2, 3, 4, 5};

It’s interesting to note that while Java also inherited this notation, JavaScript chose the array literals we’re now familiar using square brackets instead of braces, e.g:

cars \= \["Ford", "Volvo", "BMW"\]

JavaScript shares this with Python which was originally developed in around 1991\. It’s likely that this also came from earlier languages. While JavaScript was influenced by Java, Scheme and Self, I haven’t seen this particular syntax used by any of them. It’s an interesting, but very important divergence from Java and C initialization using braces.

While array literals have emerged from their basic syntax to today’s JavaScript syntax there’s also another idea at play. Are these arrays homogeneous or heterogeneous? The example from the B programming language from 1973 shows it as heterogeneous (values have mixed types). However, as a developer that has spent a lot of time in strongly typed languages like Java, my expectation is that an array should be homogeneous.

While data formats are by nature immutable, programming languages also deal with mutability of lists. So when looking at a JSON array, and imaging it being read into a programming language to be used, there’s concepts of both mutability and homogenous/heterogeneous traits to deal with.

Languages like Python have introduced the Tuple as a concept to differentiate between these traits. The Python language reference describes a Tuple, “Tuples are immutable sequences, typically used to store collections of heterogeneous data” On lists, Python states, “Lists are mutable sequences, typically used to store collections of homogeneous items (where the precise degree of similarity will vary by application)”. A Tuple has the syntax:

jane \= ("Jane Doe", 25, 1.75, "Canada")

This [Deep dive into Python Tuples](https://realpython.com/python-tuple/) provides a useful understanding that a tuple is Ordered, Lightweight, Indexable, Immutable, Heterogeneous, Nestable, Iterable, Sliceable, and Hashable. As a developer, seeing the simple parentheses with data provides all that knowledge. Having a different syntax for tuples in a JSON like data format could provide additional information to developers and parsers about the nature of the data. This would allow the square brackets to suggest being Homogenous as the default understanding.

![](/images/deep-dive-into-json/part-6-syntax-image17.png)

Returning to the concept of grouping from [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects), both lists and tuples from Python both result in exactly the same structural primitive of an ordered grouped list of values. It is how we view these values that creates meaning and provides hints to how we might interpret and use the values.

## **JSON Objects and braces**

The JSON Object is described in the introduction of [RFC8259](https://datatracker.ietf.org/doc/html/rfc8259) as:

An object is an unordered collection of zero or more name/value pairs, where a name is a string and a value is a string, number, boolean, null, object, or array.

As discussed in Part 5, while we are expected to treat an object as unordered, however, it is in practice ordered.

![](/images/deep-dive-into-json/part-6-syntax-image18.png)

In programming languages this concept of key/value pairs is also known as an [associative array](https://en.wikipedia.org/wiki/Associative_array), dictionary, map, or symbol table. A map has unique keys and non-fixed set of entries. However, we also use this same structure to represent a record, struct, or Object being a composite data structure holding a fixed number of fields with known data types. Similar to the JSON array, JSON objects have two different concepts being represented with a single syntax.

Associative arrays have been available in the syntax of programming languages since the 1960s, however, the idea of an associative array literal similar to the syntax of JSON has become more popular in languages from the early 90s. The syntax has varied wildly from language to language. Here’s some examples from the excellent [rosettacode.org](https://rosettacode.org/wiki/Associative_array/Creation) website:

**ActionScript** var map:Object \= {key1: "value1", key2: "value2"};  
**Closure** {:key "value" :key2 "value2" :key3 "value3"}  
**Cyrstal** hash1 \= {"foo" \=\> "bar"}  
**Dao** m \= { 'foo' \=\> 42, 'bar' \=\> 100 }  
**Dao** h \= { 'foo' \-\> 42, 'bar' \-\> 100 }  
**Elixer** %{"one" \=\> :two, 3 \=\> "four"}  
**Haskell** dict \= fromList \[("key1","val1"), ("key2","val2")\]  
**Haxe** var map \= \[1 \=\> "one", 2 \=\> "two"\];  
**Julia** dict \= Dict('a' \=\> 97, 'b' \=\> 98\)  
**Kotlin** val map \= mapOf("foo" to 5,"bar" to 10,"baz" to 15,"foo" to 6\)  
**Langur** var h \= {1: "abc", "1": 789}  
**Lingo** props \= \[\#key1: "value1", \#key2: "value2"\]  
**Min** {1 :one 2 :two 3 :three}  
**Miniscript** map \= { 3: "test", "foo": 42 }  
**Perl** my %hash \= (key1 \=\> 'val1', 'key-2' \=\> 2, three \=\> \-238.83, 4 \=\> 'val3',);  
**PHP** array("brand"=\>"Ford", "model"=\>"Mustang", "year"=\>1964);  
**Potion** mydictionary \= (red=0xff0000, green=0x00ff00, blue=0x0000ff)  
**PowerShell** $hashtable \= @{ "key1" \= "value 1" key2 \= 5 }  
**Python** myDict \= { '1': 'a string', 1: 'an integer', (1,): 'a tuple' }  
**R** a \<- list(a=1, b=2, c=3.14, d="xyz")  
**Raven** { 'a' 1 'b' 2 'c' 3.14 'd' 'xyz' } as a\_hash  
**Ruby** {1 \=\> 'two', three: 4}  
**Scala** var map \= Map(1 \-\> 2, 3 \-\> 4, 5 \-\> 6\)  
**SETL** m := {\['foo', 'a'\], \['bar', 'b'\], \['baz', 'c'\]};

One of the implementations caught my eye. [DAOScript](http://daoscript.org/) allows the creation of both ordered and unordered associative arrays. It’s [map documentation](http://daoscript.org/help/en/dao.type.map.html) states:

Dao supports map and hash map as a single type map. A map contains ordered keys, while a hash map contains unordered keys. They can be created by enumeration in almost the identical way, except that \=\> is used for map and \-\> is used for hash map.

\# A map is created using "=\>",  
var map1 \= { 'EE' \=\> 5, 'BB' \=\> 2, 'CC' \=\> 3, 'AA' \=\> 1 }

\#A hash map is created using "-\>",  
var hash1 \= { 'EE' \-\> 5, 'BB' \-\> 2, 'CC' \-\> 3, 'AA' \-\> 1 }

This is an interesting idea. Could a new data format be expanded to allow not only a syntax for objects/structs, but also allow both ordered and unordered associative arrays?

While I haven’t done an exact survey of the languages above, I wonder if such a syntax would be better off with \=\> for unordered maps as it is likely the more common use case and aligns better with the other languages. The \-\> syntax could then be used for an ordered associative array. Such an addition to a data format would also allow different keys for maps while continuing to enforce the string data type for traditional Object keys.

The physical layout for structs, ordered maps and unordered maps once serialized is the same (ordered key value pairs). However, the opportunity is to recognise that when read into a programming language the same values are often used and initialised in the programming language in different ways. By embellishing the syntax there’s an opportunity to assist both the developer and the library implementors to ensure the correct inmemory representation is used.

## **Null (The Billion dollar mistake)**

An associated concept with both JSON arrays and objects is null. [Tony Hoare’s talk in 2009](https://www.youtube.com/watch?v=ybrQvs4x0Ps) provides a good history of the concept of a null reference in type systems. It’s interesting that null is a supported type in JSON and mimics the null reference in JavaScript. But in a data format it isn’t really a reference to another value, it is an indication that the value is not set. Null in JSON does not have the same meaning as null in C or other programming language which allows a null reference.

A concept that seems to be gaining popularity in C\# and tuples is the idea of using underscore to mean [discarding](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/discards) a value. For example:

(\_, \_, area) \= city.GetCityInformation(cityName);

The method GetCityInformation returns a tuple that the program is only interested in the third value area. As such, ‘area’ is a variable which has the result of the third value of the tuple. While I have not seen it used elsewhere, could underscore be used as an alternative to null to indicate that the value has not been set? What would be another alternative in a JSON like value to indicate that a value in a tuple or array has not been set?

## **The Comma**

The comma has caused hand-coders of JSON so much grief, data formats like [JSON5](https://json5.org/) have made it acceptable to leave a trailing comma in lists and objects. However, is the requirement to have commas just something inherited from JavaScript or a requirement for the syntax. One of the JSON alternatives, [Ekon](https://github.com/Himujjal/ekon) has made commas optional. Commas are important when a programming language can include expressions and other syntax as part of values in a list. However, in a data format which is constrained to values, arrays and objects, the requirement is more a tradition than anything else.

Consider the following:

\[ 12.2 true 11 “hello” \]

While it might seem a little jarring to a developer used to seeing commas, the white space is technically enough to distinguish between the values. We are so used to seeing a comma in programming languages that seeing a list without them is quite odd. It is worth noting that at least a few languages above do not require commas to create associative arrays.

Once again, the question raised is similar to the last, is it worth allowing options in a data format, or should it be restricted to a specific format that aligns with goals. For configuration files where the need for conformity is low this is likely a useful design. However, for security or machine to machine solutions a stricter and more canonical outcome is likely preferred.

## **Conclusion**

JSON and text based data interchange formats sit at a syntax crossroads between many different programming languages. They can reflect that long history of syntax but also reflect the syntax of the day and popularity of a single language. As the design of a new data format takes shape it is worth considering if inheriting JSON’s single structure of arrays for both homogeneous and heterogeneous types of data is still the right answer. While not enforceable, distinguishing between tuples and arrays provides options for developers to provide further hints to programming languages and readers on how to interpret the data. The same goes for JSON objects which serve as both a record with fields and key/value pair dictionary. Does opening up the syntax to be more reflective of more recent programming languages serve a useful purpose? In the past I’ve found the restriction of only allowing strings for keys in JSON objects annoying. Expanding the syntax could allow both different key types and ordered/unordered maps while preserving the existing syntax for structs/objects.

This concludes our exploration of JSON's foundations. You’re probably as surprised as I am with how much text I’ve been able to produce on the subject. The aim of this series is to investigate if there’s enough value in designing and developing a successor to JSON. In the next article, I will start to look beyond JSON’s foundations towards the features and design of a new data format.

