import Image from 'next/image'

import { cn } from '@/lib/utils'

interface Props {
  className?: string
  priority?: boolean
  sizes?: string
  thumbnailUrl?: string | null
  title: string
  youtubeVideoId?: string | null
}

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_THUMBNAIL_HOSTS = new Set(['i.ytimg.com', 'img.youtube.com'])

function getSafeThumbnailUrl({
  thumbnailUrl,
  youtubeVideoId,
}: Pick<Props, 'thumbnailUrl' | 'youtubeVideoId'>) {
  if (thumbnailUrl)
    try {
      const url = new URL(thumbnailUrl)

      if (
        url.protocol === 'https:' &&
        YOUTUBE_THUMBNAIL_HOSTS.has(url.hostname)
      )
        return url.toString()
    } catch {
      return null
    }

  if (youtubeVideoId && YOUTUBE_ID_PATTERN.test(youtubeVideoId))
    return `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`

  return null
}

export function DictationVideoThumbnail({
  className,
  priority = false,
  sizes = '(min-width: 1024px) 33vw, 100vw',
  thumbnailUrl,
  title,
  youtubeVideoId,
}: Props) {
  const safeThumbnailUrl = getSafeThumbnailUrl({
    thumbnailUrl,
    youtubeVideoId,
  })

  return (
    <div
      className={cn(
        'border-manga-black bg-manga-paper-soft relative aspect-video w-full overflow-hidden border-2 shadow-[3px_3px_0_var(--manga-black)]',
        className
      )}
    >
      {safeThumbnailUrl ? (
        <Image
          src={safeThumbnailUrl}
          alt={`Thumbnail for ${title}`}
          fill
          priority={priority}
          sizes={sizes}
          unoptimized
          className="object-cover"
        />
      ) : (
        <div className="grid h-full place-items-center p-4 text-center">
          <span className="font-sans text-sm leading-5 font-black tracking-normal uppercase">
            No thumbnail
          </span>
        </div>
      )}
    </div>
  )
}
