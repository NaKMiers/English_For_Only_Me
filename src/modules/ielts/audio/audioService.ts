import 'server-only'

import { createHash } from 'node:crypto'

import { getQwenApiKey, getQwenTtsModel } from '@/constants/environments'
import { synthesizeSpeechPcm } from '@/lib/ai/qwenSpeech'
import { uploadAudioBuffer } from '@/lib/cloudinary/uploadAudio'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'

import {
  ieltsMessageError,
  type IeltsDecision,
} from '../attempts/attemptRouteDecisions'
import {
  IELTS_GENERATION_LOG_LIMIT,
  type IeltsSectionKey,
  qwenVoiceFor,
} from '../constants'
import { adoptSaved, type IeltsAdminTest } from '../tests/testService'
import { toIeltsTestRecord } from '../tests/testRecords'
import { assemblePcm, type PcmLine } from './wav'

// Each line is two requests (synthesize, download). Qwen TTS allows 180 RPM
// but enforces it per second (about 3 rps): four synthesize calls at once were
// refused, so two at a time, and `synthesizeSpeechPcm` retries a refusal.
const PARALLEL_LINES = 2
// Part of the audio hash, so a new TTS provider never reuses old public ids.
const VOICE_PROVIDER = 'qwen'
const AUDIO_BUDGET_MS = 240_000
const SPEECH_INSTRUCTIONS =
  'Speak naturally at a moderate pace, like a recorded English listening test.'

type LeanDoc = Record<string, unknown>

/**
 * Text-to-speech for one listening part: lines in batches of two, joined
 * into one WAV with exact line offsets, uploaded to Cloudinary (served as
 * mp3), then written onto the draft section with its revision guard.
 */
export async function generateSectionAudio({
  fetcher = fetch,
  key,
  revision,
  testId,
}: {
  fetcher?: typeof fetch
  key: IeltsSectionKey
  revision: number
  testId: string
}): Promise<IeltsDecision<{ test: IeltsAdminTest }>> {
  if (!key.startsWith('listening'))
    return ieltsMessageError(400, 'onlyListeningAudio')

  const apiKey = getQwenApiKey()

  if (!apiKey) return ieltsMessageError(503, 'aiNotConfigured')

  const doc = (await IeltsTestModel.findById(testId).lean()) as LeanDoc | null

  if (!doc) return ieltsMessageError(404, 'testNotFound')

  const record = toIeltsTestRecord(doc)
  const section = record.sections.find(item => item.key === key)

  if (!section?.listening?.lines.length)
    return ieltsMessageError(400, 'noScript')

  if (section.revision !== revision)
    return ieltsMessageError(409, 'sectionChanged')

  const signal = AbortSignal.timeout(AUDIO_BUDGET_MS)
  const started = Date.now()
  const lines = section.listening.lines
  const pcm: PcmLine[] = []
  let error = ''

  for (let start = 0; start < lines.length && !error; start += PARALLEL_LINES) {
    const batch = lines.slice(start, start + PARALLEL_LINES)
    const results = await Promise.all(
      batch.map(line =>
        synthesizeSpeechPcm({
          apiKey,
          fetcher,
          instructions: SPEECH_INSTRUCTIONS,
          model: getQwenTtsModel(),
          signal,
          text: line.text,
          voice: qwenVoiceFor(line.voice),
        })
      )
    )

    results.forEach((result, index) => {
      if (!result.ok) error ||= `Line ${start + index}: ${result.message}`
      else pcm.push({ speaker: batch[index].speaker, pcm: result.pcm })
    })
  }

  let audio: {
    url: string
    publicId: string
    durationSec: number
    lineOffsetsSec: number[]
  } | null = null

  if (!error) {
    const assembled = assemblePcm(pcm)
    const hash = createHash('sha1')
      .update(
        lines
          .map(line => `${VOICE_PROVIDER}:${line.voice}:${line.text}`)
          .join('\n')
      )
      .digest('hex')
      .slice(0, 10)

    try {
      const uploaded = await uploadAudioBuffer(assembled.wav, {
        fetcher,
        folder: 'ielts/audio',
        publicId: `${record.slug}-v${record.version}-${key}-${hash}`,
        signal,
      })

      // The mp3 must be reachable before learners are pointed at it.
      const head = await fetcher(uploaded.url, { method: 'HEAD', signal })

      if (!head.ok)
        throw new Error(`The mp3 is not reachable (${head.status}).`)

      audio = {
        url: uploaded.url,
        publicId: uploaded.publicId,
        durationSec: assembled.durationSec,
        lineOffsetsSec: assembled.lineOffsetsSec,
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Audio upload failed.'
    }
  }

  const logRow = {
    at: new Date(),
    sectionKey: key,
    kind: 'audio',
    model: getQwenTtsModel(),
    inputTokens: 0,
    outputTokens: 0,
    durationMs: Date.now() - started,
    outcome: audio ? 'ok' : 'failed',
    failedRules: [],
    error: error.slice(0, 900),
  }

  await IeltsTestModel.updateOne(
    { _id: testId },
    {
      $push: {
        generationLog: { $each: [logRow], $slice: -IELTS_GENERATION_LOG_LIMIT },
      },
    }
  )

  if (!audio) return ieltsMessageError(500, 'audioFailed', { reason: error })

  const updated = await IeltsTestModel.findOneAndUpdate(
    {
      _id: testId,
      sections: { $elemMatch: { key, revision } },
    },
    {
      $set: {
        'sections.$.listening.audio': audio,
        'sections.$.revision': revision + 1,
      },
    },
    { new: true }
  ).lean()

  if (!updated) return ieltsMessageError(409, 'sectionChangedDuringAudio')

  return {
    ok: true,
    data: { test: adoptSaved(updated) },
  }
}
