import { describe, expect, test } from 'vitest'

import type { DictationVideoApiRecord } from '@/modules/dictation/types'

import { nextVideoInTopic } from './nextVideo'

const video = (
  id: string,
  sectionId: string | null,
  ready = true
): DictationVideoApiRecord =>
  ({
    activeTranscriptId: ready ? `t-${id}` : null,
    id,
    sectionId,
    title: `Video ${id}`,
    transcriptStatus: ready ? 'manualAdded' : 'none',
  }) as unknown as DictationVideoApiRecord

describe('nextVideoInTopic', () => {
  const catalog = {
    sections: [{ id: 's1' }, { id: 's2' }],
    videos: [
      video('c', 's2'),
      video('a', 's1'),
      video('loose', null),
      video('b', 's1', false),
      video('d', 's2'),
    ],
  }

  test('follows the course order and skips videos without a transcript', () => {
    expect(nextVideoInTopic(catalog, 'a')?.id).toBe('c')
    expect(nextVideoInTopic(catalog, 'c')?.id).toBe('d')
    expect(nextVideoInTopic(catalog, 'd')?.id).toBe('loose')
  })

  test('the last video, or one not in the topic, has no next', () => {
    expect(nextVideoInTopic(catalog, 'loose')).toBeNull()
    expect(nextVideoInTopic(catalog, 'zzz')).toBeNull()
  })
})
