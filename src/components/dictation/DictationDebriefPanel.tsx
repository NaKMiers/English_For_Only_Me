'use client'

import { Bot, Loader2, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
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
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="grid gap-2">
        {items.map(item => (
          <li
            key={item}
            className="border-line bg-tint rounded-control border p-2 text-sm leading-6 font-semibold wrap-break-word"
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
      setError(
        requestError instanceof Error && requestError.message
          ? requestError.message
          : text.unavailable
      )
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
          tone={hasReadyDebrief ? 'paper' : 'ink'}
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

      <Label className="grid gap-2 text-sm font-semibold">
        {text.notesLabel}
        <Textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder={text.notesPlaceholder}
          className="border-line bg-surface rounded-control min-h-24 border text-base"
        />
      </Label>

      {!canGenerate ? (
        <div className="border-line bg-tint rounded-control border p-3 text-sm leading-6 font-semibold">
          {text.locked}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="border-brand bg-tint-soft rounded-control border p-3 text-sm leading-6 font-semibold"
        >
          {format(text.error, { error })}
        </div>
      ) : null}

      {hasReadyDebrief ? (
        <div className="grid gap-4">
          <div
            className={cn(
              'border-line bg-tint rounded-control border p-3 text-base leading-7 font-semibold'
            )}
          >
            {debrief.contentSummary}
          </div>

          {debrief.keyVocabulary.length > 0 ? (
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">{text.vocabulary}</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {debrief.keyVocabulary.map(item => (
                  <div
                    key={item.term}
                    className="border-line rounded-control border p-3 text-sm leading-6"
                  >
                    <p className="font-semibold">{item.term}</p>
                    <p className="font-semibold">{item.meaning}</p>
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
