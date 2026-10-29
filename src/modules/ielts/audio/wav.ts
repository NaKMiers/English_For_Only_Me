/*
 * PCM assembly for listening audio (pure). OpenAI TTS returns raw 24 kHz,
 * 16-bit, mono little-endian PCM per line; lines are joined with short
 * silences (longer when the speaker changes) and wrapped in a WAV header.
 * Line offsets fall out of the sample counts exactly.
 */

export const PCM_SAMPLE_RATE = 24_000
const BYTES_PER_SAMPLE = 2
export const SPEAKER_CHANGE_SILENCE_SEC = 0.4
export const SAME_SPEAKER_SILENCE_SEC = 0.15

export interface PcmLine {
  speaker: string
  pcm: Uint8Array
}

export interface AssembledAudio {
  wav: Buffer
  durationSec: number
  lineOffsetsSec: number[]
}

export function silenceBytes(seconds: number) {
  return new Uint8Array(
    Math.round(seconds * PCM_SAMPLE_RATE) * BYTES_PER_SAMPLE
  )
}

export function wavHeader(dataBytes: number, sampleRate = PCM_SAMPLE_RATE) {
  const header = Buffer.alloc(44)

  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * BYTES_PER_SAMPLE, 28)
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataBytes, 40)

  return header
}

export function assemblePcm(lines: PcmLine[]): AssembledAudio {
  const chunks: Uint8Array[] = []
  const lineOffsetsSec: number[] = []
  let bytes = 0

  lines.forEach((line, index) => {
    if (index > 0) {
      const gap = silenceBytes(
        line.speaker === lines[index - 1].speaker
          ? SAME_SPEAKER_SILENCE_SEC
          : SPEAKER_CHANGE_SILENCE_SEC
      )

      chunks.push(gap)
      bytes += gap.length
    }

    // An odd byte count would shift every later sample; drop the stray byte.
    const pcm =
      line.pcm.length % 2 ? line.pcm.subarray(0, line.pcm.length - 1) : line.pcm

    lineOffsetsSec.push(bytes / BYTES_PER_SAMPLE / PCM_SAMPLE_RATE)
    chunks.push(pcm)
    bytes += pcm.length
  })

  const wav = Buffer.concat([wavHeader(bytes), ...chunks])

  return {
    wav,
    durationSec: bytes / BYTES_PER_SAMPLE / PCM_SAMPLE_RATE,
    lineOffsetsSec,
  }
}
