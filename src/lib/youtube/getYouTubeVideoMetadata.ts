import { getYoutubeApiKey } from '@/constants/environments'

export interface YouTubeVideoMetadata {
  title: string
  channelTitle: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
  defaultLanguage: string | null
  embeddable: boolean | null
}

export type YouTubeVideoMetadataResult =
  | {
      state: 'apiKeyMissing'
      warning: string
    }
  | {
      state: 'ready'
      metadata: YouTubeVideoMetadata
      warning: string | null
    }
  | {
      state: 'notFound'
      message: string
    }
  | {
      state: 'failed'
      message: string
    }

interface FetchLikeResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

type FetchLike = (
  input: string,
  init?: RequestInit
) => Promise<FetchLikeResponse>

function getStringField(source: unknown, key: string) {
  if (!source || typeof source !== 'object') return null

  const value = (source as Record<string, unknown>)[key]

  return typeof value === 'string' ? value : null
}

function getBooleanField(source: unknown, key: string) {
  if (!source || typeof source !== 'object') return null

  const value = (source as Record<string, unknown>)[key]

  return typeof value === 'boolean' ? value : null
}

function getNestedObject(source: unknown, key: string) {
  if (!source || typeof source !== 'object') return null

  const value = (source as Record<string, unknown>)[key]

  return value && typeof value === 'object' ? value : null
}

export function parseIso8601DurationSeconds(duration: string | null) {
  if (!duration) return null

  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  )

  if (!match) return null

  const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = match

  return (
    Number(days) * 86400 +
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds)
  )
}

export function mapYouTubeVideosListResponse(
  body: unknown
): YouTubeVideoMetadataResult {
  if (!body || typeof body !== 'object')
    return {
      state: 'failed',
      message: 'YouTube returned an unreadable metadata response.',
    }

  const items = (body as Record<string, unknown>).items

  if (!Array.isArray(items) || items.length === 0)
    return {
      state: 'notFound',
      message: 'This YouTube video was not found or is unavailable.',
    }

  const item = items[0]
  const snippet = getNestedObject(item, 'snippet')
  const contentDetails = getNestedObject(item, 'contentDetails')
  const status = getNestedObject(item, 'status')
  const thumbnails = getNestedObject(snippet, 'thumbnails')
  const highThumbnail = getNestedObject(thumbnails, 'high')
  const mediumThumbnail = getNestedObject(thumbnails, 'medium')
  const defaultThumbnail = getNestedObject(thumbnails, 'default')
  const thumbnailUrl =
    getStringField(highThumbnail, 'url') ??
    getStringField(mediumThumbnail, 'url') ??
    getStringField(defaultThumbnail, 'url')
  const title = getStringField(snippet, 'title')

  if (!title)
    return {
      state: 'failed',
      message: 'YouTube metadata did not include a title.',
    }

  const embeddable = getBooleanField(status, 'embeddable')
  const warning =
    embeddable === false
      ? 'YouTube says this video is not embeddable. It can be saved, but practice replay may need a fallback.'
      : null

  return {
    state: 'ready',
    metadata: {
      title,
      channelTitle: getStringField(snippet, 'channelTitle'),
      durationSeconds: parseIso8601DurationSeconds(
        getStringField(contentDetails, 'duration')
      ),
      thumbnailUrl,
      defaultLanguage:
        getStringField(snippet, 'defaultAudioLanguage') ??
        getStringField(snippet, 'defaultLanguage'),
      embeddable,
    },
    warning,
  }
}

export async function getYouTubeVideoMetadata(
  videoId: string,
  fetcher: FetchLike = fetch
): Promise<YouTubeVideoMetadataResult> {
  const apiKey = getYoutubeApiKey()

  if (!apiKey)
    return {
      state: 'apiKeyMissing',
      warning:
        'YOUTUBE_API_KEY is not configured. The video was saved as a URL-only draft, and you can add a transcript manually.',
    }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos')

  url.searchParams.set('part', 'snippet,contentDetails,status')
  url.searchParams.set('id', videoId)
  url.searchParams.set('key', apiKey)

  try {
    const response = await fetcher(url.toString(), {
      cache: 'no-store',
    })
    const body = await response.json()

    if (!response.ok)
      return {
        state: response.status === 404 ? 'notFound' : 'failed',
        message:
          response.status === 404
            ? 'This YouTube video was not found or is unavailable.'
            : 'YouTube metadata lookup failed.',
      }

    return mapYouTubeVideosListResponse(body)
  } catch (error) {
    console.error('YouTube metadata lookup failed', error)

    return {
      state: 'failed',
      message: 'Could not reach YouTube metadata service.',
    }
  }
}
