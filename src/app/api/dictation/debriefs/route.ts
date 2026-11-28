import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getLocale, getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { generateDictationDebriefForUser } from '@/modules/dictation/ai/debriefService'
import { parseDebriefPayload } from '@/modules/dictation/ai/debriefDecisions'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import {
  getAccessErrorMessage,
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toDebriefError(error: unknown, t: Messages): ApiErrorDecision {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 401 || error.status === 403 || error.status === 409)
  )
    return {
      status: error.status,
      body: {
        message: getAccessErrorMessage(error.status, t),
      },
    }

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to generate dictation debrief', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.debriefFailed,
    },
  }
}

export async function POST(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseDebriefPayload(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const result = await generateDictationDebriefForUser({
      // The app language is the default; the learner's notes can ask for
      // another one.
      language: await getLocale(),
      notes: parsed.data.notes,
      userId: actor.id,
      videoId: parsed.data.videoId,
    })

    // The service's reasons are English developer text: say each status in
    // the learner's language instead.
    if (!result.ok)
      return jsonError({
        status: result.status,
        body: {
          message:
            result.status === 404
              ? t.dictation.api.videoNotFound
              : result.status === 409
                ? t.dictation.api.debriefIncomplete
                : t.dictation.api.debriefUnavailable,
        },
      })

    return NextResponse.json({
      debrief: result.debrief,
      mode: result.mode,
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: t.dictation.api.invalidJson,
        },
      })

    return jsonError(toDebriefError(error, t))
  }
}
