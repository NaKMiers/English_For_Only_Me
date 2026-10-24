'use client'

import { Volume2 } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  className?: string
  text: string
}

function subscribe() {
  return () => undefined
}

function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Read an English sentence aloud with the browser's own voice. Renders nothing
 * where speech synthesis is unavailable, so there is never a dead button.
 */
export function SpeakButton({ className, text }: Props) {
  const supported = useSyncExternalStore(subscribe, canSpeak, () => false)

  if (!supported) return null

  function speak() {
    const utterance = new SpeechSynthesisUtterance(text)

    utterance.lang = 'en-US'
    utterance.rate = 0.92
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return (
    // Raw button: an inline 28px glyph inside running text, smaller than any
    // IconButton size, and it must not carry a sticker shadow mid-sentence.
    <button
      aria-label={`Nghe: ${text}`}
      className={cn(
        'text-manga-ink-soft hover:text-manga-red focus-visible:outline-manga-black rounded-tag inline-grid size-7 shrink-0 place-items-center align-middle focus-visible:outline-2',
        className
      )}
      onClick={speak}
      title="Nghe phát âm"
      type="button"
    >
      <Volume2
        aria-hidden
        className="size-4"
      />
    </button>
  )
}
