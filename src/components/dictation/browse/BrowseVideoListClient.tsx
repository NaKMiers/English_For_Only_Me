'use client'

import type { ComponentProps } from 'react'

import { BrowseVideoList } from './BrowseVideoList'

/**
 * Client entry for BrowseVideoList. A server component that passes this as a
 * child ships only its props (plain video records) in the RSC payload, not
 * the rendered cards, so a section that stays closed costs its data only.
 */
export function BrowseVideoListClient(
  props: ComponentProps<typeof BrowseVideoList>
) {
  return <BrowseVideoList {...props} />
}
