/**
 * The listening journey, measured in sentences written by ear. Each
 * milestone is a "track"; the scrubber on the landing page plays from the
 * last track reached toward the next one, so a new goal is always close.
 */
export const SENTENCE_TRACKS = [
  25, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000,
] as const

export interface ListeningTrack {
  /** Sentences at the start of the current stretch (the last track reached). */
  from: number
  /** Sentences still to go to the next track. */
  left: number
  /** 1-based number of the track being played toward. */
  number: number
  /** Share of the current stretch already played, 0 to 1. */
  progress: number
  /** Sentences at the next track. */
  to: number
}

/**
 * Where the learner is between two tracks. Past the last listed track, the
 * tracks keep coming every 5000 sentences.
 */
export function listeningTrack(sentences: number): ListeningTrack {
  const count = Math.max(0, Math.floor(sentences))
  let from = 0

  for (const [index, to] of SENTENCE_TRACKS.entries()) {
    if (count < to)
      return {
        from,
        left: to - count,
        number: index + 1,
        progress: (count - from) / (to - from),
        to,
      }
    from = to
  }

  const last = SENTENCE_TRACKS.at(-1) ?? 0
  const extra = Math.floor((count - last) / 5000)
  const start = last + extra * 5000
  const end = start + 5000

  return {
    from: start,
    left: end - count,
    number: SENTENCE_TRACKS.length + extra + 1,
    progress: (count - start) / 5000,
    to: end,
  }
}

/** The shelf key of the "Uncategorized" bucket. */
export const NO_TOPIC_KEY = 'no-topic'

export type TopicShelf = 'playing' | 'new' | 'gold'

export interface ShelvedTopic<T> {
  done: number
  shelf: TopicShelf
  topic: T
  total: number
}

/**
 * Finished videos per topic (key NO_TOPIC_KEY for uncategorized), from the
 * learner's completion counts.
 */
export function finishedByTopic(
  videos: Array<{ id: string; topicId: string | null }>,
  completionCounts: Map<string, number>
) {
  const done = new Map<string, number>()

  for (const video of videos)
    if ((completionCounts.get(video.id) ?? 0) > 0) {
      const key = video.topicId ?? NO_TOPIC_KEY

      done.set(key, (done.get(key) ?? 0) + 1)
    }

  return done
}

/**
 * Puts each topic on a shelf: `playing` once started, `gold` when every
 * video is finished, `new` before the first. Playing topics closest to gold
 * come first; the other shelves keep the catalogue order.
 */
export function shelveTopics<T extends { id: string; total: number }>(
  topics: T[],
  doneByTopic: Map<string, number>
): Record<TopicShelf, ShelvedTopic<T>[]> {
  const shelves: Record<TopicShelf, ShelvedTopic<T>[]> = {
    gold: [],
    new: [],
    playing: [],
  }

  for (const topic of topics) {
    const done = Math.min(doneByTopic.get(topic.id) ?? 0, topic.total)
    const shelf: TopicShelf =
      done === 0 ? 'new' : done >= topic.total ? 'gold' : 'playing'

    shelves[shelf].push({ done, shelf, topic, total: topic.total })
  }

  shelves.playing.sort(
    (left, right) => right.done / right.total - left.done / left.total
  )

  return shelves
}
