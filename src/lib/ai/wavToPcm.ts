/*
 * Pull the raw samples out of a PCM WAV file (pure). Only 16-bit mono at the
 * expected rate is accepted, because listening audio joins lines byte by byte
 * and any other format would play at the wrong speed or as noise.
 */

type WavResult = { ok: true; pcm: Uint8Array } | { ok: false; message: string }

function ascii(bytes: Uint8Array, offset: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4))
}

export function wavToPcm(bytes: Uint8Array, sampleRate: number): WavResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  if (
    bytes.length < 12 ||
    ascii(bytes, 0) !== 'RIFF' ||
    ascii(bytes, 8) !== 'WAVE'
  )
    return { ok: false, message: 'Speech audio is not a WAV file.' }

  let offset = 12
  let formatOk = false

  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset)
    const size = view.getUint32(offset + 4, true)
    const start = offset + 8

    if (id === 'fmt ') {
      if (start + 16 > bytes.length) break

      formatOk =
        view.getUint16(start, true) === 1 &&
        view.getUint16(start + 2, true) === 1 &&
        view.getUint32(start + 4, true) === sampleRate &&
        view.getUint16(start + 14, true) === 16

      if (!formatOk)
        return {
          ok: false,
          message: `Speech audio is not 16-bit mono PCM at ${sampleRate} Hz.`,
        }
    }

    if (id === 'data') {
      if (!formatOk)
        return { ok: false, message: 'Speech audio has no format chunk.' }

      // Streamed WAVs may carry a placeholder size; read to the end then.
      return {
        ok: true,
        pcm: bytes.subarray(start, Math.min(start + size, bytes.length)),
      }
    }

    // Chunks are padded to an even length.
    offset = start + size + (size % 2)
  }

  return { ok: false, message: 'Speech audio has no data chunk.' }
}
