---
title: "A Deep Dive into JSON: Part 10. Constraints & Layers"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 10
description: >
  This article explores how constraints add another layer to structured data and templates. By examining constraints with comparisons to JSON Schema and XML Schema, we discover that meta-schemas become a self-referencing head-fuck that is barely researched but the basis for all data formats.
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-10-constraints"
originalDate: 2025-09-24
abstract: >
  This article explores how constraints add another layer to structured data and templates. By examining constraints with comparisons to JSON Schema and XML Schema, we discover that meta-schemas become a self-referencing head-fuck that is barely researched but the basis for all data formats. The article follows on to further investigate how versioning can affect the ability for data and data formats to adapt and grow without becoming locked in by early standardisation. Finally, the article explores a multi-level architecture that splits structural parsing (handling syntax) and semantic parsing (interpreting values) to build an adaptable and flexible data format. The article concludes the exploration phase of this series with reflections on the theoretical framework discovered and future directions for practical implementation.
---

# **A Deep Dive into JSON: Part 10\. Constraints & Layers**

### Part 10 in a series of articles that dives into the underlying design of JSON. The result will be ideas and concepts to create a new text format.

**Abstract:** This article explores how constraints add another layer to structured data and templates. By examining constraints with comparisons to JSON Schema and XML Schema, we discover that meta-schemas become a self-referencing head-fuck that is barely researched but the basis for all data formats. The article follows on to further investigate how versioning can affect the ability for data and data formats to adapt and grow without becoming locked in by early standardisation. Finally, the article explores a multi-level architecture that splits structural parsing (handling syntax) and semantic parsing (interpreting values) to build an adaptable and flexible data format. The article concludes the exploration phase of this series with reflections on the theoretical framework discovered and future directions for practical implementation.

## **Introduction**

In [Part 9](/research/deep-dive-into-json/part-9-templates-and-schemas), the eighth structural primitive was introduced to explore the idea of templates, generics and schemas. The concept explored was that schemas live on a line of structural completeness rather than being a different concept to the data itself. I figured it was worth exploring, as schemas become an important aspect of data interchange as the structure of information needs to be controlled and validated. Templates and partial types control the shape of the data but it doesn’t put constraints on the values. Constraints are the topic of this article and while we’re here, we’re likely to pick up a couple of other concepts to round out the exploration of JSON and data formats in general.

## **Constraints**

The difference between shape and constraints can be best demonstrated using an example. The following partial template defines a person as having a name and an age and was provided as an example in Part 9\.

`person: { name: !string, age: !integer }`

Defining the name as a \!string type is potentially good enough, but it doesn’t constrain the string. Does it need to have a minimum length or maximum length? In this definition, making the string value “David” is equally valid as making the string of the complete works of William Shakespeare. Similarly the age using an \!integer type having a value of 25 is just as valid as the value 25 million. In JSON Schema constraints can be added as part of the schema:

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 4,
      "maxLength": 30
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 120
    }
  },
  "required": ["name", "age"],
  "additionalProperties": false
}
```

JSON Schema has been [evolving](https://json-schema.org/specification-links) since 2009 and only left draft status in 2019\. It’s an impressive technology which was itself based on XML Schema. In the JSON Schema solution, the object parameters for both “name” and “age” are contextually different depending on the “type” value. Note that for “type” value “integer”, the parameters used are “minimum” and “maximum”, while for “string”, the parameters are “minLength” and “maxLength”. This gets into a rather fun and self-referencing area of meta-schemas. For JSON Schema this particular area is defined by the [validation vocabulary meta-schema](https://json-schema.org/specification). This is an area potentially worth exploring in another article, for now, let’s continue to investigate how these constraints operate.

What we’re seeing here is that “integer” can have an input that includes constraints. Returning to the hypothetical format, this schema could be validated against some person objects:

```
{
  bob: !person { name: "bob", age: 25 },
  alice: !person { name: "hi, my name is alice and I like swimming", age: 1996 }
  john: !person { name: "john", dob: 1990 }
}
```

The example shows a person type where “bob” conforms, while “alice” and “john” do not conform to the schema. With “alice”, the age is 1996 which is greater than 120\. For “john”, the “age” has been replaced with “dob” (date of birth, which I agree would be a much smarter way to define the person), however, the schema says that both “name” and “age” are required and “additionalProperties” are not allowed.

In the schema and example above, the JSON object, the integer, and the string are all being constrained in some way. In [Part 8](/research/deep-dive-into-json/part-8-references-and-structural-composition), the article explored stepping over the precipice to becoming a functional language, this is quite similar. If instead of completely parameterising the input we used a function the validate the person object, it might look like:

```
boolean validName = name.length >= minLength && name.length <= maxLength
boolean validAge = person.age >= minimum && age <= maximum
boolean validObject = person.fields.length = 2 &&
  person.field["name"].isPresent() &&
  person.field["age"].isPresent()
return validName && validAge && validObject
```

There’s a lot of expression syntax and concepts of object-oriented programming in there which would make the “data-format” or “data-schema” slide very quickly into the complexity of a full blown programming language. Instead, schemas like JSON Schema and XML Schema, parameterise the types so that the full complexity of the programming language is not required. Here’s an example of the “age” defined by XML Schema:

```xml
<xs:simpleType name="AgeType">
  <xs:restriction base="xs:integer">
    <xs:minInclusive value="0"/>
    <xs:maxInclusive value="120"/>
  </xs:restriction>
</xs:simpleType>
```

XML Schema and JSON Schema both extract the parameters from the validation functions and create data structures. The parameters are themselves defined in XML and JSON. The meta schemas that define these schemas are themselves defined in the [XML Schema](https://www.w3.org/TR/xmlschema11-2/XMLSchema.xsd) and [JSON Validation Schema](https://json-schema.org/draft/2020-12/meta/validation).

In [Part 9](/research/deep-dive-into-json/part-9-templates-and-schemas), the idea of partial types was explored, however, partial types don’t capture these types of constraint information. Let’s see if the syntax explored in Part 9 can be expanded to include this additional constraints information. Let’s imagine that we wanted to allow “additionalProperties” in the Person object. Instead of:

`person: { name: !string, age: !integer }`

What if we could provide additional information to the object and the basic types. I’m not wanting to specify a syntax right now, but we want to provide additional optional parameters to the types beyond that of the shape provided by the partial types. Something like:

```
person: !object ← { additionalProperties: true }
{
  name: !string ← { minLength: 4, maxLength: 30 },
  age: !integer ← { minimum: 0, maximum: 120 }
}
```

A nice property of this is that when it comes to define a meta schema, it would be possible to define the valid input parameters to the different types. For example:

```
object: ← { additionalProperties: !boolean false } {}
string: ← { minLength: !integer 0, maxLength: !integer } @atom:true
integer: ← { minimum: !integer, maximum: !integer } @atom:true
```

Notice that these additional parameters are injected into the type system of the solution and need to configure the parameters of the type but do not belong as part of the data. For instance, the type integer is a number, and its constraints are defined as allowing minimum and maximum to be set, but beyond that it is difficult to define what an integer is. Also notice that integer minimum and maximum are themselves an integer. This is where meta-schemas really start to hurt the head.

It’s worth having a look at how other schemas define base types. Here’s the definition of integer in XML Schema:

```xml
<xs:simpleType name="integer" id="integer">
  <xs:annotation>
    <xs:documentation source="http://www.w3.org/TR/xmlschema-2/#integer"/>
  </xs:annotation>
  <xs:restriction base="xs:decimal">
    <xs:fractionDigits value="0" fixed="true" id="integer.fractionDigits"/>
    <xs:pattern value="[-+]?[0-9]+"/>
  </xs:restriction>
</xs:simpleType>
```

It is derived from the decimal type, which is derived from anySimpleType. The type anySimpleType is the top most type in XML Schema and it isn’t actually defined in the Schema file. In this way we’ve reached the top of the XML type system.

```xml
<xs:simpleType name="decimal" id="decimal">
  <xs:annotation>
    <xs:appinfo>
      <hfp:hasFacet name="totalDigits"/>
      <hfp:hasFacet name="fractionDigits"/>
      <hfp:hasFacet name="pattern"/>
      <hfp:hasFacet name="whiteSpace"/>
      <hfp:hasFacet name="enumeration"/>
      <hfp:hasFacet name="maxInclusive"/>
      <hfp:hasFacet name="maxExclusive"/>
      <hfp:hasFacet name="minInclusive"/>
      <hfp:hasFacet name="minExclusive"/>
      <hfp:hasProperty name="ordered" value="total"/>
      <hfp:hasProperty name="bounded" value="false"/>
      <hfp:hasProperty name="cardinality" value="countably infinite"/>
      <hfp:hasProperty name="numeric" value="true"/>
    </xs:appinfo>
    <xs:documentation source="http://www.w3.org/TR/xmlschema-2/#decimal"/>
  </xs:annotation>
  <xs:restriction base="xs:anySimpleType">
    <xs:whiteSpace value="collapse" fixed="true" id="decimal.whiteSpace"/>
  </xs:restriction>
</xs:simpleType>
```

Decimal is interesting in that it defines “hasProperty” values that help provide some qualities of numbers in general. A decimal value is ordered, not bounded, has a cardinality value of [countably infinite](https://mathinsight.org/definition/countably_infinite) and is numeric. I haven’t dug deep into these properties, but they might be useful when developing user interfaces that help decide how to interact with values. The hasFacet provides the types of restrictions that can be used in derived types like integer. Notice the link between hasFacet names and the actual values used in integer definition is weak.

JSON Schema on the other hand doesn’t provide definitions of things like number or decimal. Instead, there are top level types that are defined by the [Schema documentation](https://json-schema.org/draft/2020-12/json-schema-core#section-4.2.1) rather than having a formal definition. Here’s a snippet of the JSON Schema validation schema:

```json
"minimum": {
  "type": "number"
},
"exclusiveMinimum": {
  "type": "number"
},
"maxLength": { "$ref": "#/$defs/nonNegativeInteger" },
"minLength": { "$ref": "#/$defs/nonNegativeIntegerDefault0" },
```

The integer number type definitions are quite simple:

```json
"nonNegativeInteger": {
  "type": "integer",
  "minimum": 0
},
"nonNegativeIntegerDefault0": {
  "$ref": "#/$defs/nonNegativeInteger",
  "default": 0
},
```

This doesn't go as far as XML Schema, but provides some level of formality to being able to verify the definitions of schemas later. This is a complex area (have I said that enough), but it's useful to be aware of before jumping into defining a data format.

I have a theory that the more that can be defined by the meta-schemas the less that needs to be written about the format and schemas in the text part of the specification. Before moving on, let’s see how an integer might be defined in this new data format, using XML Schemas definition as inspiration:

```
{
  inclusiveRange: <T> { minimum: T?, maximum: T? },
  exclusiveRange: <T> { minExclusive: T?, maxExclusive: T? },
  regex: @standard:"https://datatracker.ietf.org/doc/rfc9485/" !string
  textPattern: { pattern: !regex },
  integer: @ordered @bounded:false @cardinality:infinite @numeric @atom
    ← { ...inclusiveRange<!integer>, ...exclusiveRange<!integer>, ...textPattern,
      enumeration: [...!integer],
      pattern: "[-+]?[0-9]+"
    }
}
```

With the concepts of references, annotations and templates, and now this concept of the ← type parameters it’s possible to define a structure that includes ways to constrain an integer type. This looks like quite heavy code now, but thankfully, only a few people need to look at this area of meta-schamas. This example goes beyond both XML Schema and JSON Schema by creating formal data structures that become parameters to atom types. The only thing missing is some type of marker to indicate that this is an atom type. I’ve added an annotation @atom, but there’s potential for a more obvious marker, something to consider for later.

It’s tempting to say that all types are eventually \!string type, but this is purely a feature of JSON being a text based data format. The distinction is that strings are the representation, not the type. An integer displayed as '42' is fundamentally different from the string '42', even though both are character sequences. It is true that integers are displayed as a string, but it isn’t true that an integer is-a string. This distinction is important; there’s another potential series on binary data formats which use all the same structural primitives as test based formats. A schema that has multiple formats is how ASN.1 works and is an interesting precedent to explore later. It’s possible that capturing the data structures and ideas of serialization and having multiple representations is a potential path forward.

Pulling at the thread of constraints brings in a big world of meta-schemas and self-referencing data structures, as well as the issue of how to define atom types like integer, string and date. The most advanced of these systems are ASN.1 (standardised in 1984), XML Schema (first standard in 2001\) and JSON Schema (first drafted in 2007). There’s plenty of potential for this area of data science to be explored further. Ideally this will eventually gather more attention as schemas are the true basis for data interchange. For now, I’ll leave this small exploration and pick up a few other issues that deserve some attention before finishing the series.

## **Type context vs Data context**

Data schemas and meta schemas introduce a potential level of complexity that many solutions will not require. If you’re writing a small program that needs to import data, there’s probably no need for developing a schema. There’s also another issue of type names versus scope of data. This is where the interaction between a feature like references and composition interacts with a feature like type definitions. Take the following example:

```
name: { firstName: !string, lastName: !string },
person: { name: (!string | !name), age: !integer }
```

The “name” is being used as a type and as a field name in person. This is likely to get quite frustrating when there are clashes and resolution picks the wrong reference. This could result in developers trying to come up with naming conventions that try to disambiguate “name” in different ways. I did some work many years ago on a [binary encoding mechanism](https://patents.google.com/patent/US20070130282A1/) that included a binary schema. It included the concept that a schema dictionary was used to define the valid types in the data, the schema dictionary was defined using only valid types from a meta schema dictionary. The meta schema dictionary was only defined using valid types found in the same meta schema dictionary. This idea is effectively that the namespace and type definitions are separated from the data. It would mean that the following is not possible:

```
{
  person: { name: !string, age: !integer },
  instance: !person { name: "bob", age: 25 }
}
```

This is using a \!person as a type in the same namespace as the data which is using it. This was briefly explored in Part 9 using a syntax that associated the schema dictionary with the type:

```
!person:{
  person: { name: !string, age: !integer }
} { name: "bob", age: 25 }
```

Ignoring the syntax for a moment, this creates a namespace for types that differs from the scope of the data. It also creates a way of creating a formal link between the data and its type definition. Using the idea of my earlier work, it could be possible to define formal links back to the schema and further to a meta schema. Let’s say the meta-schema that is used to define constraints and core types is defined at a URL (e.g. http://schemas.io/meta-schema/2025-09 ). It would then be possible to define a dictionary of a schema and publish that to a URL. For instance the following is published to “http://schemas.io/people/person/2025-09” :

```
"http://schemas.io/meta-schema/2025-09" → {
  person: !object { name: !string, age: !integer }
}
```

The data can then be sent as follows:

```
"http://schemas.io/people/person/2025-09" → {
  !person { name: "bob", age: 25 }
}
```

Once again, ignore the syntax, but assume that the “URL → data” syntax is used to indicate that the URL defines the valid dictionary items for the data. Splitting the type names from the references and composition names allows re-use and easier reasoning about what a \!type is referring to. This also has some interesting implications for versioning as it creates a strong link between the data and its schema. Most importantly, this creates a mental distinction between types and references in the data. Having a clear and understandable mental model will be crucial, but can only really be understood through implementation and use. Once again, for now, the issue has been identified and exploration can happen later.

## **Versioning**

As we follow this tangent of schema versioning it is also worth bringing up that of data format versioning. Crockford has always said that there won’t be a JSON version 2, the JSON data format design is effectively etched in stone and won’t be modified. This has had some great implications that a JSON file is always parsable by a JSON parser. It means that once a developer learns the syntax they never need to learn about different versions. The cognitive load of learning and keeping up with changing specifications is completely removed. The flip side is that all the limitations that have been discussed in this series have been baked in since around 2001\. While Crockford himself has lamented about having quotes around keys or the lack of references, he also understands that there will never be an updated JSON.

Versioning and schemas is an interesting topic in its own right. The JSON Schema concept is that the schema can be used to validate a JSON data file, but there doesn’t need to be any kind of link in the data file which indicates that it was defined by a specific schema. XML took another approach which was to embed the schemas in the header of the file with namespaces:

```xml
<xs:schema
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:hfp="http://www.w3.org/2001/XMLSchema-hasFacetAndProperty"
  targetNamespace="http://www.w3.org/2001/XMLSchema"
  blockDefault="#all"
  elementFormDefault="qualified"
  version="1.0" xml:lang="EN">
```

A very interesting decision the W3C took was that the URL for the XML schema indicates a target namespace. It has meant that even though the XMLSChema has changed, it has maintained the same namespace. The file at **"http://www.w3.org/2001/XMLSchema"** was actually published in 2004\. This has the advantage that the namespace doesn’t change, but the disadvantage is that what is being referenced could change and while it might be mostly the same, small changes can have impacts in production environments.

An alternative view is that it would be possible to create strong links to specific versions of meta-schema and schemas. While they are expected to evolve, once a schema has been published it is set in stone and never changed allowing all downstream data files or other schemas to depend on that schema. The format of the file itself ideally stays the same with no versioning and reserves enough that even if the meta-schema changes the format itself does not.

One thing that is becoming apparent is that JSON, these concepts of constraints, and references to other schemas are difficult to inject into JSON’s syntax. It’s going to take a bit of trial and error to see how these different concepts can be made to fit into the existing format in a way that feels somewhat familiar to developers.

The tension is that data formats and any type of data interchange is great when they are standard and can be relied upon to stay the same. However, at the same time early standardisation often cripples a data format’s ability to evolve and improve. There’s numerous standards that have been crippled by bloat and standardisation and it's safe to say that both [CORBA](https://en.wikipedia.org/wiki/Common_Object_Request_Broker_Architecture) and XML Schema have been two interesting examples of this.

## **A Layered approach**

After ten articles on the subject of JSON and text based data formats, there’s a picture emerging that bringing together all these different concepts is becoming increasingly complex. The interactions of features like *\!type* and *\*reference* creates more questions to be answered. Additionally, the concepts of partial types and constraints create ideas that don’t fit into known or well defined syntax. It’s also true that not everyone will find utility in those features. A lot of the time, all that is needed is a plain old JSON file.

A final area to contemplate is a layered approach to a data format. The idea that a new data format is a pure superset of JSON and all additions are optional. There’s also the idea that concepts like anchors, references and basic types add utility but full blown schemas with constraints are limited to use in applications like APIs or published data. It will only be during implementation where the lines between layers really become clear, but what might those layers look like.

Let’s call the first layer the JSON layer. All valid JSON files are valid in this potential new data format. There’s one important difference, instead of atom values being numbers, strings, booleans and null, all values are strings. The parsing process might look like:

`"42" → [Structural Parser] → STRING_TOKEN("42") → [Semantic Parser + Type Context] → Integer(42)`

This becomes useful at the next layer. The default parsing rules of strings is to use JSON rules where a string is one of the valid JSON values. This may seem like a nuanced and semantic difference only, but when it comes to implementation and supporting custom types the difference becomes more clear.

The second layer is the data extensions layer. The other structural concepts that have been discussed previously are valid. Sorted and unsorted maps, annotations, anchors, references, and types can be used. The valid types are hardcoded and include things like dates, timestamps, uuids and any other useful types. This is where treating all values as strings at the base layer becomes useful. Where a \!type syntax is included the string is parsed and returned with the correct type/value.

The third layer introduces schemas and constraints. The third layer may include syntax that is specific to defining schemas and setting constraints on values. The third layer includes a meta-schema which is used to define a formal format. Ideally, a theoretical basis is developed which allows the schema to be valid for multiple data formats and the format that is developed is just one of the representations. This is another big area which will be explored further in later articles.

## **Conclusion**

Constraints, meta-schemas, versioning, schema-traceability, and layered data formats have made for a dense exploration of concepts. While it was worth touching on these areas, digging deeper at this point would be premature. It's better to first establish the base data format and explore data models before becoming too enamoured with meta-schemas.

After ten articles exploring JSON's design, this concludes the exploration phase of JSON and text based data formats. We've uncovered the fundamental architecture underlying all text based data formats; eight structural primitives that define how data can be arranged serially:

1. Grouping (ordered/unordered)  
2. Hierarchical containment  
3. Naming (key/value associations)  
4. Typing & metadata  
5. Annotations  
6. References  
7. Structural composition  
8. Templates & partial types

On top of these structures, constraints operate as predicates that validate data without being structural primitives themselves. We've touched on schemas, versioning, and meta-schemas that add layers to the theoretical framework for data format design. This exploration reveals that JSON, data formats, and schemas represent an incredibly deep area of computer science that remains largely under-researched, surprising given that JSON processes petabytes of data daily.

The aim of this series was to perform the background research into JSON and data formats to see if there was enough of a reason to explore the development of a new data format and/or potentially a new schema format. The answer is clearly yes. ASN.1, CORBA, XML, and JSON are examples of formats and data interchange that have been shaped by the needs of the time. These articles have shown that there’s still so much more that can be done to provide better and more efficient data interchange formats and schemas. Over the next series of articles I'm exploring the development of TSON (Tagged Script Object Notation), a data format that unifies the eight structural primitives into a cohesive design that might grow to become (or at least inspire) the fabric for data interchange for the next generation.
