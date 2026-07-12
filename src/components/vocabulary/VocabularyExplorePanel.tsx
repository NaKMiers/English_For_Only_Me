'use client'

import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { Button } from '@/components/ui/button'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import type {
  VocabEntryApiRecord,
  VocabEntryWithUserStateRecord,
} from '@/modules/vocabulary/types'

import { VocabTermHeader } from './VocabTermHeader'

export type ExploreDecision = 'shouldLearn' | 'alreadyKnow'

interface Props {
  activeIndex: number
  decisions: Record<string, ExploreDecision>
  entries: VocabEntryWithUserStateRecord[]
  isLoading: boolean
  markEntry: (input: {
    entry: VocabEntryWithUserStateRecord
    source: 'explore'
    status: 'shouldLearn' | 'alreadyKnow'
  }) => void
  moveExplore: (delta: number) => void
  showExploreIndex: (index: number) => void
}

function getDefinitionPreview(entry: VocabEntryApiRecord) {
  return (
    entry.definitions[0]?.definition ??
    entry.localizedMeanings[0]?.meaning ??
    'No definition yet. Lookup or admin enrich can fill this word.'
  )
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
    'size-5 border-2 border-manga-black shadow-[2px_2px_0_var(--manga-black)] transition-transform hover:-translate-y-0.5',
    decision === 'shouldLearn' && 'bg-manga-paper-soft hover:bg-manga-pale-red',
    decision === 'alreadyKnow' && 'bg-emerald-300 hover:bg-emerald-200',
    !decision && 'bg-manga-white hover:bg-cyan-100',
    active && 'outline-manga-bright-red scale-110 outline-3 outline-offset-2'
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
    'border-manga-black absolute top-0 left-1/2 grid h-full min-h-96 w-[min(74vw,760px)] gap-4 border-3 p-4 shadow-[5px_5px_0_var(--manga-black)] transition-[opacity,transform] duration-300 ease-out sm:w-[min(78vw,760px)]',
    decision === 'shouldLearn' && 'bg-manga-paper-soft',
    decision === 'alreadyKnow' && 'bg-emerald-50',
    !decision && 'bg-manga-white',
    !active && 'cursor-pointer hover:opacity-80',
    !visible && 'pointer-events-none opacity-0'
  )
}

export function VocabularyExplorePanel({
  activeIndex,
  decisions,
  entries,
  isLoading,
  markEntry,
  moveExplore,
  showExploreIndex,
}: Props) {
  return (
    <MangaPanel
      eyebrow="Explore"
      title="Explore Words"
    >
      {entries.length > 0 ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              aria-label="Previous explore word"
              className="border-manga-black bg-manga-white hover:bg-manga-paper-soft size-11 rounded-none border-3 shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-35"
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
            <span className="text-manga-ink-soft text-xs font-black uppercase">
              {activeIndex + 1}/{entries.length}
            </span>
            <Button
              aria-label="Next explore word"
              className="border-manga-black bg-manga-white hover:bg-manga-paper-soft size-11 rounded-none border-3 shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-35"
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
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="grid min-w-0 flex-1 gap-1">
                        <VocabTermHeader
                          entry={entry.entry}
                          size="lg"
                        />
                        <p className="text-manga-ink-soft text-xs font-black uppercase">
                          {getExploreDecisionLabel(decision)}
                        </p>
                      </div>
                      <PageTag tone="pale">
                        #{entry.entry.frequencyRank ?? index + 1}
                      </PageTag>
                    </div>
                    <p className="text-manga-ink-soft max-w-2xl text-base leading-7 font-semibold">
                      {getDefinitionPreview(entry.entry)}
                    </p>
                  </div>
                  {distance === 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      <MangaButton
                        className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                        disabled={isLoading || decision === 'shouldLearn'}
                        icon={<BookOpen className="size-4" />}
                        onClick={() =>
                          markEntry({
                            entry,
                            source: 'explore',
                            status: 'shouldLearn',
                          })
                        }
                      >
                        Should Learn
                      </MangaButton>
                      <MangaButton
                        className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                        disabled={isLoading || decision === 'alreadyKnow'}
                        icon={<X className="size-4" />}
                        onClick={() =>
                          markEntry({
                            entry,
                            source: 'explore',
                            status: 'alreadyKnow',
                          })
                        }
                        tone="paper"
                      >
                        Already Know
                      </MangaButton>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="border-manga-black bg-manga-paper-soft grid gap-3 border-3 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-manga-ink-soft text-xs font-black uppercase">
                Explore map
              </span>
              <div
                aria-label="Explore map color legend"
                className="flex flex-wrap gap-2"
              >
                <span
                  aria-label="White means unpicked"
                  className="border-manga-black bg-manga-white size-5 border-2 shadow-[2px_2px_0_var(--manga-black)]"
                  role="img"
                  title="Unpicked"
                />
                <span
                  aria-label="Pink means should learn"
                  className="border-manga-black bg-manga-paper-soft size-5 border-2 shadow-[2px_2px_0_var(--manga-black)]"
                  role="img"
                  title="Should learn"
                />
                <span
                  aria-label="Green means already know"
                  className="border-manga-black size-5 border-2 bg-emerald-300 shadow-[2px_2px_0_var(--manga-black)]"
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
        <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
          No enriched words are ready to explore yet. Ask an admin to enrich a
          small batch, then refresh this page.
        </p>
      )}
    </MangaPanel>
  )
}
