import { fetchDictionaryApiDevEntry } from './dictionaryApiDev'
import { fetchFreeDictionaryApiEntry } from './freeDictionaryApi'
import type { VocabProviderAdapter } from './types'

export function getDefaultVocabProviders(): VocabProviderAdapter[] {
  return [fetchDictionaryApiDevEntry, fetchFreeDictionaryApiEntry]
}

export type { VocabProviderAdapter, VocabProviderResult } from './types'
