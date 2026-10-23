import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { describe, expect, test } from 'vitest'

const SRC = join(process.cwd(), 'src')

// Files allowed to contain the pattern. This file names it to search for it;
// utils.test.ts asserts that a sticker role replaces it in `cn`.
const ALLOWLIST = new Set([
  'src/lib/styleGuards.test.ts',
  'src/lib/utils.test.ts',
])

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

describe('sticker corners guard', () => {
  // Stops square corners coming back through copy-paste. It does NOT catch a
  // bordered block that simply has no radius class; that is a visual check.
  test('no source file uses rounded-none', () => {
    const offenders = sourceFiles(SRC).flatMap(file => {
      const path = relative(process.cwd(), file).split(sep).join('/')
      if (ALLOWLIST.has(path)) return []
      return readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          line.includes('rounded-none') ? [`${path}:${index + 1}`] : []
        )
    })

    expect(offenders).toEqual([])
  })
})
