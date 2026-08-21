import { SenseiPortrait } from '@/components/grammar/cast/SenseiPortrait'
import {
  senseiHookLine,
  SENSEI_LINES,
} from '@/modules/grammar/presentation/senseiLines'
import type { SenseiExpression } from '@/modules/grammar/presentation/senseiExpressions'
import type { Beat } from '@/modules/grammar/presentation/types'
import { MangaButton } from '@/components/ui/MangaButton'

import { ComicPanel, type PanelWidth } from './ComicPanel'
import { ImpactStamp } from './ImpactStamp'
import { MangaPage } from './MangaPage'
import { SpeechBubble } from './SpeechBubble'

/**
 * Beats that read well side by side: both are short lists of sentences, and
 * setting them against each other is most of the comparison.
 */
const HALF_WIDTH_KINDS = new Set<Beat['kind']>(['proof', 'pair'])

/**
 * Decide each panel's width.
 *
 * A half-width panel with no half-width neighbour becomes full width. Without
 * this, a point that has examples but no minimal pairs - or the reverse, which
 * is what `definite-article-the` actually is - renders one narrow panel with a
 * column of dead space beside it. Empty space on a comic page reads as a
 * missing panel, which is the exact impression the beat collapse exists to
 * avoid.
 *
 * A layout rule, so it lives here rather than in the compiler: the compiler
 * decides what is said, this file decides how wide it is said.
 */
export function resolvePanelWidths(beats: Beat[]): PanelWidth[] {
  return beats.map((beat, index) => {
    if (!HALF_WIDTH_KINDS.has(beat.kind)) return 'full'

    const hasHalfNeighbour = [beats[index - 1], beats[index + 1]].some(
      neighbour => neighbour != null && HALF_WIDTH_KINDS.has(neighbour.kind)
    )

    return hasHalfNeighbour ? 'half' : 'full'
  })
}

/**
 * Render a compiled panel script.
 *
 * Makes NO decisions. Which beats exist, in what order, with what content, is
 * entirely `compilePanelScript`'s business - this file only knows how each kind
 * of beat looks. That split is what makes the whole layout testable without
 * rendering anything, and it is why a beat can be reordered or dropped without
 * touching a component.
 *
 * All server components. A `'use client'` anywhere up this tree would ship 184
 * rendered lesson pages to the browser.
 */
export function PanelScriptRenderer({ beats }: { beats: Beat[] }) {
  const widths = resolvePanelWidths(beats)

  return (
    <MangaPage>
      {beats.map((beat, index) => (
        <BeatPanel
          beat={beat}
          key={`${beat.kind}-${index}`}
          width={widths[index]}
        />
      ))}
    </MangaPage>
  )
}

/** Which face goes with which beat. A table, not a decision. */
const BEAT_EXPRESSION: Record<Beat['kind'], SenseiExpression> = {
  boss: 'wary',
  hook: 'severe',
  interference: 'weary',
  pair: 'neutral',
  proof: 'neutral',
  rule: 'neutral',
  scar: 'unimpressed',
  trap: 'severe',
  verdict: 'unimpressed',
}

function BeatPanel({ beat, width }: { beat: Beat; width: PanelWidth }) {
  switch (beat.kind) {
    case 'hook':
      return (
        <ComicPanel
          halftone
          speedLines
          tone="ink"
        >
          <div className="flex items-start gap-3">
            <SenseiPortrait expression={BEAT_EXPRESSION.hook} />
            <div className="grid min-w-0 gap-2">
              {/*
              The stamp needs a flex row of its own. As a direct grid child it
              stretched to the column width, so the rotation turned a compact
              slab into a page-wide red wedge lying across the title. The
              vertical padding is the room the rotation needs; `leading-none`
              on the heading leaves none of its own.
            */}
              <div className="flex flex-wrap pt-1 pb-3">
                <ImpactStamp tone={beat.l1Risk === 'high' ? 'danger' : 'ink'}>
                  {senseiHookLine(beat)}
                </ImpactStamp>
              </div>
              <h1 className="font-sans text-3xl leading-none font-black uppercase sm:text-4xl">
                {beat.title}
              </h1>
              <p className="text-base leading-7 font-semibold">
                {beat.summary}
              </p>
              {beat.wrongCount > 0 ? (
                <p className="font-sans text-sm font-black uppercase">
                  You have answered this wrong {beat.wrongCount}{' '}
                  {beat.wrongCount === 1 ? 'time' : 'times'}.
                </p>
              ) : null}
            </div>
          </div>
        </ComicPanel>
      )

    case 'interference':
      return (
        <ComicPanel
          caption="Why you specifically"
          halftone
        >
          <div className="flex items-start gap-3">
            <SenseiPortrait
              expression={BEAT_EXPRESSION.interference}
              size="sm"
            />
            <div className="grid min-w-0 gap-3">
              {beat.l1Notes ? (
                <SpeechBubble speaker="Sensei">{beat.l1Notes}</SpeechBubble>
              ) : null}
              {beat.explanationVi ? (
                <p
                  className="text-manga-ink-soft text-sm leading-6 font-semibold whitespace-pre-line"
                  lang="vi"
                >
                  {beat.explanationVi}
                </p>
              ) : null}
            </div>
          </div>
        </ComicPanel>
      )

    case 'rule':
      return (
        <ComicPanel caption="The rule">
          <p className="text-base leading-7 font-semibold whitespace-pre-line">
            {beat.explanation}
          </p>
          {beat.formPatterns.length > 0 ? (
            <ul className="grid gap-2">
              {beat.formPatterns.map(pattern => (
                <li
                  className="border-comic-ink bg-manga-paper-soft border-2 p-2 font-mono text-sm font-semibold"
                  key={pattern}
                >
                  {pattern}
                </li>
              ))}
            </ul>
          ) : null}
        </ComicPanel>
      )

    case 'proof':
      return (
        <ComicPanel
          caption="It working"
          width={width}
        >
          <ul className="grid gap-2">
            {beat.examples.map(example => (
              <li
                className="border-comic-ink border-l-3 pl-3"
                key={example.en}
              >
                <p className="text-base leading-7 font-black">{example.en}</p>
                {example.vi ? (
                  <p
                    className="text-manga-ink-soft text-sm leading-6 font-semibold italic"
                    lang="vi"
                  >
                    {example.vi}
                  </p>
                ) : null}
                {example.note ? (
                  <p className="text-manga-ink-soft text-xs leading-5 font-black uppercase">
                    {example.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </ComicPanel>
      )

    case 'pair':
      return (
        <ComicPanel
          caption="Both correct"
          width={width}
        >
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
            Every sentence here is correct English. Only the meaning changes.
          </p>
          <ul className="grid gap-2">
            {beat.pairs.map(pair => (
              <li key={pair.sentence}>
                <p className="text-base leading-7 font-black">
                  {pair.sentence}
                </p>
                <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                  {pair.meaning}
                </p>
              </li>
            ))}
          </ul>
        </ComicPanel>
      )

    case 'trap':
      return (
        <ComicPanel
          caption="The trap"
          halftone
        >
          <div className="flex items-start gap-3">
            <SenseiPortrait
              expression={BEAT_EXPRESSION.trap}
              size="sm"
            />
            <ul className="grid min-w-0 flex-1 gap-3">
              {beat.mistakes.map(mistake => (
                <li
                  className="grid gap-1"
                  key={mistake.wrong}
                >
                  <p className="text-comic-danger text-base leading-7 font-black line-through">
                    {mistake.wrong}
                  </p>
                  <p className="text-base leading-7 font-black">
                    {mistake.right}
                  </p>
                  <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                    {mistake.why}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </ComicPanel>
      )

    case 'scar':
      return (
        <ComicPanel caption="Your record">
          <div className="flex items-start gap-3">
            <SenseiPortrait
              expression={BEAT_EXPRESSION.scar}
              size="sm"
            />
            <dl className="grid min-w-0 flex-1 gap-3">
              <ScarRow
                empty={SENSEI_LINES.empty.firstWrong}
                label="First time it caught you"
                quote={beat.scar.firstWrong}
              />
              <ScarRow
                empty={SENSEI_LINES.empty.worstTrap}
                label="What you keep writing"
                quote={beat.scar.worstTrap}
              />
              <ScarRow
                empty={SENSEI_LINES.empty.conquered}
                label="When you beat it"
                quote={beat.scar.conquered}
              />
              <div>
                <dt className="font-sans text-xs font-black uppercase">
                  Times it came back
                </dt>
                <dd className="text-base leading-7 font-semibold">
                  {beat.scar.revivals > 0
                    ? beat.scar.revivals
                    : SENSEI_LINES.empty.revivals}
                </dd>
              </div>
            </dl>
          </div>
        </ComicPanel>
      )

    case 'boss':
      return (
        <ComicPanel
          caption="Prove it"
          speedLines
          tone="ink"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="font-sans text-xl leading-none font-black uppercase">
                {beat.drillCount} drills
              </p>
              <p className="text-sm leading-6 font-semibold">
                {beat.recallStage == null
                  ? 'You have not fought this one yet.'
                  : `Stage ${beat.recallStage} of 7.`}
              </p>
            </div>
            <MangaButton
              href={`/grammar?drill=${beat.slug}`}
              tone="paper"
            >
              Start
            </MangaButton>
          </div>
        </ComicPanel>
      )

    case 'verdict':
      return (
        <ComicPanel tone="paper">
          <div className="flex items-end gap-3">
            <SenseiPortrait expression={BEAT_EXPRESSION.verdict} />
            <SpeechBubble
              className="flex-1"
              speaker="Sensei"
            >
              {beat.line}
            </SpeechBubble>
          </div>
        </ComicPanel>
      )
  }
}

function ScarRow({
  empty,
  label,
  quote,
}: {
  empty: string
  label: string
  quote: {
    matchedAnswer?: string | null
    occurrences?: number
    prompt: string | null
    userAnswer: string
  } | null
}) {
  return (
    <div>
      <dt className="font-sans text-xs font-black uppercase">{label}</dt>
      <dd className="grid gap-0.5">
        {quote ? (
          <>
            {/* Null when the drill no longer exists, which happens on every
                regeneration. Show the answer alone rather than inventing a
                prompt the learner never saw. */}
            {quote.prompt ? (
              <span className="text-manga-ink-soft text-sm leading-6 font-semibold">
                {quote.prompt}
              </span>
            ) : null}
            <span className="text-comic-danger text-base leading-7 font-black">
              &ldquo;{quote.userAnswer}&rdquo;
            </span>
            {quote.matchedAnswer ? (
              <span className="text-base leading-7 font-black">
                {quote.matchedAnswer}
              </span>
            ) : null}
            {quote.occurrences != null ? (
              <span className="text-manga-ink-soft font-sans text-xs font-black uppercase">
                {quote.occurrences} times
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-manga-ink-soft text-base leading-7 font-semibold">
            {empty}
          </span>
        )}
      </dd>
    </div>
  )
}
