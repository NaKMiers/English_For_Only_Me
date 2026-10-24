/**
 * Keyset cursor for paging the vocab due queue.
 *
 * The queue is sorted by (dueAt, updatedAt, _id). A cursor remembers the last
 * item the server scanned plus `dueBefore`, the moment the first page was
 * read. Later pages only return items strictly after the cursor that were
 * already due at `dueBefore`, so:
 *
 * - cards the client still holds are never sent twice (they sort before it),
 * - a card answered wrong in this session (dueAt reset to "now") does not come
 *   back until the next session, and
 * - a card answered right (dueAt in the future) drops out on its own,
 *
 * all without the client listing every id it has seen in the URL.
 *
 *   v1.<dueBeforeMs>.<dueAtMs>.<updatedAtMs>.<itemId>
 */
export interface VocabRecallDueCursor {
  dueAt: number
  dueBefore: number
  itemId: string
  updatedAt: number
}

export const VOCAB_RECALL_DUE_CURSOR_PATTERN =
  /^v1\.(\d{1,15})\.(\d{1,15})\.(\d{1,15})\.([a-f\d]{24})$/i

export function encodeVocabRecallDueCursor(cursor: VocabRecallDueCursor) {
  return [
    'v1',
    cursor.dueBefore,
    cursor.dueAt,
    cursor.updatedAt,
    cursor.itemId,
  ].join('.')
}

export function decodeVocabRecallDueCursor(
  value: string
): VocabRecallDueCursor | null {
  const match = VOCAB_RECALL_DUE_CURSOR_PATTERN.exec(value)

  if (!match) return null

  const [, dueBefore, dueAt, updatedAt, itemId] = match

  return {
    dueAt: Number(dueAt),
    dueBefore: Number(dueBefore),
    itemId: itemId.toLowerCase(),
    updatedAt: Number(updatedAt),
  }
}

/** The Mongo filter (without userId/status) for one page of due items. */
export function buildVocabRecallDueFilter({
  cursor,
  now,
}: {
  cursor: VocabRecallDueCursor | null
  now: Date
}) {
  if (!cursor) return { dueAt: { $lte: now } }

  const dueAt = new Date(cursor.dueAt)
  const updatedAt = new Date(cursor.updatedAt)
  const dueBefore = new Date(Math.min(cursor.dueBefore, now.getTime()))

  return {
    $or: [
      { dueAt: { $gt: dueAt } },
      { dueAt, updatedAt: { $gt: updatedAt } },
      { _id: { $gt: cursor.itemId }, dueAt, updatedAt },
    ],
    dueAt: { $lte: dueBefore },
  }
}

/**
 * The cursor for the page after `items`, or null when the scan came back short
 * (nothing left to page through).
 */
export function getNextVocabRecallDueCursor({
  cursor,
  items,
  limit,
  now,
}: {
  cursor: VocabRecallDueCursor | null
  items: Array<{ _id: unknown; dueAt?: Date | null; updatedAt: Date }>
  limit: number
  now: Date
}) {
  const last = items.at(-1)

  if (items.length < limit || !last?.dueAt) return null

  return encodeVocabRecallDueCursor({
    dueAt: new Date(last.dueAt).getTime(),
    dueBefore: cursor?.dueBefore ?? now.getTime(),
    itemId: String(last._id),
    updatedAt: new Date(last.updatedAt).getTime(),
  })
}
