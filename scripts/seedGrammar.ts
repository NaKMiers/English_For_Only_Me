import { disconnect } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import {
  GRAMMAR_L1_RISK_RANK,
  GRAMMAR_SEED_SOURCE,
} from '@/modules/grammar/constants'
import {
  loadGrammarContent,
  loadSeededSlugs,
  saveSeededSlugs,
} from '@/modules/grammar/seed/loadGrammarContent'
import { validateGrammarContent } from '@/modules/grammar/seed/validateGrammarContent'

/**
 * Load the validated content file into MongoDB.
 *
 * Idempotent, and deliberately NON-destructive on two fields:
 *
 *   reviewStatus     - a human marked this lesson reviewed. Regenerating the
 *                      body must not silently reset that to unverified.
 *   acceptedAnswers  - a human accepted a wording as valid during practice.
 *                      Overwriting it means the learner gets marked wrong on a
 *                      sentence they already approved, which is the fastest way
 *                      to stop trusting the grader.
 *
 * The other half of that contract is `grammar:export`, which carries those
 * human edits back into the committed JSON so they land in git.
 */
async function main() {
  const points = loadGrammarContent()
  const validation = validateGrammarContent({
    points,
    previouslySeededSlugs: loadSeededSlugs(),
  })

  if (!validation.ok) {
    console.error(
      `Refusing to seed: grammar:validate found ${validation.issues.length} issue(s). Run "bun run grammar:validate" for detail.`
    )
    process.exit(1)
  }

  await connectDatabase()

  const existing = await GrammarPointModel.find({})
    .select('slug reviewStatus reviewedAt drills')
    .lean()
  const existingBySlug = new Map(existing.map(point => [point.slug, point]))

  let inserted = 0
  let updated = 0
  let preservedAnswers = 0

  for (const point of points) {
    const prior = existingBySlug.get(point.slug)

    // Carry forward hand-accepted answers per drill id.
    const drills = (point.drills ?? []).map(drill => {
      const priorDrill = prior?.drills?.find(
        candidate => candidate.id === drill.id
      )
      const priorAccepted = priorDrill?.acceptedAnswers ?? []
      const merged = [
        ...new Set([...(drill.acceptedAnswers ?? []), ...priorAccepted]),
      ]

      if (merged.length > (drill.acceptedAnswers ?? []).length)
        preservedAnswers += merged.length - (drill.acceptedAnswers ?? []).length

      return { ...drill, acceptedAnswers: merged }
    })

    const update = {
      ...point,
      drills,
      // Sortable rank derived from the enum. Mongo cannot order the string
      // enum semantically, so the browse sort depends on this being written.
      l1RiskRank: GRAMMAR_L1_RISK_RANK[point.l1Risk] ?? 2,
      seedSource: GRAMMAR_SEED_SOURCE,
      // A human review survives regeneration.
      ...(prior?.reviewStatus === 'reviewed'
        ? { reviewStatus: 'reviewed', reviewedAt: prior.reviewedAt }
        : {}),
    }

    await GrammarPointModel.updateOne(
      { slug: point.slug },
      { $set: update },
      { upsert: true }
    )

    if (prior) updated += 1
    else inserted += 1
  }

  const seededSlugs = saveSeededSlugs([
    ...loadSeededSlugs(),
    ...points.map(point => point.slug),
  ])

  console.info(
    `Seeded grammar: ${inserted} inserted, ${updated} updated, ${preservedAnswers} accepted answer(s) preserved. Lockfile now tracks ${seededSlugs.length} slugs.`
  )

  await disconnect()
}

main().catch(error => {
  console.error('Failed to seed grammar', error)
  process.exit(1)
})
