import 'server-only'

import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'

/**
 * Minimal surface of the Video model the backfill needs. Declared as an
 * interface so tests can inject a mock without a live database.
 */
export interface BackfillVideoModel {
  estimatedDocumentCount(): Promise<number>
  countDocuments(filter: Record<string, unknown>): Promise<number>
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ modifiedCount?: number }>
}

export interface BackfillResult {
  scanned: number
  needing: number
  updated: number
  dryRun: boolean
}

// Videos imported before Chunk 2 lack the hierarchy fields entirely. Match any
// that are missing one, so the backfill is idempotent (a second run matches 0).
const NEEDS_BACKFILL_FILTER = {
  $or: [
    { topicId: { $exists: false } },
    { sectionId: { $exists: false } },
    { level: { $exists: false } },
  ],
}

/**
 * File pre-hierarchy videos into the no-topic / ungrouped state by explicitly
 * setting topicId/sectionId/level to null. Dry-run (default) mutates nothing and
 * only reports counts. Idempotent.
 */
export async function backfillContentHierarchy(
  opts: { dryRun: boolean },
  model: BackfillVideoModel = DictationVideoModel as unknown as BackfillVideoModel
): Promise<BackfillResult> {
  const [scanned, needing] = await Promise.all([
    model.estimatedDocumentCount(),
    model.countDocuments(NEEDS_BACKFILL_FILTER),
  ])

  if (opts.dryRun || needing === 0)
    return { scanned, needing, updated: 0, dryRun: opts.dryRun }

  const result = await model.updateMany(NEEDS_BACKFILL_FILTER, {
    $set: { topicId: null, sectionId: null, level: null },
  })

  return {
    scanned,
    needing,
    updated: result.modifiedCount ?? 0,
    dryRun: false,
  }
}
