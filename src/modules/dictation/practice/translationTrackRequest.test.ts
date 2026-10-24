import { describe, expect, it } from 'vitest'

import { parseTranslationTrackRequest } from './translationTrackRequest'

const videoId = '507f1f77bcf86cd799439011'

function parse(query: string) {
  return parseTranslationTrackRequest(new URLSearchParams(query))
}

describe('parseTranslationTrackRequest', () => {
  it('accepts a video id and a language tag', () => {
    expect(parse(`videoId=${videoId}&language=VI`)).toEqual({
      data: { language: 'vi', videoId },
      ok: true,
    })
    expect(parse(`videoId=${videoId}&language=zh-hans`)).toMatchObject({
      ok: true,
    })
  })

  it.each([
    `language=vi`,
    `videoId=nope&language=vi`,
    `videoId=${videoId}`,
    `videoId=${videoId}&language=vi.$where`,
    `videoId=${videoId}&language=$gt`,
    `videoId=${videoId}&language=x`,
  ])('refuses %s', query => {
    expect(parse(query)).toMatchObject({ ok: false, status: 400 })
  })
})
