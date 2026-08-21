import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarFamily,
  GrammarL1Risk,
  GrammarUserItemStatus,
} from '@/modules/grammar/types'

/**
 * The learner's own errors, quoted back at them.
 *
 * Deliberately its OWN narrow shape rather than a slice of the point record. The
 * prompt a learner answered lives on `GrammarDrillRecord`, next to `target` and
 * `acceptedAnswers` - so the obvious way to recover it is to widen
 * `GrammarPointApiRecord` with `drills`, which would ship every answer to the
 * browser on all 184 lesson pages. Nothing would look broken: the grader would
 * still work and every test would still pass, and the drill system would be
 * silently pointless. So the service resolves prompts server-side and returns
 * only these fields.
 *
 * `prompt` is null when `drillId` no longer resolves, which happens whenever
 * content is regenerated. Render the answer without a prompt; never invent one.
 */
export interface ScarRecord {
  conquered: {
    at: string
    prompt: string | null
    userAnswer: string
  } | null
  firstWrong: {
    at: string
    matchedAnswer: string | null
    prompt: string | null
    userAnswer: string
  } | null
  revivals: number
  worstTrap: {
    occurrences: number
    prompt: string | null
    userAnswer: string
  } | null
}

/**
 * Everything the comic layer knows about the learner, assembled server-side.
 *
 * Serializable throughout - ISO strings, never `Date` - because this crosses
 * into client islands. Nullable throughout, because the signed-out visitor is
 * the case that matters most: that is the first-impression path and it has the
 * least data.
 */
export interface LearnerPresentationState {
  /** Null when signed out. No scar and no verdict beats in that case. */
  actorId: string | null
  correctAnswerStreak: number
  correctCount: number
  lastReviewedAt: string | null
  /**
   * The last drill outcome this session. Exists so the sensei has a regression
   * signal before the Error Archive lands.
   */
  recentOutcome: 'correct' | 'wrong' | 'revealed' | null
  recallStage: number | null
  reviewCount: number
  /**
   * Duplicates `scar.revivals` on purpose, so the `verdict` beat never depends
   * on an optional beat's data being present.
   */
  revivalCount: number
  scar: ScarRecord | null
  /** Null when the learner has never touched this point. */
  status: GrammarUserItemStatus | null
  wrongCount: number
}

export const BEAT_KINDS = [
  'hook',
  'interference',
  'rule',
  'proof',
  'pair',
  'trap',
  'scar',
  'boss',
  'verdict',
] as const

export type BeatKind = (typeof BEAT_KINDS)[number]

export interface BeatBase {
  kind: BeatKind
}

export interface HookBeat extends BeatBase {
  cefrLevel: GrammarCefrLevel
  complexity: GrammarComplexity
  kind: 'hook'
  l1Risk: GrammarL1Risk
  summary: string
  title: string
  /** Zero when signed out or untouched. The hook states it either way. */
  wrongCount: number
}

export interface InterferenceBeat extends BeatBase {
  explanationVi: string | null
  kind: 'interference'
  l1Notes: string | null
}

export interface RuleBeat extends BeatBase {
  explanation: string
  formPatterns: string[]
  kind: 'rule'
}

export interface ProofBeat extends BeatBase {
  examples: { en: string; note: string | null; vi: string | null }[]
  kind: 'proof'
}

export interface PairBeat extends BeatBase {
  kind: 'pair'
  pairs: { meaning: string; sentence: string }[]
}

export interface TrapBeat extends BeatBase {
  kind: 'trap'
  mistakes: { right: string; why: string; wrong: string }[]
}

export interface ScarBeat extends BeatBase {
  kind: 'scar'
  scar: ScarRecord
}

export interface BossBeat extends BeatBase {
  drillCount: number
  kind: 'boss'
  recallStage: number | null
  slug: string
}

export interface VerdictBeat extends BeatBase {
  kind: 'verdict'
  /** The chosen sensei line. Selection happens in `selectSenseiLine`. */
  line: string
}

export type Beat =
  | HookBeat
  | InterferenceBeat
  | RuleBeat
  | ProofBeat
  | PairBeat
  | TrapBeat
  | ScarBeat
  | BossBeat
  | VerdictBeat

/** How dangerous a creature looks. Derived, never authored. */
export type MenaceTier = 1 | 2 | 3 | 4 | 5

export interface CreatureSpec {
  /** Accessible name describing state, e.g. "Articles, stage 1 of 7, high interference". */
  accessibleName: string
  family: GrammarFamily
  /** True where the effective risk is high: draws the danger aura. */
  isDangerous: boolean
  menace: MenaceTier
  /** 1-7, or null when untouched. Drives the HP bar. */
  recallStage: number | null
  species: string
  title: string
}
