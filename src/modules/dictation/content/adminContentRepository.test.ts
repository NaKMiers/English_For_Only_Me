import { afterEach, describe, expect, it, vi } from 'vitest'

const videoUpdateMany = vi.fn()
const videoUpdateOne = vi.fn()
const videoBulkWrite = vi.fn()
const videoCountDocuments = vi.fn()
const sectionDeleteMany = vi.fn()
const topicDeleteOne = vi.fn()
const videoFindOne = vi.fn()
const videoExists = vi.fn()
const videoDeleteOne = vi.fn()
const childDeleteMany = vi.fn()
const occurrenceUpdateMany = vi.fn()

vi.mock('@/models/dictation/DictationVideoModel', () => ({
  DictationVideoModel: {
    updateMany: (...a: unknown[]) => videoUpdateMany(...a),
    updateOne: (...a: unknown[]) => videoUpdateOne(...a),
    bulkWrite: (...a: unknown[]) => videoBulkWrite(...a),
    countDocuments: (...a: unknown[]) => videoCountDocuments(...a),
    findOne: (...a: unknown[]) => ({ lean: () => videoFindOne(...a) }),
    exists: (...a: unknown[]) => videoExists(...a),
    deleteOne: (...a: unknown[]) => videoDeleteOne(...a),
  },
}))

// Every per-video child collection shares one deleteMany spy, tagged by model.
for (const name of [
  'DictationAttemptModel',
  'DictationDebriefModel',
  'DictationFavoriteModel',
  'DictationReviewItemModel',
  'DictationSegmentModel',
  'DictationSessionModel',
  'DictationTranscriptModel',
]) 
  vi.doMock(`@/models/dictation/${name}`, () => ({
    [name]: { deleteMany: (...a: unknown[]) => childDeleteMany(name, ...a) },
  }))

vi.mock('@/models/vocabulary/VocabOccurrenceModel', () => ({
  VocabOccurrenceModel: {
    updateMany: (...a: unknown[]) => occurrenceUpdateMany(...a),
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

const {
  assignVideos,
  deleteTopic,
  deleteVideo,
  purgeVideo,
  reorderVideos,
  restoreVideo,
} = await import('./adminContentRepository')

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
  it('removes the (empty) sections then deletes the topic when it has no videos', async () => {
    videoCountDocuments.mockResolvedValue(0)
    sectionDeleteMany.mockResolvedValue({ deletedCount: 2 })
    topicDeleteOne.mockResolvedValue({ deletedCount: 1 })

    const result = await deleteTopic('t1')

    expect(videoCountDocuments).toHaveBeenCalledWith({
      topicId: 't1',
      status: { $ne: 'archived' },
    })
    expect(sectionDeleteMany).toHaveBeenCalledWith({ topicId: 't1' })
    expect(topicDeleteOne).toHaveBeenCalledWith({ _id: 't1' })
    expect(result).toEqual({ ok: true })
  })

  it('refuses when the topic still has videos', async () => {
    videoCountDocuments.mockResolvedValue(3)

    const result = await deleteTopic('t1')

    expect(sectionDeleteMany).not.toHaveBeenCalled()
    expect(topicDeleteOne).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, videoCount: 3 })
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

describe('restoreVideo', () => {
  it('rebuilds the status from what the archived video still has', async () => {
    videoFindOne.mockResolvedValue({
      activeTranscriptId: 't1',
      sentenceCount: 8,
    })

    const result = await restoreVideo('v1')

    expect(videoUpdateOne).toHaveBeenCalledWith(
      { _id: 'v1', status: 'archived' },
      { $set: { status: 'ready' } }
    )
    expect(result).toEqual({ ok: true })
  })

  it('does nothing for a video that is not archived', async () => {
    videoFindOne.mockResolvedValue(null)

    const result = await restoreVideo('v1')

    expect(videoUpdateOne).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false })
  })
})

describe('purgeVideo', () => {
  it('deletes the archived video and its per-video data', async () => {
    videoExists.mockResolvedValue({ _id: 'v1' })

    const result = await purgeVideo('v1')

    expect(childDeleteMany).toHaveBeenCalledTimes(7)
    expect(childDeleteMany).toHaveBeenCalledWith('DictationAttemptModel', {
      videoId: 'v1',
    })
    expect(occurrenceUpdateMany).toHaveBeenCalledWith(
      { videoId: 'v1' },
      { $set: { attemptId: null, segmentId: null, videoId: null } }
    )
    expect(videoDeleteOne).toHaveBeenCalledWith({
      _id: 'v1',
      status: 'archived',
    })
    expect(result).toEqual({ ok: true })
  })

  it('refuses a video that is not in the trash', async () => {
    videoExists.mockResolvedValue(null)

    const result = await purgeVideo('v1')

    expect(childDeleteMany).not.toHaveBeenCalled()
    expect(videoDeleteOne).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false })
  })
})
