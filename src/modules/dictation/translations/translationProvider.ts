import 'server-only'

import {
  getOpenAiApiKey,
  getOpenAiTranslationModel,
} from '@/constants/environments'

import type { SupportedTranslationLanguage } from './languages'
import { translateSegmentTextWithProvider } from './translationProviderCore'

export function translateSegmentText({
  segmentText,
  targetLanguage,
}: {
  segmentText: string
  targetLanguage: SupportedTranslationLanguage
}) {
  return translateSegmentTextWithProvider({
    apiKey: getOpenAiApiKey(),
    model: getOpenAiTranslationModel(),
    segmentText,
    targetLanguage,
  })
}
