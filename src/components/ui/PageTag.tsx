import { PAGE_TAG_TONES } from '@/constants/theme'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
  tone?: keyof typeof PAGE_TAG_TONES
}

export function PageTag({ children, className, tone = 'default' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 w-fit max-w-full items-center justify-self-start rounded-full px-3 py-1 font-sans text-xs leading-tight font-medium tracking-normal',
        PAGE_TAG_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
