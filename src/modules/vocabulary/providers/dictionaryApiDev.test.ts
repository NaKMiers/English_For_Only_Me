import { describe, expect, test, vi } from 'vitest'

import { fetchDictionaryApiDevEntry } from './dictionaryApiDev'

describe('dictionaryapi.dev adapter', () => {
  test('normalizes a ready response', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              word: 'example',
              phonetic: '/ig-zam-puhl/',
              phonetics: [
                {
                  audio: 'https://example.com/example.mp3',
                  text: '/ig-zam-puhl/',
                },
              ],
              meanings: [
                {
                  partOfSpeech: 'noun',
                  definitions: [
                    {
                      definition: 'Something representative.',
                      example: 'This is an example.',
                      synonyms: ['sample'],
                    },
                  ],
                },
              ],
              license: {
                name: 'CC BY-SA 3.0',
                url: 'https://creativecommons.org/licenses/by-sa/3.0',
              },
              sourceUrls: ['https://en.wiktionary.org/wiki/example'],
            },
          ])
        )
    )

    const result = await fetchDictionaryApiDevEntry({
      fetcher,
      language: 'en',
      term: 'example',
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.payload.definitions[0]?.definition).toBe(
      'Something representative.'
    )
    expect(result.payload.audioUrls[0]?.url).toBe(
      'https://example.com/example.mp3'
    )
    expect(result.payload.synonyms).toContain('sample')
  })

  test('maps 404 to notFound', async () => {
    const result = await fetchDictionaryApiDevEntry({
      fetcher: vi.fn(async () => new Response('{}', { status: 404 })),
      language: 'en',
      term: 'missing',
    })

    expect(result).toMatchObject({
      provider: 'dictionaryapi.dev',
      status: 'notFound',
    })
  })
})
