import { createHash } from 'node:crypto'

export function createTranslationSourceHash(input: {
  segmentText: string
  targetLanguage: string
}) {
  return createHash('sha256')
    .update(input.targetLanguage.toLowerCase())
    .update('\n')
    .update(input.segmentText.normalize('NFKC').replace(/\s+/g, ' ').trim())
    .digest('hex')
}
