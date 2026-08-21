'use client'

import { useState } from 'react'

import { Sensei } from '@/components/grammar/cast/Sensei'
import { ComicPanel } from '@/components/grammar/comic/ComicPanel'
import { SpeechBubble } from '@/components/grammar/comic/SpeechBubble'
import { MangaButton } from '@/components/ui/MangaButton'
import type { DiagnosticItem } from '@/modules/grammar/diagnostic/selectDiagnosticItems'

import { GrammarDiagnostic } from './GrammarDiagnostic'

export function GrammarDiagnosticLauncher({
  untouchedCount,
}: {
  untouchedCount: number
}) {
  const [items, setItems] = useState<DiagnosticItem[] | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function start() {
    setPending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/grammar/diagnostic')

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)

        setMessage(
          (body as { message?: string } | null)?.message ??
            'Could not build a diagnostic.'
        )
        return
      }

      const data = (await response.json()) as { items: DiagnosticItem[] }

      if (data.items.length === 0) {
        setMessage(
          'No untested points have drills written yet. Run grammar:generate to write more lessons.'
        )
        return
      }

      setItems(data.items)
    } finally {
      setPending(false)
    }
  }

  if (items)
    return (
      <GrammarDiagnostic
        items={items}
        onClose={() => setItems(null)}
      />
    )

  // Light framing only: the sensei sets the test up and reads out the result,
  // and says nothing between questions. A character commenting on every answer
  // would be exhausting and would leak how you are doing mid-test.
  return (
    <ComicPanel
      caption="Placement"
      edge="b"
    >
      <div className="flex items-start gap-3">
        <Sensei expression="wary" />
        <div className="grid min-w-0 gap-2">
          <h2 className="font-sans text-2xl leading-none font-black uppercase">
            Find out what you are wrong about
          </h2>
          <SpeechBubble speaker="Sensei">
            {untouchedCount} rules I have never seen you attempt. Sit the test.
            I will spend the questions where your first language fights hardest,
            not on things you already know.
          </SpeechBubble>
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
            Each answer places that rule on the review ladder. A correct one
            starts it mid-ladder rather than marking it known, so it comes back
            to be confirmed.
          </p>
          {message ? (
            <p
              className="text-manga-ink-soft text-sm leading-6 font-semibold"
              role="status"
            >
              {message}
            </p>
          ) : null}
          <div className="flex">
            <MangaButton
              disabled={pending || untouchedCount === 0}
              onClick={() => void start()}
              type="button"
            >
              {pending ? 'Building...' : 'Take Placement Test'}
            </MangaButton>
          </div>
        </div>
      </div>
    </ComicPanel>
  )
}
