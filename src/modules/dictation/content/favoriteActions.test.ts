import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  getOptionalUser: vi.fn(),
  isFavoritableVideo: vi.fn(),
  removeFavorite: vi.fn(),
}))

vi.mock('@/lib/db/connectDatabase', () => ({
  connectDatabase: vi.fn(async () => undefined),
}))

vi.mock('@/modules/dictation/services/getCurrentUser', () => ({
  getOptionalUser: mocks.getOptionalUser,
}))

vi.mock('./favoriteRepository', () => ({
  addFavorite: mocks.addFavorite,
  isFavoritableVideo: mocks.isFavoritableVideo,
  removeFavorite: mocks.removeFavorite,
}))

import { setFavoriteAction } from './favoriteActions'

const videoId = '507f1f77bcf86cd799439011'

beforeEach(() => {
  mocks.getOptionalUser.mockResolvedValue({ id: 'user-1' })
  mocks.isFavoritableVideo.mockResolvedValue(true)
})

afterEach(() => vi.clearAllMocks())

describe('setFavoriteAction', () => {
  it('adds a favorite for an available video', async () => {
    await expect(setFavoriteAction(videoId, true)).resolves.toEqual({
      favorited: true,
      needsAuth: false,
    })
    expect(mocks.isFavoritableVideo).toHaveBeenCalledWith(videoId)
    expect(mocks.addFavorite).toHaveBeenCalledWith('user-1', videoId)
  })

  it('rejects an id that is not an ObjectId before any lookup', async () => {
    await expect(setFavoriteAction('video-1', true)).rejects.toThrow(
      'Invalid favorite request.'
    )
    expect(mocks.getOptionalUser).not.toHaveBeenCalled()
    expect(mocks.addFavorite).not.toHaveBeenCalled()
  })

  it('refuses to add a missing or archived video', async () => {
    mocks.isFavoritableVideo.mockResolvedValueOnce(false)

    await expect(setFavoriteAction(videoId, true)).rejects.toThrow(
      'This video is not available to favorite.'
    )
    expect(mocks.addFavorite).not.toHaveBeenCalled()
  })

  it('removes without checking the video, so archived favorites can go', async () => {
    await expect(setFavoriteAction(videoId, false)).resolves.toEqual({
      favorited: false,
      needsAuth: false,
    })
    expect(mocks.isFavoritableVideo).not.toHaveBeenCalled()
    expect(mocks.removeFavorite).toHaveBeenCalledWith('user-1', videoId)
  })

  it('asks an anonymous visitor to sign in', async () => {
    mocks.getOptionalUser.mockResolvedValueOnce(null)

    await expect(setFavoriteAction(videoId, true)).resolves.toEqual({
      favorited: null,
      needsAuth: true,
    })
    expect(mocks.addFavorite).not.toHaveBeenCalled()
  })
})
