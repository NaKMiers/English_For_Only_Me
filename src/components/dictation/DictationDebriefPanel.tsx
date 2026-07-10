'use client'

import { Bot, Loader2, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import { Textarea } from '@/components/ui/textarea'
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
      <h3 className="text-sm font-black uppercase">{title}</h3>
      <ul className="grid gap-2">
        {items.map(item => (
          <li
            key={item}
            className="border-manga-black bg-manga-paper-soft border-2 p-2 text-sm leading-6 font-semibold wrap-break-word"
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
        requestError instanceof Error
          ? requestError.message
          : 'AI debrief is unavailable right now.'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const hasReadyDebrief = debrief?.status === 'ready'

  return (
    <MangaPanel
      eyebrow="AI coach"
      title="End-of-video debrief"
      className={className}
      action={
        <MangaButton
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
            ? 'Generating'
            : hasReadyDebrief
              ? 'Regenerate'
              : 'Generate Debrief'}
        </MangaButton>
      }
    >
      <p className="text-manga-ink-soft text-base leading-7 font-semibold">
        AI debrief appears only after video completion and uses saved attempts,
        transcript data, missed words, traps, and your notes.
      </p>

      <Label className="grid gap-2 text-sm font-black">
        Notes for this debrief
        <Textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder="Optional: what felt hard, what IELTS target you care about, or what to focus on next."
          className="border-manga-black bg-manga-white min-h-24 rounded-none border-2 text-base shadow-[3px_3px_0_var(--manga-black)]"
        />
      </Label>

      {!canGenerate ? (
        <div className="border-manga-black bg-manga-paper-soft border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]">
          Complete this video before asking the AI coach for a debrief.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="border-manga-red bg-manga-pale-red border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-red)]"
        >
          {error} Your stats are still saved; retry when the provider is ready.
        </div>
      ) : null}

      {hasReadyDebrief ? (
        <div className="grid gap-4">
          <div
            className={cn(
              'border-manga-black bg-manga-paper-soft border-2 p-3 text-base leading-7 font-semibold shadow-[3px_3px_0_var(--manga-black)]'
            )}
          >
            {debrief.contentSummary}
          </div>

          {debrief.keyVocabulary.length > 0 ? (
            <div className="grid gap-2">
              <h3 className="text-sm font-black uppercase">IELTS vocabulary</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {debrief.keyVocabulary.map(item => (
                  <div
                    key={item.term}
                    className="border-manga-black border-2 p-3 text-sm leading-6 shadow-[3px_3px_0_var(--manga-black)]"
                  >
                    <p className="font-black">{item.term}</p>
                    <p className="font-semibold">{item.meaning}</p>
                    <p className="text-manga-ink-soft font-semibold">
                      {item.example}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DebriefList
            title="Listening traps"
            items={debrief.listeningTraps}
          />
          <DebriefList
            title="Weak patterns"
            items={debrief.weakPatterns}
          />
          <DebriefList
            title="Next actions"
            items={debrief.nextActions}
          />
          <DebriefList
            title="Caveats"
            items={debrief.caveats}
          />
        </div>
      ) : null}
    </MangaPanel>
  )
}
