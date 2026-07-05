/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest'

import {
  DICTATION_ANSWER_DRAFTS_STORAGE_KEY,
  readDictationAnswerDrafts,
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
