import type { IeltsOption } from './schema'

const SECTION_NAME = /^(paragraph|section)\s+([a-z]+)\.?$/i

/**
 * True when the options only name the passage's own sections ("A Paragraph
 * A", "B Section B"). The paper prints no box for "Which section contains
 * the following information?", only "Choose the correct letter, A-H", so
 * the letters alone are enough and the box is left out.
 */
export function onlyNamesSections(options: IeltsOption[]): boolean {
  return (
    options.length > 0 &&
    options.every(option => {
      const text = option.text.trim()
      const match = SECTION_NAME.exec(text)

      return (
        !text ||
        text.toUpperCase() === option.key.toUpperCase() ||
        match?.[2]?.toUpperCase() === option.key.toUpperCase()
      )
    })
  )
}
