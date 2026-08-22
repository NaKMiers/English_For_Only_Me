import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { chunkPoints, generateTestDrills } from './generateTestDrills'
import type { GrammarTestCandidate } from './types'

function candidate(slug: string): GrammarTestCandidate {
  return {
    cefrLevel: 'B1',
    commonMistakes: [
      {
        right: 'I have lived',
        why: 'Present perfect needs have.',
        wrong: 'I am lived',
      },
    ],
    complexity: 3,
    drills: [],
    family: 'verb-tenses',
    formPatterns: ['have/has + past participle'],
    l1Risk: 'high',
    l1RiskObserved: null,
    reviewStatus: 'unverified',
    slug,
    status: null,
    summary: 'Links a past action to now.',
    title: slug,
  }
}

function questionFor(slug: string) {
  return {
    acceptedAnswers: [`answer for ${slug}`],
    choices: [],
    difficulty: 1,
    explanation: `why ${slug}`,
    kind: 'transform',
    pointSlug: slug,
    prompt: `prompt for ${slug}`,
    punctuationSensitive: false,
    target: `answer for ${slug}`,
  }
}

/** A fetch stub shaped like the OpenAI Responses API. */
function respondWith(payload: unknown, ok = true) {
  return vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve(
          ok
            ? { output_text: JSON.stringify(payload), status: 'completed' }
            : { error: { message: 'boom' } }
        ),
      ok,
    } as unknown as Response)
  ) as unknown as typeof fetch
}

describe('chunkPoints', () => {
  it('splits into batches of the given size', () => {
    const points = Array.from({ length: 25 }, (_, index) =>
      candidate(`p${index}`)
    )
    const chunks = chunkPoints(points, 10)

    expect(chunks.map(chunk => chunk.length)).toEqual([10, 10, 5])
  })

  it('returns nothing for no points', () => {
    expect(chunkPoints([], 10)).toEqual([])
  })

  it('keeps every point exactly once', () => {
    const points = Array.from({ length: 17 }, (_, index) =>
      candidate(`p${index}`)
    )
    const flat = chunkPoints(points, 5).flat()

    expect(flat).toHaveLength(17)
    expect(new Set(flat.map(point => point.slug)).size).toBe(17)
  })
})

describe('generateTestDrills', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns one question per point on the happy path', async () => {
    const result = await generateTestDrills({
      fetcher: respondWith({
        questions: [questionFor('a'), questionFor('b')],
      }),
      points: [candidate('a'), candidate('b')],
    })

    expect(result.questions.map(question => question.pointSlug)).toEqual([
      'a',
      'b',
    ])
    expect(result.notices).toEqual([])
  })

  /**
   * The reason generation is chunked at all. One request for 40 questions is one
   * truncation away from a learner waiting fifteen seconds for nothing - and
   * `openAiClientCore.ts` is explicit that a truncated response is still billed.
   */
  it('splits a large request into one call per batch', async () => {
    const fetcher = respondWith({ questions: [] })

    await generateTestDrills({
      fetcher,
      points: Array.from({ length: 40 }, (_, index) => candidate(`p${index}`)),
    })

    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('keeps the batches that worked when one fails', async () => {
    let call = 0
    const fetcher = vi.fn(() => {
      call += 1

      // Second batch fails; first and third succeed.
      if (call === 2)
        return Promise.resolve({
          json: () => Promise.resolve({ error: { message: 'rate limited' } }),
          ok: false,
        } as unknown as Response)

      return Promise.resolve({
        json: () =>
          Promise.resolve({
            output_text: JSON.stringify({
              questions: [questionFor(`batch-${call}`)],
            }),
            status: 'completed',
          }),
        ok: true,
      } as unknown as Response)
    }) as unknown as typeof fetch

    const points = Array.from({ length: 25 }, (_, index) =>
      candidate(`batch-${Math.floor(index / 10) + 1}`)
    )
    const result = await generateTestDrills({ fetcher, points })

    expect(result.questions.length).toBeGreaterThan(0)
    expect(result.notices.some(notice => notice.includes('rate limited'))).toBe(
      true
    )
  })

  it('falls back silently when there is no API key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')

    const fetcher = respondWith({ questions: [] })
    const result = await generateTestDrills({
      fetcher,
      points: [candidate('a')],
    })

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.questions).toEqual([])
    expect(result.notices[0]).toContain('not configured')
  })

  it('never throws when the provider is unreachable', async () => {
    const fetcher = vi.fn(() =>
      Promise.reject(new Error('network down'))
    ) as unknown as typeof fetch

    const result = await generateTestDrills({
      fetcher,
      points: [candidate('a')],
    })

    expect(result.questions).toEqual([])
    expect(result.notices).toHaveLength(1)
  })

  it('reports unreadable JSON rather than crashing', async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            output_text: 'not json at all',
            status: 'completed',
          }),
        ok: true,
      } as unknown as Response)
    ) as unknown as typeof fetch

    const result = await generateTestDrills({
      fetcher,
      points: [candidate('a')],
    })

    expect(result.questions).toEqual([])
    expect(result.notices[0]).toContain('unreadable')
  })

  it('drops a question whose target is not in its accepted answers', async () => {
    const result = await generateTestDrills({
      fetcher: respondWith({
        questions: [
          { ...questionFor('a'), acceptedAnswers: ['something else'] },
          questionFor('b'),
        ],
      }),
      points: [candidate('a'), candidate('b')],
    })

    expect(result.questions.map(question => question.pointSlug)).toEqual(['b'])
    expect(result.notices[0]).toContain('failed validation')
  })

  it('drops a question attributed to a point nobody asked about', async () => {
    // A question graded against the wrong lesson is worse than a missing one.
    const result = await generateTestDrills({
      fetcher: respondWith({
        questions: [questionFor('not-in-this-test'), questionFor('a')],
      }),
      points: [candidate('a')],
    })

    expect(result.questions.map(question => question.pointSlug)).toEqual(['a'])
  })

  it('keeps only the first question per point', async () => {
    const result = await generateTestDrills({
      fetcher: respondWith({
        questions: [questionFor('a'), questionFor('a')],
      }),
      points: [candidate('a')],
    })

    expect(result.questions).toHaveLength(1)
  })

  it('asks for no questions when given no points', async () => {
    const fetcher = respondWith({ questions: [] })

    await generateTestDrills({ fetcher, points: [] })

    expect(fetcher).not.toHaveBeenCalled()
  })
})
