import { checkTest } from '@/modules/ielts/consistency/checkTest'
import {
  IELTS_SECTION_KEYS,
  type IeltsSectionKey,
} from '@/modules/ielts/constants'
import type { IeltsJobKind } from '@/modules/ielts/generation/aiSchemas'
import {
  messagesFor,
  openAiRequester,
} from '@/modules/ielts/generation/generationService'
import { runSectionJob } from '@/modules/ielts/generation/runSectionJob'
import type { IeltsSection } from '@/modules/ielts/schema'
import { emptySection } from '@/modules/ielts/tests/emptySections'

/**
 * Manual generation eval (calls OpenAI for real, costs money, not in CI).
 * Generates the given sections in memory, one draft step plus at most one
 * repair each, and reports pass rate and tokens. Nothing is written to the
 * database. Record the result in .prompts/ielts-testing/eval-baseline.md.
 *
 *   bun run ielts:eval-generation                      # reading-1, listening-1, writing-1
 *   bun run ielts:eval-generation -- reading-2 writing-2
 */
const DEFAULT_KEYS: IeltsSectionKey[] = [
  'reading-1',
  'listening-1',
  'writing-1',
]

function stepsFor(key: IeltsSectionKey): IeltsJobKind[] {
  if (key.startsWith('reading')) return ['reading-section']
  if (key.startsWith('writing')) return ['writing-task']

  return ['listening-script', 'listening-questions']
}

async function main() {
  const requested = process.argv
    .slice(2)
    .filter(arg => (IELTS_SECTION_KEYS as readonly string[]).includes(arg))
  const keys = (
    requested.length ? requested : DEFAULT_KEYS
  ) as IeltsSectionKey[]
  const request = openAiRequester()
  const rows: string[] = []
  let passed = 0
  let tokens = 0

  for (const key of keys) {
    let section: IeltsSection = emptySection(key, 'pending')
    let ok = true
    const started = Date.now()

    for (const kind of stepsFor(key)) {
      const context = {
        key,
        track: 'academic' as const,
        targetBand: 6.5,
        topic: null,
        otherTitles: [],
      }
      const messages = messagesFor(kind, context, section)
      let result = await runSectionJob({ kind, messages, request, section })
      let repaired = false

      tokens +=
        (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0)

      if (result.outcome === 'needsRepair') {
        repaired = true
        result = await runSectionJob({
          kind,
          messages,
          request,
          section,
          repair: { rawText: result.rawText, issues: result.issues },
        })
        tokens +=
          (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0)
      }

      rows.push(
        `${key} ${kind}: ${result.outcome}${repaired ? ' (after repair)' : ''}${result.error ? ` - ${result.error}` : ''}`
      )

      if (result.outcome !== 'ok' || !result.input) {
        ok = false
        break
      }

      section = { ...section, ...result.input }
    }

    if (ok) {
      const report = checkTest({
        slug: 'eval',
        version: 1,
        status: 'draft',
        source: 'ai',
        title: 'eval',
        series: '',
        track: 'academic',
        targetBand: 6.5,
        tags: [],
        description: '',
        sections: [section],
      })
      const sectionErrors = report.errors.filter(
        issue => issue.rule !== 'numbering_contiguous'
      )

      if (!sectionErrors.length) passed++
      rows.push(
        `${key}: ${sectionErrors.length} errors, ${report.warnings.length} warnings, ${((Date.now() - started) / 1000).toFixed(0)} s`
      )
    }
  }

  console.info(rows.join('\n'))
  console.info(
    `\nPassed ${passed}/${keys.length} sections. Tokens: ${tokens}. Model: ${process.env.OPENAI_IELTS_GENERATION_MODEL ?? 'default'}.`
  )
}

main().catch(error => {
  console.error('IELTS generation eval failed', error)
  process.exit(1)
})
