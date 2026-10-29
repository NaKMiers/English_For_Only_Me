import 'server-only'

import { createHash } from 'node:crypto'

import { getOpenAiApiKey, getOpenAiTtsModel } from '@/constants/environments'
import { synthesizeSpeechPcm } from '@/lib/ai/openAiSpeech'
import { uploadAudioBuffer } from '@/lib/cloudinary/uploadAudio'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'

import {
  ieltsError,
  type IeltsDecision,
} from '../attempts/attemptRouteDecisions'
import { IELTS_GENERATION_LOG_LIMIT, type IeltsSectionKey } from '../constants'
import { toAdminTest, type IeltsAdminTest } from '../tests/testService'
import { toIeltsTestRecord } from '../tests/testRecords'
import { assemblePcm, type PcmLine } from './wav'

const PARALLEL_LINES = 4
const AUDIO_BUDGET_MS = 240_000
const SPEECH_INSTRUCTIONS =
  'Speak naturally at a moderate pace, like a recorded English listening test.'

type LeanDoc = Record<string, unknown>

/**
 * Text-to-speech for one listening part: lines in batches of four, joined
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
    return ieltsError(400, 'Only listening sections have audio.')

  const apiKey = getOpenAiApiKey()

  if (!apiKey) return ieltsError(503, 'Chưa cấu hình OPENAI_API_KEY.')

  const doc = (await IeltsTestModel.findById(testId).lean()) as LeanDoc | null

  if (!doc) return ieltsError(404, 'Test not found.')

  if (doc.status !== 'draft')
    return ieltsError(409, 'Only drafts can be edited.')

  const record = toIeltsTestRecord(doc)
  const section = record.sections.find(item => item.key === key)

  if (!section?.listening?.lines.length)
    return ieltsError(400, 'This part has no script yet.')

  if (section.revision !== revision)
    return ieltsError(409, 'Section vừa được cập nhật ở nơi khác. Tải lại.')

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
          model: getOpenAiTtsModel(),
          signal,
          text: line.text,
          voice: line.voice,
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
      .update(lines.map(line => `${line.voice}:${line.text}`).join('\n'))
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
    model: getOpenAiTtsModel(),
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

  if (!audio) return ieltsError(500, `Không tạo được audio: ${error}`)

  const updated = await IeltsTestModel.findOneAndUpdate(
    {
      _id: testId,
      status: 'draft',
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

  if (!updated)
    return ieltsError(
      409,
      'Section vừa được cập nhật trong lúc tạo audio. Tải lại.'
    )

  return {
    ok: true,
    data: { test: toAdminTest(updated as unknown as LeanDoc) },
  }
}
