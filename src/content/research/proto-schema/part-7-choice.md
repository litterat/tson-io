---
title: "Proto-schema: Part 7. Choice"
series: "proto-schema"
seriesTitle: "Proto-Schema"
part: 7
description: >
  What appeared to be the simplest of the proto-schema’s core properties, choice as “one of these options” turns out to be a deep and unsettled subject. This article reframes Choice as part of a family of *variant mechanisms* and catalogues nine such mechanisms that recur across schema systems.
originalUrl: "https://litterat.substack.com/p/proto-schema-part-7-choice"
originalDate: 2026-05-25
abstract: >
  What appeared to be the simplest of the proto-schema’s core properties, choice as “one of these options” turns out to be a deep and unsettled subject. This article reframes Choice as part of a family of *variant mechanisms* and catalogues nine such mechanisms that recur across schema systems. It then focuses on the most familiar of these, the tagged and untagged sum types, finding that both tagging and labelling of sum types are orthogonal to each other. It concludes that despite surface similarities, labelled and unlabelled tagged unions encode genuinely different concepts and both structures belong in the proto-schema. The remaining variant mechanisms are flagged for later articles.
---

# **Proto-schema: Part 7\. Choice**

### Part 7 in a series of articles that openly designs and develops a proto-schema that provides the underlying data model for building data format schemas.

**Abstract:** What appeared to be the simplest of the proto-schema’s core properties, choice as “one of these options” turns out to be a deep and unsettled subject. This article reframes Choice as part of a family of *variant mechanisms* and catalogues nine such mechanisms that recur across schema systems. It then focuses on the most familiar of these, the tagged and untagged sum types, finding that both tagging and labelling of sum types are orthogonal to each other. It concludes that despite surface similarities, labelled and unlabelled tagged unions encode genuinely different concepts and both structures belong in the proto-schema. The remaining variant mechanisms are flagged for later articles.

![](/images/proto-schema/part-7-choice-image30.png)

## **Introduction**

Choice has been present in the proto-schema since [Part 2](/research/proto-schema/part-2-what-is-a-schema), introduced alongside Sequence, Multiplicity, and Naming as one of the four properties derived from the physical constraints of serialised data. [Parts 4](/research/proto-schema/part-4-sequences), [5](/research/proto-schema/part-5-templates), and [6](/research/proto-schema/part-6-structural-composition) have focused on Sequence, deriving five sub-types, adding Templates, and establishing Structural Composition with its narrowing rules and immutability guarantees. Through all of that, Choice has remained a single sentence: “one of these options”. What I had originally flagged as an easy topic, potentially being bundled with others into a single topic has expanded into two articles that only scratches the surface.

The article set out to examine Choice with the same rigour as applied to Sequence, deriving its properties from the physical constraints of serialization; linear, immutable, finite data, and divisible. [Part 4](/research/proto-schema/part-4-sequences) derived five Sequence types from its properties of length (fixed or variable), indexing (positional or named), and element homogeneity (same type or different types). Those properties produced clearly distinct structures because a Sequence must define a layout for multiple elements: how many, in what order, accessed by what means. In my mind, Choice should have been so much simpler, it’s “one of these options”. There is no layout to arrange, no ordering, and no length, but there’s more to it.

In type theory, Sequence and Choice correspond to *product types* and *sum types*. These are the structural backbone of [algebraic data types](https://en.wikipedia.org/wiki/Algebraic_data_type). Products combine values, that is, an address has a street AND a city AND a postcode, while sums select between values, a response is a success OR an error. The difference shows up in data formats. A product writes all of its components, whereas a sum only writes one of its variants and an indication of which one. In a schema and data format, it’s about knowing which variants are allowed in a given place and being able to know which variant is selected.

The idea of a [sum type](https://en.wikipedia.org/wiki/Tagged_union) is clearly understood and has quite a narrow definition. However, we’ve already examined templates and structural composition which look like a sum type, they have multiple variants and write one of its variants and an indication of which one. Yet, these are not sum types and don’t meet the criteria for being a sum type. There’s nothing I could find in the literature that groups sum types with other mechanisms like structural composition and templates. Wikipedia’s entry on sum types makes this more confusing, stating they are “also called a variant, variant record, choice type, discriminated union, disjoint union, sum type, or coproduct”. It leaves little in the vocabulary to describe this wider group. As such, we will use this as the definition as a guide:

* Variant mechanism: The family of data format and schema mechanisms that expresses disjunction at a single location.

Taking this broader view of Choice, this article will explore variant mechanisms, with sum-types fitting only some variant mechanisms. The goal is to understand the properties of variant mechanisms and explore how they should be applied within the proto-schema. As in other articles, we start by returning to the beads on twine analogy to discover the concepts directly from the physical properties.

## **What comes next?**

Sequence is straightforward in the beads analogy, beads placed one after another, their order fixing the type of Sequence. A Choice is not a bead on the twine, it is a decision about which bead goes next. Imagine you’re half way through creating a bracelet, and you have a choice of which bead goes next.

![](/images/proto-schema/part-7-choice-image31.png)

Picture of two beads on twine. The third bead is a choice between a green blue or red bead

The choice of what comes next is finite when it is restricted by the types that have been defined by the data format. In this case there’s only a small number of coloured beads to choose from; a green, blue or red bead. It’s worth defining two additional terms that are common in the literature and we’ll use throughout the article:

* Variants: The set of types or things that are allowed at a particular location.  
* Variant (singular): An individual type or thing selected from the allowed set.

A schema can be used to restrict and validate the variants further to the types it has defined; maybe only a red or green bead is valid next in the sequence. At the other extreme, we could say that any bead is accepted that has been previously defined by the schema. The set of variants could also be based on some kind of selection criteria. For example, only square beads that are shades of blue.

While the choice is finite when dealing within a schema, there might also be external schemas and the unknown domains that the schema is not aware of. These other schemas are infinite in the sense that they are unknown. In the beads analogy, the schema might have a placeholder for a bead that is not known or defined by another schema. Here the round bead represents a foreign bead that was expected in the sequence, but the shape and colour is unknown by the schema.

![](/images/proto-schema/part-7-choice-image32.png)

beads on twine. red \- blue \- circle \- blue \- red

This is different from the idea of a template that is made complete within the schema. It’s also different from the idea of saying that any bead is accepted from what is known by the schema. While this is not a choice as such, it’s a definition with many variants and demonstrates that the proto-schema will need a method to provide placeholders for unknown or externally defined types.

Another possibility is to have the choice of the next bead dependent on the previous. In the following example, if the previous bead is red then the next one must be blue, and if the previous bead is green the next one must be red. These dependent values create an interplay between the data that sequences do not.

![](/images/proto-schema/part-7-choice-image33.png)

beads on twine. red \- blue \- green \- red. Arrows pointing from red to blue and green to red

When reading data, as humans, we can discern the colour of beads and validate that the order matches our expectation. However, when it comes to data formats, it isn’t always obvious what a value represents. For example, both an email and a URL are represented as strings, and it would require testing the string against patterns to validate if a value matches the pattern of a particular type. A few additional common terms used in the literature include:

* Discriminator: a mechanism for determining which type is present where multiple types are expected.  
* Tag: additional meta data that is added to the data to act as the discriminator.

In this example the round beads represent a tag and provide information about the colour of the following bead.

![](/images/proto-schema/part-7-choice-image34.png)

beads on twine. (red) \- red bead \- (blue) \- blue bead \- (green) \- green bead

A discriminator tag can be in-band where the discriminator values are read and form part of the data. The alternative is that the discriminator tag is out-of-band and forms part of the data format only. In that case the receiver program only receives the value and the discriminator is filtered. Both solutions can be found in different data formats.

An alternative to a discriminator is the idea of using the structure of the data to work out what is being read. For example, JSON only allows null, boolean (true or false), numbers and strings (in quotes). It’s easy enough to distinguish which is which just by checking a few characters of the value; starting with n, t, or f, it’s null, true or false, starting with a quote, it’s a string. In this case, the types are said to be disjoint, in that there’s no overlap between the types. Structural discrimination could also be done by checking which fields are present in a JSON object. These methods are all more complex when types are not disjoint, that is, there’s overlap between the possible values in the types (e.g. positive integers and integers in the range of \-100 and 100 are not disjoint). The result is that structural discrimination is often more restrictive, and potentially prone to errors, so it’s not surprising that some form of tagging is usually used.

Variant mechanisms in the proto-schema are two-sided; on writing the data, they are used to validate that the next bead put on the twine matches the choices defined. Upon reading the data the variant mechanism ensures that the next bead being read matches against the defined choices. This makes the mechanisms contextual. It must be clear at what point the file is being read to ensure that the schema and data match. Any out of sync positioning could easily result in an error.

The bead analogy has provided much more depth than the original “one of these options” suggested. Variants of a choice can be selected from within a schema or extend into unknown domains. An individual variant value can be tag-driven, structurally inferred, or dependent on neighbouring values. The schema and data format share responsibility for both sides, what variants are admissible and how a reader knows which one is present.

## **What’s in a Choice?**

Unfortunately, unlike Sequence where the various types of sequences were derived directly from the physical traits, Choice variations aren’t so cleanly derived. This makes it difficult to prove there’s a limited set of known variant mechanisms. However, we can narrow down the search. The original phrase, “one of these options” is the key. We’re looking for all mechanisms that allow one type to be present from a fixed or open set of types.

Across all variant mechanisms, four properties recur:

* **Single location** \- the variant mechanism is used to define a single location within the data, the same way a single bead occupies one place on the twine.  
* **Single occupancy** \- the location holds one value drawn from the variant set. In most cases the value matches only one type from the variant set, but in some unions it could represent multiple.  
* **Variant set** \- the types admissible at that location. The set may be enumerated in place, assembled across the schema, parameterised by a template, or anchored to an external domain, but a set of admissible types always exists in some form and the data can be validated to match a variant in the set.  
* **Discrimination** \- some mechanism by which a reader determines which variant is present. The discriminator may be a tag attached to the value, a sibling field, or a structural property of the value.

The single location and single occupancy simply state that only one value occupies the location in the data. They don’t have any further variations to investigate, but they do define the scope for the next two properties. The variant set and discrimination mechanisms are the richer properties to explore.

Unlike Sequence, where a set of types were derived from properties, variant mechanisms don’t decompose so cleanly. The properties above describe the mechanisms once identified, but they don’t derive them, instead, it’s worth doing a survey of mechanisms. The list that follows is the set of mechanisms that recur across schema systems, but are not provably exhaustive:

* **Tagged Choice (sum-type)** \- the variants are listed in the definition. The set is fixed and finite, knowable from the definition alone. This is the classic sum-type where the types are disjoint and known.  
* **Untagged variants (Structural unions)** \- similar to a tagged choice, in that the variants are fixed and finite. However, there’s no discriminator and there’s a possibility that the value can match against multiple types.  
* **Parametric variants (Templates)** \- the variants include a slot filled at instantiation. The set is closed per-instantiation but open across the family as explored in [Part 5](/research/proto-schema/part-5-templates).  
* **Subtype variants (Structural Composition)** \- a reference to a type whose subtypes extend it through structural composition. The value at the location may be any subtype of the named type as discussed in [Part 6](/research/proto-schema/part-6-structural-composition).  
* **Constrained variants** \- these apply to atomic types where a constraint limits the range of the particular type. For example, a positive integer is a constraint on an integer.  
* **Open variants** \- the variant set is assembled across the schema, with later definitions declaring themselves as members. One example of this is substitution groups in XML Schema.  
* **Scoped variants** \- the variants are any type, either within the current schema (Local Any) or beyond it (Disjoint Any). The variant set is potentially the whole type universe.  
* **Dependent variants** \- a closed, finite set of variants whose discriminator lives in a sibling field rather than on the value itself. The dispatch information sits in the surrounding structure. Dependent variants behave much like a tagged choice, but have the discriminator form part of the variant mechanism.  
* **Predicate variants** \- the variants are whatever satisfies an intensional rule. The set is generally not enumerable.

What’s particularly fascinating about the list above is that only one or two are genuine sum types. The rest share some surface properties of a sum but turn out, on inspection, to be other constructs entirely. Several of them dissolve into proto-schema features already established; parametric variants (templates), subtype variants (structural composition), and constrained variants on atomic types all form supertype/subtype relationships. The need for supertypes and subtypes is already established as a feature of the proto-schema. Other variants (scoped, open, dependent, predicate) raise questions that warrant their own investigation. This article focuses on the first two on the list, tagged and untagged variants, and defers the rest to the next article. Even that narrower scope turns out to need a lot of careful work.

The fourth property of the variant mechanisms is discrimination. In many cases the method used to define the variant set often dictates or limits the type of discrimination used. Thankfully, discrimination mechanisms are part of the physical constraints of serialization, as such it should be possible to be sure that all discriminations are understood. The vocabulary in this area is particularly unsettled, so the following names attempt to capture the differences reasonably cleanly.

For discrimination the methods can be split into Sequence and Atom discrimination methods. For Atom discrimination there’s really only two options:

* **Structural discrimination (untagged)** \- This is where the shape of the value is examined to define what type it conforms. Where the types are fully disjoint (meaning they don’t overlap) this is easier. However, a URL is also a URI and String, so in some cases it can be harder to distinguish. This is how JSON works out what type of value is present.  
* **Tagged discrimination** \- A tag is placed near the value to identify which particular type it should conform to. This is the most common discrimination mechanism. The tag links back to the type system and could be a string, integer or any other meta-data that short-cuts the data format’s ability to determine how the value should be handled. Many protocols with fixed type sets use integers, while a text format like YAML has optional \!\!type syntax.

For Sequence based discrimination the Atom discrimination mechanisms can also be used. In structural discrimination, all the record fields might be analysed and matched against a particular type. However, for both Records and Tuples where there’s multiple fields a couple more options exist.

* **Self-tagged discrimination** \- This is where the discrimination forms part of the data format itself. XML Tags are a perfect example of this style. Every XML tag identifies its type and there’s no ambiguity.  
* **Embedded tagged discrimination** \- The discriminator lives within the record itself. This is the style used by JSON Schema where a “type” field within the JSON object identifies the record type. While this is very similar to self-tagged discrimination, the embedded tag forms part of the data.  
* **Dependent tag discrimination** \- The discriminator lives in another part of the data (usually within a record), and informs the type of another field. A classic example of this is where one field in a Record has an enum type that dictates the value in another field of the same Record.

There can be variations in the implementation of each of the discrimination types, however, we can validate the exhaustiveness of the mechanisms quite easily. Structural discrimination is a fancy way of saying there’s no discriminator, tagged and self tagged discrimination provide a meta-data element outside the data. Embedded and dependent tags are inside the data. There’s nowhere else the discriminator can be placed.

It’s worth a note that discrimination only arises when more than one type is possible at a location. It might seem that schemas themselves provide a sort of positional discrimination when a field is defined as a type inside a record. However, a field declared as a single type as a string, integer or specific record isn’t discriminated against when using a schema. When using a schema, the reader knows the type from the schema and validates the value against it. Instead, discrimination is the additional step that variant mechanisms require when the set of admissible types is larger than one. The reader needs a way to decide which member of the set is present. Positional rules and field-type declarations in schemas are closely related, but aren’t a discrimination or variant mechanism.

The variant mechanisms can therefore be narrowed down to having two properties that are statements of fact; they have a single location and single occupancy. They use one of five methods to discriminate between the values. It is only the variant set mechanisms that are more difficult to define. It’s these that need to be analysed in detail before we can get a grip on how Choice should be defined in the proto-schema. The rest of this article works through the tagged and untagged variant set mechanisms.

## **Tagged & Untagged Choice (sum-type)**

The classic [tagged union](https://en.wikipedia.org/wiki/Tagged_union) or sum-type is the obvious first variant mechanism to explore. It’s incredibly well understood, found in every schema system in one way or another, and has some very useful properties. At the same time, there is a lot of variation in how it has been handled in existing schema systems. For the proto-schema, it won’t be as simple as just choosing a compatible mechanism so there’s plenty to explore. In schemas, a closed Choice declares a fixed, exhaustive set of variants, for example in Protobufs:

```protobuf
message Event {
  oneof payload {
    string text = 1;
    int32 count = 2;
    UserInfo user = 3;
  }
}
```

In the case of Protobufs, the choice can only be defined from within another message (Record) structure. An alternative is to allow the type itself to be defined at the top level. For example in ASN.1 the structure looks very similar, but is defined at the top level:

```
Message ::= CHOICE {
  request  [0] Request,
  response [1] Response,
  error    [2] ErrorInfo,
  ...
}
```

For completeness, it’s worth also showing the equivalent in XML Schema. XML Schema allows choice to be used within complexTypes, sequences, groups and other choices. But XML Schema choices don’t become a first class type like in ASN.1. Here’s the first example in XML Schema:

```xml
<xs:complexType name="Event">
  <xs:choice>
    <xs:element name="text" type="xs:string"/>
    <xs:element name="count" type="xs:int"/>
    <xs:element name="user" type="UserInfo"/>
  </xs:choice>
</xs:complexType>
```

These tagged choices are a natural fit for data schemas when defining the shape of an API response, a configuration value, or a message format; the schema author knows exactly what forms the data can take. It’s also useful to point out that these are exclusive or (XOR) options, where only one can be selected in the data. In the first two examples the variants are listed with three values, the type, a label and a tag (ordinal). Tags and labels often get used interchangeably, but as we’ll discover later, they do hold different purposes.

If you ignore the ordinal for a moment, you’re left with a label and a type in all the examples. This is exactly the same structure as records that each field has a label and type. However, instead of filling the values for each of the labels as is done with records, the labelled choice says that only one of the fields can be selected and a value provided. This idea of a label for choice means that it is possible to represent the same type with different labels. Here’s another ASN.1 example:

```
Timestamps ::= CHOICE {
  created  [0] GeneralizedTime,
  modified [1] GeneralizedTime,
  accessed [2] GeneralizedTime
}
```

In this example the timestamp value could be exactly the same (e.g. 2026/05/15 12:58pm), but the label assigns meaning to the timestamp. This is exactly the same mechanism as if the labels were within a Record, except only one label/value combination can be used in the space at one time.

An alternative to a labelled or tagged choice is an untagged choice or union. Here’s an example from JSON Schema using the anyOf structure:

```json
{ "anyOf": [
  { "type": "string" },
  { "type": "integer" },
  { "type": "object",
    "properties": {
      "id": { "type": "string" },
      "role": { "type": "string" }
    },
    "required": ["id"]
  }
] }
```

The difference here is that the only thing being defined is the allowed types/schemas. There’s no additional information about the semantic meaning of the data. Also notice that JSON Schema also allows an object type to be anonymously defined directly as an alternative. Here’s another more concise example from TypeScript which states the same structure:

```typescript
type Payload =
  string |
  number |
  UserInfo;
```

This says, a Payload type can be either a string, number, or a UserInfo type. The “|” character represents “or” and is commonly used in many programming languages. In this case, instead of an anonymous object, the third option is a reference to the UserInfo type that is defined elsewhere. The untagged version only defines the shape of the data, while the labelled version provides semantic meaning to the data. Imagine the ASN.1 example of created, modified, accessed above without the labels, in TypeScript it would become:

```typescript
type Timestamps =
  GeneralizedTime |
  GeneralizedTime |
  GeneralizedTime
```

This loses the meaning without the labels, so labels provide important meaning to the data. One way to potentially solve this is to define new types, created, modified and accessed all as GeneralizedTime. The definition then becomes:

```typescript
type Timestamps =
  created |
  modified |
  accessed
```

The solution pushes the semantic meaning of the timestamps into the type system and creates generalised types that could be reused. It has the disadvantage of losing locality of semantic meaning that can be found in record data structures. Neither solution is better than the other, but does demonstrate the fuzzy line between field labels and types that programmers and schema designers always come across.

This short survey of schema sum types shows the core variant mechanism characteristics that were defined earlier. They define what’s valid for a single location that can have a single value. They defined a fixed set of variants that can’t be modified and provide some form of discrimination. However, they also show the following differences:

1. **Defined inline vs top level types.** In Protobufs and other systems the choice can only be defined within a record structure. However, in ASN.1 and others, choice is a top level structure that can be re-used.  
2. **Referenced or inline types/schemas**. The core purpose of the variant is to describe the shape of the data. In most systems this is by type, but in examples like JSON Schema, full schemas can be defined inline.  
3. **Labelled or Unlabelled**. Untagged choices like JSON Schema are defined by the shape of the data only. ASN.1 provides labels in a way that is reminiscent of record field names. In XML Schema, the element name becomes the label.  
4. **Tagged or untagged**. Not to be confused with a label, a tag provides the discrimination method. In Protobufs and ASN.1 this is an integer value. In JSON Schema “anyOf” is completely untagged and the value must be tested against each of the variants to find which one matches.

It is worth pausing on the third and fourth points, because they are independent of each other and it is very easy to treat them as the same thing. Labels and tags answer two different questions. A label, in a way similar to records, provides semantic meaning to the variant without requiring new types in the type system. It answers “what does this variant mean?” A tag, on the other hand, is used to help a reader discriminate between which value is present of the variant set. It answers “which variant is present?” In some systems the two are the same, but in others the values are unrelated. The two axes are orthogonal, and the existing systems sit at different corners of the resulting grid:

* **Tagged and labelled**. ASN.1 CHOICE is a good example, with its integer tag and per-variant label. The label carries meaning, the tag provides the discriminator.  
* **Tagged and unlabelled**. Apache Avro’s binary union encoding is a good example. A union like \[”null”, “string”, “Foo”\] writes an integer index, followed by the value. The integer is the discriminator and there are no per-variant labels.  
* **Untagged and labelled**. XML Schema’s element-based choice, where the element name acts as both the label and (because XML elements are self-tagged) the discriminator mechanism.  
* **Untagged and unlabelled**. JSON Schema’s “anyOf” mechanism. There is no discriminator and no label. The reader must test the value against each variant; if the variants overlap, the result is ambiguous.

The untagged and unlabelled case creates the most complexity. It depends entirely on structural discrimination, which works cleanly when the variants are obviously different (string vs integer vs record) but fails as soon as the variants overlap. A (\!email | \!url) choice is difficult under structural discrimination because both are strings underneath; the reader cannot tell them apart from the value type alone. JSON Schema’s ‘anyOf’ accepts any match, so overlapping variants validate as long as at least one matches. This leaves no canonical way to determine which variant was intended.

From a proto-schema point of view there’s two choices we can make early on. The proto-schema is at its core a set of names and definitions. In addition, the aim of the proto-schema is to deconstruct the schemas into well defined structures. So, defining choice as a top level concept in the proto-schema is the first step. The second decision also follows on quite easily, the proto-schema is attempting to decompose the structures into a small number of concepts, so referencing types instead of making them inline becomes another easy decision. The question of labels and tags in the proto-schema requires looking deeper.

## **Choice in the Proto-schema**

Before creating a proposal on how the proto-schema should deal with the concepts of Labelling and Tagging in choice, let’s investigate how Choice might be modelled in the proto-schema. With the two decisions of defining choice at the top level and referencing other types we can test some of the basic concepts. Consider a list that can either be strings or integers, a definition might look like:

`someList: [ (!string | !integer) ]`

If the internal model of an Array is a record that carries some information then the proto-schema will attempt to decompose the concepts. For the choice to be supported, the array must support both a singular Type and the choice of string or integer. One way to accomplish this, is to pre-process the types into a normalised form, for example:

```
choice#string#integer: Choice( !string | !integer )
someList: Array( !choice#string#integer )
```

The choice of string or integer is given its own synthetic name within the proto-schema. This has the benefit that Choice is normalised into a single type, but can still be defined inline within a schema.

Normalisation is a powerful tool in creating an internal model that is simpler to construct and maintain. It does mean that the external form of how the meta-schema is defined is likely to diverge from the internal proto-schema form. But the aim of the proto-schema is to be a well defined internal model, not necessarily having a matching external representation. This follows the same concepts established in [Parts 5](/research/proto-schema/part-5-templates) and [6](/research/proto-schema/part-6-structural-composition); the author writes a convenient inline form, the preprocessor produces a named definition, and the model only ever sees resolved definitions. Templates produced named instantiations from parameterised definitions; Composition produced resolved definitions from spread operators. In this case, inline choices produce named choice definitions. The mechanism differs in each case, but the goal of the proto-schema is as stated in the first article, to provide the building blocks from which meta-schemas and schemas can be built.

Most of the systems that were surveyed above end up having a single form of either labelled or unlabelled choices. A label creates a form that has a sort of parity with Records. Both a labelled choice and record use a label for each of the fields. The difference being that in a Record all the values are supplied, while in a Labelled choice only one of them are provided. This parity with Records is an interesting and useful property, but data formats don’t always integrate well with them. Consider the timestamps definition previously converted to a potential proto-schema model:

```
timestamps : ( created: timestamp | modified: timestamp | accessed: timestamp )

dataRecord: {
  id: string,
  lastAction: timestamps
}
```

What’s the right way to encode an instance of this in JSON? This is a problem that ASN.1 faced when creating the JER (JSON Encoding Rules) for ASN.1. They concluded that labelled choices had to become single field json objects. For example and instance of the previous dataRecord might look like:

```json
{
  "Id": "someRecordId",
  "lastAction": { "modified": "2026-05-21 13:05:00" }
}
```

The JER also has a modifier called “unwrapped” which allows the “lastAction” label to be replaced by the “modified” label:

```json
{
  "Id": "someRecordId",
  "modified": "2026-05-21 13:05:00"
}
```

This unwrapping creates more complexity in the record structure and loses the “lastAction” label which a normal reader might expect to see. This is a completely reasonable and useful way to define choice, but we already highlighted that by switching the label to a type we could define something similar:

```
created: timestamp
modified: timestamp
accessed: timestamp

timestamps: ( created | modified | accessed )

dataRecord: {
  id: string,
  lastAction: timestamps
}
```

Shifting the names into the type system naming instead of being part of a label allows using a type identifier instead:

```json
{
  "id": "someRecordId",
  "lastAction": !modified "2026-05-21 13:05:00"
}
```

This looks a little cleaner than the previous solution, but the proto-schema isn’t attempting to be a JSON schema only, it’s working towards understanding the underlying concepts that make up schemas. From this view point, picking a winner from labelled or unlabelled solutions would be the wrong decision. To quote a very old [meme](https://knowyourmeme.com/memes/why-not-both-why-dont-we-have-both), “¿Por qué no los dos?” (Why can’t we have both?)

The two forms aren’t variants of the same construct, they encode genuinely different ideas. A labelled choice distinguishes its variants by what they mean; the label “modified” carries a domain role that is independent of the type “timestamp”. Two variants can share the same underlying type (created, modified, accessed are all timestamps) and still be distinguishable because the labels themselves perform the same function as labels in records. An unlabelled choice distinguishes its variants by what they *are*: the variants must be different types, and the type names themselves serve as the discriminator. You cannot have an unlabelled choice of two timestamps any more than you can have a record with two fields of the same name.

At one stage, I explored the idea that maybe types without labels could collapse into a labelled tagged choice construct by giving the labels the names of the types, or collapse labelled into synthetic types and remove labels from choice. The aim was to simplify choice in the proto-schema back to a single construct. However, neither solution provided a suitable solution. The label “modified” is not a type name, and promoting it to one to satisfy the collapse would force every domain role into the type system, losing exactly the local, lightweight semantic structure that labels exist to provide. Conversely, requiring labels on an unlabelled choice where the types are already distinct adds noise without adding information. The encoding would become more complex for all the cases where just the type was required to discriminate. Labels and types are distinct concepts that solve distinct problems, and the proto-schema should support both.

Using the normalisation method and with two constructs, the proto-schema would then contain two possible constructs. For example:

```
typedChoice: ( !integer | !string | !UserInfo )
labelledChoice: ( created: !timestamp | modified: !timestamp | accessed: !timestamp)
```

Both forms of choice provide something different; a labelled choice provides a structure that localises semantic meaning without forcing everything to become a type, while a typed choice provides a faster more concise form where types already provide clear meaning. These are two choice structures that should be treated distinctly in the proto-schema.

These two definitions provide structures to a schema, but do not state specific requirements around the data format. It would be worth exploring methods like the JER unwrapping to get around the restrictions of individual data formats. Some of these were explored but every idea tried needed to modify the JSON labels, insert additional syntax or modify how the \!type concept behaves. For now, the data format itself is out of scope.

## **Disjointness & Discrimination of Choice**

The examples above show that the type system naming is an integral part of the discrimination (tagging) mechanism. The scalar (timestamp, strings, integers) examples are convenient but things get more complicated when you introduce templates and composition back into the mix. Consider a labelled choice that includes a template type (this example from Part 5):

```
person: <T> { name: T, age: !int }
fullName: { firstName: !string, lastName: !string }
simpleName: !person<T:!string> { }
complexName: !person<T:!fullName> { }

contact: ( name: !person | phone: !string )
```

This rather contrived example shows that the “contact” type can be either a name (person) which has subtypes of “simpleName” and “complexName” or a “phone” as a string. Applying the JER rules defined earlier, you might get:

`contact: { name: !complexName { firstName: "David", lastName: "Ryan" } }`

It’s not enough for the discrimination system to identify the type as “person”, instead it has to use the sub-type name “complexName”. Of course using the complexName type ensures a very fast and direct resolution of the type as it’s a simple test to check if complexName is-a person type. The alternative would be to use the structure itself and find a sub-type that includes field names with “firstName” and “lastName”:

`contact: { name: { firstName: "David", lastName: "Ryan" } }`

Without anything to specify what type of person is being set to “name”, you’re left with attempting to read the values then backtrack against all possibilities to find if the type is correct and validates against the schema. This is the solution JSON Schema chose and it adds more work and complexity to the reader. There’s no right or wrong way to go about it, but it does demonstrate that both the schema and the data format can’t operate completely independently. In this case the labelled choice having the “name” label in the contact choice helps narrow down the search space considerably.

This same issue of discrimination also affects the typed choices (unlabelled). However, with a type choice ensuring you have the right variant of the choice could be more difficult. As discussed early in the article, there’s the concept of types being disjoint that is especially useful when using structural discrimination. An “(integer | string )” is disjoint at the value level, and while an “(email | url )” is also conceptually disjoint, they are both encoded using strings which requires structural discrimination to employ regex expression testing to decide which is which. From this point of view it is a lot easier for the data format to self identify the type:

`emailOrUrl: !url "http://litterat.io"`

With the “\!url” type identifier, the reader only has to test if the string conforms to a valid URL. The alternative would be to check if the string is an email and then test if it’s a url. It’s also possible that the types are not disjoint, consider “( email | string )” or ( positiveInteger | integer ). In both cases the first type is completely covered by the second type.

Should the proto-schema enforce disjoint types, and if so, how can it be guaranteed that the types are disjoint. A labelled choice carries no such restriction because the label, not the type, does the dispatching. This is what makes the two constructs structurally different rather than stylistically different. For typed choice it’s likely that the proto-schema would be best to rely on the user to create disjoint choices in the first place. My inclination is that the data format should also support the proto-schema and allow matching to happen faster with more consistent error handling. However, these are decisions best left for later.

## **Conclusion**

Variant mechanisms have turned out to be an incredibly deep subject that looks small on the surface. This is often the case with schema systems, small decisions ripple through the whole solution and often past decisions need to be revisited to build a single coherent solution. In this article, after stepping back and attempting to discover the various variant mechanisms, we found that beyond the well defined sum-type there’s also parametric, sub-type, constrained, open, scoped, dependent and predicate variant mechanisms. And while that may not even cover the full gamut, instead of attempting to understand them all the rest of the article has attempted to understand tagged and untagged variants.

The result, where many schema systems have chosen one, the somewhat surprising outcome is that both type choice and labelled choice are useful. This is not because they’re variants of the same thing wearing different syntax. Labels carry domain meaning without forcing new type definitions, while types carry structural identity that labels alone cannot provide. The proto-schema can maintain both because both situations occur in real data.

While the naming conventions are not fully pinned down, I’m thinking of the following:

* **Union** \- The unlabelled sum type where variants are a fixed list of referenced types. The variant is selected based on type-tag discrimination or as a fallback through structural discrimination as discussed earlier.  
* **Tagged** \- The labelled sum type where the variants are a fixed list of labelled reference types. Discrimination is via label and sub-types are selected based on type label tagging.

Naming is hard, so if you’ve got better names, let me know.

There’s still more to discover about choice and the variant mechanisms in schema systems. As such this topic is to be split into at least two articles. It will be interesting to see what will be discovered in the at least seven other variant mechanisms still to be investigated. For now, the proto-schema’s structural vocabulary now stands as follows. A proto-schema is a group of immutable definitions where each definition has a type name and a structure:

* **Choice (Sum)** \- one of these options  
  * Union \- Unlabelled fixed set of variants.  
  * Tagged \- Labelled fixed set of variants.  
  * TBD \- Other choice types.  
* **Sequence (Product)** \- this followed by that  
  * Tuple \- Fixed-length sequence of specified types.  
  * Record \- Fixed-length sequence of named values.  
  * Array \- Variable length sequence of a type.  
  * Map \- Variable length of Key/value pairs of specified types.  
  * Set \- Sub-type of Array. Unordered, no duplicates. Foundation for Enum types.  
* **Multiplicity** \- how many times  
* **Naming** \- giving definitions names for reuse  
* **SuperTypes and SubTypes** \- bidirectional relationships between types

The proto-schema needs to be generated by a preprocessor that can resolve and create the schema definitions which include:

* **Templates** \- definitions with blanks that produce concrete types when filled  
* **Structural Composition** \- combining existing definitions via inclusion  
* **Choice Normalisation** \- choices are normalised into their own type definitions.

Stay tuned for Part 8, where the next core concept of Multiplicity is explored. The continuation of choice, “one of these options”, will be explored in later articles.

