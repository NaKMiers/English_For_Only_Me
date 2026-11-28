'use client'

import {
  ChevronDown,
  Loader2,
  PenLine,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

import { InlineNotice } from '@/components/common/InlineNotice'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ActionButton } from '@/components/ui/ActionButton'
import { Textarea } from '@/components/ui/textarea'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { DictationDebriefApiRecord } from '@/modules/dictation/types'
import { createDictationDebriefApi } from '@/requests/dictationDebriefsApi'

interface Props {
  canGenerate: boolean
  className?: string
  initialDebrief?: DictationDebriefApiRecord | null
  videoId: string
}

function DebriefList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null

  return (
    <div className="bg-surface/80 rounded-control grid content-start gap-2 p-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="grid list-disc gap-1 pl-4 text-sm leading-6">
        {items.map(item => (
          <li
            className="wrap-break-word"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DictationDebriefPanel({
  canGenerate,
  className,
  initialDebrief = null,
  videoId,
}: Props) {
  const text = useMessages().dictation.debrief
  const [debrief, setDebrief] = useState(initialDebrief)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [notes, setNotes] = useState('')
  // Starts closed so the results stay short; a fresh debrief opens it.
  const [isOpen, setIsOpen] = useState(false)

  async function generateDebrief() {
    if (!canGenerate) return

    setError(null)
    setIsGenerating(true)

    try {
      const response = await createDictationDebriefApi({
        notes,
        videoId,
      })

      setDebrief(response.debrief)
      setIsOpen(true)
    } catch (requestError) {
      // The learner sees the catalogue's words; the details go to the console.
      console.error('Dictation debrief failed.', requestError)
      setError(text.unavailable)
    } finally {
      setIsGenerating(false)
    }
  }

  const hasReadyDebrief = debrief?.status === 'ready'

  return (
    // Its own tinted card with a solid brand button: the AI coach is the one
    // extra step on the results page, so it should not read as a footnote.
    // The head folds the rest away; Generate stays in reach either way.
    <Collapsible
      className={cn(
        'border-accent-purple/25 rounded-panel from-pastel-lilac via-brand-soft/40 to-surface grid border bg-linear-160 p-4 sm:p-5',
        className
      )}
      onOpenChange={setIsOpen}
      open={isOpen}
      render={<section aria-labelledby="dictation-debrief-title" />}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <CollapsibleTrigger className="group soft-press hover-pop rounded-control flex min-w-48 flex-1 items-center gap-4 text-left">
          <span
            aria-hidden="true"
            className="bg-surface text-accent-purple shadow-card grid size-12 shrink-0 place-items-center rounded-full"
          >
            <Sparkles className="size-6" />
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-accent-purple text-xs font-medium">
              {text.eyebrow}
            </span>
            <span
              className="font-sans text-lg leading-tight font-medium"
              id="dictation-debrief-title"
            >
              {text.title}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="text-ink-soft size-5 shrink-0 transition-transform group-data-panel-open:rotate-180"
          />
        </CollapsibleTrigger>
        <ActionButton
          className="bg-brand text-surface hover:bg-brand/90 hover:text-surface min-h-12 border-transparent px-6 text-base max-sm:w-full"
          disabled={!canGenerate || isGenerating}
          icon={
            isGenerating ? (
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : hasReadyDebrief ? (
              <RotateCcw
                aria-hidden="true"
                className="size-4"
              />
            ) : (
              <Sparkles
                aria-hidden="true"
                className="size-4"
              />
            )
          }
          onClick={generateDebrief}
        >
          {isGenerating
            ? text.generating
            : hasReadyDebrief
              ? text.regenerate
              : text.generate}
        </ActionButton>
      </div>

      <CollapsiblePanel className="grid gap-4 pt-4">
        <p className="text-ink-soft text-sm leading-5">{text.description}</p>

        {canGenerate ? (
          // The notes fold too: optional, so closed until asked for.
          <Collapsible className="grid gap-2">
            <CollapsibleTrigger className="group soft-press hover-pop text-ink-soft hover:text-ink rounded-control inline-flex min-h-11 w-fit items-center gap-1.5 px-2 text-sm font-medium">
              <PenLine
                aria-hidden="true"
                className="size-4"
              />
              {text.notesLabel}
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-data-panel-open:rotate-180"
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <Textarea
                aria-label={text.notesLabel}
                className="border-line bg-surface rounded-control min-h-24 border text-base"
                onChange={event => setNotes(event.target.value)}
                placeholder={text.notesPlaceholder}
                value={notes}
              />
            </CollapsiblePanel>
          </Collapsible>
        ) : null}

        {!canGenerate ? <InlineNotice>{text.locked}</InlineNotice> : null}

        {error ? (
          <InlineNotice tone="error">
            {format(text.error, { error })}
          </InlineNotice>
        ) : null}

        {hasReadyDebrief ? (
          <div className="grid gap-3">
            <p className="bg-surface/80 rounded-control p-3 text-base leading-7">
              {debrief.contentSummary}
            </p>

            {debrief.keyVocabulary.length > 0 ? (
              <div className="grid gap-2">
                <h3 className="text-sm font-medium">{text.vocabulary}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {debrief.keyVocabulary.map(item => (
                    <div
                      key={item.term}
                      className="bg-surface/80 rounded-control grid gap-0.5 p-3 text-sm leading-6"
                    >
                      <p className="font-medium">{item.term}</p>
                      <p>{item.meaning}</p>
                      <p className="text-ink-soft text-xs leading-5">
                        {item.example}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2 md:grid-cols-2">
              <DebriefList
                title={text.listeningTraps}
                items={debrief.listeningTraps}
              />
              <DebriefList
                title={text.weakPatterns}
                items={debrief.weakPatterns}
              />
              <DebriefList
                title={text.nextActions}
                items={debrief.nextActions}
              />
              <DebriefList
                title={text.caveats}
                items={debrief.caveats}
              />
            </div>
          </div>
        ) : null}
      </CollapsiblePanel>
    </Collapsible>
  )
}
