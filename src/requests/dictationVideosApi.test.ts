import { afterEach, describe, expect, test, vi } from 'vitest'

import { archiveDictationVideoApi } from './dictationVideosApi'

afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  })
}

describe('dictation video request helpers', () => {
  test('archives a dictation video through DELETE', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        video: {
          id: '507f1f77bcf86cd799439011',
          status: 'archived',
        },
      })
    )

    const response = await archiveDictationVideoApi('507f1f77bcf86cd799439011')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dictation/videos/507f1f77bcf86cd799439011',
      expect.objectContaining({
        cache: 'no-store',
        method: 'DELETE',
      })
    )
    expect(response.video.status).toBe('archived')
  })

  test('surfaces archive API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ message: 'Dictation video was not found.' }, 404)
    )

    await expect(
      archiveDictationVideoApi('507f1f77bcf86cd799439011')
    ).rejects.toThrow('Dictation video was not found.')
  })
})
