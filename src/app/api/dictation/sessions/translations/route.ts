import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { loadTranslationTrack } from '@/modules/dictation/practice/practiceTranslations'
import { parseTranslationTrackRequest } from '@/modules/dictation/practice/translationTrackRequest'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/**
 * GET /api/dictation/sessions/translations?videoId=&language=
 *
 * The practice page ships only the language it opens with; this returns
 * another language's caption cues and per-segment overrides when the learner
 * switches. Public content like the practice page itself, so no actor needed.
 */
export async function GET(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseTranslationTrackRequest(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    await connectDatabase()

    const video = await DictationVideoModel.findOne({
      _id: parsed.data.videoId,
      status: { $ne: 'archived' },
    })
      .select('activeTranscriptId defaultLanguage')
      .lean()
    const track = video?.activeTranscriptId
      ? await loadTranslationTrack({
          defaultLanguage: video.defaultLanguage,
          language: parsed.data.language,
          transcriptId: String(video.activeTranscriptId),
          videoId: parsed.data.videoId,
        })
      : null

    if (!track)
      return jsonError({
        status: 404,
        body: { message: 'This translation was not found.' },
      })

    return NextResponse.json({ track })
  } catch (error) {
    if (error instanceof MissingEnvironmentError)
      return jsonError({
        status: 500,
        body: { message: MISSING_MONGODB_MESSAGE },
      })

    console.error('Failed to load dictation translation', error)

    return jsonError({
      status: 500,
      body: { message: 'Could not load this translation.' },
    })
  }
}
