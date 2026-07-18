---
title: "Proto-schema: Part 6. Structural Composition"
series: "proto-schema"
seriesTitle: "Proto-Schema"
part: 6
description: >
  This article explores structural composition as the mechanism for building new definitions from existing ones. Using the beads analogy to demonstrate physical constraints and then using the spread operator from the earlier JSON series, the operations of inclusion, override, and removal are examined.
originalUrl: "https://litterat.substack.com/p/proto-schema-part-6-structural-composition"
originalDate: 2026-04-01
abstract: >
  This article explores structural composition as the mechanism for building new definitions from existing ones. Using the beads analogy to demonstrate physical constraints and then using the spread operator from the earlier JSON series, the operations of inclusion, override, and removal are examined. The concept of is-a relationships and sub-types demonstrates that types on a spectrum of completeness must follow narrowing rules. These constraints establish that definitions in the proto-schema are immutable, a property that ensures is-a relationships remain valid transitively across both Templates and structural composition.
---

# **Proto-schema: Part 6\. Structural Composition**

### Part 6 in a series of articles that openly designs and develops a proto-schema that provides the underlying data model for building data format schemas.

**Abstract:** This article explores structural composition as the mechanism for building new definitions from existing ones. Using the beads analogy to demonstrate physical constraints and then using the spread operator from the earlier JSON series, the operations of inclusion, override, and removal are examined. The concept of is-a relationships and sub-types demonstrates that types on a spectrum of completeness must follow narrowing rules. These constraints establish that definitions in the proto-schema are immutable, a property that ensures is-a relationships remain valid transitively across both Templates and structural composition.

![](/images/proto-schema/part-6-structural-composition-image27.png)

# **Introduction**

This series has been building up the concepts required to define a proto-schema, the data model that is used to define schemas and the meta-schema below them. The concepts are being developed by investigating the physical constraints of serialized data through the analogy of describing beads on twine to create bracelets. [Part 2](/research/proto-schema/part-2-what-is-a-schema) established the core properties, that a schema is a collection of descriptions, each with a type name and a definition. The definitions include concepts of Choice, Sequence, Multiplicity and Naming. [Part 4](/research/proto-schema/part-4-sequences) derived five Sequence sub-types: Tuple, Record, Array, Map and Set. [Part 5](/research/proto-schema/part-5-templates) introduced Templates as definitions with blanks. One capability that is still missing is the ability to define re-usable definitions that are combined into a new definition. This is structural composition and is the topic of this article.

Where Templates create families of types by leaving blanks to be filled, composition creates new definitions by combining parts of existing ones. Both are tools for reuse, but they operate differently. A Template is a pattern with holes; composition is the act of splicing finished pieces together.

In [Part 8](/research/deep-dive-into-json/part-8-references-and-structural-composition) of the deep dive into JSON series, the spread operator was explored as a way to combine data structures within a JSON-like format. This article revisits that idea through the lens of the beads analogy, to discover what capabilities are interesting and possible when dealing with composition.

## **Splicing Bracelets**

Returning to the beads on twine analogy, imagine you’ve already made two bracelets. The first is a simple pattern of blue, green, green, blue. The second is red, red, green.

![](/images/proto-schema/part-6-structural-composition-image28.png)

Two bracelets: blue-green-green-blue beads and red-red-green beads

Now imagine you want a new bracelet that combines elements from both. You take all four beads from the first bracelet and add them into the second bracelet; the result, blue, green, green, blue, red, red, green.

![](/images/proto-schema/part-6-structural-composition-image29.png)

Combined bracelet: blue-green-green-blue-red-red-green beads

You haven’t changed either original bracelet; they’re still sitting on the table, immutable. You’ve created a new bracelet by selecting and combining pieces from existing ones.

This is the core idea of composition: taking existing definitions and combining them into new definitions. The original definitions remain unchanged. The result is a new, complete definition that can be used independently.

If we focus on the bracelet that was selected to be included into the second bracelet, there’s only a few we might like to include it into the other:

1. **Inclusion** \- Take all the beads from an existing bracelet and include them in the new one without changes. This is as above and is the default.  
2. **Override** \- Include all the beads, but replace specific positions with different beads.  
3. **Removal** \- Remove one or more of the beads before including it into the target.

Technically there’s a fourth, which is to add one or more beads to the bracelet before adding into the second, but that is simply an extra step inclusion into a temporary bracelet type before adding into the second. As Inclusion, Override and Removal are investigated certain rules will need to be created as to when and how they can be used. Not all combinations are valid.

## **Inclusion**

The simplest form of composition is including all elements from one definition in another. In [Part 8](/research/deep-dive-into-json/part-8-references-and-structural-composition) of the JSON series, this was demonstrated using the spread operator. The spread operator is a good choice as it is common in numerous programming languages, including JavaScript /TypeScript where it works with arrays, objects, strings, maps, and sets. Here the spread operator will be used in the slowly evolving schema syntax. Consider two Record definitions:

```
address: { street: !string, city: !string, postcode: !string }
contact: { name: !string, email: !string }
```

A new definition that includes both could be expressed as:

`customerRecord: { ...address, ...contact }`

The result is a new Record with five fields:

`customerRecord: { street: !string, city: !string, postcode: !string, name: !string, email: !string }`

The spread operator (...) takes all the fields from the referenced definition and inserts them into the new definition. The original address and contact definitions are unchanged. The customerRecord is a new, independent definition that happens to have been constructed from existing pieces.

This is different from referencing the type, consider the result without the spread operator:

`customerRecord: { address: !address, contact: !contact }`

The address and contact are now fields of the customer record instead of being copied directly into the new definition. Both are useful modeling techniques. This works naturally with Records because each field has a name that carries over. For Tuples, inclusion concatenates positions:

```
header: ( !uint16, !uint16 )
payload: ( !byte, !byte, !byte, !byte )
packet: ( ...header, ...payload )
```

Resulting in:

`packet: ( !uint16, !uint16, !byte, !byte, !byte, !byte )`

For Arrays, inclusion also concatenates, but this is less useful in schema definitions since Arrays describe a repeating pattern rather than specific positions. Where inclusion works best is in Record and Tuple definitions where the structure is fixed and each position or field carries specific meaning.

In the previous series, the spread operator was used to combine data where an anchor was previously defined. In this series we’re using it to combine type definitions where the reference is a type name from the list of schema definitions. This might be worth exploring in later articles as more technically, each name defined in the schema are anchors, it’s just that in the data, we used a different syntax.

At this point in the series, we’re most interested in the capabilities, rather than diving deep into the syntax or semantics of whether it makes sense to allow array values to spread into a record (hint: it is not). For now, it is more useful to recognise the usefulness of the feature in the proto-schema.

## **Override**

Override builds on inclusion by allowing specific elements to be replaced. This is where composition becomes particularly powerful for schema design. Consider a base configuration:

`baseConfig: { host: !string, port: !integer, debug: !boolean }`

A development configuration that changes one value’s type constraint while keeping the rest:

`devConfig: { ...baseConfig, debug: true }`

The result:

`devConfig: { host: !string, port: !integer, debug: true }`

Here “debug: true” replaces the original “debug: \!boolean” field. In the spectrum of completeness from [Part 5](/research/proto-schema/part-5-templates), the baseConfig had a blank for debug (any boolean), while devConfig filled that blank with a specific value. Override moves a definition further along the spectrum of completeness.

It’s worth being a little clearer on the concept of “override”, in this case we’re not replacing a field name, rather, a value is being added to the previously defined record. As will be shown a little later, true modification of the referenced type is not a good idea and has some undesirable consequences.

Override resolves conflicts by position. For Records, a field name determines position. If the same field name appears in the spread source and in the new definition, the new definition wins. This is a last-write-wins rule applied at the field level:

```
base: { timeout: !integer, retries: !integer, debug: !boolean }
production: { ...base, timeout: 60, debug: false }
development: { ...base, debug: true }
```

Resulting in:

```
production: { timeout: 60, retries: !integer, debug: false }
development: { timeout: !integer, retries: !integer, debug: true }
```

For Tuples, override must work by index position since there are no names. This creates an awkward syntax question. In practice, if you need to override individual positions in a Tuple, it may be a sign that the definition should be a Record instead. The proto-schema should support Tuple override for completeness, but Record override is the common and natural case. When multiple spreads are combined, order matters:

```
defaults: { timeout: 30, retries: 3, debug: false }
overrides: { timeout: 60, ssl: true }
final: { ...defaults, ...overrides }
```

Resulting in:

`final: { timeout: 60, retries: 3, debug: false, ssl: true }`

In this situation we would need to come up with a rule, something like the same last-write-wins rule applied across multiple sources, evaluated left to right. The second spread’s timeout of 60 replaces the first spread’s timeout of 30\. Fields not present in the second spread (retries, debug) are preserved from the first. Fields only in the second spread (ssl) are added. In most cases this seems like a natural way of working, but there’s a bigger question of what is the relationship between the resulting type and the included type.

## **Removal**

The final operation is removal. In [Part 8](/research/deep-dive-into-json/part-8-references-and-structural-composition) of the JSON series, the underscore syntax was used to indicate removal of a field:

```
fullRecord: { id: !integer, name: !string, email: !string, password: !string, internalNotes: !string }
publicRecord: { ...fullRecord, password: _, internalNotes: _ }
```

The resulting publicRecord would have the following fields:

`publicRecord: { id: !integer, name: !string, email: !string }`

The concepts of Inclusion, Override and Removal allow reuse with modification. However, there’s some interesting properties that the proto-schema can take advantage of if it limits what modifications are allowed.

## **Structural Composition and Type Compatibility**

So far, composition has been presented as a construction convenience: a way to avoid retyping fields. But it has a deeper consequence that affects how types relate to each other. Consider the earlier example:

```
address: { street: !string, city: !string, postcode: !string }
contact: { name: !string, email: !string }
customerRecord: { ...address, ...contact }
```

Now imagine an Array of addresses:

`addressList: [ !address ]`

Is a customerRecord a valid entry in this array? The customerRecord has every field that address has, with the same types, plus additional fields from contact. It satisfies every constraint that address imposes. Any code that expects an address and accesses street, city, or postcode will find those fields present and correctly typed in a customerRecord.

This is the principle of [substitutability](https://en.wikipedia.org/wiki/Liskov_substitution_principle): if definition B includes all the fields of definition A (with compatible types), then B can be used wherever A is expected. Inclusion through the spread operator creates this relationship implicitly. A customerRecord is-a address because it was built by including address. It is also is-a contact for the same reason.

The direction matters. Inclusion adds fields, which narrows the definition. A customerRecord is more constrained than an address: it must have five fields where address only requires three. In type theory terms, customerRecord is a subtype of address. You can use a customerRecord wherever an address is expected, but not vice versa. An address alone doesn’t satisfy the constraints of customerRecord because it’s missing name and email.

The is-a and has-a relationship between types and their sub-types is very useful because it allows treating the sub-types as the parent type like in the example above. It’s worth noting that in Object Oriented programming the concept of [Composition over Inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance) is widely discussed. Unfortunately, they use the term Composition for the has-a relationship while I’m using Composition for the is-a relationship. After some deliberation I figured it was worth using Structural Composition for the is-a relationship because it has a wider meaning beyond object-oriented development.

The problem with Removal and some Overrides is that they break the is-a relationship.

```
fullRecord: { id: !integer, name: !string, email: !string, password: !string, internalNotes: !string }
publicRecord: { ...fullRecord, password: _, internalNotes: _ }
```

The publicRecord that now only contains the id, name and email have been removed with the \_ syntax and is no longer a valid fullRecord type. If I was to create:

`records: [ !fullRecord ]`

Unlike the addressList above, which can contain customerRecord values, these records can’t contain the publicRecord type. The other example of Override is more nuanced. Take another look at the following:

```
defaults: { timeout: 30, retries: 3, debug: false }
overrides: { timeout: 60, ssl: true }
final: { ...defaults, ...overrides }
```

It seems to make complete sense that this would be a useful capability, the final result first initiates timeout to the value 30, but then overrides sets the final timeout value to 60\. While it might be a little contrived, having an array of defaults:

`defaultsList: [ !defaults ]`

My expectation would be that all entries in the array would have a timeout value of 30\. However, if a final value was allowed under the is-a relationship, an instance of “final” would break that assertion.

While override and removal might have some utility, at least initially, it is better to be able to rely on the is-a relationship and not allow Removal at all. With Override, the type value needs to narrow. Consider the following:

```
config: { timeout: !integer, retries: !integer, debug: !boolean }
production: { ...config, timeout: !integer( min:0, max:200 ), debug: false }
prodClusterA: { ...production, retries: 3 }
prodA1: { ...production, timeout: 100 }
```

In this case prodA1 continues to hold the is-a relationship with config. Each successive step narrows but continues to hold true to fit the bounds of the previous definition.

There’s an important exclusion to this narrowing rule. Default values can be used and modified at any point in the chain as they are not realised until the resulting record is created. What was previously considered invalid under the narrowing rule can become valid using defaults:

```
config: { timeout: !integer, retries: !integer, debug: !boolean, ssl: !boolean }
defaults: { ...config, timeout: default 30, retries: default 3, debug: default false }
overrides: { ...config, timeout: 60, ssl: true }
final: { ...defaults, ...overrides }
```

The result is a final with the following values:

`final: { timeout: 60, retries: 3, debug: false, ssl: true }`

This shows that it is important to be able to distinguish between fixing a value in the schema versus providing default values for fields. While fixing a value narrows it, a default value does not change the shape of the type. Also notice that even though the definition of *defaults* and *overrides* both include *config*, they both come together in the *final* definition. This creates a diamond structure in the types where both type chains hold true; *final* is-a *overrides* and is-a *config*, but it is also true that *final* is-a *defaults* and is-a *config*.

Open ended Removal and Override could be both convenient in various situations, but it needs to be recognised that it trades type safety for clarity and brevity. The proto-schema excludes it as a core operation for the same reason many languages discourage goto: it’s possible and it occasionally seems convenient, but it makes reasoning about the system’s behaviour significantly harder.

## **Structural Composition and Templates**

Composition and Templates are complementary but distinct. Templates create parameterised definitions with blanks to be filled. Composition combines concrete definitions into new definitions. However, they interact in useful ways. Consider a Template for an API response:

`apiResponse: <T> { status: !integer, data: T, timestamp: !datetime }`

And a set of domain types:

```
user: { id: !integer, name: !string, email: !string }
error: { code: !string, message: !string }
```

Templates produce concrete types:

```
userResponse: !apiResponse { data: !user }
errorResponse: !apiResponse { data: !error }
```

Composition can then extend those concrete types:

`detailedUserResponse: { ...userResponse, metadata: !requestMetadata }`

Here composition and Templates chain together. The userResponse was produced by filling a Template blank. The detailedUserResponse then composes the result, adding a metadata field. The type relationships are clean: detailedUserResponse is-a userResponse, and userResponse is-a apiResponse (with T filled). Each step is resolved in order: Templates first (filling blanks), then composition (combining definitions). The final result is always a concrete definition with no blanks and no spread operators remaining.

This ordering is important. Templates are resolved first because they produce the definitions that composition operates on. Composition is resolved second because it produces the final definitions that schemas use for validation. Both are resolved before any data is validated. They are design-time operations, not runtime operations.

The type compatibility chain also follows the resolution order. If we define:

`responses: [ !apiResponse ]`

Then both userResponse and errorResponse are valid entries because they were produced by filling the Template’s blank, making them members of the apiResponse family (as discussed in [Part 5](/research/proto-schema/part-5-templates)). And detailedUserResponse is also valid because it composed userResponse with additional fields, making it a subtype. The is-a relationships compose transitively: detailedUserResponse is-a userResponse is-a apiResponse.

The examples of Templates and Composition show how important it is that the proto-schema does not allow the is-a relationship to be broken through means like Override and Removal. It also demonstrates that there’s rules behind the concept of a type being on the spectrum of completeness; a type can narrow but not change. Not breaking the is-a relationship becomes a key aspect of the proto-schema that ensures reasoning about a schema can be formally maintained.

## **The Proto-Schema Model**

The examples above have been using the spread operator and template syntax to show how definitions are constructed. But there is a distinction between what the author writes and what the proto-schema stores; the proto-schema is the internal model. The spread operators, template parameters, and composition directives are instructions for how to build definitions. Once resolved, what remains need to be the definitions and the relationships between them. Consider the chain from earlier:

```
config: { timeout: !integer, retries: !integer, debug: !boolean }
production: { ...config, timeout: !integer( min:0, max:200 ), debug: false }
prodClusterA: { ...production, retries: 3 }
```

A schema system needs to be able to read the syntax, resolve the spread operators and validate the schema. The proto-schema model then contains three definitions. Each is a Record with its fields fully expanded without spread operators or template syntax. The proto-schema needs to retain the is-a relationships; a prodClusterA is substitutable for production, which is substitutable for config. Capturing this information ensures that we’re able to enforce when and how types are used and where they can be substituted.

The proto-schema model needs more than a type name and a structure for each definition, it also needs to know its relationships. This can be done by storing both superTypes and subTypes against each definition. The superTypes field records every type that this definition is substitutable for; every type whose constraints it satisfies. The subTypes field records every type that is substitutable for this definition. These are bidirectional lists that need to be created after reading the schema syntax. A lookup in either direction allows for immediate checking, there is no need to scan the dictionary to discover relationships.

This separation clarifies that Templates and Structural Composition are not part of the proto-schema model. They are a preprocessing layer that produces the model. The author writes templates and spread operators; the preprocessor resolves them into definitions with relationships; the model stores the result.

## **Composition is Not Computation**

Another important boundary to maintain is that composition in the proto-schema is purely declarative and fully resolvable at definition time. This distinguishes proto-schema structural composition from computation explored in [Part 8](/research/deep-dive-into-json/part-8-references-and-structural-composition) of the JSON series. In that exploration, the spread operator was applied to data at parse time, combined with references to create new structures, and eventually crossed the line into functional programming territory. The proto-schema will need to deliberately stay on the safe side of that line.

The test is simple: can every composed definition be fully expanded into a standalone definition before any data is processed? If yes, it’s composition. If it requires inspecting data values, resolving runtime references, or performing conditional logic, it’s computation. The proto-schema should permit the former and exclude the latter.

## **Definitions are Immutable**

Through the discussion of is-a relationships and the rules around narrowing were discussed, another important property of the proto-schema has emerged. The definitions of a schema are immutable and cannot change once published and used as the definition of data. The restriction of immutability is a consequence of what the article has already established.

The rules around narrowing via composition require that field values can narrow ranges or become a fixed value, but never remove or change them. That means every definition that extends another is permanently bound by the constraints of its source. If the source could change after the fact, those bindings would be meaningless. A production definition that narrows config is only safe because config is the same definition today as it was when production was written.

This is the same principle operating at different scales. [Part 2](/research/proto-schema/part-2-what-is-a-schema) established that data on twine is immutable; once a bead is placed, it doesn’t change. This idea expands throughout; data cannot modify its schema, and a schema cannot redefine the meta-schema. Now within a single schema, a definition cannot be modified once it exists. Immutability isn’t just a property of data. It runs through every layer. Data is immutable, definitions are immutable, the relationships between them are immutable.

This has a practical consequence for versioning which is a wider topic for a later article. Briefly, it is showing that if a definition needs to change, it must become a new definition. The old definition continues to exist, unchanged, and anything that referenced it must continue to work. A schema establishes the constraint and any data that references the schema once published must conform to it.

## **Conclusion**

Structural Composition provides the mechanism for building complex definitions from simpler ones. Combined with Templates from [Part 5](/research/proto-schema/part-5-templates), composition enables a high degree of reuse without introducing computation or runtime complexity. The concepts of definition immutability and maintaining the transitive properties of is-a relationship across both Templates and Structural Composition become important semantics that will ensure the proto-schema is maintainable and easier to reason about. The idea of data types and values living on a spectrum of completeness and maintaining the is-a relationship means that only narrowing of types should be allowed in the proto-schema.

This article hasn’t explored structural composition through types like Arrays, Maps and Tuples, however, the core principles are in place. The full semantics and valid combinations are details for another day.

With composition in place, the proto-schema’s structural toolkit is nearly complete. A proto-schema is a group of **immutable** definitions where each definition has a type name and a structure. The structures now include the following properties:

* **Choice (Sum)** \- one of these options  
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

Part 7 will explore Choice. In theoretical terms this is the Sum type and answers the question which of these types can follow.
