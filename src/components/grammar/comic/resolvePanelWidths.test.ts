import { describe, expect, it } from 'vitest'

import type { Beat } from '@/modules/grammar/presentation/types'

import { resolvePanelWidths } from './PanelScriptRenderer'

function beat(kind: Beat['kind']) {
  return { kind } as Beat
}

/**
 * Empty space on a comic page reads as a missing panel, which is exactly the
 * impression the beat collapse exists to avoid. So a half-width panel only
 * stays half-width if it has something to sit beside.
 */
describe('resolvePanelWidths', () => {
  it('pairs proof and pair side by side when both are present', () => {
    expect(
      resolvePanelWidths([beat('rule'), beat('proof'), beat('pair'), beat('trap')])
    ).toEqual(['full', 'half', 'half', 'full'])
  })

  it('widens a lone pair beat', () => {
    // The real shape of `definite-article-the`: six minimal pairs, no examples.
    expect(
      resolvePanelWidths([beat('rule'), beat('pair'), beat('trap')])
    ).toEqual(['full', 'full', 'full'])
  })

  it('widens a lone proof beat', () => {
    expect(
      resolvePanelWidths([beat('rule'), beat('proof'), beat('trap')])
    ).toEqual(['full', 'full', 'full'])
  })

  it('leaves every other beat kind full width', () => {
    const kinds: Beat['kind'][] = [
      'hook',
      'interference',
      'rule',
      'trap',
      'scar',
      'boss',
      'verdict',
    ]

    expect(resolvePanelWidths(kinds.map(beat))).toEqual(kinds.map(() => 'full'))
  })

  it('handles an empty script', () => {
    expect(resolvePanelWidths([])).toEqual([])
  })

  it('handles a half beat at the very start and end', () => {
    expect(resolvePanelWidths([beat('proof'), beat('pair')])).toEqual([
      'half',
      'half',
    ])
    expect(resolvePanelWidths([beat('pair')])).toEqual(['full'])
  })
})
