import type { NormalizedProviderPayload, VocabProviderAdapter } from './types'
import {
  asString,
  fetchProviderJson,
  hasUsefulPayload,
  isRecord,
  uniqueStrings,
} from './providerUtils'

const PROVIDER = 'freedictionaryapi.com' as const
const BASE_URL = 'https://freedictionaryapi.com/api/v1/entries'

function buildUrl(language: string, term: string) {
  return `${BASE_URL}/${encodeURIComponent(language)}/${encodeURIComponent(term)}`
}

function getLicense(value: unknown) {
  if (!isRecord(value)) return null

  const license = isRecord(value.license) ? value.license : null
  const name = asString(license?.name)
  const url = asString(license?.url)

  if (!name || !url) return null

  return {
    attributionRequired: true,
    name,
    url,
  }
}

function getSourceUrl(value: unknown) {
  if (!isRecord(value)) return null

  return asString(value.url)
}

function getTags(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.flatMap(tag => {
    const text = asString(tag)
    return text ? [text] : []
  })
}

function normalizePayload(data: unknown, term: string, now: Date) {
  if (!isRecord(data)) return null

  const entries = Array.isArray(data.entries) ? data.entries : []
  const sourceUrl = getSourceUrl(data.source)
  const license = getLicense(data.source)
  const phonetics: NormalizedProviderPayload['phonetics'] = []
  const definitions: NormalizedProviderPayload['definitions'] = []
  const examples: NormalizedProviderPayload['examples'] = []
  const relatedWords: NormalizedProviderPayload['relatedWords'] = []
  const synonyms: string[] = []
  const antonyms: string[] = []
  let partOfSpeech: string | null = null

  for (const entry of entries) {
    if (!isRecord(entry)) continue

    const currentPartOfSpeech = asString(entry.partOfSpeech)
    partOfSpeech ??= currentPartOfSpeech

    if (Array.isArray(entry.pronunciations))
      for (const pronunciation of entry.pronunciations) {
        if (!isRecord(pronunciation)) continue

        const text = asString(pronunciation.text)
        if (!text) continue

        phonetics.push({
          source: PROVIDER,
          text,
          type: asString(pronunciation.type) ?? 'phonetic',
        })
      }

    if (Array.isArray(entry.forms))
      for (const form of entry.forms) {
        if (!isRecord(form)) continue

        const word = asString(form.word)
        if (!word) continue

        relatedWords.push({
          relation: getTags(form.tags).join(', ') || 'form',
          source: PROVIDER,
          term: word,
        })
      }

    synonyms.push(...getTags(entry.synonyms))
    antonyms.push(...getTags(entry.antonyms))

    if (!Array.isArray(entry.senses)) continue

    for (const sense of entry.senses) {
      if (!isRecord(sense)) continue

      const definition = asString(sense.definition)
      if (!definition) continue

      const senseExamples = Array.isArray(sense.examples)
        ? sense.examples.flatMap(example => {
            const text = asString(example)
            return text ? [text] : []
          })
        : []

      synonyms.push(...getTags(sense.synonyms))
      antonyms.push(...getTags(sense.antonyms))

      definitions.push({
        antonyms: getTags(sense.antonyms),
        definition,
        example: senseExamples[0] ?? null,
        partOfSpeech: currentPartOfSpeech,
        source: PROVIDER,
        synonyms: getTags(sense.synonyms),
      })

      for (const text of senseExamples)
        examples.push({
          source: PROVIDER,
          text,
        })
    }
  }

  const payload: NormalizedProviderPayload = {
    audioUrls: [],
    definitions: definitions.slice(0, 12),
    examples: examples.slice(0, 8),
    license,
    localizedMeanings: [],
    lemma: asString(data.word) ?? term,
    partOfSpeech,
    phonetics: phonetics.slice(0, 8),
    rawData: data,
    relatedWords: relatedWords.slice(0, 16),
    sourceAttributions: sourceUrl
      ? [
          {
            license: license?.name ?? null,
            provider: PROVIDER,
            retrievedAt: now,
            url: sourceUrl,
          },
        ]
      : [],
    synonyms: uniqueStrings(synonyms).slice(0, 24),
    antonyms: uniqueStrings(antonyms).slice(0, 24),
  }

  return payload
}

export const fetchFreeDictionaryApiEntry: VocabProviderAdapter =
  async input => {
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
        message: 'Provider response was not an object.',
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
