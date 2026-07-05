import {
  getTranslationLanguageLabel,
  type SupportedTranslationLanguage,
} from './languages'

export interface TranslationProviderResult {
  provider: 'none' | 'openai'
  status: 'failed' | 'ready'
  text: string
  unavailableReason: string | null
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

function getUnavailableTranslation(reason: string): TranslationProviderResult {
  return {
    provider: 'none',
    status: 'failed',
    text: '',
    unavailableReason: reason,
  }
}

export async function translateSegmentTextWithProvider({
  apiKey,
  fetcher = fetch,
  model,
  segmentText,
  targetLanguage,
}: {
  apiKey: string | null
  fetcher?: typeof fetch
  model: string
  segmentText: string
  targetLanguage: SupportedTranslationLanguage
}): Promise<TranslationProviderResult> {
  if (!apiKey)
    return getUnavailableTranslation('Translation provider is not configured.')

  try {
    const response = await fetcher(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'Translate the user text only. Do not add explanations, notes, or markdown.',
            },
            {
              role: 'user',
              content: `Target language: ${getTranslationLanguageLabel(targetLanguage)}\n\nText:\n${segmentText}`,
            },
          ],
          temperature: 0,
        }),
        cache: 'no-store',
      }
    )

    if (!response.ok)
      return getUnavailableTranslation('Translation provider request failed.')

    const body = (await response.json()) as OpenAiChatResponse
    const text = body.choices?.[0]?.message?.content?.trim() ?? ''

    if (!text)
      return getUnavailableTranslation('Translation provider returned no text.')

    return {
      provider: 'openai',
      status: 'ready',
      text,
      unavailableReason: null,
    }
  } catch {
    return getUnavailableTranslation('Translation provider is unavailable.')
  }
}
