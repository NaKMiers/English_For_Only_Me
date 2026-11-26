import { describe, expect, it } from 'vitest'

import { passageIntro } from './passageIntro'

describe('passageIntro', () => {
  it('names the question range and the passage', () => {
    expect(
      passageIntro({
        order: 2,
        groups: [
          { from: 14, to: 16 },
          { from: 17, to: 26 },
        ],
      })
    ).toBe(
      'You should spend about 20 minutes on Questions 14-26, which are based on Reading Passage 2.'
    )
  })

  it('is undefined for a part without questions', () => {
    expect(passageIntro({ order: 1, groups: [] })).toBeUndefined()
  })
})
