# Built-in type vocabulary — full contracts

Source: TSON Part 1 §5 and §7.6 (2026 Revision 35). These annotations apply **only in schemaless processing**. Under a `!!schema`, every `!name` resolves through the schema's namespace; the core type library (`https://tson.io/2026/35/m/core.tn`) declares types with the same names and the same parsing contracts, so a schema that imports core gives its data documents this vocabulary back.

## The atom parsing model

Each atom owns a *parsing contract*: which token texts it accepts, and what host value results. The contract sees the token's content **after** unquoting and escape processing — quoting is a lexical necessity of the content, not a signal to the atom. Two distinct failure kinds:

- **Resolver error** — the atom's grammar cannot read the token at all (`twelve` under `!int32`, `2025-13-45` under `!date`, an unpadded `!base64`).
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

## Binary atoms

| Annotation | Encoding | Notes |
|---|---|---|
| `!base64` | RFC 4648 §4 | padding `=` **required** |
| `!base64url` | RFC 4648 §5 (`-` `_` alphabet) | padding required |
| `!base32` | RFC 4648 §6 | padding required |
| `!hex` | RFC 4648 §8, either case | even length |

Host value is the decoded byte array. Length not a multiple of the scheme's quantum → resolver error. Non-canonical padding *bits* may be rejected (implementation's choice). Quote binary values — `=` and `/` are outside the unquoted profile anyway, and `-`/`_` content in base64url can look like a name.

## Temporal atoms

| Annotation | Format | Quote? |
|---|---|---|
| `!date` | RFC 3339 `full-date`: `2026-07-01` | no |
| `!time` | RFC 3339 `full-time`: `14:30:00Z`, `14:30:00.250+08:00` — offset mandatory, `Z` or `±HH:MM` | yes |
| `!datetime` | RFC 3339 `date-time`: `2026-07-01T14:30:00Z` — the `T` and the offset are mandatory | yes |
| `!duration` | ISO 8601 `PnYnMnDTnHnMnS`: `P1Y2M`, `PT36H`, `P3DT4H5M6.5S` | no (colon alternative forms like `PT12:30:00` need quotes) |

A token that does not match the format is a resolver error. There is no timezone facet and no "local time without offset" — RFC 3339 makes the offset mandatory, so `2026-07-01T14:30:00` (no offset) is rejected.

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

There is no `!binary`, `!bytes`, `!string`, `!str`, `!int`, `!integer` (as a *built-in*; core declares `integer` for schemas), `!float`, `!double`, `!bool`, `!boolean`, `!timestamp`, `!decimal`, `!url`, `!ip`, `!json`, `!any`, `!null`, `!void`, `!enum`, `!list`, `!array`, `!map`, `!record`. Under a schemaless document any such name is silently preserved as an uninterpreted marker — a processor will not complain, which is exactly why an author should not rely on one.
