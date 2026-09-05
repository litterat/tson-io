# Built-in type vocabulary — full contracts

Source: TSON Part 1 §5 and §7.6 (2026 Revision 35). These annotations apply **only in schemaless processing**. Under a `!!schema`, every `!name` resolves through the schema's namespace; the core type library (`https://tson.io/2026/35/m/core.tn`) declares types with the same names and the same parsing contracts, so a schema that imports core gives its data documents this vocabulary back.

## The atom parsing model

Each atom owns a *parsing contract*: which token texts it accepts, and what host value results. The contract sees the token's content **after** unquoting and escape processing — quoting is a lexical necessity of the content, not a signal to the atom. Two distinct failure kinds:

- **Resolver error** — the atom's grammar cannot read the token at all (`twelve` under `!int32`, `2025-13-45` under `!date`, an unpadded `!bytes`).
- **Validation error** — the token parsed, but the value violates the atom's range (`9999999999` under `!int32`, `10.0.0.0/33` under `!cidr4`).

Only the numeric atoms and the CIDR prefix rules have ranges; every other built-in is a pure format check.

A built-in annotation on a record, map, or array is a **resolver error**. Annotate elements individually.

## Numeric atoms

| Annotation | Grammar forms accepted | Constraint | Host value |
|---|---|---|---|
| `!int8` … `!int256` | `integer`, `based-integer` | n-bit two's-complement signed range | n-bit integer |
| `!uint8` … `!uint256` | `integer`, `based-integer` | `0 … 2^n − 1` | n-bit unsigned |
| `!positive_integer` | `integer`, `based-integer` | `> 0` | arbitrary-precision integer |
| `!non_negative_integer` | same | `>= 0` | |
| `!negative_integer` | same | `< 0` | |
| `!non_positive_integer` | same | `<= 0` | |
| `!number` | `integer`, `float` | exact; no `.inf`/`.nan` | exact decimal, digits preserved |
| `!float32` | `integer`, `float`, `hex-float`, `special-value` | rounded to binary32 (ties-to-even) | 32-bit float |
| `!float64` | same | rounded to binary64 | 64-bit float |
| `!rational` | `rational` | denominator nonzero by grammar | rational, not normalised (`"2/4"` round-trips as `2/4`; equals `1/2` in value) |
| `!complex` | `complex`, `float`, `integer` | — | complex number; surface `a+bi` or `a+bj` |

Notes:
- The integer atoms accept signs and bases uniformly: `!uint32 0xFF00_0000`, `!uint32 +10` are fine; `!uint32 -10` parses and then fails the unsigned range (validation error).
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
| `!duration` | elapsed time. RFC 3339 App. A `dur-date` / `dur-time` / `dur-week`, with no `Y` and no month `M`; optional leading `-`; fraction on the seconds component only: `PT36H`, `P3DT4H5M6.5S`, `P2W`, `-PT30M` | no (colon forms like `PT12:30:00` need quotes) |
| `!period` | calendar span. `P` with a `Y` component, an `M` component, or both, and nothing else; optional leading `-`: `P1Y`, `P18M`, `P1Y2M` | no |

A token that does not match the format is a resolver error. There is no timezone facet and no "local time
without offset" — RFC 3339 makes the offset mandatory, so `2026-07-01T14:30:00` is rejected.

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

| Annotation | Contract | Quote? |
|---|---|---|
| `!text` | any token; host value is the text. Exists to assert the string case (`!text "42"`) and to anchor the `text_type` family | as content requires |
| `!uuid` | RFC 9562, 8-4-4-4-12 hex with hyphens | no |
| `!uri` | RFC 3986 | yes if it contains `:`, `/`, `?`, `#`, `%`, `@` |
| `!email` | RFC 5322 `addr-spec` **restricted to `dot-atom "@" dot-atom`** — no quoted local parts (`"a b"@x.com`), no domain literals (`u@[192.0.2.1]`), no comments | yes (`@`) |
| `!ipv4` | dotted quad per RFC 3986 `IPv4address` (`192.0.2.1`; no leading-zero octets, no shorthand) | no |
| `!ipv6` | RFC 4291 §2.2 text form; `::` compression allowed; **no zone id** (`fe80::1%eth0` is rejected) | yes |
| `!cidr4` | `addr/prefix`, prefix 0–32; **host bits must be zero** (`10.0.0.1/8` is a validation error) | yes |
| `!cidr6` | `addr/prefix`, prefix 0–128; host bits zero | yes |
| `!mac` | EUI-48: six hex octets, `aa-bb-cc-dd-ee-ff` or `aa:bb:cc:dd:ee:ff` | colon form yes; hyphen form no |

CIDR prefix out of range or nonzero host bits → validation error. Everything else in this table → resolver error on mismatch.

## What does not exist

There is no `!binary`, `!base64`, `!base64url`, `!base32` or `!hex` — the one binary tag is `!bytes`. Nor `!string`, `!str`, `!int`, `!integer` (as a *built-in*; core declares `integer` for schemas), `!float`, `!double`, `!bool`, `!boolean`, `!timestamp`, `!decimal`, `!url`, `!ip`, `!json`, `!any`, `!null`, `!void`, `!enum`, `!list`, `!array`, `!map`, `!record`. Under a schemaless document any such name is silently preserved as an uninterpreted marker — a processor will not complain, which is exactly why an author should not rely on one.
