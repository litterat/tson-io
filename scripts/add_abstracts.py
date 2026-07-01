#!/usr/bin/env python3
"""
Add a full (untruncated) `abstract` frontmatter field to each research article,
extracted from the "**Abstract:**" / "**Abstract**:" paragraph in the body.
Any markdown links pointing at another article's original Substack URL are
rewritten to the local /research/<series>/<slug> URL.
"""

import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH_DIR = os.path.join(REPO_ROOT, 'src', 'content', 'research')

# relpath -> substack slug (mirrors scripts/add_substack_links.py)
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

# substack slug -> local research URL
SLUG_TO_LOCAL = {
    slug: f'/research/{relpath[:-len(".md")]}'
    for relpath, slug in SUBSTACK_SLUGS.items()
}

ABSTRACT_RE = re.compile(r'\*\*Abstract\*?\*?:?\*?\*?\s*:?\s*(.+?)(?=\n\n|\n#)', re.S)
SUBSTACK_LINK_RE = re.compile(
    r'\[([^\]]+)\]\(https://litterat\.substack\.com/p/([a-z0-9-]+)\)'
)


def localize_links(text):
    def replace(m):
        label, slug = m.group(1), m.group(2)
        local_url = SLUG_TO_LOCAL.get(slug)
        if local_url:
            return f'[{label}]({local_url})'
        return m.group(0)  # leave unrecognized substack links untouched
    return SUBSTACK_LINK_RE.sub(replace, text)


def extract_abstract(body):
    m = ABSTRACT_RE.search(body)
    if not m:
        return None
    text = m.group(1).strip()
    text = re.sub(r'\s+', ' ', text)
    return localize_links(text)


def yaml_block_scalar(text, indent='  '):
    return f'>\n{indent}{text}'


def process_file(relpath):
    filepath = os.path.join(RESEARCH_DIR, relpath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'abstract:' in content:
        print(f'  [skip] already has abstract: {relpath}')
        return

    fm_end = content.index('\n---', 3)
    frontmatter, rest = content[:fm_end], content[fm_end:]
    body = rest[len('\n---'):]

    abstract = extract_abstract(body)
    if abstract is None:
        print(f'  [WARN] no abstract found: {relpath}')
        return

    frontmatter += f'\nabstract: {yaml_block_scalar(abstract)}'
    new_content = frontmatter + rest
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'  [done] {relpath} ({len(abstract)} chars)')


def main():
    for relpath in SUBSTACK_SLUGS:
        process_file(relpath)
    print('\nDone.')


if __name__ == '__main__':
    main()
