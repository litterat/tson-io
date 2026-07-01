---
title: "Proto-schema: Part 5. Templates"
series: "proto-schema"
seriesTitle: "Proto-Schema"
part: 5
description: >
  This article explores templates and partial types as the bridge between fully specified data and fully abstract schemas. Using the beads on twine analogy, a template is a pattern with blanks, a definition awaiting completion.
originalUrl: "https://litterat.substack.com/p/proto-schema-part-5-templates"
originalDate: 2026-03-24
abstract: >
  This article explores templates and partial types as the bridge between fully specified data and fully abstract schemas. Using the beads on twine analogy, a template is a pattern with blanks, a definition awaiting completion. Through the spectrum of completeness, the article demonstrates that data and schemas are not separate concepts but exist on a continuum of how many blanks remain. Templates provide a formal mechanism for reuse and parameterization within schemas that are resolved before validation.
---

# **Proto-schema: Part 5\. Templates**

### Part 5 in a series of articles that openly designs and develops a proto-schema that provides the underlying data model for building data format schemas.

**Abstract:** This article explores templates and partial types as the bridge between fully specified data and fully abstract schemas. Using the beads on twine analogy, a template is a pattern with blanks, a definition awaiting completion. Through the spectrum of completeness, the article demonstrates that data and schemas are not separate concepts but exist on a continuum of how many blanks remain. Templates provide a formal mechanism for reuse and parameterization within schemas that are resolved before validation.

![](/images/proto-schema/part-5-templates-image17.png)

## **Introduction**

This series has been studying the concept of a proto-schema, the ideas and structures that are the fundamentals for data-formats, schemas and meta-schemas alike. Most schemas like XML Schema or JSON Schema appeared after the data format was created. This series is taking the opposite approach, building the concepts from the inside out using the physical constraints of serialization as the drive behind each feature. Instead of designing a system from lambda-calculus, type theory or algebraic data types, which may all be present in some form, the design is based on observation and the analogy of beads on twine to represent serialized data.

The last article established the five Sequence types, Tuple, Record, Array, Map and Set. Together with core concepts of productions from formal grammars, which adds Choice, Multiplicity and Naming, we’ve already got a proto-schema that could be designed and built. However, the concept of partial types will provide a feature that will make the proto-schema an incredibly powerful solution.

This idea of incomplete structures, patterns with blanks, is a fundamental concept that is seen over again in data formats, programming languages, and mathematical foundations. They are the macros, templates, parameterised types, lambda calculus, seen across all manner of computer science. In the previous series, [Part 9](/research/deep-dive-into-json/part-9-templates-and-schemas) explored how templates and partial types could unify data and schemas within a single format. This article revisits that idea through the lens of the proto-schema, demonstrating how schemas and data can exist on a spectrum of structural completeness rather than as separate concepts.

## **Beads with Blanks**

Returning to the beads on twine analogy, every example so far has used complete beads, each position on the twine held a specific coloured bead. A template introduces a new concept: positions that are present but not yet filled. Consider a bracelet pattern: blue, BLANK, green, BLANK, blue.

![](/images/proto-schema/part-5-templates-image18.png)

**Beads: Blue \- Blank \- Green \- Blank \- Blue**

This pattern isn’t a bracelet, you can’t wear it. But it describes a family of bracelets. Fill both blanks with red and you get blue, red, green, red, blue, the bracelet is complete and fully specified.

![](/images/proto-schema/part-5-templates-image19.png)

**Beads: Blue \- Red \- Green \- Red \- Blue**

Fill them with green and you get blue, green, green, green, blue. The pattern with blanks is a specification that is incomplete; it awaits information before it becomes concrete.

![](/images/proto-schema/part-5-templates-image20.png)

**Beads: Blue \- Green \- Green \- Green \- Blue**

The blanks become parameters that allow re-use and composition. This concept of blanks also allows restrictions. It would be possible to restrict the blanks to only red or green as in the examples above, no other colours are allowed.

It’s worth mentioning that these partially complete types are a feature of the proto-schema and applied to meta-schemas and schemas. A bracelet without the blanks filled is the bracelet of Blue, Green Blue, but that doesn’t conform to the specification. Similarly, data without the blanks filled are just null or unset values. It’s an important distinction that keeps this feature out of data formats and the values they represent.

## **Spectrum of completeness**

This section lifted directly from Part 9 of the previous series demonstrates this idea of a schema being on a spectrum of completeness using a simple JSON record.

The first example is the classic JSON object with two fields, “name” and “age” with their completed values. It’s worth pointing out the obvious that the values, “bob” is a string and 25 is an integer and both are self-defined by their syntax. For each field there’s a field name, a known type (ie string and integer in this case) and the value:

![](/images/proto-schema/part-5-templates-image21.png)

**{ “name”: “bob”, “age”: 25 }**

In the second example, the two fields, “name” and “age” are present, but instead of values we provide the types we’re expecting in the future. This is what we would expect to see in a schema such as JSON schema; it provides a template from which to verify values. In this way, we could use it to verify that the first example is valid.

![](/images/proto-schema/part-5-templates-image22.png)

**{ “name”: \!string, “age”: \!int }**

The third example is a partial type; the value “bob” is provided for the name, but the “age” just has the type \!int. Really, there’s only one thing missing in this example, the “name” field has both a type \!string and value “bob”, while the “age” field has the type \!integer but we don’t know what the value will be yet. It’s a bit contrived, but this can actually be useful in some scenarios.

![](/images/proto-schema/part-5-templates-image23.png)

**{ “name”: “bob”, “age”: \!int }**

The fourth example takes the schema concept even further. Instead of providing a type for the “name” field, it specifies a yet to be specified type T. This is the concept of generics in many programming languages. Before using this template the type T would need to be provided.

![](/images/proto-schema/part-5-templates-image24.png)

**{ “name”: T, “age”: \!int }**

The fifth example is to really drive the point home. In this model of beads there’s no reason why a partial type couldn’t include a situation where the “name” field type and value are not known. At the same time the “age” field has a known type \!integer and value 25\.

![](/images/proto-schema/part-5-templates-image25.png)

**{ “name”: T, “age”: 25 }**

The sixth example is an extension of the second example. The “name” field type is expected to be of one or more other types. In this case a \!string or a type called \!name. The \!name type might be a compound object with fields like “firstName” and “familyName”.

![](/images/proto-schema/part-5-templates-image26.png)

**{ “name”: (\!string | \!name), “age”: \!int }**

All of these examples represent valid structural arrangements using the beads analogy. The difference between them is their level of completeness. Using the concepts of proto-typing and parameterised types from programming languages and applying them to data, it is possible to say that data and schemas exist on a spectrum of completeness. A record is complete (a value) when all fields contain a name, type and value; a record is usable as a type in the schema when all fields contain a name and concrete type.

This unification of data and type systems has a notable precedent in programming language design. The idea that a programming language is self modifiable and contains a self-referencing type system goes back to Lisp and object-oriented systems like Smalltalk. The Self programming language which JavaScript has a strong lineage is a great example. As the wikipedia page says, “In Self, and other prototype-based languages, the duality between classes and object instances is eliminated”.

This spectrum of completeness also clarifies the relationship between templates and default values. A default value is a position where both the type and value are specified, but the value can be overridden. In the beads analogy, it’s a position with a bead already placed, but marked as replaceable. This is distinct from a blank (type unknown) and from a fixed position (type and value that cannot be changed). This will be covered in detail in a later article.

## **Proto-Schema Templates**

A blank is a placeholder that must be filled before the pattern becomes a valid structure that can be used in a schema to validate data. A template with blanks is not yet a valid definition, it’s a function that produces a definition once the blanks are filled. Let’s see if we can use this concept to create a specification. In this basic schema we create a “person” type that has a blank type T for the name field. This is what the user specifies:

`person: <T> { name: T, age: !int },`  
`fullName: { firstName: !string, lastName: !string },`  
`simpleName: !person<T:!string> { },`  
`complexName: !person<T:!fullName> { }`

These definitions are using syntax that incorporates findings from the previous series. It is still being developed, but it shows the idea of filling in blanks towards completeness. The person type is a template that modifies and produces a definition which is ready to use. The proto-schema would need to load this and resolve any templates to produce real definitions. The simpleName and complexName would then look something like:

`person: !template { parameters:[ “T” ], structure: { name: T, age: !int } }`

`fullName: !record { firstName: !string, lastName: !string }`  
`simpleName: !record { name: !string, age: !int }`  
`complexName: !record { name: !fullName, age: !int }`

With this schema it is now possible to validate the structure of some real data:

`simpleName: !simpleName { name: “bob”, age: 25 }`

`complexName: !complexName { name: { firstName: “bob”, lastName: “culp” }, age: 25 }`

The current person definition above allows any type to be substituted in the name. To ensure that crazy types with a number for a name can’t be created, the type T in person could be constrained, so instead the definition would be:

`person: <T: string | fullName> { name: T, age: integer }`

Now the only valid definitions allowed would be simpleName or complexName, a definition of person\<integer\> would be rejected.

This is an area where the proto-schema will need to make a decision, should templates support bounds, or should all blanks accept any type? Supporting bounds adds complexity to the implementation, but prevents invalid application. For now, it is sufficient to recognise that bounded blanks are a well-understood concept that could be added without changing the fundamental template model.

## **Type Families and Choices**

In the initial description of using the beads analogy, it was recognised that a type with blanks creates a family of bracelets. It is the same with definitions. Take another look at the person example:

`person: <T> { name: T, age: !int },`  
`fullName: { firstName: !string, lastName: !string },`  
`simpleName: !person<T:!string> { },`  
`complexName: !person<T:!fullName> { }`

What would happen if I was to create an array of person:

`people: [ !person ]`

This is equivalent to saying an array of simpleName or complexName, an array that can contain both types:

`people: [ !simpleName | !complexName ]`

This is a great feature of the template system, but it does create more complexity within the proto-schema. This also gives a little more support to the idea that templates should support bounds. It means that developers and readers of schemas can more easily reason about what the people array might contain when a person is defined as only allowing simpleName or complexName.

## **Sequence Templates**

In the previous article, the base types of Tuple, Record, Array, Map and Set were defined. However, it should be possible to create other sub-types. Templates might provide a mechanism to do this. Let’s examine this from one of the more simple types, the Vector. A common Vector is three float values, Float3. An instance would look something like:

`value: !float3 [ 12.2, 10.4, 8.3 ]`

It’s definition would look like:

`float3: !vector<T:!float> { length: 3 }`

Then a Vector would be defined as:

`vector: <T> { type: T, length: !int }`

There’s a couple of interesting points to make about this. The first is that in this case Vector and Float3 are showing the properties of the spectrum of completeness observed previously. However, while T is blank, the value length has a known type, integer, but an unknown value that is required. It creates an odd syntax where the template value is separated from the length value.

The second point, an instance of float3 is not on the same spectrum of completeness as its definition. One way to resolve this would be to add the value, so the instance would look like:

`value: !float3 { type: float, length: 3, value: [ 12.2, 10.4, 8.3 ] }`

For performance reasons, this isn’t a great way to store data, but does demonstrate the concept of a spectrum of completeness for one of the sequence types.

There’s still more work to do on the proto-schema, so the full set of sequence types as templates won’t be explored now, however, it shows there’s potential that using templates has the potential to be able to define the various sequence types. There may also be a way to link types like Vector back to a common Sequence type. As tempting as it is to define now, it’s worth making sure we’ve got all the capabilities of the proto-schema before getting in too deep.

## **Conclusion**

Templates are a powerful concept for a schema system. Existing schema languages handle templates with varying degrees of support. JSON Schema has no native concept of templates. To express a paginated response, you must either duplicate the definition or use composition patterns that approximate it. XML Schema provides limited support through type derivation and substitution groups, but not true templates. Protobufs has no generics at all, every concrete type must be written out.

The beads analogy captures the idea of blanks in a definition. This led to the concept of a spectrum of completeness where data and schemas exist on a continuum, and the development of templates as a formal mechanism for parameterised definitions. Templates also revealed the connection to Choice with the person template example creating a family of types (i.e. simpleName and fullName), and referencing the family as \[\!person\] is equivalent to a Choice over its members. Templates don’t just enable reuse, they generate type families which can along with type restrictions on template variables creates a strongly typed system.

Exploring the sequence types as templates also showed promise. Vector can be expressed cleanly and shows Templates handle type blanks well. Templates may add some complexity to the schema system, but offer promise that the capabilities will allow Schema, Meta-Schema and Proto-schema to become a self-referential specification.

The proto-schema can now be expanded a little further. A proto-schema is a group of definitions where each definition has a type name and a structure. The structures now allowing a five basic properties, the ability to create Templates as partial types:

* **Choice (Sum)** \- one of these options  
* **Sequence (Product)** \- this followed by that  
  * Tuple \- Fixed-length sequence of specified types.  
  * Record \- Fixed-length sequence of named values.  
  * Array \- Variable length sequence of a type.  
  * Map \- Variable length of Key/value pairs of specified types.  
  * Set \- Sub-type of Array. Unordered, no duplicates. Foundation for Enum types.  
* **Multiplicity** \- how many times  
* **Naming** \- giving definitions names for reuse  
* **Templates** \- definitions with blanks that produce concrete types when filled

The next article will explore the concept of structural composition. Once again we’ll return to the beads analogy and discover how to combine parts of definitions into new definitions to provide another powerful tool in the proto-schema system.

