'use client'

import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { PageTag } from '@/components/ui/PageTag'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ExplainCard, PracticeCard } from '@/modules/grammar/course/types'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'

import { SpeakButton } from '../SpeakButton'

import type { CardDraft } from './cardDraft'

// MARK: Shared pieces

type TileTone = 'idle' | 'picked' | 'right' | 'wrong' | 'used'

interface TileProps {
  children: ReactNode
  className?: string
  disabled?: boolean
  label?: string
  onClick?: () => void
  pressed?: boolean
  tone?: TileTone
}

const tileToneClassName: Record<TileTone, string> = {
  idle: 'bg-manga-white text-manga-black',
  picked:
    'bg-manga-paper-soft text-manga-black translate-x-[2px] translate-y-[2px] shadow-none',
  right: 'bg-lesson-correct text-manga-white',
  wrong: 'bg-manga-red text-manga-white',
  used: 'bg-manga-white text-transparent shadow-none border-dashed',
}

/**
 * A word tile or answer option. Raw button on purpose: it is a segmented
 * toggle whose state lives in `aria-pressed`, the documented exception in
 * frontend-ui.md, and it needs a smaller footprint than MangaButton.
 */
function Tile({
  children,
  className,
  disabled,
  label,
  onClick,
  pressed,
  tone = 'idle',
}: TileProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      data-tile
      className={cn(
        'border-manga-black rounded-control sticker-press min-h-11 border-3 px-3 py-2 text-left font-sans text-base leading-snug font-bold shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-default',
        tileToneClassName[tone],
        className
      )}
      disabled={disabled}
      onClick={onClick}
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
    <p className="font-sans text-xl leading-relaxed font-black sm:text-2xl">
      {before}
      <span
        className={cn(
          'border-manga-black mx-1 inline-block min-w-20 border-b-4 px-1 text-center',
          !filled && 'text-transparent',
          filled && checked === null && 'text-manga-red',
          // Once checked, the word itself carries the verdict, as a filled
          // chip that reads on both the paper and the lamp-lit room.
          checked !== null &&
            'rounded-t-tag text-manga-white motion-safe:animate-in motion-safe:zoom-in-95',
          checked === true && 'bg-lesson-correct',
          checked === false && 'bg-manga-red line-through decoration-2'
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
  return (
    <div className="grid gap-4">
      <Prompt>Ghi nhớ</Prompt>
      <h2 className="font-sans text-2xl leading-tight font-black sm:text-3xl">
        {card.title}
      </h2>
      <p className="text-base leading-relaxed sm:text-lg">{card.body}</p>
      {card.formula ? (
        <p className="border-manga-black bg-manga-paper-soft rounded-control w-fit max-w-full border-2 px-3 py-2 font-mono text-sm font-bold sm:text-base">
          {card.formula}
        </p>
      ) : null}
      {card.examples.length > 0 ? (
        <ul className="grid gap-2">
          {card.examples.map(example => (
            <li
              className="border-manga-black rounded-control bg-manga-white grid gap-0.5 border-2 px-3 py-2"
              key={example.en}
            >
              <span className="flex items-start gap-1 font-bold">
                <span className="min-w-0 flex-1">{example.en}</span>
                <SpeakButton text={example.en} />
              </span>
              <span className="text-manga-ink-soft text-sm">{example.vi}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {card.pitfall ? (
        <div className="border-manga-red rounded-control grid gap-1.5 border-2 border-dashed px-3 py-2">
          <span className="text-manga-red text-xs font-black uppercase">
            Lỗi hay gặp
          </span>
          <span className="flex items-center gap-2">
            <X
              aria-hidden
              className="text-manga-red size-4 shrink-0"
            />
            <span className="sr-only">Sai:</span>
            <span className="line-through decoration-2">
              {card.pitfall.wrong}
            </span>
          </span>
          <span className="flex items-center gap-2 font-bold">
            <Check
              aria-hidden
              className="text-lesson-correct size-4 shrink-0"
            />
            <span className="sr-only">Đúng:</span>
            {card.pitfall.right}
            <SpeakButton text={card.pitfall.right} />
          </span>
          <span className="text-manga-ink-soft text-sm">
            {card.pitfall.note}
          </span>
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
        <p className="font-sans text-xl leading-relaxed font-black sm:text-2xl">
          {card.sentence}
        </p>
      ) : null}
      <div
        aria-label="Các lựa chọn"
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
              <span className="text-manga-ink-soft mr-2 hidden font-mono text-xs sm:inline">
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
          aria-label="Các từ để chọn"
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
          aria-label="Câu trả lời"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          autoFocus
          className="border-manga-black bg-manga-white rounded-control h-12 border-3 px-3 text-lg font-bold shadow-[3px_3px_0_var(--manga-black)]"
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
          placeholder="Gõ câu trả lời"
          spellCheck={false}
          value={draft.text}
        />
      )}
    </>
  )
}

function OrderView({ card, checked, draft, onDraft, play }: PracticeProps) {
  if (card.kind !== 'order' || draft.kind !== 'order') return null

  const tiles = play.tiles ?? []
  const picked = new Set(draft.picked)
  // The end mark is fixed, not a tile: it says whether a statement or a
  // question is wanted, so "Has he finished" is not a fair answer to a
  // statement card.
  const endMark = /[.?!]$/.exec(card.sentence.trim())?.[0] ?? null

  return (
    <>
      <div
        aria-label="Câu của bạn"
        aria-live="polite"
        className="border-manga-black rounded-control flex min-h-16 flex-wrap content-start gap-2 border-b-3 border-dashed pb-3"
      >
        {draft.picked.length === 0 ? (
          <span className="text-manga-ink-soft self-center text-sm">
            Chạm vào các từ bên dưới theo đúng thứ tự.
          </span>
        ) : null}
        {draft.picked.map((tileIndex, position) => (
          <Tile
            disabled={checked !== null}
            key={tileIndex}
            label={`Bỏ "${tiles[tileIndex]}"`}
            onClick={() =>
              onDraft({
                kind: 'order',
                picked: draft.picked.filter((_, index) => index !== position),
              })
            }
            tone={checked === null ? 'idle' : checked ? 'right' : 'wrong'}
          >
            {tiles[tileIndex]}
          </Tile>
        ))}
        {endMark ? (
          <span
            aria-label={endMark === '?' ? 'Câu hỏi' : 'Câu kể'}
            className="self-end font-sans text-2xl leading-none font-black"
          >
            {endMark}
          </span>
        ) : null}
      </div>
      <div
        aria-label="Các từ để xếp"
        className="flex flex-wrap gap-2"
        role="group"
      >
        {tiles.map((tile, tileIndex) => (
          <Tile
            disabled={checked !== null || picked.has(tileIndex)}
            key={`${tile}-${tileIndex}`}
            label={picked.has(tileIndex) ? `${tile} (đã dùng)` : tile}
            onClick={() =>
              onDraft({ kind: 'order', picked: [...draft.picked, tileIndex] })
            }
            tone={picked.has(tileIndex) ? 'used' : 'idle'}
          >
            {tile}
          </Tile>
        ))}
      </div>
    </>
  )
}

function FixView({ card, checked, draft, onDraft }: PracticeProps) {
  if (card.kind !== 'fix' || draft.kind !== 'fix') return null

  return (
    <div
      aria-label="Các từ trong câu"
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
