import { advanceTopicRecord } from '@/components/dictation/browse/listeningJourney'
import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import type { VideoTopicRecord } from '@/modules/dictation/practice/topicRecord'

/**
 * The journey step a dictation session end shows: "+1 on TED, 3 to go" for
 * a first finish, the same line without the +1 for a replay (or a page that
 * only looks back, like results), "TED is done" once every video is.
 */
export function topicStepLine(
  record: VideoTopicRecord,
  session: { finished: boolean; wasFinishedBefore: boolean },
  text: Messages['dictation']['practice']
) {
  const step = advanceTopicRecord(record, session)

  if (step.left === 0)
    return format(text.journeyGold, { topic: record.topicTitle })

  return format(step.gained > 0 ? text.journeyGained : text.journeyLeft, {
    left: step.left,
    topic: record.topicTitle,
  })
}
