'use client'

import { useState } from 'react'

import { MangaButton } from '@/components/ui/MangaButton'
import type {
  GrammarUserItemStatus,
  UserGrammarItemApiRecord,
} from '@/modules/grammar/types'

const LABEL: Record<GrammarUserItemStatus, string> = {
  alreadyKnow: 'Already know this',
  ignored: 'Not now',
  learning: 'Start learning',
  mastered: 'Mark mastered',
}

/**
 * Puts a point onto the recall ladder, or takes it off.
 *
 * "Start learning" is what creates the learner's row for this point - rows are
 * created lazily on first interaction rather than pre-minted for all 162, which
 * is why an untouched point shows no state at all.
 */
export function GrammarPointActions({
  initialItem,
  slug,
}: {
  initialItem: UserGrammarItemApiRecord | null
  slug: string
}) {
  const [item, setItem] = useState(initialItem)
  const [pending, setPending] = useState<GrammarUserItemStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function setStatus(status: GrammarUserItemStatus) {
    setPending(status)
    setMessage(null)

    try {
      const response = await fetch('/api/grammar/items', {
        body: JSON.stringify({ slug, status }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)

        setMessage(
          (body as { message?: string } | null)?.message ??
            'Could not update this point.'
        )
        return
      }

      const data = (await response.json()) as { item: UserGrammarItemApiRecord }

      setItem(data.item)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="border-manga-black bg-manga-paper-soft grid gap-3 border-3 p-3 shadow-[4px_4px_0_var(--manga-black)]">
      {item ? (
        <p className="font-sans text-xs font-black uppercase">
          {item.status === 'learning'
            ? `Learning - stage ${item.recallStage}/7${
                item.dueAt ? '' : ' (not scheduled)'
              }`
            : item.status === 'mastered'
              ? 'Mastered'
              : item.status === 'alreadyKnow'
                ? 'Marked as already known'
                : 'Skipped for now'}
        </p>
      ) : (
        <p className="text-manga-ink-soft font-sans text-xs font-black uppercase">
          Not started
        </p>
      )}

      {message ? (
        <p className="border-manga-black bg-manga-red text-manga-white border-2 p-2 text-xs font-black uppercase">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(['learning', 'alreadyKnow', 'ignored'] as const).map(status => (
          <MangaButton
            disabled={pending !== null || item?.status === status}
            key={status}
            onClick={() => void setStatus(status)}
            tone={status === 'learning' ? 'ink' : 'paper'}
            type="button"
          >
            {pending === status ? 'Saving...' : LABEL[status]}
          </MangaButton>
        ))}
      </div>
    </div>
  )
}
