import { IELTS_GENERATING_STALE_SECONDS } from '../constants'
import type {
  IeltsQuestionGroup,
  IeltsSection,
  IeltsTestContent,
  IeltsVisual,
} from '../schema'

/* Lean Mongo documents -> domain objects. Defaults guard older documents. */

type LeanDoc = Record<string, unknown>

const asString = (value: unknown) => (typeof value === 'string' ? value : '')
const asNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : [])

function toGroup(raw: LeanDoc): IeltsQuestionGroup {
  const wordLimit = raw.wordLimit as LeanDoc | null | undefined

  return {
    id: asString(raw.id),
    type: raw.type as IeltsQuestionGroup['type'],
    from: asNumber(raw.from),
    to: asNumber(raw.to),
    instruction: asString(raw.instruction),
    wordLimit: wordLimit
      ? {
          maxWords: asNumber(wordLimit.maxWords, 1),
          allowNumber: Boolean(wordLimit.allowNumber),
        }
      : null,
    title: asString(raw.title),
    body: asString(raw.body),
    options: asArray<LeanDoc>(raw.options).map(option => ({
      key: asString(option.key),
      text: asString(option.text),
    })),
    correctKeys: asArray<string>(raw.correctKeys).map(String),
    imageUrl: asString(raw.imageUrl),
    questions: asArray<LeanDoc>(raw.questions).map(question => {
      const evidence = question.evidence as LeanDoc | null | undefined

      return {
        number: asNumber(question.number),
        prompt: asString(question.prompt),
        answers: asArray<string>(question.answers).map(String),
        evidence: evidence
          ? {
              quote: asString(evidence.quote),
              blockIndex: asNumber(evidence.blockIndex),
            }
          : null,
        explanation: asString(question.explanation),
      }
    }),
  }
}

export function toIeltsSection(raw: LeanDoc): IeltsSection {
  const listening = raw.listening as LeanDoc | null | undefined
  const reading = raw.reading as LeanDoc | null | undefined
  const writing = raw.writing as LeanDoc | null | undefined
  const audio = listening?.audio as LeanDoc | null | undefined

  return {
    key: raw.key as IeltsSection['key'],
    skill: raw.skill as IeltsSection['skill'],
    order: asNumber(raw.order, 1),
    title: asString(raw.title),
    revision: asNumber(raw.revision),
    genStatus: (raw.genStatus as IeltsSection['genStatus']) ?? 'manual',
    genStartedAt: raw.genStartedAt
      ? new Date(raw.genStartedAt as string)
      : null,
    genError: asString(raw.genError),
    listening: listening
      ? {
          context: asString(listening.context),
          lines: asArray<LeanDoc>(listening.lines).map(line => ({
            speaker: asString(line.speaker),
            voice: asString(line.voice),
            text: asString(line.text),
          })),
          audio: audio
            ? {
                url: asString(audio.url),
                publicId: asString(audio.publicId),
                durationSec: asNumber(audio.durationSec),
                lineOffsetsSec: asArray<number>(audio.lineOffsetsSec).map(
                  Number
                ),
              }
            : null,
        }
      : null,
    reading: reading
      ? {
          title: asString(reading.title),
          subtitle: asString(reading.subtitle),
          paragraphs: asArray<LeanDoc>(reading.paragraphs).map(paragraph => ({
            label: asString(paragraph.label),
            text: asString(paragraph.text),
          })),
        }
      : null,
    writing: writing
      ? {
          task: asNumber(writing.task, 1) === 2 ? 2 : 1,
          prompt: asString(writing.prompt),
          minWords: asNumber(writing.minWords, 150),
          visual: (writing.visual as IeltsVisual | null) ?? null,
          sampleAnswer: asString(writing.sampleAnswer),
        }
      : null,
    groups: asArray<LeanDoc>(raw.groups).map(toGroup),
  }
}

export interface IeltsTestRecord extends IeltsTestContent {
  id: string
  createdBy: string
  publishedAt: Date | null
  updatedAt: Date | null
  metaRevision: number
}

export function toIeltsTestRecord(raw: LeanDoc): IeltsTestRecord {
  return {
    // A record revived from the cache has `id` and no `_id`.
    id: String(raw._id ?? raw.id),
    slug: asString(raw.slug),
    version: asNumber(raw.version, 1),
    status: (raw.status as IeltsTestRecord['status']) ?? 'draft',
    source: (raw.source as IeltsTestRecord['source']) ?? 'manual',
    title: asString(raw.title),
    track: (raw.track as IeltsTestRecord['track']) ?? 'academic',
    targetBand: asNumber(raw.targetBand, 6.5),
    tags: asArray<string>(raw.tags).map(String),
    description: asString(raw.description),
    createdBy: asString(raw.createdBy),
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt as string) : null,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt as string) : null,
    metaRevision: asNumber(raw.metaRevision),
    sections: asArray<LeanDoc>(raw.sections).map(toIeltsSection),
  }
}

/**
 * A `generating` section whose job outlived the route limit reads as failed,
 * so a closed editor tab never leaves it stuck.
 */
export function effectiveGenStatus(
  section: Pick<IeltsSection, 'genStatus' | 'genStartedAt'>,
  now = new Date()
): IeltsSection['genStatus'] {
  if (
    section.genStatus === 'generating' &&
    (!section.genStartedAt ||
      now.getTime() - section.genStartedAt.getTime() >
        IELTS_GENERATING_STALE_SECONDS * 1000)
  )
    return 'failed'

  return section.genStatus
}
