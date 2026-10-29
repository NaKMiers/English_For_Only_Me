import 'server-only'

import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'

import type { IeltsAttemptRecord } from '../attempts/attemptRecords'
import { parseAttemptId } from '../attempts/attemptRouteDecisions'
import {
  loadAttemptSections,
  readAttemptForOwner,
} from '../attempts/attemptService'
import { type IeltsQuestionType } from '../constants'
import { type IeltsPublicSection, toPublicSection } from '../publicView'
import type { IeltsVisual } from '../schema'
import type { IeltsAnswerOutcome } from '../scoring/scoreObjective'

export interface IeltsReviewRow {
  number: number
  part: number
  sectionKey: string
  type: IeltsQuestionType
  given: string
  accepted: string[]
  outcome: IeltsAnswerOutcome
  overLimit: boolean
  explanation: string
  evidence: { quote: string; blockIndex: number } | null
}

export interface IeltsWritingReviewTask {
  task: 1 | 2
  prompt: string
  minWords: number
  visual: IeltsVisual | null
  sampleAnswer: string
  essay: string
}

export interface IeltsResultPageData {
  attempt: IeltsAttemptRecord
  sections: IeltsPublicSection[]
  rows: IeltsReviewRow[]
  writing: IeltsWritingReviewTask[]
}

/**
 * The owner's finished attempt with its review. Answer keys, explanations
 * and evidence are included only because the attempt is no longer in
 * progress; an in-progress attempt returns `sections` without them.
 */
export async function loadResultPageData(
  attemptIdParam: string
): Promise<IeltsResultPageData | null> {
  if (!hasMongoDbUri()) return null

  const id = parseAttemptId(attemptIdParam)

  if (!id.ok) return null

  const ownerId = await connectDatabaseWhen(getPracticeActorId())

  if (!ownerId) return null

  const attempt = await readAttemptForOwner(ownerId, id.data)

  if (!attempt) return null

  const sections = await loadAttemptSections({
    ...attempt,
    scope:
      attempt.scope.kind === 'part'
        ? { kind: 'part', part: attempt.scope.part }
        : { kind: 'skill' },
  })
  const finished = attempt.status !== 'in_progress'
  const publicSections = sections.map(section =>
    toPublicSection(section, { includeTranscript: finished })
  )

  if (!finished)
    return { attempt, sections: publicSections, rows: [], writing: [] }

  const details = new Map<
    number,
    Pick<IeltsReviewRow, 'explanation' | 'evidence' | 'sectionKey'>
  >()

  for (const section of sections)
    for (const group of section.groups)
      for (const question of group.questions)
        details.set(question.number, {
          explanation: question.explanation,
          evidence: question.evidence,
          sectionKey: section.key,
        })

  const rows: IeltsReviewRow[] = (attempt.result?.perQuestion ?? []).map(
    row => ({
      number: row.number,
      part: row.part,
      type: row.type,
      given: row.given,
      accepted: row.accepted,
      outcome: row.outcome,
      overLimit: row.overLimit,
      explanation: details.get(row.number)?.explanation ?? '',
      evidence: details.get(row.number)?.evidence ?? null,
      sectionKey: details.get(row.number)?.sectionKey ?? '',
    })
  )

  const writing: IeltsWritingReviewTask[] = sections
    .filter(section => section.writing)
    .map(section => {
      const material = section.writing!
      const essay = attempt.answers[String(material.task)]

      return {
        task: material.task,
        prompt: material.prompt,
        minWords: material.minWords,
        visual: material.visual,
        sampleAnswer: material.sampleAnswer,
        essay: typeof essay === 'string' ? essay : '',
      }
    })

  return { attempt, sections: publicSections, rows, writing }
}
