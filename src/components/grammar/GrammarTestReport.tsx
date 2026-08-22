'use client'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import type {
  GrammarTestOutcomeRecord,
  GrammarTestReportRecord,
} from '@/modules/grammar/test/types'

import { SenseiPortrait } from './cast/SenseiPortrait'
import { ImpactStamp } from './comic/ImpactStamp'
import { SpeechBubble } from './comic/SpeechBubble'

const TOKEN_CLASS: Record<string, string> = {
  correct: 'bg-manga-white text-manga-black',
  extra: 'bg-manga-black text-manga-white line-through',
  missing: 'bg-manga-pale-red text-manga-black border-dashed',
  spellingVariant: 'bg-yellow-100 text-yellow-950',
  wrong: 'bg-manga-red text-manga-white',
}

/**
 * The same token diff the recall modal shows.
 *
 * Deliberately identical: the diff is the pedagogically load-bearing part of
 * feedback in this module, and a learner should not have to read two different
 * visual languages for the same information depending on which surface they are
 * on.
 */
function CorrectionDiff({
  correction,
}: {
  correction: NonNullable<GrammarTestOutcomeRecord['correction']>
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {correction.tokens.map((token, index) => (
        <span
          className={`border-manga-black border-2 px-2 py-0.5 font-mono text-xs font-semibold ${
            TOKEN_CLASS[token.status] ?? TOKEN_CLASS.correct
          }`}
          key={`${token.status}-${index}`}
          title={token.status}
        >
          {token.expected ?? token.actual ?? '_'}
        </span>
      ))}
    </div>
  )
}

function senseiLine({
  correct,
  knockedBack,
  total,
}: {
  correct: number
  knockedBack: number
  total: number
}) {
  const ratio = total === 0 ? 0 : correct / total

  if (ratio === 1)
    return 'Every one. Which tells me the range was too easy, not that you are finished - pick harder ground next time.'
  if (ratio >= 0.8)
    return `${correct} of ${total}. Solid. The ${knockedBack} you lost are back at the bottom of the ladder, which is where they belong.`
  if (ratio >= 0.5)
    return `${correct} of ${total}. Half-known is not known. Those ${knockedBack} rules are due now - do them before they fade again.`
  if (total === 0) return 'Nothing to mark.'

  return `${correct} of ${total}. Good. Now you know where the ground is soft, and so do I - all ${knockedBack} of them are due immediately.`
}

/**
 * The end of the test, all at once.
 *
 * Everything the learner did not get to see during the run: the score, which
 * answers were wrong and how, and - the part that actually matters - which
 * rules went back to the start of the review ladder. That last list is the
 * bridge from "I took a test" to "here is tomorrow's work".
 */
export function GrammarTestReport({
  onClose,
  report,
}: {
  onClose: () => void
  report: GrammarTestReportRecord
}) {
  const wrong = report.outcomes.filter(outcome => !outcome.isCorrect)

  return (
    <MangaPanel
      eyebrow="Result"
      title={`${report.correct} of ${report.total}`}
    >
      <div className="flex items-start gap-3">
        <SenseiPortrait
          expression={
            report.correct === report.total
              ? 'approving'
              : report.correct * 2 >= report.total
                ? 'wary'
                : 'severe'
          }
        />
        <div className="grid min-w-0 gap-2">
          {report.knockedBack.length > 0 ? (
            <div className="flex">
              <ImpactStamp tone="danger">
                {`${report.knockedBack.length} back to stage 1`}
              </ImpactStamp>
            </div>
          ) : null}
          <SpeechBubble speaker="Sensei">
            {senseiLine({
              correct: report.correct,
              knockedBack: report.knockedBack.length,
              total: report.total,
            })}
          </SpeechBubble>
          <p className="text-manga-ink-soft text-xs leading-5 font-semibold">
            A right answer here did not move anything up the ladder. Only the
            daily queue promotes.
          </p>
        </div>
      </div>

      {report.notice ? (
        <p className="text-manga-ink-soft border-manga-black bg-manga-white border-2 p-2 text-xs leading-5 font-semibold">
          {report.notice}
        </p>
      ) : null}

      {wrong.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="font-sans text-sm font-black uppercase">
            What you missed
          </h3>
          {wrong.map(outcome => (
            <div
              className="border-manga-black bg-manga-white grid gap-2 border-3 p-3"
              key={outcome.questionId}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-xs font-black uppercase">
                  {outcome.pointTitle}
                </span>
                {outcome.knockedBack ? (
                  <span className="border-manga-black bg-manga-pale-red border-2 px-2 py-0.5 font-sans text-[0.65rem] font-black uppercase">
                    back to stage 1
                  </span>
                ) : null}
              </div>
              <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                {outcome.prompt}
              </p>
              <p className="font-mono text-sm font-semibold">
                You wrote:{' '}
                {outcome.userAnswer.trim() ? (
                  outcome.userAnswer
                ) : (
                  <span className="text-manga-ink-soft">nothing</span>
                )}
              </p>
              {outcome.correction ? (
                <CorrectionDiff correction={outcome.correction} />
              ) : outcome.matchedAnswer ? (
                <p className="text-sm leading-6 font-semibold">
                  Expected: {outcome.matchedAnswer}
                </p>
              ) : null}
              <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                {outcome.explanation}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {report.knockedBack.length > 0 ? (
          <MangaButton
            href="/grammar"
            tone="ink"
          >
            Go To Today&apos;s Queue
          </MangaButton>
        ) : null}
        <MangaButton
          onClick={onClose}
          type="button"
        >
          Close
        </MangaButton>
      </div>
    </MangaPanel>
  )
}
