import 'server-only'

import { createSignature, getCloudinaryConfig } from './cloudinaryConfig'

export interface CloudinaryAudioUpload {
  url: string
  publicId: string
  durationSec: number
}

interface UploadResponse {
  secure_url?: string
  public_id?: string
  duration?: number
  eager?: { secure_url?: string; format?: string }[]
  error?: { message?: string }
}

/**
 * Server-to-Cloudinary upload of a generated WAV. Cloudinary stores audio as
 * `resource_type: video`; an eager mp3 is created synchronously and its URL
 * is what learners stream (WAV is ~10x larger).
 */
export async function uploadAudioBuffer(
  buffer: Buffer,
  {
    fetcher = fetch,
    folder,
    publicId,
    signal,
  }: {
    fetcher?: typeof fetch
    folder: string
    publicId: string
    signal?: AbortSignal
  }
): Promise<CloudinaryAudioUpload> {
  const config = getCloudinaryConfig()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signed = {
    eager: 'f_mp3',
    eager_async: 'false',
    folder,
    overwrite: 'true',
    public_id: publicId,
    timestamp,
  }
  const form = new FormData()

  form.set(
    'file',
    new Blob([new Uint8Array(buffer)], { type: 'audio/wav' }),
    `${publicId}.wav`
  )

  for (const [key, value] of Object.entries(signed)) form.set(key, value)

  form.set('api_key', config.apiKey)
  form.set('signature', createSignature(signed, config.apiSecret))

  const response = await fetcher(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
    { method: 'POST', body: form, signal }
  )
  const payload = (await response.json().catch(() => ({}))) as UploadResponse

  if (!response.ok || !payload.public_id)
    throw new Error(
      payload.error?.message ??
        `Cloudinary audio upload failed (${response.status}).`
    )

  const mp3 = payload.eager?.find(item => item.secure_url)?.secure_url

  if (!mp3) throw new Error('Cloudinary did not return the mp3 version.')

  return {
    url: mp3,
    publicId: payload.public_id,
    durationSec: Number(payload.duration ?? 0),
  }
}

export type SignedUploadKind = 'audio' | 'image'

/**
 * Parameters for a browser-to-Cloudinary upload (admin only): scoped to the
 * `ielts/` folder, resource type from the kind, short-lived timestamp.
 */
export function createSignedUploadParams(kind: SignedUploadKind) {
  const config = getCloudinaryConfig()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const folder = kind === 'audio' ? 'ielts/audio' : 'ielts/images'
  const signed: Record<string, string> =
    kind === 'audio'
      ? { eager: 'f_mp3', eager_async: 'false', folder, timestamp }
      : { folder, timestamp }

  return {
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    resourceType: kind === 'audio' ? 'video' : 'image',
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${kind === 'audio' ? 'video' : 'image'}/upload`,
    params: { ...signed, signature: createSignature(signed, config.apiSecret) },
  }
}
