import 'server-only'

import { Types } from 'mongoose'

import { getIeltsGoal, getOpenAiDebriefModel } from '@/constants/environments'
import { requestOpenAiDebriefStructuredOutput } from '@/lib/ai/openAiClient'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import {
  buildDictationDebriefMessages,
  createDictationDebriefSnapshotHash,
  DICTATION_DEBRIEF_PROMPT_VERSION,
  type DictationDebriefInputSnapshot,
} from '@/modules/dictation/ai/debriefPrompt'
import { getDebriefCompletionBlocker } from '@/modules/dictation/ai/debriefDecisions'
import {
  DICTATION_DEBRIEF_SCHEMA_NAME,
  dictationDebriefJsonSchema,
  parseDictationDebriefJson,
} from '@/modules/dictation/ai/debriefSchema'
import { toDictationDebriefRecord } from '@/modules/dictation/services/dictationDebriefRecords'
import { getVideoStatsForUser } from '@/modules/dictation/stats/videoStatsService'
import type { DictationDebriefApiRecord } from '@/modules/dictation/types'

const TRANSCRIPT_EXCERPT_LIMIT = 4000

export type DictationDebriefServiceResult =
  | {
      debrief: DictationDebriefApiRecord
      mode: 'cache' | 'created'
      ok: true
    }
  | {
      message: string
      ok: false
      status: 404 | 409 | 503
    }

function getTranscriptExcerpt(rawText: string) {
  const normalized = rawText.replace(/\s+/g, ' ').trim()

  if (normalized.length <= TRANSCRIPT_EXCERPT_LIMIT) return normalized

  return `${normalized.slice(0, TRANSCRIPT_EXCERPT_LIMIT)}...`
}

async function buildDebriefSnapshot({
  notes,
  userId,
  videoId,
}: {
  notes: string
  userId: string
  videoId: string
}): Promise<
  | {
      ok: true
      sessionId: string
      snapshot: DictationDebriefInputSnapshot
    }
  | {
      message: string
      ok: false
      status: 404 | 409
    }
> {
  const video = await DictationVideoModel.findOne({
    _id: videoId,
  }).lean()

  if (!video)
    return {
      ok: false,
      status: 404,
      message: 'This dictation video was not found.',
    }

  const completedSession = await DictationSessionModel.findOne({
    userId,
    status: 'completed',
    videoId,
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean()

  const sessionBlocker = getDebriefCompletionBlocker({
    completedSegmentCount: 1,
    hasCompletedSession: Boolean(completedSession),
  })

  if (sessionBlocker)
    return {
      ok: false,
      status: 409,
      message: sessionBlocker,
    }

  if (!completedSession)
    return {
      ok: false,
      status: 409,
      message: 'Complete this video before debriefing.',
    }

  const [stats, transcript] = await Promise.all([
    getVideoStatsForUser({
      userId,
      videoId,
    }),
    video.activeTranscriptId
      ? DictationTranscriptModel.findOne({
          _id: video.activeTranscriptId,
          videoId,
        }).lean()
      : null,
  ])

  const statsBlocker = getDebriefCompletionBlocker({
    completedSegmentCount: stats.completedSegmentCount,
    hasCompletedSession: true,
  })

  if (statsBlocker)
    return {
      ok: false,
      status: 409,
      message: statsBlocker,
    }

  return {
    ok: true,
    sessionId: String(completedSession._id),
    snapshot: {
      hardestSegments: stats.hardestSegments.slice(0, 5),
      ieltsGoal: getIeltsGoal(),
      mistakeTaxonomy: stats.mistakeTaxonomy,
      notes,
      revealCount: stats.revealCount,
      retryCount: stats.retryCount,
      replayCount: stats.replayCount,
      skipCount: stats.skipCount,
      title: video.title,
      topMissedWords: stats.commonMissedWords.slice(0, 8),
      transcriptExcerpt: transcript
        ? getTranscriptExcerpt(transcript.rawText)
        : 'No active transcript text was found.',
    },
  }
}

async function createFailedDebrief({
  failureReason,
  inputSnapshotHash,
  userId,
  rawOutput,
  sessionId,
  videoId,
}: {
  failureReason: string
  inputSnapshotHash: string
  userId: string
  rawOutput: unknown
  sessionId: string
  videoId: string
}) {
  const failedDebrief = await DictationDebriefModel.create({
    caveats: ['AI debrief could not be generated. Keep the stats and retry.'],
    confidence: 0,
    contentSummary: '',
    failureReason,
    inputSnapshotHash,
    keyVocabulary: [],
    listeningTraps: [],
    model: getOpenAiDebriefModel(),
    nextActions: ['Retry the AI debrief after checking provider settings.'],
    userId,
    promptVersion: DICTATION_DEBRIEF_PROMPT_VERSION,
    rawOutput,
    sessionId: new Types.ObjectId(sessionId),
    status: 'failed',
    videoId: new Types.ObjectId(videoId),
    weakPatterns: [],
  })

  return toDictationDebriefRecord(failedDebrief.toObject())
}

export async function generateDictationDebriefForUser({
  notes = '',
  userId,
  videoId,
}: {
  notes?: string
  userId: string
  videoId: string
}): Promise<DictationDebriefServiceResult> {
  const snapshotResult = await buildDebriefSnapshot({
    notes,
    userId,
    videoId,
  })

  if (!snapshotResult.ok) return snapshotResult

  const inputSnapshotHash = createDictationDebriefSnapshotHash(
    snapshotResult.snapshot
  )
  const cachedDebrief = await DictationDebriefModel.findOne({
    inputSnapshotHash,
    userId,
    status: 'ready',
    videoId,
  })
    .sort({ createdAt: -1 })
    .lean()

  if (cachedDebrief)
    return {
      ok: true,
      mode: 'cache',
      debrief: toDictationDebriefRecord(cachedDebrief),
    }

  const providerResult = await requestOpenAiDebriefStructuredOutput({
    messages: buildDictationDebriefMessages(snapshotResult.snapshot),
    schema: dictationDebriefJsonSchema,
    schemaName: DICTATION_DEBRIEF_SCHEMA_NAME,
  })

  if (!providerResult.ok) {
    await createFailedDebrief({
      failureReason: providerResult.message,
      inputSnapshotHash,
      userId,
      rawOutput: null,
      sessionId: snapshotResult.sessionId,
      videoId,
    })

    return {
      ok: false,
      status: 503,
      message: providerResult.message,
    }
  }

  try {
    const parsedOutput = parseDictationDebriefJson(providerResult.text)
    const debrief = await DictationDebriefModel.create({
      ...parsedOutput,
      failureReason: null,
      inputSnapshotHash,
      model: getOpenAiDebriefModel(),
      userId,
      promptVersion: DICTATION_DEBRIEF_PROMPT_VERSION,
      rawOutput: providerResult.rawOutput,
      sessionId: new Types.ObjectId(snapshotResult.sessionId),
      status: 'ready',
      videoId: new Types.ObjectId(videoId),
    })

    return {
      ok: true,
      mode: 'created',
      debrief: toDictationDebriefRecord(debrief.toObject()),
    }
  } catch {
    await createFailedDebrief({
      failureReason: 'AI debrief output did not match the required schema.',
      inputSnapshotHash,
      userId,
      rawOutput: providerResult.rawOutput,
      sessionId: snapshotResult.sessionId,
      videoId,
    })

    return {
      ok: false,
      status: 503,
      message: 'AI debrief output did not match the required schema.',
    }
  }
}
