import 'server-only'

import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'

import { grammarCourse } from '@/modules/grammar/course'
import { buildGrammarPath } from '@/modules/grammar/path/buildGrammarPath'
import { getGrammarProgressForActor } from '@/modules/grammar/services/grammarProgressService'
import { listSavedTermsForUser } from '@/modules/vocabulary/services/vocabEntryService'

import { reviewWordOf } from './reviewWord'

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

/**
 * Where a correction's grammar lesson link goes for this learner: the notes
 * of a lesson they passed, the lesson itself when it is open, or no link for
 * a locked lesson (its page would send them back to the path).
 */
export type GrammarLessonLink = 'notes' | 'lesson' | 'locked'

export interface IeltsResultPageData {
  attempt: IeltsAttemptRecord
  /** Per grammar lesson id named by a writing correction. */
  grammarLinks: Record<string, GrammarLessonLink>
  sections: IeltsPublicSection[]
  rows: IeltsReviewRow[]
  /** Review words (accepted answers) already in the learner's vocabulary. */
  savedTerms: string[]
  writing: IeltsWritingReviewTask[]
}

/** The learner's link for each grammar lesson the feedback names. */
async function loadGrammarLinks(
  ownerId: string,
  attempt: IeltsAttemptRecord
): Promise<Record<string, GrammarLessonLink>> {
  const lessonIds = new Set(
    Object.values(attempt.writingFeedback ?? {}).flatMap(feedback =>
      (feedback?.corrections ?? []).flatMap(item =>
        item.grammarLessonId ? [item.grammarLessonId] : []
      )
    )
  )

  if (lessonIds.size === 0) return {}

  const path = buildGrammarPath({
    course: grammarCourse,
    now: new Date(),
    ...(await getGrammarProgressForActor(ownerId)),
  })
  const states = new Map(
    path.units.flatMap(unit =>
      unit.lessons.map(lesson => [lesson.id, lesson.state] as const)
    )
  )
  const links: Record<string, GrammarLessonLink> = {}

  for (const id of lessonIds) {
    const lesson = grammarCourse.getLesson(id)?.lesson
    const state = lesson ? states.get(lesson.id) : undefined

    links[id] =
      !state || state === 'locked'
        ? 'locked'
        : state === 'open'
          ? 'lesson'
          : 'notes'
  }

  return links
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
    return {
      attempt,
      grammarLinks: {},
      sections: publicSections,
      rows: [],
      savedTerms: [],
      writing: [],
    }

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

  const reviewWords = rows.flatMap(row => reviewWordOf(row) ?? [])
  const [grammarLinks, savedTerms] = await Promise.all([
    attempt.skill === 'writing'
      ? loadGrammarLinks(ownerId, attempt)
      : Promise.resolve({}),
    reviewWords.length
      ? listSavedTermsForUser({ terms: reviewWords, userId: ownerId })
      : Promise.resolve([]),
  ])

  return {
    attempt,
    grammarLinks,
    savedTerms,
    sections: publicSections,
    rows,
    writing,
  }
}
