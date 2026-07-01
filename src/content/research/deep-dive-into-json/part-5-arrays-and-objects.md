---
title: "A Deep Dive into JSON: Part 5. Arrays and Objects"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 5
description: >
  In [Parts 2](/research/deep-dive-into-json/part-2-json-and-numbers), [Part 3](/research/deep-dive-into-json/part-3-boolean-and-enumerated-types) and [Part 4](/research/deep-dive-into-json/part-4-json-strings), the atomic value types of JSON were explored.
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-5-arrays"
originalDate: 2025-08-07
abstract: >
  In [Parts 2](/research/deep-dive-into-json/part-2-json-and-numbers), [Part 3](/research/deep-dive-into-json/part-3-boolean-and-enumerated-types) and [Part 4](/research/deep-dive-into-json/part-4-json-strings), the atomic value types of JSON were explored. This article explores compound types of JSON; arrays and objects. It explores the fundamental concepts of serialization using the analogy of beads to develop a core set of structural primitives for data formats. These primitives will help in analysing and informing new data formats.
---

# **A Deep Dive into JSON: Part 5\. Arrays and Objects**

**Abstract:** In [Parts 2](/research/deep-dive-into-json/part-2-json-and-numbers), [Part 3](/research/deep-dive-into-json/part-3-boolean-and-enumerated-types) and [Part 4](/research/deep-dive-into-json/part-4-json-strings), the atomic value types of JSON were explored. This article explores compound types of JSON; arrays and objects. It explores the fundamental concepts of serialization using the analogy of beads to develop a core set of structural primitives for data formats. These primitives will help in analysing and informing new data formats.

## **Introduction**

Serialization is the act of putting things in order and compound types are how we build the structures of data formats. This article starts by exploring JSON’s object and array definitions and then goes right back to first principles to see how from a bottom up perspective JSON and other data formats are affected by the constraints of the physical environment. By discovering the structural primitives and meaning we give to data we might better understand the wider context of all data formats and how JSON fits.

## **JSON Objects & Arrays**

To start, it’s worth looking at a small example of a valid JSON file that includes the two available JSON compound types. It’s super simple list of users with two users, Alice and Bob:

{  
"users": \[  
{ "name": "Alice", "age": 30 },  
{ "name": "Bob", "age": 25 }  
\]  
}

While I’ve used white space to make it easier to read, the following is structurally the same file. It demonstrates two things, first, JSON doesn’t use white space as part of the format, and second, JSON like all data formats by its nature is serial:

{"users":\[{"name":"Alice","age":30},{"name":"Bob","age":25}\]}

I’ll return to this example later, but first let’s look at what RFC8259 says about JSON Objects:

An object structure is represented as a pair of curly brackets surrounding zero or more name/value pairs (or members). A name is a string. A single colon comes after each name, separating the name from the value. A single comma separates a value from a following name. The names within an object SHOULD be unique.

object \= begin-object \[ member \*( value-separator member ) \] end-object

member \= string name-separator value

Similarly, RFC8259 says the following about JSON Arrays:

An array structure is represented as square brackets surrounding zero or more values (or elements). Elements are separated by commas.

array \= begin-array \[ value \*( value-separator value ) \] end-array

Both arrays and objects have the same structure, they are simple lists of either a value or a member; a member being both a name and value. In both cases, the value-separator (i.e. a comma) is used to separate the values. It’s clear that after they are written, both maintain a set order in the file. However, while both demonstrate a value order, only arrays are required to maintain that order after being read. Objects are not expected to maintain order. The point here is that as developers we build a perception of, and expectation that even though order is demonstrated by both Objects and Arrays, we project our understanding that Objects don’t have order. The developer’s cognitive understanding of what is and isn’t an array and/or object will be discussed further in the next article.

It is clear again that JSON has inherited JavaScript’s interpretation of both Objects and Arrays. One concept that is inherited from JavaScript is the fact that arrays may contain a mix of different types, however, in many languages that’s not the case. For instance, C/C++, Java, C\#, Go and Rust have homogeneous types, while many of the interpreted languages like JavaScript, Python, Ruby and PHP allow heterogeneous data.

With this understanding it's worth stepping back and investigating the fundamentals of serialization from first principles, and see if these will influence the design of something new.

## **Compound type fundamentals**

Looking at serialization from first principles, we can get a better understanding of this idea that while both array and object compound types have an order in the file, we only maintain the array’s order. So in the spirit of going ridiculously deep into the subject, let’s start with the definition. The Cambridge dictionary defines serialization as:

**Serialization: the [process](https://dictionary.cambridge.org/dictionary/english/process) of [arranging](https://dictionary.cambridge.org/dictionary/english/arrange) something in a [series](https://dictionary.cambridge.org/dictionary/english/series)**

Here’s an interesting analogy we can use to visualize the concept of serialization, some beads on twine (let’s not overload the word string some more):

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image4.png)

Simply put, a JSON file is simply a series of beads (tokens) that once put on a twine are in a single line and have a single dimension. It also clearly aligns with the definition of arranging thing in series. Once the beads have been strung in line they are not modifiable. This is actually quite a restrictive environment to work in. For interest sake, this is also one of the core concepts that we as engineers and developers have been working with since the invention of the Turing machine.

So, back to a selection from the earlier example:

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image5.png)

This Object clearly has an order once the beads are put on the twine. We’re not able to change values, and we can’t create new dimensions or add twine in different directions. It also has a start and an end. We’ve defined special tokens that signal the start and end of a block. The format doesn’t provide any flexibility beyond adding additional fields and values between the start and end of the block.

We could similarly code the same information in an array:

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image6.png)

In the case of a JSON array, we’ve removed the names, but the important information in the values is retained. The meta data in this case is now outside the format, in documentation, or the program that wrote the file. As in the Object example previously, the format is restrictive and there’s no option for additional meta-data other than the name of the field. While this is often referred to as a self-describing data format, it really doesn’t include much in the way of meta-data that allows a machine to understand the meaning of the data. It really takes a human to understand.

The issue with JSON’s compound types is that they offer very little in the way of flexibility. There’s no option to add type information (as explored in Part 4 on strings), there’s also no ability to add more meta data about the array. While these serialised formats are incredibly restrictive, the question for future data formats is how to create higher levels of flexibility and allow encoding higher levels of information complexity.

## **Structural Primitives**

Using this analogy of beads, it’s possible to come up with a set of structural primitives for data formats. We can then use these primitives to see what a data format supports. The idea is that these structural primitives can exist without computation; that is there are no functions and is not a programming language. For JSON, we can only identify a few different structural primitives:

* **Grouping** \- An array or object groups elements in an order.  
* **Hierarchical Containment** \- Both arrays and objects can themselves contain values of arrays and objects.  
* **Naming** \- An object has named fields (key value association) to assist in being self-describing.

There’s structural primitives that JSON doesn’t support that other data formats do support. For instance, YAML supports additional structural primitives:

* **Type identification** \- Allows a value to be associated with a type to aid in parsing and verification through the \!type syntax. This was also discussed in Part 4\. This goes beyond the formats known types and allows the creation of custom types.  
* **Anchor & Alias** \- Allows referencing and linking to other parts of the document. There’s also examples of this in other data formats like Java’s native binary serialization format. It allows serialization of cyclic graphs that are otherwise not supported in JSON and other formats.  
* **Structural Composition** \- YAML supports merge keys via \<\< syntax which allows merging values from another anchor/alias pair into the current Object. This is a bigger subject and worth its own article in the future. It could include set based composition such as union, intersection, insertion, deletion, extension, and inheritance. While powerful, at what point is a data format starting to become its own programming language?

There’s another structural primitives that are not supported by JSON or YAML:

* **Annotations** \- Allows information to be associated with an object but is not a directly contained value. XML’s attributes are a very good example of this. Attributes sit beside the contained values. This is an area worth exploring further as it potentially opens up the concept of meta-data, and relationships in data files.

These are the primitives I’ve been able to identify so far. If you can think of any other primitives let me know. It’s also important to recognise that these primitives are purely part of the data and not related to schemas. For this reason I haven’t included concepts of constraints on types (e.g. min/max values). It’s also a slippery slope to computation, structural composition is bordering on computation and higher levels of complexity.

With the beads analogy it is possible to visualise the various types of structural primitives. The idea is to demonstrate at a physical level how these primitives show structural composition rather than computation. This is declarative data rather than being a declarative programming language or something else. In the following sections, the round beads represent start and end of blocks such as array or object, while square beads are values such as string or number.

### **Grouping (Ordered or Unordered)**

Demonstrating grouping with beads is the most simple to understand and is the most obvious. For instance an array of six values where reading from left to right the value 1 comes before value 2 and so on that has a start and end. Grouping of values is fundamentally at the core of all serialization.

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image7.png)

From a programming language perspective, order of this type could be a List, Set, Stack (FIFO), Queue (LIFO), or any other list type. The implementation in the programming language could be backed by one or more arrays, use linked lists or other designs. Once serialized, all these forms collapse into this ordered group concept. When the group of values does not require order to be maintained, a group of values could also be interpreted as record, tuple or other internal structure too; in this case additional information is required (i.e. naming).

### **Hierarchical Containment**

Containment is the concept of building a tree structure in a serial format. The outer block (yellow) has four values where the second value (green) is itself a block that contains two values.

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image8.png)

### **Naming or Key Value association**

Adding a name or building a key value association is the concept of augmenting the data with information to support understanding of the value. This is the concept of a JSON object. While order is still present, we can choose whether to honour the order when deserialised. This can also be interpreted or read into either a map or record structure depending on the purpose. This is something worth exploring further later in the article

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image9.png)

### **Type Identification or Schemas**

Adding type or additional meta data about a value is very similar to the previous concept of naming a value. However, while a name is self contained, a type suggests that there is additional information that is known about the type contained within the program reading the value or in an external schema. In the first example, both the name and type are present which provides additional information about the atomic value present.

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image10.png)

In the second example below, the type is used to identify the type of a compound group. Once again, it suggests that the type is a reference to external information about the compound block. The external information could provide further details about what is valid, the individual types contained in the block, or provide deep validation of a full tree. Whether that external information is in a schema or just in the program is not relevant.

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image11.png)

It would be possible to also provide full schema information to describe the structure of the data in the stream. This is the case in data formats that support embedded schemas such as Avro. There’s an important distinction between these primitives and schemas, a schema describes the structure and constraints of what is valid in the data format. These primitives provide the constructs that a schema would describe. The beads analogy and these primitives should come in handy when exploring what might make a good schema solution.

### **References (Anchor & Alias)**

The terms of anchor and alias are from YAML, however, reference is more generic concept. An anchor marks an individual value or block that can then be later referenced. While a reference could also include concepts like full URL links, this is more focused on the concept as part of a single file or data stream. In this case the block containing name2 would receive the value a1 as \*a if effectively a pointer to a previous part of the stream. The alias could refer to a single value or a whole structure of information.

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image12.png)

An alias location could be a specific token in the stream, but it could just as easily be an index into the stream.

When writing a data file, the software must either know that an alias will be found later so that it knows to add an anchor or have some other technique to reference a previous location in the file. This might involve effectively walking a data tree twice to find where a reference is required so the anchor is written, or tracking and marking every value written. This can add complexity to the writer and impact performance. To be able to output a cyclic tree structure this is required.

### **Attributes & Annotation**

While hierarchical containment can be used to create tree structures in serial form, attributes and annotations are adjacent values that are associated with a value or block. They are the sticky notes of a data format and allow adding information without requiring that a previously defined structure is changed. Comments could be considered a form of annotation. Annotations will be explored in detail in a future part of this series. In this example attribute 1 has an association with the following block.

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image13.png)

As mentioned previously, XML attributes provide the closest example of this concept. XML attributes are constrained to simple string values, however, there’s potential for annotations to be more complex data structures. Annotations could also be applied to both blocks as in the example above or to individual values.

### **Structural Composition**

The final concept of structural composition is on the road to being more than a structural primitive and closer to that of declarative programming. The idea being that more than just an alias, structural composition allows manipulation of previous values or blocks in the stream that are inserted into the deserialised form when being read. It could include combining two previously defined Objects (union or composition). From there it could include removal of some fields or values, the modification of values or any other type of manipulation.

![](/images/deep-dive-into-json/part-5-arrays-and-objects-image14.png)

In the example above the top line represents an earlier section of the data. An array with three elements has an anchor “\&a”, and an object with two values, x and y has an anchor “\&b”. The bottom line shows a third object which combines the values from the anchors into a third object. It takes the 2nd value from the array and the y value from the object. The complexity increases as selection of values now requires its own syntax.

It’s safe to say that including any type of structural composition in a data format is a higher order of complexity that will need careful consideration. However, it might be interesting to explore if there are features that expand on anchors and aliases in such a way that does not start to look like XPath selection or XSLT transformations. This will be explored in a later article.

## **Conclusion**

JSON’s arrays and objects provide only the most basic of structural primitives. While this is indeed minimal, it creates a restriction on what can be achieved with the data format. This was suitable for its original purpose of AJAX, as JSON has expanded into other realms, this becomes more cumbersome and difficult to use.

By investigating serialization using first principles and understanding the constrains given by order, a set of primitives have been found. The primitives can be grouped into three classifications:

1. Structural  
   1. Grouping (ordered or unordered)  
   2. Hierarchical containment  
2. Value Augmentation  
   1. Naming (Key/Value associations)  
   2. Typing & Meta Data  
   3. Annotations  
3. Pointers  
   1. References  
   2. Structural Composition

These concepts equally apply to both text and binary data formats. They provide an approach to design new data formats and provide a way to analyse existing data formats. The next article will use this new found knowledge to investigate the syntax of JSON. Understanding the history of the syntax of JavaScript and other languages to see what JSON has inherited and discover if recent directions in programming languages might influence the new design.

