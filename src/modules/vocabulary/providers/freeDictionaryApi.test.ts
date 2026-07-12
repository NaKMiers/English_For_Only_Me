import { describe, expect, test, vi } from 'vitest'

import { fetchFreeDictionaryApiEntry } from './freeDictionaryApi'

describe('FreeDictionaryAPI adapter', () => {
  test('normalizes entries and senses', async () => {
    const result = await fetchFreeDictionaryApiEntry({
      fetcher: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              word: 'example',
              entries: [
                {
                  partOfSpeech: 'noun',
                  pronunciations: [{ text: '/example/', type: 'ipa' }],
                  senses: [
                    {
                      definition: 'A representative thing.',
                      examples: ['A clear example helps.'],
                      synonyms: ['sample'],
                    },
                  ],
                },
              ],
              source: {
                url: 'https://en.wiktionary.org/wiki/example',
                license: {
                  name: 'CC BY-SA 4.0',
                  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
                },
              },
            })
          )
      ),
      language: 'en',
      term: 'example',
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.payload.definitions[0]?.definition).toBe(
      'A representative thing.'
    )
    expect(result.payload.examples[0]?.text).toBe('A clear example helps.')
    expect(result.payload.license?.name).toBe('CC BY-SA 4.0')
  })
})
