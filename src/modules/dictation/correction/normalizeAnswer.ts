import {
  DEFAULT_CORRECTION_OPTIONS,
  type CorrectionOptions,
  type NormalizedAnswer,
} from './types'

const CONTRACTION_EXPANSIONS: Record<string, string> = {
  "aren't": 'are not',
  "can't": 'cannot',
  "couldn't": 'could not',
  "didn't": 'did not',
  "doesn't": 'does not',
  "don't": 'do not',
  "hadn't": 'had not',
  "hasn't": 'has not',
  "haven't": 'have not',
  "he'd": 'he would',
  "he'll": 'he will',
  "he's": 'he is',
  "i'd": 'i would',
  "i'll": 'i will',
  "i'm": 'i am',
  "i've": 'i have',
  "isn't": 'is not',
  "it's": 'it is',
  "let's": 'let us',
  "mustn't": 'must not',
  "she'd": 'she would',
  "she'll": 'she will',
  "she's": 'she is',
  "shouldn't": 'should not',
  "that's": 'that is',
  "there's": 'there is',
  "they'd": 'they would',
  "they'll": 'they will',
  "they're": 'they are',
  "they've": 'they have',
  "wasn't": 'was not',
  "we'd": 'we would',
  "we'll": 'we will',
  "we're": 'we are',
  "we've": 'we have',
  "weren't": 'were not',
  "what's": 'what is',
  "won't": 'will not',
  "wouldn't": 'would not',
  "you'd": 'you would',
  "you'll": 'you will',
  "you're": 'you are',
  "you've": 'you have',
}

const NUMBER_VARIANTS: Record<string, string> = {
  zero: '0',
  one: '1',
  first: '1',
  '1st': '1',
  two: '2',
  second: '2',
  '2nd': '2',
  three: '3',
  third: '3',
  '3rd': '3',
  four: '4',
  fourth: '4',
  '4th': '4',
  five: '5',
  fifth: '5',
  '5th': '5',
  six: '6',
  sixth: '6',
  '6th': '6',
  seven: '7',
  seventh: '7',
  '7th': '7',
  eight: '8',
  eighth: '8',
  '8th': '8',
  nine: '9',
  ninth: '9',
  '9th': '9',
  ten: '10',
  tenth: '10',
  '10th': '10',
  eleven: '11',
  eleventh: '11',
  '11th': '11',
  twelve: '12',
  twelfth: '12',
  '12th': '12',
  thirteen: '13',
  thirteenth: '13',
  '13th': '13',
  fourteen: '14',
  fourteenth: '14',
  '14th': '14',
  fifteen: '15',
  fifteenth: '15',
  '15th': '15',
  sixteen: '16',
  sixteenth: '16',
  '16th': '16',
  seventeen: '17',
  seventeenth: '17',
  '17th': '17',
  eighteen: '18',
  eighteenth: '18',
  '18th': '18',
  nineteen: '19',
  nineteenth: '19',
  '19th': '19',
  twenty: '20',
  twentieth: '20',
  '20th': '20',
}

const BRITISH_AMERICAN_VARIANTS: Record<string, string> = {
  analyse: 'analyze',
  analysed: 'analyzed',
  behaviour: 'behavior',
  centre: 'center',
  colour: 'color',
  favourite: 'favorite',
  grey: 'gray',
  honour: 'honor',
  labour: 'labor',
  learnt: 'learned',
  metre: 'meter',
  neighbour: 'neighbor',
  organisation: 'organization',
  organise: 'organize',
  organised: 'organized',
  realise: 'realize',
  realised: 'realized',
  theatre: 'theater',
  travelling: 'traveling',
}

function normalizeUnicode(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function expandContractions(value: string) {
  return value.replace(
    /\b[a-z]+(?:'[a-z]+)\b/g,
    match => CONTRACTION_EXPANSIONS[match] ?? match
  )
}

function removePunctuation(value: string) {
  return value.replace(/[^\p{L}\p{N}\s]/gu, ' ')
}

function canonicalizeToken(
  token: string,
  options: Required<CorrectionOptions>
) {
  if (options.acceptNumberVariants) {
    const numberVariant = NUMBER_VARIANTS[token]

    if (numberVariant) return numberVariant
  }

  if (options.acceptBritishAmericanVariants)
    return BRITISH_AMERICAN_VARIANTS[token] ?? token

  return token
}

export function normalizeAnswer(
  value: string,
  optionsInput: CorrectionOptions = {}
): NormalizedAnswer {
  const options = {
    ...DEFAULT_CORRECTION_OPTIONS,
    ...optionsInput,
  }
  const lowercased = normalizeUnicode(value).toLowerCase()
  const expanded = options.expandContractions
    ? expandContractions(lowercased)
    : lowercased
  const withoutPunctuation = options.ignorePunctuation
    ? removePunctuation(expanded)
    : expanded
  const originalTokens = withoutPunctuation
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  const tokens = originalTokens.map(token => canonicalizeToken(token, options))

  return {
    normalizedText: tokens.join(' '),
    originalTokens,
    tokens,
  }
}
