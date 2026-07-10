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

const MEASUREMENT_VARIANTS: Record<string, string> = {
  centimeter: 'cm',
  centimeters: 'cm',
  centimetre: 'cm',
  centimetres: 'cm',
  cm: 'cm',
  feet: 'ft',
  foot: 'ft',
  ft: 'ft',
  g: 'g',
  gallon: 'gal',
  gallons: 'gal',
  gal: 'gal',
  gram: 'g',
  grams: 'g',
  in: 'in',
  inch: 'in',
  inches: 'in',
  kilogram: 'kg',
  kilograms: 'kg',
  kilometer: 'km',
  kilometers: 'km',
  kilometre: 'km',
  kilometres: 'km',
  kg: 'kg',
  km: 'km',
  l: 'l',
  lb: 'lb',
  lbs: 'lb',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  litter: 'l',
  litters: 'l',
  m: 'm',
  meter: 'm',
  meters: 'm',
  metre: 'm',
  metres: 'm',
  mi: 'mi',
  mile: 'mi',
  miles: 'mi',
  milligram: 'mg',
  milligrams: 'mg',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  millimeter: 'mm',
  millimeters: 'mm',
  millimetre: 'mm',
  millimetres: 'mm',
  mg: 'mg',
  ml: 'ml',
  mm: 'mm',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  pound: 'lb',
  pounds: 'lb',
  tonne: 't',
  tonnes: 't',
  ton: 't',
  tons: 't',
  yard: 'yd',
  yards: 'yd',
  yd: 'yd',
}

const CURRENCY_VARIANTS: Record<string, string> = {
  dollar: 'usd',
  dollars: 'usd',
  dong: 'vnd',
  euro: 'eur',
  euros: 'eur',
  usd: 'usd',
  vnd: 'vnd',
  yen: 'jpy',
  yuan: 'cny',
}

const SYMBOL_VARIANTS: Record<string, string> = {
  celsius: 'celsius',
  centigrade: 'celsius',
  fahrenheit: 'fahrenheit',
  percent: 'percent',
  percentage: 'percent',
  pct: 'percent',
}

const CARDINAL_VALUES: Record<string, number> = {
  eight: 8,
  eighteen: 18,
  eleven: 11,
  fifteen: 15,
  five: 5,
  four: 4,
  fourteen: 14,
  nine: 9,
  nineteen: 19,
  one: 1,
  seven: 7,
  seventeen: 17,
  six: 6,
  sixteen: 16,
  ten: 10,
  thirteen: 13,
  three: 3,
  twelve: 12,
  two: 2,
  zero: 0,
}

const ORDINAL_VALUES: Record<string, number> = {
  eighth: 8,
  eighteenth: 18,
  eleventh: 11,
  fifteenth: 15,
  fifth: 5,
  first: 1,
  fourth: 4,
  fourteenth: 14,
  ninth: 9,
  nineteenth: 19,
  second: 2,
  seventh: 7,
  seventeenth: 17,
  sixth: 6,
  sixteenth: 16,
  tenth: 10,
  third: 3,
  thirteenth: 13,
  twelfth: 12,
}

const TENS_VALUES: Record<string, number> = {
  eighty: 80,
  fifty: 50,
  forty: 40,
  ninety: 90,
  seventy: 70,
  sixty: 60,
  thirty: 30,
  twenty: 20,
}

const TENS_ORDINAL_VALUES: Record<string, number> = {
  eightieth: 80,
  fiftieth: 50,
  fortieth: 40,
  ninetieth: 90,
  seventieth: 70,
  sixtieth: 60,
  thirtieth: 30,
  twentieth: 20,
}

function getOrdinalSuffix(value: number) {
  const teen = value % 100

  if (teen >= 11 && teen <= 13) return 'th'
  if (value % 10 === 1) return 'st'
  if (value % 10 === 2) return 'nd'
  if (value % 10 === 3) return 'rd'

  return 'th'
}

function addGeneratedNumberVariants() {
  for (let value = 0; value <= 99; value += 1) {
    NUMBER_VARIANTS[String(value)] = String(value)
    NUMBER_VARIANTS[`${value}${getOrdinalSuffix(value)}`] = String(value)
  }
}

addGeneratedNumberVariants()

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function expandAttachedUnits(value: string) {
  const units = Object.keys(MEASUREMENT_VARIANTS)
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|')

  return value.replace(
    new RegExp(`\\b(\\d+(?:[.,]\\d+)?)\\s*(${units})\\b`, 'gi'),
    '$1 $2'
  )
}

export function expandSymbolicVariants(value: string) {
  return expandAttachedUnits(value)
    .replace(/\ba\.?\s*m\.?\b/gi, 'am')
    .replace(/\bp\.?\s*m\.?\b/gi, 'pm')
    .replace(/\b(\d+(?:[.,]\d+)?)(am|pm)\b/g, '$1 $2')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*%/g, '$1 percent')
    .replace(/%/g, ' percent ')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(?:°\s*c|℃)\b/g, '$1 celsius')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(?:°\s*f|℉)\b/g, '$1 fahrenheit')
    .replace(/\$\s*(\d+(?:[.,]\d+)?)/g, '$1 dollar')
    .replace(/(\d+(?:[.,]\d+)?)\s*\$/g, '$1 dollar')
    .replace(/€\s*(\d+(?:[.,]\d+)?)/g, '$1 euro')
    .replace(/(\d+(?:[.,]\d+)?)\s*€/g, '$1 euro')
    .replace(/¥\s*(\d+(?:[.,]\d+)?)/g, '$1 yen')
    .replace(/(\d+(?:[.,]\d+)?)\s*¥/g, '$1 yen')
    .replace(/₫\s*(\d+(?:[.,]\d+)?)/g, '$1 dong')
    .replace(/(\d+(?:[.,]\d+)?)\s*₫/g, '$1 dong')
}

function removePunctuation(value: string) {
  return value.replace(/[^\p{L}\p{N}\s]/gu, ' ')
}

function readUnderOneHundred(tokens: string[], startIndex: number) {
  const first = tokens[startIndex]

  if (!first) return null

  const singleValue = CARDINAL_VALUES[first] ?? ORDINAL_VALUES[first]

  if (singleValue !== undefined)
    return {
      length: 1,
      value: singleValue,
    }

  const tensValue = TENS_VALUES[first] ?? TENS_ORDINAL_VALUES[first]

  if (tensValue === undefined) return null

  const second = tokens[startIndex + 1]
  const secondValue =
    second === undefined
      ? undefined
      : (CARDINAL_VALUES[second] ?? ORDINAL_VALUES[second])

  if (secondValue !== undefined && secondValue > 0 && secondValue < 10)
    return {
      length: 2,
      value: tensValue + secondValue,
    }

  return {
    length: 1,
    value: tensValue,
  }
}

function readNumberPhrase(tokens: string[], startIndex: number) {
  const first = readUnderOneHundred(tokens, startIndex)

  if (!first) return null

  const nextToken = tokens[startIndex + first.length]

  if (nextToken === 'hundred') {
    const afterHundredIndex = startIndex + first.length + 1
    const afterAndIndex =
      tokens[afterHundredIndex] === 'and'
        ? afterHundredIndex + 1
        : afterHundredIndex
    const remainder = readUnderOneHundred(tokens, afterAndIndex)

    if (remainder && remainder.value > 0)
      return {
        length: afterAndIndex - startIndex + remainder.length,
        value: first.value * 100 + remainder.value,
      }

    return {
      length: first.length + 1,
      value: first.value * 100,
    }
  }

  if (nextToken === 'thousand')
    return {
      length: first.length + 1,
      value: first.value * 1000,
    }

  return first.length > 1 ? first : null
}

function canonicalizeTokenList(
  originalTokens: string[],
  options: Required<CorrectionOptions>
) {
  const collapsedOriginalTokens: string[] = []
  const tokens: string[] = []
  let index = 0

  while (index < originalTokens.length) {
    if (options.acceptNumberVariants) {
      const numberPhrase = readNumberPhrase(originalTokens, index)

      if (numberPhrase) {
        collapsedOriginalTokens.push(
          originalTokens.slice(index, index + numberPhrase.length).join(' ')
        )
        tokens.push(String(numberPhrase.value))
        index += numberPhrase.length
        continue
      }
    }

    if (
      originalTokens[index] === 'per' &&
      originalTokens[index + 1] === 'cent'
    ) {
      collapsedOriginalTokens.push('per cent')
      tokens.push('percent')
      index += 2
      continue
    }

    collapsedOriginalTokens.push(originalTokens[index])
    tokens.push(canonicalizeCorrectionToken(originalTokens[index], options))
    index += 1
  }

  return {
    originalTokens: collapsedOriginalTokens,
    tokens,
  }
}

export function canonicalizeCorrectionToken(
  token: string,
  options: Required<CorrectionOptions>
) {
  if (options.acceptNumberVariants) {
    const numberVariant = NUMBER_VARIANTS[token]

    if (numberVariant) return numberVariant
  }

  const spellingVariant = options.acceptBritishAmericanVariants
    ? (BRITISH_AMERICAN_VARIANTS[token] ?? token)
    : token

  if (options.acceptMeasurementVariants)
    return (
      MEASUREMENT_VARIANTS[spellingVariant] ??
      CURRENCY_VARIANTS[spellingVariant] ??
      SYMBOL_VARIANTS[spellingVariant] ??
      spellingVariant
    )

  return spellingVariant
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
  const symbolicExpanded = expandSymbolicVariants(lowercased)
  const expanded = options.expandContractions
    ? expandContractions(symbolicExpanded)
    : symbolicExpanded
  const withoutPunctuation = options.ignorePunctuation
    ? removePunctuation(expanded)
    : expanded
  const originalTokens = withoutPunctuation
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  const canonicalized = canonicalizeTokenList(originalTokens, options)

  return {
    normalizedText: canonicalized.tokens.join(' '),
    originalTokens: canonicalized.originalTokens,
    tokens: canonicalized.tokens,
  }
}
