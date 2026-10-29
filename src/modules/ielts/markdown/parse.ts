/*
 * A deliberately small Markdown subset for IELTS question-group bodies.
 * One AST serves the server (slot collection, consistency checks) and the
 * client (runner and editor preview). Nothing here ever produces HTML: raw
 * tags in the source stay literal text, so AI or admin input cannot inject
 * markup.
 *
 *   blocks:  # / ## / ### headings, paragraphs, "- " or "* " bullets (two
 *            levels via two-space indent), "1. " ordered lists, GFM tables
 *   inline:  **bold**, *italic*, {{qN}} answer slots (N = 1..40), text
 */

export type IeltsMdInline =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: IeltsMdInline[] }
  | { type: 'em'; children: IeltsMdInline[] }
  | { type: 'slot'; number: number }

export interface IeltsMdListItem {
  children: IeltsMdInline[]
  items: IeltsMdListItem[]
}

export type IeltsMdAlign = 'left' | 'center' | 'right' | null

export type IeltsMdBlock =
  | { type: 'heading'; level: 1 | 2 | 3; children: IeltsMdInline[] }
  | { type: 'paragraph'; children: IeltsMdInline[] }
  | { type: 'list'; ordered: boolean; items: IeltsMdListItem[] }
  | {
      type: 'table'
      align: IeltsMdAlign[]
      header: IeltsMdInline[][]
      rows: IeltsMdInline[][][]
    }

const SLOT_PATTERN = /\{\{\s*q(\d{1,2})\s*\}\}/g
const HEADING_PATTERN = /^(#{1,3})\s+(.*)$/
const BULLET_PATTERN = /^( {0,1}| {2,3})([-*])\s+(.*)$/
const ORDERED_PATTERN = /^( {0,1}| {2,3})(\d{1,2})\.\s+(.*)$/
const TABLE_SEPARATOR_PATTERN = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/

function pushText(nodes: IeltsMdInline[], value: string) {
  if (!value) return

  const last = nodes[nodes.length - 1]

  if (last?.type === 'text') last.value += value
  else nodes.push({ type: 'text', value })
}

/** Splits slots out of a run of plain text. */
function parseSlots(value: string, nodes: IeltsMdInline[]) {
  let cursor = 0

  for (const match of value.matchAll(SLOT_PATTERN)) {
    const number = Number(match[1])

    pushText(nodes, value.slice(cursor, match.index))

    if (number >= 1 && number <= 40) nodes.push({ type: 'slot', number })
    else pushText(nodes, match[0])

    cursor = (match.index ?? 0) + match[0].length
  }

  pushText(nodes, value.slice(cursor))
}

/**
 * Inline parser: `**` then `*` delimiters, innermost first. An unmatched
 * delimiter stays literal text.
 */
export function parseIeltsInline(source: string): IeltsMdInline[] {
  const nodes: IeltsMdInline[] = []
  let index = 0

  while (index < source.length) {
    if (source.startsWith('**', index)) {
      const close = source.indexOf('**', index + 2)

      if (close > index + 2) {
        nodes.push({
          type: 'strong',
          children: parseIeltsInline(source.slice(index + 2, close)),
        })
        index = close + 2
        continue
      }
    }

    if (source[index] === '*' && source[index + 1] !== '*') {
      const close = source.indexOf('*', index + 1)

      if (close > index + 1 && source[close + 1] !== '*') {
        nodes.push({
          type: 'em',
          children: parseIeltsInline(source.slice(index + 1, close)),
        })
        index = close + 1
        continue
      }
    }

    const nextStar = source.indexOf('*', index + 1)
    const end = nextStar === -1 ? source.length : nextStar
    const chunk = source[index] === '*' ? '*' : source.slice(index, end)

    parseSlots(chunk, nodes)
    index += chunk.length
  }

  return nodes
}

/** Splits a table row on unescaped pipes; `\|` stays a literal pipe. */
function splitTableRow(line: string): string[] {
  const trimmed = line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
  const cells: string[] = []
  let current = ''

  for (let index = 0; index < trimmed.length; index++) {
    const char = trimmed[index]

    if (char === '\\' && trimmed[index + 1] === '|') {
      current += '|'
      index++
    } else if (char === '|') {
      cells.push(current.trim())
      current = ''
    } else current += char
  }

  cells.push(current.trim())

  return cells
}

function parseAlign(cell: string): IeltsMdAlign {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')

  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'

  return null
}

function isTableStart(lines: string[], index: number) {
  return (
    lines[index]?.includes('|') &&
    TABLE_SEPARATOR_PATTERN.test(lines[index + 1]?.trim() ?? '')
  )
}

function parseList(
  lines: string[],
  start: number
): { block: IeltsMdBlock; next: number } {
  const first = lines[start]
  const ordered = !BULLET_PATTERN.test(first)
  const pattern = ordered ? ORDERED_PATTERN : BULLET_PATTERN
  const items: IeltsMdListItem[] = []
  let index = start

  while (index < lines.length) {
    const match = lines[index].match(pattern)

    if (!match) break

    const nested = match[1].length >= 2
    const content = match[3]
    const item: IeltsMdListItem = {
      children: parseIeltsInline(content),
      items: [],
    }

    if (nested && items.length > 0) items[items.length - 1].items.push(item)
    else items.push(item)

    index++
  }

  return { block: { type: 'list', ordered, items }, next: index }
}

export function parseIeltsMarkdown(source: string): IeltsMdBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: IeltsMdBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index++
      continue
    }

    const heading = line.match(HEADING_PATTERN)

    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        children: parseIeltsInline(heading[2].trim()),
      })
      index++
      continue
    }

    if (isTableStart(lines, index)) {
      const header = splitTableRow(line)
      const align = splitTableRow(lines[index + 1]).map(parseAlign)
      const rows: IeltsMdInline[][][] = []

      index += 2

      while (index < lines.length && lines[index].includes('|')) {
        const cells = splitTableRow(lines[index])
        const padded = header.map((_, cell) => cells[cell] ?? '')

        rows.push(padded.map(cell => parseIeltsInline(cell)))
        index++
      }

      blocks.push({
        type: 'table',
        align: header.map((_, cell) => align[cell] ?? null),
        header: header.map(cell => parseIeltsInline(cell)),
        rows,
      })
      continue
    }

    if (BULLET_PATTERN.test(line) || ORDERED_PATTERN.test(line)) {
      const list = parseList(lines, index)

      blocks.push(list.block)
      index = list.next
      continue
    }

    const paragraph: string[] = []

    while (
      index < lines.length &&
      lines[index].trim() &&
      !HEADING_PATTERN.test(lines[index]) &&
      !BULLET_PATTERN.test(lines[index]) &&
      !ORDERED_PATTERN.test(lines[index]) &&
      !isTableStart(lines, index)
    ) {
      paragraph.push(lines[index].trim())
      index++
    }

    blocks.push({
      type: 'paragraph',
      children: parseIeltsInline(paragraph.join(' ')),
    })
  }

  return blocks
}

function collectInline(nodes: IeltsMdInline[], into: number[]) {
  for (const node of nodes)
    if (node.type === 'slot') into.push(node.number)
    else if (node.type === 'strong' || node.type === 'em')
      collectInline(node.children, into)
}

function collectItems(items: IeltsMdListItem[], into: number[]) {
  for (const item of items) {
    collectInline(item.children, into)
    collectItems(item.items, into)
  }
}

/** Slot numbers in document order, duplicates kept (the checker reports them). */
export function collectSlots(blocks: IeltsMdBlock[]): number[] {
  const slots: number[] = []

  for (const block of blocks)
    if (block.type === 'heading' || block.type === 'paragraph')
      collectInline(block.children, slots)
    else if (block.type === 'list') collectItems(block.items, slots)
    else {
      block.header.forEach(cell => collectInline(cell, slots))
      block.rows.forEach(row => row.forEach(cell => collectInline(cell, slots)))
    }

  return slots
}

export function collectSlotsFromSource(source: string): number[] {
  return collectSlots(parseIeltsMarkdown(source))
}

const HTML_TAG_PATTERN = /<[a-zA-Z/!]/

export function containsHtml(value: string): boolean {
  return HTML_TAG_PATTERN.test(value)
}
