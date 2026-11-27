import { describe, expect, test, vi } from 'vitest'

import { normalizeAudioUrl, synthesizeSpeechPcm } from './qwenSpeech'

const AUDIO_URL =
  'http://dashscope-result-sgp.oss-ap-southeast-1.aliyuncs.com/a.wav?Expires=1&amp;Signature=x'

function wavBytes(samples: Uint8Array) {
  const header = Buffer.alloc(44)

  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + samples.length, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(24_000, 24)
  header.writeUInt32LE(48_000, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(samples.length, 40)

  return Buffer.concat([header, samples])
}

function speechFetch({
  audioUrl = AUDIO_URL,
  synthStatus = 200,
}: { audioUrl?: string; synthStatus?: number } = {}) {
  return vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    if (String(url).includes('SpeechSynthesizer'))
      return new Response(
        JSON.stringify(
          synthStatus === 200
            ? { output: { audio: { url: audioUrl } } }
            : { code: 'InvalidParameter', message: 'Bad voice' }
        ),
        { status: synthStatus }
      )

    return new Response(wavBytes(new Uint8Array([7, 8, 9, 10])), {
      status: 200,
    })
  })
}

const REQUEST = {
  apiKey: 'qwen-key',
  baseUrl: 'https://dashscope-intl.aliyuncs.com',
  instructions: 'Speak naturally.',
  model: 'qwen-audio-3.1-tts-flash',
  text: 'Good morning.',
  voice: 'Emily_v3.1',
}

describe('normalizeAudioUrl', () => {
  test('unescapes the query and upgrades to https', () => {
    expect(normalizeAudioUrl(AUDIO_URL)).toBe(
      'https://dashscope-result-sgp.oss-ap-southeast-1.aliyuncs.com/a.wav?Expires=1&Signature=x'
    )
  })

  test('refuses hosts outside Alibaba Cloud and bad URLs', () => {
    expect(normalizeAudioUrl('http://evil.example.test/a.wav')).toBeNull()
    expect(normalizeAudioUrl('http://aliyuncs.com.evil.test/a.wav')).toBeNull()
    expect(normalizeAudioUrl('not a url')).toBeNull()
  })
})

describe('synthesizeSpeechPcm', () => {
  test('fails without a request when the key is missing', async () => {
    const fetcher = speechFetch()
    const result = await synthesizeSpeechPcm({
      ...REQUEST,
      apiKey: null,
      fetcher,
    })

    expect(result.ok).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('synthesizes, downloads the WAV and returns its samples', async () => {
    const fetcher = speechFetch()
    const result = await synthesizeSpeechPcm({ ...REQUEST, fetcher })
    const [url, init] = fetcher.mock.calls[0]
    const body = JSON.parse(String(init?.body)) as {
      input: Record<string, unknown>
      model: string
    }

    expect(String(url)).toBe(
      'https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'
    )
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer qwen-key' })
    expect(body).toEqual({
      model: 'qwen-audio-3.1-tts-flash',
      input: {
        text: 'Good morning.',
        voice: 'Emily_v3.1',
        format: 'wav',
        sample_rate: 24_000,
        instruction: 'Speak naturally.',
      },
    })
    expect(String(fetcher.mock.calls[1][0])).toMatch(/^https:\/\//)
    expect(fetcher.mock.calls[1][1]?.headers).toBeUndefined()
    expect(result).toEqual({ ok: true, pcm: new Uint8Array([7, 8, 9, 10]) })
  })

  test('passes the provider error message through', async () => {
    const result = await synthesizeSpeechPcm({
      ...REQUEST,
      fetcher: speechFetch({ synthStatus: 400 }),
    })

    expect(result).toEqual({ ok: false, message: 'Bad voice' })
  })

  test('refuses an audio URL outside Alibaba Cloud', async () => {
    const fetcher = speechFetch({ audioUrl: 'http://evil.example.test/a.wav' })
    const result = await synthesizeSpeechPcm({ ...REQUEST, fetcher })

    expect(result).toEqual({
      ok: false,
      message: 'Speech provider returned no audio URL.',
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
