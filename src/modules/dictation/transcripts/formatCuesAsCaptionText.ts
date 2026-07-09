import type { DictationCueRecord } from '@/modules/dictation/types'

function formatSrtTimestamp(ms: number) {
  const totalMs = Math.max(0, Math.round(ms))
  const hours = Math.floor(totalMs / 3_600_000)
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000)
  const seconds = Math.floor((totalMs % 60_000) / 1000)
  const millis = totalMs % 1000
  const pad = (value: number, length = 2) =>
    value.toString().padStart(length, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`
}

// Reconstructs SRT-style text from parsed cues so a stored transcript can be
// re-edited in the same shape it was originally uploaded in. `rawText` on the
// transcript record is the normalized, timing-stripped text used for
// segmenting/hashing - not the original caption file - so cues are the only
// place per-line timing survives.
export function formatCuesAsCaptionText(cues: DictationCueRecord[]) {
  return cues
    .map((cue, position) => {
      const start = formatSrtTimestamp(cue.startMs ?? 0)
      const end = formatSrtTimestamp(cue.endMs ?? 0)

      return `${position + 1}\n${start} --> ${end}\n${cue.text}`
    })
    .join('\n\n')
}
