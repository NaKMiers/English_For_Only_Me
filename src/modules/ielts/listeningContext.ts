const words = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const ANNOUNCER = /^(announcer|narrator|examiner)$/i
const INTRO = /\byou will hear\b/i

/**
 * True when the audioscript already reads the part context aloud, so the
 * header must not print it a second time. The stored context is often a
 * shortened copy of the announcer's line ("Part 2, you will hear a
 * recruitment officer giving a talk" vs "... officer called Megan Baker,
 * giving a talk"), so an announcer line that introduces the part counts too.
 */
export function contextReadAloud(
  listening:
    | {
        context?: string | null
        lines?: { speaker: string; text: string }[] | null
      }
    | null
    | undefined
) {
  const context = words(listening?.context ?? '')

  if (!context) return false

  return (listening?.lines ?? []).some(
    line =>
      words(line.text).includes(context) ||
      (ANNOUNCER.test(line.speaker.trim()) && INTRO.test(line.text))
  )
}
