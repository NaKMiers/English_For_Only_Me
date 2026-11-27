'use client'

import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useEffectEvent, useRef } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/ActionButton'
import { PageTag } from '@/components/ui/PageTag'
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

function getVietnamesePreview(entry: VocabEntryApiRecord) {
  return getRequiredVietnameseMeaning(entry)
}

function getDefinitionPreview(entry: VocabEntryApiRecord) {
  return getEnglishDefinition(entry)
}

function getExploreDecisionLabel(decision: ExploreDecision | undefined) {
  if (decision === 'shouldLearn') return 'Should learn'
  if (decision === 'alreadyKnow') return 'Already know'

  return 'Unpicked'
}

function getExploreMapClassName({
  active,
  decision,
}: {
  active: boolean
  decision: ExploreDecision | undefined
}) {
  return cn(
    'size-5 rounded-tag border border-line transition-transform hover:-translate-y-0.5',
    decision === 'shouldLearn' && 'bg-tint hover:bg-tint-soft',
    decision === 'alreadyKnow' &&
      'bg-lesson-correct/35 hover:bg-lesson-correct/25',
    !decision && 'bg-surface hover:bg-pastel-sky',
    active && 'outline-brand scale-110 outline-3 outline-offset-2'
  )
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
    'border-line absolute top-0 left-1/2 flex h-full min-h-96 w-[min(74vw,760px)] flex-col gap-4 rounded-control border p-4 transition-[opacity,transform] duration-300 ease-out sm:w-[min(78vw,760px)]',
    decision === 'shouldLearn' && 'bg-tint',
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
  emptyMessage = 'No enriched words are ready to explore yet. Ask an admin to enrich a small batch, then refresh this page.',
  entries,
  eyebrow = 'Explore',
  markEntry,
  moveExplore,
  numbering = 'frequency',
  showExploreIndex,
  source = 'explore',
  title = 'Explore Words',
}: Props) {
  const deckRef = useRef<HTMLDivElement>(null)

  useExploreArrowKeys({
    activeIndex,
    count: entries.length,
    panelRef: deckRef,
    showExploreIndex,
  })

  return (
    <ContentPanel
      eyebrow={eyebrow}
      title={title}
    >
      {entries.length > 0 ? (
        <div
          className="grid gap-4"
          ref={deckRef}
        >
          <div className="flex items-center justify-between gap-3">
            <Button
              aria-label="Previous explore word"
              className="border-line bg-surface hover:bg-tint rounded-control soft-press size-11 border disabled:opacity-35"
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
              title="Use the Left and Right arrow keys to move"
            >
              {activeIndex + 1}/{entries.length}
            </span>
            <Button
              aria-label="Next explore word"
              className="border-line bg-surface hover:bg-tint rounded-control soft-press size-11 border disabled:opacity-35"
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

          <div className="relative min-h-96 overflow-hidden px-2 py-2 sm:min-h-104">
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
                  aria-label={active ? undefined : `Open ${entry.entry.term}`}
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
                          {getExploreDecisionLabel(decision)}
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
                      {getVietnamesePreview(entry.entry)}
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
                        Should Learn
                      </ActionButton>
                      <ActionButton
                        className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                        disabled={decision === 'alreadyKnow'}
                        icon={<X className="size-4" />}
                        onClick={() =>
                          markEntry({
                            entry,
                            source,
                            status: 'alreadyKnow',
                          })
                        }
                        tone="paper"
                      >
                        Already Know
                      </ActionButton>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="border-line bg-tint rounded-control grid gap-3 border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink-soft text-xs font-normal">
                Explore map
              </span>
              <div
                aria-label="Explore map color legend"
                className="flex flex-wrap gap-2"
              >
                <span
                  aria-label="White means unpicked"
                  className="border-line bg-surface rounded-tag size-5 border"
                  role="img"
                  title="Unpicked"
                />
                <span
                  aria-label="Pink means should learn"
                  className="border-line bg-tint rounded-tag size-5 border"
                  role="img"
                  title="Should learn"
                />
                <span
                  aria-label="Green means already know"
                  className="border-line rounded-tag bg-lesson-correct/35 size-5 border"
                  role="img"
                  title="Already know"
                />
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(1.25rem,1fr))] gap-2">
              {entries.map((entry, index) => {
                const decision = decisions[entry.entry.id]

                return (
                  <Button
                    key={entry.entry.id}
                    aria-label={`Open ${entry.entry.term}: ${getExploreDecisionLabel(decision)}`}
                    className={getExploreMapClassName({
                      active: index === activeIndex,
                      decision,
                    })}
                    onClick={() => showExploreIndex(index)}
                    size="icon"
                    title={entry.entry.term}
                    type="button"
                    variant="default"
                  />
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-ink-soft text-sm leading-6 font-normal">
          {emptyMessage}
        </p>
      )}
    </ContentPanel>
  )
}
