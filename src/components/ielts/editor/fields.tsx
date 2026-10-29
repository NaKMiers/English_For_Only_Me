'use client'

import { Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useId } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ExamButton, ExamIconButton } from '@/components/ielts/ui'

const INPUT_CLASS = 'border-ex-line bg-white h-10 border text-sm md:text-sm'

export function TextField({
  className,
  label,
  onChange,
  placeholder,
  value,
}: {
  className?: string
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  const id = useId()

  return (
    <div className={cn('grid gap-1', className)}>
      <Label
        className="font-sans text-xs font-bold"
        htmlFor={id}
      >
        {label}
      </Label>
      <Input
        className={INPUT_CLASS}
        id={id}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
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
        className="font-sans text-xs font-bold"
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
        className="font-sans text-xs font-bold"
        htmlFor={id}
      >
        {label}
      </Label>
      <Textarea
        className="border-ex-line font-body border bg-white text-sm leading-[1.6] md:text-sm"
        id={id}
        onChange={event => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
      {hint ? (
        <p className="text-ex-muted text-xs font-semibold">{hint}</p>
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
      label={`${label} (cách nhau bởi ${separator})`}
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

/** Immutable helpers for list editing. */
export function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, position) => (position === index ? value : item))
}

export function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, position) => position !== index)
}
