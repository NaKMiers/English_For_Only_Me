'use client'

import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useId } from 'react'

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { IELTS_TARGET_BANDS } from '@/modules/ielts/constants'
import { ExamButton, ExamIconButton } from '@/components/ielts/ui'

/**
 * A box inside a panel (script line, question group, audio). On a phone it
 * flattens to a tint like every nested box (see "ONE FRAME ON A PHONE" in
 * globals.css).
 */
export const INNER_BOX_CLASS =
  'border-manga-black bg-manga-white rounded-control border-2 p-3'

const INPUT_CLASS =
  'border-manga-black bg-manga-white h-10 border-2 text-sm md:text-sm'

export function TextField({
  className,
  label,
  onChange,
  placeholder,
  suggestions,
  value,
}: {
  className?: string
  label: string
  onChange: (value: string) => void
  placeholder?: string
  /** Offered as the browser's autocomplete list; typing anything is fine. */
  suggestions?: string[]
  value: string
}) {
  const id = useId()
  const listId = suggestions?.length ? `${id}-list` : undefined

  return (
    <div className={cn('grid gap-1', className)}>
      <Label
        className="font-sans text-xs font-black"
        htmlFor={id}
      >
        {label}
      </Label>
      <Input
        className={INPUT_CLASS}
        id={id}
        list={listId}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {listId ? (
        <datalist id={listId}>
          {suggestions?.map(item => (
            <option
              key={item}
              value={item}
            />
          ))}
        </datalist>
      ) : null}
    </div>
  )
}

export function NumberField({
  className,
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  className?: string
  label: string
  max?: number
  min?: number
  onChange: (value: number) => void
  step?: number
  value: number
}) {
  const id = useId()

  return (
    <div className={cn('grid gap-1', className)}>
      <Label
        className="font-sans text-xs font-black"
        htmlFor={id}
      >
        {label}
      </Label>
      <Input
        className={INPUT_CLASS}
        id={id}
        max={max}
        min={min}
        onChange={event => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={Number.isFinite(value) ? value : ''}
      />
    </div>
  )
}

/** Target band picker: the half-band steps from 4 to 9. */
export function BandField({
  className,
  label = 'Target band',
  onChange,
  value,
}: {
  className?: string
  label?: string
  onChange: (value: number) => void
  value: number
}) {
  const id = useId()

  return (
    <div className={cn('grid gap-1', className)}>
      <Label
        className="font-sans text-xs font-black"
        htmlFor={id}
      >
        {label}
      </Label>
      <Select
        onValueChange={next => onChange(Number(next ?? value))}
        value={String(value)}
      >
        <SelectTrigger
          className="w-full data-[size=default]:min-h-10 data-[size=default]:py-1.5"
          id={id}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IELTS_TARGET_BANDS.map(band => (
            <SelectItem
              key={band}
              value={String(band)}
            >
              Band {band.toFixed(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function AreaField({
  className,
  hint,
  label,
  onChange,
  rows = 4,
  value,
}: {
  className?: string
  hint?: ReactNode
  label: string
  onChange: (value: string) => void
  rows?: number
  value: string
}) {
  const id = useId()

  return (
    <div className={cn('grid gap-1', className)}>
      <Label
        className="font-sans text-xs font-black"
        htmlFor={id}
      >
        {label}
      </Label>
      <Textarea
        className="border-manga-black font-body bg-manga-white border-2 text-sm leading-[1.6] md:text-sm"
        id={id}
        onChange={event => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
      {hint ? (
        <p className="text-muted-foreground text-xs font-semibold">{hint}</p>
      ) : null}
    </div>
  )
}

/** Comma-separated list (answers, categories) edited as one string. */
export function ListField({
  className,
  label,
  onChange,
  separator = '|',
  value,
}: {
  className?: string
  label: string
  onChange: (value: string[]) => void
  separator?: string
  value: string[]
}) {
  return (
    <TextField
      className={className}
      label={`${label} (separated by ${separator})`}
      onChange={text =>
        onChange(
          text
            .split(separator)
            .map(item => item.trim())
            .filter(Boolean)
        )
      }
      value={value.join(` ${separator} `)}
    />
  )
}

export function RowActions({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <ExamIconButton
      className="size-9"
      label={label}
      onClick={onRemove}
      type="button"
    >
      <Trash2
        aria-hidden="true"
        className="size-4"
      />
    </ExamIconButton>
  )
}

/** Small inline status chip for row and section headers. */
const CHIP_TONES = {
  default: 'bg-manga-white text-manga-black',
  ink: 'bg-manga-black text-manga-white',
  red: 'bg-manga-red text-manga-white',
  pale: 'bg-manga-pale-red text-manga-black',
  warn: 'bg-yellow-100 text-yellow-950',
  ok: 'bg-sky-100 text-sky-950',
} as const

export function MetaChip({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: keyof typeof CHIP_TONES
}) {
  return (
    <span
      className={cn(
        'border-manga-black rounded-tag inline-flex h-6 shrink-0 items-center gap-1 border-2 px-1.5 font-sans text-[11px] leading-none font-black whitespace-nowrap uppercase [&_svg]:size-3',
        CHIP_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

const DISCLOSURE_CLASS = {
  /** A top-level block of the section form, split by a dashed rule. */
  block:
    'border-manga-black/40 border-t-2 border-dashed pt-2 first:border-t-0 first:pt-0',
  /** A row of a repeating list (paragraph, group): a small card. */
  box: cn(INNER_BOX_CLASS, 'p-0'),
  /** A row inside a row (question): an ink rail instead of another frame. */
  rail: 'border-manga-black border-l-4 pl-2',
} as const

/**
 * A collapsible block: chevron + title + one-line summary in the header,
 * optional actions on the right (outside the trigger, so a delete button is
 * never inside the toggle). Closed blocks keep the editor short; the summary
 * says what is inside without opening it.
 */
export function Disclosure({
  actions,
  children,
  className,
  defaultOpen = false,
  meta,
  onOpenChange,
  open,
  title,
  variant = 'box',
}: {
  actions?: ReactNode
  children: ReactNode
  className?: string
  defaultOpen?: boolean
  meta?: ReactNode
  onOpenChange?: (open: boolean) => void
  open?: boolean
  title: ReactNode
  variant?: keyof typeof DISCLOSURE_CLASS
}) {
  return (
    <Collapsible
      className={cn('@container min-w-0', DISCLOSURE_CLASS[variant], className)}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      open={open}
    >
      <div
        className={cn(
          'flex min-w-0 items-center gap-2',
          variant === 'box' && 'px-2 py-1'
        )}
      >
        <CollapsibleTrigger className="group/disclosure flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-data-[panel-open]/disclosure:rotate-90"
          />
          <span
            className={cn(
              'shrink-0 font-sans font-black',
              variant === 'block' ? 'text-sm uppercase' : 'text-sm'
            )}
          >
            {title}
          </span>
          {meta ? (
            <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1.5 truncate text-xs font-semibold">
              {meta}
            </span>
          ) : null}
        </CollapsibleTrigger>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        ) : null}
      </div>
      <CollapsiblePanel
        className={cn(
          'grid gap-3',
          variant === 'box' && 'border-manga-black border-t-2 p-3',
          variant === 'block' && 'pt-2 pb-1',
          variant === 'rail' && 'pt-1 pb-2'
        )}
      >
        {children}
      </CollapsiblePanel>
    </Collapsible>
  )
}

/**
 * Prev / page picker / Next over a long list of entry cards. The picker
 * names each page by its 0-based block range, so it matches the card
 * numbers. Renders nothing while the list fits on one page.
 */
export function EntryPager({
  label,
  onPageChange,
  page,
  pageSize,
  total,
}: {
  label: string
  onPageChange: (page: number) => void
  page: number
  pageSize: number
  total: number
}) {
  const pageCount = Math.ceil(total / pageSize)

  if (pageCount <= 1) return null

  const rangeOf = (value: number) =>
    `${value * pageSize}-${Math.min(total, (value + 1) * pageSize) - 1}`

  return (
    <nav
      aria-label={`${label} pages`}
      className="flex items-center gap-1.5"
    >
      <ExamIconButton
        className="size-9"
        disabled={page === 0}
        label="Previous page"
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        <ChevronLeft
          aria-hidden="true"
          className="size-4"
        />
      </ExamIconButton>
      <Select
        onValueChange={value => onPageChange(Number(value ?? page))}
        value={String(page)}
      >
        <SelectTrigger
          aria-label={`${label} page`}
          className="min-w-0 flex-1 tabular-nums"
          size="sm"
        >
          <SelectValue>
            {() => `${label} ${rangeOf(page)} · ${page + 1}/${pageCount}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: pageCount }, (_, value) => (
            <SelectItem
              key={value}
              value={String(value)}
            >
              {label} {rangeOf(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ExamIconButton
        className="size-9"
        disabled={page >= pageCount - 1}
        label="Next page"
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        <ChevronRight
          aria-hidden="true"
          className="size-4"
        />
      </ExamIconButton>
    </nav>
  )
}

/** Prev / "1-10 of 34" / Next for a list paged by `pageSize` items. */
export function PageControls({
  label,
  onPageChange,
  page,
  pageSize,
  total,
}: {
  label: string
  onPageChange: (page: number) => void
  page: number
  pageSize: number
  total: number
}) {
  const pageCount = Math.ceil(total / pageSize)

  if (pageCount <= 1) return null

  return (
    <nav
      aria-label={`${label} pages`}
      className="flex items-center justify-end gap-2"
    >
      <span className="text-muted-foreground font-sans text-xs font-black tabular-nums">
        {page * pageSize + 1}-{Math.min(total, (page + 1) * pageSize)} of{' '}
        {total}
      </span>
      <ExamIconButton
        className="size-9"
        disabled={page === 0}
        label="Previous page"
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        <ChevronLeft
          aria-hidden="true"
          className="size-4"
        />
      </ExamIconButton>
      <ExamIconButton
        className="size-9"
        disabled={page >= pageCount - 1}
        label="Next page"
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        <ChevronRight
          aria-hidden="true"
          className="size-4"
        />
      </ExamIconButton>
    </nav>
  )
}

export function AddButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <ExamButton
      className="w-fit"
      icon={
        <Plus
          aria-hidden="true"
          className="size-4"
        />
      }
      onClick={onClick}
      tone="paper"
      type="button"
    >
      {children}
    </ExamButton>
  )
}

/** "1 error", "3 errors". */
export function countLabel(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** Immutable helpers for list editing. */
export function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, position) => (position === index ? value : item))
}

export function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, position) => position !== index)
}
