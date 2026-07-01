#!/usr/bin/env python3
"""
Add originalUrl / originalDate frontmatter fields pointing back to the
original Substack publication for each research article.
"""

import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH_DIR = os.path.join(REPO_ROOT, 'src', 'content', 'research')

SUBSTACK_BASE = 'https://litterat.substack.com/p/'

# filename -> (substack slug, ISO date)
DATA = {
    'deep-dive-into-json/part-1-introduction-and-core-limitations.md':
        ('a-deep-dive-into-json-part-1-introduction', '2025-07-08'),
    'deep-dive-into-json/part-2-json-and-numbers.md':
        ('a-deep-dive-into-json-part-2-json', '2025-07-16'),
    'deep-dive-into-json/part-3-boolean-and-enumerated-types.md':
        ('a-deep-dive-into-json-part-3-boolean', '2025-07-24'),
    'deep-dive-into-json/part-4-json-strings.md':
        ('a-deep-dive-into-json-part-4-json', '2025-07-31'),
    'deep-dive-into-json/part-5-arrays-and-objects.md':
        ('a-deep-dive-into-json-part-5-arrays', '2025-08-07'),
    'deep-dive-into-json/part-6-syntax.md':
        ('a-deep-dive-into-json-part-6-syntax', '2025-08-17'),
    'deep-dive-into-json/part-7-annotations.md':
        ('a-deep-dive-into-json-part-7-annotations', '2025-08-25'),
    'deep-dive-into-json/part-8-references-and-structural-composition.md':
        ('a-deep-dive-into-json-part-8-references', '2025-09-03'),
    'deep-dive-into-json/part-9-templates-and-schemas.md':
        ('a-deep-dive-into-json-part-9-templates', '2025-09-08'),
    'deep-dive-into-json/part-10-constraints-and-layers.md':
        ('a-deep-dive-into-json-part-10-constraints', '2025-09-24'),

    'proto-schema/part-1-a-theoretical-model-for-data-schemas.md':
        ('proto-schema-part-1-a-theoretical', '2026-02-25'),
    'proto-schema/part-2-what-is-a-schema.md':
        ('proto-schema-part-2-what-is-a-schema', '2026-03-04'),
    'proto-schema/part-3-structural-primitives-revisited.md':
        ('proto-schema-part-3-structural-primitives', '2026-03-10'),
    'proto-schema/part-4-sequences.md':
        ('proto-schema-part-4-sequences', '2026-03-17'),
    'proto-schema/part-5-templates.md':
        ('proto-schema-part-5-templates', '2026-03-24'),
    'proto-schema/part-6-structural-composition.md':
        ('proto-schema-part-6-structural-composition', '2026-04-01'),
    'proto-schema/part-7-choice.md':
        ('proto-schema-part-7-choice', '2026-05-25'),
    'proto-schema/part-8-multiplicity-and-nullability.md':
        ('proto-schema-part-8-multiplicity', '2026-06-04'),
}


def add_fields(relpath, slug, date):
    filepath = os.path.join(RESEARCH_DIR, relpath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'originalUrl:' in content:
        print(f'  [skip] already has originalUrl: {relpath}')
        return

    if not content.startswith('---'):
        raise RuntimeError(f'{relpath} has no frontmatter')

    end = content.index('\n---', 3)
    frontmatter, rest = content[:end], content[end:]

    url = SUBSTACK_BASE + slug
    frontmatter += f'\noriginalUrl: "{url}"'
    frontmatter += f'\noriginalDate: {date}'

    new_content = frontmatter + rest
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'  [done] {relpath} -> {url} ({date})')


def main():
    for relpath, (slug, date) in DATA.items():
        add_fields(relpath, slug, date)
    print('\nDone.')


if __name__ == '__main__':
    main()
