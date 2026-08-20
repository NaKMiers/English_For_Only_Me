import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import {
  loadGrammarContent,
  saveGrammarContent,
} from '@/modules/grammar/seed/loadGrammarContent'

/**
 * The write-back leg of the content pipeline.
 *
 * Without this, human edits made through the admin panel live only in MongoDB,
 * and the next `grammar:seed` after a regeneration destroys them - silently,
 * with the learner most likely blaming the grading logic rather than the seed
 * script. This pulls them back into the committed JSON so they land in git and
 * survive regeneration.
 *
 * Conflict rule when both sides changed since the last sync:
 *   human-edited fields  -> database wins  (reviewStatus, acceptedAnswers)
 *   generated fields     -> file wins      (explanation, examples, drills text)
 *
 * That split is deliberate. The database is where humans express intent; the
 * file is where the generator writes. Neither should be able to clobber the
 * other's territory.
 */
async function main() {
  await connectDatabase()

  const filePoints = loadGrammarContent()
  const dbPoints = await GrammarPointModel.find({})
    .select('slug reviewStatus reviewedAt drills')
    .lean()
  const dbBySlug = new Map(dbPoints.map(point => [point.slug, point]))

  let reviewChanges = 0
  let answerChanges = 0

  const merged = filePoints.map(point => {
    const dbPoint = dbBySlug.get(point.slug)

    if (!dbPoint) return point

    const next = { ...point }

    // Human-edited: database wins.
    if (dbPoint.reviewStatus && dbPoint.reviewStatus !== point.reviewStatus) {
      next.reviewStatus = dbPoint.reviewStatus
      next.reviewedAt = dbPoint.reviewedAt
        ? dbPoint.reviewedAt.toISOString()
        : null
      reviewChanges += 1
    }

    if (point.drills?.length)
      next.drills = point.drills.map(drill => {
        const dbDrill = dbPoint.drills?.find(
          candidate => candidate.id === drill.id
        )

        if (!dbDrill?.acceptedAnswers?.length) return drill

        const union = [
          ...new Set([
            ...(drill.acceptedAnswers ?? []),
            ...dbDrill.acceptedAnswers,
          ]),
        ]

        if (union.length !== (drill.acceptedAnswers ?? []).length)
          answerChanges += 1

        return { ...drill, acceptedAnswers: union }
      })

    return next
  })

  saveGrammarContent(merged)

  console.info(
    `Exported grammar content: ${reviewChanges} review status change(s), ${answerChanges} drill(s) gained accepted answers. Commit the diff to keep them.`
  )

  await disconnect()
}

main().catch(error => {
  console.error('Failed to export grammar content', error)
  process.exit(1)
})
