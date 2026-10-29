import { describe, expect, it } from 'vitest'

import { OPENAI_STRICT_DROPPED_KEYWORDS } from '@/lib/ai/openAiStrictSchema'

import {
  IELTS_JOB_SCHEMAS,
  type IeltsJobKind,
  strictSchemaFor,
} from './aiSchemas'

function keysDeep(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(item => keysDeep(item, into))
  else if (value && typeof value === 'object')
    for (const [key, child] of Object.entries(value)) {
      into.add(key)
      keysDeep(child, into)
    }

  return into
}

describe('AI job schemas', () => {
  it.each(Object.keys(IELTS_JOB_SCHEMAS) as IeltsJobKind[])(
    '%s converts to a strict schema',
    kind => {
      const schema = strictSchemaFor(kind)
      const keys = keysDeep(schema)

      for (const keyword of OPENAI_STRICT_DROPPED_KEYWORDS)
        expect(keys.has(keyword)).toBe(false)

      expect(schema).toMatchObject({
        type: 'object',
        additionalProperties: false,
      })
    }
  )
})
