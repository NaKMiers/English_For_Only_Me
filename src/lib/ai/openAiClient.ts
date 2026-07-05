import 'server-only'

import {
  getOpenAiApiKey,
  getOpenAiDebriefModel,
} from '@/constants/environments'

import { requestOpenAiStructuredOutput } from './openAiClientCore'

export function requestOpenAiDebriefStructuredOutput(input: {
  messages: Array<{
    content: string
    role: 'system' | 'user'
  }>
  schema: Record<string, unknown>
  schemaName: string
}) {
  return requestOpenAiStructuredOutput({
    apiKey: getOpenAiApiKey(),
    input: input.messages,
    model: getOpenAiDebriefModel(),
    schema: input.schema,
    schemaName: input.schemaName,
  })
}
