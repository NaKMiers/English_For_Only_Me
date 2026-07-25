/**
 * Small helper shared by the manual hint editor (client) and the segment route
 * (server) so both agree on what a valid hint is: a whole word that appears in
 * the sentence. This keeps Tab-fill and the "already typed" check in the
 * practice input working - a hint must be an actual word of the answer.
 *
 * This does NOT change the automatic hint logic in `buildCharCorrection`; it is
 * only used to validate/normalize the words an admin types by hand.
 */

const WORD_STRIP = /[^\p{L}\p{N}']/gu

function normalizeQuotes(value: string) {
  return value.normalize('NFKC').replace(/[‘’‛′]/g, "'")
}

/** Lowercased, punctuation-stripped key - two words with the same key are the
 * "same" hint (case- and punctuation-insensitive). */
function toKey(word: string): string {
  return normalizeQuotes(word).toLowerCase().replace(WORD_STRIP, '')
}

/** The word with surrounding/embedded punctuation removed, casing kept - what a
 * hint chip displays and what Tab-fill inserts (e.g. "London"). */
function toSurface(word: string): string {
  return normalizeQuotes(word).replace(WORD_STRIP, '')
}

function splitWords(text: string): string[] {
  return text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
}

/**
 * Keep only the hints that actually appear as a whole word in `sentence`,
 * deduped, in the sentence's own surface spelling. The CALLER's order is
 * preserved (not re-sorted to sentence order) so an admin can drag hints into
 * any order they like and that order is what practice uses for Tab-fill.
 */
export function filterHintsToSentence(
  sentence: string,
  hints: readonly string[]
): string[] {
  const surfaceByKey = new Map<string, string>()

  splitWords(sentence).forEach(word => {
    const key = toKey(word)

    if (key.length === 0 || surfaceByKey.has(key)) return

    surfaceByKey.set(key, toSurface(word))
  })

  const seen = new Set<string>()
  const kept: string[] = []

  for (const hint of hints) {
    const key = toKey(hint)

    if (key.length === 0 || seen.has(key)) continue

    const surface = surfaceByKey.get(key)

    if (!surface) continue

    seen.add(key)
    kept.push(surface)
  }

  return kept
}

/** True when `word` appears as a whole word in `sentence`. */
export function isWordInSentence(sentence: string, word: string): boolean {
  return filterHintsToSentence(sentence, [word]).length > 0
}
