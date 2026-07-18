---
title: "Proto-schema: Part 2. What is a Schema?"
series: "proto-schema"
seriesTitle: "Proto-Schema"
part: 2
description: >
  Starting from the physical constraints of serialization, this article derives the fundamental concepts needed to describe valid data configurations: choice, sequence, multiplicity, and naming. These primitives appear independently across formal grammars and schema languages.
originalUrl: "https://litterat.substack.com/p/proto-schema-part-2-what-is-a-schema"
originalDate: 2026-03-04
abstract: >
  Starting from the physical constraints of serialization, this article derives the fundamental concepts needed to describe valid data configurations: choice, sequence, multiplicity, and naming. These primitives appear independently across formal grammars and schema languages. The article explores why schemas matter and how the proto-schema’s aim is to transcend the limitations of any particular data format.
---

# **Proto-schema: Part 2\. What is a Schema?**

### Part 2 in a series of articles that openly designs and develops a proto-schema that provides the underlying data model for building data format schemas.

**Abstract:** Starting from the physical constraints of serialization, this article derives the fundamental concepts needed to describe valid data configurations: choice, sequence, multiplicity, and naming. These primitives appear independently across formal grammars and schema languages. The article explores why schemas matter and how the proto-schema’s aim is to transcend the limitations of any particular data format.

![](/images/proto-schema/part-2-what-is-a-schema-image2.png)

## **Introduction**

In this series the aim is to investigate the concepts underlying meta-schemas in an attempt to build a proto-schema, a data model to develop both meta-schemas and schemas. [Part 1](/research/proto-schema/part-1-a-theoretical-model-for-data-schemas) of the series provided a high level overview of the relationship between data, schemas, meta-schemas, proto-schemas and the underlying structural primitives that are found in all data formats. In this article, the focus is investigating from first principles the basic properties of schemas.

## **Beads on Twine**

In [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects) of the “Deep Dive into JSON” series, I introduced the idea of beads on twine as an analogy for serialized data. The beads on twine idea mimics the physical constraints of serialized data perfectly. Just like serialization, this analogy is:

1. **Linear** \- Information is arranged in a single dimension.  
2. **Immutable** \- Once written, the serialized form is static.  
3. **Finite** \- A serialized document has a definite beginning and end.  
4. **Divisible** \- The stream consists of atoms (bytes, characters, tokens, numbers, strings). At some level, you reach values that cannot be subdivided further.

We’ll use this analogy a lot in the coming series, so it’s worth looking a little bit deeper into the properties. For example, a blank series of beads looks as follows:

![five blank beads of the same shape in series on twine. \[ bead - bead - bead - bead - bead \]][image3]

Five beads of the same shape and size on twine

For a start, it’s worth noting that the same physical properties are present in programming language code, text documents and physical memory. So along the way, we expect to pull in and see similarities with how programming languages specify grammar (Backus Naur Form BNF), language dictionaries work (every word is defined and referenceable), and mathematical proof systems. But let’s not jump ahead just yet; what makes these systems similar?

### **Specifications from first principles**

In the first image of five beads we have one and only one configuration of five beads on twine. The only bead we’ve used is a square with the same colour; but what if we had a choice of beads (red,green,blue) and a piece of twine that will hold five beads. We start with five beads of each colour, so that allows 3x3x3x3x3 \= 243 possible combinations. This idea has different names in different domains. In mathematics it could be described as the cardinality, in type theory it’s the value space and in physics/automa it’s the configuration space, we’ll use the name value space. Imagine then there was a choice of fifty beads and the twine fit 100 beads; that’s 50x50x50…100 times. As you can imagine it doesn’t take long for the value space to grow quickly.

![](/images/proto-schema/part-2-what-is-a-schema-image4.png)

An empty twine with three beads in the colours of red, green and blue.

Using the original five beads value space, let’s define our very first specification; I’d like a bracelet with the combination of beads as blue-green-green-red-blue. This is a very specific specification, the bracelet shown below fits exactly one of the possible 243 combinations.

![](/images/proto-schema/part-2-what-is-a-schema-image5.png)

A picture of twine with five beads. The beads are ordered blue, green, green, red, blue.

In schemas and programming language grammars the idea we’re trying to achieve is to develop specifications that will limit what are valid combinations to a limit which is smaller than the total value space. An example of a specification like that might be; I’d like a bracelet that starts and ends with a blue bead and the middle beads can be green or red. For this specification the possible combinations are 1x2x2x2x1 \= 8\. In this case there’s 8 of the possible 243 value space that we consider as valid. You’ll also notice that the first very specific specification above is also a valid combination of this new specification.

The two English specifications we provided are great for human readers, but are difficult to understand or perform any formal analysis. Our aim with a schema is to capture the various ideas we use to describe these specifications in a formal way. So let’s see if we can capture a few of those ideas:

1. **Choice (Sum type)**: In the second specification, the middle beads can either be green or red. More formally, we say that the middle beads are from the set of { green | red }. While in mathematics we might denote the set as { green, red } using a comma between items, in type systems a pipe “|” is often used. This idea is more formalised as a Sum type (as a simple enumeration) in algebraic data type theory.  
2. **Sequence (Product type)**: In both specifications, it was made clear that something was to follow the previous bead. In mathematics this is called a cartesian product. Using sets and cartesian product we could specify the second specification as: { blue } x { green, red } x { green, red } x { green, red } x { blue }. This idea is also more formalised in algebraic data type theory as a product type; more on that one later.

With just these concepts of choice and sequence, we can already start to formalise specifications in a way that can be understood by software and humans alike. Another way to think about these two ideas is that of a simple question, what comes next? It’s either the end or one of the red, green or blue beads. But this way of describing what comes next is restrictive and tedious as the specification gets larger. What other descriptions could you add to these two ideas? Here’s a few:

3. Optional: We could provide a specification like, the bracelet must start with blue and then optionally a green one then red, red, blue. This specification would only allow two different outcomes, a bracelet that is blue, red, red, blue (only four beads) or a bracelet that is blue, green, red, red, blue.  
4. Zero or more: Another concept is zero or more of the same thing. We could potentially rewrite the second specification as, blue then one or more green or red followed by blue. If you’re paying attention, you’ll recognise that it would be a different specification. It could produce a bracelet that was “blue-blue” with only two beads. This is another one to look at a bit closer later.  
5. One or more: Similar to the above, it is more often than not that we might require one or more of an item rather than zero or more, so this could also be a useful way of specifying a desired outcome.

You might notice that these three are all basically the same thing; they specify how many of something is desired. While the initial specifications always required one, these allow more flexibility in the specifications. In UML this idea is referred to as Multiplicity. Here’s all the possible combinations:

**Name Multiplicity (min..max)**

Required 1..1

Optional 0..1

Zero or more 0..\*

One or more 1..\*

Exactly n n..n

Bounded (n\<m) n..m

A potential issue with unbounded multiplicity like ‘zero or more’ is that it could produce sequences longer than our twine can hold (which we say is five). For now we’ll trust our specifications stay within physical limits, but this tension between what a specification can express and what the medium can accommodate is something we’ll return later.

Before moving on, there’s just one more idea that’s worth pointing out. In our specifications we refer to Red, Green and Blue as the names we’ve given to the specific beads. These are the tokens that can’t be subdivided any further. They are not really defined anywhere and the specification doesn’t say what shaped red bead. If we really wanted to be more specific, our specification might start with, using red beads of part number 23AZ3 from manufacturer XYZ and so-on for the other beads and twine. That way we can be very clear about what we’re getting. In schemas the beads are data types like Boolean, Integer or something else, so being clear about the range of an integer is something we’ll want to consider later.

Can it be? There’s only three basic concepts for our beads on twine specifications; choice, product and multiplicity? Can you think of any others, let us know in the comments?

## **Why should we bother with a schema?**

At this point, we’ve observed that our beads have physical constraints just like serialized data in JSON or other data formats. We’ve also found that we can constrain the outcome of what bracelets we create by writing specifications. It turns out that due to the physical constraints of bracelets (linear, immutable, finite and divisible) there’s only so many methods to describe those constraints. But why make a specification in the first place, how does it get used? Let’s use a simple story to illustrate the usefulness of specifications:

Ruth is preparing a fun activity for her company employees. There’s 100 staff attending and she has the idea that they’ll all make their own bracelet, but they must be in company colours and only certain combinations are allowed. Each person’s bracelet can be between 10 and 30 beads and must meet the specification: blue then up to ten green | red then a blue then up to ten green | red then a blue and then up to ten green | red then a blue. Ruth will be checking to make sure everyone’s bracelet matches the specification and any that don’t match will be thrown in the bin.

This simple story is what specifications are all about. There’s three things to notice:

1. **Creator**: There’s 100 staff that are all given the same specification and they will all be creating a bracelet themselves. The specification lets them know what they should do and what are acceptable bracelets. There’s also the threat that if they don’t do it right their bracelet will be thrown in the bin\! For software development this role is the developers that write software that create data files.  
2. **The bracelet**: Each staff member creates their own bracelet. It should have between 10 and 30 beads in the company colours. Once it’s created it is immutable and can’t be changed. Similarly, in software development, you can write over a file once it’s written but it can’t be changed while it gets sent to another server or system.  
3. **The validator**: Ruth acts as the validator. She’ll check the length, make sure it’s only using company acceptable beads and it meets the specification. If it fails any of the quality control it gets thrown out. For any software that receives a data file it should be running plenty of validation before trusting it can use the information.

Specifications become an important artifact within themselves. They assist with:

**Communication at scale** — Ruth didn’t talk to 100 people individually. The specification is the communication. When systems multiply, the schema becomes the only practical way to coordinate. It’s a broadcast mechanism.

**Contract between strangers** — The creator and validator don’t need to know each other. A system in Tokyo can produce data that a system in London validates, years later, having never communicated directly. The schema is the intermediary.

**Tooling enablement** — From a formal schema you can generate: validators automatically, editor autocomplete, sample data for testing, documentation, even code (classes, types, parsers). Ruth could potentially generate a “bracelet checking machine” from her specification rather than checking by hand. John the crazy engineer (there’s always one right) could build a robot to create random bracelets.

**Evolution reasoning** — Next year Ruth wants to allow purple beads. With a formal schema she can ask: will last year’s bracelets still be valid? Will this year’s instructions work for people who kept last year’s?

Generally, as the number of participants or size of the systems increase and what is valid changes throughout different versions, the specification becomes more and more important.

## **Grammar, Production Rules and Terminals**

Did you notice Ruth’s specification? It was a bit clunky. The phrase “then up to ten green | red then a blue” was mentioned three times. There’s just one more concept that is really required; it would be useful to give parts of the specification a name so we don’t need to repeat it over and over. We could call the phrase “then up to ten green | red then a blue” a GreenRedSegment. Then Ruth’s specification would be a Bracelet is a blue bead followed by three GreenRedSegment. A GreenRedSegment is up to ten green | red then a blue. Ruth could formalise this with two rules:

```
Bracelet: blue × GreenRedSegment x GreenRedSegment x GreenRedSegment
GreenRedSegment: { green | red } [0..10] × blue
```

But remember that with all good ideas comes another problem that we should acknowledge. Ruth has been able to reduce her specification down to two very compact lines of mathematical precision, but it requires something new. Everyone that reads this description must learn and understand the formal description. What if there’s ambiguity or they miss-interpret the notation. This is an important element of schema design, but as we saw above, there’s so many advantages to a compact formal notation, the new knowledge most of the time outweighs the disadvantages.

At this point, we’ve got the basics. It shouldn’t surprise you that these ideas have been around for a very long time\! It was John Backus that in 1958 published in the Proceedings of the 1st International Conference on Information Processing (UNESCO, Paris 15-20 June 1959\) his paper on [Backus-Syntax and Semantics of Proposed IAL](https://www.softwarepreservation.org/projects/ALGOL/paper/Backus-Syntax_and_Semantics_of_Proposed_IAL.pdf). This paper describes what we now understand as [Backus-Naur Form](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form) syntax and is used to describe Algol 58 in a formal way. Backus called these metalinguistic formulas and they haven’t changed that much since first published; here’s the syntax for integers and numbers presented in the paper (take note, it looks like his keyboard didn’t support \< \> or \[ \] at the time):

![](/images/proto-schema/part-2-what-is-a-schema-image6.png)

Image from John Backus 1958 paper showing the definition of Integers and Numbers using his metasyntax for the precursor to Algol 58

The ideas of a [metasyntax](https://en.wikipedia.org/wiki/Metasyntax) and more generally [formal grammars](https://en.wikipedia.org/wiki/Formal_grammar) have been incredibly well studied. The formal specification for our Bracelet above is a formal grammar. It contains:

1. **Naming**: A finite set of rules, each with a name (non-terminal) on the left and a production on the right. Names enable reuse and hierarchy.  
2. **Terminals and Non-terminals**: Productions (the right side of the rule) contain terminals (symbols that don’t expand further — our beads) and non-terminals (references to other rules). Terminals are where expansion stops.  
3. **Closure**: Every non-terminal referenced in a production must have a corresponding rule. A grammar with undefined references is incomplete and cannot be used for validation or generation.

While the syntax for BNF, EBNF, ABNF as well as a multitude of other grammar syntaxes are around, they all contain the same ideas we’ve been able to deduce from exploring the ways of describing beads on twine and the physical limitations of serialization.

## **From Grammars to Schemas**

Grammars and formal languages have been well studied since Backus and Chomsky’s work in the late 1950s. But grammars answer a narrow question: *“Is this a valid sequence of tokens?”* Grammars are used to define programming languages and data formats alike. Here’s the grammar for JSON as an example:

```
json-text ::= ws value ws
value    ::= object | array | string | number | "true" | "false" | "null"
object   ::= "{" ws [ member { ws "," ws member } ] ws "}"
member   ::= string ws ":" ws value
array    ::= "[" ws [ value { ws "," ws value } ] ws "]"
string   ::= '"' *(*(%x20-%x21 / %x23-%x5B / %x5D-%xFF) | escape) '"'
escape   ::= "\" (""\"" / "/" / "b" / "f" / "n" / "r" / "t" / "u" 4HEXDIG)
number   ::= [ "-" ] ( "0" | [ "1"-"9" ] { [ "0"-"9" ] } ) [ "." { [ "0"-"9" ] } ] [ ( "e" | "E" ) [ "+" | "-" ] { [ "0"-"9" ] } ]
ws       ::= * ( %x20 | %x09 | %x0A | %x0D ) ; Space, horizontal tab, line feed, carriage return
```

The JSON grammar above can validate that `{ "lat": -37, "lon": 144 }` is syntactically valid JSON. However, it doesn’t tell you whether that JSON represents a valid Point, whether lat must be an integer, or whether \-37 falls within an acceptable range; this is the role of a schema, here’s a made up schema:

```
PointsOfInterest: Array [ { Point | Circle } ]
Point: Object { "lat" : Latitude, "lon" : Longitude }
Circle: Object { "point": Point, "radius": Integer }
Latitude: Integer( min: -90, max: 90 )
Longitude: Integer( min: -180, max: 180 )
```

A schema has the same rule based structure of grammars and uses both sequence and choice as core concepts, but they go further, schemas combine:

* **Structure** — the shape of the data such as Objects and Arrays.  
* **Constraints** — value ranges, patterns, enumerations

The big difference between a schema and a grammar is that the schema uses the primitives of the underlying data format instead of tokens as its primitives. But note, it’s the grammar that constrains what schemas can express. JSON’s grammar makes choices, arrays are ordered, object keys must be strings, there’s no native distinction between a set and a list. A JSON schema can’t say “this is an unordered set” in a way the format itself understands. It can only document that intent and hope consumers honour it. The schema works within the possibility space the grammar creates.

So, while a schema is constrained by the data format, then the meta-schema is also constrained by the schema. But, there’s something else we’ve noticed, the same data format is constrained by the same physical properties of serialization as the grammars. What if the structures offered by the data format are more restrictive than we’d like, the schema becomes constrained and the meta-schema is limited by the schema. This brings us back to the proto-schema.

A proto-schema therefore needs to recognise the physical constraints of serialization and come up with ways of creating schemas that are not necessarily restricted by constraints of the data format. A proto-schema can decide that there’s a difference between a Tuple and a homogeneous array, but when physically written to a data format such as JSON, the result for both is a JSON array.

## **Conclusion**

Starting from the physical constraints of serialization: linear, immutable, finite, divisible. We’ve found that describing valid configurations of “beads on twine” requires surprisingly few concepts. We can define a proto-schema as a group of definitions where each definition includes a type name and a structure, the structures including:

* **Choice (Sum)** \- one of these options  
* **Sequence (Product)** \- this followed by that  
* **Multiplicity** \- how many times  
* **Naming** \- references to other type names.

These same primitives appear in formal grammars (BNF), algebraic data types, and schema languages; the same concepts arrived at independently from different starting points. This convergence shows that the same concepts are a representation of the physical constraints of linear data structures.

We’ve also seen why schemas matter: they enable communication at scale, contracts between strangers, tooling, and reasoned evolution. And we’ve seen that schemas don’t exist in isolation, they sit within the constraints of the data formats they describe the physical properties of serialization.

This leads to the next article, what are the possible data structures that a schema should be able to describe. In [Part 5](/research/deep-dive-into-json/part-5-arrays-and-objects) of the deep dive into JSON, seven structural primitives that sit within the constraints of the physical properties of serialization were identified. In Part 3 of this series, those structural primitives are revisited with a better understanding of the role of schema and meta-schemas.

