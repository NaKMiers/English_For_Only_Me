import { toLemma } from './lemma'

/**
 * Closed-class English words.
 *
 * These are the words a grammar drill EXISTS to test - articles, auxiliaries,
 * quantifiers, prepositions, modals. A blank whose answer is one of these is a
 * grammar question: "She ___ not drink tea" has exactly one answer, "does", and
 * cueing it would be giving it away.
 *
 * Everything outside this set is vocabulary. A blank whose answer is a verb or
 * noun the prompt never mentions is not a hard question, it is an unanswerable
 * one - "I ___ football yesterday" is equally "played", "watched", "loved" or
 * "missed", and only the author knows which.
 *
 * Deliberately generous. A word wrongly included here means one drill escapes
 * the check; a word wrongly excluded means a good drill gets rejected. The
 * first failure is cheaper.
 */
const FUNCTION_WORDS = new Set(
  (
    'a an the some any much many few little lot lots of no none all both each every either neither several enough ' +
    'am is are was were be been being aint ' +
    'do does did done doing ' +
    'have has had having ' +
    'will would shall should can could may might must ought need dare ' +
    'used to get gets got gotten ' +
    'i you he she it we they me him her us them one oneself ' +
    'my your his its our their mine yours hers ours theirs ' +
    'myself yourself himself herself itself ourselves yourselves themselves ' +
    'this that these those there here ' +
    'who whom whose which what when where why how whatever whoever whenever wherever however ' +
    'in on at by for with without from into onto upon about over under above below beneath ' +
    'between among through across along around behind beside besides during since until till ' +
    'before after against toward towards within throughout despite per via off out up down near ' +
    'and or but nor so yet because although though while whereas unless if whether than as ' +
    'not never ever no yes too also just only still already ' +
    'more most less least very quite rather almost nearly hardly scarcely barely ' +
    // Substitution pronouns and determiners, in both numbers. "one/ones" and
    // "other/others" are the closed-class words their own drills teach, so a
    // blank answered by "the others" is a grammar question, not a vocabulary
    // one.
    'such own same other others another else both neither either one ones ' +
    // Negated auxiliaries. "I ____ swim" has one answer, and it is grammar.
    // Both spellings: the tokenizer keeps apostrophes, so "won't" and "wont"
    // are different strings and a tag-question drill answered by "won't they"
    // would otherwise look like it needed vocabulary.
    'cannot cant dont doesnt didnt isnt arent wasnt werent hasnt havent hadnt ' +
    'wont wouldnt shant shouldnt couldnt mustnt mightnt neednt ' +
    "can't don't doesn't didn't isn't aren't wasn't weren't hasn't haven't " +
    "hadn't won't wouldn't shan't shouldn't couldn't mustn't mightn't needn't " +
    "i'm i've i'll i'd you're you've you'll you'd he's he'll he'd she's " +
    "she'll she'd it's we're we've we'll we'd they're they've they'll they'd " +
    "that's there's who's what's let's " +
    // Indefinite pronouns and determiners.
    'someone somebody something somewhere anyone anybody anything anywhere ' +
    'everyone everybody everything everywhere nobody nothing nowhere ' +
    // Conjunctive adverbs. Which one fits is fixed by the relation between the
    // two sentences, so these are grammar questions with one answer.
    'however nevertheless nonetheless moreover furthermore therefore thus hence ' +
    'otherwise meanwhile instead consequently accordingly likewise similarly ' +
    'additionally alternatively conversely overall finally firstly secondly ' +
    // Frequency and modality adverbs.
    'always usually normally generally frequently often sometimes occasionally ' +
    'rarely seldom probably possibly certainly definitely surely perhaps maybe ' +
    // Degree adverbs and the irregular comparatives. In an adjective-versus-adverb
    // or comparative drill, the structure decides the form - that is the point
    // of the drill - so the learner is not being asked to invent vocabulary.
    'absolutely completely totally utterly entirely fairly pretty slightly ' +
    'somewhat extremely enormously incredibly terribly awfully highly deeply ' +
    'far further furthest farther farthest ' +
    'good well better best bad worse worst'
  ).split(/\s+/)
)

function words(value: string) {
  return (value.toLowerCase().match(/[a-z']+/gu) ?? []).filter(Boolean)
}

/**
 * Is `cue` the same lexeme as `answer`, near enough?
 *
 * Not a stemmer. The only question is whether the author mentioned this word,
 * so it accepts the shapes inflection actually takes:
 *
 *   go / goes, read / reading, play / played   prefix
 *   study / studied, carry / carried           shared four-character opening,
 *                                              because -y -> -ied breaks prefix
 *
 * A plain four-character prefix rule alone fails "go" -> "goes" (the cue is
 * shorter than the window), and a plain prefix rule alone fails "study" ->
 * "studied" (the y becomes an i). Both are needed.
 */
function sameLexeme(cue: string, answer: string) {
  /**
   * Dictionary forms first, because spelling alone cannot connect an irregular
   * verb to its cue. "(go)" next to a blank answered by "went" shares no
   * letters, and without this the backfill would cue every irregular verb and
   * this check would then still report all of them as uncued - which is exactly
   * what happened before the lemma map was shared between the two.
   */
  const cueLemma = toLemma(cue)
  const answerLemma = toLemma(answer)

  if (cueLemma && answerLemma && cueLemma === answerLemma) return true

  /**
   * Each word in both spellings a suffix can produce.
   *
   * A final y becomes i before most suffixes - easy/easier, study/studied - so
   * the folded form is needed to see through that. But the fold must not
   * REPLACE the raw form: folding "play" to "plai" would stop it matching
   * "played". Both spellings get compared.
   */
  const variants = (word: string) => [word, word.replace(/y$/u, 'i')]

  for (const left of variants(cue))
    for (const right of variants(answer)) {
      if (left === right) return true

      const [shorter, longer] =
        left.length <= right.length ? [left, right] : [right, left]

      if (shorter.length >= 2 && longer.startsWith(shorter)) return true
      if (
        left.length >= 4 &&
        right.length >= 4 &&
        left.slice(0, 4) === right.slice(0, 4)
      )
        return true
    }

  return false
}

/**
 * Words the answer needs that the question never supplies.
 *
 * ```
 *   prompt: "I ___ football yesterday."      target: "played"
 *           stems: i, foot, yest                     played -> not closed-class
 *                                                           -> stem "play" absent
 *           => ["played"]   UNANSWERABLE
 *
 *   prompt: "I ___ (play) football yesterday."  target: "played"
 *           stems: i, play, foot, yest                 stem "play" present
 *           => []           answerable
 *
 *   prompt: "She ___ not drink tea."          target: "does"
 *                                                     does -> closed-class
 *           => []           answerable
 * ```
 *
 * An empty result means every word of the answer is either grammar the drill is
 * testing, or vocabulary the question already gave. A non-empty result names
 * the words the learner is being asked to read the author's mind about.
 */
export function findUncuedAnswerWords({
  prompt,
  target,
}: {
  prompt: string
  target: string
}) {
  /**
   * Only CONTENT words in the prompt can serve as cues.
   *
   * Without that restriction the function words in the prompt start matching by
   * accident: "in" is a two-character prefix of "information", so
   * "I need ___ in the course." would look like it had cued the very noun the
   * learner is expected to invent.
   */
  const cues = words(prompt).filter(word => !FUNCTION_WORDS.has(word))

  return words(target).filter(
    word =>
      !FUNCTION_WORDS.has(word) && !cues.some(cue => sameLexeme(cue, word))
  )
}

/**
 * The form of a word used when looking for overlap across a blank.
 *
 * A possessive is the same word wearing a suffix: "My brother ___ car" answered
 * by "My brother's car" repeats "my brother", and comparing raw strings misses
 * it because "brother" and "brother's" differ. The apostrophe is exactly what
 * the learner is being asked to add, so it must not hide the repetition.
 */
export function overlapKey(word: string) {
  return word.toLowerCase().replace(/['']s?$/u, '')
}

/**
 * Split a prompt at its blank, ignoring any bracketed cue.
 *
 * The cue is metadata about the exercise, not part of the sentence, so
 * "(play)" must not be treated as a word sitting next to the gap.
 */
function splitAtBlank(prompt: string) {
  const bare = prompt.replace(/\([^)]*\)/gu, ' ')
  const blank = /_{2,}|\.{3,}/u.exec(bare)

  if (!blank) return null

  return {
    after: words(bare.slice(blank.index + blank[0].length)),
    before: words(bare.slice(0, blank.index)),
  }
}

/**
 * Does the answer repeat a word the sentence already has beside the blank?
 *
 * The defect this catches, from a real generated question:
 *
 *     prompt: "I need ___ advice before I decide."
 *     target: "some advice"
 *     filled: "I need some advice advice before I decide."
 *
 * The blank sits before "advice", so the only sane answer is "some" - and a
 * learner who writes "some" is marked wrong, because the stored target carries
 * the noun a second time. The question looks answerable and is not gradeable,
 * which is the worst combination: the learner concludes the grader is broken.
 *
 * Only a repeat that STRADDLES the blank counts. A prompt containing its own
 * repetition is fine and sometimes required - "If they had had enough money"
 * is correct English, and "plural of cat: cat -> ___" repeats by design.
 *
 * Returns the offending word, or null.
 */
export function findBlankScopeConflict({
  prompt,
  target,
}: {
  prompt: string
  target: string
}) {
  const parts = splitAtBlank(prompt)
  const answer = words(target).map(overlapKey)

  if (!parts || answer.length === 0) return null

  const before = parts.before.map(overlapKey)
  const after = parts.after.map(overlapKey)

  // Longest overlap first: "My brother ___ car" against "My brother's car"
  // repeats TWO words, and a one-word comparison sees no repeat at all because
  // "brother" and "brother's" are different strings.
  for (let span = Math.min(3, answer.length); span >= 1; span -= 1) {
    const head = answer.slice(0, span).join(' ')
    const tail = answer.slice(-span).join(' ')

    if (before.length >= span && before.slice(-span).join(' ') === head)
      return head
    if (after.length >= span && after.slice(0, span).join(' ') === tail)
      return tail
  }

  return null
}

/**
 * Does this drill give the learner enough to answer it?
 *
 * Only meaningful for kinds where the learner supplies a fragment and the
 * prompt is the only context - `fillBlank`. The other kinds carry their own
 * material by construction: `correct` and `transform` embed the source
 * sentence, `build` lists the words to use, and `choice` shows the options.
 *
 * `choices` rescues any kind: if the answer is on screen, nothing has to be
 * guessed.
 */
export function isAnswerableWithoutGuessing({
  choices,
  kind,
  prompt,
  target,
}: {
  choices?: string[] | null
  kind: string
  prompt: string
  target: string
}) {
  if (choices && choices.length > 0) return true
  if (kind !== 'fillBlank') return true

  return findUncuedAnswerWords({ prompt, target }).length === 0
}
