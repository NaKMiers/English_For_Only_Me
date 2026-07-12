import type { NormalizedProviderPayload, VocabProviderAdapter } from './types'
import {
  asString,
  asStringArray,
  fetchProviderJson,
  hasUsefulPayload,
  isRecord,
  uniqueStrings,
} from './providerUtils'

const PROVIDER = 'dictionaryapi.dev' as const
const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries'

function buildUrl(language: string, term: string) {
  return `${BASE_URL}/${encodeURIComponent(language)}/${encodeURIComponent(term)}`
}

function getLicense(value: unknown) {
  if (!isRecord(value)) return null

  const name = asString(value.name)
  const url = asString(value.url)

  if (!name || !url) return null

  return {
    attributionRequired: true,
    name,
    url,
  }
}

function normalizePayload(data: unknown, term: string, now: Date) {
  if (!Array.isArray(data)) return null

  const phonetics: NormalizedProviderPayload['phonetics'] = []
  const audioUrls: NormalizedProviderPayload['audioUrls'] = []
  const definitions: NormalizedProviderPayload['definitions'] = []
  const examples: NormalizedProviderPayload['examples'] = []
  const synonyms: string[] = []
  const antonyms: string[] = []
  const sourceUrls: string[] = []
  let lemma: string | null = null
  let partOfSpeech: string | null = null
  let license: NormalizedProviderPayload['license'] = null

  for (const item of data) {
    if (!isRecord(item)) continue

    lemma ??= asString(item.word)
    license ??= getLicense(item.license)
    sourceUrls.push(...asStringArray(item.sourceUrls))

    const itemPhonetic = asString(item.phonetic)
    if (itemPhonetic)
      phonetics.push({
        source: PROVIDER,
        text: itemPhonetic,
        type: 'phonetic',
      })

    if (Array.isArray(item.phonetics))
      for (const phonetic of item.phonetics) {
        if (!isRecord(phonetic)) continue

        const text = asString(phonetic.text)
        const audio = asString(phonetic.audio)

        if (text)
          phonetics.push({
            source: PROVIDER,
            text,
            type: 'phonetic',
          })

        if (audio)
          audioUrls.push({
            accent: null,
            license: license?.name ?? null,
            source: PROVIDER,
            url: audio.startsWith('//') ? `https:${audio}` : audio,
          })
      }

    if (!Array.isArray(item.meanings)) continue

    for (const meaning of item.meanings) {
      if (!isRecord(meaning)) continue

      const currentPartOfSpeech = asString(meaning.partOfSpeech)
      partOfSpeech ??= currentPartOfSpeech
      synonyms.push(...asStringArray(meaning.synonyms))
      antonyms.push(...asStringArray(meaning.antonyms))

      if (!Array.isArray(meaning.definitions)) continue

      for (const definition of meaning.definitions) {
        if (!isRecord(definition)) continue

        const text = asString(definition.definition)
        if (!text) continue

        const example = asString(definition.example)

        definitions.push({
          antonyms: asStringArray(definition.antonyms),
          definition: text,
          example,
          partOfSpeech: currentPartOfSpeech,
          source: PROVIDER,
          synonyms: asStringArray(definition.synonyms),
        })

        if (example)
          examples.push({
            source: PROVIDER,
            text: example,
          })
      }
    }
  }

  const payload: NormalizedProviderPayload = {
    audioUrls,
    definitions: definitions.slice(0, 12),
    examples: examples.slice(0, 8),
    license,
    localizedMeanings: [],
    lemma: lemma ?? term,
    partOfSpeech,
    phonetics: phonetics.slice(0, 8),
    rawData: data,
    relatedWords: [],
    sourceAttributions: uniqueStrings(sourceUrls).map(url => ({
      license: license?.name ?? null,
      provider: PROVIDER,
      retrievedAt: now,
      url,
    })),
    synonyms: uniqueStrings([
      ...synonyms,
      ...definitions.flatMap(definition => definition.synonyms),
    ]).slice(0, 24),
    antonyms: uniqueStrings([
      ...antonyms,
      ...definitions.flatMap(definition => definition.antonyms),
    ]).slice(0, 24),
  }

  return payload
}

export const fetchDictionaryApiDevEntry: VocabProviderAdapter = async input => {
  const providerResult = await fetchProviderJson({
    input,
    provider: PROVIDER,
    url: buildUrl(input.language, input.term),
  })

  if (!('ok' in providerResult)) return providerResult

  const payload = normalizePayload(
    providerResult.data,
    input.term,
    input.now ?? new Date()
  )

  if (!payload)
    return {
      message: 'Provider response was not an array.',
      provider: PROVIDER,
      status: 'malformed',
    }

  if (!hasUsefulPayload(payload))
    return {
      provider: PROVIDER,
      status: 'emptyUsefulData',
    }

  return {
    payload,
    provider: PROVIDER,
    status: 'ready',
  }
}
