'use client'

import { useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
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

  return (
    <MangaPanel
      eyebrow="Placement"
      title="Find your weak spots"
    >
      <p className="text-manga-ink-soft text-base leading-7 font-semibold">
        Rather than working through 162 points from A1, take a short placement
        test. It weights its questions toward the grammar Vietnamese interferes
        with most, so it spends them where the answer is genuinely uncertain
        instead of confirming things you already know. Each answer places that
        point on the review ladder.
      </p>
      {message ? (
        <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
          {message}
        </p>
      ) : null}
      <MangaButton
        disabled={pending || untouchedCount === 0}
        onClick={() => void start()}
        type="button"
      >
        {pending ? 'Building...' : 'Take Placement Test'}
      </MangaButton>
    </MangaPanel>
  )
}
