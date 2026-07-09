'use client'

import { useEffect, useState } from 'react'

export const DICTATION_PREFERENCES_STORAGE_KEY =
  'english-for-only-me:dictation-preferences'

export const DICTATION_ANSWER_DRAFTS_STORAGE_KEY =
  'english-for-only-me:dictation-answer-drafts'

export const PLAYBACK_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const

export interface DictationPracticePreferences {
  isVideoHidden: boolean
  playbackSpeed: number
  showAnswerImmediately: boolean
  showFullAnswer: boolean
  showShortcuts: boolean
}

export const DEFAULT_DICTATION_PREFERENCES: DictationPracticePreferences = {
  isVideoHidden: false,
  playbackSpeed: 1,
  // DailyDictation defaults: reveal the marked answer after Check, but keep the
  // not-yet-correct part masked so the learner still has to work for it (muc 7/8).
  showAnswerImmediately: true,
  showFullAnswer: false,
  showShortcuts: true,
}

function normalizePreferences(
  value: Partial<DictationPracticePreferences>
): DictationPracticePreferences {
  return {
    isVideoHidden:
      typeof value.isVideoHidden === 'boolean'
        ? value.isVideoHidden
        : DEFAULT_DICTATION_PREFERENCES.isVideoHidden,
    playbackSpeed:
      typeof value.playbackSpeed === 'number' &&
      PLAYBACK_SPEED_OPTIONS.includes(
        value.playbackSpeed as (typeof PLAYBACK_SPEED_OPTIONS)[number]
      )
        ? value.playbackSpeed
        : DEFAULT_DICTATION_PREFERENCES.playbackSpeed,
    showAnswerImmediately:
      typeof value.showAnswerImmediately === 'boolean'
        ? value.showAnswerImmediately
        : DEFAULT_DICTATION_PREFERENCES.showAnswerImmediately,
    showFullAnswer:
      typeof value.showFullAnswer === 'boolean'
        ? value.showFullAnswer
        : DEFAULT_DICTATION_PREFERENCES.showFullAnswer,
    showShortcuts:
      typeof value.showShortcuts === 'boolean'
        ? value.showShortcuts
        : DEFAULT_DICTATION_PREFERENCES.showShortcuts,
  }
}

function toPreferenceInput(
  value: unknown
): Partial<DictationPracticePreferences> {
  if (typeof value !== 'object' || value === null) return {}

  return value as Partial<DictationPracticePreferences>
}

function readStoredDictationPreferences() {
  if (typeof window === 'undefined') return null

  try {
    const storedValue = window.localStorage.getItem(
      DICTATION_PREFERENCES_STORAGE_KEY
    )

    if (!storedValue) return null

    return normalizePreferences(toPreferenceInput(JSON.parse(storedValue)))
  } catch {
    return null
  }
}

function toDraftMap(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {}

  return Object.entries(value).reduce<Record<string, string>>(
    (drafts, [key, draft]) => {
      if (typeof draft === 'string') drafts[key] = draft

      return drafts
    },
    {}
  )
}

export function readDictationAnswerDrafts(videoId: string) {
  if (typeof window === 'undefined' || !window.localStorage) return {}

  try {
    const storedValue = window.localStorage.getItem(
      `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:${videoId}`
    )

    if (!storedValue) return {}

    return toDraftMap(JSON.parse(storedValue))
  } catch {
    return {}
  }
}

export function writeDictationAnswerDrafts(
  videoId: string,
  drafts: Record<string, string>
) {
  if (typeof window === 'undefined' || !window.localStorage) return

  const cleanDrafts = toDraftMap(drafts)

  if (Object.keys(cleanDrafts).length === 0) {
    window.localStorage.removeItem(
      `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:${videoId}`
    )
    return
  }

  window.localStorage.setItem(
    `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:${videoId}`,
    JSON.stringify(cleanDrafts)
  )
}

export function readDictationPreferences() {
  const storedPreferences = readStoredDictationPreferences()

  if (!storedPreferences) return DEFAULT_DICTATION_PREFERENCES

  return storedPreferences
}

function getInitialPreferences(
  initialPreferences: Partial<DictationPracticePreferences>
) {
  const storedPreferences = readStoredDictationPreferences()

  if (storedPreferences)
    return normalizePreferences({
      ...DEFAULT_DICTATION_PREFERENCES,
      ...initialPreferences,
      ...storedPreferences,
    })

  return normalizePreferences({
    ...DEFAULT_DICTATION_PREFERENCES,
    ...initialPreferences,
  })
}

export function useDictationPreferences(
  initialPreferences: Partial<DictationPracticePreferences> = {}
) {
  const [preferences, setPreferences] = useState(() =>
    getInitialPreferences(initialPreferences)
  )

  useEffect(() => {
    window.localStorage.setItem(
      DICTATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    )
  }, [preferences])

  return {
    preferences,
    setPreferences,
  }
}
