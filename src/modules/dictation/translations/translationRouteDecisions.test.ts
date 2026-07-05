import { describe, expect, test } from 'vitest'

import { parseTranslationPayload } from './translationRouteDecisions'

const segmentId = '507f1f77bcf86cd799439011'

describe('parseTranslationPayload', () => {
  test('defaults target language to Vietnamese', () => {
    const decision = parseTranslationPayload({
      segmentId,
    })

    expect(decision.ok).toBe(true)
    if (decision.ok) expect(decision.data.targetLanguage).toBe('vi')
  })

  test('rejects unsupported target languages', () => {
    const decision = parseTranslationPayload({
      segmentId,
      targetLanguage: 'ja',
    })

    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.status).toBe(400)
  })

  test('rejects invalid segment ids', () => {
    const decision = parseTranslationPayload({
      segmentId: 'not-a-mongo-id',
      targetLanguage: 'vi',
    })

    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.status).toBe(400)
  })
})
