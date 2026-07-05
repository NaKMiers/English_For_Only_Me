import { createHash } from 'node:crypto'

export function createTranscriptSourceHash(input: {
  language: string
  normalizedText: string
  sourceType: string
}) {
  return createHash('sha256')
    .update(input.sourceType)
    .update('\n')
    .update(input.language.toLowerCase())
    .update('\n')
    .update(input.normalizedText)
    .digest('hex')
}
