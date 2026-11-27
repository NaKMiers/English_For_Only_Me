'use client'

import { ImagePlus } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'

import { format } from '@/i18n/format'
import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { uploadTopicThumbnailAction } from '@/modules/dictation/content/adminActions'

function getSafePreviewUrl(url: string | null | undefined) {
  if (!url) return null

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null

    return parsed.toString()
  } catch {
    return null
  }
}

interface Props {
  defaultUrl?: string | null
  title: string
}

export function AdminTopicThumbnailFields({ defaultUrl = null, title }: Props) {
  const t = useMessages()
  const inputRef = useRef<HTMLInputElement>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState(defaultUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const previewUrl = getSafePreviewUrl(thumbnailUrl)

  function upload(file: File | null) {
    if (!file) return

    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('thumbnailFile', file)

      try {
        const result = await uploadTopicThumbnailAction(formData)
        if (!result.ok) {
          setError(result.message)
          return
        }

        setThumbnailUrl(result.url)
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : t.admin.thumbnail.failed
        setError(message)
      } finally {
        if (inputRef.current) inputRef.current.value = ''
      }
    })
  }

  return (
    <div className="grid gap-2">
      <input
        type="hidden"
        name="thumbnailUrl"
        value={thumbnailUrl}
      />
      <button
        type="button"
        aria-label={format(t.admin.thumbnail.upload, { title })}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-line bg-surface group focus-visible:outline-brand rounded-control relative grid size-28 shrink-0 place-items-center overflow-hidden border transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2',
          isPending && 'pointer-events-none opacity-70'
        )}
      >
        {previewUrl ? (
          <span
            aria-hidden="true"
            className="size-full bg-cover bg-center"
            style={{ backgroundImage: `url("${previewUrl}")` }}
          />
        ) : (
          <span className="grid place-items-center p-2 text-center">
            <ImagePlus
              aria-hidden="true"
              className="size-8"
            />
          </span>
        )}
        {isPending && (
          <span className="bg-ink/80 text-surface absolute inset-x-0 bottom-0 px-1 py-1 text-center font-sans text-[10px] font-semibold">
            {t.admin.thumbnail.uploading}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={event => upload(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
      {error && (
        <p className="text-danger max-w-28 text-xs font-semibold">{error}</p>
      )}
    </div>
  )
}
