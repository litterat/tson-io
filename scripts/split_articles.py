#!/usr/bin/env python3
"""
Split concatenated article markdown files into individual article files,
extracting base64-encoded images to the public/images directory.
"""

import re
import os
import base64

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def slugify(text):
    """Convert text to a URL-friendly slug."""
    text = re.sub(r'\\\. ', '-', text)        # "1\. " -> "1-"
    text = re.sub(r'\*\*', '', text)           # Remove **
    text = re.sub(r'[&]', 'and', text)        # & -> and
    text = re.sub(r'[^\w\s-]', '', text.lower())
    text = re.sub(r'[\s_]+', '-', text.strip())
    text = re.sub(r'-+', '-', text)
    return text.strip('-')


def parse_image_refs(lines):
    """Parse [imageN]: <data:...> reference definitions from lines."""
    image_refs = {}
    img_pattern = re.compile(r'^\[image(\d+)\]: <(data:image/(\w+);base64,(.+))>\s*$')
    for line in lines:
        m = img_pattern.match(line)
        if m:
            num = m.group(1)
            ext = m.group(3)
            data = m.group(4)
            image_refs[f'image{num}'] = (ext, data)
    return image_refs


def find_image_refs_start(lines):
    """Find the line index where image reference definitions begin."""
    img_pattern = re.compile(r'^\[image\d+\]: <data:image/')
    for i, line in enumerate(lines):
        if img_pattern.match(line):
            return i
    return len(lines)


def find_article_sections(lines, heading_pattern):
    """Return list of (start_line, title) for each article section."""
    sections = []
    for i, line in enumerate(lines):
        m = heading_pattern.match(line)
        if m:
            sections.append((i, line.strip()))
    return sections


def extract_images(article_slug, image_refs_used, all_image_refs, images_dir, images_url_prefix):
    """
    Save images to disk and return a dict mapping image_id -> new markdown ref line.
    """
    os.makedirs(images_dir, exist_ok=True)
    replacements = {}
    for img_id in image_refs_used:
        if img_id not in all_image_refs:
            continue
        ext, data = all_image_refs[img_id]
        filename = f'{article_slug}-{img_id}.{ext}'
        filepath = os.path.join(images_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(data))
        url = f'{images_url_prefix}/{filename}'
        replacements[img_id] = url
    return replacements


def find_used_images(section_lines):
    """Find all image IDs referenced in a section."""
    pattern = re.compile(r'!\[.*?\]\[(\w+)\]')
    used = []
    for line in section_lines:
        for m in pattern.finditer(line):
            img_id = m.group(1)
            if img_id not in used:
                used.append(img_id)
    return used


def rewrite_image_refs(section_lines, url_map):
    """Replace ![][imageN] with ![](url) in section lines."""
    result = []
    ref_pattern = re.compile(r'(!\[([^\]]*)\])\[(\w+)\]')
    for line in section_lines:
        def replace_ref(m):
            alt = m.group(2)
            img_id = m.group(3)
            if img_id in url_map:
                return f'![{alt}]({url_map[img_id]})'
            return m.group(0)
        result.append(ref_pattern.sub(replace_ref, line))
    return result


def process_file(source_path, output_dir, images_dir, images_url_prefix, heading_pattern, strip_prefix=None):
    """Split a concatenated markdown file into individual article files."""
    print(f'\nProcessing: {source_path}')
    with open(source_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find where image refs start (they're all at the bottom)
    img_ref_start = find_image_refs_start(lines)
    content_lines = lines[:img_ref_start]
    image_ref_lines = lines[img_ref_start:]

    all_image_refs = parse_image_refs(image_ref_lines)
    print(f'  Found {len(all_image_refs)} embedded images')

    sections = find_article_sections(content_lines, heading_pattern)
    print(f'  Found {len(sections)} articles')

    os.makedirs(output_dir, exist_ok=True)

    for i, (start, title) in enumerate(sections):
        end = sections[i + 1][0] if i + 1 < len(sections) else len(content_lines)
        section_lines = content_lines[start:end]

        # Build slug and filename
        # Title is like: # **A Deep Dive into JSON: Part 2\. JSON & Numbers**
        # Extract "Part N. Subtitle" portion after the colon
        clean_title = re.sub(r'^#+\s*', '', title)
        clean_title = re.sub(r'\*\*', '', clean_title)
        # Strip series prefix if present (everything up to and including the colon)
        if ':' in clean_title:
            clean_title = clean_title.split(':', 1)[1].strip()
        slug = slugify(clean_title)
        filename = f'{slug}.md'
        output_path = os.path.join(output_dir, filename)

        # Extract and replace images
        used_images = find_used_images(section_lines)
        url_map = {}
        if used_images:
            url_map = extract_images(slug, used_images, all_image_refs,
                                     images_dir, images_url_prefix)
            section_lines = rewrite_image_refs(section_lines, url_map)
            print(f'  [{filename}] extracted {len(used_images)} image(s)')

        # Strip trailing blank lines
        while section_lines and section_lines[-1].strip() == '':
            section_lines.pop()

        with open(output_path, 'w', encoding='utf-8') as f:
            f.writelines(section_lines)
            f.write('\n')

        print(f'  -> {output_path}')


def main():
    research_dir = os.path.join(REPO_ROOT, 'src', 'content', 'research')
    public_images = os.path.join(REPO_ROOT, 'public', 'images')

    # --- Deep Dive into JSON ---
    process_file(
        source_path=os.path.join(research_dir, 'A Deep Dive on JSON_ All.md'),
        output_dir=os.path.join(research_dir, 'deep-dive-into-json'),
        images_dir=os.path.join(public_images, 'deep-dive-into-json'),
        images_url_prefix='/images/deep-dive-into-json',
        heading_pattern=re.compile(r'^# \*\*A Deep [Dd]ive into JSON:'),
    )

    # --- Proto-Schema ---
    process_file(
        source_path=os.path.join(research_dir, 'Proto-Schema_ Published.md'),
        output_dir=os.path.join(research_dir, 'proto-schema'),
        images_dir=os.path.join(public_images, 'proto-schema'),
        images_url_prefix='/images/proto-schema',
        heading_pattern=re.compile(r'^# \*\*Proto-[Ss]chema:'),
    )

    print('\nDone.')


if __name__ == '__main__':
    main()
