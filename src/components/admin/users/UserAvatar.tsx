import Image from 'next/image'

import { cn } from '@/lib/utils'

interface Props {
  className?: string
  image: string | null
  /** Name or email: its first letter stands in when there is no photo. */
  label: string
  size?: 'md' | 'lg'
}

/**
 * A learner's Google photo, or their initial on the brand pink. Decorative:
 * the name always sits beside it. Google photos are served as is
 * (`unoptimized`) and without a referrer, like the account menu's avatar.
 */
export function UserAvatar({ className, image, label, size = 'md' }: Props) {
  const box =
    size === 'lg'
      ? 'size-20 rounded-panel text-3xl'
      : 'size-10 rounded-control text-sm'

  if (image)
    return (
      <Image
        alt=""
        aria-hidden="true"
        className={cn(
          'bg-surface border-line shrink-0 border object-cover',
          box,
          className
        )}
        height={size === 'lg' ? 80 : 40}
        referrerPolicy="no-referrer"
        src={image}
        unoptimized
        width={size === 'lg' ? 80 : 40}
      />
    )

  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-brand-soft text-brand-ink grid shrink-0 place-items-center font-medium',
        box,
        className
      )}
    >
      {label.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
