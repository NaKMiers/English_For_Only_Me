'use client'

import { Volume2 } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
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
  const t = useMessages().grammar.card

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
    // IconButton size. The invisible ::before grows the hit area to 44px
    // without moving the text around it.
    <button
      aria-label={format(t.listenTo, { text })}
      className={cn(
        'hover-pop text-ink-soft hover:text-brand focus-visible:outline-line rounded-tag relative inline-grid size-7 shrink-0 place-items-center align-middle before:absolute before:-inset-2 before:content-[""] focus-visible:outline-2',
        className
      )}
      onClick={speak}
      title={t.listen}
      type="button"
    >
      <Volume2
        aria-hidden
        className="size-4"
      />
    </button>
  )
}
