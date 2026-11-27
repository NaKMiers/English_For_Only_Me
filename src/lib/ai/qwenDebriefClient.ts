import 'server-only'

import { getQwenApiKey, getQwenDebriefModel } from '@/constants/environments'

import { requestQwenStructuredOutput } from './qwenClientCore'

export function requestQwenDebriefStructuredOutput(input: {
  messages: Array<{
    content: string
    role: 'system' | 'user'
  }>
  schema: Record<string, unknown>
  schemaName: string
}) {
  return requestQwenStructuredOutput({
    apiKey: getQwenApiKey(),
    input: input.messages,
    model: getQwenDebriefModel(),
    schema: input.schema,
    schemaName: input.schemaName,
  })
}
