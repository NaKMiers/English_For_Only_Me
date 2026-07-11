import 'server-only'

import { createHash } from 'node:crypto'

import { getCloudinaryUrl } from '@/constants/environments'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const IMAGE_MIME_PREFIX = 'image/'

interface CloudinaryConfig {
  apiKey: string
  apiSecret: string
  cloudName: string
}

interface CloudinaryUploadResponse {
  secure_url: string
}

function parseCloudinaryUrl(rawUrl: string): CloudinaryConfig {
  const url = new URL(rawUrl)

  if (url.protocol !== 'cloudinary:')
    throw new Error('CLOUDINARY_URL must use the cloudinary:// protocol')

  return {
    apiKey: decodeURIComponent(url.username),
    apiSecret: decodeURIComponent(url.password),
    cloudName: url.hostname,
  }
}

function createSignature(
  params: Record<string, string>,
  apiSecret: string
): string {
  const payload = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

function isUploadResponse(value: unknown): value is CloudinaryUploadResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'secure_url' in value &&
    typeof value.secure_url === 'string'
  )
}

export function getImageFile(formData: FormData, key: string): File | null {
  const value = formData.get(key)
  if (!(value instanceof File) || value.size === 0) return null

  return value
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  if (!file.type.startsWith(IMAGE_MIME_PREFIX))
    throw new Error('Please upload an image file.')
  if (file.size > MAX_IMAGE_SIZE_BYTES)
    throw new Error('Topic thumbnail image must be 5MB or smaller.')

  const config = parseCloudinaryUrl(getCloudinaryUrl())
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signedParams = {
    folder: 'english-for-only-me/topic-thumbnails',
    timestamp,
  }
  const signature = createSignature(signedParams, config.apiSecret)

  const uploadFormData = new FormData()
  uploadFormData.set('file', file)
  uploadFormData.set('api_key', config.apiKey)
  uploadFormData.set('folder', signedParams.folder)
  uploadFormData.set('timestamp', timestamp)
  uploadFormData.set('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: 'POST',
      body: uploadFormData,
    }
  )
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok || !isUploadResponse(payload))
    throw new Error('Cloudinary image upload failed.')

  return payload.secure_url
}
