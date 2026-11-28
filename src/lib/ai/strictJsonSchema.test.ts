import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { STRICT_DROPPED_KEYWORDS, toStrictJsonSchema } from './strictJsonSchema'

function keysDeep(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(item => keysDeep(item, into))
  else if (value && typeof value === 'object')
    for (const [key, child] of Object.entries(value)) {
      into.add(key)
      keysDeep(child, into)
    }

  return into
}

describe('toStrictJsonSchema', () => {
  it('drops rejected keywords, keeps structure and requires every key', () => {
    const schema = toStrictJsonSchema(
      z.object({
        name: z.string().min(1).max(20),
        score: z.number().min(0).max(9).nullable(),
        tags: z.array(z.string()).max(3),
        visual: z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('line'), points: z.array(z.number()) }),
          z.object({ kind: z.literal('image'), url: z.string() }),
        ]),
      })
    )
    const keys = keysDeep(schema)

    for (const keyword of STRICT_DROPPED_KEYWORDS)
      expect(keys.has(keyword)).toBe(false)

    expect(keys.has('oneOf')).toBe(false)
    expect(schema).toMatchObject({
      type: 'object',
      additionalProperties: false,
      required: ['name', 'score', 'tags', 'visual'],
    })
  })

  it('refuses optional fields and records', () => {
    expect(() =>
      toStrictJsonSchema(z.object({ note: z.string().optional() }))
    ).toThrow(/optional/)
    expect(() =>
      toStrictJsonSchema(z.object({ map: z.record(z.string(), z.number()) }))
    ).toThrow(/records/)
  })
})
