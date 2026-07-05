import { z } from 'zod'

export const youtubeImportPayloadSchema = z
  .object({
    youtubeUrl: z
      .string()
      .trim()
      .url('Enter a valid YouTube URL.')
      .max(2048, 'YouTube URL is too long.'),
  })
  .strict()

export type YouTubeImportPayload = z.infer<typeof youtubeImportPayloadSchema>
