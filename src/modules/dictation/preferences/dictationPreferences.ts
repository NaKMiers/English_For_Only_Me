'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

export const DICTATION_PREFERENCES_STORAGE_KEY =
  'english-for-only-me:dictation-preferences'

export const DICTATION_ANSWER_DRAFTS_STORAGE_KEY =
  'english-for-only-me:dictation-answer-drafts'

export const PLAYBACK_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const

export const ANSWER_TEXT_SIZE_OPTIONS = [
  'small',
  'normal',
  'large',
  'xlarge',
] as const

export type AnswerTextSize = (typeof ANSWER_TEXT_SIZE_OPTIONS)[number]

// Shared by the textarea, its underline mirror, the answer-line correction, and
// the translation so they always render at the SAME size. fontSize/lineHeight
// are applied inline so the value wins over the global `textarea` font reset.
export const ANSWER_TEXT_STYLE: Record<
  AnswerTextSize,
  { fontSize: string; lineHeight: string }
> = {
  small: { fontSize: '1.125rem', lineHeight: '1.75rem' },
  normal: { fontSize: '1.5rem', lineHeight: '2.125rem' },
  large: { fontSize: '1.875rem', lineHeight: '2.5rem' },
  xlarge: { fontSize: '2.5rem', lineHeight: '3.25rem' },
}

export const ANSWER_TEXT_SIZE_LABEL: Record<AnswerTextSize, string> = {
  small: 'S',
  normal: 'M',
  large: 'L',
  xlarge: 'XL',
}

export const VIDEO_SIZE_OPTIONS = ['small', 'normal', 'large', 'max'] as const

export type VideoSize = (typeof VIDEO_SIZE_OPTIONS)[number]

export interface DictationPracticePreferences {
  answerTextSize: AnswerTextSize
  isVideoHidden: boolean
  playbackSpeed: number
  showAnswerImmediately: boolean
  showFullAnswer: boolean
  showShortcuts: boolean
  videoSize: VideoSize
}

export const DEFAULT_DICTATION_PREFERENCES: DictationPracticePreferences = {
  answerTextSize: 'large',
  isVideoHidden: false,
  playbackSpeed: 1,
  // DailyDictation defaults: reveal the marked answer after Check, but keep the
  // not-yet-correct part masked so the learner still has to work for it (muc 7/8).
  showAnswerImmediately: true,
  showFullAnswer: false,
  showShortcuts: true,
  videoSize: 'normal',
}

function normalizePreferences(
  value: Partial<DictationPracticePreferences>
): DictationPracticePreferences {
  return {
    answerTextSize: ANSWER_TEXT_SIZE_OPTIONS.includes(
      value.answerTextSize as AnswerTextSize
    )
      ? (value.answerTextSize as AnswerTextSize)
      : DEFAULT_DICTATION_PREFERENCES.answerTextSize,
    videoSize: VIDEO_SIZE_OPTIONS.includes(value.videoSize as VideoSize)
      ? (value.videoSize as VideoSize)
      : DEFAULT_DICTATION_PREFERENCES.videoSize,
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

/** The owner used before a first-time visitor has a guest id. */
const ANONYMOUS_DRAFT_OWNER = 'anonymous'

/**
 * Drafts are stored per learner as well as per video, so two accounts sharing
 * one browser never see each other's typing.
 */
export function getDictationAnswerDraftsStorageKey(
  videoId: string,
  ownerKey?: string | null
) {
  return `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:${ownerKey ?? ANONYMOUS_DRAFT_OWNER}:${videoId}`
}

/** The key drafts used before they were namespaced by owner. */
function getLegacyAnswerDraftsStorageKey(videoId: string) {
  return `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:${videoId}`
}

function getDraftStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function parseDrafts(storedValue: string | null) {
  if (!storedValue) return null

  try {
    return toDraftMap(JSON.parse(storedValue))
  } catch {
    return null
  }
}

/**
 * Drafts typed before the guest cookie existed were saved under the anonymous
 * owner. Once the learner has an owner key they move over (and are removed, so
 * no later account on this browser sees them); the owner's own drafts win.
 */
function adoptAnonymousDrafts(
  storage: Storage,
  videoId: string,
  key: string,
  drafts: Record<string, string> | null
) {
  const anonymousKey = getDictationAnswerDraftsStorageKey(videoId, null)

  if (anonymousKey === key) return drafts

  const anonymousDrafts = parseDrafts(storage.getItem(anonymousKey))

  if (!anonymousDrafts) return drafts

  const merged = { ...anonymousDrafts, ...drafts }

  storage.removeItem(anonymousKey)
  if (Object.keys(merged).length > 0)
    storage.setItem(key, JSON.stringify(merged))

  return merged
}

export function readDictationAnswerDrafts(
  videoId: string,
  ownerKey?: string | null
): Record<string, string> {
  const storage = getDraftStorage()

  if (!storage) return {}

  try {
    const key = getDictationAnswerDraftsStorageKey(videoId, ownerKey)
    const ownDrafts = parseDrafts(storage.getItem(key))
    const drafts = ownerKey
      ? adoptAnonymousDrafts(storage, videoId, key, ownDrafts)
      : ownDrafts

    if (drafts) return drafts

    // One-time migration: the first learner to open the video after the
    // namespacing change adopts the old shared entry, and it is removed so no
    // other account on this browser can read it afterwards.
    const legacyKey = getLegacyAnswerDraftsStorageKey(videoId)
    const legacyDrafts = parseDrafts(storage.getItem(legacyKey))

    if (!legacyDrafts) return {}

    storage.removeItem(legacyKey)
    if (Object.keys(legacyDrafts).length > 0)
      storage.setItem(key, JSON.stringify(legacyDrafts))

    return legacyDrafts
  } catch {
    return {}
  }
}

export function writeDictationAnswerDrafts(
  videoId: string,
  drafts: Record<string, string>,
  ownerKey?: string | null
) {
  const storage = getDraftStorage()

  if (!storage) return

  const key = getDictationAnswerDraftsStorageKey(videoId, ownerKey)
  const cleanDrafts = toDraftMap(drafts)

  try {
    if (Object.keys(cleanDrafts).length === 0) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(cleanDrafts))
  } catch {
    // Storage full or blocked: the draft lives on in memory for this visit.
  }
}

// MARK: Preferences store

const preferenceListeners = new Set<() => void>()
let cachedRawPreferences: string | null = null
let cachedStoredPreferences: DictationPracticePreferences | null = null
// The last value written in this tab, used when storage is blocked so a toggle
// still applies for the rest of the visit.
let memoryPreferences: DictationPracticePreferences | null = null

function readRawPreferences() {
  try {
    return window.localStorage.getItem(DICTATION_PREFERENCES_STORAGE_KEY)
  } catch {
    return null
  }
}

function parsePreferences(raw: string) {
  try {
    return normalizePreferences(toPreferenceInput(JSON.parse(raw)))
  } catch {
    return null
  }
}

/**
 * The saved preferences, or null when nothing is saved. Cached by the raw
 * string so useSyncExternalStore gets the same object back until the stored
 * value really changes (a fresh object every call would loop the render).
 */
function getStoredPreferencesSnapshot() {
  const raw = readRawPreferences()

  if (raw === null) return memoryPreferences

  if (raw !== cachedRawPreferences) {
    cachedRawPreferences = raw
    cachedStoredPreferences = parsePreferences(raw)
  }

  return cachedStoredPreferences ?? memoryPreferences
}

// Server HTML (and the hydration pass) never sees localStorage, so it renders
// with no saved preferences: the defaults. Saved values apply right after.
function getServerPreferencesSnapshot() {
  return null
}

function subscribeToPreferences(listener: () => void) {
  preferenceListeners.add(listener)
  // Follow changes made in other tabs too.
  window.addEventListener('storage', listener)

  return () => {
    preferenceListeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function writeStoredPreferences(preferences: DictationPracticePreferences) {
  memoryPreferences = preferences

  try {
    window.localStorage.setItem(
      DICTATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    )
  } catch {
    // Will not persist; still applies this visit through memoryPreferences.
  }

  for (const listener of preferenceListeners) listener()
}

export function readDictationPreferences() {
  if (typeof window === 'undefined') return DEFAULT_DICTATION_PREFERENCES

  return getStoredPreferencesSnapshot() ?? DEFAULT_DICTATION_PREFERENCES
}

type PreferencesUpdate =
  | DictationPracticePreferences
  | ((current: DictationPracticePreferences) => DictationPracticePreferences)

/**
 * Practice preferences as an external store (D5). Saved preferences win over
 * the session's; with none saved, the session's values (known on the server
 * too) fill in over the defaults, so server and first client render agree.
 * `setPreferences` returns the value it saved, for callers that sync it.
 */
export function useDictationPreferences(
  initialPreferences: Partial<DictationPracticePreferences> = {}
) {
  const stored = useSyncExternalStore(
    subscribeToPreferences,
    getStoredPreferencesSnapshot,
    getServerPreferencesSnapshot
  )
  // Keyed by value: callers pass a fresh object every render.
  const initialKey = JSON.stringify(initialPreferences)
  const fallback = useMemo(
    () =>
      normalizePreferences({
        ...DEFAULT_DICTATION_PREFERENCES,
        ...toPreferenceInput(JSON.parse(initialKey)),
      }),
    [initialKey]
  )
  const preferences = stored ?? fallback

  const setPreferences = useCallback(
    (update: PreferencesUpdate) => {
      // Read the store, not the render's value, so two updates in one event
      // build on each other.
      const current = getStoredPreferencesSnapshot() ?? fallback
      const next = normalizePreferences(
        typeof update === 'function' ? update(current) : update
      )

      writeStoredPreferences(next)

      return next
    },
    [fallback]
  )

  return {
    preferences,
    setPreferences,
  }
}
