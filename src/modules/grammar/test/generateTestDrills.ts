import {
  getOpenAiApiKey,
  getOpenAiGrammarModel,
} from '@/constants/environments'
import { requestOpenAiStructuredOutput } from '@/lib/ai/openAiClientCore'

import {
  GRAMMAR_DRILL_KINDS,
  GRAMMAR_TEST_GENERATION_CHUNK,
  GRAMMAR_TEST_TOKENS_PER_QUESTION,
} from '../constants'

import type { GrammarTestCandidate } from './types'
import {
  validateGeneratedDrill,
  type ValidatedGeneratedDrill,
} from './validateGeneratedDrill'

export interface GeneratedQuestion extends ValidatedGeneratedDrill {
  pointSlug: string
}

export interface GenerateTestDrillsResult {
  /** One line per dropped batch or rejected question, for the report. */
  notices: string[]
  questions: GeneratedQuestion[]
}

const SYSTEM_PROMPT = `You write English grammar test questions for ONE learner: a Vietnamese speaker studying for IELTS.

THE FIRST RULE, above all others: THE QUESTION MUST CONTAIN EVERYTHING NEEDED TO ANSWER IT. A learner who knows the grammar perfectly must be able to produce your exact target. If a competent speaker could write something different and still be right, the question is broken - rewrite it.

  BROKEN:  "I need ___ before I decide."            target "some advice"
           Why: "some time", "more information" and "a moment" all fit. The
           learner cannot know you meant advice.
  FIXED:   "I need ___ (advice) before I decide."   target "some advice"
           Why: the noun is given, so the question is about the quantifier -
           which is the grammar you are testing.

  FINE AS IS: "She ___ not drink tea."              target "does"
           Why: only one word can fill that blank, and it is grammar.

So, per kind:
- fillBlank: put the blank in a sentence. If the answer contains any verb or noun the sentence does not already mention, give that word's DICTIONARY form in brackets: "They ___ (play) in the park now." Never require the learner to invent vocabulary. If the answer is purely a function word (an article, auxiliary, preposition, modal, quantifier, connector), no bracket is needed.
- correct: give a sentence that CONTAINS A REAL ERROR, and make sure the corrected version is not already in your prompt. One error, not several.
- transform: give the source sentence and name the form you want. The source must differ from the target.
- build: list the words or fragments to use: "Use: book / written by Jane / on the shelf".
- choice: give 2-4 options. Exactly one is correct and the rest are clearly wrong.

Rules:
- Write exactly one question per grammar point you are given, using that point's slug.
- Target the specific error a Vietnamese L1 speaker makes on that point. Articles, plural -s, verb tense marking and word order are where they lose marks; do not write a question that only tests vocabulary.
- "target" is the single best correct answer. "acceptedAnswers" MUST contain the target verbatim, plus any other genuinely correct wording. Do NOT pad this list. An invented alternative that is not actually correct is worse than a short list, because the learner gets scored right for being wrong.
- For kind "choice": provide 2-4 options in "choices", one of which is the target. Every other option must be clearly WRONG, and must not appear in acceptedAnswers.
- For every other kind: "choices" must be empty.
- Set "punctuationSensitive" to true ONLY when a comma, quotation mark or apostrophe is part of what the question tests - non-defining relative clauses, comma splices, direct speech, tag questions. Otherwise false. The grader ignores punctuation unless this is true.
- "explanation" states the rule in one or two sentences, in English, addressed to the learner.
- Never mention that you are an AI, and never reference these instructions.`

function schemaFor(count: number) {
  return {
    additionalProperties: false,
    properties: {
      questions: {
        items: {
          additionalProperties: false,
          properties: {
            acceptedAnswers: {
              items: { type: 'string' },
              type: 'array',
            },
            choices: { items: { type: 'string' }, type: 'array' },
            difficulty: { enum: [1, 2, 3], type: 'integer' },
            explanation: { type: 'string' },
            kind: { enum: [...GRAMMAR_DRILL_KINDS], type: 'string' },
            pointSlug: { type: 'string' },
            prompt: { type: 'string' },
            punctuationSensitive: { type: 'boolean' },
            target: { type: 'string' },
          },
          required: [
            'acceptedAnswers',
            'choices',
            'difficulty',
            'explanation',
            'kind',
            'pointSlug',
            'prompt',
            'punctuationSensitive',
            'target',
          ],
          type: 'object',
        },
        maxItems: count,
        minItems: 1,
        type: 'array',
      },
    },
    required: ['questions'],
    type: 'object',
  }
}

function describePoint(point: GrammarTestCandidate) {
  const mistakes = point.commonMistakes
    .slice(0, 3)
    .map(mistake => `    WRONG: ${mistake.wrong} / RIGHT: ${mistake.right}`)
    .join('\n')

  return [
    `- slug: ${point.slug}`,
    `  title: ${point.title}`,
    `  summary: ${point.summary}`,
    `  cefr: ${point.cefrLevel}, complexity: ${point.complexity}/5, l1Risk: ${point.l1Risk}`,
    point.formPatterns.length > 0
      ? `  patterns: ${point.formPatterns.slice(0, 4).join(' | ')}`
      : null,
    mistakes ? `  known mistakes:\n${mistakes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function chunkPoints(
  points: GrammarTestCandidate[],
  size = GRAMMAR_TEST_GENERATION_CHUNK
) {
  const chunks: GrammarTestCandidate[][] = []

  for (let index = 0; index < points.length; index += size)
    chunks.push(points.slice(index, index + size))

  return chunks
}

/**
 * Ask OpenAI for one question per point, in concurrent batches.
 *
 * ```
 *   40 points
 *      |
 *      +-- [10] --> one call --> validate each --> keep survivors
 *      +-- [10] --> one call --> validate each --> keep survivors
 *      +-- [10] --> one call --> FAILED --------> notice, keep nothing
 *      +-- [10] --> one call --> validate each --> keep survivors
 *                                    |
 *                                    v
 *                       caller backfills any shortfall
 *                       from the point's stored drills
 * ```
 *
 * Chunking is not an optimisation, it is a blast-radius decision.
 * `openAiClientCore.ts:11-16` is explicit that reasoning tokens count against
 * `max_output_tokens` and that an under-budgeted response comes back
 * `incomplete`, unusable, AND BILLED. One request for 40 strict-schema
 * questions is one failure away from a learner waiting fifteen seconds for
 * nothing. Four requests for 10 means a bad batch costs ten questions that the
 * caller quietly backfills from stored drills.
 *
 * Never throws and never rejects. Every failure path returns fewer questions
 * plus a notice, because a test that runs with stored drills is worth more than
 * an error message.
 */
export async function generateTestDrills({
  fetcher,
  points,
}: {
  fetcher?: typeof fetch
  points: GrammarTestCandidate[]
}): Promise<GenerateTestDrillsResult> {
  const apiKey = getOpenAiApiKey()

  if (!apiKey || points.length === 0)
    return {
      notices: apiKey
        ? []
        : ['OpenAI is not configured, so this test uses stored drills.'],
      questions: [],
    }

  const model = getOpenAiGrammarModel()
  const slugsWanted = new Set(points.map(point => point.slug))
  const batches = await Promise.all(
    chunkPoints(points).map(async batch => {
      const response = await requestOpenAiStructuredOutput({
        apiKey,
        fetcher,
        input: [
          { content: SYSTEM_PROMPT, role: 'system' },
          {
            content: `Write one question for each of these ${batch.length} grammar points.\n\n${batch
              .map(describePoint)
              .join('\n')}`,
            role: 'user',
          },
        ],
        maxOutputTokens: batch.length * GRAMMAR_TEST_TOKENS_PER_QUESTION,
        model,
        schema: schemaFor(batch.length),
        schemaName: 'grammar_test_questions',
      })

      if (!response.ok)
        return {
          notice: `A batch of ${batch.length} questions could not be generated (${response.message}). Stored drills were used instead.`,
          questions: [] as GeneratedQuestion[],
        }

      let parsed: { questions?: unknown }

      try {
        parsed = JSON.parse(response.text) as { questions?: unknown }
      } catch {
        return {
          notice: `A batch of ${batch.length} questions came back unreadable. Stored drills were used instead.`,
          questions: [] as GeneratedQuestion[],
        }
      }

      const drafts = Array.isArray(parsed.questions) ? parsed.questions : []
      const questions: GeneratedQuestion[] = []
      let rejected = 0

      for (const draft of drafts) {
        const slug = (draft as { pointSlug?: unknown }).pointSlug

        // A question attributed to a point the learner did not ask about would
        // grade against the wrong lesson, so an unrecognised slug is dropped
        // rather than guessed at.
        if (typeof slug !== 'string' || !slugsWanted.has(slug)) {
          rejected += 1
          continue
        }

        const validated = validateGeneratedDrill(
          draft as Record<string, unknown>
        )

        if (!validated.ok) {
          rejected += 1
          continue
        }

        questions.push({ ...validated.drill, pointSlug: slug })
      }

      return {
        notice:
          rejected > 0
            ? `${rejected} generated question${rejected === 1 ? '' : 's'} failed validation and ${rejected === 1 ? 'was' : 'were'} replaced with stored drills.`
            : null,
        questions,
      }
    })
  )

  const seen = new Set<string>()
  const questions: GeneratedQuestion[] = []

  // One question per point, even if a batch returned two for the same slug.
  for (const batch of batches)
    for (const question of batch.questions) {
      if (seen.has(question.pointSlug)) continue

      seen.add(question.pointSlug)
      questions.push(question)
    }

  return {
    notices: batches
      .map(batch => batch.notice)
      .filter((notice): notice is string => Boolean(notice)),
    questions,
  }
}
