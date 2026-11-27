import { cn } from '@/lib/utils'

const COPYRIGHT_YEAR = 2026

interface Props {
  className?: string
}

/** The board's last line: copyright and author credit. */
export function AppCredits({ className }: Props) {
  return (
    <footer
      className={cn(
        'border-line text-ink-soft flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t px-4 py-4 text-center text-xs sm:justify-between md:mr-6 md:px-0',
        className
      )}
    >
      <span>© {COPYRIGHT_YEAR} English For Only Me. All rights reserved.</span>
      <span>
        Developed by{' '}
        <a
          href="https://anhkhoa.info"
          target="_blank"
          rel="noreferrer"
          className="text-ink hover:text-brand font-medium transition-colors"
        >
          Nguyen Anh Khoa
        </a>
      </span>
    </footer>
  )
}
