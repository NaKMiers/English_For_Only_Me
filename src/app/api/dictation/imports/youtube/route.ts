import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { authErrorResponse } from '@/lib/auth/authErrorMessage'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { revalidateDictationCatalog } from '@/lib/db/revalidateCatalog'
import { getYouTubeVideoMetadata } from '@/lib/youtube/getYouTubeVideoMetadata'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'
import { parseYouTubeImportRequest } from '@/modules/dictation/services/youtubeImportDecisions'
import { DEFAULT_DICTATION_LANGUAGE } from '@/modules/dictation/translations/languages'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toImportError(error: unknown, messages: Messages): ApiErrorDecision {
  const t = messages.admin.api

  // Admin gate (requireAdmin) throws 401/403 - surface as JSON, not a 500.
  const auth = authErrorResponse(error, messages)

  if (auth) return { status: auth.status, body: { message: auth.message } }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
    return {
      status: 409,
      body: {
        message: t.alreadyImported,
      },
    }

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to import YouTube dictation video', error)

  return {
    status: 500,
    body: {
      message: t.importFailed,
    },
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const messages = await getMessages()
  const t = messages.admin.api

  try {
    await requireAdmin()

    const body = await request.json()
    const parsed = parseYouTubeImportRequest(body)

    if (!parsed.ok)
      return jsonError({
        status: parsed.status,
        body: { message: t[parsed.code] },
      })

    await connectDatabase()

    const existingVideo = await DictationVideoModel.findOne({
      $or: [
        { youtubeVideoId: parsed.data.videoId },
        { youtubeUrl: parsed.data.normalizedUrl },
        { youtubeUrl: parsed.data.youtubeUrl },
        { sourceUrl: parsed.data.normalizedUrl },
        { sourceUrl: parsed.data.youtubeUrl },
      ],
    })

    if (existingVideo)
      return NextResponse.json({
        alreadyExists: true,
        video: toDictationVideoRecord(existingVideo.toObject()),
        warning: null,
      })

    const metadata = await getYouTubeVideoMetadata(parsed.data.videoId)

    if (metadata.state === 'notFound')
      return jsonError({
        status: 404,
        body: {
          message: t.videoNotFound,
        },
      })

    if (metadata.state === 'failed') {
      console.error('YouTube metadata failed', metadata.message)

      return jsonError({
        status: 500,
        body: {
          message: t.metadataFailed,
        },
      })
    }

    const importWarning =
      metadata.state === 'apiKeyMissing' ? metadata.warning : metadata.warning
    const importStatus =
      metadata.state === 'apiKeyMissing'
        ? 'metadataWarning'
        : metadata.metadata.embeddable === false
          ? 'metadataReadyEmbedBlocked'
          : 'metadataReady'
    const videoTitle =
      metadata.state === 'apiKeyMissing'
        ? `YouTube video ${parsed.data.videoId}`
        : metadata.metadata.title

    const video = await DictationVideoModel.findOneAndUpdate(
      {
        youtubeVideoId: parsed.data.videoId,
      },
      {
        $setOnInsert: {
          sourceType: 'youtube',
          youtubeUrl: parsed.data.normalizedUrl,
          sourceUrl: parsed.data.normalizedUrl,
          youtubeVideoId: parsed.data.videoId,
          transcriptStatus: 'manualNeeded',
        },
        $set: {
          title: videoTitle,
          channelTitle:
            metadata.state === 'ready' ? metadata.metadata.channelTitle : null,
          durationSeconds:
            metadata.state === 'ready'
              ? metadata.metadata.durationSeconds
              : null,
          thumbnailUrl:
            metadata.state === 'ready' ? metadata.metadata.thumbnailUrl : null,
          defaultLanguage: DEFAULT_DICTATION_LANGUAGE,
          status: 'needsTranscript',
          importStatus,
          importWarning,
        },
      },
      {
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        upsert: true,
      }
    )

    revalidateDictationCatalog()

    return NextResponse.json(
      {
        alreadyExists: false,
        video: toDictationVideoRecord(video.toObject()),
        warning: importWarning,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: t.invalidJson,
        },
      })

    return jsonError(toImportError(error, messages))
  }
}
