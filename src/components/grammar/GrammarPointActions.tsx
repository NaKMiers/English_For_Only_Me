'use client'

import { useRef, useState } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { MangaButton } from '@/components/ui/MangaButton'
import { predictGrammarItemStatus } from '@/modules/grammar/recall/itemStatusPatch'
import type {
  GrammarUserItemStatus,
  UserGrammarItemApiRecord,
} from '@/modules/grammar/types'

export const GRAMMAR_ITEMS_LANE = 'grammar:items'

const LABEL: Record<GrammarUserItemStatus, string> = {
  alreadyKnow: 'Already know this',
  ignored: 'Not now',
  learning: 'Start learning',
  mastered: 'Mark mastered',
}

function isSuperseded(data: unknown) {
  return (
    typeof data === 'object' &&
    data !== null &&
    'superseded' in data &&
    data.superseded === true
  )
}

/**
 * Puts a point onto the recall ladder, or takes it off.
 *
 * "Start learning" is what creates the learner's row for this point - rows are
 * created lazily on first interaction rather than pre-minted for all 162, which
 * is why an untouched point shows no state at all.
 *
 * Client-first: a click shows the predicted row at once (same patch the server
 * applies, see `itemStatusPatch.ts`) and the write goes through the outbox. Each
 * write SETS the desired status, and rapid clicks on one point merge into the
 * last one, so the last click wins. The newest server row replaces the
 * prediction; if the newest write is rejected, the row rolls back to the last
 * state the server confirmed and the error shows.
 */
export function GrammarPointActions({
  initialItem,
  slug,
}: {
  initialItem: UserGrammarItemApiRecord | null
  slug: string
}) {
  const outbox = useClientOutbox()
  const [item, setItem] = useState(initialItem)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const confirmedRef = useRef(initialItem)
  const latestRef = useRef(0)

  function setStatus(status: GrammarUserItemStatus) {
    latestRef.current += 1

    const seq = latestRef.current

    setMessage(null)
    setSaving(true)
    setItem(current =>
      predictGrammarItemStatus({ item: current, pointSlug: slug, status })
    )

    void outbox
      .enqueue({
        body: { slug, status },
        lane: GRAMMAR_ITEMS_LANE,
        mergeKey: `grammar:item:${slug}`,
        url: '/api/grammar/items',
      })
      .then(result => {
        if (result.ok && isSuperseded(result.data)) return
        if (result.ok)
          confirmedRef.current = (
            result.data as { item: UserGrammarItemApiRecord }
          ).item

        // An older write settling never overrides a newer click.
        if (seq !== latestRef.current) return

        setSaving(false)
        setItem(confirmedRef.current)

        if (!result.ok)
          setMessage(result.error || 'Could not update this point.')
      })
  }

  return (
    <div className="border-manga-black bg-manga-paper-soft rounded-panel grid gap-3 border-3 p-3 shadow-[4px_4px_0_var(--manga-black)]">
      {item ? (
        <p
          aria-busy={saving}
          className="font-sans text-xs font-black uppercase"
        >
          {item.status === 'learning'
            ? `Learning - stage ${item.recallStage}/7${
                item.dueAt ? '' : ' (not scheduled)'
              }`
            : item.status === 'mastered'
              ? 'Mastered'
              : item.status === 'alreadyKnow'
                ? 'Marked as already known'
                : 'Skipped for now'}
          {saving ? ' - saving' : ''}
        </p>
      ) : (
        <p className="text-manga-ink-soft font-sans text-xs font-black uppercase">
          Not started
        </p>
      )}

      {message ? (
        <p className="border-manga-black bg-manga-red text-manga-white rounded-control border-2 p-2 text-xs font-black uppercase">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(['learning', 'alreadyKnow', 'ignored'] as const).map(status => (
          <MangaButton
            disabled={item?.status === status}
            key={status}
            onClick={() => setStatus(status)}
            tone={status === 'learning' ? 'ink' : 'paper'}
            type="button"
          >
            {LABEL[status]}
          </MangaButton>
        ))}
      </div>
    </div>
  )
}
