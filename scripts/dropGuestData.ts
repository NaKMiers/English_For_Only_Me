import mongoose, { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationFavoriteModel } from '@/models/dictation/DictationFavoriteModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { GrammarCardMissModel } from '@/models/grammar/GrammarCardMissModel'
import { GrammarLessonProgressModel } from '@/models/grammar/GrammarLessonProgressModel'
import { GrammarSessionModel } from '@/models/grammar/GrammarSessionModel'
import { GrammarUnitProgressModel } from '@/models/grammar/GrammarUnitProgressModel'
import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { IeltsGradingLedgerModel } from '@/models/ielts/IeltsGradingLedgerModel'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabOccurrenceModel } from '@/models/vocabulary/VocabOccurrenceModel'
import { VocabRecallAttemptModel } from '@/models/vocabulary/VocabRecallAttemptModel'

import {
  type GuestCleanupTarget,
  guestOwnerFilter,
  parseGuestCleanupArgs,
  planGuestCleanup,
} from './lib/guestCleanup'

/**
 * Delete the rows anonymous guests left behind before sign-in became required
 * (every owner id shaped `guest_...`). Nothing reads them any more.
 *
 * DRY-RUN by default: prints the database name and, per collection, how many
 * guest rows it holds. Run it only after the sign-in deploy is checked: the
 * delete cannot be undone.
 *
 *   bun run auth:drop-guest-data                      # dry run, writes nothing
 *   bun run auth:drop-guest-data --apply --i-am-sure  # deletes the rows
 */

const userOwned = [
  DictationSessionModel,
  DictationAttemptModel,
  DictationReviewItemModel,
  DictationDebriefModel,
  // Guests could not favorite; listed so a stray row cannot survive.
  DictationFavoriteModel,
  GrammarLessonProgressModel,
  GrammarUnitProgressModel,
  GrammarCardMissModel,
  GrammarSessionModel,
  UserVocabItemModel,
  VocabOccurrenceModel,
  VocabRecallAttemptModel,
]
const ownerOwned = [
  IeltsAttemptModel,
  // Guests could not grade, so this is expected to be 0.
  IeltsGradingLedgerModel,
]

const TARGETS: GuestCleanupTarget[] = [
  ...userOwned.map(model => ({
    collection: model.collection.name,
    ownerField: 'userId' as const,
  })),
  ...ownerOwned.map(model => ({
    collection: model.collection.name,
    ownerField: 'ownerId' as const,
  })),
]

async function main() {
  const { apply } = parseGuestCleanupArgs(process.argv.slice(2))

  await connectDatabase()

  const database = mongoose.connection.db

  if (!database) throw new Error('No database handle after connecting.')

  console.info(`Database: ${database.databaseName}`)

  const counts: Record<string, number> = {}

  for (const target of TARGETS)
    counts[target.collection] = await database
      .collection(target.collection)
      .countDocuments(guestOwnerFilter(target.ownerField))

  const plan = planGuestCleanup(TARGETS, counts, { apply })

  for (const step of plan.steps) {
    console.info(`  ${step.collection} (${step.ownerField}): ${step.count}`)

    if (!step.willDelete) continue

    const { deletedCount } = await database
      .collection(step.collection)
      .deleteMany(step.filter)

    console.info(`    -> deleted ${deletedCount}`)
  }

  console.info(`Total guest rows: ${plan.total}`)

  if (!apply)
    console.info('\nDry run. Re-run with --apply --i-am-sure to delete them.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => void disconnect())
