'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ListChecks } from 'lucide-react'

import { MangaButton } from '@/components/ui/MangaButton'
import { buildDictationSegmentsApi } from '@/requests/dictationSegmentsApi'

interface Props {
  transcriptId: string
}

export function DictationBuildSegmentsButton({ transcriptId }: Props) {
  const router = useRouter()
  const [isBuilding, setIsBuilding] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleBuildSegments() {
    setIsBuilding(true)
    setErrorMessage(null)

    try {
      await buildDictationSegmentsApi(transcriptId)
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not build sentence segments.'
      )
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <div className="grid gap-3">
      <MangaButton
        type="button"
        disabled={isBuilding}
        icon={
          <ListChecks
            aria-hidden="true"
            className="size-5"
          />
        }
        onClick={handleBuildSegments}
      >
        {isBuilding ? 'Building Segments' : 'Build Segments'}
      </MangaButton>
      {errorMessage ? (
        <p
          role="alert"
          className="text-manga-red text-sm leading-6 font-black"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
