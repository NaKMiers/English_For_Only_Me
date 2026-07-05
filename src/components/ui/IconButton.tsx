import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Button, buttonVariants } from './button'

interface BaseProps {
  children: ReactNode
  className?: string
  label: string
  title?: string
}

type LinkButtonProps = BaseProps &
  Omit<
    ComponentPropsWithoutRef<typeof Link>,
    'aria-label' | 'children' | 'className' | 'href' | 'title'
  > & {
    href: ComponentPropsWithoutRef<typeof Link>['href']
  }

type NativeButtonProps = BaseProps &
  Omit<
    ComponentPropsWithoutRef<'button'>,
    'aria-label' | 'children' | 'className' | 'title'
  > & {
    href?: never
  }

type Props = LinkButtonProps | NativeButtonProps

export function IconButton(props: Props) {
  const { children, className, label, title = label } = props
  const sharedClassName = cn(
    buttonVariants({ variant: 'outline', size: 'icon-lg' }),
    'inline-grid size-11 shrink-0 place-items-center border-3 border-manga-black bg-manga-white text-manga-black shadow-[3px_3px_0_var(--manga-black)] transition-[background,box-shadow,transform] duration-150 hover:bg-manga-paper-soft active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-55',
    className
  )

  if (props.href !== undefined) {
    const {
      children: _children,
      className: _className,
      href,
      label: _label,
      title: _title,
      ...linkProps
    } = props

    return (
      <Link
        {...linkProps}
        href={href}
        aria-label={label}
        title={title}
        className={sharedClassName}
      >
        {children}
      </Link>
    )
  }

  const {
    children: _children,
    className: _className,
    label: _label,
    title: _title,
    type = 'button',
    ...buttonProps
  } = props

  return (
    <Button
      {...buttonProps}
      type={type}
      aria-label={label}
      title={title}
      className={sharedClassName}
    >
      {children}
    </Button>
  )
}
