import { fireEvent, render, screen } from '@testing-library/react'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'

import { BrowseDisclosure } from './BrowseDisclosure'
import { BrowseVideoListClient } from './BrowseVideoListClient'
import { FavoriteButton } from './FavoriteButton'
import { InProgressSection } from './InProgressSection'
import {
  BrowseVideoList,
  SectionAccordion,
  type BrowseVideoItem,
} from './SectionAccordion'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/modules/dictation/content/favoriteActions', () => ({
  setFavoriteAction: vi.fn(),
}))

function video(index: number): BrowseVideoItem {
  return {
    completions: 0,
    favorited: false,
    id: `v${index}`,
    inProgress: false,
    level: null,
    practiceHref: `/dictation/practice/v${index}`,
    thumbnailUrl: null,
    title: `Lesson ${index}`,
    youtubeVideoId: 'dQw4w9WgXcQ',
  }
}

const videos = [1, 2, 3, 4, 5, 6].map(video)

const CLIENT_COMPONENTS = new Set<unknown>([
  BrowseDisclosure,
  BrowseVideoListClient,
  FavoriteButton,
])

/**
 * Expand server components the way the RSC renderer does, stopping at client
 * components: what is left is what the payload would carry.
 */
function renderServerTree(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map(renderServerTree)
  if (!isValidElement(node)) return node

  const element = node as ReactElement<Record<string, unknown>>

  if (
    typeof element.type === 'function' &&
    !CLIENT_COMPONENTS.has(element.type)
  )
    return renderServerTree(
      (element.type as (props: object) => ReactNode)(element.props)
    )

  return {
    ...element,
    props: Object.fromEntries(
      Object.entries(element.props).map(([key, value]) => [
        key,
        renderServerTree(value as ReactNode),
      ])
    ),
  } as ReactNode
}

function findElements(
  node: unknown,
  type: unknown
): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(item => findElements(item, type))
  if (!isValidElement(node)) return []

  const element = node as ReactElement<Record<string, unknown>>
  const nested = Object.values(element.props).flatMap(value =>
    findElements(value, type)
  )

  return element.type === type ? [element, ...nested] : nested
}

function containsElement(value: unknown): boolean {
  if (isValidElement(value)) return true
  if (Array.isArray(value)) return value.some(containsElement)
  if (value && typeof value === 'object')
    return Object.values(value).some(containsElement)

  return false
}

describe('BrowseVideoList', () => {
  test('gives only the first four cards a high fetch priority', () => {
    const html = renderToStaticMarkup(
      <BrowseVideoList
        videos={videos}
        canFavorite={false}
      />
    )

    expect(html.match(/<img[^>]*fetchPriority="high"/g)).toHaveLength(4)
    expect(html.match(/<img[^>]*loading="lazy"/g)).toHaveLength(2)
  })
})

describe('SectionAccordion', () => {
  test('mounts a section list only after its toggle opens it', () => {
    render(
      <SectionAccordion
        groups={[{ key: 'intro', title: 'Intro', videos }]}
        canFavorite
      />
    )

    const toggle = screen.getByRole('button', { name: /Intro/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Lesson 1')).toBeNull()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Lesson 1')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Add favorite' })
    ).toHaveLength(6)
  })
})

describe('SectionAccordion payload', () => {
  test('a closed section ships plain video records, not rendered cards', () => {
    const tree = renderServerTree(
      <SectionAccordion
        groups={[{ key: 'intro', title: 'Intro', videos }]}
        canFavorite
      />
    )
    const [disclosure] = findElements(tree, BrowseDisclosure)
    const body = disclosure?.props.children

    expect(disclosure?.props.defaultOpen).toBeFalsy()
    expect(isValidElement(body)).toBe(true)

    const list = body as ReactElement<Record<string, unknown>>
    expect(list.type).toBe(BrowseVideoListClient)
    expect(list.props.videos).toEqual(videos)
    expect(containsElement(list.props)).toBe(false)
    // No server-rendered card (or its favorite star) rides along.
    expect(findElements(tree, FavoriteButton)).toHaveLength(0)
    expect(JSON.stringify(list.props)).not.toContain('className":"border-2')
  })
})

describe('InProgressSection', () => {
  test('starts open and collapses on click', () => {
    render(
      <InProgressSection
        videos={videos.slice(0, 2)}
        canFavorite={false}
      />
    )

    const toggle = screen.getByRole('button', { name: /In Progress/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Lesson 2')).toBeInTheDocument()

    fireEvent.click(toggle)

    expect(screen.queryByText('Lesson 2')).toBeNull()
  })

  test('renders nothing without in-progress videos', () => {
    const { container } = render(
      <InProgressSection
        videos={[]}
        canFavorite={false}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
