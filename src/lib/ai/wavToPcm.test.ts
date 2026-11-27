import { describe, expect, it } from 'vitest'

import { wavToPcm } from './wavToPcm'

function chunk(id: string, payload: Uint8Array) {
  const header = Buffer.alloc(8)

  header.write(id, 0, 'ascii')
  header.writeUInt32LE(payload.length, 4)

  const pad = payload.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)

  return Buffer.concat([header, payload, pad])
}

function fmt({ channels = 1, rate = 24_000, bits = 16, format = 1 } = {}) {
  const body = Buffer.alloc(16)

  body.writeUInt16LE(format, 0)
  body.writeUInt16LE(channels, 2)
  body.writeUInt32LE(rate, 4)
  body.writeUInt32LE((rate * channels * bits) / 8, 8)
  body.writeUInt16LE((channels * bits) / 8, 12)
  body.writeUInt16LE(bits, 14)

  return chunk('fmt ', body)
}

function wav(...chunks: Buffer[]) {
  const body = Buffer.concat([Buffer.from('WAVE', 'ascii'), ...chunks])
  const header = Buffer.alloc(8)

  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(body.length, 4)

  return new Uint8Array(Buffer.concat([header, body]))
}

const samples = new Uint8Array([1, 2, 3, 4, 5, 6])

describe('wavToPcm', () => {
  it('returns the data chunk of a 24 kHz 16-bit mono WAV', () => {
    expect(wavToPcm(wav(fmt(), chunk('data', samples)), 24_000)).toEqual({
      ok: true,
      pcm: samples,
    })
  })

  it('skips unknown chunks, including odd-sized ones', () => {
    const result = wavToPcm(
      wav(fmt(), chunk('LIST', new Uint8Array(3)), chunk('data', samples)),
      24_000
    )

    expect(result).toEqual({ ok: true, pcm: samples })
  })

  it('reads to the end when the data size is a placeholder', () => {
    const bytes = wav(fmt(), chunk('data', samples))
    const view = new DataView(bytes.buffer)

    view.setUint32(bytes.length - samples.length - 4, 0xffffffff, true)

    expect(wavToPcm(bytes, 24_000)).toEqual({ ok: true, pcm: samples })
  })

  it('rejects another rate, stereo, or non-PCM audio', () => {
    for (const options of [
      { rate: 22_050 },
      { channels: 2 },
      { format: 3, bits: 32 },
    ])
      expect(
        wavToPcm(wav(fmt(options), chunk('data', samples)), 24_000).ok
      ).toBe(false)
  })

  it('rejects files that are not WAV or have no data', () => {
    expect(wavToPcm(new Uint8Array([1, 2, 3]), 24_000).ok).toBe(false)
    expect(wavToPcm(wav(fmt()), 24_000).ok).toBe(false)
    expect(wavToPcm(wav(chunk('data', samples)), 24_000).ok).toBe(false)
  })
})
