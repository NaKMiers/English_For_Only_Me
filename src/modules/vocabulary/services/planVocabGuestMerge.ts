/**
 * Fold a guest's vocabulary items into the signed-in user's items.
 *
 * Items are unique per (userId, vocabEntryId), so a blind `updateMany` of the
 * owner would collide whenever both sides saved the same word. Each guest item
 * is planned here instead:
 *
 * - only the guest has the word: the item moves as it is (same `_id`, so its
 *   recall attempts still point at it)
 * - both have it: the user's item keeps its status, stage and schedule (the
 *   account is the source of truth), takes the summed review counts, the
 *   earliest first sighting and the latest review, and the guest item is
 *   dropped; its recall attempts are repointed at the user's item
 */

export interface VocabMergeItem {
  correctCount: number
  firstSeenAt: Date
  id: string
  lastReviewedAt: Date | null
  reviewCount: number
  vocabEntryId: string
  wrongCount: number
}

export interface VocabItemCombine {
  /** Guest item to delete once its attempts point at the user's item. */
  guestItemId: string
  update: Pick<
    VocabMergeItem,
    | 'correctCount'
    | 'firstSeenAt'
    | 'lastReviewedAt'
    | 'reviewCount'
    | 'wrongCount'
  >
  userItemId: string
}

export interface VocabMergePlan {
  combine: VocabItemCombine[]
  /** Guest item ids that move to the user unchanged. */
  move: string[]
}

function earliest(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b
}

function latest(a: Date | null, b: Date | null) {
  if (!a) return b
  if (!b) return a

  return a.getTime() >= b.getTime() ? a : b
}

export function planVocabGuestMerge(
  guestItems: VocabMergeItem[],
  userItems: VocabMergeItem[]
): VocabMergePlan {
  const userByEntry = new Map(userItems.map(item => [item.vocabEntryId, item]))
  const plan: VocabMergePlan = { combine: [], move: [] }

  for (const guest of guestItems) {
    const user = userByEntry.get(guest.vocabEntryId)

    if (!user) {
      plan.move.push(guest.id)
      continue
    }

    plan.combine.push({
      guestItemId: guest.id,
      update: {
        correctCount: user.correctCount + guest.correctCount,
        firstSeenAt: earliest(user.firstSeenAt, guest.firstSeenAt),
        lastReviewedAt: latest(user.lastReviewedAt, guest.lastReviewedAt),
        reviewCount: user.reviewCount + guest.reviewCount,
        wrongCount: user.wrongCount + guest.wrongCount,
      },
      userItemId: user.id,
    })
  }

  return plan
}
