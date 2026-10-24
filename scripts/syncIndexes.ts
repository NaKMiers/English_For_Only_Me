import mongoose, { connect, disconnect, type Model } from 'mongoose'

import { getMongoDbUri } from '@/constants/environments'
import { getManualSchemaConnectOptions } from '@/lib/db/connectDatabase'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationFavoriteModel } from '@/models/dictation/DictationFavoriteModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSectionModel } from '@/models/dictation/DictationSectionModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationTopicModel } from '@/models/dictation/DictationTopicModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { GrammarDrillAttemptModel } from '@/models/grammar/GrammarDrillAttemptModel'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { GrammarTestSessionModel } from '@/models/grammar/GrammarTestSessionModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'
import { UserModel } from '@/models/UserModel'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VocabOccurrenceModel } from '@/models/vocabulary/VocabOccurrenceModel'
import { VocabRecallAttemptModel } from '@/models/vocabulary/VocabRecallAttemptModel'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'

// Indexes are built explicitly below, never as a side effect of connecting,
// and no collection is created just because a model was compiled.
mongoose.set('autoIndex', false)
mongoose.set('autoCreate', false)

/**
 * Build every index the schemas declare. Production connects with autoIndex
 * off (see connectDatabase), so this is how new indexes reach the database.
 *
 * ADDITIVE ONLY. It calls Model.createIndexes(), never Model.syncIndexes(),
 * because syncIndexes DROPS every index the schema no longer declares, and an
 * index dropped by surprise can turn a hot query into a collection scan.
 * Indexes present in the database but not in the schema are only reported;
 * drop them with a dedicated script (see dropStaleGrammarIndexes.ts).
 *
 * DRY-RUN by default - prints what would be created. Pass --apply to build.
 * The script connects with autoCreate and autoIndex off in every environment
 * (getManualSchemaConnectOptions), so a dry run creates no collection either;
 * only --apply writes, through createIndexes.
 * A unique index that fails on duplicate data is reported (by name, with a
 * dedupe hint) and skipped; the model's other indexes and the other models
 * still build, and the exit code is 1. Nothing is ever deduped or dropped here.
 *
 *   bun run db:sync-indexes           # dry run, writes nothing
 *   bun run db:sync-indexes --apply   # creates the missing indexes
 */
const MODELS: Model<never>[] = [
  DictationAttemptModel,
  DictationDebriefModel,
  DictationFavoriteModel,
  DictationReviewItemModel,
  DictationSectionModel,
  DictationSegmentModel,
  DictationSessionModel,
  DictationTopicModel,
  DictationTranscriptModel,
  DictationVideoModel,
  GrammarDrillAttemptModel,
  GrammarPointModel,
  GrammarTestSessionModel,
  UserGrammarItemModel,
  UserModel,
  UserVocabItemModel,
  VocabEntryModel,
  VocabOccurrenceModel,
  VocabRecallAttemptModel,
] as unknown as Model<never>[]

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/** Where to look before rerunning, for the unique indexes known to need it. */
function getDedupeHint(collection: string, index: string) {
  if (collection === 'dictationreviewitems')
    return (
      'more than one due/scheduled item for the same userId, segmentId, ' +
      'kind and reason; keep one per group and set the others to ' +
      '"dismissed"'
    )

  return `find the documents sharing the key of ${index}`
}

async function listIndexNames(model: Model<never>) {
  try {
    const indexes = await model.collection.indexes()
    return new Set(indexes.map(index => String(index.name)))
  } catch {
    // The collection does not exist yet; createIndexes will create it.
    return new Set<string>()
  }
}

async function syncModel(model: Model<never>, apply: boolean) {
  const name = model.collection.collectionName
  const diff = await model.diffIndexes().catch(() => null)

  if (diff?.toDrop.length)
    console.info(
      `[${name}] not in schema (left alone): ${diff.toDrop.join(', ')}`
    )

  const toCreate = diff
    ? diff.toCreate.map(spec => JSON.stringify(spec))
    : ['(collection missing - all declared indexes)']

  if (!toCreate.length) {
    console.info(`[${name}] up to date`)
    return
  }

  if (!apply) {
    console.info(`[${name}] would create: ${toCreate.join(', ')}`)
    return
  }

  const before = await listIndexNames(model)
  const failed: string[] = []
  // Mongoose builds a model's indexes one by one and keeps going after a
  // failure, but it also emits 'error' on the model, which throws when nothing
  // listens and aborts the remaining builds. Listening turns that into a
  // report: every index is attempted, each failure is named, and the model
  // still fails at the end (exit code 1).
  const onIndexDone = (
    error: unknown,
    fields: Record<string, unknown>,
    options: { name?: string }
  ) => {
    if (!error) return

    const label = options?.name ?? JSON.stringify(fields)

    failed.push(label)
    console.error(
      isDuplicateKeyError(error)
        ? `[${name}] unique index ${label} NOT built: existing documents ` +
            'already break it (E11000). Nothing was changed; dedupe them ' +
            `(${getDedupeHint(name, label)}), then rerun --apply. ` +
            describeError(error)
        : `[${name}] index ${label} NOT built: ${describeError(error)}`
    )
  }
  const onModelError = () => {
    // Already reported per index by onIndexDone.
  }

  model.on('index-single-done', onIndexDone)
  model.on('error', onModelError)

  let buildError: unknown = null

  try {
    await model.createIndexes()
  } catch (error) {
    buildError = error
  } finally {
    model.off('index-single-done', onIndexDone)
    model.off('error', onModelError)
  }

  const after = await listIndexNames(model)
  const created = [...after].filter(index => !before.has(index))

  console.info(
    `[${name}] created: ${created.length ? created.join(', ') : '(none)'}`
  )

  if (buildError)
    throw new Error(
      `${failed.length || 1} index build(s) failed: ${failed.join(', ')}`,
      { cause: buildError }
    )
}

async function main() {
  const apply = process.argv.includes('--apply')

  await connect(getMongoDbUri(), getManualSchemaConnectOptions())

  console.info(apply ? 'Creating missing indexes.' : 'Dry run (pass --apply).')

  let failures = 0

  for (const model of MODELS)
    try {
      await syncModel(model, apply)
    } catch (error) {
      failures += 1
      console.error(`[${model.collection.collectionName}] failed`, error)
    }

  await disconnect()

  if (failures) process.exit(1)
}

main().catch(error => {
  console.error('Failed to sync indexes', error)
  process.exit(1)
})
