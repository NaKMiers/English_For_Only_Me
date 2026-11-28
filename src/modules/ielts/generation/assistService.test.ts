import { describe, expect, it, vi } from 'vitest'

import { IELTS_SAMPLE_TEST } from '../fixtures/sampleTest'
import type { IeltsSection } from '../schema'
import { assistSection } from './assistService'
import type { IeltsRequester } from './runSectionJob'

vi.mock('@/constants/environments', async importOriginal => ({
  ...(await importOriginal<typeof import('@/constants/environments')>()),
  getQwenApiKey: () => 'test-key',
}))

const section = IELTS_SAMPLE_TEST.sections.find(
  item => item.key === 'reading-1'
) as IeltsSection

function failingRequester(): IeltsRequester {
  // The prompt is what this test reads; the answer does not matter.
  return vi.fn(async () => ({ ok: false as const, message: 'stop' }))
}

describe('assistSection', () => {
  it.each([
    ['vi', 'Vietnamese'],
    ['en', 'English'],
  ] as const)(
    'admin locale %s: summary and notes in %s',
    async (language, name) => {
      const request = failingRequester()

      await assistSection({
        action: 'check-answers',
        instruction: '',
        key: 'reading-1',
        language,
        request,
        section,
      })

      const system = vi.mocked(request).mock.calls[0][0].messages[0].content

      expect(system).toContain(`one or two sentences in ${name}`)
      expect(system).toContain(`short bullet points in ${name}`)
    }
  )
})
