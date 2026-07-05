const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export interface ExtractYouTubeIdResult {
  ok: true
  videoId: string
  normalizedUrl: string
}

export interface ExtractYouTubeIdError {
  ok: false
  message: string
}

export type ExtractYouTubeIdResponse =
  ExtractYouTubeIdResult | ExtractYouTubeIdError

function cleanHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, '')
}

function isYouTubeHost(hostname: string) {
  return hostname === 'youtube.com' || hostname.endsWith('.youtube.com')
}

function isYouTubeNoCookieHost(hostname: string) {
  return (
    hostname === 'youtube-nocookie.com' ||
    hostname.endsWith('.youtube-nocookie.com')
  )
}

function normalizeVideoId(candidate: string | null | undefined) {
  if (!candidate) return null

  const [videoId] = candidate.split(/[?&#/]/)

  if (!YOUTUBE_ID_PATTERN.test(videoId)) return null

  return videoId
}

export function extractYouTubeId(input: string): ExtractYouTubeIdResponse {
  let url: URL

  try {
    url = new URL(input.trim())
  } catch {
    return {
      ok: false,
      message: 'Enter a valid YouTube URL.',
    }
  }

  const hostname = cleanHostname(url.hostname)
  let videoId: string | null = null

  if (hostname === 'youtu.be')
    videoId = normalizeVideoId(url.pathname.split('/').filter(Boolean)[0])
  else if (isYouTubeHost(hostname)) {
    if (url.pathname === '/watch')
      videoId = normalizeVideoId(url.searchParams.get('v'))

    const [kind, id] = url.pathname.split('/').filter(Boolean)

    if (kind === 'shorts' || kind === 'embed' || kind === 'live')
      videoId = normalizeVideoId(id)
  } else if (isYouTubeNoCookieHost(hostname)) {
    const [kind, id] = url.pathname.split('/').filter(Boolean)

    if (kind === 'embed') videoId = normalizeVideoId(id)
  }

  if (!videoId)
    return {
      ok: false,
      message:
        'Only YouTube watch, youtu.be, shorts, and embed URLs are supported.',
    }

  return {
    ok: true,
    videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
  }
}
