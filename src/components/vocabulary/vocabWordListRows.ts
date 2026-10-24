import type {
  VocabWordListRecord,
  VocabWordListView,
} from '@/modules/vocabulary/types'

export function wordMatchesView(
  word: VocabWordListRecord,
  view: VocabWordListView,
  now = new Date()
) {
  if (view === 'dueToday')
    return (
      word.item.status === 'learning' &&
      Boolean(word.item.dueAt && new Date(word.item.dueAt) <= now)
    )

  if (view === 'knownTotal')
    return word.item.status === 'alreadyKnow' || word.item.status === 'mastered'

  return word.item.status === view
}

/**
 * Put `next` in place of the row for the same entry, or drop the row when the
 * word no longer belongs in this view (a status change moves it elsewhere).
 */
export function replaceWordListRow({
  next,
  rows,
  view,
}: {
  next: VocabWordListRecord
  rows: VocabWordListRecord[]
  view: VocabWordListView
}) {
  const keep = wordMatchesView(next, view)

  return rows.flatMap(row => {
    if (row.entry.id !== next.entry.id) return [row]

    return keep ? [next] : []
  })
}

/**
 * Undo an optimistic change: put the word back where it was. A word whose
 * restored state no longer belongs in this view (an earlier change to it
 * already saved and moved it out) is dropped instead of reinserted.
 */
export function restoreWordListRow({
  index,
  rows,
  view,
  word,
}: {
  index: number
  rows: VocabWordListRecord[]
  view: VocabWordListView
  word: VocabWordListRecord
}) {
  const present = rows.some(row => row.entry.id === word.entry.id)

  if (!wordMatchesView(word, view))
    return present ? rows.filter(row => row.entry.id !== word.entry.id) : rows

  if (present)
    return rows.map(row => (row.entry.id === word.entry.id ? word : row))

  const next = [...rows]

  next.splice(Math.min(Math.max(index, 0), next.length), 0, word)

  return next
}

export function buildVocabWordListHref({
  page,
  perPage,
  view,
}: {
  page: number
  perPage: number
  view: VocabWordListView
}) {
  const params = new URLSearchParams({ view })

  if (page > 1) params.set('page', String(page))
  params.set('perPage', String(perPage))

  return `/vocabulary/words?${params.toString()}`
}
