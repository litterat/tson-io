---
title: "A Deep Dive into JSON: Part 7. Annotations"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 7
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-7-annotations"
originalDate: 2025-08-25
abstract: >
  JSON doesn’t allow comments and has nothing like XML’s attributes. This article goes beyond JSON’s capabilities and explores the attribute & annotation structural primitive previously identified. It investigates the history and concepts around annotations before investigating a “what-if” scenario that expands JSON to include a syntax for annotations. It’s the beginning of a stronger theoretical framework for the creation of a new text format.
---

# **A Deep Dive into JSON: Part 7\. Annotations**

Part 7 in a series of articles that dives into the underlying design of JSON. The result will be ideas and concepts to create a new text format.

**Abstract**: JSON doesn’t allow comments and has nothing like XML’s attributes. This article goes beyond JSON’s capabilities and explores the attribute & annotation structural primitive previously identified. It investigates the history and concepts around annotations before investigating a “what-if” scenario that expands JSON to include a syntax for annotations. It’s the beginning of a stronger theoretical framework for the creation of a new text format.

## **Introduction**

While JSON provides the basic structural primitives for data interchange using compound types of arrays and objects, it offers no native mechanism for comments or metadata that travels with the data. The structural primitive concepts explored in [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects) found that attributes & annotations provide the concept of "sticky notes" for data formats. They allow metadata to be adjacent to, rather than embedded in, the data itself. This article examines the concepts of annotations in both reality and data before investigating how annotations could be added to a JSON-like data format and what benefits they might provide.

## **History**

On [September 9, 1947, Grace Hopper's team](https://lunduke.substack.com/p/the-story-of-the-first-computer-bug) at Harvard discovered a moth trapped in relay 70 of the Harvard Mark II computer. They taped the moth to the logbook with the notation "First actual case of bug being found”. The log entry recorded the failure (the data), but the taped moth and note provided context (the metadata) that transformed a routine maintenance record into computing history. It might not be the origin of either a [software bug](https://lunduke.substack.com/p/the-story-of-the-first-computer-bug) or the concept of [debugging](https://en.wikipedia.org/wiki/Debugging), but it may have been amusing and fitting enough to solidify the terms into the vernacular of computer science.

![](/images/deep-dive-into-json/part-7-annotations-image19.png)

The idea of comments or adding information about something else allows perceiving the object in different ways without modifying the original object. Consider a Ming dynasty vase in a museum. The vase itself doesn't change, but its meaning transforms based on context. In an archaeological exhibit, the label might read: "Excavated 1953, Jingdezhen site, ritual use". In an art exhibit: "Blue and white porcelain, Islamic influence, cobalt from Persia." In a trade exhibit: "Export ware, 40 silver taels value, Dutch East India Company". The same object in three different contexts requires three different types of information to be attached.

Collecting information about objects or things has a long history, often with layers of ideas that can't easily be modelled by software. Provenance records in art, medical patient records and archeological site documentation are a few areas where you'll find layers of records that might contain combinations of structured and unstructured information. While the information collected doesn't change the art, the patient or the archeological objects, they change the perception. The methods of annotations vary wildly from notes in the sidebar of a book through to extensive record keeping with highly structured information.

The ideas of annotations, sticky-notes, and attributes have been around a lot longer than computer science and in many different forms. While JSON provides only two compound types of arrays and objects, it means modelling this real world and making it fit into this structure and annotations do not fit well. Given this, it’s really surprising that we haven't seen this concept more extensively in data formats. However, what it does show is the power of annotation and that better modelling is likely to lead to better data outcomes.

## **Comments**

One area of computer science that is worthwhile looking deeper is comments. [Comments](https://en.wikipedia.org/wiki/Comment_\(computer_programming\)) have been around since the first programming languages were invented. When FORTRAN was released in 1957 and despite programs being stored on expensive punch cards where every punch card cost money and took physical space, developers still included [extensive comments](https://ntrs.nasa.gov/api/citations/19640000265/downloads/19640000265.pdf) (page 63, year 1963):

```fortran
C
C PART 11. COMPUTE GRAVITATIONAL CONSTANTS.
C 1.9866 E+30 = KILOGRAMS/SUN MASS IF ORIGIN BODY HAS AN
C ATMOSPHERE, SET ROTATION RATE AND ATMOSPHERE RADIUS.
C POSITION THE EPHEMERIDES TAPE AT THE BEGINNING OF THE
C CORRECT EPHEMERIS BY MATCHING THE EPHEMERIS NUMBER READ
C FROM TAPE IFILE) WITH THE DESIRED EPHEMERIS NUMER (TFILE).
C
```

When storage was precious and every byte mattered, programmers knew that comments provided important information. Comments like the above might have taken up the multiple [punch card](https://en.wikipedia.org/wiki/Computer_programming_in_the_punched_card_era) (an IBM punch card holds only 80 characters and were used from late 1940s to early 1970s).

Comments are also interesting in that they have also been used by many programming languages to allow adding formal metadata with a syntax that is embedded into the comments themselves. Java and [JavaDoc](https://docs.oracle.com/javase/8/docs/technotes/tools/windows/javadoc.html) is one example among many languages (e.g. [C\# XML Documentation](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags), [Doxygen](https://doxygen.nl/), [TypeScript JSdoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)), that have embedded meaning into comments. Here’s a JavaDoc example:

```java
/**
 * A method that says hello to the user.
 * @param name the user's name
 * @return a greeting string
 * @throws IllegalArgumentException if name is null
 * @deprecated use {@link #greetUser(User)} instead
 */
```

I only recently discovered that [JSON did at first have comments](https://www.youtube.com/watch?v=-C-JoyNuQJs&t=965s) (via this excellent article on [YAML’s complexity](https://ruudvanasseldonk.com/2023/01/11/the-yaml-document-from-hell)), however, Crockford removed them because he noticed people using comments to add controls to the parser. Comments can become this out of band capability to add both structured and unstructured information. For JSON, adding control statements to the parser had the potential to water down the specification and potentially fragment JSON as a standard. Yet, the lack of comments have spurred on others to add back comments and create [JSONC](https://jsonc.org/) (literally JSON with Comments) and [JSON5](https://json5.org/) to name two.

It’s obvious that comments are hugely important and can provide an ability for the format to assist with documentation, metadata and helpful hints to future readers of the program. These various purposes for comments get lumped together in a way that is difficult to pull apart and are disjoint to the programming language itself. While JSON rejected comments, it is clear that there is value in being able to provide an avenue for the various forms of annotations.

## **Structural Primitive**

Before exploring the data side of annotations, I’ll recap what was found in [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects) using the physical beads analogy. Serialization is constrained to a one dimensional series of tokens. As such there’s not many combinations of beads that can be used to create new structures. I’ve only been able to identify seven serialization structural primitives and JSON only supports three. While I recommend reading [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects), here’s the seven primitives in three classifications:

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

This article is only focusing on the annotation primitive which is a type of value augmentation (but could also be considered a structural primitive). An attribute or annotation is the idea that information is added next to the objects to provide additional information but does not change the structure of the object or value itself.

![](/images/deep-dive-into-json/part-7-annotations-image20.png)

Comments in programming languages, and annotations in programming languages are examples of this type of structural primitive. In particular, they provide additional context or information without changing the value or data they are situated near. Adding metadata to a PDF or EXIF data to a JPG are also examples of this type of data. XML attributes are the only example I can find that a flexible data format supports compound types of arrays and structures/objects in addition to attribute support.

## **JSON Annotations**

In [Part 4](/research/deep-dive-into-json/part-4-json-strings), the \!type syntax was explored for adding type information to JSON to support the typing and metadata structural primitive. What follows explores using a similar syntax to add annotations. The @ symbol has been used extensively for metadata and annotations in programming languages and seems to be the natural choice to explore this idea. In addition, the concept of using JSON’s name/value pairs would provide familiarity and an ease of parsing. As far as an example, we could add annotations to JSON and have it look something like:

```
{
  "phone": @deprecated:"Use 'mobile' field after 2025-06-01" "555-0100",
  "mobile": @added:"2024-11-01" "+1-555-0100"
}
```

The structure remains clean and familiar. The underlying JSON data and structure remains:

```json
{
  "phone": "555-0100",
  "mobile": "+1-555-0100"
}
```

The annotations provide context without modification. Different consumers can choose to read specific annotations, or ignore them entirely. This becomes particularly useful when looking at reducing the number of changes in associated data schemas. It is a very important take away from this idea of annotations; annotations allow reducing change of underlying data formats while introducing an ability to augment data. Making changes to data formats is expensive as it requires updating many servers and clients, however, by using annotations the underlying model stays the same. While schemas are for future articles, when schemas and supporting APIs and API data structures this type of control is expected to become invaluable.

Also notice that the @annotation:value concept means that annotation values are themselves just normal values and can contain annotations themselves and is completely recursive. This idea is obviously completely going against JSONs minimalist ideals. Take a moment, what is the initial reaction or gut feel you have from this concept?

## **Annotation basics**

The concept that is being explored is that these annotations build upon JSON’s data structure to create a flexible method for value augmentation. Here’s some examples that show the syntax with both simple and complex values:

### **Simple Value Annotations**

Annotations can be simple values, for example:

```
{
  "temperature": @unit:"celsius" 23.5,
  "price": @currency:"USD" 99.99,
  "distance": @precision:0.01 42.195
}
```

### **Compound Annotations**

Annotations can also be complex values, for example:

```
{
  "reading": @measurement: {
    "timestamp": "2025-01-15T09:30:00Z",
    "device": "sensor-42",
    "confidence": 0.95
  }
  3.14159
}
```

### **Multiple Annotations**

There could also be multiple annotations on both simple values and objects:

```
{
  "blood_pressure":
    @patient:"12345"
    @measurement: {
      "timestamp": "2025-01-15T09:30:00Z",
      "device": "Omron-HEM-7121"
    }
    @clinical_note:"Patient anxious"
    {
      "systolic": 120,
      "diastolic": 80
    }
}
```

While using the familiar syntax of JSON it provides the sticky-note concept to support a new way to extend data.

## **Multiple chances to augment and filter**

The Ming dynasty vase approach can be applied at both a local and in client-server interactions. In a client server environment, the client could select through parameters which annotations it is interested:

`GET /api/users/123?annotations=modified,deprecated`

The server can then respond with the selected information. From a developer perspective there doesn’t need to be any changes to the code. The requested annotations are passed in as options to the writer, and the writer will filter out any annotations that have not been requested. The response:

```
{
  "id": 123,
  "name": @modified:"2025-01-15" @by:"admin" "Alice",
  "department": "Engineering",
  "phone": @deprecated:"Use 'mobile'" @remove_after:"2025-06-01" "555-0100"
}
```

A line manager who has selected a different set of annotations receives:

```
{
  "id": 123,
  "name": @notes:"Alice is due for a promotion" "Alice",
  "department": @history:[
    { "department": "Sales", "from": "2023-10-10" },
    { "department": "Engineering", "from": "2024-06-10" }
  ] "Engineering",
  "phone": "555-0100"
}
```

Further filtering can be completed by the client parser that can further view the same data without specific annotations. This can be used for developer vs production, or for any number of ways to create views on a core data set.

## **Real world use cases**

Annotations create the third direction (after arrays and objects) that data can be modelled in a JSON like data structure. Like XML attributes, this raises the question of when should something be a field versus an annotation. Like with all new concepts it will take some time to explore, but the following offers some initial ideas.

### **Comments as Annotations**

Comments have many purposes and often themselves end up holding additional syntax. This syntax brings comments and the various forms of meta-data back into the format’s syntax:

```
@documentation:@format:"markdown" @lang:"en" """
## A utility return object
This is a utility method with a mixture of results which will be refactored. *Use
with caution*. The legacy_calculation is here because it found no better place.
"""
{
  "legacy_calculation": @todo:"Refactor after Q1 2025" 2334.423,

  "price_cents": @comment:"Stored as cents to avoid floating point errors" 2999,

  "weird_date_format":
    @internal:"Customer specifically requested this format"
    "2025|01|15"
}
```

This unification allows the comments to be stripped at specific times or provided on request. No additional special parsing rules are required. For instance, it would become a lot easier to parse and find all the TODOs in a data file. The same parser can also find customer documentation. This is the Ming dynasty vase concept of the same data being augmented for different purposes. Internal developer documentation might include TODOs and other internal notes, while external documentation generation can specifically exclude internal information.

The data format above also includes a ‘documentation’ annotation that itself has two annotations (i.e. format is in markdown and language english) and uses multi-line string to provide a comprehensive example of how comments might be replaced with annotations. The idea being explored is that by using annotations there would not be an additional need for a comment syntax such as /\* \*/ or // used in [JSON5](https://spec.json5.org/#comments) or [JSONC](https://jsonc.org/).

### **Code generation**

One of the problems encountered with data schemas is that they often need code to be generated in different languages. Building a pure data schema that has all the information required for all languages is an impossible task. By allowing annotations on the schema, specific annotations for each language can be added. When a code generator reads the schema to build a Java client it reads the Java specific annotations, and Python specific annotations when generating the Python client. Being able to bring those different annotations into the same schema allows the base schema to be clean while capturing the required differences. Schemas are a topic for future articles, but you might expect this to feature heavily then. 🙂

### **Keeping values simple**

In many data format designs you might start with a simple string field, then realise you need to track "just one more thing" about it. This would traditionally force you to convert the entire field to an object structure and update all consumers. Annotations let you keep the simple case simple while elegantly handling the complex cases. For example, consider the following:

```
{
  "config_file": "/etc/app/config.json",

  "upload":
    @size:2048576
    @checksum:"sha256:abc123..."
    @mime_type:"image/jpeg"
    "/uploads/user_photos/avatar_123.jpg"
}
```

The upload field started off being just the string. Then a new requirement means 10% of requests require the mime\_type, size and checksum. Turning the simple type into a complex type for 10% of the use cases would cause expensive downstream changes. Annotations would allow providing a fix while managing the longer term changes.

### **Database Relations**

Database normalisation principles encourage separating core entity data from optional or related information through secondary tables connected via foreign keys. Rather than creating sparse main tables filled with nullable columns, well-designed schemas use relationship tables to store optional attributes, audit information, and many-to-many associations. This approach reduces storage overhead and maintains data integrity, but creates a challenge when serializing to JSON: how do you include this relational context without flattening the normalised structure back into a denormalised object with numerous optional fields?

Annotations solve this by allowing new relationships to be added as they evolve without modifying the core entity structure. Consider an e-commerce system that initially had a simple product design, but over time required additional features that traditionally would force denormalisation or breaking changes. The original product API might have looked like:

```json
{
  "product": {
    "id": 12345,
    "name": "Wireless Headphones",
    "price": 199.99,
    "category": "Electronics",
    "stock": 15
  }
}
```

When there’s a later request for a “promotions feature”, the traditional approach would either add optional fields like discount\_percentage, promotion\_expires, campaign\_name to the core product table (creating sparse, wide tables), or require API versioning with breaking changes. With annotations, the new relationship can be layered on without touching the existing structure:

```
{
  "product":
    @active_promotions: [{
      "percentage": 15,
      "expires": "2025-02-01",
      "campaign": "Winter Sale"
    }]
    {
      "id": 12345,
      "name": "Wireless Headphones",
      "price": 199.99,
      "category": "Electronics",
      "stock": 15
    }
}
```

Legacy clients continue to receive and parse the core product data exactly as before, completely ignoring the promotion annotation. Promotion-aware clients can read the @active\_promotions data and apply discount logic. The database maintains its normalised structure with a separate active\_promotions table, while the API evolution happens without breaking existing integrations or requiring schema migrations of the core entities.

### **Other uses**

These are just a few examples that I’ve explored while preparing this article. Other potential use cases might include adding audit trails or data lineage information. Instead of adding this as optional fields and extending the main data object they become annotations that can be requested and added when required. Multi-language support is another area that is always difficult, the ability to add one or more annotations that provide a field in another language can be easily added without change to the core data format.

## **Not Annotations**

Adding a new feature like annotations gives rise to other ideas and other potential use cases. The aim is that annotations are just data and do not affect the parsing or modify the data itself. So from this view, they would not be intended for:

* **Computation** (e.g. @formula:"price \* quantity"): Adding computation of any kind to a data format is the slippery slope into a full programming language.  
* **Transformation** (e.g. @transform:"uppercase"): Similar to computation, adding things like uppercase, concatenation or other data manipulation should belong outside the data format.  
* **Schema Properties** (e.g. “age”: @min:0 @max:120 55): Schemas are a different subject for the future, but this suggests the data parser would need to interpret the annotations. Annotations are not intended to be used for schema properties.  
* **Type information** (e.g. @type:myType { … } ): Adding type information into the annotation system conflates the one syntax for two purposes. Type information does affect the parser and would require special annotations. As explored in [Part 4](/research/deep-dive-into-json/part-4-json-strings), \!type style syntax is more likely for adding type details.

## **Conclusion**

The concept of annotations, sticky-notes, comments and metadata have been around in various forms in software development for a long time. However, in structured data formats it is usually expected to fit all data within the structure of records/objects and lists/arrays like JSON. While many programming languages and data formats put comments and associated metadata outside the main format or programming language, in this article I’ve explored bringing them into the main format in a consistent manner.

A potential criticism of this idea is that annotations could be added as just another “annotations” field to objects, or that adding new fields to objects doesn’t affect old clients. While true, by bringing annotations into the format as a first-class syntax, it creates consistency in tooling and in data in a way that the previous solutions would not. Combining annotations with the various other ideas previously explored has the potential to provide a more expressive data format that allows engineers to have more flexibility while still reducing change in underlying data structures.

Part 8 will explore references & structural composition, the last of the structural primitives. Similar to this article it will look at the potential for a new syntax to be added to a JSON like data format. It will also be the final data format building block article; at that point I’m sure I will have left every stone turned.

