import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { FavoriteButton } from './FavoriteButton'

type FavoriteResult =
  | { favorited: boolean; needsAuth: false }
  | { favorited: null; needsAuth: true }

const { push, setFavoriteAction } = vi.hoisted(() => ({
  push: vi.fn(),
  setFavoriteAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/modules/dictation/content/favoriteActions', () => ({
  setFavoriteAction,
}))

function deferred() {
  let resolve: (value: FavoriteResult) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<FavoriteResult>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, reject, resolve }
}

function renderButton(initialFavorited = false) {
  render(
    <FavoriteButton
      videoId="video-1"
      initialFavorited={initialFavorited}
      canFavorite
    />
  )

  return screen.getByRole('button')
}

describe('FavoriteButton', () => {
  beforeEach(() => {
    push.mockReset()
    setFavoriteAction.mockReset()
  })

  test('rapid double click: stays enabled, sends desired states, last wins', async () => {
    const first = deferred()
    const second = deferred()
    setFavoriteAction
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const button = renderButton()

    fireEvent.click(button)
    expect(button).not.toBeDisabled()
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')

    expect(setFavoriteAction).toHaveBeenNthCalledWith(1, 'video-1', true)
    expect(setFavoriteAction).toHaveBeenNthCalledWith(2, 'video-1', false)

    await act(async () => {
      first.resolve({ favorited: true, needsAuth: false })
      await first.promise
    })
    // The stale first response must not flip the UI back on.
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await act(async () => {
      second.resolve({ favorited: false, needsAuth: false })
      await second.promise
    })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  test('ignores a stale response that arrives after the latest one', async () => {
    const first = deferred()
    const second = deferred()
    setFavoriteAction
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const button = renderButton()

    fireEvent.click(button)
    fireEvent.click(button)

    await act(async () => {
      second.resolve({ favorited: false, needsAuth: false })
      await second.promise
    })
    await act(async () => {
      first.resolve({ favorited: true, needsAuth: false })
      await first.promise
    })

    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  test('rolls back to the last confirmed state when the request throws', async () => {
    const request = deferred()
    setFavoriteAction.mockReturnValueOnce(request.promise)
    const button = renderButton(true)

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await act(async () => {
      request.reject(new Error('network'))
      await request.promise.catch(() => undefined)
    })

    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  test('sends anonymous users to sign-in when the session expired', async () => {
    setFavoriteAction.mockResolvedValueOnce({
      favorited: null,
      needsAuth: true,
    })
    const button = renderButton()

    await act(async () => {
      fireEvent.click(button)
    })

    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(push).toHaveBeenCalledWith('/api/auth/signin?callbackUrl=/dictation')
  })
})
