import { describe, expect, it } from 'vitest'

import type {
  DictationSectionApiRecord,
  DictationTopicApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

import { buildAdminTopicBoard } from './adminTopicBoard'

const at = new Date('2026-10-24T00:00:00.000Z')

function topic(id: string): DictationTopicApiRecord {
  return {
    createdAt: at,
    description: null,
    hasVideoMedia: false,
    id,
    order: 0,
    slug: id,
    thumbnailUrl: null,
    title: id,
    updatedAt: at,
  }
}

function section(id: string, topicId: string): DictationSectionApiRecord {
  return { createdAt: at, id, order: 0, title: id, topicId, updatedAt: at }
}

function video(
  id: string,
  topicId: string,
  sectionId: string | null
): DictationVideoApiRecord {
  return {
    activeTranscriptId: null,
    channelTitle: null,
    collections: [],
    createdAt: at,
    defaultLanguage: 'en',
    durationSeconds: null,
    id,
    importStatus: 'metadataReady',
    importWarning: null,
    level: null,
    order: 0,
    purpose: 'general-listening',
    sectionId,
    sentenceCount: 0,
    sourceType: 'youtube',
    sourceUrl: null,
    status: 'ready',
    tags: [],
    thumbnailUrl: null,
    title: id,
    topicId,
    transcriptStatus: 'manualNeeded',
    updatedAt: at,
    youtubeUrl: 'https://www.youtube.com/watch?v=x',
    youtubeVideoId: 'x',
  }
}

describe('buildAdminTopicBoard', () => {
  it('groups flat lists by topic and section, keeping input order', () => {
    const board = buildAdminTopicBoard({
      sections: [section('s1', 't1'), section('s2', 't1'), section('s3', 't2')],
      topics: [topic('t1'), topic('t2'), topic('empty')],
      videos: [
        video('v2', 't1', 's2'),
        video('v1', 't1', 's1'),
        video('v3', 't1', null),
        video('v4', 't1', 's1'),
        video('v5', 't2', 's3'),
        // Filed under a topic that no longer exists: not shown anywhere.
        video('orphan', 'deleted', null),
      ],
    })

    expect(board.map(item => item.id)).toEqual(['t1', 't2', 'empty'])
    expect(board[0]?.videoCount).toBe(4)
    expect(
      board[0]?.sections.map(item => [
        item.id,
        item.videos.map(entry => entry.id),
      ])
    ).toEqual([
      ['s1', ['v1', 'v4']],
      ['s2', ['v2']],
    ])
    expect(board[0]?.ungrouped.map(item => item.id)).toEqual(['v3'])
    expect(board[1]?.sections[0]?.videos.map(item => item.id)).toEqual(['v5'])
    expect(board[2]).toMatchObject({
      sections: [],
      ungrouped: [],
      videoCount: 0,
    })
  })
})
