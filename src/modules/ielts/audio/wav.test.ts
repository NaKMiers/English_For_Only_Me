import { describe, expect, it } from 'vitest'

import {
  assemblePcm,
  PCM_SAMPLE_RATE,
  SAME_SPEAKER_SILENCE_SEC,
  SPEAKER_CHANGE_SILENCE_SEC,
} from './wav'

const seconds = (value: number) => new Uint8Array(value * PCM_SAMPLE_RATE * 2)

describe('assemblePcm', () => {
  it('joins lines with silences and reports exact offsets', () => {
    const audio = assemblePcm([
      { speaker: 'A', pcm: seconds(1) },
      { speaker: 'A', pcm: seconds(2) },
      { speaker: 'B', pcm: seconds(1) },
    ])

    expect(audio.lineOffsetsSec[0]).toBe(0)
    expect(audio.lineOffsetsSec[1]).toBeCloseTo(1 + SAME_SPEAKER_SILENCE_SEC, 6)
    expect(audio.lineOffsetsSec[2]).toBeCloseTo(
      3 + SAME_SPEAKER_SILENCE_SEC + SPEAKER_CHANGE_SILENCE_SEC,
      6
    )
    expect(audio.durationSec).toBeCloseTo(4.55, 6)
  })

  it('writes a valid 16-bit mono WAV header', () => {
    const audio = assemblePcm([{ speaker: 'A', pcm: seconds(1) }])

    expect(audio.wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(audio.wav.toString('ascii', 8, 12)).toBe('WAVE')
    expect(audio.wav.readUInt32LE(24)).toBe(PCM_SAMPLE_RATE)
    expect(audio.wav.readUInt16LE(22)).toBe(1)
    expect(audio.wav.readUInt32LE(40)).toBe(PCM_SAMPLE_RATE * 2)
    expect(audio.wav.length).toBe(44 + PCM_SAMPLE_RATE * 2)
  })

  it('drops a stray odd byte so later samples stay aligned', () => {
    const audio = assemblePcm([
      { speaker: 'A', pcm: new Uint8Array(3) },
      { speaker: 'A', pcm: new Uint8Array(2) },
    ])

    expect(audio.wav.readUInt32LE(40) % 2).toBe(0)
  })
})
