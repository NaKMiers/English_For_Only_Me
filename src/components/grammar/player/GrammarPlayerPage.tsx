import { PageShell } from '@/components/common/PageShell'
import type { GrammarSessionMode } from '@/modules/grammar/constants'
import type { GrammarCard } from '@/modules/grammar/course/types'
import type { PlayerJourney } from '@/modules/grammar/path/playerJourney'
import { createRng, randomSeed } from '@/modules/grammar/rng'
import { preparePlayCards } from '@/modules/grammar/session/preparePlayCards'

import { LessonPlayer } from './LessonPlayer'

interface Props {
  mode: GrammarSessionMode
  targetId: string
  title: string
  cards: GrammarCard[]
  canSave: boolean
  /** The path around this session, for the session end's next stop. */
  journey?: PlayerJourney | null
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
  journey = null,
  intro,
  mode,
  targetId,
  title,
}: Props) {
  const seed = randomSeed()
  const plays = preparePlayCards(cards, createRng(seed))

  return (
    // Exactly one viewport tall, so the action bar is always on screen; below
    // 32rem (a phone on its side) it stops shrinking and the page scrolls.
    <PageShell
      className="min-h-[32rem]"
      fullHeight
    >
      <LessonPlayer
        canSave={canSave}
        exitHref="/grammar"
        intro={intro}
        journey={journey}
        // A new seed per render: Redo / Retry refresh the route and the
        // new key starts the player over on the new draw.
        key={seed}
        mode={mode}
        plays={plays}
        targetId={targetId}
        title={title}
      />
    </PageShell>
  )
}
