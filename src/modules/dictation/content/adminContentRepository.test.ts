import { afterEach, describe, expect, it, vi } from 'vitest'

const videoUpdateMany = vi.fn()
const videoUpdateOne = vi.fn()
const videoBulkWrite = vi.fn()
const sectionDeleteMany = vi.fn()
const topicDeleteOne = vi.fn()

vi.mock('@/models/dictation/DictationVideoModel', () => ({
  DictationVideoModel: {
    updateMany: (...a: unknown[]) => videoUpdateMany(...a),
    updateOne: (...a: unknown[]) => videoUpdateOne(...a),
    bulkWrite: (...a: unknown[]) => videoBulkWrite(...a),
  },
}))
vi.mock('@/models/dictation/DictationSectionModel', () => ({
  DictationSectionModel: {
    deleteMany: (...a: unknown[]) => sectionDeleteMany(...a),
  },
}))
vi.mock('@/models/dictation/DictationTopicModel', () => ({
  DictationTopicModel: {
    deleteOne: (...a: unknown[]) => topicDeleteOne(...a),
  },
}))

import {
  assignVideos,
  deleteTopic,
  deleteVideo,
  reorderVideos,
} from './adminContentRepository'

afterEach(() => vi.clearAllMocks())

describe('assignVideos', () => {
  it('no-ops on an empty id list', async () => {
    const result = await assignVideos([], { topicId: 't1' })

    expect(result).toEqual({ modified: 0 })
    expect(videoUpdateMany).not.toHaveBeenCalled()
  })

  it('sets exactly the provided fields on the selected videos (bulk)', async () => {
    videoUpdateMany.mockResolvedValue({ modifiedCount: 2 })

    const result = await assignVideos(['a', 'b'], {
      topicId: 't1',
      sectionId: 's1',
      level: 'B1',
    })

    expect(result).toEqual({ modified: 2 })
    expect(videoUpdateMany).toHaveBeenCalledWith(
      { _id: { $in: ['a', 'b'] } },
      { $set: { topicId: 't1', sectionId: 's1', level: 'B1' } }
    )
  })

  it('allows clearing a field with null', async () => {
    videoUpdateMany.mockResolvedValue({ modifiedCount: 1 })

    await assignVideos(['a'], { topicId: null })

    expect(videoUpdateMany).toHaveBeenCalledWith(
      { _id: { $in: ['a'] } },
      { $set: { topicId: null } }
    )
  })
})

describe('deleteTopic', () => {
  it('cascades: unfiles videos, removes sections, then deletes the topic', async () => {
    videoUpdateMany.mockResolvedValue({ modifiedCount: 3 })
    sectionDeleteMany.mockResolvedValue({ deletedCount: 2 })
    topicDeleteOne.mockResolvedValue({ deletedCount: 1 })

    await deleteTopic('t1')

    expect(videoUpdateMany).toHaveBeenCalledWith(
      { topicId: 't1' },
      { $set: { topicId: null, sectionId: null } }
    )
    expect(sectionDeleteMany).toHaveBeenCalledWith({ topicId: 't1' })
    expect(topicDeleteOne).toHaveBeenCalledWith({ _id: 't1' })
  })
})

describe('deleteVideo', () => {
  it('archives the video instead of hard-deleting it', async () => {
    videoUpdateOne.mockResolvedValue({ modifiedCount: 1 })

    await deleteVideo('v1')

    expect(videoUpdateOne).toHaveBeenCalledWith(
      { _id: 'v1', status: { $ne: 'archived' } },
      { $set: { status: 'archived' } }
    )
  })
})

describe('reorderVideos', () => {
  it('sets each video order to its provided index', async () => {
    await reorderVideos(['v2', 'v1'])

    expect(videoBulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'v2' }, update: { $set: { order: 0 } } } },
      { updateOne: { filter: { _id: 'v1' }, update: { $set: { order: 1 } } } },
    ])
  })
})
