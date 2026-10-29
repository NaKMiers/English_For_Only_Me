/*
 * Writing prompts are plain text with one convention: lines starting with
 * "> " are the task statement, shown in the exam's bordered box. Paragraphs
 * are separated by blank lines; adjacent paragraphs of the same kind form one
 * block, so a two-sentence task statement shares one box.
 *
 *   You should spend about 40 minutes on this task.
 *
 *   > The best way to ... is to build tall apartment blocks.
 *   >
 *   > To what extent do you agree or disagree with this statement?
 *
 *   Write at least 250 words.
 */

export interface WritingPromptBlock {
  boxed: boolean
  paragraphs: string[]
}

const QUOTE_PATTERN = /^\s*>\s?/

export function parseWritingPrompt(text: string): WritingPromptBlock[] {
  const blocks: WritingPromptBlock[] = []
  let paragraph: string[] = []
  let paragraphBoxed = false

  const flush = () => {
    if (!paragraph.length) return

    const value = paragraph.join('\n')
    const last = blocks[blocks.length - 1]

    if (last?.boxed === paragraphBoxed) last.paragraphs.push(value)
    else blocks.push({ boxed: paragraphBoxed, paragraphs: [value] })

    paragraph = []
  }

  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const boxed = QUOTE_PATTERN.test(line)
    const content = boxed ? line.replace(QUOTE_PATTERN, '') : line

    // A bare ">" between boxed paragraphs is a paragraph break inside the box.
    if (!content.trim()) {
      flush()
      continue
    }

    if (paragraph.length && boxed !== paragraphBoxed) flush()

    paragraphBoxed = boxed
    paragraph.push(content.trim())
  }

  flush()

  return blocks
}

/** The prompt without box markers, for places that only want the words. */
export function plainWritingPrompt(text: string): string {
  return parseWritingPrompt(text)
    .flatMap(block => block.paragraphs)
    .join('\n\n')
}
