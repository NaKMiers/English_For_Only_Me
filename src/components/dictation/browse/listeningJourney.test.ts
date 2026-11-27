import { describe, expect, test } from 'vitest'

import {
  advanceTopicRecord,
  finishedByTopic,
  listeningTrack,
  NO_TOPIC_KEY,
  shelveTopics,
} from './listeningJourney'

describe('listeningTrack', () => {
  test('plays from zero toward the first track', () => {
    expect(listeningTrack(10)).toEqual({
      from: 0,
      left: 15,
      number: 1,
      progress: 0.4,
      to: 25,
    })
  })

  test('starts the next stretch once a track is reached', () => {
    expect(listeningTrack(100)).toMatchObject({ from: 100, number: 3, to: 250 })
  })

  test('keeps adding tracks past the last listed one', () => {
    expect(listeningTrack(26_000)).toMatchObject({
      from: 25_000,
      left: 4_000,
      to: 30_000,
    })
  })
})

describe('shelveTopics', () => {
  test('sorts topics into new, playing and gold', () => {
    const done = finishedByTopic(
      [
        { id: 'v1', topicId: 'a' },
        { id: 'v2', topicId: 'a' },
        { id: 'v3', topicId: 'b' },
        { id: 'v4', topicId: 'c' },
        { id: 'v5', topicId: null },
      ],
      new Map([
        ['v1', 2],
        ['v2', 1],
        ['v3', 1],
        ['v5', 1],
      ])
    )
    const shelves = shelveTopics(
      [
        { id: 'a', total: 2 },
        { id: 'b', total: 4 },
        { id: 'c', total: 3 },
      ],
      done
    )

    expect(shelves.gold.map(item => item.topic.id)).toEqual(['a'])
    expect(shelves.playing).toEqual([
      { done: 1, shelf: 'playing', topic: { id: 'b', total: 4 }, total: 4 },
    ])
    expect(shelves.new.map(item => item.topic.id)).toEqual(['c'])
    expect(done.get(NO_TOPIC_KEY)).toBe(1)
  })
})

describe('advanceTopicRecord', () => {
  test('a newly finished video moves the record one step', () => {
    expect(
      advanceTopicRecord(
        { done: 6, total: 12 },
        { finished: true, wasFinishedBefore: false }
      )
    ).toEqual({ done: 7, gained: 1, left: 5, total: 12 })
  })

  test('a replay or an unfinished session adds nothing', () => {
    expect(
      advanceTopicRecord(
        { done: 6, total: 12 },
        { finished: true, wasFinishedBefore: true }
      )
    ).toMatchObject({ done: 6, gained: 0 })
    expect(
      advanceTopicRecord(
        { done: 6, total: 12 },
        { finished: false, wasFinishedBefore: false }
      )
    ).toMatchObject({ done: 6, gained: 0 })
  })
})
