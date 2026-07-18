---
title: "A Deep Dive into JSON: Part 9. Templates & Schemas"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 9
description: >
  This article explores the unification of data schemas and data formats through the lens of prototype-based programming languages. Building on the structural primitives framework established in Part 5, it introduces the eighth and final primitive, templates and partial types.
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-9-templates"
originalDate: 2025-09-08
abstract: >
  This article explores the unification of data schemas and data formats through the lens of prototype-based programming languages. Building on the structural primitives framework established in Part 5, it introduces the eighth and final primitive, templates and partial types. Drawing inspiration from Self and JavaScript's prototypal heritage, the article demonstrates how schemas and data can exist on a spectrum of structural completeness rather than as separate concepts. The exploration ends with a practical API example demonstrating how a potential syntax and unified approach to data and schemas could handle a real-world scenario. While acknowledging the complexity of full implementation, the article demonstrates that unification could provide more expressive and flexible data formats than traditionally provided by JSON and JSON Schema.
---

# **A Deep Dive into JSON: Part 9\. Templates & Schemas**

### Part 9 in a series of articles that dives into the underlying design of JSON. The result will be ideas and concepts to create a new text format.

**Abstract:** This article explores the unification of data schemas and data formats through the lens of prototype-based programming languages. Building on the structural primitives framework established in Part 5, it introduces the eighth and final primitive, templates and partial types. Drawing inspiration from Self and JavaScript's prototypal heritage, the article demonstrates how schemas and data can exist on a spectrum of structural completeness rather than as separate concepts. The exploration ends with a practical API example demonstrating how a potential syntax and unified approach to data and schemas could handle a real-world scenario. While acknowledging the complexity of full implementation, the article demonstrates that unification could provide more expressive and flexible data formats than traditionally provided by JSON and JSON Schema.

**Introduction**

Data Schemas such as JSON Schema make it possible to validate the contents of a file. Schemas and putting validation around data becomes increasingly important as the popularity increases, as such it would be remiss of me to not complete the series without a look into schemas. This is a potentially large subject with many details and could warrant a series all its own. However, in this article we’re going to tilt our head a little and use a different approach to schemas and validation.

![Picture of dog (Kelpie x Border Collie) tilting its head](/images/deep-dive-into-json/part-9-templates-and-schemas-image23.png)

The prevailing method of schema solutions is that the schema system is designed and built external to the data format, however, there’s potentially another way. JavaScript has a lineage to proto-type based programming languages such as Self and Smalltalk. In essence, the two schools of thought are whether the type system is an external solution or part of the same solution. And yes, that probably was a bit of a gratuitous excuse to use an AI generated image of a dog.

This idea that a schema solution could co-exist with-in the data format is heading into somewhat uncharted theoretical waters; [there be many dragrons](https://en.wikipedia.org/wiki/Here_be_dragons). While there is plenty of precedence in programming languages, applying this idea to data formats is less investigated. There’s potential for the solution to become so complex that it is not possible to implement, but if there’s already an expectation that schemas are inevitable, then why not build it into the data format? This article explores the idea that a unified schema and data format provides a better and more flexible solution than keeping the two concepts separate.

## **Background**

Data formats like JSON and XML allow the creation of structured data in a way that every file is self-defined. That is to say, its data defines its structure. As both XML and JSON increased in popularity, it became increasingly important to provide some way to formally put structure around the data. In large systems this becomes increasingly important to manage change and be able to verify that a data file conforms to a known structure, so having some kind of schema seems inevitable. A schema makes it possible to check if the data in a file conforms to the structure defined in the schema. For XML, this started with [DTD](https://en.wikipedia.org/wiki/Document_type_definition) and eventually landed with XML Schema as the main standard. However, there are 14 different [XML Schema](https://en.wikipedia.org/wiki/XML_schema) solutions listed on the wikipedia page. For JSON this is predominantly J[SON Schema](https://json-schema.org/), but there are also [alternatives](https://json-schema.org/overview/similar-technologies).

This unification of data and type systems has a notable precedent in programming language design. The idea that a programming language is self modifiable and contains a self-referencing type system goes back to Lisp and object-oriented systems like Smalltalk. The Self programming language which JavaScript has a strong lineage is a great example. As the wikipedia page says, “In Self, and other prototype-based languages, the duality between classes and object instances is eliminated”. In [Self](https://selflanguage.org/), objects are created by cloning and modifying other objects, with no separate "class" definitions:

```
// In Self, you create objects by cloning and modifying
user := (| name = 'Alice'. age = 30. |)
// Slots without values or types
userTemplate := (| name. age. |)
newUser := userTemplate clone name: 'Bob'; age: 25
```

This idea that prototypes and instances are the same thing is what we’re hoping to achieve within a data format. However, this needs to have some theoretical basis. Let’s return to the idea of structural primitives and see if these ideas can be built from first principles.

## **The Eighth Structural Primitive**

In [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects), the first seven structural primitives were defined using the analogy of beads on twine. We’ve now got these two potentially conflicting ideas of schemas and proto-type based languages that offer the ability to unify schema specification into the data format. The beads analogy demonstrates these ideas really well; the eighth structural primitive is generics and partial definition. To demonstrate, let’s return to the first example of a JSON object, a not particularly realistic example, but good enough for demonstrating the concepts.

The first example is the classic JSON object with two fields, “name” and “age” with their completed values. It’s worth pointing out the obvious that the values, “bob” is a string and 25 is an integer and both are self-defined by their syntax. For each field there’s a field name, a known type (ie string and integer in this case) and the value:

![](/images/deep-dive-into-json/part-9-templates-and-schemas-image24.png)

`{ name: "bob", age: 25 }`

In the second example, the two fields, “name” and “age” are present, but instead of values we provide the types we’re expecting in the future. This is what we would expect to see in a schema such as JSON schema; it provides a template from which to verify values. In this way, we could use it to verify that the first example is valid.

![](/images/deep-dive-into-json/part-9-templates-and-schemas-image25.png)

`{ name: !string, age: !int }`

The third example is a partial type; the value “bob” is provided for the name, but the “age” just has the type \!int. Really, there’s only one thing missing in this example, the “name” field has both a type \!string and value “bob”, while the “age” field has the type \!integer but we don’t know what the value will be yet. It’s a bit contrived, but this can actually be useful in some scenarios.

![](/images/deep-dive-into-json/part-9-templates-and-schemas-image26.png)

`{ name: "bob", age: !int }`

The fourth example takes the schema concept even further. Instead of providing a type for the “name” field, it specifies a yet to be specified type T. This is the concept of generics in many programming languages. Before using this template the type T would need to be provided.

![](/images/deep-dive-into-json/part-9-templates-and-schemas-image27.png)

`{ name: T, age: !int }`

The fifth example is to really drive the point home. In this model of beads there’s no reason why a partial type couldn’t include a situation where the “name” field type and value are not known. At the same time the “age” field has a known type \!integer and value 25\.

![](/images/deep-dive-into-json/part-9-templates-and-schemas-image28.png)

`{ name: T, age: 25 }`

The sixth example is an extension of the second example. The “name” field type is expected to be of one or more other types. In this case a \!string or a type called \!name. The \!name type might be a compound object with fields like “firstName” and “familyName”.

![](/images/deep-dive-into-json/part-9-templates-and-schemas-image29.png)

`{ name: (!string | !name), age: !int }`

All of these examples represent valid structural arrangements using the beads analogy. The difference between them is their level of completeness. Using the concepts of proto-typing and partial types from programming languages and applying them to data, it is possible to say that data and schemas are the same thing, they exist on a spectrum of completeness. The question now is if this can be integrated into the other seven structural primitives to create a unified data and schema solution in a single data format.

## **Unified Data & Schema**

After exploring the other seven structural primitives, much of what is required to support partial types and templates is already present in the ideas previously explored. In [Part 4](/research/deep-dive-into-json/part-4-json-strings), the idea of using \!type to specify a type was already explored. For example:

```
{
  someUUID: !uuid 550e8400-e29b-41d4-a716-446655440000
}
```

If we propose that a field does not require a value then we already have schema type templates:

```
{
  name: !string,
  age: !integer
}
```

Given a template like above, we’ve already defined the type syntax, so to define and use them:

```
{
  person: { name: !string, age: !integer },
  instance: !person { name: "bob", age: 25 }
}
```

Straight away, we’ve now got a person structure and we’ve used that to create an instance of person. The \!person syntax indicates that the value that follows is an instance of a person and should conform to the values. If there’s non-conformity the system could report a warning or error.

Given this is just part of the solution, there’s no reason it can’t support partial types:

```
{
  person: { name: !string, age: !integer },
  bobs: { ...person, name: "bob" },
  complete: !bobs { age: 25 }
}
```

In the example above, it is using the composition spread operator explored in [Part 8](/research/deep-dive-into-json/part-8-references-and-structural-composition) to combine the person type into the “bobs” type. The name is set to “bob” and the age is left as unset. Finally “complete” is set with an instance of “bobs” that completes the value with age set to 25\. The value for “complete” would then be { name: “bob”, age: 25 } and it would conform to the “person” definition.

There's still a question of whether “bob” is a default value that can be overridden or a fixed value that acts as a constraint. This touches on a broader question in schema design about mutability and refinement. While an annotation like “@fixed” could be added, this is one of many details that will likely evolve as the proposed format is developed. For now, my inclination is to treat “bob” as a default value, which aligns with prototype-based language traditions.

Templates take the idea of leaving both the type and value unset. The concept of templates would require additions to the syntax from what has already been presented. This requires some way to say that there’s a type missing that will need to be filled in later. There’s some precedence in Java and other languages to use \<T\> style brackets. This could look like:

```
{
  name: { firstName: !string, lastName: !string },
  person: <T> { name: T, age: !integer },
  simpleName: !person<!string> { name: "bob", age: 25 }
  complexName: !person<!name> { name: { firstName: "bob", lastName: "culp" }, age: 25 }
}
```

The final example is what is often referred to as the [sum type](https://en.wikipedia.org/wiki/Tagged_union) in [algebraic types](https://en.wikipedia.org/wiki/Algebraic_data_type). The syntax for an “or” relationship is quite well defined. Let’s use the pipe symbol to say the person’s name can either be a \!string or a \!name type:

```
{
  name: { firstName: !string, lastName: !string },
  person: { name: (!string | !name), age: !integer },
  simpleName: !person { name: "bob", age: 25 }
  complexName: !person { name: !name { firstName: "bob", lastName: "culp" }, age: 25 }
  errorName: !person { name: 25, age: 25 }
}
```

In the example above the system can report an error for errorName because the name value is neither a \!string or a \!name type.

This is not a full schema solution, but quite quickly and without adding too much to the data format we’ve been able to combine a schema solution into the data format that creates a unified ability to define and create data that conforms to a set structure. It is also supporting partial types (and default values) which is not something that is often seen in either schemas or data formats. A nice quality of the design is that we’ve also been able to use the same name scoping idea that was explored for references in [Part 8](/research/deep-dive-into-json/part-8-references-and-structural-composition) that uses JSON object keys.

## **Pulling at a few threads**

Whenever a new feature is added to a system it tends to open up a whole series of new problems and questions to answer. As suggested at the start, data schemas and validation bring up endless questions that just when you think you have a good answer, the solution creates ripples through the design. Let’s pull at a couple of threads and see if we can resolve a few of the big concepts.

### **\!null type or optional?**

An important aspect of data interchange is whether a field is nullable. There’s a lot of debate about if a field should be marked as [optional or required](https://stackoverflow.com/questions/31801257/why-were-required-and-optional-removed-in-protocol-buffers-3) or always be [optional](https://capnproto.org/faq.html#how-do-i-make-a-field-required-like-in-protocol-buffers). I’m going to leave that debate for another day, but I suspect that in the solution being built it may not be an issue as validation can reference known schemas; more on that another time. One way to create an optional field is:

```
{
  name: !string | !null,
  age: !integer
}
```

Using the null type allows the solution to make it clear that the name can have a \!string or \!null. Another way would be to use the syntax common in TypeScript, C\#, Kotlin, Swift and Dart:

```
{
  name: !string?,
  age: !integer
}
```

This has the advantage that it is familiar to a reasonable number of programmers that might adopt the system. However, if optional is the default, it might be better to have the developer specify when a field is required. This might be indicated as:

```
{
  name: !name!,
  age: !integer
}
```

This syntax has less prevalence, but could be worth exploring. My preference would be to avoid the concept of null all together in the final solution as it is more verbose and null references should not be a required concept in data formats.

### **Type Hierarchies & \!any**

One of the issues with any type system and validation is checking if something matches, consider one of the earlier examples:

```
{
  person: { name: !string, age: !integer },
  bobs: { ...person, name: "bob" },
  complete: !bobs { age: 25 }
  somebobs: !person [ *bobs, *complete, { name: "alice", age: 22 } ]
}
```

In the example above, I’ve created an array called “somebobs” that is an array of the \!person type. The first value \*bobs is an object that uses the spread operator to include the person type, but is missing the age value, the second value is a person because it references the bobs value and includes age and finally the third value is just an anonymous object but includes the name and age. This is likely going to require some kind of [duck-typing](https://en.wikipedia.org/wiki/Duck_typing) (if it looks like a duck and quacks like a duck it probably is a duck), especially if that third value in the array is to be validated. Once again, something to explore in detail in the future.

Another issue with type hierarchies is what goes at the top? One way that is common to bring all values and types into a single system is to create a top type like \!any or Object. This can provide a simple way to also support templates which can now default to the \!any type.

```
{
  name: { firstName: !string, lastName: !string },
  person: <T:!any> { name: T, age: !integer }
}
```

This is another area that really needs a lot of investigation, but my initial thought is that for a data format schema solution it would be better to not have a top type. This is also more common in proto-type based languages like Self, Lua and NewtonScript.

### **Schema Dictionaries**

One problem with the solution so far is that all these partial types such as “name” and “person” are polluting the main value space. Let’s try hiding the schema dictionary behind the type specification:

```
!person<!name>:{
  name: { firstName: !string, lastName: !string },
  person: { name: (!string | !name ), age: !integer }
}
{ name: { firstName: "bob", lastName: "culp" }, age: 25 }
```

This syntax is using the same idea of name:value but instead \!type:dictionary. In this way the schema and any partial types are being hidden behind the type syntax and not included in the final output.

### **Loading dictionaries**

While we’re here, let's take it one step further, it’s normal for the schema to be kept separate from the data file. A schema file could then include:

```
{
  ...base_types:"http://abc.co/base_types",
  name: { firstName: !string, lastName: !string },
  person: { name: (!string | !name ), age: !integer }
}
```

Using the spread operator here to load and combine any other “base\_types” into the current schema file. The base\_types file might define \!string, \!integer and other base types. The main data file could then be:

```
!person:"http://abc.co/people"
{ name: { firstName: "bob", lastName: "culp" }, age: 25 }
```

The scoping rules for types could be down to the individual values, such as the following:

`{ timestamp: !datetime:"https:/abc.co/datetime.json" "2025-09-07T10:19:00" }`

One issue with using URL or external file based schemas is that there’s nothing stopping them from changing. To maintain immutability guarantees, content-addressed URLs with cryptographic hashes could be used. The client could then verify that the schema hasn’t changed.

`!person:"https://abc.co/people#sha256:a1b2c3d4..." {...}`

## **Putting it together**

We’ve covered a lot of ground to get from a data format to something that might also unify into a schema. Let’s see what a real world example might look like. The following is a very made up “getUsers” api specification split into three files. The first is a generic api\_base that defines a generic apiResponse template with success and failure types:

```
@doc: @lang:"en" @format:markdown """
#API Base Schema
defines standard response templates for all API endpoints.
"""
@version:"1.0.0"
&api_base {
  error: {
    code: !string,
    message: !string,
    field: @doc:"Optional field identifier for validation errors" !string?
  },
  @doc:"Generic API response wrapper with customizable data type"
  apiResponse: <T> {
    status: !int,
    timestamp: !datetime,
    data: T,
    errors: @doc:"Array of errors, empty on success" [...!error]
  },
  @doc:"Success response template with 200 default"
  successResponse: <T> {
    ...apiResponse<T>,
    status: 200,
    errors: _
  },
  @doc:"Failure response template with no data payload"
  failureResponse: {
    ...apiResponse<_>,
    status: 500,
    data: _
  }
}
```

There’s an interesting issue that is revealed from this example. The failureResponse has the data field being unset which means the template value is also unset. Not sure if this is the right way to do this and will require further investigation.

The second file is the User API schema definitions. Notice how it uses the spread operator to combine the api\_base referenced above into the main dictionary:

```
@doc:"User API schema definitions"
@version:"1.2.0"
{
  ...api_base: @sha:"AC133BC" "http://abc.co/schema/api_base/1_0_0",
  user: {
    id: !uuid,
    name: !string,
    email: @format:"RFC2822" !email,
    active: !boolean
  },
  getUsersSuccess: {
    ...successResponse<[...!user]>
  },
  getUsersFailure: {
    ...failureResponse
  }
}
```

The second file also introduced an interesting problem. How are arrays defined. This might not be the final solution, but here the spread operator is being used on the type rather than a value to say that this is an array of users. This is one of those areas where the difference between an array of integers (e.g. \[1,2,3,4,5\]) versus an array with the first value being a user and the second value being an integer (e.g. \[1, “hello”\]) becomes interesting. Full credit where it’s due, this idea of using the spread operator in this way came from [Claude](http://claude.io/) after I challenged it on a previous concept and it iterated through a few variations before finding this one. What syntax would you use to make the distinction?

The third file is the generated response from the getUsers api call. Notice that other than the annotation and the \!getUsersSuccess type details the rest is standard JSON (without the quoted field names). The difference here is that the data can be validated against the previous schema files.

```
@generated:"2025-01-20T15:30:00Z"
!getUsersSuccess: @sha:"45DFA12" "http://abc.co/schema/user_api/1_2_0" {
  timestamp: "2025-01-20T15:30:00Z",
  data: [ {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Alice",
    email: "alice@example.com",
    active: true
  }, {
    id: "660e8400-e29b-41d4-a716-446655440001",
    name: "Bob",
    email: "bob@example.com",
    active: true
  } ]
}
```

Every example is likely to demonstrate small issues like templates being unset and clarifying the syntax for arrays with repeating values versus arrays with indexed types. Over time with some careful steps it should become clearer.

## **Immutability**

In [Part 8](/research/deep-dive-into-json/part-8-references-and-structural-composition), a step was made over the precipice towards functional programming. But what sets a data file apart from a programming language is its immutability. Features like references, spread operators and partial types can be used to move, combine and validate data, but at their core, they do not modify the data. When a spread operator combines values from a template, it creates a new structure while leaving the original unchanged. This ensures type resolution is deterministic and repeatable, making the format naturally cacheable and parallelizable. This immutability should become a core principle for data format design, the file becomes a snapshot of both specification and data, frozen at the moment of creation.

## **Unification**

The idea that is emerging is that data and schemas do not need to be separate concepts, they are just different points on a spectrum of structural completeness. This unification has several important implications:

1. **No separate schema language**: Schemas use the same syntax as data but require some additional syntax. Likely higher complexity upfront, but potentially lower complexity overall.  
2. **Gradual refinement**: Templates can be progressively filled and partially complete types can be created. Partial typing with default values requires no new syntax and can be mixed with data specifications.  
3. **Composable validation**: Schema composition uses the same primitives as data composition. Schema validation would also be opt-in, with the base capability being that the data is self defined.  
4. **Immutable snapshots**: Everything is an immutable structure that can only be composed into new immutable structures. Immutability as a core concept makes the whole data and schema system verifiable.

This challenges the traditional separation between data interchange formats and schema definition languages. Instead of having JSON for data and JSON Schema for schemas, both concerns are addressed by the same format using the same syntax. Unlike Self's mutable object model, this approach provides the conceptual elegance of prototype-based thinking with the safety and predictability of pure functional composition.

## **Conclusion**

Templates and Proto-type values complete the structural primitive framework established in [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects), providing the eighth and hopefully final way that information can be organised in serial form. This unification of schema and data opens possibilities for more expressive data formats that can seamlessly blend concrete data with type constraints, external schema composition, and parameterised reuse. The same syntax serves both data representation and schema definition, creating a coherent system where validation, composition, and instantiation are all aspects of the same underlying structural operations. What will be interesting is how complex this unification will become when implemented and if it is simpler or more complex than keeping data formats and schemas separate.

While Part 9 has taken us from our starting point of JSON, we’re now far off the beaten track and exploring uncharted territory. Thankfully, we’ve had functional programming and proto-type based languages like Self to use as a guide. However, this article really only just got started with attempting to unify data and schemas. There’s still the big issue of how to restrict scalar values such as numbers to ranges, strings to particular formats (ie regex) and the specification of enumerated types. There’s also meta-schemas and how base types like maps, objects and arrays are themselves defined. Self-referencing data structures can get particularly difficult as they fold-in upon themselves. There’s still more to explore.

