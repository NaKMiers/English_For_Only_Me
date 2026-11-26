import { describe, expect, it } from 'vitest'

import { passageStandfirst } from './passageStandfirst'

const material = (subtitle: string, ...texts: string[]) => ({
  title: 'Roman tunnels',
  subtitle,
  paragraphs: texts.map(text => ({ label: '', text })),
})

describe('passageStandfirst', () => {
  it('uses the stored subtitle first', () => {
    expect(
      passageStandfirst(material('A short line', 'Body.', 'More.'))
    ).toEqual({ standfirst: 'A short line', bodyStart: 0 })
  })

  it('lifts a first paragraph that reads like a standfirst', () => {
    expect(
      passageStandfirst(
        material(
          '',
          'The Romans adopted the techniques of other civilizations to build tunnels in their territories',
          'The Persians dug qanats.'
        )
      )
    ).toEqual({
      standfirst:
        'The Romans adopted the techniques of other civilizations to build tunnels in their territories',
      bodyStart: 1,
    })
  })

  it('leaves a real first paragraph in the body', () => {
    expect(
      passageStandfirst(
        material('', 'What are the implications? Look around.', 'Next.')
      )
    ).toEqual({ standfirst: '', bodyStart: 0 })
  })
})
