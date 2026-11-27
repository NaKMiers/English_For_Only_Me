import type { DictationVideoApiRecord, DictationVideoProgress } from './types'

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

  // `kind` keys the button label in `t.dictation.resultsAction`.
  if (!isEmpty && progress === 'completed')
    return {
      href,
      kind: 'practiceAgain' as const,
    }

  if (progress === 'inProgress')
    return {
      href,
      kind: 'continuePractice' as const,
    }

  return {
    href,
    kind: 'startPractice' as const,
  }
}
