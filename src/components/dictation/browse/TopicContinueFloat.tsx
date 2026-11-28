'use client'

import { ContinueFloat } from '@/components/journey/ContinueFloat'

import { browseDisclosureId, openBrowseDisclosure } from './BrowseDisclosure'
import { videoCardId } from './BrowseVideoList'

interface Props {
  label: string
  /** The folding section that holds the video, or null in a flat list. */
  panelId: string | null
  videoId: string
}

/**
 * The topic page's way on: an always-on floating Continue that opens the
 * section holding the next video (if the learner folded it), scrolls to that
 * video's card, focuses it and gives the card a small bounce, instead of
 * opening the video straight away.
 */
export function TopicContinueFloat({ label, panelId, videoId }: Props) {
  return (
    <ContinueFloat
      fallbackId={panelId ? browseDisclosureId(panelId) : undefined}
      label={label}
      nextStopId={null}
      nudge="li"
      onBeforeJump={() => {
        if (panelId) openBrowseDisclosure(panelId)
      }}
      persistent
      targetId={videoCardId(videoId)}
    />
  )
}
