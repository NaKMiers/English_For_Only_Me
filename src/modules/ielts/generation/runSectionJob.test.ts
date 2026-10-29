import { describe, expect, it, vi } from 'vitest'

import { IELTS_SAMPLE_TEST } from '../fixtures/sampleTest'
import type { IeltsSection } from '../schema'
import { emptySection } from '../tests/emptySections'
import { readingSectionMessages } from './prompts'
import { type IeltsRequester, runSectionJob } from './runSectionJob'

const sample = IELTS_SAMPLE_TEST.sections.find(
  section => section.key === 'reading-1'
) as IeltsSection
const target = emptySection('reading-1', 'pending')
const messages = readingSectionMessages({
  key: 'reading-1',
  track: 'academic',
  targetBand: 6.5,
  topic: null,
  otherTitles: [],
})
const goodOutput = {
  title: sample.title,
  reading: sample.reading,
  groups: sample.groups,
}

function requester(...texts: string[]): IeltsRequester {
  const queue = [...texts]

  return vi.fn(async () => ({
    ok: true as const,
    text: queue.shift() ?? '',
    usage: { inputTokens: 1, outputTokens: 2 },
  }))
}

describe('runSectionJob', () => {
  it('maps a valid output to a ready section with scoped group ids', async () => {
    const request = requester(JSON.stringify(goodOutput))
    const result = await runSectionJob({
      kind: 'reading-section',
      messages,
      request,
      section: target,
    })

    expect(result.outcome).toBe('ok')
    expect(result.input?.groups[0].id).toBe('reading-1-g1')
    expect(vi.mocked(request).mock.calls[0][0].schema).toMatchObject({
      type: 'object',
    })
  })

  it('asks for a repair when evidence is invented, then fails on a second miss', async () => {
    const broken = structuredClone(goodOutput)

    broken.groups[0].questions[0].evidence = {
      quote: 'a sentence that is not in the passage',
      blockIndex: 0,
    }

    const first = await runSectionJob({
      kind: 'reading-section',
      messages,
      request: requester(JSON.stringify(broken)),
      section: target,
    })

    expect(first.outcome).toBe('needsRepair')
    expect(first.failedRules).toContain('evidence_found')

    const request = requester(JSON.stringify(broken))
    const second = await runSectionJob({
      kind: 'reading-section',
      messages,
      request,
      section: target,
      repair: { rawText: first.rawText, issues: first.issues },
    })

    expect(second.outcome).toBe('failed')
    expect(second.error).toContain('evidence_found')
    expect(
      vi.mocked(request).mock.calls[0][0].messages.at(-1)?.content
    ).toContain('failed these checks')
  })

  it('flags wrong numbering and bad JSON for repair, and fails on a request error', async () => {
    const shifted = structuredClone(goodOutput)

    shifted.groups = shifted.groups.slice(1)

    expect(
      (
        await runSectionJob({
          kind: 'reading-section',
          messages,
          request: requester(JSON.stringify(shifted)),
          section: target,
        })
      ).failedRules
    ).toContain('numbering_contiguous')
    expect(
      (
        await runSectionJob({
          kind: 'reading-section',
          messages,
          request: requester('{oops'),
          section: target,
        })
      ).outcome
    ).toBe('needsRepair')
    expect(
      await runSectionJob({
        kind: 'reading-section',
        messages,
        request: async () => ({ ok: false, message: 'timed out' }),
        section: target,
      })
    ).toMatchObject({ outcome: 'failed', error: 'timed out' })
  })
})
