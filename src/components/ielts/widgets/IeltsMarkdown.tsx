'use client'

import { Fragment, memo, type ReactNode, useMemo } from 'react'

import { cn } from '@/lib/utils'
import {
  type IeltsMdBlock,
  type IeltsMdInline,
  type IeltsMdListItem,
  parseIeltsMarkdown,
} from '@/modules/ielts/markdown/parse'

interface Props {
  className?: string
  renderSlot: (number: number) => ReactNode
  source: string
}

function Inline({
  nodes,
  renderSlot,
}: {
  nodes: IeltsMdInline[]
  renderSlot: Props['renderSlot']
}) {
  return nodes.map((node, index) => {
    if (node.type === 'text')
      return <Fragment key={index}>{node.value}</Fragment>

    if (node.type === 'slot')
      return <Fragment key={index}>{renderSlot(node.number)}</Fragment>

    const Tag = node.type === 'strong' ? 'strong' : 'em'

    return (
      <Tag key={index}>
        <Inline
          nodes={node.children}
          renderSlot={renderSlot}
        />
      </Tag>
    )
  })
}

function ListItems({
  items,
  ordered,
  renderSlot,
}: {
  items: IeltsMdListItem[]
  ordered: boolean
  renderSlot: Props['renderSlot']
}) {
  const List = ordered ? 'ol' : 'ul'

  return (
    <List
      className={cn('grid gap-2 pl-6', ordered ? 'list-decimal' : 'list-disc')}
    >
      {items.map((item, index) => (
        <li
          className="leading-[1.9]"
          key={index}
        >
          <Inline
            nodes={item.children}
            renderSlot={renderSlot}
          />
          {item.items.length ? (
            <div className="mt-2">
              <ListItems
                items={item.items}
                ordered={false}
                renderSlot={renderSlot}
              />
            </div>
          ) : null}
        </li>
      ))}
    </List>
  )
}

const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

function Block({
  block,
  renderSlot,
}: {
  block: IeltsMdBlock
  renderSlot: Props['renderSlot']
}) {
  if (block.type === 'heading') {
    const Tag = (['h3', 'h4', 'h5'] as const)[block.level - 1]

    return (
      <Tag
        className={cn(
          'font-sans font-black',
          block.level === 1 ? 'text-lg' : 'text-base'
        )}
      >
        <Inline
          nodes={block.children}
          renderSlot={renderSlot}
        />
      </Tag>
    )
  }

  if (block.type === 'paragraph')
    return (
      <p className="leading-[1.9]">
        <Inline
          nodes={block.children}
          renderSlot={renderSlot}
        />
      </p>
    )

  if (block.type === 'list')
    return (
      <ListItems
        items={block.items}
        ordered={block.ordered}
        renderSlot={renderSlot}
      />
    )

  return (
    <div className="overflow-x-auto">
      <table className="border-manga-black w-full border-collapse border-2 text-left">
        <thead>
          <tr>
            {block.header.map((cell, index) => (
              <th
                className={cn(
                  'border-manga-black bg-manga-pale-red border-2 px-3 py-2 align-top font-sans text-sm font-black',
                  ALIGN_CLASS[block.align[index] ?? 'left']
                )}
                key={index}
                scope="col"
              >
                <Inline
                  nodes={cell}
                  renderSlot={renderSlot}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, index) => (
                <td
                  className={cn(
                    'border-manga-black border-2 px-3 py-2 align-top leading-[1.9]',
                    ALIGN_CLASS[block.align[index] ?? 'left']
                  )}
                  key={index}
                >
                  <Inline
                    nodes={cell}
                    renderSlot={renderSlot}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Renders the IELTS Markdown subset to React elements. Never emits raw HTML:
 * text nodes go through React's escaping and slots become answer widgets.
 */
export const IeltsMarkdown = memo(function IeltsMarkdown({
  className,
  renderSlot,
  source,
}: Props) {
  const blocks = useMemo(() => parseIeltsMarkdown(source), [source])

  return (
    <div className={cn('grid gap-3', className)}>
      {blocks.map((block, index) => (
        <Block
          block={block}
          key={index}
          renderSlot={renderSlot}
        />
      ))}
    </div>
  )
})
