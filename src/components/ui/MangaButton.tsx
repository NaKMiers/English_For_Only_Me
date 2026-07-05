import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Button, buttonVariants } from './button'

type ButtonTone = 'primary' | 'paper' | 'ink'

interface BaseProps {
  children: ReactNode
  className?: string
  icon?: ReactNode
  tone?: ButtonTone
}

type LinkButtonProps = BaseProps &
  Omit<
    ComponentPropsWithoutRef<typeof Link>,
    'children' | 'className' | 'href'
  > & {
    href: ComponentPropsWithoutRef<typeof Link>['href']
  }

type NativeButtonProps = BaseProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'className'> & {
    href?: never
  }

type Props = LinkButtonProps | NativeButtonProps

const toneClassName: Record<ButtonTone, string> = {
  primary: 'bg-manga-paper-soft text-manga-black',
  paper: 'bg-manga-white text-manga-black',
  ink: 'bg-manga-black text-manga-white',
}

export function MangaButton(props: Props) {
  const { children, className, icon, tone = 'primary' } = props
  const sharedClassName = cn(
    buttonVariants({ variant: 'default', size: 'lg' }),
    'inline-flex min-h-11 max-w-full items-center justify-center gap-2 border-3 border-manga-black px-4 py-2 font-sans text-sm leading-tight font-black tracking-normal shadow-[3px_3px_0_var(--manga-black)] transition-[background,box-shadow,transform] duration-150 hover:bg-manga-pale-red active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-55',
    toneClassName[tone],
    className
  )

  const content = (
    <>
      {icon ? (
        <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
      ) : null}
      <span className="min-w-0 break-words">{children}</span>
    </>
  )

  if (props.href !== undefined) {
    const {
      children: _children,
      className: _className,
      href,
      icon: _icon,
      tone: _tone,
      ...linkProps
    } = props

    return (
      <Link
        {...linkProps}
        href={href}
        className={sharedClassName}
      >
        {content}
      </Link>
    )
  }

  const {
    children: _children,
    className: _className,
    icon: _icon,
    tone: _tone,
    type = 'button',
    ...buttonProps
  } = props

  return (
    <Button
      {...buttonProps}
      type={type}
      className={sharedClassName}
    >
      {content}
    </Button>
  )
}
