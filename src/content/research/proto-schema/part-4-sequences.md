---
title: "Proto-schema: Part 4. Sequences"
series: "proto-schema"
seriesTitle: "Proto-Schema"
part: 4
originalUrl: "https://litterat.substack.com/p/proto-schema-part-4-sequences"
originalDate: 2026-03-17
abstract: >
  This article examines the Sequence to derive the common data structures found across data formats and programming languages. It reduces the core proto-schema types to the Tuple, Record, Array, Map, and Set. Each derived type is a Sequence that is distinguished by the properties that are active rather than by fundamentally different structure. It connects the common data structures to the underlying physical constraints of serialization. Edge cases like prefix items, flattened sequences, and conditional structures are also examined.
---

# **Proto-schema: Part 4\. Sequences**

### Part 4 in a series of articles that openly designs and develops a proto-schema that provides the underlying data model for building data format schemas.

**Abstract**: This article examines the Sequence to derive the common data structures found across data formats and programming languages. It reduces the core proto-schema types to the Tuple, Record, Array, Map, and Set. Each derived type is a Sequence that is distinguished by the properties that are active rather than by fundamentally different structure. It connects the common data structures to the underlying physical constraints of serialization. Edge cases like prefix items, flattened sequences, and conditional structures are also examined.

![](/images/proto-schema/part-4-sequences-image16.png)

## **Introduction**

Data formats and schemas often create data structures that are a reflection of the programming language or system they were built for. XML has Complex Types, JSON has Objects, and ProtoBufs has Messages to name a few. However, all of these names are some type of Record, with a fixed number of fields with fixed type. Once serialized all of these compound structures become a Sequence. A Sequence inheriting the properties of serialization discussed in the previous articles. And yes, I’m going to repeat it again, a Sequence is:

1. **Linear** \- Information is arranged in a single dimension.  
2. **Immutable** \- Once written, the serialized form is static.  
3. **Finite** \- A serialized document *entity* has a definite beginning and end.  
4. **Divisible** \- The stream consists of atoms (bytes, characters, tokens, numbers, strings). At some level, you reach values that cannot be subdivided further.

You’ll notice the only difference is that I’ve crossed out “document” and added “entity” to limit the application of the form. A Sequence is a finite entity within a larger document, and the same physical properties apply at each level of containment. While data formats will then vary the other compound structures, providing arrays, maps, or sets, these data structures also become a Sequence once serialized. From programming languages where there’s a large variety of data structures, once serialized, everything is a Sequence.

If we recognise that everything is a Sequence, then instead of using words like ComplexType or Object, potentially, we can explore the different forms of a Sequence and come up with better descriptions. This is the task of this article; to see if we can discover from the properties of a Sequence, the core set of data structures required by the proto-schema.

## **Describing Sequences**

The aim of the proto-schema is to come up with a data model for describing the structures of data. In the previous article, we captured properties of sequence, that include:

* Fixed or Variable Length (min/max) \- How many items are allowed.  
* Order/Index type \- Does the value at a specific index have a specific type/meaning?  
* Type \- What type of values are allowed to be present, and are they Homogenous or Heterogeneous.

The following are additional properties that don’t modify the shape so much, but provide additional semantic information about the Sequence:

* Empty or Null values \- Can there be empty spaces in the sequence  
* Duplicates allowed \- Are duplicates allowed.

What would be great, is if the vast majority of Sequences could be described by using a small set of types like Record and Array. By validating the various properties above against the set of types, the outcome should be that all properties and Sequences are describable. A good starting point is to split Sequences into Fixed-Length (where the data is expected to have a fixed number elements in the sequence like records) and Variable-Length (where the data is expected to have a variable length like arrays).

## **Fixed-Length Sequences**

Fixed-length sequences are where the schema describes the Sequence as having a fixed number of items in the data. Looking at the other properties of a Sequence, we can create a table of potential descriptions.

* **Positional, Homogeneous → Vector**  
  e.g. RGB \[uint8, uint8, uint8\], Vec3 \[float, float, float\], embeddings  
  Found in GLSL, NumPy, Arrow FixedSizeList, ML frameworks  
* **Positional, Heterogeneous → Tuple**  
  e.g. (int, string, bool), Python tuple, Rust tuple, SQL row  
  Found in Python, Rust, Haskell, Scala, Swift, Thrift, Avro  
* **Named, Heterogeneous → Record**  
  e.g. JSON Object, XML Complex Type, Protobuf Message, struct  
  Found in every schema system, every typed language  
* **Named, Homogeneous → Record (all same type)**  
  e.g. { “id”: string, “email”: string, “name”: string } just a Record

Fixed-length sequences have inherent ordering (each position is defined) so ordered/unordered is not a distinguishing axis. Duplicates apply to values not structure, so also not distinguishing.

By mapping out the different Sequence properties we quickly discover that three very well known data types appear, Vectors, Tuples and Records. It is worth examining each of these in detail.

### **Vectors**

A Vector is a somewhat overloaded term in computer science, but for this article, a Vector is a fixed-length, the elements are ordered, and the elements are of the same type. Examples of a Vector include:

* **Graphics / Physics**  
  e.g. \[float, float, float\] positional meaning \[x, y, z\] coordinates  
* **Colour space**  
  e.g. \[uint8, uint8, uint8, uint8\] positional meaning \[R, G, B, Alpha\]  
* **Machine learning**  
  e.g. \[float, ..., float\], an embedding (where index 5 might represent ‘sentiment’)  
* **Geospatial**  
  e.g. \[double, double\] positional meaning \[Latitude, Longitude\]

In many cases there’s a dotted line between a Vector and a Record as the positional meaning is often named. However, a Vector is always serialized without any name, usually for performance reasons. There’s also a dotted line to Arrays of fixed length, however, arrays don’t have named values.

In most cases, a Vector would not allow empty or null values, but there’s probably no reason not to allow them as an option. The concept of restricting duplicates doesn’t apply because positional meaning makes each element distinct regardless of value.

### **Tuple**

A Tuple is simply a Vector that has Heterogeneous elements. Tuples have a fixed-size and each position has a specified type and meaning. Some examples include:

* **Database row**  
  e.g. (int, string, string) positional meaning (ID, FirstName, LastName)  
* **HTTP response**  
  e.g. (int, string) with positional meaning (StatusCode, StatusMessage)  
* **File metadata**  
  e.g. (string, long, bool) meaning (FileName, ByteSize, IsReadOnly)  
* **Geo-event**  
  e.g. (Vector3, long) meaning (Coordinates, Timestamp)

In programming languages a Tuple is often a temporary type used to carry results from a method. Once again, there’s overlap with a Record here in that while the index positions are named, the names are not serialized. Once again, this is for brevity, but has the advantage that it doesn’t lose the fact that the data is described completely.

Unlike a Vector, it is more common that empty/null values are allowed. The concept of restricting duplicates doesn’t apply; each position carries independent meaning regardless of whether values repeat.

It is worth noting that a Vector could just as easily be described as a Tuple where every position shares the same type. A Vector could also be described as a fixed length Array. Given its ability to be described by other structures, a decision will need to be made as to whether it belongs as a core type in the proto-schema.

### **Record**

A Record is the most familiar of all Sequences. A Record is a Tuple that removes the need for positional meaning and replaces it with naming or tagging. The JSON Object is a very familiar Record type with String based names, however, in binary systems, the string based name is usually replaced with an integer field number such as in ProtoBufs. Examples of Records include:

* **User profile**  
  e.g. { id: int, email: string, verified: bool }  
* **Transaction**  
  e.g. { from: ID, to: ID, amount: decimal }  
* **Sensor data**  
  e.g. { sensor\_id: string, reading: Vector3 }  
* **Configuration**  
  e.g. { port: int, debug\_mode: bool, timeout: int }

An interesting double edged sword of having the field names in the data is that it allows fields to not be included in the data. While for both Vector and Tuple a mismatch in size is enough for the serialization engine to report an error, a missing field for a Record could mean it is optional or not required.

This concept of optional and required fields is mostly debated in relation to forward and backward compatibility. This is an interesting area and is related to schemas and data formats allowing extra information such as a new field that a later schema version understands but the older/current implementation doesn’t. This topic relates to the topic of closed-world or open-world semantics. It requires further exploration and will be the subject of a later article.

If a field is missing in the data, but is present in the schema, another way to handle it is via default values. Default values can be useful in allowing more compact data and in dealing with compatibility issues between versions.

Another small issue with allowing names for keys is that it opens the door to duplicate values. While this might be dealt with as an error in some circumstances (e.g. security data), in most cases it avoids errors; the last entry wins and any previous values are discarded.

### **The Fourth Type (N/A)**

It’s worth mentioning that for completeness, the table above includes the concept of a fixed-length sequence that uses names but all the element types are homogeneous. In JSON, this might look like:

{ “id”: string, “email”: string, “first\_name”: string, “family\_name”: string }

This is just a Record where all the types happen to be the same. It validates that type differences of homogeneous and heterogeneous do not change or create a new feature for Records.

## **Variable-Length Sequences**

Similar to fixed-length sequences, the following table shows possible types using the same Order/Index and whether the elements are homogeneous or heterogeneous.

* **Positional, Homogeneous → Array**  
  e.g. \[1, 2, 3, 2, 1\] temperature readings, follower lists, event logs  
  Found in JSON, Protobuf repeated, Thrift list, Avro array, XML, every language  
* **Positional, Heterogeneous → Array of Choice**  
  e.g. \[12, “hello”, 34, “world”\] described as Array of (integer | string)  
  Found in JSON arrays (natively heterogeneous), YAML  
* **Keyed, Homogeneous → Map**  
  e.g. { en \=\> Hello, fr \=\> Bonjour } translations, config lookup, HTTP headers  
  Found in JSON Object (as dictionary), Protobuf map, Thrift map, Avro map  
* **Keyed, Heterogeneous → Map with Choice values**  
  e.g. { timeout \=\> 30, name \=\> “server1” } described as Map\<String, integer | string\>  
  Found in JSON Object (untyped values), YAML mappings

As with fixed-length, heterogeneous variants collapse via Choice rather than requiring distinct types.

While Element type (heterogeneous/homogeneous) was enough to distinguish fixed length Sequences, it doesn’t provide a good way to split variable length types. The positional access can be further split using Order and whether duplicates are allowed:

* **Ordered, Duplicates allowed → Array (List)**  
  e.g. \[1, 2, 3, 2, 1\] temperature readings, follower lists, event logs  
  Found in JSON, Protobuf repeated, Thrift list, Avro array, XML, every language  
* **Ordered, No duplicates → Unique List (Ordered Set)**  
  e.g. \[A, B, C\] ranked leaderboard, browser history (deduped), priority output  
  Found in Java LinkedHashSet, Python dict (3.7+), C++ flat\_set  
* **Unordered, Duplicates allowed → Bag (Multiset)**  
  e.g. {apple, banana, apple} shopping cart, word frequencies, SQL SELECT (no DISTINCT)  
  Found in SQL bags, C++ std::multiset, Guava Multiset, ASN.1 SET OF  
* **Unordered, No duplicates → Set**  
  e.g. {read, write, execute} permissions, tags, unique identifiers  
  Found in Thrift set, ASN.1 SET OF, JSON Schema uniqueItems, Python set, Java Set

It is useful to list all these different types to ensure coverage of known types, however, once serialized, all Sequences are ordered. It is up to the reader to decide if order will be honoured or not. The physical constraint of linearity means that ordering is always present in the data; ‘unordered’ is an instruction to the reader, not a property of the wire format. Similarly, with duplicates, any list of items may or may not have duplicates in the value list once serialized (through user error, or code error), it is up to the reader to decide if duplicates are to be copied into the target programming language data structure.

The two data structures that really stand out from this List are Array and Set. While Set can be considered a sub-type of Array, the usefulness of Set and its relationship to Enumerated types makes it a likely candidate for being elevated to a core type. This is also likely why other serialization formats like Thrift and ASN.1 elevate this specific Sequence type to their core set of data structures.

Similarly to Arrays, Maps can be further split along Order and whether duplicates are allowed:

* **Ordered, Unique keys → Ordered Map**  
  e.g. {”a”: 1, “b”: 2} — JSON objects (de facto), config files, insertion-ordered lookups  
  Found in JS Map, Python dict (3.7+), Java LinkedHashMap, C++23 flat\_map  
* **Ordered, Duplicate keys → Ordered Multimap**  
  e.g. HTTP headers (Set-Cookie repeats, order matters), XML repeated child elements  
  Found in C++ std::multimap, Guava LinkedListMultimap, HTTP/1.1 headers  
* **Unordered, Unique keys → Map (Dictionary)**  
  e.g. {”timeout”: 30, “retries”: 3} — config lookup, translations, ID→value  
  Found in Protobuf map, Thrift map, Avro map, Java HashMap, Go map  
* **Unordered, Duplicate keys → Multimap**  
  e.g. tag→\[values\], student→\[courses\] rarely serialised as a flat structure  
  Found in Guava Multimap, C++ std::unordered\_multimap

In this case, the additional attributes have shown variants of Map types. From a proto-schema perspective it would be too detailed to provide all of these variants. The Map (Dictionary) with unordered elements and unique keys stands out as the more common variant.

From this analysis, two core variable-length Sequence types emerge, the Array and Map.

### **Array**

In data formats like JSON, an array is Heterogeneous, allowing values of various types. In this case I’m using the more classic definition: an array has a variable length of elements of the same type. For example:

* **Telemetry**  
  e.g. \[22.5, 22.7, 23.1, ...\] A series of temperature readings over time. i.e. \[float\]  
* **Social media**  
  e.g. \[UserID, UserID, UserID\] A list of followers (length changes constantly).  
* **Physics sim**  
  e.g. \[Vector3, Vector3, ...\] A list of particle positions in a 3D space. i.e. \[Vector3\]

It is interesting to note that schema systems like ProtoBufs do not include the concept of an array, but instead use the concept of “repeated” fields. While this conflation of concepts has some benefits, my preference is for a clear separation of concerns. The array concept also maps to many programming languages, so while it might be worth further exploration, the Array as a core entity is likely to remain.

### **Map**

A Map provides an association between keys and values that may be ordered or unordered. There’s an expectation that a map contains unique key values. In a data format like JSON, both a Map and Record are serialized to the same form, in other data formats they are seen as two distinct structures. Here’s some examples:

* **HTTP headers**  
  e.g. { Content-Type \=\> text/html, Language \=\> en }  
  Dynamic metadata: Map\<String, String\>  
* **Translations**  
  e.g. { greet \=\> Hello, exit \=\> Goodbye }  
  Localisation strings: Map\<String, String\>  
* **Lookup table**  
  e.g. { 101 \=\> \[0, 5, 2\], 102 \=\> \[10, 0, \-1\] }  
  Mapping IDs to physical locations: Map\<Int, Vector3\>

A Map is interesting in that it could be described using the array type. In this situation a Map is simply an array of tuple pairs. So the HTTP Headers example could be:

\[ ( “Content-Type”, “text/html” ), (“Language”, “en”) \]

In reality, this is such an important and often used data structure that from a convenience point of view, it is better to promote this and make it available in its own right.

## **Other data structures**

While the survey has managed to capture and document a high percentage of common data structures, the following were also considered.

* **Enum** \- Closed Choice over a Set of atomic values. Composes from Set \+ Choice.  
* **Scored Set** \- Ordered Map where ordering derives from values. Additional axis: ordering criterion. e.g. Redis ZSET, priority queues  
* **Tree** \- Recursive nesting of existing types. Additional axis: topology / recursion. e.g. XML, JSON, ASTs, file systems  
* **Graph** \- Requires references (structural composition). Additional axis: element relationships / topology. e.g. RDF, Neo4j, GraphQL  
* **Tensor** \- Multi-dimensional Vector. Additional axis: dimensionality / rank. e.g. NumPy ndarray, PyTorch, TensorFlow  
* **DataFrame / Relation** \- Array of Records (row view) or Record of Arrays (column view). Additional axis: dual-access, per-column typing. e.g. SQL tables, Pandas, Apache Arrow  
* **Queue / Stack / Deque** \- Array with access discipline constraints. Runtime concern, not serialization.  
* **Option / Maybe** \- Multiplicity 0..1 of a type. Handled by multiplicity.

In all cases, the data structure required additional capabilities such as requiring references or could be composed based on the common types.

## **Other Sequences and Annotations**

By systematically examining the properties of Sequences, this exploration has identified the core data structures. However, a schema system that allows describing data using these types of structures will not be able to describe all Sequences. There’s a few types of Sequences that are not describable using the core types and are worth investigating.

The first is the concept of [prefix items](https://www.learnjsonschema.com/2020-12/applicator/prefixitems/) from JSON Schema. It allows JSON Schema to specify that an Array must start with specific types, and then allows subsequent values to either be a specified type or any value depending on the configuration. It can be thought of as combining a Tuple with an Array of type or Array of Any type in a flattened single output Sequence instance.

The second concept is the idea of repeated elements in a Sequence, let’s say that I’d like to describe a single Sequence that has one or more integers followed by one or more strings. Similar to the above, I expect the output to be flattened to a single output Sequence instance.

In both cases above there’s a conflation of concepts like Tuples, Vectors or Arrays that are being flattened into a single Sequence. From a schema perspective, I would argue that it is better that this conflation does not occur, as it creates confusion. However, there are instances such as in low-level binary data formats and memory layouts where such considerations may be warranted. In those cases, I would suggest that “flattening” is a data-format specific performance trait and the schema should stay clean.

Another case that the above doesn’t cover is the “if/then/else” concepts. It is not possible to describe a sequence that starts with an integer, and depending on the value, what follows is either a tuple, array, or record. There’s a concept of dependent types from type theory that is related to this. This concept is available in [JSON Schema](https://json-schema.org/understanding-json-schema/reference/conditionals#ifthenelse), and might be worthy of further consideration later.

In some situations in a schema, there might be information missing. Take for example a Tuple of three elements where the first two element types are known, but the third element is to be filled in at a later time. This is the conceptually of templates or partial-types; it’s an interesting subject and worthy of its own article.

Annotations are another type that did not get found by investigating the properties of Sequences. Annotations are a mechanism for attaching additional information to those types without changing them. I’ve previously described them as sticky-notes, so in a way it is not surprising that they are not found within the structure of Sequences like the other types above. From a theory point of view, Annotations sit beside the Sequence entities in the document and not within them.

## **Proto-schema core types**

The aim of the proto-schema is to create a set of rules and structures that can be used to describe the vast majority of serialized data. This article reveals that some traits of Sequences are physical (e.g. fixed-length vs variable length), while others provide behavioural traits that are not reflected in the physical constraints of the Sequence (e.g. unordered or duplicates).

What this shows is that all types reduce to a Sequence; as such it might be possible to define the proto-schema with nothing but a Sequence type with specific traits. However, the concept of purity adds a cognitive load on developers and LLMs alike that takes it too far. As such there needs to be a middle ground that provides the most important data structures and potentially allows the others to be derived as sub-types. For example, the Array and Map types could contain constraints like:

Array:  
constraints:  
optional unordered: boolean // does sequence order carry meaning?  
optional uniqueItems: boolean // are duplicates prohibited?  
optional minItems: integer  
optional maxItems: integer

Map:  
constraints:  
optional unordered: boolean // does key order carry meaning?  
optional duplicateKeys: boolean // are duplicate keys allowed?  
optional minItems: integer  
optional maxItems: integer

The constraints provide opt-in restraints on the sub-data structures to create types like Set, Bag, or Ordered Maps. A Set could simply be derived from Array where constraints of unordered and uniqueItems are set to true.

For the proto-schema the core set selected are Tuple, Record, Array, Map and Set. Vector is a very useful type and common in systems, but is not a required core type for schema creation. These can be summarised as Sequence with the following traits:

|  | Positional access | Named/Keyed access |
| :---- | :---- | :---- |
| **Fixed-length** | Tuple | Record |
| **Variable-length** | Array | Map |

All other common data structures, Vector, Bag, Unique List, Ordered Set, Multimap, Ordered Map are derivable as constrained configurations of these four types. Heterogeneous variants collapse via Choice in all cases.

The odd one out in this list is Set, which is required to define Enumerated types. Enums are incredibly important to data communication systems and already a common inclusion in other systems.

## **Conclusion**

Looking at all the combinations of Sequence traits explored in the fixed-length and variable-length Sequences, every outcome either produces a recognised data type or collapses into one that already exists. Homogeneous Records are just Records. Heterogeneous Arrays are Arrays of a Choice type. There’s no combination of the properties, length, indexing, and element types that produces a structure not covered by these five types. Along with annotations that sit beside the Sequence structures, it creates a solid foundation and constructive argument that all serialization schemas and data formats reduce to these types as they are reflective of the physical properties of Sequence.

A few topics have been flagged from this article for future articles, this has included the idea of open-world or closed-world semantics and what it means for backward and forward compatibility. There’s also the question of if the proto-schema should support if/then/else or support some kind of flattening, allowing the combination of Tuples, Vectors or Arrays into a single output Sequence. As well as the topic of templates and partial types.

For now, this is good progress towards a practical design of a proto-schema. The conclusion from [Part 2](/research/proto-schema/part-2-what-is-a-schema) showed that a proto-schema is a group of definitions where each definition has a type name and a structure. The structures allowing four basic properties, following this article the Sequence property can now be expanded:

* **Choice (Sum)** \- one of these options  
* **Sequence (Product)** \- this followed by that  
  * Tuple \- Fixed-length sequence of specified types.  
  * Record \- Fixed-length sequence of named values.  
  * Array \- Variable length sequence of a type.  
  * Set \- Sub-type of Array. Unordered, no duplicates. Foundation for Enum types.  
  * Map \- Variable length of Key/value pairs of specified types.  
* **Multiplicity** \- how many times  
* **Naming** \- references to other type names.

There’s still more interesting topics to explore. The next article will revisit the topic of templates and partial-types which was explored in [Part 9](/research/deep-dive-into-json/part-9-templates-and-schemas) of the previous series. This time from the perspective of the proto-schema.

