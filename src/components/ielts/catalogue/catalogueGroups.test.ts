import { describe, expect, it } from 'vitest'

import { groupCatalogue } from './catalogueGroups'

describe('groupCatalogue', () => {
  it('puts numbered tests of one series under one heading, in order', () => {
    const groups = groupCatalogue([
      { title: 'IELTS 21 Test 2', track: 'academic' },
      { title: 'IELTS 21 Test 1', track: 'academic' },
      { title: 'IELTS 20 Test 1', track: 'academic' },
    ])

    expect(groups.map(group => group.heading)).toEqual([
      'IELTS 21 Academic',
      'IELTS 20 Academic',
    ])
    expect(groups[0].tests.map(test => test.label)).toEqual([
      'Test 1',
      'Test 2',
    ])
  })

  it('does not repeat a track already in the series name', () => {
    const [group] = groupCatalogue([
      { title: 'Sample Academic Test 1', track: 'academic' },
    ])

    expect(group.heading).toBe('Sample Academic')
  })

  it('uses an admin-set series as the heading, whatever the titles say', () => {
    const groups = groupCatalogue([
      { series: 'Cambridge 19', title: 'C19 Test 2', track: 'academic' },
      { series: 'Cambridge 19', title: 'Listening drill', track: 'academic' },
      { series: ' ', title: 'IELTS 21 Test 1', track: 'academic' },
    ])

    expect(groups.map(group => group.heading)).toEqual([
      'Cambridge 19',
      'IELTS 21 Academic',
    ])
    expect(groups[0].tests.map(test => test.label)).toEqual([
      'Test 2',
      'Listening drill',
    ])
  })

  it('keeps an unnumbered title as its own card under its track', () => {
    const [group] = groupCatalogue([
      { title: 'Mixed practice', track: 'general' },
    ])

    expect(group).toMatchObject({
      heading: 'General tests',
      tests: [{ label: 'Mixed practice' }],
    })
  })
})
