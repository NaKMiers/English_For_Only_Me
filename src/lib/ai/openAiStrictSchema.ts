import { z } from 'zod'

/*
 * OpenAI structured outputs in strict mode accept a subset of JSON Schema.
 * This turns a Zod schema into that subset. The Zod schema stays the
 * authority: its limits (lengths, ranges, sizes) are dropped from the JSON
 * Schema here but still enforced when the response is parsed with it.
 */

const DROPPED_KEYWORDS = [
  '$schema',
  '$id',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minItems',
  'maxItems',
  'default',
  'examples',
] as const

type JsonNode = Record<string, unknown>

function visit(node: unknown, path: string): unknown {
  if (Array.isArray(node))
    return node.map((item, index) => visit(item, `${path}[${index}]`))

  if (!node || typeof node !== 'object') return node

  const source = node as JsonNode
  const next: JsonNode = {}

  for (const [key, value] of Object.entries(source)) {
    if ((DROPPED_KEYWORDS as readonly string[]).includes(key)) continue

    if (key === 'oneOf') {
      next.anyOf = visit(value, `${path}.anyOf`)
      continue
    }

    next[key] = visit(value, `${path}.${key}`)
  }

  const isObject =
    next.type === 'object' ||
    (Array.isArray(next.type) && next.type.includes('object'))

  if (isObject) {
    const properties = (next.properties ?? {}) as JsonNode
    const keys = Object.keys(properties)
    const required = Array.isArray(source.required)
      ? (source.required as string[])
      : []

    if (
      source.additionalProperties &&
      typeof source.additionalProperties === 'object'
    )
      throw new Error(
        `toOpenAiStrictSchema: records are not allowed in strict mode (${path}).`
      )

    const optional = keys.filter(key => !required.includes(key))

    if (optional.length)
      throw new Error(
        `toOpenAiStrictSchema: optional fields are not allowed, use .nullable() (${path}: ${optional.join(', ')}).`
      )

    next.properties = properties
    next.required = keys
    next.additionalProperties = false
  }

  return next
}

export function toOpenAiStrictSchema(
  schema: z.ZodType
): Record<string, unknown> {
  return visit(z.toJSONSchema(schema), '$') as Record<string, unknown>
}

/** Every keyword strict mode rejects, for tests. */
export const OPENAI_STRICT_DROPPED_KEYWORDS = DROPPED_KEYWORDS
