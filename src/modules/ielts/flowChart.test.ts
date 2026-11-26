import { describe, expect, it } from 'vitest'

import { flowChartSteps } from './flowChart'

describe('flowChartSteps', () => {
  it('splits on arrow lines, bolds step headings and bullets their lines', () => {
    expect(
      flowChartSteps(
        'Decide on sample:\nTwelve students from the {{q25}} department\n\n↓\n\nCheck guidelines for {{q27}}\nEnsure {{q28}} is low\n\n↓\n\n{{q30}} the research'
      )
    ).toEqual([
      '**Decide on sample:**\n- Twelve students from the {{q25}} department',
      '- Check guidelines for {{q27}}\n- Ensure {{q28}} is low',
      '{{q30}} the research',
    ])
  })

  it('leaves a body without arrows alone', () => {
    expect(flowChartSteps('Name: {{q1}}\nAddress: {{q2}}')).toBeNull()
  })
})
