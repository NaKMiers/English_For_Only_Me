import {
  getOpenAiApiKey,
  getOpenAiGrammarModel,
} from '@/constants/environments'
import { requestOpenAiStructuredOutput } from '@/lib/ai/openAiClientCore'
import {
  GRAMMAR_DRILL_KINDS,
  GRAMMAR_MIN_DISTINCT_DRILL_KINDS,
} from '@/modules/grammar/constants'
import type { GrammarContentFile } from '@/modules/grammar/types'

import {
  getRequiredDrillCount,
  requiresVietnameseExplanation,
} from './validateGrammarContent'

const LESSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    commonMistakes: {
      items: {
        additionalProperties: false,
        properties: {
          right: { type: 'string' },
          why: { type: 'string' },
          wrong: { type: 'string' },
        },
        required: ['wrong', 'right', 'why'],
        type: 'object',
      },
      type: 'array',
    },
    drills: {
      items: {
        additionalProperties: false,
        properties: {
          acceptedAnswers: { items: { type: 'string' }, type: 'array' },
          choices: { items: { type: 'string' }, type: ['array', 'null'] },
          difficulty: { enum: [1, 2, 3], type: 'integer' },
          explanation: { type: 'string' },
          id: { type: 'string' },
          kind: { enum: [...GRAMMAR_DRILL_KINDS], type: 'string' },
          prompt: { type: 'string' },
          target: { type: 'string' },
        },
        required: [
          'id',
          'kind',
          'prompt',
          'choices',
          'target',
          'acceptedAnswers',
          'explanation',
          'difficulty',
        ],
        type: 'object',
      },
      type: 'array',
    },
    examples: {
      items: {
        additionalProperties: false,
        properties: {
          en: { type: 'string' },
          note: { type: ['string', 'null'] },
          vi: { type: ['string', 'null'] },
        },
        required: ['en', 'vi', 'note'],
        type: 'object',
      },
      type: 'array',
    },
    explanation: { type: 'string' },
    explanationVi: { type: ['string', 'null'] },
    formPatterns: { items: { type: 'string' }, type: 'array' },
    l1Notes: { type: ['string', 'null'] },
    minimalPairs: {
      items: {
        additionalProperties: false,
        properties: {
          meaning: { type: 'string' },
          sentence: { type: 'string' },
        },
        required: ['sentence', 'meaning'],
        type: 'object',
      },
      type: ['array', 'null'],
    },
  },
  required: [
    'explanation',
    'explanationVi',
    'formPatterns',
    'examples',
    'commonMistakes',
    'minimalPairs',
    'l1Notes',
    'drills',
  ],
  type: 'object',
}

const SYSTEM_PROMPT = `You write grammar lessons for one specific learner: an adult Vietnamese speaker studying for IELTS.

ACCURACY
- Be accurate before being fluent. If a rule has exceptions, say so.

COMMON MISTAKES
- Each entry is a pair of COMPLETE SENTENCES plus the reason. Never a bare word or fragment: "a / an" is not a sentence and is useless to the learner.
- The "wrong" sentence must be wrong in EVERY context. Test it before writing it: if you can think of one situation where a native speaker would say it, it does not belong here. "I want to buy a car.", "I work in a hospital.", "Do you have time?" and "I'd like a coffee." are all perfectly correct English.
- Four accurate entries are worth far more than ten where two are wrong. A learner who studies a wrong entry is worse off than one who never saw it. When unsure about an entry, leave it out.
- Two sentences that are both correct do NOT belong here, no matter how confusable they are. Use minimalPairs for those. A commonMistakes entry whose "wrong" side is correct English contradicts the lesson it sits in.

MINIMAL PAIRS - for contrasts of MEANING, not correctness
- Use minimalPairs when two forms are both correct but mean different things: remember to do vs remember doing, stop to do vs stop doing, used to vs be used to, "I forgot to lock it" vs "I forgot locking it".
- Each entry is one CORRECT sentence plus what it means. Give the members of a contrast as consecutive entries so the difference is visible:
  * sentence "She stopped smoking." meaning "She quit the habit completely."
  * sentence "She stopped to smoke." meaning "She paused what she was doing in order to have a cigarette."
- These sentences are all correct. Never mark either side wrong, and never duplicate a minimalPairs contrast as a commonMistakes entry.
- Set minimalPairs to null when the point has no meaning-based contrast. Most points do not. A rule where one form is simply wrong belongs in commonMistakes, not here.

OUTPUT IS RENDERED AS PLAIN TEXT
- No markdown. No **bold**, no ## headings, no bullet syntax. Asterisks and hashes appear literally on the page.
- Write prose in short paragraphs separated by blank lines.
- Never address the reader as an assistant. No "If you want, I can also...", no offers, no questions to the reader, no sign-offs. The lesson is a finished document, not a chat turn.

DRILL FIELDS
- "target" is the EXACT correct answer string the learner must produce - not a description of the concept. For a blank, target is the word or phrase that fills it ("the"). For a full-sentence task, target is the model sentence. Never put a grammatical label in target.
- "prompt" is what the learner reads.
- SCOPE MUST MATCH. Every entry in acceptedAnswers, and every entry in choices, must be the same KIND of string as target. If target is a blank filler like "on", then acceptedAnswers is ["on"] - NOT ["depend on"], and not the whole sentence. If target is a full sentence, every accepted answer and every choice is a full sentence. Mixing scopes inside one drill makes the drill ungradeable. Check each drill against this before moving on.
- "explanation" says why the target is right, in one or two sentences.
- Drill ids are d1, d2, d3 and so on.

DRILL KINDS - pick the kind that matches what the learner actually does. The set of drills for one point must use at least ${GRAMMAR_MIN_DISTINCT_DRILL_KINDS} different kinds; a point drilled only by fillBlank tests recognition and never production.
- "fillBlank": prompt contains a blank; the answer is one word or short phrase. Use this for single-word answers. choices: null.
- "choice": prompt is a question and the learner picks from options.
  * choices is NEVER null for this kind. It is an array of 2-4 strings.
  * The target MUST BE ONE OF THE STRINGS IN choices, copied character for character. This is the most common mistake: writing a "choose the correct sentence" item where all the options are wrong and the correct sentence appears only in target. That drill cannot be answered - every option is marked wrong. If the item asks the learner to pick the correct sentence, the correct sentence MUST be one of the options.
  * Exactly one choice is correct, and it is the target. Every other choice must be genuinely wrong English, not a second valid phrasing. "Can you pass the salt?" and "Can you pass me the salt?" are both correct, so they cannot be two options in the same drill.
  * acceptedAnswers contains the target only.
  Correct example: prompt "Choose the correct sentence.", target "She wants to become a doctor.", choices ["She wants become a doctor.", "She wants to become a doctor.", "She wants becoming a doctor."], acceptedAnswers ["She wants to become a doctor."].
- "transform": learner rewrites a whole given sentence into another form. Answer is a full sentence.
- "correct": learner is given a sentence containing an error and writes the whole corrected sentence. Answer is a full sentence.
- "build": learner is given words or a cue and writes a whole sentence from scratch. Answer is a full sentence.

ACCEPTED ANSWERS - read this twice, it is the easiest thing to get wrong
- acceptedAnswers MUST contain target, and MUST contain nothing that is not fully correct English.
- There is NO required number. One entry is fine. Add a second or third ONLY if it is genuinely, independently correct - a real contraction ("The man's my teacher.") or a real alternative wording. Then stop.
- NEVER add an entry to reach a count. An answer list is not a quota. Listing "Please close door." next to "Please close the door." tells the grader that the mistake this drill exists to catch is acceptable, and the learner is scored correct for making it. That is the worst defect you can introduce.
- Do not list case or punctuation variants; the grader already ignores those.
- Never write a drill whose correct answer depends on expanding an ambiguous contraction. "He's" can mean "he is" OR "he has"; "he'd" can mean "he would" OR "he had". Write the full form in target and list contracted variants in acceptedAnswers.

LANGUAGE
- explanation is in English. Write explanationVi (Vietnamese) ONLY when asked.
- l1Notes names the specific Vietnamese-to-English interference for this point, in Vietnamese. Null if there is none worth stating.`

/**
 * Guarantee every drill accepts its own target.
 *
 * Applied to generated bodies before they are written. The recurring failure is
 * a fillBlank whose target is the blank filler ("Milk") while acceptedAnswers
 * holds the whole sentence ("Milk is good for you."), so the learner types the
 * answer the reveal panel shows them and is marked wrong. It survived both an
 * explicit scope rule in the prompt and a repair pass quoting the validator, so
 * it is fixed deterministically instead of asked for again.
 *
 * Safe by construction: target is the string already designated correct, so
 * adding it cannot make a drill accept a wrong answer. It can only bring grading
 * into line with the reveal. Anything else stays untouched - this normalizes,
 * it does not invent alternatives.
 */
export function withTargetsAccepted(body: unknown) {
  if (!body || typeof body !== 'object') return body

  const candidate = body as {
    drills?: Array<{ acceptedAnswers?: string[]; target?: string }>
  }

  if (!Array.isArray(candidate.drills)) return body

  for (const drill of candidate.drills) {
    const target = drill.target?.trim()

    if (!target) continue

    const normalize = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?;:,]+$/u, '')
    const answers = drill.acceptedAnswers ?? []

    if (!answers.some(answer => normalize(answer) === normalize(target)))
      drill.acceptedAnswers = [target, ...answers]
  }

  return body
}

/**
 * Generate one lesson body. Kept separate from the script so the prompt
 * construction is inspectable and the network call is injectable.
 *
 * Authoring time only. This never runs on a request path, which is why the
 * module has no runtime AI dependency and no per-request cost.
 */
export async function generateLessonBody({
  fetcher,
  issues,
  model = getOpenAiGrammarModel(),
  point,
}: {
  fetcher?: typeof fetch
  /**
   * Validator messages from a previous attempt at this point, for a repair run.
   * Naming the specific broken drills is far more effective than regenerating
   * blind, which tends to reproduce the same adherence mistake.
   */
  issues?: string[]
  model?: string
  point: GrammarContentFile[number]
}) {
  const needsVietnamese = requiresVietnameseExplanation({
    complexity: point.complexity as number,
    l1Risk: point.l1Risk as string,
  })
  const drillCount = getRequiredDrillCount(point.l1Risk as string)

  const userPrompt = [
    `Grammar point: ${point.title}`,
    `Slug: ${point.slug}`,
    `Family: ${point.family}`,
    `CEFR level: ${point.cefrLevel}`,
    `Difficulty (1-5, independent of level): ${point.complexity}`,
    `Vietnamese L1 transfer risk: ${point.l1Risk}`,
    `One-line summary: ${point.summary}`,
    '',
    `Write at least ${drillCount} drills using at least 3 distinct kinds.`,
    needsVietnamese
      ? 'Write explanationVi: a full Vietnamese explanation. This point is hard for this learner, so the first-language explanation matters.'
      : 'Set explanationVi to null. This point is straightforward enough to read in English.',
    point.contrastsWith?.length
      ? `Contrast it explicitly with: ${point.contrastsWith.join(', ')}.`
      : '',
    issues?.length
      ? [
          '',
          'A previous attempt at this lesson FAILED the following automated checks. Write the whole lesson again and make sure none of these recur:',
          ...issues.map(issue => `- ${issue}`),
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const result = await requestOpenAiStructuredOutput({
    apiKey: getOpenAiApiKey(),
    fetcher,
    input: [
      { content: SYSTEM_PROMPT, role: 'system' },
      { content: userPrompt, role: 'user' },
    ],
    // Scaled to the drill count rather than fixed. A high-L1-risk point needs 12
    // drills, each with a prompt, target, 3+ accepted answers, and its own
    // explanation - plus the lesson itself and a Vietnamese translation of it.
    // The shared 1400-token default truncates that every time.
    maxOutputTokens: 6000 + drillCount * 700,
    model,
    schema: LESSON_SCHEMA,
    schemaName: 'grammar_lesson_body',
  })

  if (!result.ok) return { message: result.message, ok: false as const }

  try {
    const parsed: unknown = withTargetsAccepted(JSON.parse(result.text))

    return { body: parsed, ok: true as const, usage: result.usage }
  } catch {
    return {
      message: 'Model returned output that was not valid JSON.',
      ok: false as const,
    }
  }
}
