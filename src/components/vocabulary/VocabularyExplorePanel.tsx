'use client'

import { BookOpen, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useEffectEvent, useRef } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/ActionButton'
import { Progress } from '@/components/ui/progress'
import { PageTag } from '@/components/ui/PageTag'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages/en'
import { cn } from '@/lib/utils'
import type {
  VocabEntryApiRecord,
  VocabEntryWithUserStateRecord,
  VocabLearningSource,
} from '@/modules/vocabulary/types'
import {
  getEnglishDefinition,
  getRequiredVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'

import { VocabTermHeader } from './VocabTermHeader'

export type ExploreDecision = 'shouldLearn' | 'alreadyKnow'

interface Props {
  activeIndex: number
  decisions: Record<string, ExploreDecision>
  /** Shown when there is nothing to explore. */
  emptyMessage?: string
  entries: VocabEntryWithUserStateRecord[]
  eyebrow?: string
  markEntry: (input: {
    entry: VocabEntryWithUserStateRecord
    source: VocabLearningSource
    status: 'shouldLearn' | 'alreadyKnow'
  }) => void
  moveExplore: (delta: number) => void
  /**
   * The card's #number: the word's frequency rank (Vocab page), or its place
   * in a fixed list such as the words of one IELTS test.
   */
  numbering?: 'frequency' | 'position'
  showExploreIndex: (index: number) => void
  /** Recorded on the learner's word when they press a button. */
  source?: VocabLearningSource
  title?: string
}

function getVietnamesePreview(entry: VocabEntryApiRecord, fallback: string) {
  return getRequiredVietnameseMeaning(entry, fallback)
}

function getDefinitionPreview(entry: VocabEntryApiRecord) {
  return getEnglishDefinition(entry)
}

function getExploreDecisionLabel(
  decision: ExploreDecision | undefined,
  t: Messages['vocabulary']['decisions']
) {
  if (decision === 'shouldLearn') return t.shouldLearn
  if (decision === 'alreadyKnow') return t.alreadyKnow

  return t.unpicked
}

function getExploreStackCardClassName({
  active,
  decision,
  visible,
}: {
  active: boolean
  decision: ExploreDecision | undefined
  visible: boolean
}) {
  return cn(
    'border-line rounded-panel absolute top-0 left-1/2 flex h-full min-h-96 w-[min(84%,760px)] flex-col gap-4 border p-4 shadow-card transition-[opacity,transform] duration-300 ease-out',
    decision === 'shouldLearn' && 'bg-brand-soft',
    decision === 'alreadyKnow' && 'bg-lesson-correct/10',
    !decision && 'bg-surface',
    !active && 'cursor-pointer hover:opacity-80',
    !visible && 'pointer-events-none opacity-0'
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
}

function isOnScreen(element: HTMLElement | null) {
  if (!element) return false

  const rect = element.getBoundingClientRect()

  return rect.bottom > 0 && rect.top < window.innerHeight
}

/**
 * Left / Right arrow keys move through the deck while the panel is on screen;
 * holding a key keeps moving. Ignored while typing in a field, with a
 * modifier held, or while a dialog is open (the recall modal and the IELTS
 * editor dialogs own the keyboard then).
 */
function useExploreArrowKeys({
  activeIndex,
  count,
  panelRef,
  showExploreIndex,
}: {
  activeIndex: number
  count: number
  panelRef: React.RefObject<HTMLDivElement | null>
  showExploreIndex: (index: number) => void
}) {
  // Presses faster than a render would all start from the same stale index;
  // the last requested one is the base until the new index arrives.
  const pendingRef = useRef<number | null>(null)

  useEffect(() => {
    pendingRef.current = null
  }, [activeIndex])

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const delta =
      event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0

    if (!delta || count === 0) return
    if (event.defaultPrevented) return
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (isTypingTarget(event.target)) return
    if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
    if (!isOnScreen(panelRef.current)) return

    const next = (pendingRef.current ?? activeIndex) + delta

    if (next < 0 || next >= count) return

    event.preventDefault()
    pendingRef.current = next
    showExploreIndex(next)
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

export function VocabularyExplorePanel({
  activeIndex,
  decisions,
  emptyMessage,
  entries,
  eyebrow,
  markEntry,
  moveExplore,
  numbering = 'frequency',
  showExploreIndex,
  source = 'explore',
  title,
}: Props) {
  const vocab = useMessages().vocabulary
  const t = vocab.explore
  const deckRef = useRef<HTMLDivElement>(null)
  const decidedCount = entries.filter(entry => decisions[entry.entry.id]).length

  useExploreArrowKeys({
    activeIndex,
    count: entries.length,
    panelRef: deckRef,
    showExploreIndex,
  })

  return (
    <ContentPanel
      className="gap-3 p-4 py-4"
      eyebrow={eyebrow ?? t.eyebrow}
      title={title ?? t.title}
    >
      {entries.length > 0 ? (
        <div
          className="grid gap-4"
          ref={deckRef}
        >
          <div className="flex items-center justify-between gap-3">
            <Button
              aria-label={t.previous}
              className="border-line bg-surface hover:bg-tint soft-press hover-pop size-11 rounded-full border disabled:opacity-35"
              disabled={activeIndex === 0}
              onClick={() => moveExplore(-1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronLeft
                aria-hidden="true"
                className="size-5"
              />
            </Button>
            <span
              className="text-ink-soft text-xs font-normal"
              title={t.arrowKeysHint}
            >
              {activeIndex + 1}/{entries.length}
            </span>
            <Button
              aria-label={t.next}
              className="border-line bg-surface hover:bg-tint soft-press hover-pop size-11 rounded-full border disabled:opacity-35"
              disabled={activeIndex >= entries.length - 1}
              onClick={() => moveExplore(1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronRight
                aria-hidden="true"
                className="size-5"
              />
            </Button>
          </div>

          <div className="relative min-h-96 overflow-hidden px-2 py-2">
            {entries.map((entry, index) => {
              const decision = decisions[entry.entry.id]
              const distance = index - activeIndex
              const visible = Math.abs(distance) <= 2
              const active = distance === 0
              const scale = Math.max(0.78, 1 - Math.abs(distance) * 0.08)
              const opacity = active ? 1 : 0.5
              const translateX = `calc(-50% + ${distance * 104}px)`

              return (
                <article
                  key={entry.entry.id}
                  aria-label={
                    active
                      ? undefined
                      : format(t.openWithDecision, {
                          decision: getExploreDecisionLabel(
                            decision,
                            vocab.decisions
                          ),
                          term: entry.entry.term,
                        })
                  }
                  aria-hidden={!visible}
                  className={getExploreStackCardClassName({
                    active,
                    decision,
                    visible,
                  })}
                  onClick={active ? undefined : () => showExploreIndex(index)}
                  onKeyDown={
                    active
                      ? undefined
                      : event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            showExploreIndex(index)
                          }
                        }
                  }
                  role={active ? undefined : 'button'}
                  style={{
                    opacity: visible ? opacity : 0,
                    transform: `translateX(${translateX}) scale(${scale})`,
                    zIndex: 20 - Math.abs(distance),
                  }}
                  tabIndex={active || !visible ? undefined : 0}
                >
                  <div className="grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="grid min-w-0 flex-1 gap-1">
                        <VocabTermHeader
                          entry={entry.entry}
                          size="lg"
                        />
                        <p className="text-ink-soft text-xs font-normal">
                          {getExploreDecisionLabel(decision, vocab.decisions)}
                        </p>
                      </div>
                      <PageTag tone="pale">
                        #
                        {numbering === 'position'
                          ? index + 1
                          : (entry.entry.frequencyRank ?? index + 1)}
                      </PageTag>
                    </div>
                    <p className="text-ink-soft ml-auto max-w-2xl text-right text-base leading-7 font-normal">
                      {getVietnamesePreview(
                        entry.entry,
                        vocab.word.needsMeaning
                      )}
                    </p>
                    <p className="text-ink-soft max-w-2xl text-sm leading-6 font-normal">
                      {getDefinitionPreview(entry.entry)}
                    </p>
                  </div>
                  {distance === 0 ? (
                    <div className="grid shrink-0 grid-cols-2 gap-2">
                      <ActionButton
                        className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                        disabled={decision === 'shouldLearn'}
                        icon={<BookOpen className="size-4" />}
                        onClick={() =>
                          markEntry({
                            entry,
                            source,
                            status: 'shouldLearn',
                          })
                        }
                      >
                        {vocab.marks.shouldLearn}
                      </ActionButton>
                      <ActionButton
                        className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                        disabled={decision === 'alreadyKnow'}
                        icon={<Check className="size-4" />}
                        onClick={() =>
                          markEntry({
                            entry,
                            source,
                            status: 'alreadyKnow',
                          })
                        }
                        tone="paper"
                      >
                        {vocab.marks.alreadyKnow}
                      </ActionButton>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          {/* One thin bar instead of a grid of tiny targets. */}
          <Progress
            aria-label={format(t.decided, {
              done: decidedCount,
              total: entries.length,
            })}
            className="items-center"
            tone="vocabulary"
            trackClassName="h-2"
            value={
              entries.length > 0
                ? Math.round((decidedCount / entries.length) * 100)
                : 0
            }
          >
            <span className="text-ink-soft order-last w-full text-xs tabular-nums">
              {format(t.decided, {
                done: decidedCount,
                total: entries.length,
              })}
            </span>
          </Progress>
        </div>
      ) : (
        <p className="text-ink-soft text-sm leading-6 font-normal">
          {emptyMessage ?? t.empty}
        </p>
      )}
    </ContentPanel>
  )
}
