/**
 * Makes wide markdown tables behave in the prose column.
 *
 * The mapping tables in the reports carry long slash-joined runs
 * (`datetime`/`date`/`time`/…) with no space to break at, which sets a
 * min-content width the column can't go below and pushes the whole page wide.
 * Two passes fix it:
 *
 *   1. Insert <wbr> after each `/` inside table cells, so the browser may break
 *      the run at its slashes. Without this a cell only breaks mid-word, which
 *      splits identifiers across lines and reads badly.
 *   2. Wrap the table in `<div class="table-scroll">` (styled in global.css) so
 *      a table that is still too wide — many columns, or one very long token —
 *      scrolls inside its own box rather than widening the page.
 *   3. Tag the table `cols-N` with its column count, so global.css can give
 *      same-shaped tables the same column widths instead of letting each one be
 *      sized by whatever happens to be in its cells.
 *
 * Written as a plain hast walk rather than using unist-util-visit — that package
 * is only present transitively, and this repo has already been bitten by relying
 * on an undeclared transitive dependency.
 */
export default function rehypeTables() {
  return (tree) => {
    walk(tree, false);
  };
}

const CELL_TAGS = new Set(['td', 'th']);

function walk(node, inCell) {
  if (!node || !Array.isArray(node.children)) return;

  const children = [];

  for (const child of node.children) {
    const childInCell = inCell || (child.type === 'element' && CELL_TAGS.has(child.tagName));
    walk(child, childInCell);

    if (inCell && child.type === 'text' && child.value.includes('/')) {
      children.push(...breakAtSlashes(child.value));
      continue;
    }

    if (child.type === 'element' && child.tagName === 'table') {
      const cols = columnCount(child);
      if (cols) {
        const existing = child.properties?.className ?? [];
        child.properties = {
          ...child.properties,
          className: [...(Array.isArray(existing) ? existing : [existing]), `cols-${cols}`],
        };
      }

      children.push({
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-scroll'] },
        children: [child],
      });
      continue;
    }

    children.push(child);
  }

  node.children = children;
}

/** Cells in the table's first row — markdown tables are uniform, so that is the count. */
function columnCount(table) {
  const row = findFirst(table, (n) => n.tagName === 'tr');
  if (!row) return 0;
  return row.children.filter((c) => c.type === 'element' && CELL_TAGS.has(c.tagName)).length;
}

function findFirst(node, match) {
  if (!node || !Array.isArray(node.children)) return null;
  for (const child of node.children) {
    if (child.type === 'element' && match(child)) return child;
    const found = findFirst(child, match);
    if (found) return found;
  }
  return null;
}

/** `a/b/c` -> text("a/"), <wbr>, text("b/"), <wbr>, text("c") */
function breakAtSlashes(value) {
  const out = [];
  // Split after each slash, keeping the slash on the preceding chunk.
  const parts = value.split(/(?<=\/)/);

  for (const part of parts) {
    if (!part) continue;
    out.push({ type: 'text', value: part });
    // Also when the slash ends the node: the run often continues into the next
    // element (`a`/`b` is code, text "/", code), and that is where it must break.
    if (part.endsWith('/')) {
      out.push({ type: 'element', tagName: 'wbr', properties: {}, children: [] });
    }
  }

  return out;
}
