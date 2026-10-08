#!/usr/bin/env python3
"""Compute or verify a TSON content pin (?sha256=...) for a .tn document.

TSON Part 1 §2.2.1: the hash input is every byte after the `!!id` line's
terminator (LF, CR LF, CR, NEL, LS or PS). The id line itself, up to and
including its terminator, is excluded so a document can carry its own hash. A
BOM, if present, is stripped first and never hashed. The digest is lowercase
hex, full length. Content-addressed documents must be UTF-8.

The `!!id` argument is an IRI-reference: characters beyond US-ASCII are written
as themselves and compared as written. It must already be canonical: lowercase
host, no userinfo, no port, no fragment, no `.`/`..` segments, no
percent-encoded unreserved characters, a query of hash parameters only, and,
with no host, an absolute path (`/local/x.tn`, `file:/local/x.tn` and
`file:///local/x.tn` are one identity). Canonical identity is host plus path.

Usage:
  pin.py FILE               print the digest, the identity and the pinned reference
  pin.py FILE --verify      compare the digest with the ?sha256= in the file's own !!id
  pin.py FILE --verify-against 'https://host/x.tn?sha256=...'
                            compare with a reference held by another document
  pin.py FILE --stamp       rewrite the file's !!id line to carry the correct pin
                            (adds or replaces ?sha256=, keeping the rest as written)

Exit status: 0 ok / match, 1 mismatch, 2 usage or malformed input.
"""
import hashlib
import re
import sys
from urllib.parse import urlsplit, parse_qsl

ID_RE = re.compile(rb'^!!id:"([^"\\]*(?:\\.[^"\\]*)*)"[ \t]*(\r\n|\n|\r|\xc2\x85|\xe2\x80\xa8|\xe2\x80\xa9)')
ESCAPES = {'"': '"', '\\': '\\', 'b': '\b', 'f': '\f', 'n': '\n', 'r': '\r', 't': '\t', 's': ' '}
UNRESERVED = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")


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
                die("malformed \\u{...} escape in the !!id argument")
            out.append(chr(int(m.group(1), 16)))
            i += 2 + m.end()
        elif e == 'u' and re.fullmatch(r'[0-9A-Fa-f]{4}', raw[i + 2:i + 6]):
            out.append(chr(int(raw[i + 2:i + 6], 16)))
            i += 6
        else:
            die(f"invalid escape \\{e} in the !!id argument")
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


def canonical_identity(uri: str) -> str:
    """Check the reference is in canonical form and return host plus path."""
    if '#' in uri:
        die(f"'{uri}' carries a fragment; an identifying reference never does")
    parts = urlsplit(uri)
    host = parts.netloc
    if '@' in host:
        die(f"'{uri}' carries userinfo")
    if re.search(r':[0-9]*$', host.rsplit(']', 1)[-1]):
        die(f"'{uri}' carries a port")
    if host != host.lower():
        die(f"'{uri}' has an uppercase host; write it lowercase")
    path = parts.path
    if not host and not path.startswith('/'):
        die(f"'{uri}' has no host and a relative path; a path-only identity is absolute (begins with /)")
    if any(seg in ('.', '..') for seg in path.split('/')):
        die(f"'{uri}' has a dot-segment")
    for m in re.finditer(r'%([0-9A-Fa-f]{2})', path + host):
        if chr(int(m.group(1), 16)) in UNRESERVED:
            die(f"'{uri}' percent-encodes an unreserved character (%{m.group(1)})")
    return host + path


def pin_from(uri: str):
    q = parse_qsl(urlsplit(uri).query, keep_blank_values=True)
    pin = None
    for k, v in q:
        if k == "sha256":
            pin = v
        else:
            die(f"query parameter '{k}' is not a hash algorithm; an identifying reference admits only hash parameters")
    if pin is not None and not re.fullmatch(r"[0-9a-f]{64}", pin):
        die("a sha256 pin is 64 lowercase hex characters, at full length")
    return pin


def with_pin(raw: str, digest: str) -> str:
    """The reference as written, its query replaced by the pin."""
    return raw.split('?', 1)[0] + f"?sha256={digest}"


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 2
    path = argv[1]
    mode = argv[2] if len(argv) > 2 else None
    try:
        raw = open(path, "rb").read()
    except OSError as e:
        die(str(e))
    raw_arg, body = split_id_line(raw)
    if raw_arg is None:
        die("no !!id line at the start of the document; a pinned document must carry one, followed by a line terminator")
    uri = decode_arg(raw_arg)
    try:
        body.decode("utf-8")
    except UnicodeDecodeError as e:
        die(f"a content-addressed document must be UTF-8 ({e})")
    identity = canonical_identity(uri)
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
        if canonical_identity(ref) != identity:
            print(f"identity mismatch\n reference: {canonical_identity(ref)}\n document:  {identity}")
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
        pin_from(uri)  # validates the query
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
    sys.exit(main(sys.argv))
