import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getYouTubeVideoMetadata } from '@/lib/youtube/getYouTubeVideoMetadata'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'
import { parseYouTubeImportRequest } from '@/modules/dictation/services/youtubeImportDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toImportError(error: unknown): ApiErrorDecision {
  // Admin gate (requireAdmin) throws 401/403 — surface as JSON, not a 500.
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 401 || error.status === 403)
  )
    return {
      status: error.status,
      body: {
        message: (error as { message?: string }).message ?? 'Access denied.',
      },
    }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
    return {
      status: 409,
      body: {
        message: 'This YouTube video is already in your dictation library.',
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
      message: 'Could not import this YouTube video.',
    },
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    await requireAdmin()

    const body = await request.json()
    const parsed = parseYouTubeImportRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const metadata = await getYouTubeVideoMetadata(parsed.data.videoId)

    if (metadata.state === 'notFound')
      return jsonError({
        status: 404,
        body: {
          message: metadata.message,
        },
      })

    if (metadata.state === 'failed')
      return jsonError({
        status: 500,
        body: {
          message: metadata.message,
        },
      })

    const ownerId = await getCurrentOwnerId()
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

    await connectDatabase()

    const video = await DictationVideoModel.findOneAndUpdate(
      {
        ownerId,
        youtubeVideoId: parsed.data.videoId,
      },
      {
        $setOnInsert: {
          ownerId,
          sourceType: 'youtube',
          youtubeUrl: parsed.data.normalizedUrl,
          sourceUrl: parsed.data.normalizedUrl,
          youtubeVideoId: parsed.data.videoId,
          status: 'needsTranscript',
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
          defaultLanguage:
            metadata.state === 'ready'
              ? (metadata.metadata.defaultLanguage ?? 'en')
              : 'en',
          importStatus,
          importWarning,
        },
      },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    )

    return NextResponse.json(
      {
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
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toImportError(error))
  }
}
