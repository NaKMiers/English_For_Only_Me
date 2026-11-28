'use client'

import { EllipsisVertical } from 'lucide-react'
import type { ComponentProps } from 'react'

import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Props = Omit<
  ComponentProps<typeof DropdownMenuTrigger>,
  'aria-label' | 'children'
> & {
  /** What the menu acts on, e.g. "Actions for Cam 15 Test 3". */
  label: string
}

/**
 * The "more actions" button of every admin row and header: the icon
 * button look (outlined, pops on hover, presses down) on a menu trigger,
 * so the admin menus all look and behave the same. 44px on phones, the
 * denser 36px from `md` up.
 */
export function AdminMenuTrigger({ className, label, ...props }: Props) {
  return (
    <DropdownMenuTrigger
      aria-label={label}
      className={cn(
        'border-line bg-surface text-ink hover:bg-tint-soft rounded-control soft-press hover-pop grid size-11 shrink-0 place-items-center border disabled:opacity-50 md:size-9',
        className
      )}
      {...props}
    >
      <EllipsisVertical
        aria-hidden="true"
        className="size-4"
      />
    </DropdownMenuTrigger>
  )
}
