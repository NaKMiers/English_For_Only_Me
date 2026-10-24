import { beforeEach, describe, expect, it, vi } from 'vitest'

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))

vi.mock('next/cache', () => ({ revalidateTag }))

const { expireCacheTags, revalidateDictationCatalog } =
  await import('./revalidateCatalog')

describe('revalidateCatalog', () => {
  beforeEach(() => revalidateTag.mockClear())

  it('expires the dictation catalog immediately, not stale-while-revalidate', () => {
    revalidateDictationCatalog()

    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('dictation-catalog', {
      expire: 0,
    })
  })

  it('expires every requested tag', () => {
    expireCacheTags(['dictation-catalog', 'grammar-content'])

    expect(revalidateTag.mock.calls).toEqual([
      ['dictation-catalog', { expire: 0 }],
      ['grammar-content', { expire: 0 }],
    ])
  })
})
