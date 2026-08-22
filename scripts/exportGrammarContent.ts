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
 *
 * This is ALSO the promotion path for test-generated drills. The on-demand test
 * appends AI-authored drills to the point with `generated: true`, and while that
 * flag is set they are quarantined: `selectDrillForStage` will not serve them in
 * recall and `validateGrammarContent` will not count them toward the 8/12-drill
 * quality floors. Carrying them into the committed file here is what makes them
 * reviewable in a diff - and clearing the flag by hand, in that diff, is what
 * promotes one into real content. Promotion stays a human act; taking a test is
 * not consent to change the curriculum.
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
  let generatedCarried = 0

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

    /**
     * Test-generated drills the file has never seen.
     *
     * Matched by id and appended rather than merged, because they exist only in
     * the database - the generator never wrote them, so there is nothing in the
     * file to reconcile against. They arrive still carrying `generated: true`,
     * which is what keeps them out of recall and out of the validator's drill
     * counts until a human clears the flag in the diff.
     */
    const fileDrillIds = new Set((next.drills ?? []).map(drill => drill.id))
    const carried = (dbPoint.drills ?? []).filter(
      drill => drill.generated && !fileDrillIds.has(drill.id)
    )

    if (carried.length > 0) {
      next.drills = [
        ...(next.drills ?? []),
        ...carried.map(drill => ({
          acceptedAnswers: drill.acceptedAnswers ?? [],
          choices: drill.choices?.length ? drill.choices : null,
          difficulty: drill.difficulty as 1 | 2 | 3,
          explanation: drill.explanation,
          generated: true,
          id: drill.id,
          kind: drill.kind,
          prompt: drill.prompt,
          ...(drill.punctuationSensitive === true
            ? { punctuationSensitive: true }
            : {}),
          target: drill.target,
        })),
      ]
      generatedCarried += carried.length
    }

    return next
  })

  saveGrammarContent(merged)

  console.info(
    `Exported grammar content: ${reviewChanges} review status change(s), ${answerChanges} drill(s) gained accepted answers, ${generatedCarried} test-generated drill(s) carried in. Commit the diff to keep them.`
  )

  if (generatedCarried > 0)
    console.info(
      `Those ${generatedCarried} drill(s) still have "generated": true, so recall will not serve them and grammar:validate will not count them. Read them in the diff and delete that flag on the ones worth keeping.`
    )

  await disconnect()
}

main().catch(error => {
  console.error('Failed to export grammar content', error)
  process.exit(1)
})
