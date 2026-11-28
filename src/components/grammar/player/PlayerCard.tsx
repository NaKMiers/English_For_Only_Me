'use client'

import { Check, X } from 'lucide-react'
import { useRef, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { PageTag } from '@/components/ui/PageTag'
import { Input } from '@/components/ui/input'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { ExplainCard, PracticeCard } from '@/modules/grammar/course/types'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'

import { SpeakButton } from '../SpeakButton'

import { placeTile, type CardDraft } from './cardDraft'
import { useTileDrag } from './useTileDrag'

// MARK: Shared pieces

type TileTone = 'idle' | 'picked' | 'right' | 'wrong' | 'used'

interface TileProps {
  children: ReactNode
  className?: string
  disabled?: boolean
  label?: string
  onClick?: () => void
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  pressed?: boolean
  tone?: TileTone
}

const tileToneClassName: Record<TileTone, string> = {
  idle: 'bg-surface text-ink',
  picked: 'bg-tint text-ink translate-x-[2px] translate-y-[2px] shadow-none',
  right: 'bg-lesson-correct text-surface',
  wrong: 'bg-danger text-surface',
  used: 'bg-surface text-transparent shadow-none border-dashed',
}

const tileClassName =
  'border-line rounded-control soft-press hover-pop min-h-11 border px-3 py-2 text-left font-sans text-base leading-snug font-medium disabled:cursor-default'

/**
 * A word tile or answer option. Raw button on purpose: it is a segmented
 * toggle whose state lives in `aria-pressed`, the documented exception in
 * frontend-ui.md, and it needs a smaller footprint than ActionButton.
 */
function Tile({
  children,
  className,
  disabled,
  label,
  onClick,
  onPointerDown,
  pressed,
  tone = 'idle',
}: TileProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      data-tile
      className={cn(tileClassName, tileToneClassName[tone], className)}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      type="button"
    >
      {children}
    </button>
  )
}

function Prompt({ children }: { children: ReactNode }) {
  return <PageTag tone="pale">{children}</PageTag>
}

function SentenceWithBlank({
  checked,
  filled,
  sentence,
}: {
  /** Null while answering; the verdict once checked. */
  checked: boolean | null
  filled: string
  sentence: string
}) {
  const [before, after] = sentence.split('___')

  return (
    <p className="font-sans text-xl leading-relaxed font-medium sm:text-2xl">
      {before}
      <span
        className={cn(
          'border-line mx-1 inline-block min-w-20 border-b-4 px-1 text-center',
          !filled && 'text-transparent',
          filled && checked === null && 'text-brand',
          // Once checked, the word itself carries the verdict, as a filled
          // chip that reads on both the paper and the lamp-lit room.
          checked !== null &&
            'rounded-t-tag text-surface motion-safe:animate-in motion-safe:zoom-in-95',
          checked === true && 'bg-lesson-correct',
          checked === false && 'bg-danger line-through decoration-2'
        )}
      >
        {filled || '...'}
      </span>
      {after}
    </p>
  )
}

// MARK: Explain

interface ExplainProps {
  card: ExplainCard
}

export function ExplainCardView({ card }: ExplainProps) {
  const t = useMessages().grammar.card

  return (
    <div className="grid gap-4">
      <Prompt>{t.remember}</Prompt>
      <h2 className="font-sans text-2xl leading-tight font-medium sm:text-3xl">
        {card.title}
      </h2>
      <p className="text-base leading-relaxed sm:text-lg">{card.body}</p>
      {card.formula ? (
        <p className="border-line bg-tint rounded-control w-fit max-w-full border px-3 py-2 font-mono text-sm font-medium sm:text-base">
          {card.formula}
        </p>
      ) : null}
      {card.examples.length > 0 ? (
        <ul className="grid gap-2">
          {card.examples.map(example => (
            <li
              className="border-line rounded-control bg-surface grid gap-0.5 border px-3 py-2"
              key={example.en}
            >
              <span className="flex items-start gap-1 font-medium">
                <span className="min-w-0 flex-1">{example.en}</span>
                <SpeakButton text={example.en} />
              </span>
              <span className="text-ink-soft text-sm">{example.vi}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {card.pitfall ? (
        <div className="border-danger rounded-control grid gap-1.5 border border-dashed px-3 py-2">
          <span className="text-danger text-xs font-medium">
            {t.commonMistake}
          </span>
          <span className="flex items-center gap-2">
            <X
              aria-hidden
              className="text-danger size-4 shrink-0"
            />
            <span className="sr-only">{t.wrong}</span>
            <span className="line-through decoration-2">
              {card.pitfall.wrong}
            </span>
          </span>
          <span className="flex items-center gap-2 font-medium">
            <Check
              aria-hidden
              className="text-lesson-correct size-4 shrink-0"
            />
            <span className="sr-only">{t.correct}</span>
            {card.pitfall.right}
            <SpeakButton text={card.pitfall.right} />
          </span>
          <span className="text-ink-soft text-sm">{card.pitfall.note}</span>
        </div>
      ) : null}
    </div>
  )
}

// MARK: Practice

interface PracticeProps {
  play: PlayCard
  card: PracticeCard
  draft: CardDraft
  /** Null while answering; the verdict once checked. */
  checked: boolean | null
  onDraft: (draft: CardDraft) => void
  onSubmit: () => void
}

export function PracticeCardView(props: PracticeProps) {
  const { card } = props

  return (
    <div className="grid gap-5">
      <Prompt>{card.prompt}</Prompt>
      {card.kind === 'choice' ? <ChoiceView {...props} /> : null}
      {card.kind === 'fill' ? <FillView {...props} /> : null}
      {card.kind === 'order' ? <OrderView {...props} /> : null}
      {card.kind === 'fix' ? <FixView {...props} /> : null}
    </div>
  )
}

function ChoiceView({ card, checked, draft, onDraft, play }: PracticeProps) {
  const t = useMessages().grammar.card

  if (card.kind !== 'choice' || draft.kind !== 'choice') return null

  const order = play.optionOrder ?? card.options.map((_, index) => index)

  return (
    <>
      {card.sentence?.includes('___') ? (
        <SentenceWithBlank
          checked={checked}
          filled={
            draft.option !== null ? (card.options[draft.option] ?? '') : ''
          }
          sentence={card.sentence}
        />
      ) : null}
      {card.sentence && !card.sentence.includes('___') ? (
        <p className="font-sans text-xl leading-relaxed font-medium sm:text-2xl">
          {card.sentence}
        </p>
      ) : null}
      <div
        aria-label={t.choices}
        className="grid gap-3"
        role="group"
      >
        {order.map((optionIndex, position) => {
          const picked = draft.option === optionIndex
          let tone: TileTone = picked ? 'picked' : 'idle'

          if (checked !== null && optionIndex === card.answer) tone = 'right'
          else if (checked !== null && picked) tone = 'wrong'

          return (
            <Tile
              disabled={checked !== null}
              key={optionIndex}
              onClick={() => onDraft({ kind: 'choice', option: optionIndex })}
              pressed={picked}
              tone={tone}
            >
              <span className="text-ink-soft mr-2 hidden font-mono text-xs sm:inline">
                {position + 1}
              </span>
              {card.options[optionIndex]}
            </Tile>
          )
        })}
      </div>
    </>
  )
}

function FillView({
  card,
  checked,
  draft,
  onDraft,
  onSubmit,
  play,
}: PracticeProps) {
  const t = useMessages().grammar.card

  if (card.kind !== 'fill' || draft.kind !== 'fill') return null

  return (
    <>
      <SentenceWithBlank
        checked={checked}
        filled={draft.text}
        sentence={card.sentence}
      />
      {play.tiles ? (
        <div
          aria-label={t.wordsToPick}
          className="flex flex-wrap gap-3"
          role="group"
        >
          {play.tiles.map(tile => {
            const picked = draft.text === tile
            let tone: TileTone = picked ? 'picked' : 'idle'

            if (checked !== null && tile === card.answers[0]) tone = 'right'
            else if (checked !== null && picked) tone = 'wrong'

            return (
              <Tile
                disabled={checked !== null}
                key={tile}
                onClick={() =>
                  onDraft({ kind: 'fill', text: picked ? '' : tile })
                }
                pressed={picked}
                tone={tone}
              >
                {tile}
              </Tile>
            )
          })}
        </div>
      ) : (
        <Input
          aria-label={t.answer}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          autoFocus
          className="border-line bg-surface rounded-control h-12 border px-3 text-lg font-medium"
          disabled={checked !== null}
          enterKeyHint="done"
          maxLength={120}
          onChange={event =>
            onDraft({ kind: 'fill', text: event.target.value })
          }
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
          }}
          placeholder={t.answerPlaceholder}
          spellCheck={false}
          value={draft.text}
        />
      )}
    </>
  )
}

function OrderView({ card, checked, draft, onDraft, play }: PracticeProps) {
  if (card.kind !== 'order' || draft.kind !== 'order') return null

  return (
    <OrderBoard
      checked={checked}
      onPick={picked => onDraft({ kind: 'order', picked })}
      picked={draft.picked}
      sentence={card.sentence}
      tiles={play.tiles ?? []}
    />
  )
}

/**
 * Tap a word to add it to the end or take it back, or drag it: into any gap
 * of the answer line, to another place in the line, or back to the bank.
 */
function OrderBoard({
  checked,
  onPick,
  picked,
  sentence,
  tiles,
}: {
  checked: boolean | null
  onPick: (picked: number[]) => void
  picked: number[]
  sentence: string
  tiles: string[]
}) {
  const t = useMessages().grammar.card
  const lineRef = useRef<HTMLDivElement>(null)
  const bankRef = useRef<HTMLDivElement>(null)
  const { drag, startPress, wasDragged } = useTileDrag({
    bankRef,
    lineRef,
    onDrop: (tileIndex, target) => {
      if (target.zone === 'line')
        onPick(placeTile(picked, tileIndex, target.position))
      else onPick(picked.filter(index => index !== tileIndex))
    },
  })

  const answering = checked === null
  const used = new Set(picked)
  // The end mark is fixed, not a tile: it says whether a statement or a
  // question is wanted, so "Has he finished" is not a fair answer to a
  // statement card.
  const endMark = /[.?!]$/.exec(sentence.trim())?.[0] ?? null
  const lineTarget = drag?.target?.zone === 'line' ? drag.target : null
  const overBank =
    drag?.target?.zone === 'bank' && used.has(drag.tileIndex) ? true : false

  return (
    <>
      <div
        aria-label={t.yourSentence}
        aria-live="polite"
        className={cn(
          'border-line rounded-control flex min-h-16 flex-wrap content-start gap-2 border-b border-dashed pb-3 transition-colors',
          lineTarget && 'border-brand bg-tint'
        )}
        ref={lineRef}
      >
        {picked.length === 0 ? (
          <span className="text-ink-soft self-center text-sm">
            {t.orderHint}
          </span>
        ) : null}
        {picked.map((tileIndex, position) => (
          <span
            className="relative"
            data-line-slot
            key={tileIndex}
          >
            {lineTarget?.position === position ? (
              <DropMarker side="left" />
            ) : null}
            {lineTarget?.position === picked.length &&
            position === picked.length - 1 ? (
              <DropMarker side="right" />
            ) : null}
            <Tile
              className={cn(
                answering && 'touch-none select-none',
                drag?.tileIndex === tileIndex && 'opacity-40'
              )}
              disabled={!answering}
              label={format(t.removeWord, { word: tiles[tileIndex] ?? '' })}
              onClick={() => {
                if (wasDragged()) return
                onPick(picked.filter((_, index) => index !== position))
              }}
              onPointerDown={event => {
                if (answering) startPress(tileIndex, event)
              }}
              tone={answering ? 'idle' : checked ? 'right' : 'wrong'}
            >
              {tiles[tileIndex]}
            </Tile>
          </span>
        ))}
        {endMark ? (
          <span
            aria-label={endMark === '?' ? t.question : t.statement}
            className="self-end font-sans text-2xl leading-none font-medium"
          >
            {endMark}
          </span>
        ) : null}
      </div>
      <div
        aria-label={t.wordsToArrange}
        className={cn(
          'rounded-control flex flex-wrap gap-2 transition-colors',
          overBank &&
            'bg-tint outline-brand outline-2 outline-offset-4 outline-dashed'
        )}
        ref={bankRef}
        role="group"
      >
        {tiles.map((tile, tileIndex) => (
          <Tile
            className={cn(
              answering && !used.has(tileIndex) && 'touch-none select-none',
              drag?.tileIndex === tileIndex && 'opacity-40'
            )}
            disabled={!answering || used.has(tileIndex)}
            key={`${tile}-${tileIndex}`}
            label={
              used.has(tileIndex) ? format(t.usedWord, { word: tile }) : tile
            }
            onClick={() => {
              if (wasDragged()) return
              onPick([...picked, tileIndex])
            }}
            onPointerDown={event => {
              if (answering && !used.has(tileIndex))
                startPress(tileIndex, event)
            }}
            tone={used.has(tileIndex) ? 'used' : 'idle'}
          >
            {tile}
          </Tile>
        ))}
      </div>
      {drag
        ? createPortal(
            <span
              aria-hidden
              className={cn(
                tileClassName,
                tileToneClassName.idle,
                'pointer-events-none fixed z-50 -rotate-3'
              )}
              style={{
                left: drag.x - drag.offsetX,
                top: drag.y - drag.offsetY,
              }}
            >
              {tiles[drag.tileIndex]}
            </span>,
            document.body
          )
        : null}
    </>
  )
}

/** The bar showing which gap a dragged word will drop into. */
function DropMarker({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'bg-brand pointer-events-none absolute inset-y-0 w-1 rounded-full',
        side === 'left' ? '-left-1.5' : '-right-1.5'
      )}
    />
  )
}

function FixView({ card, checked, draft, onDraft }: PracticeProps) {
  const t = useMessages().grammar.card

  if (card.kind !== 'fix' || draft.kind !== 'fix') return null

  return (
    <div
      aria-label={t.wordsInSentence}
      className="flex flex-wrap gap-2"
      role="group"
    >
      {card.tokens.map((token, index) => {
        const picked = draft.token === index
        let tone: TileTone = picked ? 'picked' : 'idle'

        if (checked !== null && index === card.wrongIndex) tone = 'right'
        else if (checked !== null && picked) tone = 'wrong'

        return (
          <Tile
            className="text-lg"
            disabled={checked !== null}
            key={`${token}-${index}`}
            onClick={() =>
              onDraft({ kind: 'fix', token: picked ? null : index })
            }
            pressed={picked}
            tone={tone}
          >
            {token}
          </Tile>
        )
      })}
    </div>
  )
}
