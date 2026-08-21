import Link from 'next/link'

import { CreatureMotion } from '@/components/grammar/cast/CreatureMotion'
import { CreatureSlot } from '@/components/grammar/cast/CreatureSlot'
import { Sensei } from '@/components/grammar/cast/Sensei'
import { ComicPanel } from '@/components/grammar/comic/ComicPanel'
import { PanelScriptRenderer } from '@/components/grammar/comic/PanelScriptRenderer'
import { SpeechBubble } from '@/components/grammar/comic/SpeechBubble'
import { compilePanelScript } from '@/modules/grammar/presentation/compilePanelScript'
import { creatureFromPoint } from '@/modules/grammar/presentation/creatureFromPoint'
import { resolveCreatureState } from '@/modules/grammar/presentation/resolveCreatureState'
import { selectSenseiLine } from '@/modules/grammar/presentation/selectSenseiLine'
import { SENSEI_LINES } from '@/modules/grammar/presentation/senseiLines'
import type { LearnerPresentationState } from '@/modules/grammar/presentation/types'
import type {
  GrammarContrastRecord,
  GrammarPointApiRecord,
} from '@/modules/grammar/types'

type LessonProps = GrammarPointApiRecord & {
  contrasts: GrammarContrastRecord[]
  redirectedFrom: string | null
}

/**
 * A grammar point as a comic page.
 *
 * Replaces the nine titled panels that made the old page read like a spec sheet.
 * The layout is not decided here: `compilePanelScript` decides which beats exist
 * and in what order, `PanelScriptRenderer` decides how each one looks, and this
 * component only assembles the two and puts the creature beside them.
 *
 * A server component, top to bottom. The single client island is
 * `CreatureMotion`, which receives the server-rendered creature as `children`.
 */
export function GrammarComicLesson({
  learnerState,
  lesson,
}: {
  learnerState: LearnerPresentationState
  lesson: LessonProps
}) {
  const verdict = selectSenseiLine({ learnerState, point: lesson })
  const beats = compilePanelScript({
    learnerState,
    lesson,
    verdictLine: verdict.line,
  })
  const creatureState = resolveCreatureState({
    reviewStatus: lesson.reviewStatus,
    status: learnerState.status,
  })
  const creature = creatureFromPoint({
    point: lesson,
    recallStage: learnerState.recallStage,
  })

  return (
    <div className="grid gap-4">
      {lesson.redirectedFrom ? (
        <p className="border-comic-ink bg-manga-paper-soft border-2 border-dashed p-3 text-sm leading-6 font-semibold">
          <code>{lesson.redirectedFrom}</code> was merged into this point. Your
          progress followed the redirect.
        </p>
      ) : null}

      {/*
        The unverified warning, in character. It replaces the red banner rather
        than sitting next to it: the banner was honest and looked like a defect
        notice, and a warning that reads as chrome gets skipped. Keeps
        `role="status"` so it is still announced, and it is the first thing on
        the page.
      */}
      {lesson.explanation && lesson.reviewStatus === 'unverified' ? (
        <ComicPanel
          edge="b"
          tone="danger"
        >
          <div
            className="flex items-center gap-3"
            role="status"
          >
            <Sensei
              expression="wary"
              size="sm"
            />
            <SpeechBubble
              className="flex-1"
              speaker="Sensei"
              tail="none"
            >
              {SENSEI_LINES.unverified}
            </SpeechBubble>
          </div>
        </ComicPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <PanelScriptRenderer beats={beats} />
        </div>

        <CreatureMotion outcome={null}>
          <CreatureSlot
            spec={creature}
            state={creatureState}
          />
        </CreatureMotion>
      </div>

      {!lesson.explanation ? (
        <ComicPanel caption="Nothing written yet">
          <p className="text-base leading-7 font-semibold">
            This point exists in the taxonomy but has no lesson. Run{' '}
            <code>bun run grammar:generate {lesson.slug}</code>, then{' '}
            <code>bun run grammar:seed</code>.
          </p>
        </ComicPanel>
      ) : null}

      {/*
        Rivals, drawn as creatures rather than listed as links. Contrast is the
        relation that makes a rule mean anything - present perfect only makes
        sense against past simple - so a rival gets the same treatment as the
        point itself: species, menace tier, and ghost state if nobody has read
        its lesson either.
      */}
      {lesson.contrasts.length > 0 ? (
        <ComicPanel caption="Rivals">
          <ul className="flex flex-wrap gap-3">
            {lesson.contrasts.map(contrast => (
              <li
                className="min-w-0 flex-1 basis-56"
                key={contrast.slug}
              >
                <Link
                  className="grid gap-2 transition-transform hover:-translate-y-0.5"
                  href={`/grammar/points/${contrast.slug}`}
                >
                  <CreatureSlot
                    className="max-w-32"
                    spec={creatureFromPoint({
                      point: contrast,
                      recallStage: null,
                    })}
                    state={resolveCreatureState({
                      reviewStatus: contrast.reviewStatus,
                      status: null,
                    })}
                  />
                  <span className="font-sans text-sm font-black uppercase">
                    {contrast.title} ({contrast.cefrLevel})
                  </span>
                  <span className="text-manga-ink-soft text-sm leading-6 font-semibold">
                    {contrast.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ComicPanel>
      ) : null}
    </div>
  )
}
