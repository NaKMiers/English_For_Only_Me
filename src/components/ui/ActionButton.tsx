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
  primary:
    'border-transparent bg-brand-soft text-brand-ink hover:bg-brand hover:text-surface',
  paper: 'border-line bg-surface text-ink hover:bg-tint-soft',
  ink: 'border-cta bg-cta text-cta-fg hover:bg-cta/85',
}

export function ActionButton(props: Props) {
  const { children, className, icon, tone = 'primary' } = props
  const sharedClassName = cn(
    buttonVariants({ variant: 'default', size: 'lg' }),
    'soft-press inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full border px-5 py-2 font-sans text-sm leading-tight font-medium tracking-normal disabled:opacity-55',
    toneClassName[tone],
    className
  )

  const content = (
    <>
      {icon ? (
        <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
      ) : null}
      <span className="min-w-0 wrap-break-word">{children}</span>
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
