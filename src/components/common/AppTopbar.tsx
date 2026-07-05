import { BookOpen, Search, Settings } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { PRIMARY_NAV_ITEMS } from '@/constants/modules'
import { cn } from '@/lib/utils'

import { IconButton } from '../ui/IconButton'

interface NavItem {
  href: string
  label: string
}

interface Props {
  activeHref?: string
  className?: string
  navItems?: NavItem[]
  subtitle?: string
  title?: string
}

export function AppTopbar({
  activeHref = '/',
  className,
  navItems = PRIMARY_NAV_ITEMS,
  subtitle = 'Personal IELTS manga desk',
  title = 'English For Only Me',
}: Props) {
  return (
    <header
      className={cn(
        'border-manga-black bg-manga-white/88 grid min-h-21 grid-cols-1 items-center gap-4 border-b-3 p-4 sm:grid-cols-[minmax(260px,420px)_1fr] lg:grid-cols-[minmax(300px,430px)_1fr_auto]',
        className
      )}
    >
      <Link
        href="/"
        className="text-manga-black grid min-w-0 grid-cols-[54px_1fr] items-center gap-3"
      >
        <Image
          src="/logo.png"
          alt="English For Only Me logo"
          width={58}
          height={58}
          priority
          className="border-manga-black bg-manga-white size-14 border-3 object-contain shadow-[4px_4px_0_var(--manga-black)]"
        />
        <span className="grid min-w-0 gap-1">
          <strong className="font-sans text-[clamp(1.25rem,5vw,2rem)] leading-none font-black tracking-normal break-words uppercase sm:text-[clamp(1.3rem,2.4vw,2.1rem)]">
            {title}
          </strong>
          <span className="text-manga-ink-soft text-sm leading-tight font-black break-words">
            {subtitle}
          </span>
        </span>
      </Link>

      <nav
        aria-label="Primary"
        className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1"
      >
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === activeHref ? 'page' : undefined}
            className="border-manga-black bg-manga-white hover:bg-manga-paper-soft aria-[current=page]:bg-manga-paper-soft inline-flex min-h-11 shrink-0 items-center border-3 px-3 font-sans text-sm font-black whitespace-nowrap shadow-[3px_3px_0_var(--manga-black)] transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex justify-start gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
        <IconButton
          href="/dictation"
          label="Open Dictation Lab"
        >
          <BookOpen
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
        <IconButton label="Search study desk">
          <Search
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
        <IconButton label="Open settings">
          <Settings
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
      </div>
    </header>
  )
}
