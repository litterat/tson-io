#!/usr/bin/env python3
"""
Replace litterat.substack.com links in article bodies (not frontmatter) with
local /research/<series>/<slug> URLs, wherever the link points to one of our
18 known articles. Frontmatter's `originalUrl` field is left untouched since
it intentionally points at the real Substack origin.
"""

import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH_DIR = os.path.join(REPO_ROOT, 'src', 'content', 'research')

SUBSTACK_SLUGS = {
    'deep-dive-into-json/part-1-introduction-and-core-limitations.md': 'a-deep-dive-into-json-part-1-introduction',
    'deep-dive-into-json/part-2-json-and-numbers.md': 'a-deep-dive-into-json-part-2-json',
    'deep-dive-into-json/part-3-boolean-and-enumerated-types.md': 'a-deep-dive-into-json-part-3-boolean',
    'deep-dive-into-json/part-4-json-strings.md': 'a-deep-dive-into-json-part-4-json',
    'deep-dive-into-json/part-5-arrays-and-objects.md': 'a-deep-dive-into-json-part-5-arrays',
    'deep-dive-into-json/part-6-syntax.md': 'a-deep-dive-into-json-part-6-syntax',
    'deep-dive-into-json/part-7-annotations.md': 'a-deep-dive-into-json-part-7-annotations',
    'deep-dive-into-json/part-8-references-and-structural-composition.md': 'a-deep-dive-into-json-part-8-references',
    'deep-dive-into-json/part-9-templates-and-schemas.md': 'a-deep-dive-into-json-part-9-templates',
    'deep-dive-into-json/part-10-constraints-and-layers.md': 'a-deep-dive-into-json-part-10-constraints',
    'proto-schema/part-1-a-theoretical-model-for-data-schemas.md': 'proto-schema-part-1-a-theoretical',
    'proto-schema/part-2-what-is-a-schema.md': 'proto-schema-part-2-what-is-a-schema',
    'proto-schema/part-3-structural-primitives-revisited.md': 'proto-schema-part-3-structural-primitives',
    'proto-schema/part-4-sequences.md': 'proto-schema-part-4-sequences',
    'proto-schema/part-5-templates.md': 'proto-schema-part-5-templates',
    'proto-schema/part-6-structural-composition.md': 'proto-schema-part-6-structural-composition',
    'proto-schema/part-7-choice.md': 'proto-schema-part-7-choice',
    'proto-schema/part-8-multiplicity-and-nullability.md': 'proto-schema-part-8-multiplicity',
}

SLUG_TO_LOCAL = {
    slug: f'/research/{relpath[:-len(".md")]}'
    for relpath, slug in SUBSTACK_SLUGS.items()
}

# Matches the URL portion only (used both inside markdown links and bare urls),
# tolerating an optional query string (e.g. Substack's share-tracking params).
SUBSTACK_URL_RE = re.compile(
    r'https://litterat\.substack\.com/p/([a-z0-9-]+)(?:\?[^)\s]*)?'
)


def localize(text):
    unmatched = []

    def replace(m):
        slug = m.group(1)
        local_url = SLUG_TO_LOCAL.get(slug)
        if local_url:
            return local_url
        unmatched.append(slug)
        return m.group(0)

    new_text = SUBSTACK_URL_RE.sub(replace, text)
    return new_text, unmatched


def process_file(relpath):
    filepath = os.path.join(RESEARCH_DIR, relpath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    fm_end = content.index('\n---', 3) + len('\n---')
    frontmatter, body = content[:fm_end], content[fm_end:]

    new_body, unmatched = localize(body)
    count = len(SUBSTACK_URL_RE.findall(body))

    if count == 0:
        print(f'  [skip] no substack links in body: {relpath}')
        return

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(frontmatter + new_body)

    msg = f'  [done] {relpath}: {count} link(s) localized'
    if unmatched:
        msg += f'  UNMATCHED SLUGS: {unmatched}'
    print(msg)


def main():
    for relpath in SUBSTACK_SLUGS:
        process_file(relpath)
    print('\nDone.')


if __name__ == '__main__':
    main()
