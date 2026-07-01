#!/usr/bin/env python3
"""
Add YAML frontmatter to research article .md files that don't already have it.
Extracts title from the first # heading and description from **Abstract:** paragraph.
"""

import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SERIES_META = {
    'deep-dive-into-json': 'A Deep Dive into JSON',
    'proto-schema': 'Proto-Schema',
}


def extract_title(lines):
    """Extract clean title from first # heading."""
    for line in lines:
        m = re.match(r'^#+\s+\*?\*?(.*?)\*?\*?\s*$', line.strip())
        if m:
            title = m.group(1)
            # Clean up escape sequences like "1\. "
            title = re.sub(r'\\\. ', '. ', title)
            # Remove stray **
            title = title.replace('**', '')
            return title.strip()
    return ''


def extract_description(lines):
    """Extract text from **Abstract:** paragraph."""
    for i, line in enumerate(lines):
        m = re.match(r'^\*\*Abstract:\*\*\s*(.*)', line.strip())
        if m:
            desc = m.group(1).strip()
            # Collect continuation lines (non-blank, non-heading)
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line or next_line.startswith('#') or next_line.startswith('**'):
                    break
                desc += ' ' + next_line
                j += 1
            # Truncate to ~300 chars at a sentence boundary
            if len(desc) > 300:
                truncated = desc[:300]
                last_period = truncated.rfind('.')
                if last_period > 150:
                    desc = truncated[:last_period + 1]
                else:
                    desc = truncated.rstrip() + '...'
            return desc
    return ''


def extract_part(filename):
    """Extract part number from filename like part-3-... or part-10-..."""
    m = re.match(r'^part-(\d+)-', filename)
    if m:
        return int(m.group(1))
    return 0


def add_frontmatter_to_file(filepath, series_id, series_name):
    filename = os.path.basename(filepath)
    part = extract_part(filename)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if frontmatter already present
    if content.startswith('---'):
        print(f'  [skip] already has frontmatter: {filename}')
        return

    lines = content.splitlines(keepends=True)
    title = extract_title(lines)
    description = extract_description(lines)

    # Build frontmatter
    fm_lines = ['---\n']
    fm_lines.append(f'title: "{title}"\n')
    fm_lines.append(f'series: "{series_id}"\n')
    fm_lines.append(f'seriesTitle: "{series_name}"\n')
    fm_lines.append(f'part: {part}\n')
    if description:
        # YAML block scalar for description to handle quotes/special chars
        fm_lines.append(f'description: >\n  {description}\n')
    fm_lines.append('---\n\n')

    new_content = ''.join(fm_lines) + content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f'  [done] {filename}: part={part}, title={title[:60]}')


def process_research_dir(series_id):
    series_name = SERIES_META[series_id]
    dir_path = os.path.join(REPO_ROOT, 'src', 'content', 'research', series_id)
    files = sorted(f for f in os.listdir(dir_path) if f.endswith('.md'))
    print(f'\n{series_name} ({len(files)} files):')
    for filename in files:
        filepath = os.path.join(dir_path, filename)
        add_frontmatter_to_file(filepath, series_id, series_name)


def main():
    for series_id in SERIES_META:
        process_research_dir(series_id)
    print('\nDone.')


if __name__ == '__main__':
    main()
