'use client'

import { BookOpenCheck, Check, Sprout } from 'lucide-react'

import { SessionEnd } from '@/components/journey/SessionEnd'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'

import {
  tallyRecallSession,
  VOCAB_RECALL_STALE_ERROR,
  type VocabRecallCardResult,
} from './vocabRecallSession'
import { advanceGardenPosition, WORD_STAGES } from './wordGarden'

interface Props {
  /** Known words when the session opened (stats from the page). */
  knownBefore: number
  onDone: () => void
  onPlant: () => void
  results: VocabRecallCardResult[]
}

/**
 * The end of a recall session, inside the modal (peak-end rule): how many
 * words were reviewed and moved, the garden step it bought, the cards that
 * could not be saved, then one Done.
 */
export function VocabRecallEnd({
  knownBefore,
  onDone,
  onPlant,
  results,
}: Props) {
  const vocab = useMessages().vocabulary
  const t = vocab.recallEnd
  const tally = tallyRecallSession(results)
  const garden = advanceGardenPosition(knownBefore, tally.mastered)
  const stage = WORD_STAGES[garden.after.index]
  const nextStage = WORD_STAGES[garden.after.index + 1]
  const notSaved = results.filter(result => result.saveState === 'notSaved')

  return (
    <SessionEnd
      focusTitle
      fixUp={
        notSaved.length > 0
          ? {
              items: notSaved.map(result => (
                <p
                  className="border-line bg-tint-soft rounded-control border p-3 text-sm"
                  key={result.taskId}
                >
                  <span className="font-medium">{result.term}</span>{' '}
                  <span className="text-ink-soft">
                    {result.error === VOCAB_RECALL_STALE_ERROR
                      ? vocab.summary.staleCard
                      : result.error}
                  </span>
                </p>
              )),
              moreLabel: plural(t.moreNotSaved, notSaved.length - 1),
              title: t.notSavedTitle,
            }
          : null
      }
      headline={{
        icon: <BookOpenCheck />,
        unit: t.unit,
        value: tally.reviewed,
      }}
      journeyStep={
        garden.stageUp
          ? format(t.stageUp, { stage: vocab.garden.stages[stage.key] })
          : nextStage
            ? plural(vocab.garden.toNext, garden.after.left, {
                stage: vocab.garden.stages[nextStage.key],
              })
            : vocab.garden.forest
      }
      module="vocabulary"
      nextStop={
        <ActionButton
          className="justify-self-start"
          data-next-stop=""
          icon={<Check aria-hidden="true" />}
          onClick={onDone}
          tone="ink"
        >
          {t.done}
        </ActionButton>
      }
      secondary={
        <ActionButton
          icon={<Sprout aria-hidden="true" />}
          onClick={onPlant}
          tone="paper"
        >
          {t.plant}
        </ActionButton>
      }
      title={t.title}
      titleId="recall-end-title"
      wins={format(t.wins, {
        correct: tally.correct,
        mastered: tally.mastered,
        movedUp: tally.movedUp,
      })}
    />
  )
}
