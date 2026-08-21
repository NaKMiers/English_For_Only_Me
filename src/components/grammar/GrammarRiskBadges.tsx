import { PageTag } from '@/components/ui/PageTag'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarIeltsImpact,
  GrammarL1Risk,
} from '@/modules/grammar/types'

/**
 * The two-axis display. `cefrLevel` says when a learner meets a rule;
 * `complexity` says how hard it is to get right. They are shown side by side
 * on purpose, because they diverge: articles are A1 / difficulty 5, future
 * perfect continuous is C1 / difficulty 3.
 */
export function GrammarAxes({
  cefrLevel,
  complexity,
  ieltsImpact,
  l1Risk,
}: {
  cefrLevel: GrammarCefrLevel
  complexity: GrammarComplexity
  ieltsImpact?: GrammarIeltsImpact
  l1Risk: GrammarL1Risk
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PageTag tone="pale">{cefrLevel}</PageTag>
      <span className="border-manga-black bg-manga-white text-manga-black border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
        Difficulty {complexity}/5
      </span>
      <L1RiskTag l1Risk={l1Risk} />
      {ieltsImpact ? (
        <span className="border-manga-black text-manga-black border-2 border-dashed px-2 py-0.5 font-sans text-xs font-black uppercase">
          IELTS {ieltsImpact}
          {/* Was a `title=` tooltip, which is unreachable by keyboard and by
              touch - so the explanation was invisible to most of the people who
              needed it. */}
          <span className="sr-only">
            , derived from difficulty and family rather than hand-assigned
          </span>
        </span>
      ) : null}
    </div>
  )
}

const L1_RISK_LABEL: Record<GrammarL1Risk, string> = {
  high: 'VI risk high',
  low: 'VI risk low',
  medium: 'VI risk medium',
}

/**
 * Vietnamese L1 transfer risk. This is the axis no off-the-shelf grammar course
 * can offer, so it gets the loudest treatment when it is high.
 */
export function L1RiskTag({ l1Risk }: { l1Risk: GrammarL1Risk }) {
  const emphasis =
    l1Risk === 'high'
      ? 'bg-manga-red text-manga-white'
      : 'bg-manga-white text-manga-black'

  return (
    <span
      className={`border-manga-black border-2 px-2 py-0.5 font-sans text-xs font-black uppercase ${emphasis}`}
    >
      {L1_RISK_LABEL[l1Risk]}
      <span className="sr-only">
        {' '}
        - how much Vietnamese as a first language interferes with this point
      </span>
    </span>
  )
}
