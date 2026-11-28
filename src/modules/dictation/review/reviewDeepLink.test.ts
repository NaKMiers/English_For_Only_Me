import { describe, expect, test } from 'vitest'

import {
  parseReviewSegmentParam,
  pickNextReview,
  REVIEW_QUEUE_HREF,
  reviewPracticeHref,
} from './reviewDeepLink'

const video = '507f1f77bcf86cd799439011'
const own = '507f1f77bcf86cd799439021'
const other = '507f1f77bcf86cd799439022'
const foreign = '507f1f77bcf86cd799439099'

describe('parseReviewSegmentParam', () => {
  test('a segment of this video opens in review mode', () => {
    expect(parseReviewSegmentParam(own, [own, other])).toBe(own)
    expect(parseReviewSegmentParam([own, other], [own, other])).toBe(own)
  })

  test('a foreign or old segment id is ignored', () => {
    expect(parseReviewSegmentParam(foreign, [own, other])).toBeNull()
  })

  test('missing or malformed values are ignored', () => {
    expect(parseReviewSegmentParam(undefined, [own])).toBeNull()
    expect(parseReviewSegmentParam('', [own])).toBeNull()
    expect(parseReviewSegmentParam('not-an-id', ['not-an-id'])).toBeNull()
  })
})

describe('pickNextReview', () => {
  test('counts other sentences once and links the first', () => {
    const next = pickNextReview(
      [
        { segmentId: own, videoId: video },
        { segmentId: other, videoId: video },
        { segmentId: other, videoId: video },
        { segmentId: foreign, videoId: video },
      ],
      own
    )

    expect(next).toEqual({
      href: reviewPracticeHref({ segmentId: other, videoId: video }),
      left: 2,
    })
  })

  test('nothing else due: back to the queue', () => {
    expect(pickNextReview([{ segmentId: own, videoId: video }], own)).toEqual({
      href: REVIEW_QUEUE_HREF,
      left: 0,
    })
  })

  test('the deep link names the video and the sentence', () => {
    expect(reviewPracticeHref({ segmentId: own, videoId: video })).toBe(
      `/dictation/videos/${video}/practice?segment=${own}`
    )
  })
})
