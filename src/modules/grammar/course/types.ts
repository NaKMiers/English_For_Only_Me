/**
 * The grammar course is content-as-code: every unit, lesson, and card is a
 * typed object in `units/*.ts`, validated by `validateCourse.test.ts`. Nothing
 * here touches the database. Lesson and card ids are permanent - progress and
 * miss rows are keyed on them - so rename one only through `COURSE_ID_ALIASES`.
 *
 *   Course -> Unit (12) -> Lesson (5 each) -> Card (10-15 each)
 *                                              explain | choice | fill | order | fix
 */

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const

export type CefrLevel = (typeof CEFR_LEVELS)[number]

export interface CardExample {
  en: string
  vi: string
}

export interface ExplainCard {
  kind: 'explain'
  id: string
  title: string
  /** Vietnamese, 1-4 short sentences. */
  body: string
  /** A pattern such as `S + have/has + V3`. */
  formula?: string
  examples: CardExample[]
  /** The typical mistake a Vietnamese speaker makes, and the fix. */
  pitfall?: { wrong: string; right: string; note: string }
}

interface PracticeCardBase {
  id: string
  /** Vietnamese instruction, e.g. "Chọn câu đúng". */
  prompt: string
  /** Vietnamese, one or two sentences on WHY the answer is right. */
  explain: string
}

export interface ChoiceCard extends PracticeCardBase {
  kind: 'choice'
  /** Optional English sentence the options refer to (may contain `___`). */
  sentence?: string
  options: string[]
  answer: number
}

export interface FillCard extends PracticeCardBase {
  kind: 'fill'
  /** English sentence with exactly one `___`. */
  sentence: string
  /** Accepted fillers; the first is the one shown as the correct answer. */
  answers: string[]
  /** Tiles to tap. Without a bank the learner types. Must contain answers[0]. */
  bank?: string[]
}

export interface OrderCard extends PracticeCardBase {
  kind: 'order'
  /** The canonical sentence. Its words (final punctuation dropped) are the tiles. */
  sentence: string
  /** Other word orders that are also correct. */
  alternatives?: string[]
  /** Extra wrong tiles mixed in. */
  distractors?: string[]
}

export interface FixCard extends PracticeCardBase {
  kind: 'fix'
  /** The sentence split into tappable words; exactly one is wrong. */
  tokens: string[]
  wrongIndex: number
  /** What replaces tokens[wrongIndex] (may be several words, or empty to delete). */
  correction: string
}

export type PracticeCard = ChoiceCard | FillCard | OrderCard | FixCard

export type GrammarCard = ExplainCard | PracticeCard

export type PracticeCardKind = PracticeCard['kind']

export interface GrammarLesson {
  id: string
  title: string
  titleEn: string
  summary: string
  cards: GrammarCard[]
}

export interface GrammarUnit {
  id: string
  order: number
  level: CefrLevel
  title: string
  summary: string
  lessons: GrammarLesson[]
}

/** The learner's raw answer for one practice card, by card kind. */
export type CardAnswer =
  | { kind: 'choice'; value: number }
  | { kind: 'fill'; value: string }
  | { kind: 'order'; value: string[] }
  | { kind: 'fix'; value: number }

export function isPracticeCard(card: GrammarCard): card is PracticeCard {
  return card.kind !== 'explain'
}
