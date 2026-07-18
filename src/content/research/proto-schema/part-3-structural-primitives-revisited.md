---
title: "Proto-schema: Part 3. Structural Primitives Revisited"
series: "proto-schema"
seriesTitle: "Proto-Schema"
part: 3
description: >
  This article revisits the seven structural primitives identified in the previous series and reclassifies them through the lens of the proto-schema. By examining each primitive against the physical constraints of serialization and the needs of schema design, the seven collapse into three categories:...
originalUrl: "https://litterat.substack.com/p/proto-schema-part-3-structural-primitives"
originalDate: 2026-03-10
abstract: >
  This article revisits the seven structural primitives identified in the previous series and reclassifies them through the lens of the proto-schema. By examining each primitive against the physical constraints of serialization and the needs of schema design, the seven collapse into three categories: structural primitives, semantic markers, and structural composition. The analysis reveals that most familiar data structures like records, arrays, tuples, sets, maps are variations of a single underlying Sequence primitive.
---

# **Proto-schema: Part 3\. Structural Primitives Revisited**

### Part 3 in a series of articles that openly designs and develops a proto-schema that provides the underlying data model for building data format schemas.

**Abstract:** This article revisits the seven structural primitives identified in the previous series and reclassifies them through the lens of the proto-schema. By examining each primitive against the physical constraints of serialization and the needs of schema design, the seven collapse into three categories: structural primitives, semantic markers, and structural composition. The analysis reveals that most familiar data structures like records, arrays, tuples, sets, maps are variations of a single underlying Sequence primitive.

![](/images/proto-schema/part-3-structural-primitives-revisited-image7.png)

## **Introduction**

This series is developing the idea of a proto-schema; a conceptual data model that is designed to help develop better meta-schemas which will result in better schemas and potentially a more complete data format TSON. While [Part 1](/research/proto-schema/part-1-a-theoretical-model-for-data-schemas) provided the motivation and definitions, [Part 2](/research/proto-schema/part-2-what-is-a-schema) demonstrated from first principles how the underlying physical properties of serialization become apparent in not just schemas, but in mathematics, formal grammars, and type systems. This article revisits the seven structural primitives previously documented in [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects) of the deep dive into JSON series with an eye to understanding them in the context of schemas, meta-schemas and the goal of building a better proto-schema.

## **Aim of the proto-schema**

Before diving into exploring the different structural primitives, it’s worth getting a better understanding of why they’re worth exploring and how they relate to the end goal of a better proto-schema. In the previous article, the conceptual framework for specifications and schemas was discussed. A specification describes what makes a valid instance of data, for example, “This array must contain integers with values between 0 and 50, have at least one item, and no more than ten.” The specification deals with structures that already exist, such as arrays and records. For example, the following is a valid instance of that description:

`[ 10, 5, 0, 7, 12, 43 ]`

A schema is a way of taking a text based description like above and creating a more formal and normalised definition. So we could capture what’s in the text specification formally as:

MyArraySpec: Array { type: SmallInteger, minItems: 1, maxItems: 10 }  
SmallInteger: Integer { minValue: 0, maxValue: 50 }

A meta-schema defines the structures used by schemas and creates limits on what can be specified, for instance, an array has an element type, a minimum length, a maximum length; but in the case above doesn’t specify if empty values are allowed. The meta-schema defines the vocabulary for writing schemas. The meta-schemas of XML Schema, JSON Schema, Protobufs are themselves described as either text or formal methods. For example, the meta-schema for [XML Schema](https://www.w3.org/2001/XMLSchema.xsd) is itself defined using XML and is 2534 lines long.

The questions we’re attempting to ask with the proto-schema is, what is the right underlying model for the meta-schema? If we start from the right proto-schema, that will affect what is definable by a schema and by extension it will influence the data format design.

Consider XML attributes as an example. XML offers two places to put data on an element: child elements and attributes. Attributes are string-only, unordered, can’t nest, and use different syntax from elements. This creates a model where every XML schema author asks, should this bit of information be an attribute or an element?

`<!-- Using an attribute -->`  
`<person name=”Alice” age=”30”/>`

`<!-- Using child elements -->`  
`<person>`  
`<name>Alice</name>`  
`<age>30</age>`  
`</person>`

XML’s meta-schema of course allows describing attributes because the format has them. But XML attributes are conceptually somewhere between an annotation and an optional element, they are limited to be a single value string. XML attributes don’t have similar structures in programming languages and as will be explored, don’t have a strong correlation with structural primitives. From a proto-schema perspective, they’re not great for a proto-schema model.

XML attributes might be an easy concept to exclude, but what structures are worth including? It’s for this reason, this article is revisiting structural primitives. The structural primitives are a catalogue of observed ways of creating compound structures within the physical properties of serialization. It provides the background required before moving on to programming language data structures and how they relate to serialization and schemas.

## **Beads on Twine**

Back to first principles again. While structured data and the associated data formats are written from programming languages, once written the formats observe some fundamental physical rules of serialization:

1. **Linear** \- Information is arranged in a single dimension.  
2. **Immutable** \- Once written, the serialized form is static.  
3. **Finite** \- A serialized document has a definite beginning and end.  
4. **Divisible** \- The stream consists of atoms (bytes, characters, tokens, numbers, strings). At some level, you reach values that cannot be subdivided further.

The beads on twine (the bracelet analogy) is a good way to visualise these properties.

![](/images/proto-schema/part-3-structural-primitives-revisited-image8.png)

## **Sequence (Previously Grouping)**

A sequence of values is the most obvious way of grouping information. For instance an array of six values where reading from left to right the value 1 comes before value 2 and so on that has a start and end. Grouping of values is fundamentally at the core of all serialization. The beads analogy can be used to represent the array of six numbers above.

There’s a number of properties we can capture about a sequence, that include:

![](/images/proto-schema/part-3-structural-primitives-revisited-image9.png)

* Fixed or Variable Length (min/max) \- How many items are allowed.  
* Order/Index type \- Does the value at a specific index have a specific type/meaning?  
* Type \- What type of values are allowed to be present, and are they Homogenous or Heterogeneous.

The following are additional properties that don’t modify the shape so much, but provide additional semantic information about the Sequence:

* Empty or Null values \- Can there be empty spaces in the sequence  
* Duplicates allowed \- Are duplicates allowed.

These are the properties that come to mind. Depending on the settings of these properties a number of well known types appear including, sets, arrays, tuples and records. When looking at other schema systems this same concept is known as a Complex Type (XML), Object (JSON), Sequence (ASN.1), Message (ProtoBufs), Record, Enum, or Array in other systems. I previously referred to this as Grouping, but from now on I’ll refer to it as a Sequence. Sequence is more descriptive of what it is.

The Sequence will be investigated in an individual article later in the series due to how important it is.

## **Hierarchical Containment**

Containment is the concept of building a tree structure in a serial format. The outer block (yellow) has four values where the second value (green) is itself a block that contains two values.

![](/images/proto-schema/part-3-structural-primitives-revisited-image10.png)

This can be easily demonstrated using an array of points:

\[ { x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }, { x:10, y: 20 }, { x:10, y: 10 } \]

The array is one structural sequence of values, and it holds values in another type. This also maps directly to the way schema systems reference other types.

PointList: Sequence { type: Point, minItems: 1, maxItems: 10 }  
Point: Record { x: SmallInteger, y: SmallInteger }  
SmallInteger: Integer { minValue: 0, maxValue: 50 }

Other than creating a reference to another definition in the schema, type referencing doesn’t require any further information.

## **Field Identification (Previously Naming) and Key Value association**

This structural primitive comes directly from JSON Object values that have two distinct and quite different outcomes from the same syntax. The first is adding a field identification key with the aim of augmenting the data with information that can be used later to associate the value with the right record field. However, a JSON Object can also be a key/value association where the key forms part of the data and represents a map. Another way to represent a map is as an array of key/value pairs, however, as it is such a commonly used structure a more efficient syntax is often used.

![](/images/proto-schema/part-3-structural-primitives-revisited-image11.png)

In text based formats, adding the name is also a method in making the format “self-describing”, embedding parts of the schema (or meta-data) within the data. In other data formats like ProtoBufs, a slot identifier has also been utilised as another method to effectively “name” the value.

In terms of informing the proto-schema design, field identification via names or slots are well established methods for linking data format fields to the schema and programming language records. For key/value associations it requires further investigation and potentially for templates which were explored in [Part 9](/research/deep-dive-into-json/part-9-templates-and-schemas) of the previous series.

## **Type Identification or Schemas**

Adding type or additional meta data about a value is very similar to the previous concept of field identification. However, while a name is self contained, a type suggests that there is additional information that is known about the type contained within the program reading the value or in an external schema. In the first example, both the name and type are present which provides additional information about the atomic value present.

![](/images/proto-schema/part-3-structural-primitives-revisited-image12.png)

In the second example below, the type is used to identify the type of a compound group. Once again, it suggests that the type is a reference to external information about the compound block. The external information could provide further details about what is valid, the individual types contained in the block, or provide deep validation of a full tree. Whether that external information is in a schema or just in the program is not relevant.

![](/images/proto-schema/part-3-structural-primitives-revisited-image13.png)

A practical example of this idea can be shown with the PointList example above. We defined the schema as:

PointList: Sequence { type: Point, minItems: 1, maxItems: 10 }  
Point: Record { x: SmallInteger, y: SmallInteger }  
SmallInteger: Integer { minValue: 0, maxValue: 50 }

Using the type information as part of the data would look as follows:

@schema(“litterat.io/schemas/points.schema”)  
PointList \[ Point { x: SmallInteger 10, y: SmallInteger 10 } \]

The names PointList, Point and SmallInteger all reference type information from the schema within the data. While the “x” and “y” field names augment the data and can be used by humans and programs alike to associate the right values with the right fields, they don’t require a schema. The type information requires some additional knowledge in the schema or program to be present that knows that the type identifier means. The annotation links the schema location to the schema so the schema can be loaded first and the type names can be verified against the schema. While the data file includes the type names, PointList, Point and SmallInteger, only one is required.

@schema(“litterat.io/schemas/points.schema”)  
PointList \[ { x: 10, y: 10 } \]

Using just PointList is sufficient in the data as the other values can be validated as points and SmallInteger by following the schema as the file is loaded.

Both Field Identification and Type Identification belong to a common theme of semantic markers, they add meaning but don’t modify the structure or data values.

## **Annotations (and attributes)**

While hierarchical containment can be used to create tree structures in serial form, attributes and annotations are adjacent values that are associated with a value or block. They are the sticky notes of a data format and allow adding information without requiring that a previously defined structure is changed.

![](/images/proto-schema/part-3-structural-primitives-revisited-image14.png)

Comments, XML attributes and annotations are all forms of sticky notes that are placed alongside the core structural elements of data. In [Part 7](/research/deep-dive-into-json/part-7-annotations) of the deep dive into JSON, the idea of annotations as first class data structures was explored. This has the potential to unify annotations within the type system. An example might be:

```
{
  "patient": "1234",
  "blood_pressure":
    @Measurement: {
      "timestamp": "2025-01-15T09:30:00Z",
      "device": "Omron-HEM-7121"
    }
    @ClinicalNote:"Patient anxious"
    {
      "systolic": 120,
      "diastolic": 80
    }
}
```

From a schema perspective, it could allow the annotations to also be defined:

```
PatientBloodPressure: Record { patient: String, blood_pressure: BloodPresure }
BloodPresure: Record { systolic: Integer, diastolic: Integer }
Measurement: Record { timestamp: IsoTimestamp, device: string }
ClinicalNote: String
```

There’s still a question if the schema should indicate that it expects an annotation to be present. If this is allowed, it creates the same quandary as XML attributes where a developer needs to make a choice of if a data belongs as part of a record or as an annotation. It would blur the line between annotations and fields, which would defeat their purpose as “sticky notes”. This needs further exploration in later articles.

## **Data References (Anchor & Alias)**

The terms of anchor and alias are from YAML, however, data reference is a more generic concept. An anchor marks an individual value or block that can then be later referenced. While a reference could also include concepts like full URL links, this is more focused on the concept as part of a single file or data stream. In this case the block containing name2 would receive the value a1 as \*a if effectively a pointer to a previous part of the stream. The alias could refer to a single value or a whole structure of information.

![](/images/proto-schema/part-3-structural-primitives-revisited-image15.png)

Data references provide a copy/paste capability within a data file. While this is an incredibly useful technique, it doesn’t require any feature within the proto-schema.

## **Value Modification (was Structural Composition)**

Value modification allows manipulation of previous values or blocks in the stream that are inserted into the deserialised form when being read. It could include combining two previously defined Objects (union or composition). From there it could include removal of some fields or values, the modification of values or any other type of manipulation. YAML provides a method to perform structural composition. Take for example:

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

This builds on the anchor and alias idea but adds the ability to modify a previously defined data structure with replacement values. This is another capability that is likely to be useful in defining schemas and data files, but doesn’t require specific capabilities in the proto-schema.

## **Primitives Revisited**

Revisiting the structural primitives from the perspective of the proto-schema has helped classify where and how these capabilities are best applied. It has also helped improve the naming and improved the clarity of each primitive. The structural primitives can be now classified as:

**Structural Primitives**

* **Sequence** \- Is the parent for all other structural data types like Record, Array, Tuple, Map, etc. When it comes to the proto-schema, it may be possible to link these other structural primitives.  
* **Hierarchical Containment** \- The ability to embed different types in a hierarchy is perfectly aligned with schema type references.  
* **Annotations** \- While annotations can potentially be modelled using a Record of annotations with data, making it a first class capability creates a third dimension to data and allows sticky-notes to be added to both data and schemas.  
* **Key/Value associations (Map)** \- A map can also be modelled as an array of key/value pairs. However, as observed in JSON, this is a highly useful structure that is useful to model in schemas.

Within data and schemas it is often useful to add meta-data to improve the understanding of the data. While these markers create a link to the schema, it doesn’t require modeling in the proto-schema itself.

**Semantic Markers**

* **Field Identification** \- Field names or slot identifiers present in the data allow the values to be matched against the schema.  
* **Type Identification** \- Types create a strong link between the data and the schema or internal data types of the format.

Finally, the concepts of data references and structural composition allows copying and modifying data from different places in the data. These are very useful in data formats but also don’t require modeling in the proto-schema.

**Structural Composition**

* **Data References** \- Allows copying data without modification from and to different parts of the data.  
* **Value Modification** \- Allows copying and modification from and to different parts of the data.

## **Conclusion**

Revisiting the structural primitives through the lens of the proto-schema has done two important things. First, it has reduced the scope of what the proto-schema must model. Of the original seven primitives, only three require representation in the proto-schema: Sequence (including Key/Value associations), Hierarchical Containment, and Annotations. Semantic markers like field and type identification are used within the data format, not of the underlying model. Structural composition features like references and value modification operate on data already produced and modify the output data model. While structural composition will be incredibly useful within schemas, they won’t modify the proto-schema.

Second, and perhaps more significantly, it’s clear that Record, Array, Tuple, Set, Map, and Enum once serialized are all configurations of a Sequence. Each is distinguished not by fundamentally different structure, but by which properties are active: whether elements share a type, whether order matters, whether duplicates are allowed, whether indices carry meaning. The proto-schema can model the various configurations as a sub-type of a Sequence. When combined with Choice, Multiplicity and Naming found in the previous article, the proto-schema collapses to a small set of features.

Part 4 of the series will explore the topic Sequence fully; can it account for all the structural data types that schemas need to describe, or whether the differences between them demand distinct treatment.

