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
        'border-manga-black inline-flex min-h-8 max-w-full items-center border-2 px-3 py-1 font-sans text-xs leading-tight font-black tracking-normal uppercase shadow-[3px_3px_0_var(--manga-black)]',
        PAGE_TAG_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
