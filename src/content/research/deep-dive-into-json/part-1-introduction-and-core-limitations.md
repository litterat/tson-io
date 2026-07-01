---
title: "A Deep dive into JSON: Part 1. Introduction & Core Limitations"
series: "deep-dive-into-json"
seriesTitle: "A Deep Dive into JSON"
part: 1
description: >
  JSON (JavaScript Object Notation) has become one of the major foundational formats for data interchange across modern software systems. Its simplicity, readability, and compatibility are key to its success, but those same strengths have exposed limitations as JSON is stretched across domains it was...
originalUrl: "https://litterat.substack.com/p/a-deep-dive-into-json-part-1-introduction"
originalDate: 2025-07-08
abstract: >
  JSON (JavaScript Object Notation) has become one of the major foundational formats for data interchange across modern software systems. Its simplicity, readability, and compatibility are key to its success, but those same strengths have exposed limitations as JSON is stretched across domains it was never designed to support. This article begins a series that will go deep (probably ridiculously deep) into every aspect of the JSON data format and investigate its use and application against real world data. By going back to first principles of data and serialization, the aim will be to uncover the gaps, provide new approaches and designs for a new data format.
---

# **A Deep dive into JSON: Part 1\. Introduction & Core Limitations**

**Abstract:** JSON (JavaScript Object Notation) has become one of the major foundational formats for data interchange across modern software systems. Its simplicity, readability, and compatibility are key to its success, but those same strengths have exposed limitations as JSON is stretched across domains it was never designed to support. This article begins a series that will go deep (probably ridiculously deep) into every aspect of the JSON data format and investigate its use and application against real world data. By going back to first principles of data and serialization, the aim will be to uncover the gaps, provide new approaches and designs for a new data format.

## **The Ubiquity of JSON**

JSON, derived from JavaScript's object literal syntax, inherits several of JavaScript's design choices that have shaped its capabilities and limitations. Notably, JSON adopts JavaScript's loose type system, where values are dynamically typed and flexible but often ambiguous. Keys in JSON objects must be strings, reflecting JavaScript's implicit coercion of object keys to string form. Additionally, JSON lacks native support for features like integers with arbitrary precision or explicit typing, which aligns with JavaScript's own number model ([IEEE 754](https://en.wikipedia.org/wiki/IEEE_754) double-precision floating point). These characteristics contributed to JSON's early ease of adoption in browser environments, but they also introduced ambiguity and fragility when applied to stricter domains like financial transactions or scientific computation.

Formalized by Douglas Crockford in around 2001, JSON was pitched as a "[fat-free alternative to XML](https://www.json.org/fatfree.html)" in 2006\. At that time, XML was the de facto choice for data interchange, heavily used in enterprise environments and supported by an expanding ecosystem of standards like XML Schema, SOAP, WSDL, and XSLT. While this standardization offered flexibility and rigor, it also introduced substantial complexity and overhead, leading to criticisms of XML as bloated and overly verbose. This context made JSON's minimalism especially appealing for web developers seeking a lightweight, readable format that could work seamlessly with JavaScript and browser environments. Its meteoric rise stems from being easy to read, easy to parse, and easy to adopt. Today, JSON is entrenched across REST APIs, configuration files, mobile applications, NoSQL databases, and cloud infrastructure.

The format has become the default lingua franca of the web and beyond. JSON is processed in trillions of transactions daily, with nearly every programming language offering native or built-in support. However, its original design goals—simplicity and minimalism—often create cumbersome constraints as software demands evolve.

Data interchange formats, by their very nature, must prioritize stability and broad compatibility. Because they serve as the connective tissue between systems and often sit at the foundation of protocols, APIs, and applications, even minor changes can have far-reaching implications. JSON, now over two decades old, continues to be remarkably stable. With that stability, it is also unlikely that we will ever get a JSON v2, as by its very nature breaks that concept of stability.

Historically, new data formats often emerge not from theoretical design exercises but from the needs of specific projects. JSON itself began as a convenient way to exchange data between browsers and servers in early Ajax applications, only later becoming a standardized format. Similarly, Protocol Buffers, Avro, and other formats were born out of internal needs at companies like Google or Apache and gradually adopted more widely.

JSONs limitations have led to the emergence of other JSON-adjacent text formats that offer specialized improvements. [**JSON5**](https://json5.org/) allows for more relaxed syntax, supporting comments, trailing commas, and unquoted keys, making it more user-friendly in configuration scenarios. [**JSONC**](https://github.com/komkom/jsonc) (JSON with Comments), popularized by Visual Studio Code, similarly allows for in-line comments in JSON documents without breaking parsers that support it. [**Amazon Ion**](https://amazon-ion.github.io/ion-docs/docs/spec.html) introduced a superset of JSON with support for rich data types such as timestamps and decimal numbers, optional schema typing, and binary encoding alongside its textual form. There's also plenty of formats that extend JSON; [JSONNET](https://jsonnet.org/), [EDN-format](https://github.com/edn-format/edn), [HuJSON](https://github.com/tailscale/hujson?tab=readme-ov-file), and [EKON](https://github.com/Himujjal/ekon) to name a few.

These formats exemplify a growing recognition that while JSON's core model is stable and widespread, different domains increasingly require richer data representations. However, none of these extensions has displaced JSON's dominance. Instead, they point to a fragmented ecosystem of specialized tools, each solving a piece of the puzzle without a unified approach. But it is also clear that these improved formats rarely get traction and unfortunately their ideas and concepts don't make it into mainstream usage.

Throughout all of these different formats and changes, it remains rare to see a focused, first-principles exploration of data formats themselves, decoupled from the demands of any one application. This series of articles aims to fill that gap by examining JSON directly, not as an incidental artifact of a larger system, but as a format worth studying and understanding in its own right. By identifying both the assumptions baked into its design and the compromises developers have had to make, we hope to surface deeper insights that can inform future extensions, tools, and idealy an entirely new format.

## **What is JSON**

JSON (JavaScript Object Notation) is a lightweight, text-based format for representing structured data, as defined by [ECMA-404](https://ecma-international.org/publications-and-standards/standards/ecma-404/) and [RFC8259](https://datatracker.ietf.org/doc/html/rfc8259) for representing structured data. It is written using Unicode and is recommended to use UTF8 encoding, however UTF16 and UTF32 are also allowed. It is derived from JavaScript's object literal syntax, but is language-agnostic and supported by virtually all modern programming languages.

At its core, JSON can express the following data types:

* **Booleans**: Represented as true or false, used to indicate binary states.  
* **Numbers**: Represented as integers or floating-point values, though restricted to JavaScript's double-precision floating point (IEEE 754).  
* **Strings**: Enclosed in double quotes, these support Unicode and are commonly used for text, dates, identifiers, or even encoded data.  
* **Arrays**: Ordered collections of values (of any JSON-supported type), useful for lists, sequences, or tuples.  
* **Objects**: Unordered collections of key-value pairs, where keys are strings and values can be any JSON type. This is the primary structure for modeling data entities.  
* **Null**: Represents a null or empty value.

Together, these primitives form the foundation of JSON, allowing developers to model simple and nested data structures. However, as explored in the next sections, these types also introduce ambiguity and limitations when faced with more complex or domain-specific data needs. These limitations usually require encoding values as strings and using other text based standards such as URLs, Base64, UUID, or other formats.

## **Cracks in the Foundation**

Consider the following JSON response from a made-up e-commerce API:

{    
  "unique\_code": "550e8400-e29b-41d4-a716-446655440000",  
  "product\_id": "12345",  
  "name": "Professional Camera",  
  "price": "299.99",  
  "available": true,  
  "categories": \["electronics", "photography", "professional"\],      
  "specifications": {  
    "weight": "1.2",  
    "dimensions": "120x80x60",  
    "battery\_life": "approximately 500 shots"  
  },  
  "images": \[{  
    "url": "https://cdn.example.com/12345\_main.jpg",  
    "thumbnail": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ..."  }\],  
  "created\_at": "2024-12-19T10:30:00.000Z",  
  "last\_updated": "2024-12-19T14:22:15.837Z"

}

While somewhat human-readable and seemingly straightforward, this snippet demonstrates several issues that complicate parsing and data handling.

Strings are used to represent a wide range of value types, such as URLs ([RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986)), dates and timestamps ([RFC 3339](https://datatracker.ietf.org/doc/html/rfc3339)), UUIDs ([RFC 9562](https://datatracker.ietf.org/doc/html/rfc9562)), and base64-encoded binary data ([RFC 3548](https://datatracker.ietf.org/doc/html/rfc3548)). Even enumerated values or internationalized text content must be wrapped in quotes. While this approach offers tremendous flexibility and readability for humans, it also introduces ambiguity. The application must infer the intended meaning of each string, relying on naming conventions or external metadata such as JSON Schema. This makes reliable machine interpretation difficult and introduces parsing complexity that could otherwise be avoided with richer type representations. The flip side of this, is that strings are universal value containers and have the advantage of separating out these other standards and allowing them to be linked later creating building blocks that can be put together by the developer.

The compromise is to shift complexity to the application layer. This simplicity of being human-readable requires that a human be involved with the interpretation of the data. Of course, the limitations and ability to use JSON as a building block combined with other standards is also a strength that will be explored more deeply in later articles.

As LLMs and AI systems increasingly integrate with software development workflows—automating code generation, data ingestion, and system orchestration—the need for more expressive, semantically rich, and type-safe data interchange formats becomes more pressing. These systems must parse, validate, and manipulate data without human interpretation, and formats like JSON often fall short due to their ambiguity, lack of type metadata, and structural limitations.

## **Common Objections to Change**

Efforts to improve JSON often run into well-established objections that reflect the format’s hard-won success and entrenched role in the software ecosystem. One of the most common refrains is that "JSON is fine", a sentiment rooted in its versatility and the vast tooling and knowledge base that surrounds it. For many projects, JSON remains "good enough," and only once teams encounter edge cases, like loss of numeric precision or lack of type safety, do the cracks begin to show. Switching to another format often comes with steep costs: additional dependencies, steeper learning curves, and reduced compatibility with existing infrastructure.

Another critical concern is the need for backward compatibility. JSON is embedded in countless systems, APIs, and libraries, and any attempt to evolve it must be carefully layered to avoid disruption. There’s also a well-founded fear of complexity. XML's downfall was due in part to its sprawling ecosystem of standards and tools, many of which added weight and confusion without clear payoff. These objections are not roadblocks to innovation, but it is recognised that it wouldn’t be developing JSON 2.0, but more likely a new format that builds upon and learns from the strengths and weaknesses of JSON.

It is worth noting that Douglas Crockford, the creator of JSON, has continued to explore the space of data formats in recent years. He has developed a suite of formats and tools under the [Misty](https://mistysystem.com/) distributed programming language, including [Wota](https://www.crockford.com/wota.html), [Nota](https://www.crockford.com/nota.html), and [Kim](https://www.crockford.com/kim.html). These new binary encodings and message formats are designed to address many of the limitations inherent in JSON by introducing stronger typing, compact encoding, and better support for complex structures.

These efforts demonstrate that even JSON's original designer recognizes the need for evolution and refinement. Crockford's recent work also illustrates that new data formats often arise from a desire to correct deep-rooted limitations that were once acceptable trade-offs. As such, data formats deserve focused attention—not merely as incidental utilities of larger systems, but as critical infrastructure worth deliberate design and investigation.

## **Community-Driven Exploration**

This series offers a rare investigation of JSON as a standalone subject: to assess its assumptions, expose its limitations, and explore extensions or alternatives that could better serve today's data-centric software landscape.

This journey will unfold weekly-ish, with Part 2 focusing on number formats (yes, I did say ridiculously deep). The aim is to build a shared understanding of what JSON does well, where it falters, and hopefully discover some potential new solutions or directions for the problems uncovered. If there's enough impetus, the outcomes will inform the design of a new data format.

