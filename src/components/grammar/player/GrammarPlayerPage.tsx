import { MangaPageShell } from '@/components/common/MangaPageShell'
import type { GrammarSessionMode } from '@/modules/grammar/constants'
import type { GrammarCard } from '@/modules/grammar/course/types'
import { createRng, randomSeed } from '@/modules/grammar/rng'
import { preparePlayCards } from '@/modules/grammar/session/preparePlayCards'

import { LessonPlayer } from './LessonPlayer'

interface Props {
  mode: GrammarSessionMode
  targetId: string
  title: string
  cards: GrammarCard[]
  canSave: boolean
  intro?: string
}

/**
 * Server wrapper for every player route. Tiles and options are shuffled here,
 * once per request, so the client hydrates exactly the server's arrangement.
 * No top bar: a lesson is a focus screen with its own exit.
 */
export function GrammarPlayerPage({
  canSave,
  cards,
  intro,
  mode,
  targetId,
  title,
}: Props) {
  const plays = preparePlayCards(cards, createRng(randomSeed()))

  return (
    // Exactly one viewport tall, so the action bar is always on screen; below
    // 32rem (a phone on its side) it stops shrinking and the page scrolls.
    <MangaPageShell
      className="min-h-[32rem]"
      fullHeight
    >
      <LessonPlayer
        canSave={canSave}
        exitHref="/grammar"
        intro={intro}
        mode={mode}
        plays={plays}
        targetId={targetId}
        title={title}
      />
    </MangaPageShell>
  )
}
