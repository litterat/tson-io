#!/usr/bin/env python3
"""Compute or verify a TSON content pin (?sha256=...) for a .tn document.

TSON Part 1 §2.2.1: the hash input is every byte after the `!!id` line's
terminator (LF, CR LF, CR, NEL, LS or PS). The id line itself, up to and
including its terminator, is excluded so a document can carry its own hash. A
BOM, if present, is stripped first and never hashed. The digest is lowercase
hex, full length. Content-addressed documents must be UTF-8.

Canonical identity is the host's canonical text plus the path; scheme and query
are dropped. The host is a `host` value: a host name in lowercase U-labels
(`bücher.example`), an IPv4 dotted quad, or an IPv6 address in RFC 5952 text,
bracketed. The path is NFC. With no host, the path alone, which must be
absolute (`/local/x.tn`, `file:/local/x.tn` and `file:///local/x.tn` are one
identity).

An `!!id` is written in canonical form only: the host in its canonical text
(no uppercase, no A-labels), the path NFC with characters beyond US-ASCII
written as themselves, no percent-encoded unreserved character, a
percent-encoded reserved character in uppercase hex, no userinfo, port,
dot-segment or fragment, and a query of hash parameters only.

A reference (`!!schema`, `!!meta`, `!!import`, or the argument of
--verify-against) may use any spelling of the same identity -- A-labels, ASCII
case, an uncompressed IPv6 address, a path in its URI spelling with
percent-encoded UTF-8 -- and is read to canonical form before comparison. What
has no IRI form stays an error: a percent-encoding that is not the UTF-8 of an
IRI character, an encoded character that is not NFC, an encoded unreserved one.

This script checks host names by their shape (LDH and U-labels, label and name
lengths, no trailing dot, no digit-initial last label, Punycode round trip); it
does not implement IDNA2008's per-code-point tables (RFC 5892), which a
conforming processor applies on top.

Usage:
  pin.py FILE               print the digest, the identity and the pinned reference
  pin.py FILE --verify      compare the digest with the ?sha256= in the file's own !!id
  pin.py FILE --verify-against 'https://host/x.tn?sha256=...'
                            compare with a reference held by another document
  pin.py FILE --verify-refs [PATH ...]
                            verify the file's own pin, then every pinned !!schema,
                            !!meta and !!import reference it makes, against the
                            documents with that identity found among PATH (files or
                            directories of .tn files; default: the file's directory)
  pin.py FILE --stamp       rewrite the file's !!id line to carry the correct pin
                            (adds or replaces ?sha256=, keeping the rest as written)

Exit status: 0 ok / match, 1 mismatch, 2 usage or malformed input,
3 (--verify-refs) no mismatch, but a pinned reference had no local document to
check against.
"""
import hashlib
import ipaddress
import os
import re
import sys
import unicodedata
from urllib.parse import urlsplit, parse_qsl

ID_RE = re.compile(rb'^!!id:"([^"\\]*(?:\\.[^"\\]*)*)"[ \t]*(\r\n|\n|\r|\xc2\x85|\xe2\x80\xa8|\xe2\x80\xa9)')
REF_RE = re.compile(r'!!(schema|meta|import):"([^"\\]*(?:\\.[^"\\]*)*)"')
ESCAPES = {'"': '"', '\\': '\\', 'b': '\b', 'f': '\f', 'n': '\n', 'r': '\r', 't': '\t', 's': ' '}
UNRESERVED = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
BIDI_CONTROLS = set('؜‎‏‪‫‬‭‮⁦⁧⁨⁩')


class Malformed(Exception):
    pass


def die(msg: str):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(2)


def decode_arg(raw: str) -> str:
    """Process a single-line token's escapes (Part 1 §7.2.2)."""
    out, i = [], 0
    while i < len(raw):
        c = raw[i]
        if c != '\\':
            out.append(c)
            i += 1
            continue
        e = raw[i + 1]
        if e in ESCAPES:
            out.append(ESCAPES[e])
            i += 2
        elif e == 'u' and raw[i + 2:i + 3] == '{':
            m = re.match(r'\{([0-9A-Fa-f]{1,6})\}', raw[i + 2:])
            if not m:
                raise Malformed("malformed \\u{...} escape in a directive argument")
            out.append(chr(int(m.group(1), 16)))
            i += 2 + m.end()
        elif e == 'u' and re.fullmatch(r'[0-9A-Fa-f]{4}', raw[i + 2:i + 6]):
            out.append(chr(int(raw[i + 2:i + 6], 16)))
            i += 6
        else:
            raise Malformed(f"invalid escape \\{e} in a directive argument")
    return ''.join(out)


def split_id_line(data: bytes):
    """Return (raw id argument or None, hash_input_bytes)."""
    if data.startswith(b"\xef\xbb\xbf"):
        data = data[3:]
    m = ID_RE.match(data)
    if not m:
        return None, data
    return m.group(1).decode("utf-8"), data[m.end():]


def digest_of(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# --- host ---------------------------------------------------------------

def is_nfc(s: str) -> bool:
    return unicodedata.normalize("NFC", s) == s


def canonical_ipv6(text: str, uri: str) -> str:
    if '%' in text:
        raise Malformed(f"'{uri}': a zone identifier is no part of a host")
    if text[:1] in ('v', 'V'):
        raise Malformed(f"'{uri}': an IPvFuture literal is not a host")
    try:
        a = ipaddress.IPv6Address(text)
    except ValueError:
        raise Malformed(f"'{uri}': '{text}' is not an IPv6 address")
    if a.ipv4_mapped is not None:
        return f"::ffff:{a.ipv4_mapped}"  # RFC 5952 §5
    return a.compressed  # RFC 5952 §4: lowercase, longest zero run, no lone :: for one field


def canonical_label(label: str, uri: str, strict: bool) -> str:
    if label == '':
        raise Malformed(f"'{uri}': empty label in the host (a trailing dot, or '..')")
    if label.isascii():
        if not re.fullmatch(r'[A-Za-z0-9-]+', label):
            raise Malformed(f"'{uri}': host label '{label}' is not letters, digits and hyphens")
        if label[0] == '-' or label[-1] == '-':
            raise Malformed(f"'{uri}': host label '{label}' begins or ends with a hyphen")
        if label[:4].lower() == 'xn--':
            if strict:
                raise Malformed(f"'{uri}': an !!id writes a host in U-labels, not the A-label '{label}'")
            try:
                u = label[4:].lower().encode('ascii').decode('punycode')
            except Exception:
                raise Malformed(f"'{uri}': '{label}' is not a valid A-label")
            if u.isascii() or 'xn--' + u.encode('punycode').decode('ascii') != label.lower():
                raise Malformed(f"'{uri}': '{label}' is not a valid A-label")
            return canonical_label(u, uri, False)
        if strict and label != label.lower():
            raise Malformed(f"'{uri}': an !!id writes its host in lowercase ('{label}')")
        return label.lower()
    # a U-label
    if any(c.isupper() and not c.isascii() for c in label):
        raise Malformed(f"'{uri}': host label '{label}' has uppercase beyond ASCII, which no host name admits")
    if strict and any(c.isupper() for c in label):
        raise Malformed(f"'{uri}': an !!id writes its host in lowercase ('{label}')")
    label = ''.join(c.lower() if c.isascii() else c for c in label)
    if label[0] == '-' or label[-1] == '-':
        raise Malformed(f"'{uri}': host label '{label}' begins or ends with a hyphen")
    if not is_nfc(label):
        raise Malformed(f"'{uri}': host label '{label}' is not NFC")
    for c in label:
        if not (c.isascii() and (c.isalnum() or c == '-')) and not (
                not c.isascii() and unicodedata.category(c)[0] in 'LMN'):
            raise Malformed(f"'{uri}': host label '{label}' holds U+{ord(c):04X}, not a host-name character")
    return label


def a_label_length(label: str) -> int:
    return len(label) if label.isascii() else 4 + len(label.encode('punycode'))


def canonical_host(host: str, uri: str, strict: bool) -> str:
    if host == '':
        return ''
    if '@' in host:
        raise Malformed(f"'{uri}' carries userinfo")
    if host.startswith('['):
        if not host.endswith(']'):
            if re.search(r'\]:[0-9]*$', host):
                raise Malformed(f"'{uri}' carries a port")
            raise Malformed(f"'{uri}': unterminated IP-literal")
        canon = '[' + canonical_ipv6(host[1:-1], uri) + ']'
        if strict and canon != host:
            raise Malformed(f"'{uri}': an !!id writes an IPv6 host in RFC 5952 text, {canon}")
        return canon
    if ':' in host:
        raise Malformed(f"'{uri}' carries a port")
    if '%' in host:
        raise Malformed(f"'{uri}': a percent-encoded host is URI syntax, not a host name")
    if re.fullmatch(r'[0-9.]+', host) and host.count('.') == 3:
        try:
            return str(ipaddress.IPv4Address(host))
        except ValueError:
            raise Malformed(f"'{uri}': '{host}' is not an IPv4 address")
    if host.endswith('.'):
        raise Malformed(f"'{uri}': a host name carries no trailing dot")
    labels = [canonical_label(l, uri, strict) for l in host.split('.')]
    if labels[-1][0].isdigit():
        raise Malformed(f"'{uri}': a host name's last label does not begin with a digit")
    for l in labels:
        if a_label_length(l) > 63:
            raise Malformed(f"'{uri}': host label '{l}' is longer than 63 octets in A-label form")
    if sum(a_label_length(l) for l in labels) + len(labels) - 1 > 253:
        raise Malformed(f"'{uri}': host name is longer than 253 octets in A-label form")
    return '.'.join(labels)


# --- path ---------------------------------------------------------------

def canonical_path(path: str, uri: str, strict: bool) -> str:
    out, i = [], 0
    while i < len(path):
        c = path[i]
        if c != '%':
            out.append(c)
            i += 1
            continue
        if not re.fullmatch(r'[0-9A-Fa-f]{2}', path[i + 1:i + 3]):
            raise Malformed(f"'{uri}': malformed percent-encoding")
        octet = int(path[i + 1:i + 3], 16)
        hexd = path[i + 1:i + 3]
        if octet < 0x80:
            if chr(octet) in UNRESERVED:
                raise Malformed(f"'{uri}' percent-encodes an unreserved character (%{hexd})")
            if strict and hexd != hexd.upper():
                raise Malformed(f"'{uri}': an !!id writes a percent-encoding in uppercase hex (%{hexd.upper()})")
            out.append('%' + hexd.upper())
            i += 3
            continue
        if strict:
            raise Malformed(f"'{uri}': an !!id writes characters beyond US-ASCII as themselves, not percent-encoded")
        # read back a UTF-8 sequence of percent-encoded octets
        j, octets = i, bytearray()
        while j < len(path) and path[j] == '%' and re.fullmatch(r'[0-9A-Fa-f]{2}', path[j + 1:j + 3]) \
                and int(path[j + 1:j + 3], 16) >= 0x80:
            octets.append(int(path[j + 1:j + 3], 16))
            j += 3
        try:
            text = octets.decode('utf-8')
        except UnicodeDecodeError:
            raise Malformed(f"'{uri}': percent-encoding that is not the UTF-8 of an IRI character")
        for ch in text:
            if ch in BIDI_CONTROLS or unicodedata.category(ch) in ('Cc', 'Cs', 'Cn'):
                raise Malformed(f"'{uri}': percent-encodes U+{ord(ch):04X}, which is no IRI character")
        out.append(text)
        i = j
    result = ''.join(out)
    for ch in result:
        if ch in BIDI_CONTROLS:
            raise Malformed(f"'{uri}': the path holds a bidirectional control U+{ord(ch):04X}")
    if not is_nfc(result):
        raise Malformed(f"'{uri}': the path is not NFC")
    if any(seg in ('.', '..') for seg in result.split('/')):
        raise Malformed(f"'{uri}' has a dot-segment")
    return result


def canonical_identity(uri: str, strict: bool) -> str:
    """Return the canonical identity: host canonical text plus path.

    strict: the reference is an !!id and must already be canonical.
    """
    if '#' in uri:
        raise Malformed(f"'{uri}' carries a fragment; an identifying reference never does")
    try:
        parts = urlsplit(uri)
    except ValueError as e:
        raise Malformed(f"'{uri}': {e}")
    host = canonical_host(parts.netloc, uri, strict)
    path = canonical_path(parts.path, uri, strict)
    if not host and not path.startswith('/'):
        raise Malformed(f"'{uri}' has no host and a relative path; a path-only identity is absolute (begins with /)")
    pin_from(uri)
    return host + path


def pin_from(uri: str):
    q = parse_qsl(urlsplit(uri).query, keep_blank_values=True)
    pin = None
    for k, v in q:
        if k == "sha256":
            pin = v
        else:
            raise Malformed(f"query parameter '{k}' is not a hash algorithm; an identifying reference admits only hash parameters")
    if pin is not None and not re.fullmatch(r"[0-9a-f]{64}", pin):
        raise Malformed("a sha256 pin is 64 lowercase hex characters, at full length")
    return pin


def with_pin(raw: str, digest: str) -> str:
    """The reference as written, its query replaced by the pin."""
    return raw.split('?', 1)[0] + f"?sha256={digest}"


# --- documents ----------------------------------------------------------

def load(path: str):
    """Return (raw bytes, raw id argument or None, decoded id or None, hash input)."""
    raw = open(path, "rb").read()
    raw_arg, body = split_id_line(raw)
    uri = decode_arg(raw_arg) if raw_arg is not None else None
    return raw, raw_arg, uri, body


def candidates(paths):
    """Map canonical identity -> (file, digest) for every .tn document with an !!id."""
    found = {}
    files = []
    for p in paths:
        if os.path.isdir(p):
            files += [os.path.join(p, f) for f in sorted(os.listdir(p)) if f.endswith('.tn')]
        else:
            files.append(p)
    for f in files:
        try:
            _, _, uri, body = load(f)
            if uri is None:
                continue
            ident = canonical_identity(uri, strict=True)
        except (OSError, Malformed) as e:
            print(f"  skip {f}: {e}")
            continue
        found.setdefault(ident, (f, digest_of(body)))
    return found


def verify_refs(path, uri, body, search):
    worst = 0
    d = digest_of(body)
    if uri is not None:
        own = pin_from(uri)
        if own is None:
            print(f"{path}: !!id unpinned; computed {d}")
        elif own == d:
            print(f"{path}: !!id pin matches {d}")
        else:
            print(f"{path}: !!id MISMATCH\n  declared: {own}\n  computed: {d}")
            worst = 1
    text = body.decode('utf-8')
    held = None
    for m in REF_RE.finditer(text):
        kind, ref = m.group(1), decode_arg(m.group(2))
        ident = canonical_identity(ref, strict=False)
        declared = pin_from(ref)
        if declared is None:
            print(f"  !!{kind} {ident}: unpinned")
            continue
        if held is None:
            held = candidates(search)
        if ident not in held:
            print(f"  !!{kind} {ident}: no local document with that identity; pin not checked")
            worst = max(worst, 3) if worst != 1 else 1
            continue
        f, actual = held[ident]
        if declared == actual:
            print(f"  !!{kind} {ident}: pin matches {f}")
        else:
            print(f"  !!{kind} {ident}: MISMATCH against {f}\n    declared: {declared}\n    computed: {actual}")
            worst = 1
    return worst


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 2
    path = argv[1]
    mode = argv[2] if len(argv) > 2 else None
    try:
        raw, raw_arg, uri, body = load(path)
    except OSError as e:
        die(str(e))
    try:
        body.decode("utf-8")
    except UnicodeDecodeError as e:
        die(f"a content-addressed document must be UTF-8 ({e})")

    if mode == "--verify-refs":
        search = argv[3:] or [os.path.dirname(os.path.abspath(path))]
        if uri is not None:
            canonical_identity(uri, strict=True)
        return verify_refs(path, uri, body, search)

    if raw_arg is None:
        die("no !!id line at the start of the document; a pinned document must carry one, followed by a line terminator")
    identity = canonical_identity(uri, strict=True)
    d = digest_of(body)

    if mode is None:
        print(f"sha256:   {d}")
        print(f"identity: {identity}")
        print(f"pinned:   {with_pin(uri, d)}")
        return 0

    if mode == "--verify":
        declared = pin_from(uri)
        if declared is None:
            print("no pin in the document's own !!id; computed digest:", d)
            return 0
        if declared == d:
            print("match:", d)
            return 0
        print(f"MISMATCH\n declared: {declared}\n computed: {d}")
        return 1

    if mode == "--verify-against":
        if len(argv) < 4:
            die("usage: pin.py FILE --verify-against REFERENCE")
        ref = argv[3]
        ref_identity = canonical_identity(ref, strict=False)
        if ref_identity != identity:
            print(f"identity mismatch\n reference: {ref_identity}\n document:  {identity}")
            return 1
        declared = pin_from(ref)
        if declared is None:
            print("reference is unpinned; identities match; computed digest:", d)
            return 0
        if declared == d:
            print("match:", d)
            return 0
        print(f"MISMATCH\n declared: {declared}\n computed: {d}")
        return 1

    if mode == "--stamp":
        new_arg = with_pin(raw_arg, d)
        bom = raw.startswith(b"\xef\xbb\xbf")
        data = raw[3:] if bom else raw
        m = ID_RE.match(data)
        new = (b"\xef\xbb\xbf" if bom else b"") + b'!!id:"' + new_arg.encode("utf-8") + b'"' + m.group(2) + body
        open(path, "wb").write(new)
        print("stamped:", with_pin(uri, d))
        return 0

    die(f"unknown mode {mode}")


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv))
    except Malformed as e:
        die(str(e))
