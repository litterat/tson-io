---
title: "Proto-schema: Part 8. Multiplicity & Nullability"
series: "proto-schema"
seriesTitle: "Proto-Schema"
part: 8
description: >
  Multiplicity defines the rules of how many values can exist, and while the idea is simple, it has been the source of significant problems in many modern data systems.
originalUrl: "https://litterat.substack.com/p/proto-schema-part-8-multiplicity"
originalDate: 2026-06-04
abstract: >
  Multiplicity defines the rules of how many values can exist, and while the idea is simple, it has been the source of significant problems in many modern data systems. This article dissects the history of "optionality" failures, from the "Zero Value" problem in Protocol Buffers to the meaning of null in JSON. By deconstructing the interaction between the Encoder, the Wire Format, and the Decoder, we derive a rigorous logic table that distinguishes the aims of the programmer from the aims of the schema. The resulting changes to the proto-schema establish solid rules for implementation.
---

# **Proto-schema: Part 8\. Multiplicity & Nullability**

### Part 8 in a series of articles that openly designs and develops a proto-schema that provides the underlying data model for building data format schemas.

**Abstract:** Multiplicity defines the rules of how many values can exist, and while the idea is simple, it has been the source of significant problems in many modern data systems. This article dissects the history of "optionality" failures, from the "Zero Value" problem in Protocol Buffers to the meaning of null in JSON. By deconstructing the interaction between the Encoder, the Wire Format, and the Decoder, we derive a rigorous logic table that distinguishes the aims of the programmer from the aims of the schema. The resulting changes to the proto-schema establish solid rules for implementation.

![](/images/proto-schema/part-8-multiplicity-and-nullability-image35.png)

## **Introduction**

After seven articles on the development of the proto-schema, the shape and structure is emerging. The concepts of Sequences, Choice (Union types), Templates and Structural Composition have all been examined. This article turns the attention to Multiplicity, another of the core capabilities identified in Part 2\.

Multiplicity is the ability to identify how many of something is required; is it exactly one, is it optional or some other combination. In Part 2, the following table showed the various combinations:

**Name					Multiplicity (min..max)**

None					0..0

Required				1..1

Optional				0..1

Zero or more				0..\*

One or more				1..\*

Exactly n				n..n

Bounded (n\<m)			n..m

What looks reasonably simple has been a thorn in the side of many serialization frameworks and very small misunderstandings of semantics can create everything from minor incompatibilities through to major outages. But the main problem is often the semantics of what might seem obvious to the developers, but cause headaches for developers attempting to make what seems simple to work.

The question of multiplicity also brings up the question of none or null (absence of data) and the semantics of it. The interaction between multiplicity and null is important to get right. It doesn’t have to be difficult, but the outcome of the semantics of the proto-schema will need to be opinionated. This will mean clear definitions that should lead to less confusion.

Much of the work for multiplicity has already been done by defining the Array as a type of Sequence in the proto-schema. Allowing an array to optionally specify minItems and maxItems provides control for most multiplicity outcomes including, Zero or more, One or more, Exactly N or Bounded. But what about the other Sequence types; Maps, Tuples and Records. For these, Required versus Optional is the main concern. Before getting into the details, it’s worth seeing how other systems have handled multiplicity.

## **Multiplicity in the wild**

The question of multiplicity breaks down into three main concerns of Collections, Presence and Absence handling. As will become apparent, these seemingly simple decisions about “how many” have led to years of workarounds, breaking changes, and developer frustration across major systems. It’s worth taking a look at the most utilised schemas, JSON Schema, XML Schema, ProtocolBuffers, Apache Thrift, Apache Avro and ASN.1 for some cautionary tales.

This series has so far done a good job of staying away from comparisons to other schema systems and deriving the core elements directly from the physical constraints of serialization. However, at this point it seems worthwhile to look outside. Unfortunately, the “not invented here” syndrome is rife within these frameworks. As you’ll see, nearly every solution has derived their own name for similar concepts. For now, the aim is to past the differences and find the similarities between them.

The main thing that can be found from investigating these other systems is that concepts of multiplicity are either via a core Array type structure (JSON, ASN.1, Avro, Thrift), or a way to indicate that a field has repeated elements (XML, Protobufs). In all cases, the feature provides the Zero or More concept from the Multiplicity table. However, beyond that, allowing further constraints such as One or More, Exactly N, or Bounded is a related but not required feature. To illustrate the point, for each schema system a simple Record will be defined for a SensorReading. The record will contain a required id as a string, an optional label with the default value being “unnamed” and a list of readings of a number with between 2 and 5 readings.

#### **JSON Schema**

In [JSON Schema](https://json-schema.org/) properties are defined in a properties object, and a separate required array lists which must exist. JSON Schema defaults to fields being optional. A field not in the required list can be present or not present in an instance of the object to be valid. A really important nuance here is that “required” means the key is present, not that the key has the expected value.

{  “type”: “object”,

   “properties”: {

     “id”: { “type”: “string” },

     “label”: { “type”: “string”, “default”: “unnamed” },

     “readings”: {

         “type”: “array”,

         “items”: { “type”: “number” },

         “minItems”: 2,

         “maxItems”: 5

      }

     },

  “required”: \[”id”, “readings”\]

}

JSON Schema does include an Array core type. It allows constraining an array through **minItems** and **maxItems** constraints. These are straightforward numeric bounds that do exactly what they say. JSON Schema also supports validation of the values through more complex rules using keywords like contains, minContains and maxCounts; while they are interesting, for now we’ll leave them out for this discussion.

#### **ASN.1**

[ASN.1](https://en.wikipedia.org/wiki/ASN.1) takes the opposite default to JSON Schema, fields in a SEQUENCE (ASN.1’s equivalent of a Record) are required unless explicitly marked with an OPTIONAL or DEFAULT keyword. The DEFAULT keyword both marks the field as optional and provides a value to use when the field is absent. ASN.1 use of its own Interface Definition Language (IDL) means that the presence semantics are visible right where the field is defined rather than in a separate location.

SensorReading ::= SEQUENCE {

    id UTF8String,

    label UTF8String DEFAULT “unnamed”,

    readings SEQUENCE (SIZE(2..5)) OF REAL

}

ASN.1 includes concepts of both Records and Arrays using the keywords of SEQUENCE and SEQUENCE OF or SET OF respectively. Similar to JSON Schema, this separates the concerns more cleanly with an option to set SIZE constraints on SEQUENCE OF and SET OF collections (e.g., **SIZE(1..100)** ).

#### **XML Schema**

[XML Schema](https://www.w3.org/XML/Schema) (XSD) uses numeric cardinality: minOccurs and maxOccurs on elements, both defaulting to 1, which makes elements required by default. An optional element can be created by setting minOccurs to 0 and leaving maxOccurs as the default 1\. XML Attributes use a completely separate mechanism, with “required” or “optional”, and optional as the default. This split between elements and attributes requires two different mental models. Because of the way attributes are implemented, they do not allow repeated elements. Like JSON Schema, XML Schema uses XML as its schema format.

\<xs:complexType name=”SensorReading”\>

   \<xs:sequence\>

      \<xs:element name=”id” type=”xs:string”/\>

      \<xs:element name=”label” type=”xs:string” 

         minOccurs=”0” default=”unnamed”/\>

      \<xs:element name=”readings” type=”xs:decimal” 

         minOccurs=”2” maxOccurs=”5”/\>

   \</xs:sequence\>

\</xs:complexType\>

XML Schema doesn’t have a concept of array like JSON, so combines both concepts of Records and Arrays under what is called a Complex Type. A Complex Type allows elements and attributes. Every element in XML Schema allows the attributes of **minOccurs** and **maxOccurs** for collection multiplicity. These attributes default to 1, making it a required field rather than a collection. Setting **maxOccurs** to “unbounded” makes it an unconstrained collection and is a good example of how data formats and schema systems can combine collections and single value fields into one concept.

#### **Protocol Buffers**

[Protocol Buffers](https://protobuf.dev/) (Protobufs) deserves more attention on this topic because its design decisions have been the most consequential. Protocol buffers like ASN.1 have a specialised Interface Definition Language (IDL). What makes Protobufs interesting is how optional, required and repeated attributes have changed between versions.

message SensorReading {

   required string id \= 1;

   // default is always “” for strings, not configurable

   optional string label \= 2;

   // no native min/max constraint available

   repeated float readings \= 3;

}

Protobuf like XML Schema doesn’t have an inbuilt array concept and instead uses the **repeated** modifier on message fields. Interestingly, Protobufs does not provide any ability to further constrain the number of items of a repeated field.

Proto2 (Protobuf Version 2\) offered three field modifiers; **required**, **optional**, and **repeated**. Unlike the previous schema systems, Proto2 required that you select one of those options, so there was no default setting for a field. In the [Proto2 Language Guide](https://protobuf.dev/programming-guides/proto2/) today, the **required** modifier is listed as “**Do not use**”, and was the cause of numerous problems. This has been [documented](https://buf.build/blog/totw-8-never-use-required) as the “root cause of many outages in Google’s early use of Protobuf”.

Proto3’s (Protobuf Version 3\) solution was to remove both **required** and **optional** modifiers, making all scalar fields implicitly optional with zero-value defaults. The rationale for removing the **required** modifier was based on the issue that at Google, having a **required** field creates irreversible schema evolution constraints. Once a field is **required**, it can never be safely removed.

While making a value optional by default, it was the “with zero-value defaults” that caused issues in early versions of Proto3. A bool field set to false became indistinguishable from one never set. An int32 with a 0 value looked identical to an absent field. This “zero-value problem” broke configuration systems, and data pipelines. The problem is clearly documented in the Proto3 Language Guide:

the field is set to the default (zero) value. It will not be serialized to the wire. In fact, you cannot determine whether the default (zero) value was set or parsed from the wire or not provided at all. For more on this subject, see [Field Presence](https://protobuf.dev/programming-guides/field_presence).

Proto3 v3.12 (2020) reintroduced the **optional** keyword, and by 2023, Protobuf Editions made explicit presence the default. The protocol buffers history shows how optionality interacts with the issues of schema evolution and null/unset values. The topic of null will also be covered in this article, while the bigger subject of schema evolution will be left for a future article.

#### **Apache Thrift**

Apache Thrift’s provides a three-level requiredness model, **required**, **optional**, and a default mode called “**opt-in, req-out**“. The default mode always serialised on write but tolerated as absent on read. Apache Thrift also uses its own custom Interface Definition Language (IDL):

struct SensorReading {

   1: required string id,

   2: optional string label \= “unnamed”,

   // no native min/max constraint on list size

   3: required list\<double\> readings,

}

This three-level model has proved [confusing](https://lionet.info/asn1c/blog/2010/07/18/thrift-semantics/) as cross-language behavioural inconsistencies meant the same Thrift struct serialised from C++ and Java could produce different wire data. The [Thrift documentation](https://thrift.apache.org/docs/idl) suggests that the default behaviour is a good starting point, saying:

The desired behaviour is a mix of optional and required, hence the internal name “opt-in, req-out”. Although in theory these fields are supposed to be written (“req-out”), in reality unset fields are not always written. This is especially the case, when the field contains a value, which by definition cannot be transported through thrift. The only way to achieve this is by not writing that field at all, and that’s what most languages do.

#### **Apache Avro**

Finally, let’s take a look at Apache Avro, Avro uses JSON as the format to define its schemas.

{

   “type”: “record”,

   “name”: “SensorReading”,

   “fields”: \[

      { “name”: “id”, “type”: “string” },

      { “name”: “label”, “type”: \[”null”, “string”\], 

        “default”: null },

      { “name”: “readings”, 

        “type”: { “type”: “array”, “items”: “float” } }

   \]

}

An important difference with Avro over other systems is that instead of marking a field optional it has the type of a Choice/Union between “null” and “string”, which promotes “null” to a type. In Avro, the “default” value must match the first type in the union. Since null comes first, the default must be null, not a string value.

#### **Schema Evolution**

The choice between making fields required or optional links back most strongly to the question of schema evolution. A sender relying on an older schema version to a server relying on a new schema version requires that the new server schema must adhere to all previous versions. However, the point of marking a field as required is that the receiver can depend on it being there; the schema carries the guarantee so the software doesn’t have to. But if schema evolution means nothing can safely be required (the Protobuf lesson), then that guarantee moves from the schema into the application code. Every receiver must now defensively check every field, regardless of what the schema says. The schema still describes the shape of data, but no longer makes promises about its completeness. Validation hasn’t disappeared, it has been pushed from a place where it can be declared once to a place where it must be implemented in code and the semantics are hidden.

#### **Clearing values**

The zero-value problem in early Proto3 is a separate but related issue. If a sender sets a boolean to false, and the framework silently drops it because false is the zero value, the receiver cannot distinguish between, “set this value to false”, from “this value is optional and not set”. This matters most in update and patch operations, where the sender needs to say “clear this field”. A message that requires encoding the absence of a value, which is impossible when absence and default are indistinguishable on the wire. For JSON, there’s the JSON Merge Patch ([RFC7386](https://datatracker.ietf.org/doc/html/rfc7386)) and JSON Patch ([RFC6902)](https://datatracker.ietf.org/doc/html/rfc6902) standards as two work around to the problem. What this shows is that this is a problem of how the software communicates absence with the encoder. If a field has a function used by the encoder that checks if the value is present, it does not communicate the third state; that this field needs to be cleared. Encoding every unset field could be highly inefficient when this feature is not required, so potentially instead of **required** and **optional**, there’s a third modifier **patch**, which indicates unset values should always be encoded.

## **A closer look at default values**

Default values in schemas are yet another seemingly innocent feature that can create confusing semantics. If both sender and receiver share the same schema, there is a localised efficiency in not encoding a value that the receiver will fill in anyway. But this optimisation assumes both sides are always in agreement about what the default is, an assumption that could break between versions. In systems where data is being read or interpreted rather than consumed, these implicit default values require the reader to have the full schema in mind to understand what the actual data says.

It’s worth having another look at the various schema systems to see when default values are allowed and their treatment. A closer look reveals that no system places defaults exclusively on required fields, and most either allow them everywhere or sidestep the question entirely.

**System			Defaults on Required 	Defaults on Optional**

ASN.1			No    					No (DEFAULT is its own category)

JSON Schema 	Yes (no effect)			Yes (no effect)

XSD (attributes)	No 						Yes

XSD (elements) 	Yes 						Yes

Avro 			N/A 					N/A

Thrift 			Yes 						Yes  

Protobuf (proto2) 	Yes (but meaningless) 		Yes

Protobuf (proto3) 	N/A   					N/A

ASN.1 sidesteps the question making DEFAULT its own category; DEFAULT fields are implicitly optional, mutually exclusive with both OPTIONAL and REQUIRED settings. JSON Schema allows defaults but they are annotations only and don’t effect runtime behaviour. XSD (XML Schema) has different semantics for attributes and elements. A default value on a required attribute is not allowed, but on elements a default value fills empty elements but not absent ones. In Apache Thrift the behaviour varies by language implementation. For Proto2 a default value on a required field is allowed, but the field must be present, so does not effect encoding. Finally, for Proto3 no custom defaults exist.

Most systems that support defaults allow them on both required and optional fields. Why would there be such variation with how defaults should be handled? The problem is that when a field has a default value, the decoder must handle three possible wire states: a value is present, the field is absent, or the field is present but carries a “no value” sentinel (e.g. null in JSON, or similar). Depending on whether the field is required or optional, the interaction with the default value differs. It’s worth exploring these interactions in detail.

#### **Field Required \+ default**

The field in a record is required and must have a value is a straightforward requirement. But let’s be more specific, a required field is one where the reader of the data must receive a valid value. What happens when a required field also contains a default value in the schema. When data is received, it can contain four possible states:

* VALUE \- a value (either valid or not valid),  
* ABSENT \- the field is completely missing from the record, or  
* NO\_VALUE \- the field is present with a no\_value sentinel (e.g. null in JSON).

Both the absent and no\_value states are unexpected for a required field. However, a default value has also been provided by the schema. The receiver can either treat the field as an error or use the default value, and this is where confusion starts.

For a lenient system, a simplest answer is for the decoder to use the schema default value when the field is missing or has no value. In this solution, the field’s requiredness gives the decoder authority to override the sentinel. The table shows the possibilities.

**Wire					Result**

VALUE (valid)			Use value.

VALUE (invalid)			Error, value is wrong type or has constraint mismatch.

ABSENT 				Field missing, use the default value. 

NO\_VALUE (sentinel)		Field present but value "null", use schema default.

Every row resolves to a value or error. While the no\_value sentinel case could be considered an error, the aim of a required value is that the reader receives a value, so this solution reduces errors by filling in the blanks.

#### **Field Optional \+ default**

The optional field with default value case aligns more closely with other systems, however, both the absent field and no\_value sentinel create higher levels of confusion. The field is allowed to have no value and it has a default. When the decoder sees a no\_value sentinel such as null, there’s two equally valid interpretations. Should the receiver set the field to the default value as in the required case, or given the field is optional, should the field be unset. There is no constraint in the schema that favours one reading over the other.

**Wire 					Result**

VALUE 					Use value

VALUE (invalid) 			Error, value is wrong type or has constraint mismatch

ABSENT 				Use default? Not set?

NO\_VALUE (sentinel) 	Use default? Not set?

Whatever rule the implementation picks is arbitrary, and different implementations will pick differently which is exactly what happened with Thrift’s cross-language inconsistencies.

If the default value is always used, an optional field with a default can never be cleared (clearing is an error, because the field always resolves to a value), always produces a value on the read side, and behaves identically to a required field from the decoder’s perspective. If a field always has a value and can never be absent, calling it “optional” is misleading. It is a required field that is convenient for the producer to omit. ASN.1 recognised this decades ago and made DEFAULT its own keyword, mutually exclusive with both OPTIONAL and REQUIRED.

Ultimately, the proto-schema will need to take a position on default values. However, it should be clear that if the goal for the proto-schema is to predominately target LLM-based pipelines where data is being read, understood, and transformed rather than simply deserialised, having every value explicitly present in the data is more valuable than saving a few bytes. An LLM reading a schema and encountering a field marked “optional” can reason simply: this field might not be there. If some optional fields always have values because of hidden default interactions, the LLM must understand an implicit relationship between two schema properties to predict what will appear in the data. Keeping the model clean, optional should genuinely mean optional, while required means always receives a value, would remove that indirection.

## **The null question**

The question of presence naturally leads to null. What does it mean for a value to be “nothing”? The answer depends on where you ask the question. The schema systems surveyed in this article handle null in four ways: as a value (JSON), as a type (JSON, Avro), as a not present marker (XML Schema), or not at all (Protobuf, Thrift, ASN.1). In all cases, the concept of null is needed to fill a gap that optionality alone can not provide.

JSON Schema illustrates this gap:

{

	“type”: “object”,

	“properties”: {

		“name”: { “type”: \[”string”, “null”\] }

	},

	“required”: \[”name”\]

}

This schema says two things. The **required** array says the key “name” must exist in the object, while the type array says the value can be a “**string or null**”. This breaks the traditional concept of required and optional into two different questions. Does the field need to be present, and can the value be empty. Allowing a field to be present and be null is an important capability that can be used to express that a database field should be set to NULL, or in patch semantics that a field should have any previous value cleared.

XML Schema (XSD) further demonstrates the interaction between optional fields and the need for a “null” sentinel. Where JSON Schema uses type **\[ “string”, “null”\]** to express that a value can be null, XML Schema uses **nillable=”true”**.

\<xs:complexType name=”MyObject”\>

	\<xs:sequence\>

		\<xs:element name=”name” type=”xs:string”

		    nillable=”true”/\>

	\</xs:sequence\>

\</xs:complexType\>

This is the only way of marking that the field needs to be present but allows a null value. XML Schema doesn’t include a “null” type, so an additional method was required. Once again, it separates the question of does the field exist from can the value be null. This is a precise treatment of absence, but the interaction between nillable, minOccurs, and default creates a confusing matrix of behaviours.

Avro also shows another use of null where it has no concept of an optional field at all. Every field is always present in the encoded data. The only way to express “this field might not have a value” is through a union type: **\[”null”, “string”\]**. Optionality is entirely a type-system concept, and every nullable field must be declared as a union with null as a branch.

These different approaches to null handling demonstrate that “required” and “optional” are not enough. The concept of optional splits into two; is the presence of the field optional, or is the value optional. Different systems have taken quite different approaches to achieve the same thing. The next section attempts to untangle the logic to build a clean approach for the proto-schema dealing with required, optional, default values and field presence.

## **A Proto-schema solution (Untangling the logic)**

The survey of other schema systems reveals that every solutions has made implicit decisions about who has authority over encoding, and those hidden decisions are where the confusion lives. In this section, a proto-schema solution is road tested. A core aim for the proto-schema is to create rules that favour LLMs over human writers and readers. To that end, it’s worth being explicit about what decisions exist and who can make them.

There are two actors in any data exchange: the encoder, which translates a program’s data into a serialised format, and the decoder, which translates serialised data back into something a program can use. Between them sits the schema, which both sides share. The encoder needs to resolve differences between the program data it receives and the expectations of the schema, while the decoder needs to resolve differences between the data format, the schema expectations and ensure the data matches the receiving program structure. To understand the nuances the following investigates in detail the main decisions both the encoder and decoder need to make in writing and reading a Record field.

On the null question, the proposed solution takes the position that null is not a type and does not exist in the proto-schema as a concept. A no\_value sentinel is a requirement for data. It is used to mark that a field has no value. For now, the syntax of such a sentinel does not need to be decided; however for simplicity it can be thought of as similar to “null” in JSON

In this solution, a field is required by default and may include a default value. A field can be marked as optional (default values not allowed). Field semantics are:

* **Required, no default** \- The decoder always receives a value. It is an error if the field is not provided with a valid value.  
* **Required, with default** \- The decoder always receives a value, either the explicit value or the default. Both an absent field and a no\_value sentinel receive the default.  
* **Optional** \- the field may be present or absent. Optional values do not allow default values.

**Record level encoding** \- Optional fields that are not set can be skipped or written and by default, the proto-schema does not enforce either encoder behaviour. However, a Record or Map can force nulls to be encoded by setting an includeAbsent flag on the structure or as a runtime property. This is the “patch” semantics mentioned earlier and is important for database rows where some solutions will require unset values to be encoded. This configuration allows a runtime configuration to affect the default behaviour providing flexibility to the implementation, while also allowing the proto-schema to enforce a known behaviour for specific Records or Maps.

**Default value encoding** \- In this proto-schema model, the expected behaviour is that default values are always encoded. However, the solution allows for a runtime to override that allows default values to be skipped during encoding. This would only be relevant for high-performance systems where saving space is more important than being able to comprehend the data without a schema reference.

The solution being tested does not allow default values on optional values. The reasoning is that an optional value with a default value is in effect a required value. As such, the design is aimed at eliminating the error condition where a program attempts to clear an optional field that has a default. That combination does not exist, so the error is prevented structurally rather than caught at runtime.

#### **The encoder’s inputs**

The encoder receives data from the program. For each field it must decide if the value is present, if it should be encoded, skipped or return an error. In this theoretical encoder, every field has two functions:

* isSet() \- returns true when the field has a value.  
* getValue() \- only return a value when isSet() returns true, otherwise an error.

Based on these functions, the program expresses one of two states to the encoder; SET or NOT\_SET.

The encoder also has the schema’s instructions about the field. For this design, the following apply:

* A **required** field must always be written with a value.  
* A **required** field may have a **default value**, which the receiver uses when the field is absent or no\_value sentinel is received. Default values are encoded by default but can be skipped via a runtime setting.  
* An **optional** field is written when it has a value. NOT\_SET optional fields can be written by setting a runtime setting.  
* A record or runtime property **includeAbsent** controls whether absence must be explicitly encoded on the wire.

#### **The encoder’s outputs**

With these rules, the encoder has eight possible combinations of program state and schema configuration. Every combination produces exactly one outcome, there are no ambiguities and no hidden decisions:

**\#	Field		Default		includeAbsent	Program	Result**

1	required 	— 			— 				SET 		WRITE value

2 	required 	— 			— 				NOT\_SET 	ERROR

3 	required 	yes 			— 				SET 		SKIP/WRITE value

4 	required 	yes 			— 				NOT\_SET 	ERROR

5 	optional 	— 			— 				SET 		WRITE value

6 	optional 	— 			— 				NOT\_SET 	SKIP/WRITE 

7 	optional 	— 			force 			SET 		WRITE value

8 	optional 	— 			force 			NOT\_SET 	WRITE no\_value

**Notes**

**Row 3 \-** Skip only when the value from the program is equal to default value and the runtime is configured to skip default values. As discussed, this is a runtime decision, but should be used only in high-performance circumstances where the decoder utilises the schema to fill-in default values.

**Row 4 \-** A required field that returns no value indicates that the program is producing data that does not conform to the schema. The encoder could ignore the program and encode the default value, however, it indicates a program logic error and has the potential to create silent bugs. The program’s obligation to provide a value is unchanged by the existence of a default value.

**Row 6 \-** Skip records only when the runtime configuration allows.

#### **The decoder’s inputs**

The decoder sees three possible states for any field on the wire:

* **VALUE** — key present with a value  
* **NO\_VALUE** — key present with sentinel or null meaning not\_set.  
* **ABSENT** — nothing on the wire

Combined with the schema, the decoder produces nine combinations (ignoring error rows of type mismatches), again with exactly one outcome per row:

**\#	Field		Default 		Wire 			Result**

1	required		 — 			VALUE 			Set Value

2	required 	— 			NO\_VALUE 		ERROR \- missing value

3	required 	— 			ABSENT 		ERROR \- missing value

4	required 	yes 			VALUE 			Set Value

5	required 	yes 			NO\_VALUE 		WARN, Set Default

6	required 	yes 			ABSENT 		Set Default

7	optional 	— 			VALUE 			Set Value

8	optional 	— 			NO\_VALUE 		UnSet

9	optional 	— 			ABSENT 		UnSet

The ***includeAbsent*** property does not appear, as it was purely an encoder concern about when to empty values. Row 5 indicates that the input data is suspicious, possibly hand-coded and includes a no value sentinel where a value should be present, warning instead of creating a hard error allows some leniency. Row 6 is where skipping default values means values are absent from the data.

#### **Round-trip integrity**

A critical test is whether every encoder output decodes back to the original intent. Tracing each non-error encoder row through the decoder:

**Encoder 	Program 	Wire 		Decoder 	Decoded	 Round-trip**

1 			SET 		VALUE 		1 			Set Value 	✓

3 (write) 		SET 		VALUE 		4 			Set Value 	✓

3 (skip) 		SET 		ABSENT 	6 			Set Default 	✓

5 			SET 		VALUE 		7 			Set Value 	✓

6 (write) 		NOT\_SET 	NO\_VALUE 	8 			UnSet 		✓

6 (skip) 		NOT\_SET 	ABSENT 	9 			UnSet 		✓

7 			SET 		VALUE 		7 			Set Value 	✓

8 			NOT\_SET 	NO\_VALUE 	8 			UnSet 		✓

**Row 3 (skip)** is semantically lossless, the only values the encoder can skip are those equal to the default, so the decoder reconstructs the same value.

**Rows 6 (both paths) and 8** all decode to UnSet. The decoder doesn’t distinguish how absence was encoded. Whether the runtime chose to skip or write a sentinel, and whether the schema required it or left it open, the decoded result is the same. The two paths to UnSet in the unannotated case (rows 6 skip and 6 write) confirm that the runtime freedom doesn’t break round-trip integrity.

## **Maps, Tuples, and Arrays**

The proto-schema solution in the previous section provides a very close look at how Record fields behave. These behaviours would show up in other structures as follows:

**Maps** \- A Map contains keys and values where potentially the values can not be set. This means that the includeAbsent behaviour from records is directly transferable. Keys are always required, but a value can be optional. Default values and default value mechanisms are not required for maps.

**Tuples** \- A Tuple is a fixed length Record where each field is accessed by index. Each field in the Tuple is similar to the field in Records. A field is required by default but may be optional. There is no option on a tuple to includeAbsent values as this could misalign the index of each field. Any optional values must use a no\_value sentinel. A default value is not allowed in Tuples as there’s no potential to improve performance by skipping them during encoding.

**Arrays** \- An Array can contain optional values, but must encode using a no\_value sentinel.

## **Conclusion**

The survey of multiplicity across schema systems shows that initially optimising for simplicity by collapsing distinctions requires adding complexity back when real-world use cases demand the lost information. Proto3 removed presence tracking and needed to add it back in. Thrift introduced a third requiredness level that differed across language implementations. JSON Merge Patch appropriated null as a control signal and made it impossible to represent the value it had repurposed. In every case, the root cause was the same, hidden decisions about who has authority over encoding was often initially not made clear.

As indicated in the introduction, the proto-schema needs to take an opinionated stance. As such, the proto-schema takes the position that fields are required by default. This goes against the Protobufs and others that advise optional first. Optionality is the exception and should be marked explicitly. Only a required field may have a default value. Null is not a type in the proto-schema with optionality being expressed by structure alone. The concept of “null” or no value exists in the data alone where a null sentinel should be used.

Whether to encode values that match the default is deliberately excluded from the schema. This should be a rarely used run-time feature for higher-performance systems where compactness matters, skipping default-valued fields saves bytes. In most systems, LLM pipelines or human-readable formats, writing every value explicitly aids comprehension. The receiver should always consult the schema to determine whether an absent field has a default, regardless of what the encoder chose to do.

Whether the receiving application treats “no value” as “not set” (when creating a new object) or “clear this field” (when updating an existing one) is an application-level decision about the operation being performed. The wire format captures what the data is, not what the receiver should do with it.

The proto-schema’s structural vocabulary now stands as follows. A proto-schema is a group of immutable definitions where each definition has a type name and a structure:

* **Choice (Sum)** — one of these options  
  * Union \- Unlabelled fixed set of variants.  
  * Tagged \- Labelled fixed set of variants.  
  * TBD \- Other choice types.  
* **Sequence (Product)** — this followed by that  
  * Tuple — fixed-length sequence of specified types.  
  * Record — fixed-length sequence of named values.  
  * Array — variable-length sequence of a type.  
  * Map — variable-length sequence of key/value pairs of specified types.  
  * Set \- Sub-type of Array. Unordered, no duplicates. Foundation for Enum types.  
* **Multiplicity** — how many times  
  * Record/Tuple fields are required by default.  
  * Record/Tuple fields may be marked as optional.  
  * Only required fields may have a default value. A field with a default always resolves to a value.  
  * Array/Map can have a minItems and optional maxItems.  
  * Null is not a type. A sentinel in the data meaning “no value.”  
  * Tuples always encode “no value” sentinels for unset optional positions.  
  * Records and Maps may opt into **includeAbsent**, requiring all unset fields to be encoded as “no value”. The default is a runtime decision.  
  * Whether to encode values that match the default is a runtime decision, not a schema property.  
* **Naming** — giving definitions names for reuse  
* **SuperTypes and SubTypes** — bidirectional relationships between types

The proto-schema needs to be generated by a preprocessor that can resolve and create the schema definitions which include:

* **Templates** — definitions with blanks that produce concrete types when filled  
* **Structural Composition** — combining existing definitions via inclusion  
* **Choice Normalisation** — choices are normalised into their own type definitions.

There’s still more core subjects to go in this series (Atoms, Annotations, Naming/Substitution) as well as other variant mechanisms and cross-schema/external-data topics that build on the core. Once they’re covered, the bigger subjects of schema evolution and defining the core meta-schema and TSON data format can be explored. From there it will be looking at how the proto-schema and schemas interact with programming languages and core issues with implementation.

