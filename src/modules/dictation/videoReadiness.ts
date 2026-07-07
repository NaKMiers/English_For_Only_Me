import type { DictationVideoApiRecord } from './types'

export function hasDictationTranscript(video: DictationVideoApiRecord) {
  return (
    video.transcriptStatus === 'manualAdded' &&
    Boolean(video.activeTranscriptId)
  )
}

export function getDictationVideoAction(video: DictationVideoApiRecord) {
  if (!hasDictationTranscript(video))
    return {
      href: `/dictation/videos/${video.id}/edit`,
      label: 'Add Transcript',
    }

  if (video.status === 'ready')
    return {
      href: `/dictation/videos/${video.id}/practice`,
      label: 'Start Practice',
    }

  if (video.status === 'inProgress')
    return {
      href: `/dictation/videos/${video.id}/practice`,
      label: 'Continue Practice',
    }

  if (video.status === 'completed')
    return {
      href: `/dictation/videos/${video.id}/results`,
      label: 'Open Results',
    }

  return {
    href: `/dictation/videos/${video.id}/edit`,
    label: 'Continue Setup',
  }
}

export function getDictationResultsAction({
  isEmpty,
  videoId,
  videoStatus,
}: {
  isEmpty: boolean
  videoId: string
  videoStatus: DictationVideoApiRecord['status']
}) {
  const href = `/dictation/videos/${videoId}/practice`

  if (!isEmpty && videoStatus === 'completed')
    return {
      href,
      label: 'Practice Again',
    }

  if (videoStatus === 'inProgress')
    return {
      href,
      label: 'Continue Practice',
    }

  return {
    href,
    label: 'Start Practice',
  }
}
