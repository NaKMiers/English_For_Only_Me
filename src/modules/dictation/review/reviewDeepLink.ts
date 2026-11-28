/**
 * The review queue's deep link: a weak sentence opens on its own, inside its
 * video's practice screen (`?segment=`), instead of the video's start or its
 * "Done" screen.
 */

const OBJECT_ID = /^[a-f\d]{24}$/i

interface ReviewTarget {
  segmentId: string
  videoId: string
}

export const REVIEW_QUEUE_HREF = '/dictation/review'

export function reviewPracticeHref({ segmentId, videoId }: ReviewTarget) {
  return `/dictation/videos/${videoId}/practice?segment=${segmentId}`
}

/**
 * The `?segment=` value when it names one of this video's practice segments;
 * anything else (missing, malformed, another video's sentence, an old
 * transcript's) is ignored and the page opens as normal practice.
 */
export function parseReviewSegmentParam(
  value: string | string[] | undefined,
  segmentIds: readonly string[]
): string | null {
  const segmentId = Array.isArray(value) ? value[0] : value

  if (!segmentId || !OBJECT_ID.test(segmentId)) return null

  return segmentIds.includes(segmentId) ? segmentId : null
}

/**
 * After the sentence on screen: how many other sentences are still due (one
 * per sentence, though a sentence can hold several items) and where the next
 * one opens, or the queue itself when none is left.
 */
export function pickNextReview(
  dueItems: readonly ReviewTarget[],
  currentSegmentId: string
): { href: string; left: number } {
  const others = new Map<string, ReviewTarget>()

  for (const item of dueItems)
    if (item.segmentId !== currentSegmentId && !others.has(item.segmentId))
      others.set(item.segmentId, item)

  const next = others.values().next().value

  return {
    href: next ? reviewPracticeHref(next) : REVIEW_QUEUE_HREF,
    left: others.size,
  }
}
