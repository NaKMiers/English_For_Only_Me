import { memo } from 'react'

import { cn } from '@/lib/utils'
import { parseWritingPrompt } from '@/modules/ielts/writing/promptBlocks'

interface Props {
  text: string
  className?: string
}

/**
 * A writing task prompt laid out like the exam paper: plain instructions,
 * with the "> " task statement in a bold italic bordered box.
 */
export const WritingPrompt = memo(function WritingPrompt({
  className,
  text,
}: Props) {
  return (
    <div className={cn('grid gap-3', className)}>
      {parseWritingPrompt(text).map((block, blockIndex) => (
        <div
          className={cn(
            'grid gap-3',
            block.boxed &&
              'border-manga-black rounded-control border-2 px-4 py-3 font-bold italic'
          )}
          key={blockIndex}
        >
          {block.paragraphs.map((paragraph, index) => (
            <p
              className="whitespace-pre-line"
              key={index}
            >
              {paragraph}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
})
