import type {
  DictationVideoApiRecord,
  DictationVideoProgress,
} from './types'

export function hasDictationTranscript(video: DictationVideoApiRecord) {
  return (
    video.transcriptStatus === 'manualAdded' &&
    Boolean(video.activeTranscriptId)
  )
}

export function getDictationResultsAction({
  isEmpty,
  progress,
  videoId,
}: {
  isEmpty: boolean
  progress: DictationVideoProgress
  videoId: string
}) {
  const href = `/dictation/videos/${videoId}/practice`

  if (!isEmpty && progress === 'completed')
    return {
      href,
      label: 'Practice Again',
    }

  if (progress === 'inProgress')
    return {
      href,
      label: 'Continue Practice',
    }

  return {
    href,
    label: 'Start Practice',
  }
}
