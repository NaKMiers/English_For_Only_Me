import {
  readFileSync,
  existsSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { GrammarContentFile } from '@/modules/grammar/types'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), 'data')

export const TAXONOMY_PATH = join(DATA_DIR, 'taxonomy.json')

/**
 * Slugs that have already been seeded into a database at some point.
 *
 * Kept as a committed lockfile rather than read from Mongo so that
 * `grammar:validate` works with no database configured and so the history is
 * diffable in git. `grammar:seed` appends to it; `grammar:validate` uses it to
 * fail the build when a slug disappears without a `mergedInto` redirect, which
 * is what stops a taxonomy merge from silently orphaning learner progress.
 */
export const SEEDED_SLUGS_PATH = join(DATA_DIR, 'seeded-slugs.json')

export function loadGrammarContent(path = TAXONOMY_PATH): GrammarContentFile {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))

  if (!Array.isArray(parsed))
    throw new Error(`Grammar content at ${path} must be a JSON array.`)

  return parsed as GrammarContentFile
}

export function loadSeededSlugs(path = SEEDED_SLUGS_PATH): string[] {
  if (!existsSync(path)) return []

  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))

  if (!Array.isArray(parsed)) return []

  return parsed.filter((value): value is string => typeof value === 'string')
}

export function saveSeededSlugs(slugs: string[], path = SEEDED_SLUGS_PATH) {
  const unique = [...new Set(slugs)].sort()

  writeFileSync(path, `${JSON.stringify(unique, null, 2)}\n`, 'utf8')

  return unique
}

export function saveGrammarContent(
  points: GrammarContentFile,
  path = TAXONOMY_PATH
) {
  writeGrammarContentAtomically(points, path)
}

/**
 * Write the taxonomy through a temp file and rename over the target.
 *
 * `rename` within a directory is atomic at the filesystem level, so a process
 * killed mid-write leaves the original file byte-identical instead of truncated.
 * That matters more here than the size of the file suggests: taxonomy.json is
 * the only copy of hand-authored curriculum decisions plus, after the l1Risk
 * pass, hours of the builder's own judgment. A plain `writeFileSync` that dies
 * halfway destroys all of it.
 *
 * The temp file sits next to the target on purpose - a rename across
 * filesystems is not atomic.
 */
export function writeGrammarContentAtomically(
  points: GrammarContentFile,
  path = TAXONOMY_PATH
) {
  const temporaryPath = `${path}.tmp`

  try {
    writeFileSync(temporaryPath, `${JSON.stringify(points, null, 2)}\n`, 'utf8')
    renameSync(temporaryPath, path)
  } catch (error) {
    // Never leave a stray .tmp behind to be mistaken for real content.
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath)

    throw error
  }
}
