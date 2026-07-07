'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { MangaButton } from '@/components/ui/MangaButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { archiveDictationVideoApi } from '@/requests/dictationVideosApi'

interface Props {
  title: string
  videoId: string
}

export function DictationDeleteVideoButton({ title, videoId }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      await archiveDictationVideoApi(videoId)
      setIsOpen(false)
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not delete this video.'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <MangaButton
        type="button"
        tone="paper"
        icon={
          <Trash2
            aria-hidden="true"
            className="size-5"
          />
        }
        onClick={() => setIsOpen(true)}
      >
        Delete
      </MangaButton>

      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent className="border-manga-black bg-manga-white rounded-none border-3 shadow-[6px_6px_0_var(--manga-black)]">
          <DialogHeader>
            <DialogTitle className="font-sans text-xl leading-tight font-black tracking-normal uppercase">
              Delete saved video?
            </DialogTitle>
            <DialogDescription className="text-manga-ink-soft text-base leading-7 font-semibold">
              This hides &quot;{title}&quot; from the dictation library.
              Existing records stay archived on the server.
            </DialogDescription>
          </DialogHeader>

          {errorMessage ? (
            <div
              role="status"
              className="border-manga-black bg-manga-paper-soft border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]"
            >
              {errorMessage}
            </div>
          ) : null}

          <DialogFooter className="bg-manga-paper-soft border-manga-black rounded-none border-t-3">
            <MangaButton
              type="button"
              tone="paper"
              disabled={isDeleting}
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </MangaButton>
            <MangaButton
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting' : 'Delete Video'}
            </MangaButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
