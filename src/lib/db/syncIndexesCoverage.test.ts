import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

const MODELS_DIR = join(process.cwd(), 'src', 'models')
const SYNC_SCRIPT = join(process.cwd(), 'scripts', 'syncIndexes.ts')

function modelNames(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return modelNames(path)
    if (!/Model\.ts$/.test(entry.name)) return []

    return [entry.name.replace(/\.ts$/, '')]
  })
}

describe('db:sync-indexes coverage', () => {
  // Production connects with autoIndex off, so an index only reaches the
  // database through scripts/syncIndexes.ts. A model missing from its list
  // silently runs without its unique and TTL indexes.
  test('every model under src/models is in the index sync list', () => {
    const script = readFileSync(SYNC_SCRIPT, 'utf8')
    const listed = script.slice(script.indexOf('const MODELS'))
    const missing = modelNames(MODELS_DIR).filter(
      name => !new RegExp(`\\b${name},`).test(listed)
    )

    expect(missing).toEqual([])
  })
})
