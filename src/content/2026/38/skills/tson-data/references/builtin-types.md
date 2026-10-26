# Built-in type vocabulary — full contracts

Source: TSON Part 1 §5 and §7.6 (2026 Revision 38). These annotations apply **only in schemaless processing** (a document with no `!!schema`); where a processor reads such a document into a declared host type, an annotation MUST agree with the family that type names. **Any other `!name` in a schemaless document is a resolver error** — the vocabulary is fixed by the revision, so `!uiid` or `!Date` is caught where it is written. Under a `!!schema`, every `!name` resolves through the schema's namespace. Each built-in name denotes the type its **library** declares under that name — the core type library (`https://tson.io/2026/38/m/core.tn`) for most, the network library (`https://tson.io/2026/38/m/net.tn`) for the network rows below — with the same parsing contract, so a document moving under a schema that imports the library keeps its meaning, and a schema that imports core alone has no `ipv4`.

## The atom parsing model

Each atom owns a *parsing contract*: which token texts it accepts, and what host value results. The contract sees the token's content **after** unquoting and escape processing — quoting is a lexical necessity of the content, not a signal to the atom. Two distinct failure kinds:

- **Resolver error** — the atom's grammar cannot read the token at all (`twelve` under `!int32`, `2025-13-45` under `!date`, an unpadded `!bytes`).
- **Validation error** — the token parsed, but the value violates the atom's range (`9999999999` under `!int32`, `10.0.0.0/33` under `!cidr4`).

Value rules belong to the numeric atoms' ranges, the CIDR prefix rules, and the scheme `!uri` and `!iri` require; every other built-in is a pure format check, `!media_type`'s parameters aside (below).

A built-in annotation on a record, map, or array is a **resolver error**. Annotate elements individually.

## Numeric atoms

| Annotation | Grammar forms accepted | Constraint | Host value |
|---|---|---|---|
| `!integer` | `integer`, `based-integer` | none; arbitrary precision | integer |
| `!int8` … `!int256` | `integer`, `based-integer` | n-bit two's-complement signed range | n-bit integer |
| `!uint8` … `!uint256` | `integer`, `based-integer` | `0 … 2^n − 1` | n-bit unsigned |
| `!number` | `integer`, `float` | exact; no `.inf`/`.nan` | exact decimal, digits preserved |
| `!float32` | `integer`, `float`, `hex-float`, `special-value` | rounded to binary32 (ties-to-even) | 32-bit float |
| `!float64` | same | rounded to binary64 | 64-bit float |
| `!rational` | `rational` | denominator nonzero by grammar | rational, not normalised (`"2/4"` round-trips as `2/4`; equals `1/2` in value) |
| `!complex` | `complex`, `float`, `integer` | — | complex number; surface `a+bi` or `a+bj` |

Notes:
- The integer atoms accept signs and bases uniformly: `!uint32 0xFF00_0000`, `!uint32 +10` are fine; `!uint32 -10` parses and then fails the unsigned range (validation error).
- `!integer` is the arbitrary-precision integer every width refines. It asserts the integer case where base resolution would not give it — `!integer "42"` is the integer 42, and `!integer 1.5` is a resolver error — and names the family a host-typed read reads by.
- **A sign bound has no built-in name.** `!positive_integer`, `!non_negative_integer`, `!negative_integer` and `!non_positive_integer` are not in the vocabulary (nor in core): schemaless, each is a resolver error, as any name outside the vocabulary is; under a schema, a bound is a refinement the schema declares for itself (`count => !integer ^ { min: 0 }`).
- `!number` is the exact tier and the JSON-number mapping. A bare JSON number is a `number`. Use `!float32`/`!float64` only when rounding onto an IEEE grid is intended.
- The float atoms accept plain integers, signed zeros (sign preserved), subnormals, `.inf`, `-.inf`, `.infinity`, `.nan`. Every NaN is the canonical quiet NaN — payloads are not preserved.
- `!rational` content always contains `/`, so it is always quoted: `!rational "2/3"`.
- `!complex 3+4i` is expressible unquoted (`+` and `i` are in the profile). Under plain base resolution `3+4i` is a *string*; only the annotation makes it a complex number. Hex floats (`0x1.8p3`) likewise resolve as strings without `!float32`/`!float64`.

### Number grammar (Part 1 §7.6)

```
number          = special-value / based-integer / float / integer
sign            = "+" / "-"
digits          = DIGIT *( ["_"] DIGIT )           ; "_" only between digits
decimal-natural = "0" / ( nonzero-digit *( ["_"] DIGIT ) )   ; no leading zeros
integer         = [sign] decimal-natural
based-integer   = [sign] ( "0x" hex-digits / "0o" octal-digits / "0b" binary-digits )   ; lowercase prefix
float           = [sign] decimal-float
decimal-float   = decimal-natural "." digits [ exponent ]
                / "." digits [ exponent ]
                / decimal-natural exponent
exponent        = ( "e" / "E" ) [sign] digits
special-value   = [sign] ( ".inf" / ".infinity" ) / ".nan"

; extended forms — only via the typed atoms above
rational        = [sign] decimal-natural "/" denominator
hex-float       = [sign] "0x" hex-digits [ "." hex-digits ] hex-exponent
                / [sign] "0x" "." hex-digits hex-exponent
hex-exponent    = ( "p" / "P" ) [sign] digits
complex         = [sign] magnitude sign magnitude imag-unit
                / [sign] magnitude imag-unit
imag-unit       = "i" / "j"
```

Consequences: `5.` is not a number (digits must follow the point); `.5` is; `1_000` is; `1__000` and `_1000` and `1000_` are not; `0x_FF` is not; `007` is not; `1e5` is a float; `+42` equals `42`; non-ASCII digits never match.

## Binary atom

| Annotation | Encoding | Notes |
|---|---|---|
| `!bytes` | RFC 4648 §4 base64 | padding `=` **required** |

`!bytes` is the only binary annotation, and its spelling in this notation is base64. The host value is the
decoded octets. A token that is not valid base64, or whose length is not a multiple of four, is a resolver
error — an implementation MUST NOT accept unpadded input because a host library tolerates it. Rejecting
non-canonical padding *bits* (RFC 4648 §3.5) remains a MAY. Quote binary values: `=` and `/` are outside the
unquoted profile anyway.

**One type, one tag, both classes.** An alphabet is a *spelling* of an octet sequence, not a kind of value,
and a schemaless document has no schema to carry a selector — so one alphabet is fixed for the whole class of
text encodings. Under a schema the same type `bytes` carries an `encoding` selector, and another alphabet is
another *instance* (`hexdigest => !bytes_type { encoding: HEX }`), never a refinement: a spelling narrows
nothing, so `hexdigest ^ bytes` would claim an IS-A no base64 position could honour. Equality, identity and
content addressing are over the octets and never over a spelling.

## Temporal atoms

| Annotation | Format | Quote? |
|---|---|---|
| `!date` | RFC 3339 `full-date`: `2026-07-01` | no |
| `!time` | RFC 3339 `full-time`: `14:30:00Z`, `14:30:00.250+08:00` — offset mandatory, `Z` or `±HH:MM` | yes |
| `!datetime` | RFC 3339 `date-time`: `2026-07-01T14:30:00Z` — the `T` and the offset are mandatory | yes |
| `!duration` | elapsed time. RFC 3339 App. A `dur-date` / `dur-time` / `dur-week`, with no `Y` and no month `M`; optional leading `-`; fraction on the seconds component only: `PT36H`, `P3DT4H5M6.5S`, `P2W`, `-PT30M` | no (the colon form `PT12:30:00` is not admitted) |
| `!period` | calendar span. `P` with a `Y` component, an `M` component, or both, and nothing else; optional leading `-`: `P1Y`, `P18M`, `P1Y2M` | no |

A token that does not match the format is a resolver error, and so is a **leap second**: second 60, which
RFC 3339's grammar admits, is neither a time of day on `[00:00:00, 24:00:00)` nor an instant on the UTC
timeline, so `!time "23:59:60Z"` and `!datetime "2016-12-31T23:59:60Z"` are rejected as hour 25 is. There is no
timezone facet and no "local time without offset" — RFC 3339 makes the offset mandatory, so
`2026-07-01T14:30:00` is rejected.

### `!datetime` and `!time` are instants

A `!datetime` is the instant on the UTC timeline; a `!time` is the time of day in UTC on
`[00:00:00, 24:00:00)`. The mandatory offset is a **spelling**, so `2026-01-01T10:00:00+01:00` and
`2026-01-01T09:00:00Z` are one value, `-00:00` (offset unknown, RFC 3339 §4.3) is the same instant as `Z`, and
`23:30:00-02:00` is `01:30:00Z` — the price of a time with no date. The notation preserves the offset as
written; equality, ordering and bounds compare the instant. A wall clock with no offset, and an appointment
whose zone is data, are other value spaces and not these types.

### One ISO 8601 duration, two atoms

`!duration` is elapsed time — a signed exact decimal number of **seconds**. `!period` is a calendar span — a
signed integer number of **months**. `P1Y2M3DT4H5M6S` is an error under both, and a span that is genuinely
both is a record with a field of each. The split is what makes each totally ordered: a month has no fixed
length beside a second that has one, so the two are two value spaces rather than one partially ordered space.

Three rules the grammar does not carry on its face:

- **The week form stands alone.** RFC 3339 App. A's production is an alternation, `"P" (dur-date / dur-time /
  dur-week)` — so `P1W2D` is not a duration and neither is `P1WT1H`. (ISO 8601-2's relaxation admitting
  `P1W2D` is not adopted.)
- **A week is exactly 7 days and a day exactly 86400 s**, so `P2W`, `P14D` and `PT336H` are one value — and
  the week form belongs to `!duration`, not `!period`, for that reason: it has a fixed length. (`java.time`
  puts weeks on the calendar side; this format does not.)
- **A text encoding emits `PTnHnMnS` and nothing else.** The value is a count of seconds, so a writer cannot
  recover that its input was written in weeks or days: `P3W` round-trips as `PT504H`, `P9DT1H` as `PT217H`.
  `PnW` and `PnD` are reading conveniences, as `0x50` is for an integer — admitted on the way in, gone on the
  way out.

**Fraction and range.** The fraction on a seconds component — RFC 3339's `time-secfrac`, in `full-time`,
`date-time` and `dur-time` alike — is at most **nine digits** (`"." 1*9DIGIT`), so `PT0.0000000001S` is not a
token: no host runtime represents finer than a nanosecond. A `!duration`'s magnitude does not exceed
**2⁶³ − 1 nanoseconds** (about 292 years), stated as a magnitude so that negating an admitted duration yields
an admitted one; a processor MUST reject a value outside it whether or not its own representation could hold
one. A longer span is a `!period`, or a `!number` in the unit a schema names. The ceiling is a value rule and
the floor a lexical one: a seconds count is summed from the `D`, `H`, `M` and `S` components, so `P400000D`
overflows with no single component long enough to catch.

## Text, identifier and network atoms

The **Library** column names the companion artifact whose type the annotation denotes: `core` or `net` (`net.tn`).

| Annotation | Library | Contract | Quote? |
|---|---|---|---|
| `!boolean` | core | the tokens `true` and `false`, case-sensitive; any other token is a validation error (an enum-member violation). The form is not consulted: `!boolean "true"` and `!boolean true` are one value. Core's `boolean`, `!enum [true false]` | no |
| `!text` | core | any token; host value is the text. Exists to assert the string case (`!text "42"`) and to anchor the `text_type` family on which the identifier, URI, IRI, `regex` and `email` families build | as content requires |
| `!uuid` | core | RFC 9562, 8-4-4-4-12 hex with hyphens | no |
| `!uri` | core | RFC 3986 URI (§3): a scheme is **required**; US-ASCII | yes (`:`) |
| `!uri_reference` | core | RFC 3986 URI-reference (§4.1): a URI or a relative reference; US-ASCII | yes if it contains `:`, `/`, `?`, `#`, `%`, `@` |
| `!iri` | core | RFC 3987 IRI (§2.2): a scheme is required; characters beyond US-ASCII written as themselves | yes (`:`) |
| `!iri_reference` | core | RFC 3987 IRI-reference (§2.2): an IRI or a relative reference | as `!uri_reference` |
| `!email` | core | RFC 5322 `addr-spec` **restricted to `dot-atom "@" dot-atom`** — no quoted local parts (`"a b"@x.com`), no domain literals (`u@[192.0.2.1]`), no comments | yes (`@`) |
| `!ipv4` | net | dotted quad per RFC 3986 `IPv4address` (`192.0.2.1`; no leading-zero octets, no shorthand) | no |
| `!ipv6` | net | RFC 4291 §2.2 text form; `::` compression allowed; **no zone id** (`fe80::1%eth0` is rejected); no brackets (`[::1]` is a `!host` spelling) | yes |
| `!cidr4` | net | `addr/prefix`, prefix 0–32; **host bits must be zero** (`10.0.0.1/8` is a validation error) | yes |
| `!cidr6` | net | `addr/prefix`, prefix 0–128; host bits zero | yes |
| `!mac` | net | EUI-48: six hex octets, `aa-bb-cc-dd-ee-ff` or `aa:bb:cc:dd:ee:ff` | colon form yes; hyphen form no |
| `!hostname` | net | a domain name (RFC 5890): LDH labels, A-labels or U-labels, in any mix; ASCII letters in either case; no uppercase beyond ASCII; no trailing dot; the last label not beginning with a digit; each label ≤ 63 octets, the name ≤ 253 in A-label form | no (ASCII and U-label names alike) |
| `!host` | net | a host name, an IPv4 address, or an IPv6 address with or without brackets (RFC 3987 `ihost`, DNS names only); no zone id, no percent-encoding | IPv6 yes |
| `!media_type` | net | an RFC 6838 media type, `type/subtype`, each a `restricted-name` (≤ 127 characters: letters, digits, `! # $ & - ^ _ . +`, starting with a letter or digit); US-ASCII; **no parameters**; no media range (`*/*`, `text/*`) | yes (`/`) |

CIDR prefix out of range or nonzero host bits → validation error. Everything else in this table → resolver error on mismatch, with two more value rules below (a relative reference under `!uri`/`!iri`; parameters under `!media_type`).

Every atom here but `!boolean` is **string-class**: a bare token schemaless is a string, and only the annotation says which atom it is. The same overlap is why, under a schema, `( hostname | ipv4 | ipv6 )` would need a tag on every value — and why `host` is one atom instead.

### URIs and IRIs

RFC 3986 names two productions with two value spaces — a URI, which has a scheme, and a URI-reference, which is
a URI or a relative reference — and RFC 3987 repeats the pair over a wider character set, so there are four
atoms.

| Token | `!uri` | `!uri_reference` | `!iri` | `!iri_reference` |
|---|---|---|---|---|
| `"https://example.com/a?b#c"` | ok | ok | ok | ok |
| `"docs/a.tn"`, `"#top"`, `"/x"` (relative) | **validation error** | ok | **validation error** | ok |
| `"https://例え.jp/パス"` (beyond US-ASCII) | **resolver error** | **resolver error** | ok | ok |

- A relative reference under `!uri` or `!iri` is inside the family's lexical space and outside the atom's
  value space — a **validation error**, as `-1` is under `!uint32`.
- A URI is US-ASCII (RFC 3986 §2): a character beyond it under `!uri` or `!uri_reference` is outside the
  grammar — a **resolver error**. Write `!iri`/`!iri_reference`, or percent-encode the UTF-8 octets. An IRI's
  extra characters are RFC 3987's `ucschar` (and `iprivate` in the query), and an IRI is judged through the URI
  it maps to: with each such character percent-encoded as UTF-8, the text must be a URI-reference.
- The value of all four is the text **as written** — nothing is normalised, no case is folded.
- `uri` IS-A `uri_reference` and `iri` IS-A `iri_reference`; nothing joins the pairs as types, though every
  URI is an IRI.

### Host names, hosts and media types

**`!hostname`** is a domain name. Labels are LDH labels, A-labels or U-labels, in any mix; a U-label is NFC
and IDNA2008-valid (RFC 5892, RFC 5893's bidi rule). The **value is the name**: `Example.COM` and `example.com`
are one value, and so are `xn--bcher-kva.example` and `bücher.example`. The canonical text — what a writer
emits, and the form an identity's host takes — is the lowercase U-label form. Four boundaries, each a resolver
error:

- **uppercase beyond ASCII**: `EXAMPLE.com` is a host name, `BÜCHER.example` is not — write `bücher.example`;
- **a trailing dot**: `example.com.` is rejected;
- **a last label beginning with a digit**: so `10.0.0.1` is never a host name, and `!hostname` and `!ipv4` share
  no value;
- **percent-encoding**, which is URI syntax, not a host name. So is `_` (`a_b.example`): DNS allows it, a host
  name does not.

Under a schema the type carries `allow_idn` (default true); a schema that withdraws it admits only names with no
internationalised label, in either spelling. Look-alike host names (`schemаs.example.com` with a Cyrillic `а`)
are valid: a deployment's allowlist, comparing by name, is what stops them.

**`!host`** is a host name *or* an IP address — RFC 3987's `ihost` profiled to DNS: `!hostname`'s lexical space,
`!ipv4`'s, `!ipv6`'s, plus an IPv6 address in brackets. `"[::1]"` and `"::1"` are one value (the canonical text
is unbracketed); `!ipv6` itself still rejects the brackets. Each member keeps its own equality: a name by name,
an address numerically (`"::1"` = `"0:0:0:0:0:0:0:1"`), and a name never equals an address, nor an IPv4
address its IPv4-mapped IPv6 form. Zone identifiers (`fe80::1%eth0`) and percent-encoding are resolver errors.

**`!media_type`** is an RFC 6838 media type, `type/subtype`, US-ASCII, compared without ASCII case
(`Text/HTML` = `text/html`). The schemaless atom names a media type proper and **admits no parameters** — a
`Content-Type` value such as `"text/html; charset=utf-8"` is rejected (Part 2 §5.5 classes it as the withheld
`allow_parameters` permission, a validation error). A schema position that takes parameters
declares its own instance (`content_type => !media_type_type { allow_parameters: true }`), where parameters
follow RFC 9110 §8.3.1 and the canonical text is `text/html;charset=utf-8`. A media range (`*/*`, `text/*`) is
`Accept`'s pattern, not a media type, and is a resolver error. Media types contain `/` and are always quoted.

## What does not exist

There is no `!binary`, `!base64`, `!base64url`, `!base32` or `!hex` — the one binary tag is `!bytes`. Nor `!string`, `!str`, `!int`, `!positive_integer`, `!non_negative_integer`, `!negative_integer`, `!non_positive_integer`, `!float`, `!double`, `!bool`, `!timestamp`, `!decimal`, `!url`, `!ip`, `!domain`, `!mime`, `!content_type`, `!json`, `!any`, `!null`, `!void`, `!enum`, `!list`, `!array`, `!map`, `!record`. In a schemaless document each is a **resolver error** (Part 1 §3.2): the vocabulary is a property of the revision, not of the deployment, so the rejection is portable, and a diagnostic names the nearest built-in where there is one. A host type a reading application happens to bind is no exception.
