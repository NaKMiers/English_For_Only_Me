import { getQwenHost } from '@/constants/environments'

import { wavToPcm } from './wavToPcm'

/*
 * Qwen text-to-speech (DashScope SpeechSynthesizer) returning raw PCM
 * (24 kHz, 16-bit, mono, little endian), so lines can be joined without
 * decoding. The API answers with a short-lived audio URL, not inline audio,
 * so each line is two requests: synthesize, then download the WAV.
 */

export const SPEECH_SAMPLE_RATE = 24_000

/** The audio URL must point at Alibaba Cloud storage, never anywhere else. */
const AUDIO_HOST_SUFFIX = '.aliyuncs.com'

/**
 * Waits before each retry of a rate-limited synthesize request. The workspace
 * quota (180 RPM) is enforced per second, so a burst can be refused even
 * when the minute total is far below the limit.
 */
const RATE_LIMIT_RETRY_DELAYS_MS = [1_000, 2_000, 4_000]

type SpeechResult =
  { ok: true; pcm: Uint8Array } | { ok: false; message: string }

interface SynthesizerBody {
  code?: string
  message?: string
  output?: {
    audio?: {
      url?: string
    }
  }
}

/** The URL comes back http with `&amp;` escaped; fix both and check the host. */
export function normalizeAudioUrl(raw: string) {
  try {
    const url = new URL(raw.replaceAll('&amp;', '&'))

    if (!url.hostname.endsWith(AUDIO_HOST_SUFFIX)) return null

    url.protocol = 'https:'

    return url.toString()
  } catch {
    return null
  }
}

function isRateLimited(status: number, body: SynthesizerBody) {
  return status === 429 || (body.code ?? '').startsWith('Throttling')
}

/** Resolves after `ms`, or rejects with the abort reason (a timeout). */
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function synthesizeSpeechPcm({
  apiKey,
  baseUrl = getQwenHost(),
  fetcher = fetch,
  instructions,
  model,
  retryDelaysMs = RATE_LIMIT_RETRY_DELAYS_MS,
  signal,
  text,
  voice,
}: {
  apiKey: string | null
  /** DashScope origin, no trailing slash. */
  baseUrl?: string
  fetcher?: typeof fetch
  instructions?: string
  model: string
  /** One wait per retry of a rate-limited request; empty means no retry. */
  retryDelaysMs?: readonly number[]
  signal?: AbortSignal
  text: string
  voice: string
}): Promise<SpeechResult> {
  if (!apiKey) return { ok: false, message: 'AI provider is not configured.' }

  const synthesize = async () => {
    const response = await fetcher(
      `${baseUrl}/api/v1/services/audio/tts/SpeechSynthesizer`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: {
            text,
            voice,
            format: 'wav',
            sample_rate: SPEECH_SAMPLE_RATE,
            ...(instructions ? { instruction: instructions } : {}),
          },
        }),
        cache: 'no-store',
        signal,
      }
    )
    const body = (await response.json().catch(() => ({}))) as SynthesizerBody

    return { body, response }
  }

  try {
    let { body, response } = await synthesize()

    for (const delay of retryDelaysMs) {
      if (response.ok || !isRateLimited(response.status, body)) break

      await wait(delay, signal)
      ;({ body, response } = await synthesize())
    }

    if (!response.ok)
      return {
        ok: false,
        message: body.message ?? `Speech request failed (${response.status}).`,
      }

    const audioUrl = body.output?.audio?.url
      ? normalizeAudioUrl(body.output.audio.url)
      : null

    if (!audioUrl)
      return { ok: false, message: 'Speech provider returned no audio URL.' }

    const audio = await fetcher(audioUrl, { cache: 'no-store', signal })

    if (!audio.ok)
      return {
        ok: false,
        message: `Speech download failed (${audio.status}).`,
      }

    const pcm = wavToPcm(
      new Uint8Array(await audio.arrayBuffer()),
      SPEECH_SAMPLE_RATE
    )

    return pcm.ok ? { ok: true, pcm: pcm.pcm } : pcm
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && error.name === 'TimeoutError'
          ? 'Speech request timed out.'
          : 'Speech provider is unavailable.',
    }
  }
}
