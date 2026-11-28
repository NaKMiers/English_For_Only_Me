'use client'

import { Bot, Loader2, PenLine, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { InlineNotice } from '@/components/common/InlineNotice'
import { Label } from '@/components/ui/label'
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
    <div className="grid gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="grid gap-2">
        {items.map(item => (
          <li
            key={item}
            className="border-line bg-tint rounded-control border p-2 text-sm leading-6 font-medium wrap-break-word"
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
  const [showNotes, setShowNotes] = useState(false)

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
    <ContentPanel
      eyebrow={text.eyebrow}
      title={text.title}
      className={className}
      action={
        <ActionButton
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
              <Bot
                aria-hidden="true"
                className="size-4"
              />
            )
          }
          onClick={generateDebrief}
          tone="paper"
        >
          {isGenerating
            ? text.generating
            : hasReadyDebrief
              ? text.regenerate
              : text.generate}
        </ActionButton>
      }
    >
      <p className="text-ink-soft text-base leading-7 font-normal">
        {text.description}
      </p>

      {showNotes ? (
        <Label className="grid gap-2 text-sm font-medium">
          {text.notesLabel}
          <Textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder={text.notesPlaceholder}
            className="border-line bg-surface rounded-control min-h-24 border text-base"
          />
        </Label>
      ) : canGenerate ? (
        <button
          className="soft-press hover-pop text-ink-soft hover:text-ink rounded-control inline-flex min-h-11 w-fit items-center gap-1.5 px-2 text-sm font-medium"
          onClick={() => setShowNotes(true)}
          type="button"
        >
          <PenLine
            aria-hidden="true"
            className="size-4"
          />
          {text.notesLabel}
        </button>
      ) : null}

      {!canGenerate ? <InlineNotice>{text.locked}</InlineNotice> : null}

      {error ? (
        <InlineNotice tone="error">
          {format(text.error, { error })}
        </InlineNotice>
      ) : null}

      {hasReadyDebrief ? (
        <div className="grid gap-4">
          <div
            className={cn(
              'border-line bg-tint rounded-control border p-3 text-base leading-7 font-medium'
            )}
          >
            {debrief.contentSummary}
          </div>

          {debrief.keyVocabulary.length > 0 ? (
            <div className="grid gap-2">
              <h3 className="text-sm font-medium">{text.vocabulary}</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {debrief.keyVocabulary.map(item => (
                  <div
                    key={item.term}
                    className="border-line rounded-control border p-3 text-sm leading-6"
                  >
                    <p className="font-medium">{item.term}</p>
                    <p className="font-medium">{item.meaning}</p>
                    <p className="text-ink-soft font-normal">{item.example}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
      ) : null}
    </ContentPanel>
  )
}
