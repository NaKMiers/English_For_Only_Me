/**
 * @vitest-environment jsdom
 */

import { act, cleanup, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_DICTATION_PREFERENCES,
  DICTATION_ANSWER_DRAFTS_STORAGE_KEY,
  DICTATION_PREFERENCES_STORAGE_KEY,
  type DictationPracticePreferences,
  getDictationAnswerDraftsStorageKey,
  readDictationAnswerDrafts,
  useDictationPreferences,
  writeDictationAnswerDrafts,
} from './dictationPreferences'

function createStorageMock() {
  const values = new Map<string, string>()

  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('dictation answer drafts', () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: createStorageMock(),
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('stores drafts per video and ignores invalid draft values', () => {
    writeDictationAnswerDrafts('video-1', {
      segmentA: 'typed words',
      segmentB: 'second draft',
    })
    window.localStorage.setItem(
      `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:video-2`,
      JSON.stringify({
        segmentA: 42,
        segmentC: 'other video',
      })
    )

    expect(readDictationAnswerDrafts('video-1')).toEqual({
      segmentA: 'typed words',
      segmentB: 'second draft',
    })
    expect(readDictationAnswerDrafts('video-2')).toEqual({
      segmentC: 'other video',
    })
  })

  it('removes the storage entry when no drafts remain', () => {
    writeDictationAnswerDrafts('video-1', {
      segmentA: 'typed words',
    })
    writeDictationAnswerDrafts('video-1', {})

    expect(
      window.localStorage.getItem(
        `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:video-1`
      )
    ).toBeNull()
  })
})

describe('owner-namespaced drafts', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('keeps two learners on one browser apart', () => {
    writeDictationAnswerDrafts('video-1', { segmentA: 'alice typing' }, 'alice')
    writeDictationAnswerDrafts('video-1', { segmentA: 'bob typing' }, 'bob')

    expect(readDictationAnswerDrafts('video-1', 'alice')).toEqual({
      segmentA: 'alice typing',
    })
    expect(readDictationAnswerDrafts('video-1', 'bob')).toEqual({
      segmentA: 'bob typing',
    })
    expect(readDictationAnswerDrafts('video-1', 'carol')).toEqual({})
  })

  it('migrates the old shared key once, to the first learner who reads it', () => {
    window.localStorage.setItem(
      `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:video-1`,
      JSON.stringify({ segmentA: 'from before' })
    )

    expect(readDictationAnswerDrafts('video-1', 'alice')).toEqual({
      segmentA: 'from before',
    })
    expect(
      window.localStorage.getItem(
        `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:video-1`
      )
    ).toBeNull()
    expect(
      window.localStorage.getItem(
        getDictationAnswerDraftsStorageKey('video-1', 'alice')
      )
    ).toBe(JSON.stringify({ segmentA: 'from before' }))
    // Already adopted: a second account does not inherit it.
    expect(readDictationAnswerDrafts('video-1', 'bob')).toEqual({})
  })

  it('prefers the namespaced entry over a leftover legacy one', () => {
    writeDictationAnswerDrafts('video-1', { segmentA: 'mine' }, 'alice')
    window.localStorage.setItem(
      `${DICTATION_ANSWER_DRAFTS_STORAGE_KEY}:video-1`,
      JSON.stringify({ segmentA: 'legacy' })
    )

    expect(readDictationAnswerDrafts('video-1', 'alice')).toEqual({
      segmentA: 'mine',
    })
  })

  it('moves anonymous drafts to the owner once, the owner drafts winning', () => {
    writeDictationAnswerDrafts('video-1', {
      segmentA: 'typed before the cookie',
      segmentB: 'only anonymous',
    })
    writeDictationAnswerDrafts('video-1', { segmentA: 'newer' }, 'guest-hash')

    expect(readDictationAnswerDrafts('video-1', 'guest-hash')).toEqual({
      segmentA: 'newer',
      segmentB: 'only anonymous',
    })
    expect(
      window.localStorage.getItem(
        getDictationAnswerDraftsStorageKey('video-1', null)
      )
    ).toBeNull()
    expect(readDictationAnswerDrafts('video-1', 'guest-hash')).toEqual({
      segmentA: 'newer',
      segmentB: 'only anonymous',
    })
    expect(readDictationAnswerDrafts('video-1', 'someone-else')).toEqual({})
  })
})

describe('useDictationPreferences store', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  function Probe({
    initial,
  }: {
    initial?: Partial<DictationPracticePreferences>
  }) {
    const { preferences } = useDictationPreferences(initial)

    return <output>{JSON.stringify(preferences)}</output>
  }

  function readServerPreferences(element: React.ReactElement) {
    const html = renderToString(element)
    const json = html
      .replace(/^<output>/, '')
      .replace(/<\/output>$/, '')
      .replaceAll('&quot;', '"')

    return JSON.parse(json) as DictationPracticePreferences
  }

  it('renders the defaults on the server even when preferences are saved', () => {
    window.localStorage.setItem(
      DICTATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_DICTATION_PREFERENCES, playbackSpeed: 1.5 })
    )

    expect(readServerPreferences(<Probe />)).toEqual(
      DEFAULT_DICTATION_PREFERENCES
    )
  })

  it('renders the session values over the defaults on the server', () => {
    expect(
      readServerPreferences(<Probe initial={{ playbackSpeed: 0.75 }} />)
    ).toEqual({ ...DEFAULT_DICTATION_PREFERENCES, playbackSpeed: 0.75 })
  })

  it('reads saved preferences on the client', () => {
    window.localStorage.setItem(
      DICTATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_DICTATION_PREFERENCES,
        answerTextSize: 'small',
        playbackSpeed: 1.25,
      })
    )

    const { result } = renderHook(() =>
      useDictationPreferences({ playbackSpeed: 0.75 })
    )

    expect(result.current.preferences.playbackSpeed).toBe(1.25)
    expect(result.current.preferences.answerTextSize).toBe('small')
  })

  it('saves updates and chains two updates in one event', () => {
    const { result } = renderHook(() => useDictationPreferences())

    act(() => {
      result.current.setPreferences(current => ({
        ...current,
        playbackSpeed: 1.5,
      }))
      result.current.setPreferences(current => ({
        ...current,
        showFullAnswer: true,
      }))
    })

    expect(result.current.preferences).toMatchObject({
      playbackSpeed: 1.5,
      showFullAnswer: true,
    })
    expect(
      JSON.parse(
        window.localStorage.getItem(DICTATION_PREFERENCES_STORAGE_KEY) ?? '{}'
      )
    ).toMatchObject({ playbackSpeed: 1.5, showFullAnswer: true })
  })

  it('follows a change saved by another tab', () => {
    const { result } = renderHook(() => useDictationPreferences())

    act(() => {
      window.localStorage.setItem(
        DICTATION_PREFERENCES_STORAGE_KEY,
        JSON.stringify({ ...DEFAULT_DICTATION_PREFERENCES, videoSize: 'max' })
      )
      window.dispatchEvent(new window.Event('storage'))
    })

    expect(result.current.preferences.videoSize).toBe('max')
  })
})
