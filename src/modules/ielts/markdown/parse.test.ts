import { describe, expect, it } from 'vitest'

import {
  collectSlotsFromSource,
  containsHtml,
  parseIeltsInline,
  parseIeltsMarkdown,
} from './parse'

describe('parseIeltsMarkdown', () => {
  it('parses headings, paragraphs and lists', () => {
    const blocks = parseIeltsMarkdown(
      '## Club notes\n\nMembers meet on\nTuesdays.\n\n- first\n  - nested\n- second\n\n1. one\n2. two'
    )

    expect(blocks.map(block => block.type)).toEqual([
      'heading',
      'paragraph',
      'list',
      'list',
    ])
    expect(blocks[1]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: 'Members meet on Tuesdays.' }],
    })
    expect(blocks[2]).toMatchObject({
      ordered: false,
      items: [{ items: [{ children: [{ value: 'nested' }] }] }, {}],
    })
    expect(blocks[3]).toMatchObject({ ordered: true })
  })

  it('parses a GFM table with slots in cells, alignment and escaped pipes', () => {
    const [table] = parseIeltsMarkdown(
      '| Course | Cost |\n| :--- | ---: |\n| Taster \\| day | {{q1}} |\n| Level 1 |'
    )

    expect(table).toMatchObject({
      type: 'table',
      align: ['left', 'right'],
      rows: [
        [
          [{ type: 'text', value: 'Taster | day' }],
          [{ type: 'slot', number: 1 }],
        ],
        [[{ type: 'text', value: 'Level 1' }], []],
      ],
    })
  })

  it('keeps HTML as literal text', () => {
    const [paragraph] = parseIeltsMarkdown(
      '<script>alert(1)</script> <img onerror=x>'
    )

    expect(paragraph).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', value: '<script>alert(1)</script> <img onerror=x>' },
      ],
    })
    expect(containsHtml('<img onerror=x>')).toBe(true)
    expect(containsHtml('5 < 7 and 9 > 2')).toBe(false)
  })
})

describe('parseIeltsInline', () => {
  it('parses bold, italic and slots', () => {
    expect(
      parseIeltsInline('Write **ONE WORD** in *each* gap {{ q12 }}.')
    ).toEqual([
      { type: 'text', value: 'Write ' },
      { type: 'strong', children: [{ type: 'text', value: 'ONE WORD' }] },
      { type: 'text', value: ' in ' },
      { type: 'em', children: [{ type: 'text', value: 'each' }] },
      { type: 'text', value: ' gap ' },
      { type: 'slot', number: 12 },
      { type: 'text', value: '.' },
    ])
  })

  it('leaves unmatched delimiters and out-of-range slots as text', () => {
    expect(parseIeltsInline('a * b {{q41}}')).toEqual([
      { type: 'text', value: 'a * b {{q41}}' },
    ])
  })
})

describe('collectSlotsFromSource', () => {
  it('returns slots in order with duplicates', () => {
    expect(
      collectSlotsFromSource(
        '{{q3}} then\n\n| a |\n| --- |\n| {{q4}} **{{q3}}** |'
      )
    ).toEqual([3, 4, 3])
  })
})
