#!/usr/bin/env python3
"""Compute or verify a TSON content pin (?sha256=...) for a .tn document.

TSON Part 1 §2.2.1: the hash input is every byte after the `!!id` line's
terminator. The id line itself (up to and including its LF) is excluded so a
document can carry its own hash. A BOM, if present, is stripped first. The
digest is lowercase hex, full length. Content-addressed documents must be UTF-8.

Usage:
  pin.py FILE               print the digest and the pinned reference
  pin.py FILE --verify      compare the digest with the ?sha256= in the file's own !!id
  pin.py FILE --verify-against 'https://host/x.tn?sha256=...'
                            compare with a reference held by another document
  pin.py FILE --stamp       rewrite the file's !!id line to carry the correct pin
                            (adds or replaces ?sha256=; other query params are errors)

Exit status: 0 ok / match, 1 mismatch, 2 usage or malformed input.
"""
import hashlib
import re
import sys
from urllib.parse import urlsplit, urlunsplit, parse_qsl

ID_RE = re.compile(rb'^!!id:"([^"\\]*(?:\\.[^"\\]*)*)"[ \t]*(\r\n|\n|\r|\xc2\x85|\xe2\x80\xa8|\xe2\x80\xa9)')


def split_id_line(data: bytes):
    """Return (id_uri or None, hash_input_bytes)."""
    if data.startswith(b"\xef\xbb\xbf"):
        data = data[3:]
    m = ID_RE.match(data)
    if not m:
        return None, data
    uri = m.group(1).decode("utf-8")
    return uri, data[m.end():]


def digest_of(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_identity(uri: str) -> str:
    parts = urlsplit(uri)
    return parts.netloc.lower() + parts.path


def pin_from(uri: str):
    parts = urlsplit(uri)
    q = parse_qsl(parts.query, keep_blank_values=True)
    pin = None
    for k, v in q:
        if k == "sha256":
            pin = v
        else:
            sys.exit(f"error: query parameter '{k}' is not a hash algorithm — identity URIs admit only hash parameters")
    if pin is not None and not re.fullmatch(r"[0-9a-f]{64}", pin):
        sys.exit("error: sha256 pin must be 64 lowercase hex characters at full length")
    return pin


def with_pin(uri: str, digest: str) -> str:
    parts = urlsplit(uri)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, f"sha256={digest}", ""))


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 2
    path = argv[1]
    mode = argv[2] if len(argv) > 2 else None
    try:
        raw = open(path, "rb").read()
    except OSError as e:
        sys.exit(f"error: {e}")
    uri, body = split_id_line(raw)
    if uri is None:
        sys.exit("error: no !!id line at the start of the document — a pinned document must carry one, followed by a line terminator")
    try:
        body.decode("utf-8")
    except UnicodeDecodeError as e:
        sys.exit(f"error: content-addressed documents must be UTF-8 ({e})")
    d = digest_of(body)

    if mode is None:
        print(f"sha256:   {d}")
        print(f"identity: {canonical_identity(uri)}")
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
            sys.exit("usage: pin.py FILE --verify-against REFERENCE")
        ref = argv[3]
        if canonical_identity(ref) != canonical_identity(uri):
            print(f"identity mismatch\n reference: {canonical_identity(ref)}\n document:  {canonical_identity(uri)}")
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
        pin_from(uri)  # validates query
        new_uri = with_pin(uri, d)
        bom = raw.startswith(b"\xef\xbb\xbf")
        data = raw[3:] if bom else raw
        m = ID_RE.match(data)
        new = b'!!id:"' + new_uri.encode("utf-8") + b'"' + m.group(2) + body
        open(path, "wb").write(new)
        print("stamped:", new_uri)
        return 0

    sys.exit(f"error: unknown mode {mode}")


if __name__ == "__main__":
    sys.exit(main(sys.argv))
