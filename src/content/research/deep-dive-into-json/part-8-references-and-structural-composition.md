---
title: "A Deep Dive into JSON: Part 8. References & Structural Composition"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 8
description: >
  This article explores the final two structural primitives from the framework established in Part 5: references and structural composition. References enable pointing to previously defined values within a document, addressing JSON's inability to represent cyclic structures.
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-8-references"
originalDate: 2025-09-03
abstract: >
  This article explores the final two structural primitives from the framework established in Part 5: references and structural composition. References enable pointing to previously defined values within a document, addressing JSON's inability to represent cyclic structures. Structural composition goes beyond simple references to allow combining and merging compound data structures. Through iterative design exploration, the article reveals how these primitives could be implemented through different syntax. By examining implementation challenges, the article shows how a JSON-like data format could be extended to include all seven structural primitives and create a complete theoretical framework for data interchange. The exploration concludes with the surprising discovery that structural composition sits at the precipice before a data format transforms into a computational system, blurring the traditional boundary between data representation and functional programming languages.
---

# **A Deep Dive into JSON: Part 8\. References & Structural Composition**

### Part 8 in a series of articles that dives into the underlying design of JSON. The result will be ideas and concepts to create a new text format.

**Abstract:** This article explores the final two structural primitives from the framework established in Part 5: references and structural composition. References enable pointing to previously defined values within a document, addressing JSON's inability to represent cyclic structures. Structural composition goes beyond simple references to allow combining and merging compound data structures. Through iterative design exploration, the article reveals how these primitives could be implemented through different syntax. By examining implementation challenges, the article shows how a JSON-like data format could be extended to include all seven structural primitives and create a complete theoretical framework for data interchange. The exploration concludes with the surprising discovery that structural composition sits at the precipice before a data format transforms into a computational system, blurring the traditional boundary between data representation and functional programming languages.

## **Introduction**

In [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects), the theory was proposed that given the constraints of structured serial data, it means that there are only seven structural primitives. They are structural, in that they are the ways that atomic data can be organised into structures in serial form. JSON only includes three of these primitives; grouping, hierarchical containment and named elements (key/value associations). [Part 4](/research/deep-dive-into-json/part-4-json-strings) discussed the fourth primitive, typing & meta data. [Part 7](/research/deep-dive-into-json/part-7-annotations) explored the fifth primitive with the idea of introducing annotations to a JSON like syntax. The final two primitives are references & structural composition. These are the topics for this article.

The idea of structural composition is something that is less explored in data formats. While YAML has this capability, I’m hard pressed to find another. As such, in this article I’m going to open up the hood to the thinking and the methods that could be used to introduce this capability into a JSON like syntax. While there was more work than shown in this article, showing the process helps to understand that the first idea isn’t always the best. There’s quite a bit to get through, so there will have less historical framing than previous articles, so let’s get into it.

## **References**

The sixth structural primitive is references. The idea of [pointers](https://en.wikipedia.org/wiki/Pointer_\(computer_programming\)) to memory has been around since the start of computer science and in high level languages since the mid 1950s. It’s also one element that [Crockford said](https://www.youtube.com/watch?v=-C-JoyNuQJs&t=2810s), he “felt bad for leaving it out of JSON” as it means JSON does not natively support being able to write a cyclical structure. A reference points to the value of another part of the data instead of directly defining a value.

![](/images/deep-dive-into-json/part-8-references-and-structural-composition-image21.png)

The \*a bead in the image represents the reference that points to the previously defined anchor \&a and uses YAML’s syntax. The anchor/reference method is one way to define a reference, the other is path based solutions. [JSON Path](https://goessner.net/articles/JsonPath/) was proposed in 2007 and JSON Pointer became [RFC6901](https://datatracker.ietf.org/doc/html/rfc6901) in 2013\. The basic idea is that a path is used to find a specific value inside the structure of the document with a given syntax. There’s also a more recent proposal for [relative paths](https://datatracker.ietf.org/doc/html/draft-bhutton-relative-json-pointer-00). The concern with any path based solution is that they introduce a new embedded syntax which differs from the core syntax of JSON.

The YAML idea of anchors and references have a longer history in programming languages. The C style syntax of dereferencing feels more natural and easily fits within a JSON like syntax. As such, for the rest of this article, I’ve used the \*identifier syntax to signify dereferencing.

As we’re exploring different syntax, one other thing that [Crockford has said](https://www.youtube.com/watch?v=-C-JoyNuQJs&t=2840s) is, “someday I’d like to be able to take the quotes off the keys, because it looks stupid”. So for the rest of this article, keys won’t have quotes. This has also been done in formats like [JSON5](https://json5.org/), so there’s plenty of precedence.

Take for example a situation where two database configurations are the same; using JSON would require copy/pasting the same configuration. An anchor/reference pair could allow:

{  
database\_config: \&dbConfig {  
host: "localhost",  
port: 5432  
},  
primary\_db: \*dbConfig,  
backup\_db: \*dbConfig  
}

Resulting in the output:

{  
database\_config: {  
host: "localhost",  
port: 5432  
},  
primary\_db: {  
host: "localhost",  
port: 5432  
},  
backup\_db: {  
host: "localhost",  
port: 5432  
}  
}

This idea of creating an anchor and reference seems simple enough, but it does open the door to a few interesting problems. One of the important things that this allows is for cyclic graphs to be written. For example:

{  
a: \&a { someField: \*a }  
}

The output if taken as copying the value would result in an endless loop:

{  
a: { someField: { someField: { someField: { someField: { someField: ….

To resolve this, the value of “someField” would need to wait until \&a is resolved before setting “someField” with a pointer to the object. A natural restriction is that the target language must allow “someField” to be mutable and unset and then set after \&a is resolved.

The second is the idea of scope. Are forward references allowed and what happens if an anchor is defined twice. Consider:

{  
commonValue: \&cVal “localhost”,  
configA: {  
overrideValue: \&cVal “some.host”,  
host: \*cVal  
}  
configB: {  
host: \*cVal  
}  
}

Tracking and maintaining the scope of \&v in this instance is not completely trivial. What would you consider to be the correct answer for “host” in configA and configB? Using a global scope for all anchors would mean both have the same value, but a local scope where overrideValue is only applied in the scope of configA means that configB should have the commonValue. Once again, resolving this is not incredibly difficult but must be considered and adds complication to the data format. My guess is that not allowing forward references and using scoped values is likely the most common sense solution.

References as a concept add a lot of power to a data format like YAML, especially in situations like configuration files where DRY (don’t repeat yourself) principles are useful to reduce errors. They are essential to be able to represent cyclic graphs of any kind. However, it has a disadvantage that it requires the writer to know which nodes will need to be referenced later. This adds additional burden on the writer to traverse the data prior to writing to find the values which need anchors. For readers there’s also the question of scope and resolving recursive structures as discussed. While none of these issues are insurmountable, it needs to be balanced with the difficulty of implementation. References unlock the final structural primitive, the ability to compose new structures from existing ones.

## **Structural Composition**

The idea of references allows copying or pointing to values in different parts of the data format. Structural composition expands this to allow combining information from multiple compound objects. It is the seventh and last of the structural primitives. As a starting point it requires the references to already be implemented.

In [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects), I presented the following example as structural composition, but this example is an example of relative path based referencing and not structural composition.

![](/images/deep-dive-into-json/part-8-references-and-structural-composition-image22.png)

The example shows relative path based selection. \*a\[2\] selected the second value in the array which happens to be the number 2\. The \*b.y selected the value 34 which also provides an example of path based referencing. The output of the object being:

{  
name1: 2,  
name2: “value”,  
name3: 34  
}

While this does show a new structure being made up from other values, it is an extension of the references concept and the ideas presented by JSON Path or JSON Pointer. The idea of structural composition is about being able to bring together and combine compound data structures. YAML provides a method to perform structural composition. Take for example:

default\_config: \&defaults  
timeout: 30  
retries: 3  
debug: false  
development:  
\<\<: \*defaults  
debug: true  
production:  
\<\<: \*defaults  
timeout: 60

In the above examples, the development and production objects are merged with the default\_config. Interestingly, the \<\< is not part of the YAML syntax and specification but is instead listed as the [merge key](https://yaml.org/type/merge.html) type.

Implementing structural composition in a JSON like syntax was not as straightforward as the previous referencing syntax and I explored a few different alternatives. The first was to use a similar approach to annotations and place the reference outside the object or array.

{  
baseConfig: \&commonConfig {  
host: “localhost”,  
port: 1234  
},  
production: \*commonConfig {  
host: “xba.abc”  
},  
testing: \*commonConfig {  
port: 2345  
}  
}

The idea above is that \*commonConfig reference is combined into the production and testing objects. With all the potential things including \!type and @annotation as well as \&anchor that has been explored previously, this was feeling like I only had one solution and the space before the value was getting increasingly crowded.

While discussing the issue with AI, it pointed me in the direction of the spread operator from JavaScript. This could provide a better example of structural composition. As well as trying out the spread operator, I’ve also tried exploring the idea that all keys in scope are valid references. This would cut down on duplication where the key and reference are likely to share the same name. Here’s an example of those changes;

{  
baseConfig: {  
host: “localhost”,  
port: 1234  
},  
production: {  
…baseConfig,  
host: “xba.abc”  
},  
testing: {  
…baseConfig,  
port: 2345  
}  
}

The spread operator is applying the data pairs to the target object. The output would then be:

{  
baseConfig: {  
host: “localhost”,  
port: 1234  
},  
production: {  
host: “xba.abc”,  
port: 1234  
},  
testing: {  
host: “localhost”,  
port: 2345  
}  
}

As you can see, the Production and Testing object values have combined the baseConfig values and then overridden a value each to create the final output. This type of structural composition creates additional capabilities that can’t be accomplished by references alone.

The concept of using the in scope keys as valid anchor points feels natural in the example above. Building a stack based scope solution would be a little more difficult than a simple global scope, however, it also goes someway to resolve the issue of scope presented in the reference section.

To demonstrate the difference between a pure reference and a spread operator, see the following example of using arrays:

{  
base: \[ 1, 2, 3 \],  
reference: \[ \*base, 4, 5 \],  
spread: \[ …base, 4, 5 \]  
}

The output being:

{  
base: \[1, 2, 3 \],  
reference: \[ \[ 1, 2, 3 \], 4, 5\],  
spread: \[ 1, 2, 3, 4, 5 \]  
}

In the output, “reference” has three values with the first being the sub-array \[1,2,3\], while the “spread” value has included the base values into the output. The spread operator can only apply to compound structures like arrays and objects.

For JSON objects introducing the spread operator allows combining one or more previously defined object key/value pairs into an output. If more than one spread operator is present it would be easiest to assume any conflicts mean that the last one applied wins. It might also be possible to unset a value. In [Part 6](/research/deep-dive-into-json/part-6-syntax), the idea of using the underscore was explored. So something like the following might be possible:

{  
base: {  
host: “localhost”,  
port: 1234  
},  
options: {  
port: 2345,  
ssl: true,  
clientAuth: true  
},  
config: {  
…base,  
…options,  
clientAuth: \_  
}  
}

The output being:

{  
base: {  
host: “localhost”,  
port: 1234  
},  
options: {  
port: 2345,  
ssl: true,  
clientAuth: true  
},  
config: {  
host: “localhost”,  
port: 2345,  
ssl: true,  
}  
}

The combination of the spread operator and ability to override and unset provides a full set of operations to add and remove properties from previously defined objects.

Given the ordered nature of arrays, it would require more advanced syntax to allow indexing into the array. A potential syntax might look like:

{  
data: \[10, 20, 30, 40, 50, 60, 70, 80, 90, 100\],  
subset: \*data\[1:3, 5, 7:9\],  
mixed: \[...data\[0, 2\], 100, ...data\[6:8\]\]  
}

The output of the above being:

{  
data: \[10, 20, 30, 40, 50, 60, 70, 80, 90, 100\],  
subset: \[20, 30, 40, 60, 80, 90, 100\],  
mixed: \[10, 30, 100, 70, 80, 90\]  
}

The example demonstrates the concept of being able to select sub-sequences of arrays. Similar to being able to unset a value from an object above, it provides the ability to remove elements from an array before inclusion. The downside of this is the additional complexity that is introduced to the parser. However, it could be possible to introduce a similar syntax to objects too:

{  
profile: {  
id: 123,  
name: "Alice",  
email: "alice@co.com",  
password: "secret",  
internal\_notes: "Alice is great"  
},

public: \*profile\["id", "name", "email"\],  
response: {...profile\["id", "name"\], "timestamp": "2025-01-20"}  
}

The output being:

{  
user: {  
id: 123,  
name: "Alice",  
email: "alice@co.com",  
password: "secret",  
internal\_notes: "Alice is great"  
},

public: {  
id: 123,  
name: "Alice",  
email: "alice@co.com",  
},  
response: {  
id: 123,  
name: "Alice",  
timestamp: "2025-01-20"  
}  
}

If you’re starting to wonder if structural composition is starting to become more than a data format, you’re not wrong. The …reference syntax is not just a reference, but it is also performing an action. We’re standing at the precipice of a much bigger world of programming languages. While hidden behind a simple syntax, the spreading capability is now performing a function between a source and destination data. That’s not something that has been previously explored in this series. Everything else was static and the syntax was a representation of that data. Even references didn’t change the data, only provided a pointer towards data that was previously defined.

Let’s take a pause. This is probably a good place to stop as a data format. Basic structural composition as provided by the spread syntax is likely enough for most purposes. Explicit anchors provide global scope while using object field names in scope provide implicit anchors. Being able to both combine and unset objects provides enough flexibility to construct and control any object from previously defined data. Arrays can similarly be concatenated with the basic syntax and even more control could be implemented using sub-indexing selections. While the sub-indexing adds some further complexity, once again it is not incredibly difficult. From a data format point of view that’s probably a great time to stop.

## **One step over the precipice**

While I just argued this is a good stopping point, let's consciously step over the line to see what lies beyond. Structural composition is a thread we can pull that brings us further into the world of functions and modification. It’s a very slippery slope into computation and functional programming. To start, if you remember the idea of the \!type syntax in [Part 4](/research/deep-dive-into-json/part-4-json-strings), it was to allow custom parsing of data formats that were not natively understood by the data format. It was proposed to use a syntax like:

{

someUUID: \!uuid 550e8400-e29b-41d4-a716-446655440000  
}

At first glance the idea being explored was that \!uuid was providing a type identifier and plug-in parser for taking the string provided and returning a UUID value in the native language. However, taken another way, the syntax could be described as being a function that takes a string and returns a UUID value in the native language.

Using that interpretation, the previous syntax that was used for indexing arrays (ie \*data\[1:3, 5, 7:9\] ), could be modified to use a slice function (e.g. \!slice( \*data, “\[1:3, 5, 7:9\]” ) that is passed in a tuple value. Using the previous example:

{  
data: \[10, 20, 30, 40, 50, 60, 70, 80, 90, 100\],  
subset: \!slice (\*data, “\[1:3, 5, 7:9\]” ),  
mixed: \[...\!slice( \*data, \[0, 2\] ), 100, ...\!slice( \*data, “\[6:8\]” )  
}

This combines the \!type syntax from Part 4 with the ability to process \*data with additional parameters using the tuple syntax. In this case, a \!slice is passed with the specific indexes to return. This starts to go beyond a data format and into having a data processing capability. Consider:

{  
\_config: {  
timeout: 30,  
retries: 3,  
debug: false  
},

\_raw\_data: \!fetch "https://api.example.com/users",  
\_filtered: \!filter (\*\_raw\_data, {status: "active"}),  
\_enriched: \!join (\*\_filtered, \*departments, "dept\_id"),

summary: \!aggregate ( \*\_enriched, {count: "count()", avg\_salary: "avg(salary)"}),  
report: \!transform (\*\_enriched, "table\_format"),

dev\_config: {...\_config, debug: true, log\_level: "verbose"},  
prod\_config: {...\_config, timeout: 60, monitoring: true},

admins: \["alice", "bob"\],  
all\_users: \[...admins, "charlie", "diana"\],  
user\_report: \!generate\_report (\*all\_users, \*prod\_config)  
}

The ideas being explored above brings together the \!function idea, but also demonstrates an interesting property of JSON files. A data format like JSON is read in sequence, as such, there is little difference between that and a scripting language. Each field becomes a statement and the object itself is now a statement block. This is just a continuation of the fact that a data file is read and processed from start to end.

The final idea is that of using an underscore before the field name to inform that the value is temporary and won’t be in the output.

From data format to scripting language is not what I was planning or expecting from this exploration.

## **Conclusion**

References and structural composition complete the seven structural primitives that have been identified in Part 5\. These last two provide the ability to transform a data format from a static representation into something far more powerful. References provide the ability to represent cyclic structures and relocate data from parts of the file, while structural composition and the spread operator opens the door to combining objects and arrays into new shapes. However that capability also obscures the output and requires computation to see the final result. While YAML crossed that line for use in configuration files, is this the line that should be crossed with a JSON like format?

What has been fascinating to discover, is that once references and actions have been enabled through the spread operator or \!function syntax it isn’t long before what started as an exploration of data formats becomes a functional programming language. [Here be dragons](https://en.wikipedia.org/wiki/Here_be_dragons); the boundary between data and computation is a precipice that becomes increasingly tantalising, but also introduces huge amounts of complexity. Crockford’s genius was in keeping JSON incredibly simple and refusing scope creep.

The challenge for any new data format is knowing where to draw the line. Perhaps JSON could have included “just one more feature” at the start, but it may have never reached wide adoption with the added complexity. In this exploration phase, the addition of anchors, references and spread operator seem simple enough; it will be interesting to see if the implementation also unveils the teeth of angry dragons.

This should be the final article in the exploratory phase of the series, however, there is an eighth structural primitive which was identified while writing this article. Templates (or otherwise known as generics and macros) provide structure without values and also often have unknown gaps in the structure that will be made whole through further refinement. It also opens the door to types, schemas and type systems which have many dragons with sharp teeth. There might be enough in that topic that it is better left to its own series. You’ll just have to read the next article to find out what comes next.

