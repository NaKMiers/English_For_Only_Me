import { z } from 'zod'

import type { DictationTranscriptSourceType } from '@/modules/dictation/types'

export const transcriptPayloadSchema = z
  .object({
    videoId: z
      .string()
      .trim()
      .regex(
        /^[a-f\d]{24}$/i,
        'Select a saved video before adding transcript.'
      ),
    language: z.string().trim().min(2).max(12).optional().default('en'),
    // 'primary' is the English source that drives segments; 'translation' is an
    // alternate-language caption track shown during practice.
    role: z.enum(['primary', 'translation']).optional().default('primary'),
    sourceType: z
      .enum(['manualText', 'manualTimedText', 'captionFile'])
      .optional(),
    rawText: z
      .string()
      .trim()
      .min(20, 'Paste at least 20 characters of transcript text.')
      .max(500_000, 'Transcript text is too long for this import step.'),
  })
  .strict()

export type TranscriptPayload = z.infer<typeof transcriptPayloadSchema>

export type TranscriptPayloadSourceType = Extract<
  DictationTranscriptSourceType,
  'manualText' | 'manualTimedText' | 'captionFile'
>
