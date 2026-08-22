/**
 * Dictionary forms of inflected English words.
 *
 * Shared on purpose. Two callers need the same knowledge and must not drift:
 * `cueFillBlankPrompts` writes a cue like "(go)" next to a blank answered by
 * "went", and `answerability` has to recognise that cue as covering that
 * answer. When they disagreed, every irregular verb was cued and then still
 * reported as uncued.
 */

/**
 * Irregular forms, mapped back to the word a learner would be cued with.
 *
 * Only the verbs that actually appear in A1-C1 drill sentences. A missing entry
 * is not a silent wrong answer - it falls through to the suffix rules, and if
 * those cannot produce a confident lemma the drill is reported for a human
 * instead of being cued incorrectly.
 */
const IRREGULAR_LEMMAS: Record<string, string> = {
  ate: 'eat',
  became: 'become',
  began: 'begin',
  begun: 'begin',
  bought: 'buy',
  brought: 'bring',
  built: 'build',
  came: 'come',
  caught: 'catch',
  chose: 'choose',
  chosen: 'choose',
  drank: 'drink',
  driven: 'drive',
  drove: 'drive',
  eaten: 'eat',
  fell: 'fall',
  fallen: 'fall',
  felt: 'feel',
  flew: 'fly',
  flown: 'fly',
  forgot: 'forget',
  forgotten: 'forget',
  found: 'find',
  gave: 'give',
  given: 'give',
  gone: 'go',
  goes: 'go',
  grew: 'grow',
  grown: 'grow',
  heard: 'hear',
  held: 'hold',
  kept: 'keep',
  knew: 'know',
  known: 'know',
  laid: 'lay',
  led: 'lead',
  left: 'leave',
  lent: 'lend',
  lost: 'lose',
  made: 'make',
  meant: 'mean',
  met: 'meet',
  paid: 'pay',
  put: 'put',
  ran: 'run',
  rang: 'ring',
  rung: 'ring',
  risen: 'rise',
  rose: 'rise',
  said: 'say',
  sang: 'sing',
  sat: 'sit',
  saw: 'see',
  seen: 'see',
  sent: 'send',
  shown: 'show',
  slept: 'sleep',
  sold: 'sell',
  spent: 'spend',
  spoke: 'speak',
  spoken: 'speak',
  stood: 'stand',
  stolen: 'steal',
  stole: 'steal',
  swam: 'swim',
  taken: 'take',
  taught: 'teach',
  telling: 'tell',
  thought: 'think',
  told: 'tell',
  took: 'take',
  understood: 'understand',
  went: 'go',
  woke: 'wake',
  won: 'win',
  wore: 'wear',
  written: 'write',
  wrote: 'write',
  // Irregular plurals, for noun blanks.
  children: 'child',
  feet: 'foot',
  men: 'man',
  people: 'person',
  teeth: 'tooth',
  women: 'woman',
}

/**
 * Forms whose base cannot be recovered from the spelling.
 *
 * English writes both `visit + ed -> visited` and `live + ed -> lived`, and
 * from `visited` / `lived` alone there is no letter pattern that says which
 * dropped a silent e. Same for `-ing`: `read -> reading` keeps its stem,
 * `write -> writing` loses an e.
 *
 * Rather than guess, this map names the ambiguous forms that actually occur.
 * Measured against the committed taxonomy there are fifteen of them, so the
 * map is complete rather than representative - and anything new falls through
 * to `null`, which reports instead of inventing.
 */
const AMBIGUOUS_LEMMAS: Record<string, string> = {
  answering: 'answer',
  approved: 'approve',
  bored: 'bore',
  boring: 'bore',
  coming: 'come',
  considered: 'consider',
  driving: 'drive',
  lived: 'live',
  living: 'live',
  opened: 'open',
  opening: 'open',
  produced: 'produce',
  provided: 'provide',
  united: 'unite',
  using: 'use',
  // A few more of the same shape, so the common cases keep working as content
  // grows rather than waiting to be reported one at a time.
  arrived: 'arrive',
  arriving: 'arrive',
  closed: 'close',
  closing: 'close',
  decided: 'decide',
  deciding: 'decide',
  hoped: 'hope',
  hoping: 'hope',
  included: 'include',
  invited: 'invite',
  liked: 'like',
  liking: 'like',
  loved: 'love',
  loving: 'love',
  making: 'make',
  moved: 'move',
  moving: 'move',
  saved: 'save',
  saving: 'save',
  shared: 'share',
  sharing: 'share',
  taking: 'take',
  used: 'use',
  visited: 'visit',
  visiting: 'visit',
  writing: 'write',
}

/**
 * A base whose final letters leave the silent-e question open.
 *
 * Single consonant, single vowel, single consonant - `liv`, `writ`, `hop`,
 * `visit`. Everything else is decidable: a doubled consonant was added for the
 * suffix (`stopp`), a vowel digraph never had an e (`clean`, `read`), two
 * consonants never had one (`work`, `want`), and a final y is its own rule
 * (`play`).
 */
const SILENT_E_AMBIGUOUS = /(^|[^aeiouy])[aeiou][^aeiouwxy]$/u

/**
 * The dictionary form of one inflected word, or null when unsure.
 *
 * Null is a real answer and the important one. A wrong cue is worse than the
 * missing cue it replaces: `I ___ (playe) football yesterday` teaches the
 * learner that the exercise itself is unreliable, which is the problem this
 * whole change exists to fix. So anything the rules cannot resolve is reported
 * for a human instead of guessed at.
 */
export function toLemma(word: string): string | null {
  const lower = word.toLowerCase()

  if (IRREGULAR_LEMMAS[lower]) return IRREGULAR_LEMMAS[lower]
  if (AMBIGUOUS_LEMMAS[lower]) return AMBIGUOUS_LEMMAS[lower]

  // Too short to carry a suffix worth stripping; already a base form.
  if (lower.length <= 3) return lower

  if (lower.length > 4 && (lower.endsWith('ies') || lower.endsWith('ied')))
    return `${lower.slice(0, -3)}y`

  for (const suffix of ['ing', 'ed'] as const) {
    if (!lower.endsWith(suffix)) continue

    const base = lower.slice(0, -suffix.length)

    if (base.length < 2) return null
    // "running" -> "run", "stopped" -> "stop": the doubled consonant belongs to
    // the suffix, not the stem.
    if (/([^aeiou])\1$/u.test(base)) return base.slice(0, -1)
    // Undecidable from spelling alone, and not in the map above.
    if (SILENT_E_AMBIGUOUS.test(base)) return null

    return base
  }

  if (lower.endsWith('ies')) return `${lower.slice(0, -3)}y`
  if (lower.endsWith('ses') || lower.endsWith('ches') || lower.endsWith('shes'))
    return lower.slice(0, -2)
  if (lower.endsWith('es') && lower.length > 4) return lower.slice(0, -2)
  if (
    lower.endsWith('s') &&
    !lower.endsWith('ss') &&
    !lower.endsWith('us') &&
    !lower.endsWith('is')
  )
    return lower.slice(0, -1)

  return lower
}
