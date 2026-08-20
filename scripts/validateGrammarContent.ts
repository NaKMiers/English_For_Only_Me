import {
  loadGrammarContent,
  loadSeededSlugs,
} from '@/modules/grammar/seed/loadGrammarContent'
import { validateGrammarContent } from '@/modules/grammar/seed/validateGrammarContent'

/**
 * Gate for every downstream step. Written before the generator on purpose: the
 * validator is what makes bulk AI-generated grammar content safe to trust, and
 * a generator without one just produces plausible-looking wrong lessons at
 * scale.
 *
 * Also runs as a vitest case against the committed file, so `bun test` catches
 * content problems too. This CLI exists for the generate/seed pipeline.
 */
function main() {
  const points = loadGrammarContent()
  const previouslySeededSlugs = loadSeededSlugs()
  const result = validateGrammarContent({ points, previouslySeededSlugs })

  if (result.ok) {
    console.info(
      `grammar:validate OK - ${result.checkedPoints} points, ${previouslySeededSlugs.length} previously seeded slugs checked.`
    )
    return
  }

  console.error(
    `grammar:validate FAILED - ${result.issues.length} issue(s) across ${result.checkedPoints} points:\n`
  )

  const byRule = new Map<string, typeof result.issues>()

  for (const issue of result.issues) {
    const bucket = byRule.get(issue.rule) ?? []

    bucket.push(issue)
    byRule.set(issue.rule, bucket)
  }

  for (const [rule, issues] of [...byRule].sort()) {
    console.error(`  [${rule}] ${issues.length} issue(s)`)

    for (const issue of issues)
      console.error(`    - ${issue.slug ?? '(no slug)'}: ${issue.message}`)
  }

  process.exit(1)
}

main()
