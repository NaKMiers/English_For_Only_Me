/**
 * OpenAI text-to-speech returning raw PCM (24 kHz, 16-bit, mono, little
 * endian), so lines can be joined without decoding. Never throws: failures
 * come back as `{ ok: false }`.
 */
export async function synthesizeSpeechPcm({
  apiKey,
  fetcher = fetch,
  instructions,
  model,
  signal,
  text,
  voice,
}: {
  apiKey: string | null
  fetcher?: typeof fetch
  instructions?: string
  model: string
  signal?: AbortSignal
  text: string
  voice: string
}): Promise<{ ok: true; pcm: Uint8Array } | { ok: false; message: string }> {
  if (!apiKey)
    return { ok: false, message: 'OpenAI provider is not configured.' }

  try {
    const response = await fetcher('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: 'pcm',
        ...(instructions ? { instructions } : {}),
      }),
      cache: 'no-store',
      signal,
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string }
      }

      return {
        ok: false,
        message:
          body.error?.message ?? `Speech request failed (${response.status}).`,
      }
    }

    return { ok: true, pcm: new Uint8Array(await response.arrayBuffer()) }
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
