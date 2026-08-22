import { generateLessonBody } from '@/modules/grammar/seed/generateLessonBody'
import {
  loadGrammarContent,
  loadSeededSlugs,
  saveGrammarContent,
} from '@/modules/grammar/seed/loadGrammarContent'
import {
  applyFillBlankCues,
  proposeFillBlankCues,
} from '@/modules/grammar/seed/cueFillBlankPrompts'
import {
  applyPunctuationFlags,
  proposePunctuationFlags,
} from '@/modules/grammar/seed/resolvePunctuationFlags'
import {
  applyBlankTargetTrims,
  proposeBlankTargetTrims,
} from '@/modules/grammar/seed/trimBlankTargets'
import { validateGrammarContent } from '@/modules/grammar/seed/validateGrammarContent'
import type { GrammarContentFile } from '@/modules/grammar/types'

const CHUNK_SIZE = 5

/**
 * Failures that will never succeed on retry, so the run must stop rather than
 * work through the rest of the taxonomy.
 *
 * Without this the script iterated 50 points against an exhausted API balance,
 * reporting only a running failure count, and would have attempted all 156. The
 * reason was printed once at the very end - so the one piece of information that
 * explained everything arrived after the run, and only if you waited for it.
 */
const TERMINAL_FAILURE_PATTERNS = [
  'no credits remaining',
  'insufficient_quota',
  'exceeded your current quota',
  'incorrect api key',
  'invalid_api_key',
  'is not configured',
  'does not have access to model',
  'model_not_found',
]

function isTerminalFailure(message: string) {
  const lowered = message.toLowerCase()

  return TERMINAL_FAILURE_PATTERNS.some(pattern => lowered.includes(pattern))
}

/**
 * Fill in lesson bodies for taxonomy rows that do not have one yet.
 *
 * Batched and resumable, in the same shape as `enrichVocabularyBatch.ts`:
 * writes after every chunk and skips points that already have a body. 162
 * lesson bodies plus roughly 1,500 drills is a large enough job that a mid-run
 * failure must not cost the whole pass.
 *
 * Usage:
 *   bun run grammar:generate            # all unwritten points
 *   bun run grammar:generate 20         # at most 20 points this run
 *   bun run grammar:generate zero-article   # one specific slug
 *   bun run grammar:generate --repair   # rewrite points that FAIL validation
 *   bun run grammar:generate --repair 8 # at most 8 of those
 *   bun run grammar:generate --stale-contrasts  # backfill minimalPairs
 *   bun run grammar:generate --punctuation-flags       # dry run, prints flips
 *   bun run grammar:generate --punctuation-flags --write  # writes them
 *   bun run grammar:generate --cue-blanks              # dry run, prints cues
 *   bun run grammar:generate --cue-blanks --write      # writes them
 *   bun run grammar:generate --trim-blanks             # dry run, prints trims
 *   bun run grammar:generate --trim-blanks --write     # writes them
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const limitArg = args.find(arg => /^\d+$/.test(arg))
  // Slugs must contain a letter. Without that, `[a-z0-9]+` also matches a bare
  // number, so `grammar:generate 3` parsed "3" as BOTH the limit and a slug -
  // and the slug branch won, searching for a point named "3", finding none, and
  // reporting "nothing to do" while 177 points still had no body.
  const slugArg = args.find(
    arg => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(arg) && /[a-z]/.test(arg)
  )

  return {
    cueBlanks: args.includes('--cue-blanks'),
    trimBlanks: args.includes('--trim-blanks'),
    limit: limitArg ? Number(limitArg) : Number.POSITIVE_INFINITY,
    punctuationFlags: args.includes('--punctuation-flags'),
    repair: args.includes('--repair'),
    slug: slugArg ?? null,
    staleContrasts: args.includes('--stale-contrasts'),
    write: args.includes('--write'),
  }
}

/**
 * Give unanswerable fill-blank drills the cue they are missing.
 *
 * A blank whose answer is a function word is a grammar question:
 * "She ___ not drink tea" has one answer. A blank whose answer is a verb or
 * noun the sentence never mentions is a guessing game: "I ___ football
 * yesterday" is equally "played", "watched" or "missed", and only the author
 * knows. This appends the target's dictionary form, which is the format every
 * coursebook uses and the difference between a hard question and an impossible
 * one.
 *
 * Local, deterministic, no API key. DRY RUN BY DEFAULT, because it rewrites
 * committed prompts and the lemma of an inflected word is worth a human's eye
 * before it lands.
 */
function runCueBlanks({ write }: { write: boolean }) {
  const points = loadGrammarContent()
  const { proposals, skipped } = proposeFillBlankCues(points)

  if (proposals.length === 0 && skipped.length === 0) {
    console.info(
      'grammar:generate --cue-blanks - nothing to cue. Every fill-blank is answerable from its own prompt.'
    )
    return
  }

  console.info(
    `grammar:generate --cue-blanks - ${proposals.length} unanswerable fill-blank(s) would get a cue:\n`
  )

  for (const proposal of proposals)
    console.info(
      `  ${proposal.slug} / ${proposal.drillId}   [${proposal.target}]\n    - ${proposal.prompt}\n    + ${proposal.nextPrompt}`
    )

  if (skipped.length > 0) {
    console.info(
      `\n${skipped.length} drill(s) NEEDED a cue but could not be given one safely. A wrong cue is worse than none, so these want a human:\n`
    )

    for (const entry of skipped)
      console.info(
        `  ${entry.slug} / ${entry.drillId}   [${entry.target}]\n    ${entry.prompt}\n    why: ${entry.reason}`
      )
  }

  if (!write) {
    console.info(
      '\nDry run. Re-run with --write to apply, after reading the list above.'
    )
    return
  }

  saveGrammarContent(applyFillBlankCues(points, proposals))
  console.info(`\nWrote ${proposals.length} cue(s) to the content file.`)
}

/**
 * One-time backfill of `punctuationSensitive` on existing drills.
 *
 * Lives in this script rather than its own because it is the same job - making
 * committed content correct - and it needs no API key, so it runs instantly and
 * offline.
 *
 * DRY RUN BY DEFAULT. This changes how ~1800 drills are graded, and the
 * derivation it uses (family plus lesson text plus target shape) is a heuristic
 * that a human should read before it lands. `--write` is the second step, after
 * you have looked at the list.
 */
function runPunctuationFlags({ write }: { write: boolean }) {
  const points = loadGrammarContent()
  const proposals = proposePunctuationFlags(points)

  if (proposals.length === 0) {
    console.info(
      'grammar:generate --punctuation-flags - nothing to flag. Every drill that teaches a mark already has an explicit decision.'
    )
    return
  }

  console.info(
    `grammar:generate --punctuation-flags - ${proposals.length} drill(s) would be graded punctuation-strictly:\n`
  )

  for (const proposal of proposals)
    console.info(
      `  ${proposal.slug} / ${proposal.drillId}  (${proposal.reason})\n    ${proposal.target}`
    )

  if (!write) {
    console.info(
      '\nDry run. Re-run with --write to apply, after reading the list above.'
    )
    return
  }

  saveGrammarContent(applyPunctuationFlags(points, proposals))
  console.info(`\nWrote ${proposals.length} flag(s) to the content file.`)
}

/**
 * Points written before `minimalPairs` existed.
 *
 * A point with a `contrastsWith` value is where the contrast is most likely to
 * be one of meaning rather than correctness, and those are exactly the lessons
 * that had to force "stop to smoke" versus "stop smoking" into a wrong/right
 * pair - contradicting their own explanation. Selecting on "has a body, has a
 * contrast, has no minimalPairs" targets that generation gap precisely, instead
 * of rewriting every point to fix a subset.
 */
function hasStaleContrast(point: GrammarContentFile[number]) {
  if (point.mergedInto) return false
  if (!point.explanation?.trim()) return false
  if (!point.contrastsWith?.length) return false

  return !point.minimalPairs?.length
}

/**
 * Group current validation failures by slug.
 *
 * Repair exists because `needsBody` deliberately skips points that already have
 * a body, so a plain re-run cannot touch a point that generated but failed
 * validation - the only recourse was deleting its fields by hand. With most of
 * the taxonomy still to write and a meaningful share of each batch failing on
 * prompt adherence rather than knowledge, that was the slowest step in the loop.
 */
function collectFailuresBySlug(points: GrammarContentFile) {
  const validation = validateGrammarContent({
    points,
    previouslySeededSlugs: loadSeededSlugs(),
  })
  const bySlug = new Map<string, string[]>()

  for (const issue of validation.issues) {
    if (!issue.slug) continue

    bySlug.set(issue.slug, [...(bySlug.get(issue.slug) ?? []), issue.message])
  }

  return bySlug
}

function needsBody(point: GrammarContentFile[number]) {
  if (point.mergedInto) return false

  return !point.explanation?.trim()
}

/**
 * Generate the most valuable points FIRST.
 *
 * This matters because generation is budget-constrained in practice: an API
 * balance can run out, or you may deliberately generate in batches. Without an
 * ordering, a partial run returns whatever happens to sit at the top of the
 * taxonomy file, which is meaningless. With it, a run that stops early still
 * leaves you the points most likely to cost you marks.
 *
 * Same ordering as the browse sort: highest L1 interference, then hardest, then
 * earliest CEFR level - so beginner-level-but-brutal points (articles, plural
 * -s, present perfect) get written before C1 points that are mechanically easy.
 */
function byGenerationValue(
  left: GrammarContentFile[number],
  right: GrammarContentFile[number]
) {
  const rank = { high: 3, low: 1, medium: 2 } as const
  const riskDelta =
    (rank[right.l1Risk as keyof typeof rank] ?? 2) -
    (rank[left.l1Risk as keyof typeof rank] ?? 2)

  if (riskDelta !== 0) return riskDelta
  if (right.complexity !== left.complexity)
    return right.complexity - left.complexity

  return left.cefrLevel.localeCompare(right.cefrLevel)
}

/**
 * Make fill-blank targets the size of their own blank.
 *
 * "The car ____ repaired." with target "has been repaired" is ungradeable: the
 * learner writes "has been", which is the only thing the gap can hold, and the
 * grader compares it against a string carrying the participle a second time.
 * The prompt states exactly which words are already on the page, so the trim is
 * mechanical.
 *
 * DRY RUN BY DEFAULT - it changes what counts as a correct answer.
 */
function runTrimBlanks({ write }: { write: boolean }) {
  const points = loadGrammarContent()
  const { proposals, skipped } = proposeBlankTargetTrims(points)

  if (proposals.length === 0 && skipped.length === 0) {
    console.info(
      'grammar:generate --trim-blanks - nothing to trim. Every fill-blank target is the size of its blank.'
    )
    return
  }

  console.info(
    `grammar:generate --trim-blanks - ${proposals.length} target(s) are bigger than their blank:\n`
  )

  for (const proposal of proposals)
    console.info(
      `  ${proposal.slug} / ${proposal.drillId}\n    ${proposal.prompt}\n    - ${proposal.target}\n    + ${proposal.nextTarget}`
    )

  if (skipped.length > 0) {
    console.info(
      `\n${skipped.length} drill(s) need a human - the prompt repeats the answer rather than framing it:\n`
    )

    for (const entry of skipped)
      console.info(
        `  ${entry.slug} / ${entry.drillId}\n    ${entry.prompt}   -> ${entry.target}\n    why: ${entry.reason}`
      )
  }

  if (!write) {
    console.info(
      '\nDry run. Re-run with --write to apply, after reading the list above.'
    )
    return
  }

  saveGrammarContent(applyBlankTargetTrims(points, proposals))
  console.info(`\nTrimmed ${proposals.length} target(s).`)
}

async function main() {
  const {
    cueBlanks,
    trimBlanks,
    limit,
    punctuationFlags,
    repair,
    slug,
    staleContrasts,
    write,
  } = parseArgs()

  // Local transforms, no API key, no network. These return before anything
  // below touches a provider.
  if (punctuationFlags) {
    runPunctuationFlags({ write })
    return
  }

  if (cueBlanks) {
    runCueBlanks({ write })
    return
  }

  if (trimBlanks) {
    runTrimBlanks({ write })
    return
  }

  const points = loadGrammarContent()
  const failuresBySlug = repair
    ? collectFailuresBySlug(points)
    : new Map<string, string[]>()

  const selects = (point: GrammarContentFile[number]) => {
    if (slug) return point.slug === slug
    if (repair) return failuresBySlug.has(point.slug)
    if (staleContrasts) return hasStaleContrast(point)

    return needsBody(point)
  }

  const targets = points.filter(selects).sort(byGenerationValue)

  if (targets.length === 0) {
    // Distinguish the reasons for an empty target list. A typo'd slug reporting
    // "every point has a body" is how the arg-parsing bug above stayed
    // invisible.
    console.info(
      slug
        ? `grammar:generate - no point matches slug "${slug}". Nothing written.`
        : repair
          ? 'grammar:generate --repair - nothing to repair, every point passes validation.'
          : staleContrasts
            ? 'grammar:generate --stale-contrasts - nothing stale, every contrast point has minimalPairs.'
            : 'grammar:generate - nothing to do, every point has a body.'
    )
    return
  }

  const capped = targets.slice(0, Number.isFinite(limit) ? limit : undefined)

  console.info(
    `grammar:generate${repair ? ' --repair' : ''}${staleContrasts ? ' --stale-contrasts' : ''} - ${capped.length} of ${targets.length} point(s) to write, in chunks of ${CHUNK_SIZE}.`
  )

  let written = 0
  let inputTokens = 0
  let outputTokens = 0
  let emptyChunks = 0
  let aborted: string | null = null
  const failures: string[] = []

  for (let index = 0; index < capped.length; index += CHUNK_SIZE) {
    const chunk = capped.slice(index, index + CHUNK_SIZE)
    const results = await Promise.all(
      chunk.map(async point => ({
        point,
        result: await generateLessonBody({
          issues: failuresBySlug.get(point.slug),
          point,
        }),
      }))
    )

    let writtenThisChunk = 0

    for (const { point, result } of results) {
      if (!result.ok) {
        failures.push(`${point.slug}: ${result.message}`)

        if (!aborted && isTerminalFailure(result.message))
          aborted = result.message

        continue
      }

      // Report real token spend rather than an estimate. This run is
      // budget-constrained, and a truncated response is billed just like a
      // successful one, so guessing from the dashboard afterwards is too slow a
      // feedback loop to steer by.
      inputTokens += result.usage?.inputTokens ?? 0
      outputTokens += result.usage?.outputTokens ?? 0

      const target = points.find(candidate => candidate.slug === point.slug)

      if (!target) continue

      Object.assign(target, result.body, {
        reviewStatus: 'unverified',
        reviewedAt: null,
      })
      written += 1
      writtenThisChunk += 1
    }

    // Write after every chunk so a later failure never loses earlier work.
    saveGrammarContent(points)

    emptyChunks = writtenThisChunk === 0 ? emptyChunks + 1 : 0

    console.info(
      `  chunk ${Math.floor(index / CHUNK_SIZE) + 1}: ${written} written so far, ${failures.length} failed.`
    )

    // Surface the reason NOW, not in the end-of-run summary. A running failure
    // count with no cause is indistinguishable from slow progress.
    if (writtenThisChunk === 0 && failures.length > 0)
      console.warn(`    last failure: ${failures[failures.length - 1]}`)

    if (aborted) {
      console.error(
        `\nStopping: this failure cannot succeed on retry.\n  ${aborted}`
      )
      break
    }

    /**
     * Two consecutive chunks with nothing written is systemic, not bad luck.
     * Continuing means one wasted request per remaining point, and on a metered
     * API a wasted request can still be a billed one.
     */
    if (emptyChunks >= 2) {
      console.error(
        `\nStopping: ${emptyChunks * CHUNK_SIZE} consecutive failures with nothing written. Fix the cause above and re-run - completed points are skipped automatically.`
      )
      break
    }
  }

  const validation = validateGrammarContent({
    points,
    previouslySeededSlugs: loadSeededSlugs(),
  })

  console.info(
    `\ngrammar:generate done - ${written} written, ${failures.length} failed.`
  )
  console.info(
    // Average over successes, not attempts. Dividing by attempts lets a batch of
    // zero-token failures halve the reported per-point cost, which is exactly
    // the number you would use to budget the next run.
    `tokens: ${inputTokens} in, ${outputTokens} out${
      written > 0
        ? ` (~${Math.round(outputTokens / written)} out per written point, ${targets.length - written} ${repair ? 'still failing' : 'still unwritten'})`
        : ''
    }`
  )

  // Collapse repeated messages. One systemic cause produced 50 identical lines,
  // which buried the count it was meant to explain.
  const failureCounts = new Map<string, number>()

  for (const failure of failures) {
    const message = failure.slice(failure.indexOf(': ') + 2)

    failureCounts.set(message, (failureCounts.get(message) ?? 0) + 1)
  }

  for (const [message, count] of failureCounts)
    console.warn(`  FAILED x${count}: ${message}`)

  if (aborted || (written === 0 && failures.length > 0)) process.exit(1)

  if (!validation.ok) {
    console.error(
      `\nGenerated content does NOT pass grammar:validate (${validation.issues.length} issue(s)). Run "bun run grammar:generate --repair" to rewrite just the failing points.`
    )
    process.exit(1)
  }

  console.info('Generated content passes grammar:validate.')
}

main().catch(error => {
  console.error('Failed to generate grammar content', error)
  process.exit(1)
})
