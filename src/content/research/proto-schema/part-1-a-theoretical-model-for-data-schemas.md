---
title: "Proto-Schema: Part 1. A theoretical model for data schemas"
series: "proto-schema"
seriesTitle: "Proto-Schema"
part: 1
description: >
  The article introduces the concept of a proto-schema and provides context and direction for using seven structural primitives identified in the previous series as the way to develop a proto-schema from first principles.
originalUrl: "https://litterat.substack.com/p/proto-schema-part-1-a-theoretical"
originalDate: 2026-02-25
abstract: >
  The article introduces the concept of a proto-schema and provides context and direction for using seven structural primitives identified in the previous series as the way to develop a proto-schema from first principles.
---

# **Proto-Schema: Part 1\. A theoretical model for data schemas**

### Part 1 in a series of articles that openly designs and develops a proto-schema that provides the underlying data model for building data format schemas.

**Abstract:** The article introduces the concept of a proto-schema and provides context and direction for using seven structural primitives identified in the previous series as the way to develop a proto-schema from first principles.

![](/images/proto-schema/part-1-a-theoretical-model-for-data-schemas-image1.png)

## **Introduction**

Writing ten articles in the series, “A Deep Dive into JSON” was about exploring the history and underpinnings of JSON, one of the most popular data interchange formats currently used. The aim was to develop a deep understanding of the format and discover if there was enough room to build on its legacy; the overwhelming answer in my mind was yes. My plan was to rush into using what was found in those articles to develop TSON, a data format that expanded on JSON’s core. However, I hit a wall. I realised that our current understanding of schemas is fragmented. To build TSON, I couldn’t just patch existing ideas, I had to understand and model the structural primitives of serialization itself. As such, I’ve stepped back from developing TSON to explore the concepts of a proto-schema. A proto-schema, a term I’ve created, is a data model used to describe the structural primitives of serialization and will form the basis to develop schemas for TSON and potentially other future data formats.

***proto-** prefix. Original; primitive; the first or lowest in a series.*

***schema** noun. An outline of a plan or theory in the form of a model.*

The proposed proto-schema may never get past providing thought provoking background reading for future data schemas and formats. However, data formats are the fabric of the internet, that now transfers exabytes of data daily. With the rise of AI, more and more, AI systems will build and communicate information between themselves. Where developers might have prioritised visual readability, minimal syntax and convention over configuration, AI systems are more likely to prioritise semantic transparency, explicit structure and verifiable schemas. Building schemas and data formats that are built on a strong theoretical basis that evolve to the needs of AI are likely to have better outcomes. The aim of this series is to develop a deeper understanding and better shared vocabulary and science of data schemas and provide the theoretical underpinnings for the future TSON work and associated TSON schema.

There’s no need to read the last ten articles to understand this series. While those articles provide the context and a deeper look at JSON, I’ll reference sections where relevant. An understanding of data formats and some familiarity with data schemas would be beneficial. As this will be a “by first principles” series, the underpinnings should be well explained as the articles expand.

## **History and Context**

Data formats are required to be stable and by this requirement alone take longer than programming languages to evolve and change; often decades instead of years. I’ve had a long interest in data formats and first encountered the problems associated with custom formats in the mid 1990s while writing a white-board drawing program in Pascal. The custom application used ascii over modems (via dial-up BBSs) to allow users to share simple drawings. It wasn’t anything spectacular, but it gave me the first look of protocols and sharing information in distributed systems.

Since that time, I’ve watched the industry churn through various attempts to develop better distributed information sharing systems. The notable solutions have included ASN.1, CORBA (IIOP), XML (DTDs, XML Schema, XML Web Services), Agents, JSON, ProtoBufs, and YAML to name a few. In the early 2000s, I also developed a binary [Data Representation Language](https://patents.google.com/patent/WO2005038650A1/en) that, similar to Avro, provided a binary data format that included a binary encoded schema. The most interesting part of that work was that the meta-schema appeared to be self-referencing. Its binary schema referenced its own meta-schema structures to encode itself. In 2021, I was inspired again to take another look at serialization after reading Brian Goetz article [Toward’s better serialization](https://openjdk.org/projects/amber/design-notes/towards-better-serialization) and that resulted in the unfinished [Litterat](https://github.com/litterat/litterat/) serialization framework for Java and more notes on [serialization theory](https://github.com/litterat/litterat/blob/main/litterat-theory.md). However, as I’ve investigated, there seemed to be more to discover and that has led to this writing. Much of serialization theory is embedded into the work and difficult to discover; so the previous deep dive and my continued writing aims to bring the problems and solutions further to the surface.

While the last deep dive into JSON was from the context of JSON, it also provided a point from which to investigate the structures that underlie all serialization. This started with the Cambridge definition:

***Serialization**: the process of arranging something in a series*

From this definition we can observe a few unbreakable physical truths about serialized structured data:

1. **Linear** \- Information is arranged in a single dimension.  
2. **Immutable** \- Once written, the serialized form is static.  
3. **Finite** \- A serialized document has a definite beginning and end.  
4. **Divisible** \- The stream consists of atoms (bytes, characters, tokens, numbers, strings). At some level, you reach values that cannot be subdivided further.

These physical truths about serialized data create a restrictive environment to work. While programming languages may use pointers and shift information between parts of memory to create interesting data structures, the serialized environment limits what is possible to a small set of structural primitives. In [part 5](/research/deep-dive-into-json/part-5-arrays-and-objects) of the last series, I was able to observe a core of seven structural primitives:

* **Grouping** \- A group of elements having a specific count of elements in an order.  
* **Hierarchical containment** \- A group of elements having an element that itself is another group of elements.  
* **Naming (Key/Value associations)** \- Adding a name to a value to provide either a key or a description of the value.  
* **Typing & Meta Data** \- Adding a type or meta data to the value to help better describe the structure or syntax of the data.  
* **Annotations** \- Adding additional information that is adjacent to the value but not part of the value. Comments are a form of annotation.  
* **References** \- Providing pointers to other parts of the data to allow cyclical graphs.  
* **Structural Composition** \- Use references to allow combining structures from data already present in the document.

By observing rather than theorising, my belief is that these primitives form the basis for all serialized structured data. These will be revisited in depth in this series, however, it’s worth noting that I found JSON uses three (grouping, hierarchical containment, and naming), while YAML allows all seven. It is from this understanding of the physical truths of serialization and the observed structured primitives that we can begin to explore the relevance and relationship between data, schemas, meta-schemas and the creation of a proto-schema.

## **Data, Schemas, Meta-Schemas & Proto-Schemas**

The previous series, “A deep dive into JSON”, focused primarily on the JSON data format and the design choices it made. This series zooms out to recognise the wider picture that includes schemas, meta-schemas and the concept of proto-schemas. Before moving on, let’s define each concept:

* **Structured data** \- A data document/file/download that contains structured data in a format such as JSON/XML/YAML. Structured data has a specific structure that is either inherent (i.e. it has an adhoc structure with no formal specification), or defined by a schema or documentation.  
* **Schema** \- A schema document that defines and is able to validate that structured data conforms to its definition. Examples of schemas are JSON Schema, XML Schema, or Protobufs schema documents.  
* **Meta-schema** \- A meta-schema is a document or grammar that defines what is allowed and not allowed when defining a schema document. In the case of Protobufs the meta-schema is defined by the grammar rules of the Protobufs Interface Definition Language (IDL). For JSON Schema the meta schema is partially defined by the [JSON Schema document](https://json-schema.org/draft/2020-12/schema) and supplemented by the [JSON Schema specification](https://json-schema.org/specification). In some cases the meta-schema becomes a bootstrap for a system and can use its own data structures to define the meta-schema itself.  
* **Proto-schema** \- The proto-schema is a data model and core principles that were used to define the meta-schema. This underlying data model will often share many of the same concepts across meta-schemas; for instance a JSON Object is conceptually similar to Protobufs Message type and XML’s Sequence type. An Object/Message/Sequence are all similar to the algebraic data Product type.

The gap to be explored in this series of articles is what proto-schema models make sense to describe the different types of structural primitives. In particular, what are useful ways to model the structural primitives and possibly more importantly, what ways are detrimental or are overly complex proto-schema models to describe the underlying structural primitives.

## **A Concrete Example: Data, Schema, and Meta-Schema**

Before jumping into the weeds of proto-schemas and its relationship to structural primitives, it’s worth looking a little deeper at the above concepts and relationship between data, schemas, meta-schemas and the meaning behind a proto-schema in a little more detail.

Consider a simple JSON document describing a Point:

`{`  
`“x”: -38,`  
`“y”: 144`  
`}`

This data has structure (an object with two fields), but nothing in the document itself tells us whether \`x\` and \`y\` are required, whether they must be integers, or whether they represent latitude and longitude, or describe what is an acceptable range. The data doesn’t tell us whether other fields are permitted, or even if we should consider the structure as a whole as a Point.

A schema is what formalizes these constraints. Using a minimal and made up schema notation we could say that above data is described by the following:

`record Point`  
`{`  
`x: Integer`  
`y: Integer`  
`}`

This schema declares that a \`Point\` must be a record with exactly two integer fields. The original data above validates against this schema; however \`**{”x”: “ten”, “y”: 25, “z”: 1 }**\` would not. What makes this definition of a record itself valid? Why can we write \`x: Integer\` but not \`x: Latitude\`? What constructs beyond \`record\` are permitted?

The rules of the schema are defined by a meta-schema. Meta-schemas can be defined in a number of different ways, one method is to develop an interface definition language (IDL) as is the case with [ASN1](https://www.itu.int/rec/T-REC-X.680-202102-I/en) and [Protobufs](https://protobuf.com/docs/language-spec). Another method is to attempt to use a combination of documentation and a format’s own schema language; this is the approach taken by [XML Schema](https://www.w3.org/2009/XMLSchema/XMLSchema.xsd) and [JSON Schema](https://json-schema.org/draft/2020-12/schema). Using a similar schema notation as the Point definition above, we could define our meta-schema as:

`record Field {`  
`name: String`  
`type: TypeRef`  
`}`

`record Record {`  
`name: String`  
`fields: Array<Field>`  
`}`

`record Array {`  
`element: TypeRef`  
`}`

`union TypeRef {`  
`Primitive(String) |`  
`Reference(String) |`  
`Array(Array)`  
`}`

`record Schema {`  
`definitions: Array<Record>`  
`}`

This meta-schema is incredibly simplistic, but shows that to define a Record we also need new types like arrays, type references, primitive data types and a global schema type. Records, unions and type references are the same kinds of constructs found in more complex schemas, however, in this case the meta-schema is self-referential. This is the bootstrap problem for meta-schemas; a meta-schema must be expressive enough to describe the information required to validate its own structures.

Each layer, data, schema and meta-schema is validated by the one below it. While the meta-schema is said to be validated by itself, how do we know that the types and structures of the meta-schema are correct and useful? This is where proto-schema thinking begins. Rather than treating the meta-schema as the bottom layer, we can ask: what fundamental concepts does the meta-schema rely on and how do we know we have the right structures for the meta-schema?

The example meta-schema above uses records, unions, arrays, references and primitive values. These aren’t arbitrary choices, they’re based on structural primitives that are based on the physical constraints of serialized data. While you’ll find the same concepts across schema systems from JSON Schema to Protobufs to XML Schema, they’ll have different names. A record might be a Sequence, Object, Record or Struct, and more recently be based around a mathematical base like algebraic data types (ie A record is analogous to a Product type).

The aim for the proto-schema is to investigate the underlying physical constraints of serialization and the observed structural primitives. The meta-schema above is simplistic and doesn’t offer features such as annotations, definable primitive types, structural references, or more specific strong typing. The outcomes of this series will provide a theoretical basis to define a more complete meta-schema which will in-turn allow better schemas and finally, more expressive data.

## **Conclusion**

In [part 10](/research/deep-dive-into-json/part-10-constraints-and-layers) of the previous series, I described meta-schemas as a self-referencing head-fuck that has hardly been researched. The self-referential aspects of meta-schemas mean that as soon as you modify one aspect of the model the changes ripple through the model at quantum speed. Before attempting to build a final meta-schema, this series will investigate each aspect of the observed structural primitives of serialization. Once complete, there should be enough information to both define a useful meta-schema for TSON and potentially provide a deep understanding of serialization that will be useful for other data formats. The next article will focus on discovering the first principles of schemas by returning to the analogy of beads on twine.

