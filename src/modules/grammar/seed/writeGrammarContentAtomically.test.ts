import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { GrammarContentFile } from '@/modules/grammar/types'

import {
  loadGrammarContent,
  writeGrammarContentAtomically,
} from './loadGrammarContent'

function row(slug: string): GrammarContentFile[number] {
  return {
    cefrLevel: 'A1',
    complexity: 3,
    family: 'articles-determiners',
    l1Risk: 'medium',
    order: 1,
    slug,
    summary: 'A summary.',
    title: 'A Title',
  }
}

function scratchFile() {
  return join(mkdtempSync(join(tmpdir(), 'grammar-taxonomy-')), 'taxonomy.json')
}

/**
 * taxonomy.json is the only copy of the curriculum decisions and, after the
 * l1Risk pass, of hours of the builder's judgment. These tests are about not
 * losing it.
 */
describe('writeGrammarContentAtomically', () => {
  it('writes content that reads back identically', () => {
    const path = scratchFile()
    const points = [row('definite-article-the'), row('zero-article')]

    writeGrammarContentAtomically(points, path)

    expect(loadGrammarContent(path)).toEqual(points)
  })

  it('ends the file with a newline so the git diff stays clean', () => {
    const path = scratchFile()

    writeGrammarContentAtomically([row('zero-article')], path)

    expect(readFileSync(path, 'utf8').endsWith('\n')).toBe(true)
  })

  it('leaves no temp file behind on success', () => {
    const path = scratchFile()

    writeGrammarContentAtomically([row('zero-article')], path)

    expect(existsSync(`${path}.tmp`)).toBe(false)
  })

  it('leaves the original intact and no temp behind when serialising throws', () => {
    // A circular structure fails inside JSON.stringify, i.e. after the write has
    // begun conceptually but before anything has replaced the target. This is
    // the interrupted-write case the rename exists for.
    const path = scratchFile()
    const original = [row('zero-article')]

    writeGrammarContentAtomically(original, path)

    const point = row('zero-article') as GrammarContentFile[number] & {
      self?: unknown
    }

    point.self = point

    const circular: GrammarContentFile = [point]

    expect(() => writeGrammarContentAtomically(circular, path)).toThrow()
    expect(loadGrammarContent(path)).toEqual(original)
    expect(existsSync(`${path}.tmp`)).toBe(false)
  })

  it('replaces a pre-existing file rather than appending to it', () => {
    const path = scratchFile()

    writeFileSync(path, '[{"slug":"stale"}]\n', 'utf8')
    writeGrammarContentAtomically([row('zero-article')], path)

    expect(loadGrammarContent(path)).toEqual([row('zero-article')])
  })
})
