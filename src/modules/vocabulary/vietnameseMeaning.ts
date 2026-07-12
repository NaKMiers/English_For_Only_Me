import { VOCAB_DEFAULT_LOCALIZED_LANGUAGE } from './constants'
import type { VocabEntryApiRecord } from './types'

export const REQUIRED_VOCAB_MEANING_LANGUAGE =
  VOCAB_DEFAULT_LOCALIZED_LANGUAGE

export const VOCAB_REQUIRES_VI_MEANING_FILTER = {
  localizedMeanings: {
    $elemMatch: {
      language: REQUIRED_VOCAB_MEANING_LANGUAGE,
      meaning: { $exists: true, $ne: '', $type: 'string' },
    },
  },
}

export const VOCAB_MISSING_VI_MEANING_FILTER = {
  $nor: [VOCAB_REQUIRES_VI_MEANING_FILTER],
}

export function getVietnameseMeaning(entry: VocabEntryApiRecord) {
  return (
    entry.localizedMeanings.find(
      meaning =>
        meaning.language === REQUIRED_VOCAB_MEANING_LANGUAGE &&
        meaning.meaning.trim().length > 0
    )?.meaning ?? null
  )
}

export function hasVietnameseMeaning(entry: VocabEntryApiRecord) {
  return getVietnameseMeaning(entry) !== null
}

export function getRequiredVietnameseMeaning(entry: VocabEntryApiRecord) {
  return getVietnameseMeaning(entry) ?? 'Needs Vietnamese meaning.'
}

export function getEnglishDefinition(entry: VocabEntryApiRecord) {
  return (
    entry.definitions[0]?.definition ??
    `A saved vocabulary item for "${entry.term}".`
  )
}
