'use client'

import { Languages } from 'lucide-react'
import { useEffect, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DictationTranslationApiRecord } from '@/modules/dictation/types'
import { getDictationTranslationApi } from '@/requests/dictationTranslationsApi'

interface Props {
  className?: string
  isUnlocked: boolean
  segmentId: string | null
  targetLanguage?: string
}

type TranslationState =
  | {
      error: string
      requestKey: string
      status: 'error'
      translation: null
    }
  | {
      error: null
      requestKey: string | null
      status: 'idle'
      translation: null
    }
  | {
      error: null
      requestKey: string
      status: 'ready'
      translation: DictationTranslationApiRecord
    }

function getTranslationMessage(translation: DictationTranslationApiRecord) {
  if (translation.status === 'ready') return translation.text

  return (
    translation.unavailableReason ??
    'Translation is unavailable right now, but practice can continue.'
  )
}

export function DictationTranslation({
  className,
  isUnlocked,
  segmentId,
  targetLanguage = 'vi',
}: Props) {
  const [state, setState] = useState<TranslationState>({
    error: null,
    requestKey: null,
    status: 'idle',
    translation: null,
  })
  const requestKey =
    isUnlocked && segmentId ? `${segmentId}:${targetLanguage}` : null

  useEffect(() => {
    if (!requestKey || !segmentId) return

    let isMounted = true

    getDictationTranslationApi({
      segmentId,
      targetLanguage,
    })
      .then(response => {
        if (!isMounted) return

        setState({
          error: null,
          requestKey,
          status: 'ready',
          translation: response.translation,
        })
      })
      .catch(error => {
        if (!isMounted) return

        setState({
          error:
            error instanceof Error
              ? error.message
              : 'Translation is unavailable right now.',
          requestKey,
          status: 'error',
          translation: null,
        })
      })

    return () => {
      isMounted = false
    }
  }, [requestKey, segmentId, targetLanguage])

  if (!requestKey) return null

  const currentTranslation =
    state.requestKey === requestKey ? state.translation : null
  const currentError =
    state.requestKey === requestKey && state.status === 'error'
      ? state.error
      : null
  const isLoading = !currentTranslation && !currentError

  return (
    <MangaPanel
      eyebrow="After effort"
      title="Translation"
      className={className}
      action={
        <Badge
          className="border-manga-black bg-manga-pale-red text-manga-black rounded-none border-2 font-black"
          variant="outline"
        >
          Vietnamese
        </Badge>
      }
    >
      <div
        role="status"
        className={cn(
          'border-manga-black bg-manga-paper-soft flex items-start gap-3 border-2 p-3 text-base leading-7 font-semibold shadow-[3px_3px_0_var(--manga-black)]',
          currentTranslation?.status === 'ready' && 'bg-white',
          (currentError || currentTranslation?.status === 'failed') &&
            'bg-manga-pale-red'
        )}
      >
        <Languages
          aria-hidden="true"
          className="text-manga-red mt-1 size-5 shrink-0"
        />
        <span className="min-w-0 wrap-break-word">
          {isLoading
            ? 'Loading translation...'
            : currentError
              ? currentError
              : currentTranslation
                ? getTranslationMessage(currentTranslation)
                : 'Translation is ready after this segment is completed.'}
        </span>
      </div>
    </MangaPanel>
  )
}
